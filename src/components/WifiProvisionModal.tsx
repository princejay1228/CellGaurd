import React, { useState } from 'react';
import { X, Wifi, ShieldAlert, CheckCircle2, RefreshCw, Radio, Lock } from 'lucide-react';
import { bleService } from '../services/bleService';

interface WifiProvisionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WifiProvisionModal: React.FC<WifiProvisionModalProps> = ({ isOpen, onClose }) => {
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSendCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ssid.trim()) return;

    setIsSending(true);
    setFeedback(null);

    // Send over BLE characteristic (Never save password in Dexie / IndexedDB)
    const res = await bleService.provisionWifi(ssid.trim(), password);
    setFeedback(res);
    setIsSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl bg-[#0c1322] border border-slate-800 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                ESP32 Wi-Fi Provisioning
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Provision 2.4 GHz credentials via Web Bluetooth
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Browser Security & Network Disclosure */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-sans text-slate-300 space-y-1.5">
          <div className="flex items-center gap-1.5 font-mono font-bold text-amber-300">
            <Lock className="w-3.5 h-3.5 text-amber-400" /> Security & Privacy Guard
          </div>
          <p className="leading-relaxed">
            Router credentials are <strong>never</strong> saved to Dexie or persistent local storage. They are sent directly to the ESP32 over the encrypted BLE provisioning GATT characteristic.
          </p>
          <p className="text-slate-400 leading-relaxed">
            Note: Browsers enforce strict Private Network Access (PNA) and Mixed-Content policies on HTTPS origins. If direct HTTP to local ESP32 IP is blocked by your browser, Bluetooth BLE automatically remains your primary high-speed telemetry link.
          </p>
        </div>

        <form onSubmit={handleSendCredentials} className="space-y-3.5 pt-1">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">
              Network SSID (2.4 GHz Wi-Fi)
            </label>
            <input
              type="text"
              value={ssid}
              onChange={(e) => setSsid(e.target.value)}
              placeholder="e.g. Home_Lab_2.4G"
              required
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1">
              Wi-Fi Password / Passphrase
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          {feedback && (
            <div className={`p-3 rounded-xl border text-xs font-sans ${
              feedback.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              <div className="flex items-center gap-2 font-mono font-bold">
                {feedback.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <ShieldAlert className="w-4 h-4 text-rose-400" />}
                {feedback.success ? 'Credentials Dispatched' : 'Transmission Failed'}
              </div>
              <p className="mt-1">{feedback.message}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSending || !ssid.trim()}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Transmitting...
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5" /> Provision ESP32
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
