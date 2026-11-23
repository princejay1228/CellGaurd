import React, { useState } from 'react';
import {
  Shield,
  Activity,
  Play,
  Pause,
  Clock,
  Sparkles,
  Settings,
  MessageSquare,
  LayoutDashboard,
  Database,
  Flame,
  AlertTriangle,
  RotateCcw,
  Zap
} from 'lucide-react';
import { MonitoringStatus, monitoringService } from '../services/monitoringService';
import { sensorSimulator, AnomalyType } from '../services/sensorSimulator';
import { ESP32Status } from '../types';

interface NavbarProps {
  activeTab: 'dashboard' | 'chat' | 'settings' | 'logs';
  setActiveTab: (tab: 'dashboard' | 'chat' | 'settings' | 'logs') => void;
  monitoringStatus: MonitoringStatus;
  espStatus: ESP32Status;
  onTriggerManualCycle: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  monitoringStatus,
  espStatus,
  onTriggerManualCycle
}) => {
  const [anomaly, setAnomaly] = useState<AnomalyType>(sensorSimulator.getActiveAnomaly());

  const handleAnomalyChange = (type: AnomalyType) => {
    setAnomaly(type);
    sensorSimulator.setAnomaly(type);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#060913]/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-2.5 shadow-xl">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/40 text-cyan-400 shadow-md">
            <Shield className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold tracking-wider uppercase text-white font-mono">
                CellGuard <span className="text-cyan-400">AI</span>
              </h1>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-cyan-950/80 border border-cyan-800 text-cyan-300">
                v1.0
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono hidden sm:block">
              Multi-Agent Battery Intelligence & Real-Time BMS Guardian
            </p>
          </div>
        </div>

        {/* Center: Navigation Tabs */}
        <nav className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'dashboard'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'chat'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> AI Chat
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'logs'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" /> Telemetry Logs
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'settings'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Settings className="w-3.5 h-3.5" /> Settings
          </button>
        </nav>

        {/* Right: Controls & Auto-Monitoring */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Anomaly Simulator Trigger (for live demonstration) */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl px-2 py-1 text-[11px] font-mono">
            <span className="text-slate-400 text-[10px]">Test Scenario:</span>
            <select
              value={anomaly}
              onChange={(e) => handleAnomalyChange(e.target.value as AnomalyType)}
              className="bg-transparent text-cyan-300 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="NONE" className="bg-slate-950 text-slate-200">Normal Cell Operation</option>
              <option value="THERMAL_RUNAWAY" className="bg-slate-950 text-rose-300">🔥 Thermal Runaway Spike</option>
              <option value="VOLTAGE_DIP" className="bg-slate-950 text-amber-300">⚠️ Voltage Sag / Collapse</option>
              <option value="OVERCURRENT_DISCHARGE" className="bg-slate-950 text-orange-300">⚡ 2.5C Overcurrent Surge</option>
              <option value="INTERNAL_RESISTANCE_SPIKE" className="bg-slate-950 text-purple-300">🔬 High Internal Resistance</option>
            </select>
          </div>

          {/* Auto Monitoring Switch */}
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1 text-xs font-mono">
            <button
              onClick={() => monitoringService.setEnabled(!monitoringStatus.enabled)}
              className={`flex items-center gap-1.5 font-bold transition-colors ${
                monitoringStatus.enabled ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              {monitoringStatus.enabled ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> AUTO ON
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5 text-slate-500" /> AUTO OFF
                </>
              )}
            </button>

            {monitoringStatus.enabled && (
              <span className="text-[10px] text-slate-400 border-l border-slate-800 pl-2">
                in <strong className="text-cyan-300">{monitoringStatus.secondsUntilNextAnalysis}s</strong>
              </span>
            )}
          </div>

          {/* Trigger Cycle Now Button */}
          <button
            onClick={onTriggerManualCycle}
            disabled={monitoringStatus.isAnalyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-all shadow-md hover:shadow-cyan-500/20 disabled:opacity-50"
          >
            {monitoringStatus.isAnalyzing ? (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-spin" /> Debating...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Analyze Now
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
