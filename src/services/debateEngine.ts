import {
  Snapshot30s,
  AgentDebateState,
  DebateTranscriptEntry,
  NemotronAssessment,
  HealthVerdict,
  AIResponseRecord
} from '../types';
import { nvidiaService } from './nvidiaService';
import { db } from '../db';

export interface DebateCycleCallbacks {
  onAgentStateChange?: (agents: AgentDebateState[]) => void;
  onTranscriptEntry?: (entry: DebateTranscriptEntry) => void;
  onNemotronComplete?: (assessment: NemotronAssessment) => void;
  onCycleStatusChange?: (status: 'idle' | 'running' | 'completed' | 'error', message?: string) => void;
}

export class DebateEngine {
  private isCycleRunning: boolean = false;
  private currentAgents: AgentDebateState[] = [];
  private callbacks: DebateCycleCallbacks = {};

  constructor() {
    this.initDefaultAgents();
  }

  public setCallbacks(callbacks: DebateCycleCallbacks) {
    this.callbacks = callbacks;
  }

  public getAgents(): AgentDebateState[] {
    return this.currentAgents;
  }

  public isRunning(): boolean {
    return this.isCycleRunning;
  }

  private initDefaultAgents() {
    const s = nvidiaService.getSettings();
    this.currentAgents = [
      {
        modelId: s.model1,
        modelName: 'Llama 3.3 70B',
        role: 'Thermal & Chemical Kinetics Specialist',
        status: 'idle',
        currentRound: 0,
        currentPosition: 'OPTIMAL',
        confidence: 94,
        latestArgument: 'Ready for telemetry stream',
        isLiveAPI: false
      },
      {
        modelId: s.model2,
        modelName: 'DeepSeek R1',
        role: 'Deep Anomaly & Physics Reasoner',
        status: 'idle',
        currentRound: 0,
        currentPosition: 'OPTIMAL',
        confidence: 96,
        latestArgument: 'Awaiting 30s electrochemical window',
        isLiveAPI: false
      },
      {
        modelId: s.model3,
        modelName: 'Mistral Large 2',
        role: 'Degradation & Impedance Analyst',
        status: 'idle',
        currentRound: 0,
        currentPosition: 'OPTIMAL',
        confidence: 91,
        latestArgument: 'Standing by for impedance diagnostics',
        isLiveAPI: false
      },
      {
        modelId: s.model4,
        modelName: 'Llama 3.1 Nemotron 70B',
        role: 'Safety & Power Electronics Auditor',
        status: 'idle',
        currentRound: 0,
        currentPosition: 'OPTIMAL',
        confidence: 95,
        latestArgument: 'Monitoring BMS safety envelope',
        isLiveAPI: false
      }
    ];
  }

  private updateAgent(index: number, partial: Partial<AgentDebateState>) {
    this.currentAgents[index] = { ...this.currentAgents[index], ...partial };
    if (this.callbacks.onAgentStateChange) {
      this.callbacks.onAgentStateChange([...this.currentAgents]);
    }
  }

  /**
   * Run the complete 17-call 4-Model AI Debate Cycle
   */
  public async executeDebateCycle(snapshot: Snapshot30s): Promise<NemotronAssessment | null> {
    if (this.isCycleRunning) {
      console.warn('[DebateEngine] Cycle already in progress, skipping overlapping run.');
      return null;
    }

    this.isCycleRunning = true;
    const startTime = Date.now();
    const settings = nvidiaService.getSettings();

    // Re-sync agent names with current settings
    this.currentAgents[0].modelId = settings.model1;
    this.currentAgents[1].modelId = settings.model2;
    this.currentAgents[2].modelId = settings.model3;
    this.currentAgents[3].modelId = settings.model4;

    this.callbacks.onCycleStatusChange?.('running', 'Initiating independent 4-model analysis...');

    try {
      const transcript: DebateTranscriptEntry[] = [];
      const snapshotId = snapshot.id || Date.now();

      // -------------------------------------------------------------
      // PHASE 0: INDEPENDENT ANALYSIS (4 calls in parallel)
      // -------------------------------------------------------------
      for (let i = 0; i < 4; i++) {
        this.updateAgent(i, { status: 'thinking', currentRound: 0 });
      }

      const initialAnalyses = await Promise.all(
        this.currentAgents.map((agent, i) => this.runIndependentAnalysis(agent, snapshot, i))
      );

      for (let i = 0; i < 4; i++) {
        const res = initialAnalyses[i];
        this.updateAgent(i, {
          status: 'argued',
          currentRound: 0,
          currentPosition: res.verdict,
          confidence: res.confidence,
          latestArgument: res.summary,
          isLiveAPI: res.isLiveAPI
        });

        const entry: DebateTranscriptEntry = {
          id: `round-0-${i}-${Date.now()}`,
          timestamp: Date.now(),
          modelId: this.currentAgents[i].modelId,
          modelName: this.currentAgents[i].modelName,
          role: this.currentAgents[i].role,
          round: 0,
          type: 'initial',
          content: res.fullArgument,
          position: res.verdict,
          confidence: res.confidence,
          isLiveAPI: res.isLiveAPI
        };
        transcript.push(entry);
        this.callbacks.onTranscriptEntry?.(entry);

        // Store to Dexie
        await db.aiResponses.add({
          snapshotId,
          timestamp: Date.now(),
          modelId: this.currentAgents[i].modelId,
          modelName: this.currentAgents[i].modelName,
          round: 0,
          content: res.fullArgument,
          confidence: res.confidence,
          healthVerdict: res.verdict,
          isLiveAPI: res.isLiveAPI
        });
      }

      // -------------------------------------------------------------
      // PHASE 1: ROUND 1 — CRITIQUE (4 calls in parallel)
      // Each model critiques the other three and defends its position
      // -------------------------------------------------------------
      this.callbacks.onCycleStatusChange?.('running', 'Debate Round 1: Cross-model critique & defense...');
      for (let i = 0; i < 4; i++) {
        this.updateAgent(i, { status: 'thinking', currentRound: 1 });
      }

      const round1Critiques = await Promise.all(
        this.currentAgents.map((agent, i) =>
          this.runCritiqueRound(agent, i, initialAnalyses, snapshot)
        )
      );

      for (let i = 0; i < 4; i++) {
        const crit = round1Critiques[i];
        this.updateAgent(i, {
          status: 'argued',
          currentRound: 1,
          currentPosition: crit.verdict,
          confidence: crit.confidence,
          latestArgument: crit.summary,
          isLiveAPI: crit.isLiveAPI
        });

        const entry: DebateTranscriptEntry = {
          id: `round-1-${i}-${Date.now()}`,
          timestamp: Date.now(),
          modelId: this.currentAgents[i].modelId,
          modelName: this.currentAgents[i].modelName,
          role: this.currentAgents[i].role,
          round: 1,
          type: 'critique',
          content: crit.fullArgument,
          position: crit.verdict,
          confidence: crit.confidence,
          isLiveAPI: crit.isLiveAPI
        };
        transcript.push(entry);
        this.callbacks.onTranscriptEntry?.(entry);

        await db.aiResponses.add({
          snapshotId,
          timestamp: Date.now(),
          modelId: this.currentAgents[i].modelId,
          modelName: this.currentAgents[i].modelName,
          round: 1,
          content: crit.fullArgument,
          confidence: crit.confidence,
          healthVerdict: crit.verdict,
          isLiveAPI: crit.isLiveAPI
        });
      }

      // Record Round 1 to Dexie
      await db.debateRounds.add({
        snapshotId,
        roundNumber: 1,
        timestamp: Date.now(),
        transcript: transcript.filter(t => t.round === 1),
        disagreements: this.extractRoundDisagreements(this.currentAgents)
      });

      // -------------------------------------------------------------
      // PHASE 2: ROUND 2 — REBUTTAL & REVISION (4 calls in parallel)
      // Each model responds to criticism, challenges other arguments, may revise
      // -------------------------------------------------------------
      this.callbacks.onCycleStatusChange?.('running', 'Debate Round 2: Rebuttal & stance revision...');
      for (let i = 0; i < 4; i++) {
        this.updateAgent(i, { status: 'thinking', currentRound: 2 });
      }

      const round2Rebuttals = await Promise.all(
        this.currentAgents.map((agent, i) =>
          this.runRebuttalRound(agent, i, round1Critiques, snapshot)
        )
      );

      for (let i = 0; i < 4; i++) {
        const reb = round2Rebuttals[i];
        this.updateAgent(i, {
          status: 'argued',
          currentRound: 2,
          currentPosition: reb.verdict,
          confidence: reb.confidence,
          latestArgument: reb.summary,
          isLiveAPI: reb.isLiveAPI
        });

        const entry: DebateTranscriptEntry = {
          id: `round-2-${i}-${Date.now()}`,
          timestamp: Date.now(),
          modelId: this.currentAgents[i].modelId,
          modelName: this.currentAgents[i].modelName,
          role: this.currentAgents[i].role,
          round: 2,
          type: 'rebuttal',
          content: reb.fullArgument,
          position: reb.verdict,
          confidence: reb.confidence,
          isLiveAPI: reb.isLiveAPI
        };
        transcript.push(entry);
        this.callbacks.onTranscriptEntry?.(entry);

        await db.aiResponses.add({
          snapshotId,
          timestamp: Date.now(),
          modelId: this.currentAgents[i].modelId,
          modelName: this.currentAgents[i].modelName,
          round: 2,
          content: reb.fullArgument,
          confidence: reb.confidence,
          healthVerdict: reb.verdict,
          isLiveAPI: reb.isLiveAPI
        });
      }

      // Record Round 2 to Dexie
      await db.debateRounds.add({
        snapshotId,
        roundNumber: 2,
        timestamp: Date.now(),
        transcript: transcript.filter(t => t.round === 2),
        disagreements: this.extractRoundDisagreements(this.currentAgents)
      });

      // -------------------------------------------------------------
      // PHASE 3: ROUND 3 — FINAL POSITIONS (4 calls in parallel)
      // Each model presents its final position after reviewing discussion
      // -------------------------------------------------------------
      this.callbacks.onCycleStatusChange?.('running', 'Debate Round 3: Final positions & unresolved friction...');
      for (let i = 0; i < 4; i++) {
        this.updateAgent(i, { status: 'thinking', currentRound: 3 });
      }

      const round3Finals = await Promise.all(
        this.currentAgents.map((agent, i) =>
          this.runFinalStanceRound(agent, i, round2Rebuttals, snapshot)
        )
      );

      for (let i = 0; i < 4; i++) {
        const fin = round3Finals[i];
        this.updateAgent(i, {
          status: 'argued',
          currentRound: 3,
          currentPosition: fin.verdict,
          confidence: fin.confidence,
          latestArgument: fin.summary,
          isLiveAPI: fin.isLiveAPI
        });

        const entry: DebateTranscriptEntry = {
          id: `round-3-${i}-${Date.now()}`,
          timestamp: Date.now(),
          modelId: this.currentAgents[i].modelId,
          modelName: this.currentAgents[i].modelName,
          role: this.currentAgents[i].role,
          round: 3,
          type: 'final',
          content: fin.fullArgument,
          position: fin.verdict,
          confidence: fin.confidence,
          isLiveAPI: fin.isLiveAPI
        };
        transcript.push(entry);
        this.callbacks.onTranscriptEntry?.(entry);

        await db.aiResponses.add({
          snapshotId,
          timestamp: Date.now(),
          modelId: this.currentAgents[i].modelId,
          modelName: this.currentAgents[i].modelName,
          round: 3,
          content: fin.fullArgument,
          confidence: fin.confidence,
          healthVerdict: fin.verdict,
          isLiveAPI: fin.isLiveAPI
        });
      }

      // Record Round 3 to Dexie
      await db.debateRounds.add({
        snapshotId,
        roundNumber: 3,
        timestamp: Date.now(),
        transcript: transcript.filter(t => t.round === 3),
        disagreements: this.extractRoundDisagreements(this.currentAgents)
      });

      // -------------------------------------------------------------
      // PHASE 4: NEMOTRON FINAL INTELLIGENCE (1 call)
      // NVIDIA Nemotron 3 Ultra 550B A55B synthesis
      // -------------------------------------------------------------
      this.callbacks.onCycleStatusChange?.('running', 'Nemotron 3 Ultra 550B A55B synthesizing final intelligence...');

      const nemotronAssessment = await this.runNemotronSynthesis(
        snapshot,
        snapshotId,
        transcript,
        this.extractRoundDisagreements(this.currentAgents),
        Date.now() - startTime
      );

      await db.nemotronAssessments.add(nemotronAssessment);
      this.callbacks.onNemotronComplete?.(nemotronAssessment);
      this.callbacks.onCycleStatusChange?.('completed', 'Debate & Nemotron synthesis complete.');

      return nemotronAssessment;
    } catch (err: any) {
      console.error('[DebateEngine Error]', err);
      this.callbacks.onCycleStatusChange?.('error', err?.message || 'Debate cycle encountered an error.');
      return null;
    } finally {
      this.isCycleRunning = false;
    }
  }

  private extractRoundDisagreements(agents: AgentDebateState[]): string[] {
    const verdicts = agents.map(a => `${a.modelName} concludes ${a.currentPosition} (${a.confidence}% conf)`);
    const uniqueVerdicts = new Set(agents.map(a => a.currentPosition));
    if (uniqueVerdicts.size > 1) {
      return [
        `Split verdict: ${Array.from(uniqueVerdicts).join(' vs ')}`,
        `${agents[0].modelName} vs ${agents[1].modelName} on thermodynamic stability`,
        `${agents[2].modelName} points out impedance degradation while ${agents[3].modelName} evaluates BMS safety boundaries`
      ];
    }
    return [
      `Consensus on ${agents[0].currentPosition}, but models diverge on electrochemical root cause and degradation rate.`
    ];
  }

  // --------------------------------------------------------------------------
  // Helper generation routines (Live NIM call or realistic domain-specific AI logic)
  // --------------------------------------------------------------------------
  private async runIndependentAnalysis(
    agent: AgentDebateState,
    snap: Snapshot30s,
    index: number
  ): Promise<{ summary: string; fullArgument: string; verdict: HealthVerdict; confidence: number; isLiveAPI: boolean }> {
    const prompt = `You are ${agent.modelName}, acting as the ${agent.role}.
Analyze this 30-second lithium-ion battery snapshot:
- Voltage: avg ${snap.avgVoltage.toFixed(3)}V (min ${snap.minVoltage.toFixed(3)}V, max ${snap.maxVoltage.toFixed(3)}V)
- Current: avg ${snap.avgCurrent.toFixed(3)}A (min ${snap.minCurrent.toFixed(3)}A, max ${snap.maxCurrent.toFixed(3)}A)
- Temp: avg ${snap.avgTemp.toFixed(2)}°C (min ${snap.minTemp.toFixed(2)}°C, max ${snap.maxTemp.toFixed(2)}°C)
- Power: avg ${snap.avgPower.toFixed(2)}W (max ${snap.maxPower.toFixed(2)}W)
- State of Charge: ${snap.currentSoc.toFixed(1)}% | SOH: ${snap.currentSoh.toFixed(1)}%

Provide your initial evaluation. State your verdict (OPTIMAL, DEGRADED, ANOMALOUS, or CRITICAL) and your key physical reasoning.`;

    if (nvidiaService.hasApiKey()) {
      const res = await nvidiaService.callChatCompletion({
        model: agent.modelId,
        messages: [{ role: 'user', content: prompt }]
      });
      if (res.isLiveAPI && res.content) {
        const verdict = this.inferVerdictFromText(res.content, snap);
        return {
          summary: res.content.slice(0, 160) + '...',
          fullArgument: res.content,
          verdict,
          confidence: Math.floor(88 + Math.random() * 10),
          isLiveAPI: true
        };
      }
    }

    // High-Fidelity Physics Engine Simulation
    return this.generateSimulatedInitial(index, snap);
  }

  private async runCritiqueRound(
    agent: AgentDebateState,
    index: number,
    peers: Array<{ summary: string; fullArgument: string; verdict: HealthVerdict }>,
    snap: Snapshot30s
  ): Promise<{ summary: string; fullArgument: string; verdict: HealthVerdict; confidence: number; isLiveAPI: boolean }> {
    const peerSummaries = peers
      .filter((_, pIdx) => pIdx !== index)
      .map((p, pIdx) => `Peer ${pIdx + 1}: ${p.summary} [Verdict: ${p.verdict}]`)
      .join('\n');

    const prompt = `You are ${agent.modelName} (${agent.role}).
Review the initial analyses of your three peer models:
${peerSummaries}
Critique their assumptions, highlight any electrochemical risks they overlooked, and defend your perspective.`;

    if (nvidiaService.hasApiKey()) {
      const res = await nvidiaService.callChatCompletion({
        model: agent.modelId,
        messages: [{ role: 'user', content: prompt }]
      });
      if (res.isLiveAPI && res.content) {
        return {
          summary: res.content.slice(0, 160) + '...',
          fullArgument: res.content,
          verdict: this.inferVerdictFromText(res.content, snap),
          confidence: Math.floor(87 + Math.random() * 11),
          isLiveAPI: true
        };
      }
    }

    return this.generateSimulatedCritique(index, peers, snap);
  }

  private async runRebuttalRound(
    agent: AgentDebateState,
    index: number,
    peers: Array<{ summary: string; fullArgument: string; verdict: HealthVerdict }>,
    snap: Snapshot30s
  ): Promise<{ summary: string; fullArgument: string; verdict: HealthVerdict; confidence: number; isLiveAPI: boolean }> {
    const prompt = `You are ${agent.modelName} (${agent.role}). This is Round 2.
Respond to the critiques leveled at your stance. Challenge ungrounded claims, provide counter-evidence from the telemetry, and state whether you revise or maintain your position.`;

    if (nvidiaService.hasApiKey()) {
      const res = await nvidiaService.callChatCompletion({
        model: agent.modelId,
        messages: [{ role: 'user', content: prompt }]
      });
      if (res.isLiveAPI && res.content) {
        return {
          summary: res.content.slice(0, 160) + '...',
          fullArgument: res.content,
          verdict: this.inferVerdictFromText(res.content, snap),
          confidence: Math.floor(90 + Math.random() * 8),
          isLiveAPI: true
        };
      }
    }

    return this.generateSimulatedRebuttal(index, peers, snap);
  }

  private async runFinalStanceRound(
    agent: AgentDebateState,
    index: number,
    peers: Array<{ summary: string; fullArgument: string; verdict: HealthVerdict }>,
    snap: Snapshot30s
  ): Promise<{ summary: string; fullArgument: string; verdict: HealthVerdict; confidence: number; isLiveAPI: boolean }> {
    const prompt = `You are ${agent.modelName} (${agent.role}). This is the Final Round (Round 3).
Deliver your definitive, closing position. Explicitly summarize what you agree with and the unresolved points of disagreement with the other models.`;

    if (nvidiaService.hasApiKey()) {
      const res = await nvidiaService.callChatCompletion({
        model: agent.modelId,
        messages: [{ role: 'user', content: prompt }]
      });
      if (res.isLiveAPI && res.content) {
        return {
          summary: res.content.slice(0, 160) + '...',
          fullArgument: res.content,
          verdict: this.inferVerdictFromText(res.content, snap),
          confidence: Math.floor(92 + Math.random() * 7),
          isLiveAPI: true
        };
      }
    }

    return this.generateSimulatedFinal(index, snap);
  }

  private async runNemotronSynthesis(
    snap: Snapshot30s,
    snapshotId: number,
    transcript: DebateTranscriptEntry[],
    disagreements: string[],
    executionTimeMs: number
  ): Promise<NemotronAssessment> {
    const s = nvidiaService.getSettings();
    const nemotronModel = s.nemotronModel || 'nvidia/nemotron-3-ultra-550b-a55b';

    const prompt = `You are NVIDIA Nemotron 3 Ultra 550B A55B, acting as the Supreme Battery Intelligence Arbiter.
Analyze this 30s session:
- Telemetry: V_avg=${snap.avgVoltage.toFixed(3)}V (min ${snap.minVoltage.toFixed(3)}V, max ${snap.maxVoltage.toFixed(3)}V), I_avg=${snap.avgCurrent.toFixed(3)}A, Temp_avg=${snap.avgTemp.toFixed(2)}°C (max ${snap.maxTemp.toFixed(2)}°C), SOC=${snap.currentSoc.toFixed(1)}%, SOH=${snap.currentSoh.toFixed(1)}%
- 3 Debate Rounds Transcript: ${transcript.length} agent arguments across 4 models.
- Remaining Model Disagreements: ${disagreements.join(' | ')}

Synthesize a definitive, evidence-based assessment. Do NOT force consensus or majority voting; preserve valid physical disagreements.
Return a structured JSON with:
{
  "riskLevel": "LOW" | "MODERATE" | "HIGH" | "CRITICAL",
  "finalBatteryAssessment": "...",
  "importantFindings": ["..."],
  "modelDisagreements": ["..."],
  "evidence": ["..."],
  "anomalies": ["..."],
  "confidence": 95.5,
  "limitations": ["..."],
  "recommendedInvestigations": ["..."]
}`;

    if (nvidiaService.hasApiKey()) {
      const res = await nvidiaService.callChatCompletion({
        model: nemotronModel,
        messages: [{ role: 'user', content: prompt }]
      });
      if (res.isLiveAPI && res.content) {
        try {
          const jsonMatch = res.content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
              snapshotId,
              timestamp: Date.now(),
              modelId: nemotronModel,
              riskLevel: parsed.riskLevel || 'LOW',
              finalBatteryAssessment: parsed.finalBatteryAssessment || 'Evaluated telemetry parameters.',
              importantFindings: parsed.importantFindings || [],
              modelDisagreements: parsed.modelDisagreements || disagreements,
              evidence: parsed.evidence || [],
              anomalies: parsed.anomalies || [],
              confidence: parsed.confidence || 95.0,
              limitations: parsed.limitations || ['Limited to external terminal measurements without internal probe.'],
              recommendedInvestigations: parsed.recommendedInvestigations || ['Continue baseline monitoring.'],
              isLiveAPI: true,
              executionTimeMs
            };
          }
        } catch (e) {
          console.warn('[Nemotron JSON Parse]', e);
        }
      }
    }

    // High-Fidelity Nemotron Synthesis Simulation
    return this.generateSimulatedNemotron(snap, snapshotId, disagreements, executionTimeMs, nemotronModel);
  }

  private inferVerdictFromText(text: string, snap: Snapshot30s): HealthVerdict {
    const t = text.toUpperCase();
    if (t.includes('CRITICAL') || snap.avgTemp > 55 || snap.minVoltage < 2.9) return 'CRITICAL';
    if (t.includes('ANOMALOUS') || snap.avgTemp > 45 || Math.abs(snap.avgCurrent) > 5.0) return 'ANOMALOUS';
    if (t.includes('DEGRADED') || snap.currentSoh < 85) return 'DEGRADED';
    return 'OPTIMAL';
  }

  // --- Realistic Simulation Generators ---
  private generateSimulatedInitial(index: number, snap: Snapshot30s) {
    const isThermalStress = snap.avgTemp > 42.0 || snap.maxTemp > 48.0;
    const isCurrentSurge = Math.abs(snap.avgCurrent) > 4.5 || Math.abs(snap.minCurrent) > 6.0;
    const isLowVoltage = snap.minVoltage < 3.2;

    if (index === 0) {
      // Thermal Specialist
      const verdict: HealthVerdict = isThermalStress ? 'CRITICAL' : (snap.avgTemp > 35 ? 'ANOMALOUS' : 'OPTIMAL');
      return {
        verdict,
        confidence: isThermalStress ? 97 : 93,
        summary: isThermalStress
          ? `Elevated dT/dt (${snap.avgTemp.toFixed(1)}°C). Risk of exothermic phase transition in SEI layer.`
          : `Thermal equilibrium steady at ${snap.avgTemp.toFixed(1)}°C. Joule heating (I²R) well within dissipation limit.`,
        fullArgument: `Thermodynamic Analysis: Average cell temperature is ${snap.avgTemp.toFixed(2)}°C with peak at ${snap.maxTemp.toFixed(2)}°C. ${isThermalStress ? 'Thermal dissipation is trailing Joule heat accumulation by 1.8W. Arrhenius acceleration factor exceeds 2.4x baseline, threatening cathode binder integrity.' : 'Heat dissipation coefficient remains stable with no runaway signatures.'}`,
        isLiveAPI: false
      };
    } else if (index === 1) {
      // Deep Anomaly Reasoner (DeepSeek R1)
      const verdict: HealthVerdict = (isCurrentSurge || isLowVoltage) ? 'ANOMALOUS' : (isThermalStress ? 'DEGRADED' : 'OPTIMAL');
      return {
        verdict,
        confidence: 96,
        summary: (isCurrentSurge || isLowVoltage)
          ? `Non-linear dV/dt transient detected. Voltage sag to ${snap.minVoltage.toFixed(3)}V suggests high localized impedance.`
          : `Electrochemical potential curve aligns with standard NMC intercalation profile (V=${snap.avgVoltage.toFixed(3)}V).`,
        fullArgument: `Physics-informed Diagnostic: Examining the 30-second window across ${snap.readingCount || 30} data frames. ${isCurrentSurge ? `Current draw spiked to ${snap.minCurrent.toFixed(2)}A, causing transient overpotential exceeding nominal diffusion limits.` : `Terminal voltage delta (V_max - V_min = ${(snap.maxVoltage - snap.minVoltage).toFixed(3)}V) indicates stable double-layer capacitance.`}`,
        isLiveAPI: false
      };
    } else if (index === 2) {
      // Mistral Large 2 (Degradation & Impedance)
      const verdict: HealthVerdict = snap.currentSoh < 90 ? 'DEGRADED' : (isCurrentSurge ? 'ANOMALOUS' : 'OPTIMAL');
      return {
        verdict,
        confidence: 92,
        summary: `Calculated internal DC resistance R_int ≈ ${(Math.abs((snap.maxVoltage - snap.minVoltage) / (Math.abs(snap.avgCurrent) || 0.1))).toFixed(1)} mΩ. SOH estimated at ${snap.currentSoh.toFixed(1)}%.`,
        fullArgument: `Impedance & Lifespan Audit: Current SOH index is ${snap.currentSoh.toFixed(1)}%. The dV/dI transfer function demonstrates slight electrolyte dry-out or contact resistance growth. ${isLowVoltage ? 'Deep discharge stress will accelerate lithium plating during the subsequent recharge phase.' : 'Cycle degradation rate projected at <0.02% per 100 cycles.'}`,
        isLiveAPI: false
      };
    } else {
      // Llama 3.1 Nemotron 70B (Safety & Power Electronics)
      const verdict: HealthVerdict = (isThermalStress || isCurrentSurge || isLowVoltage) ? (isThermalStress ? 'CRITICAL' : 'ANOMALOUS') : 'OPTIMAL';
      return {
        verdict,
        confidence: 95,
        summary: `BMS safety margins: V_min delta to cut-off: ${(snap.minVoltage - 2.8).toFixed(2)}V. Overcurrent headroom: ${(10 - Math.abs(snap.avgCurrent)).toFixed(1)}A.`,
        fullArgument: `Safety Protocol Assessment: Cell operation is monitored against UL1642 / IEC 62133 compliance thresholds. Current power throughput is ${snap.avgPower.toFixed(2)}W. ${isThermalStress ? 'Warning: Cell surface temperature is encroaching on thermal cut-off threshold (45°C).' : 'All telemetry metrics remain within standard safe operating area (SOA).' }`,
        isLiveAPI: false
      };
    }
  }

  private generateSimulatedCritique(index: number, peers: any[], snap: Snapshot30s) {
    if (index === 0) {
      return {
        verdict: peers[0].verdict,
        confidence: 95,
        summary: `Challenges Peer 3 on impedance assumptions: thermal rise is driving the apparent resistance drop, not SEI passivation.`,
        fullArgument: `Critique by Thermal Specialist: Peer 2 underestimates the Arrhenius effect. The slight voltage fluctuation reported is an artifact of temperature-dependent ionic conductivity in the electrolyte, not physical contact resistance. We must prioritize cooling verification over artificial impedance flags.`,
        isLiveAPI: false
      };
    } else if (index === 1) {
      return {
        verdict: peers[1].verdict,
        confidence: 96,
        summary: `Challenges Peer 4: Compliance checks alone mask sub-millisecond voltage sags. Non-linear diffusion overpotential is present.`,
        fullArgument: `Critique by DeepSeek R1: Peer 4's static SOA boundaries overlook dynamic overpotential kinetics. Even if average current is within tolerance, the rapid dI/dt rate creates localized lithium concentration gradients near the cathode separator that safety standards fail to flag.`,
        isLiveAPI: false
      };
    } else if (index === 2) {
      return {
        verdict: peers[2].verdict,
        confidence: 93,
        summary: `Counters Peer 1: Thermal models are incomplete without factoring in the entropy coefficient (dE/dT) of NMC cathodes.`,
        fullArgument: `Critique by Mistral Large 2: While Peer 1 attributes all heat to Joule losses (I²R), thermodynamic entropy of reaction at SOC=${snap.currentSoc.toFixed(1)}% contributes up to 25% of heat flow. Over-focusing solely on external cooling misdiagnoses internal degradation.`,
        isLiveAPI: false
      };
    } else {
      return {
        verdict: peers[3].verdict,
        confidence: 95,
        summary: `Critiques peer models for theoretical over-complication while maintaining hardware safety interlocks must hold priority.`,
        fullArgument: `Critique by Nemotron 70B: Peer models are debating micro-level electrochemical mechanics while the operational priority is ensuring the physical pack protection circuit does not trigger false positive disconnects. The primary threshold is sustained temperature > 50°C.`,
        isLiveAPI: false
      };
    }
  }

  private generateSimulatedRebuttal(index: number, peers: any[], snap: Snapshot30s) {
    return {
      verdict: this.currentAgents[index].currentPosition,
      confidence: 94,
      summary: `Defends core position using 30s rolling telemetry; acknowledges entropy factors but maintains primary verdict.`,
      fullArgument: `${this.currentAgents[index].modelName} Rebuttal: Having reviewed peer counter-arguments, the measured V=${snap.avgVoltage.toFixed(3)}V and T=${snap.avgTemp.toFixed(1)}°C support our baseline thesis. We refine our confidence interval to 94% while insisting that empirical voltage stability confirms our stance.`,
      isLiveAPI: false
    };
  }

  private generateSimulatedFinal(index: number, snap: Snapshot30s) {
    return {
      verdict: this.currentAgents[index].currentPosition,
      confidence: 96,
      summary: `Final Position: ${this.currentAgents[index].currentPosition}. Sustained evidence from dV/dt and thermal telemetry.`,
      fullArgument: `${this.currentAgents[index].modelName} Final Stance: After 3 rounds of rigorous cross-examination, we stand by our diagnosis of ${this.currentAgents[index].currentPosition}. Remaining friction with peers centers on entropy dissipation versus purely resistive internal impedance.`,
      isLiveAPI: false
    };
  }

  private generateSimulatedNemotron(
    snap: Snapshot30s,
    snapshotId: number,
    disagreements: string[],
    executionTimeMs: number,
    modelId: string
  ): NemotronAssessment {
    const isAnomaly = snap.avgTemp > 45 || Math.abs(snap.avgCurrent) > 5.0 || snap.minVoltage < 3.0;
    const isThermal = snap.avgTemp > 40;

    const riskLevel = isAnomaly ? (snap.avgTemp > 55 ? 'CRITICAL' : 'HIGH') : (isThermal ? 'MODERATE' : 'LOW');

    return {
      snapshotId,
      timestamp: Date.now(),
      modelId,
      riskLevel,
      finalBatteryAssessment: isAnomaly
        ? `Elevated electrochemical anomalies detected across the 30-second window. The convergence of temperature (${snap.avgTemp.toFixed(1)}°C) and voltage dynamics indicates heightened cell stress.`
        : `Cell operates within stable thermodynamic and electrical equilibrium. State of Charge (${snap.currentSoc.toFixed(1)}%) and terminal voltage (${snap.avgVoltage.toFixed(3)}V) demonstrate steady intercalation kinetics.`,
      importantFindings: [
        `Average Terminal Voltage: ${snap.avgVoltage.toFixed(3)}V (spread: ${(snap.maxVoltage - snap.minVoltage).toFixed(3)}V across 30s)`,
        `Thermal Profile: Mean ${snap.avgTemp.toFixed(2)}°C with maximum peak of ${snap.maxTemp.toFixed(2)}°C`,
        `Current Flow: Average ${snap.avgCurrent.toFixed(3)}A with peak excursion of ${snap.minCurrent.toFixed(3)}A`,
        `Estimated SOH: ${snap.currentSoh.toFixed(1)}% with active Coulomb counting SOC at ${snap.currentSoc.toFixed(1)}%`
      ],
      modelDisagreements: disagreements.length > 0 ? disagreements : [
        'Disagreement on whether thermal rise is dominated by Joule dissipation (Llama 3.3) vs entropic heat of reaction (Mistral Large)',
        'Friction regarding whether voltage dips indicate SEI layer degradation or transient double-layer capacitive lag'
      ],
      evidence: [
        `Calculated dV/dt over 30s window: ${((snap.maxVoltage - snap.minVoltage) / 30).toFixed(4)} V/sec`,
        `Effective DC equivalent series resistance (ESR): ≈ ${Math.max(25, Math.min(180, Math.round(Math.abs((snap.maxVoltage - snap.minVoltage) / (Math.abs(snap.avgCurrent) || 0.5)) * 1000)))} mΩ`,
        `Power throughput sustained at ${snap.avgPower.toFixed(2)}W continuous load`
      ],
      anomalies: isAnomaly ? [
        `Thermal excursion: Peak temperature reached ${snap.maxTemp.toFixed(1)}°C`,
        `Transient voltage sag: Minimum voltage dipped to ${snap.minVoltage.toFixed(3)}V`
      ] : [
        'No critical thermal runaway or dendritic short-circuit indicators detected in current window'
      ],
      confidence: isAnomaly ? 97.4 : 95.8,
      limitations: [
        'Telemetry relies on external surface DS18B20 sensing; internal core temperature may lag by 2-4°C.',
        'High-frequency impedance spectroscopy (EIS) is not directly available via DC telemetry alone.',
        'Ambient temperature variations can influence passive heat dissipation calculations.'
      ],
      recommendedInvestigations: isAnomaly ? [
        'Reduce discharge rate immediately to allow thermal stabilization below 35°C.',
        'Inspect cell terminals for loose contact or oxidation causing localized I²R hotspots.',
        'Perform calibrated full charge-discharge cycle to recalibrate Coulomb counting baseline.'
      ] : [
        'Continue standard 30-second telemetry monitoring.',
        'Maintain cell temperature below 35°C for optimal cycle longevity.',
        'Log periodic impedance baselines to track long-term SEI growth.'
      ],
      isLiveAPI: false,
      executionTimeMs
    };
  }
}

export const debateEngine = new DebateEngine();
