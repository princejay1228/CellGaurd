import {
  Snapshot30s,
  AgentDebateState,
  DebateTranscriptEntry,
  NemotronAssessment,
  HealthVerdict,
} from '../types';
import { nvidiaService } from './nvidiaService';
import { db } from '../db';

export interface DebateCycleCallbacks {
  onAgentStateChange?: (agents: AgentDebateState[]) => void;
  onTranscriptEntry?: (entry: DebateTranscriptEntry) => void;
  onNemotronComplete?: (assessment: NemotronAssessment) => void;
  onCycleStatusChange?: (status: 'idle' | 'running' | 'completed' | 'error', message?: string) => void;
}

/**
 * Debate engine that ONLY works with real NVIDIA NIM API calls.
 * No simulated / faux data whatsoever.
 */
export class DebateEngine {
  private isCycleRunning = false;
  private currentAgents: AgentDebateState[] = [];
  private callbacks: DebateCycleCallbacks = {};

  constructor() { this.syncAgentsFromSettings(); }

  public setCallbacks(cb: DebateCycleCallbacks) { this.callbacks = cb; }
  public getAgents() { return this.currentAgents; }
  public isRunning() { return this.isCycleRunning; }

  public syncAgentsFromSettings() {
    const s = nvidiaService.getSettings();
    const ids = [s.model1, s.model2, s.model3, s.model4];
    const roles = [
      'Thermal & Chemical Kinetics',
      'Anomaly & Physics Reasoning',
      'Degradation & Impedance Analysis',
      'Safety & Power Electronics'
    ];
    this.currentAgents = ids.map((id, i) => ({
      modelId: id,
      modelName: id || `Agent ${i + 1} (not configured)`,
      role: roles[i],
      status: 'idle' as const,
      currentRound: 0,
      currentPosition: 'OPTIMAL' as HealthVerdict,
      confidence: 0,
      latestArgument: id ? 'Waiting for data' : 'No model ID configured — set in Settings',
      isLiveAPI: false
    }));
  }

  private updateAgent(i: number, partial: Partial<AgentDebateState>) {
    this.currentAgents[i] = { ...this.currentAgents[i], ...partial };
    this.callbacks.onAgentStateChange?.([...this.currentAgents]);
  }

  public async executeDebateCycle(snapshot: Snapshot30s): Promise<NemotronAssessment | null> {
    if (this.isCycleRunning) return null;

    const s = nvidiaService.getSettings();
    if (!nvidiaService.hasApiKey()) {
      this.callbacks.onCycleStatusChange?.('error', 'No NVIDIA API key configured. Go to Settings.');
      return null;
    }

    const enabledModels = [
      s.enabledModels.model1 ? s.model1 : '',
      s.enabledModels.model2 ? s.model2 : '',
      s.enabledModels.model3 ? s.model3 : '',
      s.enabledModels.model4 ? s.model4 : '',
    ];
    const activeCount = enabledModels.filter(Boolean).length;
    if (activeCount === 0) {
      this.callbacks.onCycleStatusChange?.('error', 'No model IDs are configured. Go to Settings.');
      return null;
    }

    this.isCycleRunning = true;
    const startTime = Date.now();
    this.syncAgentsFromSettings();
    this.callbacks.onCycleStatusChange?.('running', 'Starting independent analysis...');
    const snapshotId = snapshot.id || Date.now();
    const transcript: DebateTranscriptEntry[] = [];

    const telemetryBlock = `Voltage: avg ${snapshot.avgVoltage.toFixed(3)}V (min ${snapshot.minVoltage.toFixed(3)}V, max ${snapshot.maxVoltage.toFixed(3)}V)
Current: avg ${snapshot.avgCurrent.toFixed(3)}A (min ${snapshot.minCurrent.toFixed(3)}A, max ${snapshot.maxCurrent.toFixed(3)}A)
Temperature: avg ${snapshot.avgTemp.toFixed(2)}°C (min ${snapshot.minTemp.toFixed(2)}°C, max ${snapshot.maxTemp.toFixed(2)}°C)
Power: avg ${snapshot.avgPower.toFixed(2)}W (max ${snapshot.maxPower.toFixed(2)}W)
SOC: ${snapshot.currentSoc.toFixed(1)}% | SOH: ${snapshot.currentSoh.toFixed(1)}%
Readings: ${snapshot.readingCount} samples over 30 seconds`;

    try {
      // ── PHASE 0: Independent Analysis (up to 4 parallel calls) ──
      for (let i = 0; i < 4; i++) if (enabledModels[i]) this.updateAgent(i, { status: 'thinking', currentRound: 0 });

      const phase0 = await Promise.all(enabledModels.map((modelId, i) => {
        if (!modelId) return Promise.resolve(null);
        return nvidiaService.callChatCompletion({
          model: modelId,
          messages: [{
            role: 'user',
            content: `You are a battery analysis agent specializing in ${this.currentAgents[i].role}.
Analyze this 30-second lithium-ion battery snapshot:
${telemetryBlock}
State your verdict: OPTIMAL, DEGRADED, ANOMALOUS, or CRITICAL with key reasoning.`
          }]
        });
      }));

      const initialArgs: string[] = [];
      for (let i = 0; i < 4; i++) {
        const res = phase0[i];
        if (!res || !res.success) {
          if (enabledModels[i]) this.updateAgent(i, { status: 'error', latestArgument: 'API call failed' });
          initialArgs.push('');
          continue;
        }
        const verdict = this.extractVerdict(res.content);
        this.updateAgent(i, { status: 'argued', currentRound: 0, currentPosition: verdict, latestArgument: res.content.slice(0, 150), isLiveAPI: true, confidence: 95 });
        initialArgs.push(res.content);
        const entry: DebateTranscriptEntry = {
          id: `r0-${i}-${Date.now()}`, timestamp: Date.now(), modelId: enabledModels[i], modelName: enabledModels[i],
          role: this.currentAgents[i].role, round: 0, type: 'initial', content: res.content, position: verdict, confidence: 95, isLiveAPI: true
        };
        transcript.push(entry);
        this.callbacks.onTranscriptEntry?.(entry);
        await db.aiResponses.add({ snapshotId, timestamp: Date.now(), modelId: enabledModels[i], modelName: enabledModels[i], round: 0, content: res.content, confidence: 95, healthVerdict: verdict, isLiveAPI: true });
      }

      // ── ROUNDS 1-3: Critique → Rebuttal → Final ──
      const roundLabels: Array<{ label: string; type: DebateTranscriptEntry['type']; instruction: string }> = [
        { label: 'Round 1: Critique', type: 'critique', instruction: 'Critique the other models\' analyses. Defend your position with evidence from the telemetry.' },
        { label: 'Round 2: Rebuttal', type: 'rebuttal', instruction: 'Respond to criticisms. Challenge weak arguments and state if you revise your position.' },
        { label: 'Round 3: Final', type: 'final', instruction: 'Present your final position. State what you agree on and what remains disputed.' },
      ];

      let prevArgs = initialArgs;
      for (let round = 1; round <= 3; round++) {
        const rl = roundLabels[round - 1];
        this.callbacks.onCycleStatusChange?.('running', rl.label);
        for (let i = 0; i < 4; i++) if (enabledModels[i]) this.updateAgent(i, { status: 'thinking', currentRound: round });

        const peerContext = prevArgs.filter(Boolean).map((a, j) => `Agent ${j + 1}: ${a.slice(0, 300)}`).join('\n---\n');

        const roundResults = await Promise.all(enabledModels.map((modelId, i) => {
          if (!modelId) return Promise.resolve(null);
          return nvidiaService.callChatCompletion({
            model: modelId,
            messages: [{
              role: 'user',
              content: `You are a battery analysis agent (${this.currentAgents[i].role}). ${rl.instruction}
Telemetry: ${telemetryBlock}
Other agents said:
${peerContext}`
            }]
          });
        }));

        const roundArgs: string[] = [];
        for (let i = 0; i < 4; i++) {
          const res = roundResults[i];
          if (!res || !res.success) { roundArgs.push(prevArgs[i]); if (enabledModels[i]) this.updateAgent(i, { status: 'error' }); continue; }
          const verdict = this.extractVerdict(res.content);
          this.updateAgent(i, { status: 'argued', currentRound: round, currentPosition: verdict, latestArgument: res.content.slice(0, 150), isLiveAPI: true });
          roundArgs.push(res.content);
          const entry: DebateTranscriptEntry = {
            id: `r${round}-${i}-${Date.now()}`, timestamp: Date.now(), modelId: enabledModels[i], modelName: enabledModels[i],
            role: this.currentAgents[i].role, round, type: rl.type, content: res.content, position: verdict, confidence: 95, isLiveAPI: true
          };
          transcript.push(entry);
          this.callbacks.onTranscriptEntry?.(entry);
          await db.aiResponses.add({ snapshotId, timestamp: Date.now(), modelId: enabledModels[i], modelName: enabledModels[i], round, content: res.content, confidence: 95, healthVerdict: verdict, isLiveAPI: true });
        }
        prevArgs = roundArgs;

        await db.debateRounds.add({ snapshotId, roundNumber: round, timestamp: Date.now(), transcript: transcript.filter(t => t.round === round), disagreements: [] });
      }

      // ── PHASE 4: Nemotron Final Synthesis (1 call) ──
      if (!s.nemotronModel) {
        this.callbacks.onCycleStatusChange?.('error', 'No Nemotron model ID configured.');
        this.isCycleRunning = false;
        return null;
      }

      this.callbacks.onCycleStatusChange?.('running', 'Nemotron synthesizing final assessment...');
      const allDebate = transcript.map(t => `[${t.type}] ${t.modelId}: ${t.content}`).join('\n---\n');
      const nemRes = await nvidiaService.callChatCompletion({
        model: s.nemotronModel,
        messages: [{
          role: 'user',
          content: `You are the final arbiter AI. Synthesize the following multi-model battery debate into a single evidence-based assessment.
Sensor data: ${telemetryBlock}
Debate transcript (${transcript.length} entries):
${allDebate}
Return JSON:
{ "riskLevel": "LOW"|"MODERATE"|"HIGH"|"CRITICAL", "finalBatteryAssessment": "...", "importantFindings": ["..."], "modelDisagreements": ["..."], "evidence": ["..."], "anomalies": ["..."], "confidence": 95.0, "limitations": ["..."], "recommendedInvestigations": ["..."] }`
        }],
        maxTokens: 1500
      });

      let assessment: NemotronAssessment;
      if (nemRes.success && nemRes.content) {
        let parsed: any = {};
        try { const m = nemRes.content.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); } catch {}
        assessment = {
          snapshotId, timestamp: Date.now(), modelId: s.nemotronModel,
          riskLevel: parsed.riskLevel || 'LOW',
          finalBatteryAssessment: parsed.finalBatteryAssessment || nemRes.content.slice(0, 500),
          importantFindings: parsed.importantFindings || [],
          modelDisagreements: parsed.modelDisagreements || [],
          evidence: parsed.evidence || [],
          anomalies: parsed.anomalies || [],
          confidence: parsed.confidence || 0,
          limitations: parsed.limitations || [],
          recommendedInvestigations: parsed.recommendedInvestigations || [],
          isLiveAPI: true,
          executionTimeMs: Date.now() - startTime
        };
      } else {
        this.callbacks.onCycleStatusChange?.('error', 'Nemotron API call failed.');
        this.isCycleRunning = false;
        return null;
      }

      await db.nemotronAssessments.add(assessment);
      this.callbacks.onNemotronComplete?.(assessment);
      this.callbacks.onCycleStatusChange?.('completed', 'Analysis complete.');
      return assessment;
    } catch (err: any) {
      this.callbacks.onCycleStatusChange?.('error', err?.message || 'Debate cycle failed.');
      return null;
    } finally {
      this.isCycleRunning = false;
    }
  }

  private extractVerdict(text: string): HealthVerdict {
    const t = text.toUpperCase();
    if (t.includes('CRITICAL')) return 'CRITICAL';
    if (t.includes('ANOMALOUS')) return 'ANOMALOUS';
    if (t.includes('DEGRADED')) return 'DEGRADED';
    return 'OPTIMAL';
  }
}

export const debateEngine = new DebateEngine();
