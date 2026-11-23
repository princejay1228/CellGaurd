import React, { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { Activity, Clock } from 'lucide-react';
import { SensorReading } from '../types';

interface LiveTelemetryChartProps {
  history: SensorReading[];
}

export const LiveTelemetryChart: React.FC<LiveTelemetryChartProps> = ({ history }) => {
  const [metricTab, setMetricTab] = useState<'all' | 'voltage' | 'current' | 'temperature'>('all');

  // Format data for Recharts (show last 30 readings)
  const chartData = history.slice(-30).map((r, i) => ({
    time: new Date(r.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' }),
    voltage: r.voltage,
    current: r.current,
    temperature: r.temperature,
    power: r.power,
    index: i
  }));

  return (
    <div className="rounded-2xl bg-[#0c1322] border border-slate-800 p-4 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-wider uppercase text-slate-300">
              Real-Time Telemetry Stream
            </h4>
            <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" /> Rolling 30-sample sliding window
            </span>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono">
          <button
            onClick={() => setMetricTab('all')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              metricTab === 'all'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setMetricTab('voltage')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              metricTab === 'voltage'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Volt (V)
          </button>
          <button
            onClick={() => setMetricTab('current')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              metricTab === 'current'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Curr (A)
          </button>
          <button
            onClick={() => setMetricTab('temperature')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              metricTab === 'temperature'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Temp (°C)
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-56 w-full pt-1">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
            Waiting for telemetry frames...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
              <XAxis
                dataKey="time"
                stroke="#64748b"
                tick={{ fontSize: 10, fontFamily: 'monospace' }}
                interval={5}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fontSize: 10, fontFamily: 'monospace' }}
                domain={
                  metricTab === 'voltage'
                    ? [2.8, 4.4]
                    : metricTab === 'current'
                    ? ['auto', 'auto']
                    : metricTab === 'temperature'
                    ? [20, 65]
                    : ['auto', 'auto']
                }
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0c1322',
                  borderColor: '#1e293b',
                  borderRadius: '0.75rem',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: '#e2e8f0'
                }}
              />

              {/* Threshold guidelines */}
              {metricTab === 'voltage' && (
                <>
                  <ReferenceLine y={4.2} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'MAX 4.2V', fill: '#f59e0b', fontSize: 9 }} />
                  <ReferenceLine y={3.0} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'CUT-OFF 3.0V', fill: '#f43f5e', fontSize: 9 }} />
                </>
              )}
              {metricTab === 'temperature' && (
                <ReferenceLine y={45} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: 'CRITICAL 45°C', fill: '#f43f5e', fontSize: 9 }} />
              )}

              {/* Voltage Line */}
              {(metricTab === 'all' || metricTab === 'voltage') && (
                <Line
                  type="monotone"
                  dataKey="voltage"
                  name="Voltage (V)"
                  stroke="#00f2fe"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              )}

              {/* Current Line */}
              {(metricTab === 'all' || metricTab === 'current') && (
                <Line
                  type="monotone"
                  dataKey="current"
                  name="Current (A)"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              )}

              {/* Temperature Line */}
              {(metricTab === 'all' || metricTab === 'temperature') && (
                <Line
                  type="monotone"
                  dataKey="temperature"
                  name="Temp (°C)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> Voltage (V)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Current (A)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Temp (°C)
          </span>
        </div>
        <span>Frequency: 1.0 Hz</span>
      </div>
    </div>
  );
};
