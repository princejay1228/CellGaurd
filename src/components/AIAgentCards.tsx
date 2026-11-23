import React from 'react';
import { Bot, Sparkles, BrainCircuit, ShieldAlert, CheckCircle2, AlertTriangle, Flame } from 'lucide-react';
import { AgentDebateState, HealthVerdict } from '../types';

interface AIAgentCardsProps {
  agents: AgentDebateState[];
  isCycleRunning: boolean;
}

export const AIAgentCards: React.FC<AIAgentCardsProps> = ({ agents, isCycleRunning }) => {
  const getVerdictBadge = (verdict: HealthVerdict) => {
    switch (verdict) {
      case 'OPTIMAL':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          icon: <CheckCircle2 className="w-3 h-3" />,
          label: 'OPTIMAL'
        };
      case 'DEGRADED':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          icon: <AlertTriangle className="w-3 h-3" />,
          label: 'DEGRADED'
        };
      case 'ANOMALOUS':
        return {
          bg: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
          icon: <Flame className="w-3 h-3" />,
          label: 'ANOMALOUS'
        };
      case 'CRITICAL':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          icon: <ShieldAlert className="w-3 h-3" />,
          label: 'CRITICAL'
        };
    }
  };

  const getRoundLabel = (round: number) => {
    switch (round) {
      case 0:
        return 'Init Analysis';
      case 1:
        return 'Round 1: Critique';
      case 2:
        return 'Round 2: Rebuttal';
      case 3:
        return 'Round 3: Final';
      default:
        return `Round ${round}`;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
      {agents.map((agent, idx) => {
        const badge = getVerdictBadge(agent.currentPosition);
        const isThinking = agent.status === 'thinking';

        return (
          <div
            key={agent.modelId || idx}
            className={`relative rounded-2xl bg-[#0c1322] border transition-all duration-300 p-4 shadow-xl flex flex-col justify-between ${
              isThinking
                ? 'border-cyan-500/80 shadow-[0_0_20px_rgba(0,242,254,0.15)] ring-1 ring-cyan-500/40'
                : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            {/* Header: Model & Specialty */}
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl border ${
                    idx === 0
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : idx === 1
                      ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                      : idx === 2
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {idx === 1 ? <BrainCircuit className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-bold text-white tracking-wide">
                        {agent.modelName}
                      </h4>
                      {agent.isLiveAPI ? (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-900/60 border border-cyan-700/60 text-cyan-300">
                          LIVE NIM
                        </span>
                      ) : (
                        <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-400">
                          SIMULATED
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">
                      {agent.role}
                    </p>
                  </div>
                </div>

                {/* Debate Round & Status Pill */}
                <div className="flex flex-col items-end gap-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                    isThinking
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse'
                      : 'bg-slate-900 text-slate-400 border-slate-800'
                  }`}>
                    {isThinking && <Sparkles className="w-2.5 h-2.5 text-cyan-400 animate-spin" />}
                    {isThinking ? 'THINKING...' : getRoundLabel(agent.currentRound)}
                  </span>
                </div>
              </div>

              {/* Latest Argument Quote */}
              <div className="my-2.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-900 min-h-[64px] flex items-center">
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans line-clamp-3 italic">
                  "{agent.latestArgument || 'Analyzing initial 30s telemetry...'}"
                </p>
              </div>
            </div>

            {/* Footer: Position & Confidence */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono uppercase text-slate-500">Stance:</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${badge.bg}`}>
                  {badge.icon} {badge.label}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono uppercase text-slate-500">Confidence:</span>
                <span className="text-xs font-mono font-bold text-white">
                  {agent.confidence}%
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
