import React from 'react';
import { Gauge, Flame, Zap, Cpu, BatteryCharging, HeartPulse } from 'lucide-react';
import { SensorReading } from '../types';

interface SensorCardsProps { reading: SensorReading | null; }

export const SensorCards: React.FC<SensorCardsProps> = ({ reading }) => {
  if (!reading) return (
    <div className="p-6 text-center rounded-2xl bg-[#141008] border border-stone-800 text-stone-500 text-xs font-mono my-4">
      No sensor data — connect ESP32 hardware via Bluetooth
    </div>
  );

  const { voltage, current, temperature, power, soc, soh } = reading;

  const items = [
    { label: 'Voltage', icon: <Gauge className="w-3.5 h-3.5 text-red-400" />, value: voltage.toFixed(3), unit: 'V', sub: voltage < 3.2 ? 'LOW' : voltage > 4.15 ? 'MAX' : 'NOMINAL' },
    { label: 'Current', icon: <Zap className="w-3.5 h-3.5 text-amber-400" />, value: (current >= 0 ? '+' : '') + current.toFixed(3), unit: 'A', sub: current > 0 ? 'Charging' : current < 0 ? 'Discharging' : 'Idle' },
    { label: 'Temperature', icon: <Flame className="w-3.5 h-3.5 text-red-400" />, value: temperature.toFixed(2), unit: '°C', sub: temperature > 50 ? 'DANGER' : temperature > 38 ? 'ELEVATED' : 'STABLE' },
    { label: 'Power', icon: <Cpu className="w-3.5 h-3.5 text-amber-400" />, value: power.toFixed(3), unit: 'W', sub: `${(power * 1000).toFixed(0)} mW` },
    { label: 'SOC', icon: <BatteryCharging className="w-3.5 h-3.5 text-amber-400" />, value: soc.toFixed(1), unit: '%', sub: 'Coulomb Counted' },
    { label: 'SOH', icon: <HeartPulse className="w-3.5 h-3.5 text-red-400" />, value: soh.toFixed(1), unit: '%', sub: `-${(100 - soh).toFixed(1)}% Loss` },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 my-4">
      {items.map(it => (
        <div key={it.label} className="rounded-xl bg-[#141008] border border-stone-800 p-3.5 hover:border-red-500/40 transition-colors">
          <div className="flex items-center justify-between text-stone-400 mb-1.5">
            <span className="text-[11px] font-mono tracking-wider uppercase font-semibold flex items-center gap-1.5">{it.icon} {it.label}</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-white tracking-tight">{it.value}</span>
            <span className="text-xs font-mono font-semibold text-amber-400">{it.unit}</span>
          </div>
          <div className="mt-2 text-[10px] font-mono text-stone-500 border-t border-stone-800/80 pt-1.5">{it.sub}</div>
        </div>
      ))}
    </div>
  );
};
