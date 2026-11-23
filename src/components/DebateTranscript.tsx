import React, { useState } from 'react';
import { MessageSquareCode, ChevronDown, ChevronUp, Bot, Sparkles } from 'lucide-react';
import { DebateTranscriptEntry } from '../types';

interface Props { transcript: DebateTranscriptEntry[]; isCycleRunning: boolean; }

export const DebateTranscript: React.FC<Props> = ({ transcript, isCycleRunning }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="rounded-2xl bg-[#141008] border border-stone-800 p-4 shadow-xl mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20"><MessageSquareCode className="w-4 h-4" /></div>
          <div>
            <h4 className="text-xs font-bold tracking-wider uppercase text-stone-300 flex items-center gap-2">
              Debate Transcript
              {isCycleRunning && <span className="flex items-center gap-1 text-[10px] font-mono text-red-400 font-normal"><Sparkles className="w-3 h-3 animate-spin" /> LIVE</span>}
            </h4>
          </div>
        </div>
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-400">
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>
      {!collapsed && (
        <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
          {transcript.length === 0 ? (
            <div className="p-6 text-center text-stone-500 text-xs font-mono">
              {isCycleRunning ? 'Waiting for model responses...' : 'No debate entries yet. Trigger an analysis cycle with real sensor data.'}
            </div>
          ) : transcript.slice(-16).map(e => (
            <div key={e.id} className="p-3 rounded-xl bg-stone-950/80 border border-stone-800/90 hover:border-stone-700 transition-colors">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-bold text-stone-200 font-mono text-[11px] flex items-center gap-1"><Bot className="w-3.5 h-3.5 text-red-400" /> {e.modelId}</span>
                <span className="px-2 py-0.2 rounded-full text-[9px] font-mono border bg-red-500/10 border-red-500/30 text-red-300">
                  {e.round === 0 ? 'Initial' : e.round === 1 ? 'Critique' : e.round === 2 ? 'Rebuttal' : 'Final'}
                </span>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed">{e.content}</p>
              <div className="mt-2 text-[10px] font-mono text-stone-500 border-t border-stone-900 pt-1">
                Stance: <span className="text-amber-400 font-semibold">{e.position}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
