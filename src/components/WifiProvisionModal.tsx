import React, { useState } from 'react';
import { X, Wifi, ShieldAlert, CheckCircle2, RefreshCw, Radio, Lock } from 'lucide-react';
import { bleService } from '../services/bleService';

interface Props { isOpen: boolean; onClose: () => void; }

export const WifiProvisionModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ssid.trim()) return;
    setIsSending(true); setFeedback(null);
    const res = await bleService.provisionWifi(ssid.trim(), password);
    setFeedback(res); setIsSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl bg-[#141008] border border-stone-800 p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30"><Wifi className="w-5 h-5" /></div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Wi-Fi Provisioning</h3>
              <p className="text-[11px] text-stone-400 font-mono">Send credentials via BLE</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-3 rounded-xl bg-stone-900 border border-stone-800 text-[11px] text-stone-300">
          <div className="flex items-center gap-1.5 font-mono font-bold text-amber-300"><Lock className="w-3.5 h-3.5 text-amber-400" /> Security</div>
          <p className="mt-1 leading-relaxed">Router credentials are <strong>never</strong> saved to IndexedDB. They are sent directly to ESP32 over BLE. Browser CORS/PNA policies may block direct HTTP to local ESP32 IP; Bluetooth remains the primary link.</p>
        </div>

        <form onSubmit={handleSend} className="space-y-3.5 pt-1">
          <div>
            <label className="block text-xs font-mono text-stone-300 mb-1">SSID (2.4 GHz)</label>
            <input type="text" value={ssid} onChange={e => setSsid(e.target.value)} required className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 text-xs font-mono focus:outline-none focus:border-red-500" />
          </div>
          <div>
            <label className="block text-xs font-mono text-stone-300 mb-1">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-700 text-stone-100 text-xs font-mono focus:outline-none focus:border-red-500" />
          </div>
          {feedback && (
            <div className={`p-3 rounded-xl border text-xs ${feedback.success ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
              {feedback.success ? <CheckCircle2 className="w-4 h-4 inline text-amber-400 mr-1" /> : <ShieldAlert className="w-4 h-4 inline text-red-400 mr-1" />}
              {feedback.message}
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-mono">Cancel</button>
            <button type="submit" disabled={isSending || !ssid.trim()} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs font-mono flex items-center gap-1.5 disabled:opacity-50">
              {isSending ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sending...</> : <><Radio className="w-3.5 h-3.5" /> Provision</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
