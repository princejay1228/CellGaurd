import React, { useState } from 'react';
import { Bluetooth, Wifi, RefreshCw, Radio, AlertCircle, Sparkles, Network } from 'lucide-react';
import { ESP32Status, SensorReading } from '../types';
import { bleService } from '../services/bleService';

interface ESP32PanelProps {
  status: ESP32Status;
  lastReading: SensorReading | null;
  onOpenWifiModal: () => void;
}

export const ESP32Panel: React.FC<ESP32PanelProps> = ({ status, lastReading, onOpenWifiModal }) => {
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleConnectBLE = async () => {
    setErrorMsg(null);
    setConnecting(true);
    try {
      await bleService.connect();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Bluetooth connection cancelled or failed.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnectBLE = async () => {
    try {
      await bleService.disconnect();
    } catch (e) {
      console.error(e);
    }
  };

  const timeAgoStr = lastReading
    ? `${Math.max(0, Math.round((Date.now() - lastReading.timestamp) / 1000))}s ago`
    : 'None';

  return (
    <div className="rounded-2xl bg-[#0c1322] border border-slate-800 p-4 shadow-xl mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${
            status.connected
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-wider uppercase text-slate-300">
              ESP32 DevKit V1 Hardware Interface
            </h4>
            <p className="text-[10px] text-slate-500 font-mono">
              INA219 (GPIO 21/22) • DS18B20 (GPIO 4) • OLED 128x64
            </p>
          </div>
        </div>

        {/* Mode & Simulation Indicators */}
        <div className="flex items-center gap-2">
          {status.isSimulating ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-cyan-950/60 border border-cyan-800/60 text-cyan-300">
              <Sparkles className="w-3 h-3 text-cyan-400" /> SIMULATION ACTIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-emerald-950/60 border border-emerald-800/60 text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> HARDWARE STREAM
            </span>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="mb-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Connection Specs & Status Details */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3.5 text-center">
        <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/90">
          <p className="text-[10px] uppercase font-mono text-slate-500">Link Status</p>
          <p className={`text-xs font-bold font-mono ${status.connected ? 'text-emerald-400' : 'text-slate-400'}`}>
            {status.connected ? 'CONNECTED' : 'DISCONNECTED'}
          </p>
        </div>

        <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/90">
          <p className="text-[10px] uppercase font-mono text-slate-500">Transport</p>
          <p className="text-xs font-bold font-mono text-cyan-400 flex items-center justify-center gap-1">
            {status.mode === 'ble' ? <Bluetooth className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
            {status.mode === 'ble' ? 'Bluetooth BLE' : 'Wi-Fi HTTP'}
          </p>
        </div>

        <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/90">
          <p className="text-[10px] uppercase font-mono text-slate-500">Last Telemetry</p>
          <p className="text-xs font-bold font-mono text-slate-200">
            {timeAgoStr}
          </p>
        </div>

        <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800/90">
          <p className="text-[10px] uppercase font-mono text-slate-500">Data Source</p>
          <p className="text-xs font-bold font-mono text-slate-300">
            {lastReading?.source.toUpperCase() || 'SIMULATED'}
          </p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-2">
          {!status.connected ? (
            <button
              onClick={handleConnectBLE}
              disabled={connecting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono shadow-md hover:shadow-cyan-500/20 transition-all disabled:opacity-50"
            >
              {connecting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Pairing ESP32...
                </>
              ) : (
                <>
                  <Bluetooth className="w-3.5 h-3.5" /> Connect ESP32 (BLE)
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleDisconnectBLE}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30 font-mono transition-all"
            >
              Disconnect
            </button>
          )}

          <button
            onClick={onOpenWifiModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono transition-all"
          >
            <Network className="w-3.5 h-3.5 text-cyan-400" /> Provision Wi-Fi
          </button>
        </div>

        <span className="text-[11px] font-mono text-slate-500">
          {status.connected ? `Device: ${status.deviceName || 'ESP32'}` : 'Fallback simulator active'}
        </span>
      </div>
    </div>
  );
};
