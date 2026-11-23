import React, { useState, useEffect } from 'react';
import { Database, Clock, RefreshCw, FileText, ChevronRight } from 'lucide-react';
import { db } from '../db';
import { SensorReading, Snapshot30s, NemotronAssessment } from '../types';

export const DataLogsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'readings' | 'snapshots' | 'assessments'>('snapshots');
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot30s[]>([]);
  const [assessments, setAssessments] = useState<NemotronAssessment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'readings') {
        const list = await db.sensorReadings.orderBy('timestamp').reverse().limit(50).toArray();
        setReadings(list);
      } else if (activeTab === 'snapshots') {
        const list = await db.snapshots30s.orderBy('timestamp').reverse().limit(50).toArray();
        setSnapshots(list);
      } else {
        const list = await db.nemotronAssessments.orderBy('timestamp').reverse().limit(50).toArray();
        setAssessments(list);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" /> IndexedDB Telemetry & AI Records
          </h2>
          <p className="text-xs text-slate-400 font-sans">
            Inspecting locally persisted Dexie.js database tables
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono">
            <button
              onClick={() => setActiveTab('snapshots')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'snapshots'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              30s Snapshots
            </button>
            <button
              onClick={() => setActiveTab('assessments')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'assessments'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Nemotron Records
            </button>
            <button
              onClick={() => setActiveTab('readings')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'readings'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Raw Readings
            </button>
          </div>

          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table Display */}
      <div className="rounded-2xl bg-[#0c1322] border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          {activeTab === 'snapshots' && (
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Voltage Avg (Min/Max)</th>
                  <th className="p-3">Current Avg (Min/Max)</th>
                  <th className="p-3">Temp Avg (Min/Max)</th>
                  <th className="p-3">Power</th>
                  <th className="p-3">SOC / SOH</th>
                  <th className="p-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {snapshots.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-slate-500">
                      No snapshots recorded yet. Next 30s cycle will save automatically.
                    </td>
                  </tr>
                ) : (
                  snapshots.map(s => (
                    <tr key={s.id} className="hover:bg-slate-900/50">
                      <td className="p-3 text-slate-400">
                        {new Date(s.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })}
                      </td>
                      <td className="p-3 text-cyan-300">
                        {s.avgVoltage.toFixed(3)}V <span className="text-[10px] text-slate-500">({s.minVoltage.toFixed(2)} - {s.maxVoltage.toFixed(2)})</span>
                      </td>
                      <td className="p-3 text-emerald-300">
                        {s.avgCurrent.toFixed(3)}A <span className="text-[10px] text-slate-500">({s.minCurrent.toFixed(2)} - {s.maxCurrent.toFixed(2)})</span>
                      </td>
                      <td className="p-3 text-amber-300">
                        {s.avgTemp.toFixed(1)}°C <span className="text-[10px] text-slate-500">(max {s.maxTemp.toFixed(1)})</span>
                      </td>
                      <td className="p-3">{s.avgPower.toFixed(2)}W</td>
                      <td className="p-3 font-semibold text-slate-200">
                        {s.currentSoc.toFixed(0)}% / {s.currentSoh.toFixed(0)}%
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]">
                          {s.isSimulated ? 'SIMULATED' : 'HARDWARE'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'assessments' && (
            <div className="divide-y divide-slate-800/80 p-3 space-y-3">
              {assessments.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-mono text-xs">
                  No Nemotron assessments saved yet.
                </div>
              ) : (
                assessments.map(a => (
                  <div key={a.id} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-cyan-300">
                          Snapshot #{a.snapshotId}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(a.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {a.riskLevel} RISK • {a.confidence.toFixed(1)}% CONF
                      </span>
                    </div>
                    <p className="text-xs text-slate-200 font-sans leading-relaxed">
                      {a.finalBatteryAssessment}
                    </p>
                    <div className="text-[10px] font-mono text-slate-400 flex flex-wrap gap-3 pt-1">
                      <span>Model: {a.modelId}</span>
                      <span>Execution: {a.executionTimeMs} ms</span>
                      <span>Disagreements: {a.modelDisagreements.length}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'readings' && (
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Voltage</th>
                  <th className="p-3">Current</th>
                  <th className="p-3">Temperature</th>
                  <th className="p-3">Power</th>
                  <th className="p-3">SOC</th>
                  <th className="p-3">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {readings.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/50">
                    <td className="p-3 text-slate-400">
                      {new Date(r.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="p-3 text-cyan-300 font-bold">{r.voltage.toFixed(3)} V</td>
                    <td className="p-3 text-emerald-300">{r.current.toFixed(3)} A</td>
                    <td className="p-3 text-amber-300">{r.temperature.toFixed(2)} °C</td>
                    <td className="p-3">{r.power.toFixed(3)} W</td>
                    <td className="p-3">{r.soc.toFixed(1)}%</td>
                    <td className="p-3 text-slate-400">{r.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
