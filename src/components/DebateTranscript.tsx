import React, { useState } from 'react';
import { MessageSquareCode, ChevronDown, ChevronUp, Bot, Sparkles, Filter } from 'lucide-react';
import { DebateTranscriptEntry } from '../types';

interface DebateTranscriptProps {
  transcript: DebateTranscriptEntry[];
  isCycleRunning: boolean;
}

export const DebateTranscript: React.FC<DebateTranscriptProps> = ({ transcript, isCycleRunning }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [roundFilter, setRoundFilter] = useState<'all' | 0 | 1 | 2 | 3>('all');

  const filteredEntries = transcript.filter(entry => {
    if (roundFilter === 'all') return true;
    return entry.round === roundFilter;
  });

  const getRoundBadgeColor = (round: number) => {
    switch (round) {
      case 0:
        return 'bg-slate-800 text-slate-300 border-slate-700';
      case 1:
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 2:
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 3:
        return 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
    }
  };

  return (
    <div className="rounded-2xl bg-[#0c1322] border border-slate-800 p-4 shadow-xl mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <MessageSquareCode className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-wider uppercase text-slate-300 flex items-center gap-2">
              Multi-Agent Debate Transcript
              {isCycleRunning && (
                <span className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 font-normal">
                  <Sparkles className="w-3 h-3 animate-spin" /> LIVE EXCHANGES
                </span>
              )}
            </h4>
            <p className="text-[10px] text-slate-500 font-mono">
              3-Round Adversarial Cross-Examination & Critique
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Round Filter Tabs */}
          <div className="hidden sm:flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono">
            <button
              onClick={() => setRoundFilter('all')}
              className={`px-2 py-0.5 rounded-md ${
                roundFilter === 'all' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400'
              }`}
            >
              All ({transcript.length})
            </button>
            <button
              onClick={() => setRoundFilter(1)}
              className={`px-2 py-0.5 rounded-md ${
                roundFilter === 1 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400'
              }`}
            >
              R1 Critique
            </button>
            <button
              onClick={() => setRoundFilter(2)}
              className={`px-2 py-0.5 rounded-md ${
                roundFilter === 2 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400'
              }`}
            >
              R2 Rebuttal
            </button>
            <button
              onClick={() => setRoundFilter(3)}
              className={`px-2 py-0.5 rounded-md ${
                roundFilter === 3 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400'
              }`}
            >
              R3 Final
            </button>
          </div>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400"
          >
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
          {filteredEntries.length === 0 ? (
            <div className="p-6 text-center text-slate-500 text-xs font-mono">
              Debate will stream here as the 4 agents complete their cross-critique rounds...
            </div>
          ) : (
            filteredEntries.slice(-16).map((entry) => (
              <div
                key={entry.id}
                className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200 font-mono text-[11px] flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5 text-cyan-400" /> {entry.modelName}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                      • {entry.role}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`px-2 py-0.2 rounded-full text-[9px] font-mono border ${getRoundBadgeColor(entry.round)}`}>
                      {entry.round === 0
                        ? 'Initial'
                        : entry.round === 1
                        ? 'R1 Critique'
                        : entry.round === 2
                        ? 'R2 Rebuttal'
                        : 'R3 Final Stance'}
                    </span>
                    <span className="text-[9px] font-mono text-slate-400">
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  {entry.content}
                </p>

                <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-500 border-t border-slate-900 pt-1">
                  <span>
                    Stance: <span className="text-cyan-400 font-semibold">{entry.position}</span> ({entry.confidence}% confidence)
                  </span>
                  <span>{entry.isLiveAPI ? 'NVIDIA NIM' : 'SIMULATED'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
