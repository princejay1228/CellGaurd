import React, { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { Activity, Clock } from 'lucide-react';
import { SensorReading } from '../types';

interface Props { history: SensorReading[]; }

export const LiveTelemetryChart: React.FC<Props> = ({ history }) => {
  const [tab, setTab] = useState<'all' | 'voltage' | 'current' | 'temperature'>('all');
  const data = history.slice(-30).map(r => ({
    time: new Date(r.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
    voltage: r.voltage, current: r.current, temperature: r.temperature
  }));

  const tabBtn = (id: typeof tab, label: string) => (
    <button key={id} onClick={() => setTab(id)} className={`px-2.5 py-1 rounded-md transition-all ${tab === id ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'text-stone-400 hover:text-white'}`}>{label}</button>
  );

  return (
    <div className="rounded-2xl bg-[#141008] border border-stone-800 p-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20"><Activity className="w-4 h-4" /></div>
          <div>
            <h4 className="text-xs font-bold tracking-wider uppercase text-stone-300">Live Telemetry</h4>
            <span className="text-[10px] font-mono text-stone-500 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> 30-sample window</span>
          </div>
        </div>
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-stone-900 border border-stone-800 text-[11px] font-mono">
          {tabBtn('all', 'All')}{tabBtn('voltage', 'V')}{tabBtn('current', 'A')}{tabBtn('temperature', '°C')}
        </div>
      </div>
      <div className="h-56 w-full pt-1">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-stone-500 text-xs font-mono">Connect ESP32 to stream telemetry</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2215" opacity={0.6} />
              <XAxis dataKey="time" stroke="#78716c" tick={{ fontSize: 10, fontFamily: 'monospace' }} interval={5} />
              <YAxis stroke="#78716c" tick={{ fontSize: 10, fontFamily: 'monospace' }} />
              <Tooltip contentStyle={{ backgroundColor: '#141008', borderColor: '#2d2215', borderRadius: '0.75rem', fontSize: '11px', fontFamily: 'monospace', color: '#e7e5e4' }} />
              {tab === 'voltage' && <ReferenceLine y={4.2} stroke="#f59e0b" strokeDasharray="3 3" />}
              {tab === 'voltage' && <ReferenceLine y={3.0} stroke="#dc2626" strokeDasharray="3 3" />}
              {tab === 'temperature' && <ReferenceLine y={45} stroke="#dc2626" strokeDasharray="3 3" />}
              {(tab === 'all' || tab === 'voltage') && <Line type="monotone" dataKey="voltage" name="V" stroke="#dc2626" strokeWidth={2} dot={false} isAnimationActive={false} />}
              {(tab === 'all' || tab === 'current') && <Line type="monotone" dataKey="current" name="A" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />}
              {(tab === 'all' || tab === 'temperature') && <Line type="monotone" dataKey="temperature" name="°C" stroke="#d4a017" strokeWidth={2} dot={false} isAnimationActive={false} />}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="flex items-center gap-3 text-[10px] font-mono text-stone-500 pt-2 border-t border-stone-800/80">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Voltage</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Current</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Temp</span>
      </div>
    </div>
  );
};
