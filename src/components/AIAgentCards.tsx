import React from 'react';
import { Bot, Sparkles, ShieldAlert, CheckCircle2, AlertTriangle, Flame } from 'lucide-react';
import { AgentDebateState, HealthVerdict } from '../types';

interface Props {
  agents: AgentDebateState[];
  isCycleRunning?: boolean;
}

const verdictBadge = (v: HealthVerdict) => {
  if (v === 'OPTIMAL') return { cls: 'bg-amber-500/10 border-amber-500/30 text-amber-400', icon: <CheckCircle2 className="w-3 h-3" /> };
  if (v === 'DEGRADED') return { cls: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400', icon: <AlertTriangle className="w-3 h-3" /> };
  if (v === 'ANOMALOUS') return { cls: 'bg-orange-500/10 border-orange-500/30 text-orange-400', icon: <Flame className="w-3 h-3" /> };
  return { cls: 'bg-red-500/10 border-red-500/30 text-red-400', icon: <ShieldAlert className="w-3 h-3" /> };
};

const roundLabel = (r: number) => r === 0 ? 'Analysis' : r === 1 ? 'R1 Critique' : r === 2 ? 'R2 Rebuttal' : 'R3 Final';

export const AIAgentCards: React.FC<Props> = ({ agents }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
    {agents.map((a, i) => {
      const badge = verdictBadge(a.currentPosition);
      const thinking = a.status === 'thinking';
      const noModel = !a.modelId;
      return (
        <div key={i} className={`rounded-2xl bg-[#141008] border transition-all duration-300 p-4 shadow-xl flex flex-col justify-between ${thinking ? 'border-red-500/80 shadow-[0_0_20px_rgba(220,38,38,0.15)] ring-1 ring-red-500/40' : 'border-stone-800 hover:border-stone-700'}`}>
          <div>
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30"><Bot className="w-4 h-4" /></div>
                <div>
                  <h4 className="text-xs font-bold text-white tracking-wide">Agent {i + 1}</h4>
                  <p className="text-[10px] text-stone-400 font-mono truncate max-w-[180px]">{noModel ? 'Not configured' : a.modelId}</p>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${thinking ? 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse' : 'bg-stone-900 text-stone-400 border-stone-800'}`}>
                {thinking && <Sparkles className="w-2.5 h-2.5 text-red-400 animate-spin" />}
                {thinking ? 'THINKING...' : roundLabel(a.currentRound)}
              </span>
            </div>
            <div className="my-2.5 p-2.5 rounded-xl bg-stone-950/70 border border-stone-900 min-h-[54px] flex items-center">
              <p className="text-[11px] text-stone-300 leading-relaxed line-clamp-3 italic">
                {noModel ? 'Set a model ID in Settings to enable this agent.' : `"${a.latestArgument}"`}
              </p>
            </div>
          </div>
          {!noModel && (
            <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border ${badge.cls}`}>{badge.icon} {a.currentPosition}</span>
              {a.confidence > 0 && <span className="text-xs font-mono font-bold text-white">{a.confidence}%</span>}
            </div>
          )}
        </div>
      );
    })}
  </div>
);
