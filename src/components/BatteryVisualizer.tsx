import React from 'react';
import { Zap, ShieldCheck, AlertTriangle } from 'lucide-react';
import { SensorReading } from '../types';

interface BatteryVisualizerProps {
  reading: SensorReading | null;
}

export const BatteryVisualizer: React.FC<BatteryVisualizerProps> = ({ reading }) => {
  const soc = reading ? Math.max(0, Math.min(100, reading.soc)) : 0;
  const soh = reading ? reading.soh : 0;
  const isCharging = (reading?.current ?? 0) > 0.05;
  const isCritical = (reading?.temperature ?? 0) > 55 || (reading?.voltage ?? 5) < 2.9;
  const hasData = reading !== null;

  let fluidGradient = 'from-red-600 via-amber-500 to-yellow-400';
  let glowColor = 'rgba(220, 38, 38, 0.4)';
  if (isCritical) { fluidGradient = 'from-red-700 via-red-500 to-orange-500'; glowColor = 'rgba(185, 28, 28, 0.6)'; }
  else if (soc < 20) { fluidGradient = 'from-red-600 via-red-500 to-amber-500'; glowColor = 'rgba(220, 38, 38, 0.5)'; }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#140c06] to-[#0a0604] border border-amber-900/40 p-5 shadow-2xl">
      <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full blur-3xl opacity-30 transition-all duration-700" style={{ background: glowColor }} />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400"><Zap className="w-4 h-4" /></div>
          <div>
            <h3 className="text-xs font-semibold tracking-wider uppercase text-amber-400/80">Cell Dynamics</h3>
            <p className="text-xs text-stone-500">Li-Ion NMC</p>
          </div>
        </div>
        {hasData && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-mono bg-stone-900 border border-stone-800 text-stone-300">
            <ShieldCheck className="w-3 h-3 text-amber-400" /> SOH {soh.toFixed(1)}%
          </span>
        )}
      </div>

      {/* Battery container */}
      <div className="relative flex flex-col items-center my-3">
        <div className="w-12 h-2.5 rounded-t-md bg-gradient-to-t from-stone-700 to-stone-500 border-t border-x border-stone-600" />
        <div className="relative w-full max-w-[340px] h-32 rounded-xl border-2 border-stone-700 bg-stone-950/90 p-1.5 shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)] overflow-hidden">
          {!hasData ? (
            <div className="h-full flex items-center justify-center text-stone-500 text-xs font-mono">Connect ESP32 to see live charge level</div>
          ) : (
            <>
              <div className={`h-full rounded-lg bg-gradient-to-r ${fluidGradient} relative transition-all duration-700 ease-out shadow-lg`} style={{ width: `${Math.max(4, soc)}%` }}>
                <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.2)_50%,transparent_100%)] animate-[flowCharge_2s_linear_infinite]" />
                {isCharging && (
                  <div className="absolute inset-0 flex items-center justify-around pointer-events-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-ping" />
                    <span className="w-2 h-2 rounded-full bg-white/50 animate-bounce" />
                  </div>
                )}
              </div>
              <div className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono tracking-wider uppercase text-stone-400">STATE OF CHARGE</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold font-mono text-white tracking-tight drop-shadow-md">{soc.toFixed(1)}</span>
                    <span className="text-base font-semibold text-amber-400 font-mono">%</span>
                  </div>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="text-[10px] font-mono tracking-wider uppercase text-stone-400">TERMINAL</span>
                  <span className="text-lg font-bold font-mono text-stone-200 drop-shadow">{reading.voltage.toFixed(3)} <span className="text-xs text-stone-400">V</span></span>
                </div>
              </div>
            </>
          )}
        </div>

        {isCritical && hasData && (
          <div className="mt-2.5 flex items-center gap-2 px-3 py-1 rounded-md bg-red-500/10 border border-red-500/30 text-red-300 text-xs animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>CRITICAL EXCURSION DETECTED</span>
          </div>
        )}
      </div>
    </div>
  );
};
