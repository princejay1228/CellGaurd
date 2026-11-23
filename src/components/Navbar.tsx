import React, { useState } from 'react';
import { Shield, Play, Pause, Sparkles, Settings, MessageSquare, LayoutDashboard, Database } from 'lucide-react';
import { MonitoringStatus, monitoringService } from '../services/monitoringService';
import { ESP32Status } from '../types';

interface Props {
  activeTab: 'dashboard' | 'chat' | 'settings' | 'logs';
  setActiveTab: (t: 'dashboard' | 'chat' | 'settings' | 'logs') => void;
  monitoringStatus: MonitoringStatus;
  espStatus: ESP32Status;
  onTriggerManualCycle: () => void;
}

export const Navbar: React.FC<Props> = ({ activeTab, setActiveTab, monitoringStatus, onTriggerManualCycle }) => {
  const tabBtn = (id: typeof activeTab, icon: React.ReactNode, label: string) => (
    <button key={id} onClick={() => setActiveTab(id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${activeTab === id ? 'bg-red-500/20 text-red-300 border border-red-500/40 font-bold' : 'text-stone-400 hover:text-white'}`}>
      {icon} {label}
    </button>
  );

  return (
    <header className="sticky top-0 z-40 bg-[#0a0806]/90 backdrop-blur-md border-b border-stone-800/80 px-4 py-2.5 shadow-xl">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-red-500/20 to-amber-500/20 border border-red-500/40 text-red-400 shadow-md"><Shield className="w-5 h-5" /></div>
          <div>
            <h1 className="text-sm font-extrabold tracking-wider uppercase text-white font-mono">CellGuard <span className="text-red-500">AI</span></h1>
            <p className="text-[10px] text-stone-400 font-mono hidden sm:block">Battery Intelligence Command Centre</p>
          </div>
        </div>

        <nav className="flex items-center p-0.5 rounded-xl bg-stone-900 border border-stone-800 text-xs font-mono">
          {tabBtn('dashboard', <LayoutDashboard className="w-3.5 h-3.5" />, 'Dashboard')}
          {tabBtn('chat', <MessageSquare className="w-3.5 h-3.5" />, 'AI Chat')}
          {tabBtn('logs', <Database className="w-3.5 h-3.5" />, 'Logs')}
          {tabBtn('settings', <Settings className="w-3.5 h-3.5" />, 'Settings')}
        </nav>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-stone-900/90 border border-stone-800 rounded-xl px-2.5 py-1 text-xs font-mono">
            <button onClick={() => monitoringService.setEnabled(!monitoringStatus.enabled)} className={`flex items-center gap-1.5 font-bold ${monitoringStatus.enabled ? 'text-amber-400' : 'text-stone-500'}`}>
              {monitoringStatus.enabled ? <><span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" /> AUTO ON</> : <><Pause className="w-3.5 h-3.5" /> AUTO OFF</>}
            </button>
            {monitoringStatus.enabled && <span className="text-[10px] text-stone-400 border-l border-stone-800 pl-2">in <strong className="text-red-300">{monitoringStatus.secondsUntilNextAnalysis}s</strong></span>}
          </div>
          <button onClick={onTriggerManualCycle} disabled={monitoringStatus.isAnalyzing || monitoringStatus.bufferedReadingsCount === 0} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs font-mono transition-all shadow-md disabled:opacity-50">
            {monitoringStatus.isAnalyzing ? <><Sparkles className="w-3.5 h-3.5 animate-spin" /> Running...</> : <><Play className="w-3.5 h-3.5" /> Analyze Now</>}
          </button>
        </div>
      </div>
    </header>
  );
};
