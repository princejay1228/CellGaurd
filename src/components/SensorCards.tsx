import React from 'react';
import { Gauge, Flame, Zap, Cpu, BatteryCharging, HeartPulse } from 'lucide-react';
import { SensorReading } from '../types';

interface SensorCardsProps {
  reading: SensorReading | null;
}

export const SensorCards: React.FC<SensorCardsProps> = ({ reading }) => {
  const voltage = reading ? reading.voltage : 3.920;
  const current = reading ? reading.current : -1.450;
  const temp = reading ? reading.temperature : 28.2;
  const power = reading ? reading.power : Math.abs(voltage * current);
  const soc = reading ? reading.soc : 78.4;
  const soh = reading ? reading.soh : 96.8;

  // Temperature status color
  const tempColor = temp > 50 ? 'text-rose-400 border-rose-500/40 bg-rose-500/10' : temp > 38 ? 'text-amber-400 border-amber-500/40 bg-amber-500/10' : 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
  const voltageColor = (voltage < 3.0 || voltage > 4.25) ? 'text-rose-400 border-rose-500/40 bg-rose-500/10' : 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';
  const currentColor = Math.abs(current) > 5.0 ? 'text-amber-400 border-amber-500/40 bg-amber-500/10' : current > 0 ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
      {/* 1. Voltage */}
      <div className="relative overflow-hidden rounded-xl bg-[#0c1322] border border-slate-800 p-3.5 hover:border-cyan-500/40 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-[11px] font-mono tracking-wider uppercase font-semibold flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" /> Voltage
          </span>
          <span className="text-[10px] font-mono text-slate-500">INA219</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold font-mono text-white tracking-tight">
            {voltage.toFixed(3)}
          </span>
          <span className="text-xs font-mono font-semibold text-cyan-400">V</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5">
          <span>Range: 3.00 - 4.20V</span>
          <span className={`px-1.5 py-0.2 rounded border text-[9px] ${voltageColor}`}>
            {voltage < 3.2 ? 'LOW' : voltage > 4.15 ? 'MAX' : 'NOMINAL'}
          </span>
        </div>
      </div>

      {/* 2. Current */}
      <div className="relative overflow-hidden rounded-xl bg-[#0c1322] border border-slate-800 p-3.5 hover:border-cyan-500/40 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-[11px] font-mono tracking-wider uppercase font-semibold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-cyan-400" /> Current
          </span>
          <span className="text-[10px] font-mono text-slate-500">Shunt 0.1Ω</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold font-mono text-white tracking-tight">
            {current >= 0 ? `+${current.toFixed(3)}` : current.toFixed(3)}
          </span>
          <span className="text-xs font-mono font-semibold text-cyan-400">A</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5">
          <span>{current > 0 ? 'Charging' : current < 0 ? 'Discharging' : 'Quiescent'}</span>
          <span className={`px-1.5 py-0.2 rounded border text-[9px] ${currentColor}`}>
            {Math.abs(current) > 4.0 ? 'HIGH C' : 'NORMAL'}
          </span>
        </div>
      </div>

      {/* 3. Temperature */}
      <div className="relative overflow-hidden rounded-xl bg-[#0c1322] border border-slate-800 p-3.5 hover:border-cyan-500/40 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-[11px] font-mono tracking-wider uppercase font-semibold flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-400" /> Temperature
          </span>
          <span className="text-[10px] font-mono text-slate-500">DS18B20</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold font-mono text-white tracking-tight">
            {temp.toFixed(2)}
          </span>
          <span className="text-xs font-mono font-semibold text-amber-400">°C</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5">
          <span>Safe: &lt; 45.0°C</span>
          <span className={`px-1.5 py-0.2 rounded border text-[9px] ${tempColor}`}>
            {temp > 50 ? 'DANGER' : temp > 38 ? 'ELEVATED' : 'STABLE'}
          </span>
        </div>
      </div>

      {/* 4. Power */}
      <div className="relative overflow-hidden rounded-xl bg-[#0c1322] border border-slate-800 p-3.5 hover:border-cyan-500/40 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-[11px] font-mono tracking-wider uppercase font-semibold flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Power
          </span>
          <span className="text-[10px] font-mono text-slate-500">V × |I|</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold font-mono text-white tracking-tight">
            {power.toFixed(3)}
          </span>
          <span className="text-xs font-mono font-semibold text-cyan-400">W</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5">
          <span>Throughput</span>
          <span className="text-slate-400 text-[10px] font-mono">{(power * 1000).toFixed(0)} mW</span>
        </div>
      </div>

      {/* 5. SOC */}
      <div className="relative overflow-hidden rounded-xl bg-[#0c1322] border border-slate-800 p-3.5 hover:border-cyan-500/40 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-[11px] font-mono tracking-wider uppercase font-semibold flex items-center gap-1.5">
            <BatteryCharging className="w-3.5 h-3.5 text-teal-400" /> State of Charge
          </span>
          <span className="text-[10px] font-mono text-slate-500">Estimated</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold font-mono text-white tracking-tight">
            {soc.toFixed(1)}
          </span>
          <span className="text-xs font-mono font-semibold text-teal-400">%</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5">
          <span>Coulomb Counted</span>
          <span className="text-emerald-400 text-[10px] font-mono font-medium">RELIABLE</span>
        </div>
      </div>

      {/* 6. SOH */}
      <div className="relative overflow-hidden rounded-xl bg-[#0c1322] border border-slate-800 p-3.5 hover:border-cyan-500/40 transition-colors">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-[11px] font-mono tracking-wider uppercase font-semibold flex items-center gap-1.5">
            <HeartPulse className="w-3.5 h-3.5 text-emerald-400" /> State of Health
          </span>
          <span className="text-[10px] font-mono text-slate-500">Validated</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold font-mono text-white tracking-tight">
            {soh.toFixed(1)}
          </span>
          <span className="text-xs font-mono font-semibold text-emerald-400">%</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5">
          <span>Capacity Fade</span>
          <span className="text-slate-400 text-[10px] font-mono">-{(100 - soh).toFixed(1)}% Loss</span>
        </div>
      </div>
    </div>
  );
};
