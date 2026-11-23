import React, { useState } from 'react';
import { Bluetooth, RefreshCw, Radio, AlertCircle, Network } from 'lucide-react';
import { ESP32Status, SensorReading } from '../types';
import { bleService } from '../services/bleService';

interface Props { status: ESP32Status; lastReading: SensorReading | null; onOpenWifiModal: () => void; }

export const ESP32Panel: React.FC<Props> = ({ status, lastReading, onOpenWifiModal }) => {
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleConnect = async () => {
    setErrorMsg(null); setConnecting(true);
    try { await bleService.connect(); } catch (e: any) { setErrorMsg(e?.message || 'Connection failed.'); }
    finally { setConnecting(false); }
  };

  const timeAgo = lastReading ? `${Math.max(0, Math.round((Date.now() - lastReading.timestamp) / 1000))}s ago` : 'None';

  return (
    <div className="rounded-2xl bg-[#141008] border border-stone-800 p-4 shadow-xl mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg border ${status.connected ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-stone-800 text-stone-400 border-stone-700'}`}>
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold tracking-wider uppercase text-stone-300">ESP32 DevKit V1</h4>
            <p className="text-[10px] text-stone-500 font-mono">INA219 • DS18B20 • OLED</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono border ${status.connected ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-stone-900 border-stone-800 text-stone-400'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.connected ? 'bg-amber-400 animate-pulse' : 'bg-stone-500'}`} />
          {status.connected ? 'HARDWARE LIVE' : 'DISCONNECTED'}
        </span>
      </div>

      {errorMsg && (
        <div className="mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" /><span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3.5 text-center">
        <div className="p-2 rounded-lg bg-stone-900/80 border border-stone-800">
          <p className="text-[10px] uppercase font-mono text-stone-500">Status</p>
          <p className={`text-xs font-bold font-mono ${status.connected ? 'text-amber-400' : 'text-stone-400'}`}>{status.connected ? 'CONNECTED' : 'OFFLINE'}</p>
        </div>
        <div className="p-2 rounded-lg bg-stone-900/80 border border-stone-800">
          <p className="text-[10px] uppercase font-mono text-stone-500">Transport</p>
          <p className="text-xs font-bold font-mono text-red-400">{status.mode === 'ble' ? 'Bluetooth BLE' : 'Wi-Fi'}</p>
        </div>
        <div className="p-2 rounded-lg bg-stone-900/80 border border-stone-800">
          <p className="text-[10px] uppercase font-mono text-stone-500">Last Reading</p>
          <p className="text-xs font-bold font-mono text-stone-200">{timeAgo}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-800/80">
        {!status.connected ? (
          <button onClick={handleConnect} disabled={connecting} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white font-mono shadow-md transition-all disabled:opacity-50">
            {connecting ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Pairing...</> : <><Bluetooth className="w-3.5 h-3.5" /> Connect ESP32</>}
          </button>
        ) : (
          <button onClick={() => bleService.disconnect()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 font-mono transition-all">Disconnect</button>
        )}
        <button onClick={onOpenWifiModal} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 font-mono transition-all">
          <Network className="w-3.5 h-3.5 text-amber-400" /> Wi-Fi Provision
        </button>
      </div>
    </div>
  );
};
