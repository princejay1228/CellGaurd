import React from 'react';
import { Zap, Activity, ShieldCheck, AlertTriangle } from 'lucide-react';
import { SensorReading } from '../types';

interface BatteryVisualizerProps {
  reading: SensorReading | null;
  state?: 'idle' | 'charging' | 'discharging' | 'anomaly';
}

export const BatteryVisualizer: React.FC<BatteryVisualizerProps> = ({ reading }) => {
  const soc = reading ? Math.max(0, Math.min(100, reading.soc)) : 78;
  const soh = reading ? Math.max(0, Math.min(100, reading.soh)) : 98;
  const isCharging = (reading?.current ?? 0) > 0.05;
  const isDischarging = (reading?.current ?? 0) < -0.05;
  const isThermalWarning = (reading?.temperature ?? 25) > 45;
  const isCritical = (reading?.temperature ?? 25) > 55 || (reading?.voltage ?? 3.7) < 2.9;

  // Determine fluid color based on state
  let fluidGradient = 'from-cyan-500 via-teal-400 to-emerald-400';
  let glowColor = 'rgba(0, 242, 254, 0.4)';
  if (isCritical) {
    fluidGradient = 'from-rose-600 via-red-500 to-amber-500';
    glowColor = 'rgba(244, 63, 94, 0.5)';
  } else if (isThermalWarning) {
    fluidGradient = 'from-amber-500 via-orange-400 to-yellow-400';
    glowColor = 'rgba(245, 158, 11, 0.45)';
  } else if (soc < 20) {
    fluidGradient = 'from-red-500 via-rose-500 to-orange-400';
    glowColor = 'rgba(239, 68, 68, 0.4)';
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#0e172a] to-[#080d1a] border border-slate-800/80 p-5 shadow-2xl">
      {/* Ambient Radial Glow */}
      <div
        className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-30 transition-all duration-700"
        style={{ background: glowColor }}
      />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold tracking-wider uppercase text-slate-400">
              Electrochemical Cell Dynamics
            </h3>
            <p className="text-xs text-slate-500">Li-Ion NMC 18650/21700 Core</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            isCharging
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : isDischarging
              ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isCharging ? 'bg-emerald-400 animate-ping' : isDischarging ? 'bg-cyan-400 animate-pulse' : 'bg-slate-400'}`} />
            {isCharging ? 'CHARGING' : isDischarging ? 'DISCHARGING' : 'IDLE'}
          </span>

          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-mono bg-slate-900 border border-slate-800 text-slate-300">
            <ShieldCheck className="w-3 h-3 text-cyan-400" /> SOH {soh.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Large Animated Battery Graphic */}
      <div className="relative flex flex-col items-center my-3">
        {/* Terminal positive nipple */}
        <div className="w-12 h-2.5 rounded-t-md bg-gradient-to-t from-slate-700 to-slate-500 border-t border-x border-slate-600 shadow-md" />

        {/* Battery Container */}
        <div className="relative w-full max-w-[340px] h-32 rounded-xl border-2 border-slate-700 bg-slate-950/90 p-1.5 shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] overflow-hidden">
          {/* Internal Grid Lines / Voltage measurement markers */}
          <div className="absolute inset-0 flex justify-between px-6 pointer-events-none opacity-20">
            <div className="w-px h-full bg-slate-400 border-dashed" />
            <div className="w-px h-full bg-slate-400 border-dashed" />
            <div className="w-px h-full bg-slate-400 border-dashed" />
            <div className="w-px h-full bg-slate-400 border-dashed" />
          </div>

          {/* Liquid Charge Fill Level */}
          <div
            className={`h-full rounded-lg bg-gradient-to-r ${fluidGradient} relative transition-all duration-700 ease-out shadow-lg`}
            style={{ width: `${Math.max(4, soc)}%` }}
          >
            {/* Flowing shimmer animation */}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.25)_50%,transparent_100%)] animate-[flowCharge_2s_linear_infinite]" />

            {/* Micro bubbles/electrons when charging */}
            {isCharging && (
              <div className="absolute inset-0 flex items-center justify-around pointer-events-none">
                <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-ping" />
                <span className="w-2 h-2 rounded-full bg-white/50 animate-bounce" />
                <span className="w-1 h-1 rounded-full bg-white/70 animate-pulse" />
              </div>
            )}
          </div>

          {/* Centered Large SOC Typography Overlay */}
          <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
            <div className="flex flex-col">
              <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400 drop-shadow">
                STATE OF CHARGE
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold font-mono text-white tracking-tight drop-shadow-md">
                  {soc.toFixed(1)}
                </span>
                <span className="text-base font-semibold text-cyan-400 font-mono">%</span>
              </div>
            </div>

            <div className="flex flex-col items-end text-right">
              <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400 drop-shadow">
                OCV ESTIMATE
              </span>
              <span className="text-lg font-bold font-mono text-slate-200 drop-shadow">
                {reading ? reading.voltage.toFixed(3) : '3.920'} <span className="text-xs text-slate-400">V</span>
              </span>
            </div>
          </div>
        </div>

        {/* Anomaly warning ribbon if hot or critical */}
        {(isThermalWarning || isCritical) && (
          <div className="mt-2.5 flex items-center gap-2 px-3 py-1 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>
              {isCritical ? 'CRITICAL THERMAL/VOLTAGE EXCURSION DETECTED' : 'Thermal warning: Cell temperature above 45°C limit'}
            </span>
          </div>
        )}
      </div>

      {/* Quick stats footer inside battery card */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
        <div>
          <p className="text-[10px] uppercase font-mono text-slate-500">Nominal Cap</p>
          <p className="text-xs font-semibold font-mono text-slate-300">3000 mAh</p>
        </div>
        <div>
          <p className="text-[10px] uppercase font-mono text-slate-500">Chemistry</p>
          <p className="text-xs font-semibold font-mono text-cyan-400">NMC Li-Ion</p>
        </div>
        <div>
          <p className="text-[10px] uppercase font-mono text-slate-500">Cycle Health</p>
          <p className="text-xs font-semibold font-mono text-emerald-400">Grade A</p>
        </div>
      </div>
    </div>
  );
};
