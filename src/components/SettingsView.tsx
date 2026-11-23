import React, { useState, useEffect } from 'react';
import {
  Key,
  ShieldAlert,
  Server,
  Activity,
  Download,
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Cpu,
  Lock,
  ExternalLink
} from 'lucide-react';
import { nvidiaService, NIMSettings, DEFAULT_NIM_SETTINGS } from '../services/nvidiaService';
import { db } from '../db';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<NIMSettings>(nvidiaService.getSettings());
  const [showKey, setShowKey] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    corsBlocked?: boolean;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    setSettings(nvidiaService.getSettings());
  }, []);

  const handleSave = () => {
    nvidiaService.saveSettings(settings);
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 2500);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    nvidiaService.saveSettings(settings);

    const res = await nvidiaService.testConnection();
    setTestResult({
      tested: true,
      success: res.success,
      message: res.message,
      corsBlocked: res.corsBlocked
    });
    setIsTesting(false);
  };

  const handleClearKey = () => {
    nvidiaService.clearApiKey();
    setSettings(prev => ({ ...prev, apiKey: '' }));
  };

  const handleExportJSON = async () => {
    const json = await db.exportAllDataJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cellguard-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setExportNotice('Exported full database backup to JSON.');
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleExportReadingsCSV = async () => {
    const csv = await db.exportReadingsCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cellguard-readings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setExportNotice('Exported 1,000 recent sensor readings to CSV.');
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleExportAssessmentsCSV = async () => {
    const csv = await db.exportAssessmentsCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cellguard-nemotron-assessments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setExportNotice('Exported historical Nemotron assessments to CSV.');
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleClearTelemetry = async () => {
    if (window.confirm('Are you sure you want to clear all recorded telemetry, snapshots, and debate records from IndexedDB?')) {
      await db.clearAllTelemetry();
      setExportNotice('Telemetry history cleared.');
      setTimeout(() => setExportNotice(null), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
          <Server className="w-5 h-5 text-cyan-400" /> System & NVIDIA NIM Configuration
        </h2>
        <p className="text-xs text-slate-400 font-sans mt-0.5">
          Configure model parameters, API credentials, CORS compatibility, and local IndexedDB backups.
        </p>
      </div>

      {/* Prototype Security Notice Card */}
      <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 text-xs font-sans text-amber-200 flex items-start gap-3">
        <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold font-mono uppercase text-amber-300">
            Personal-Prototype Security Disclosure
          </h4>
          <p className="mt-1 text-slate-300 leading-relaxed">
            API keys entered through browser inputs are stored in client-side localStorage/IndexedDB. Client-side storage is not secure against browser inspection or developer tools. Use this solely for personal testing and evaluation. Always use dedicated, scoped keys and revoke them when testing concludes.
          </p>
        </div>
      </div>

      {/* NVIDIA NIM Credentials & Endpoint */}
      <div className="rounded-2xl bg-[#0c1322] border border-slate-800 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Key className="w-4 h-4 text-cyan-400" /> NVIDIA API Key & Endpoint
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            Calls Made: <strong className="text-white">{nvidiaService.getApiCallCount()}</strong>
          </span>
        </div>

        {/* API Key */}
        <div>
          <label className="block text-xs font-mono text-slate-300 mb-1">
            NVIDIA NIM API Key (Bearer Token)
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? 'text' : 'password'}
                value={settings.apiKey}
                onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                placeholder="nvapi-..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 placeholder:text-slate-600 text-xs font-mono focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={handleClearKey}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono"
            >
              Clear Key
            </button>
          </div>
        </div>

        {/* Base URL */}
        <div>
          <label className="block text-xs font-mono text-slate-300 mb-1">
            NVIDIA NIM Base URL (OpenAI-Compatible endpoint)
          </label>
          <input
            type="text"
            value={settings.baseUrl}
            onChange={(e) => setSettings({ ...settings, baseUrl: e.target.value })}
            placeholder="https://integrate.api.nvidia.com/v1"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Test Connection Button */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow-md disabled:opacity-50"
          >
            {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
            Test NVIDIA Connection & Browser CORS
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-medium"
          >
            Save Settings
          </button>

          {saveFeedback && (
            <span className="text-emerald-400 font-mono text-xs flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
            </span>
          )}
        </div>

        {/* Connection Test Result */}
        {testResult && (
          <div className={`p-3.5 rounded-xl border text-xs font-sans mt-3 ${
            testResult.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : testResult.corsBlocked
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            <div className="flex items-center gap-2 font-mono font-bold uppercase mb-1">
              {testResult.success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Connection Successful
                </>
              ) : testResult.corsBlocked ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-400" /> Browser CORS Restriction Detected
                </>
              ) : (
                <>
                  <ShieldAlert className="w-4 h-4 text-rose-400" /> Connection Failed
                </>
              )}
            </div>
            <p className="leading-relaxed">{testResult.message}</p>
          </div>
        )}
      </div>

      {/* Model Identifiers Configuration */}
      <div className="rounded-2xl bg-[#0c1322] border border-slate-800 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-purple-400" /> Four Debate Models & Nemotron Identifier
          </h3>
          <span className="text-[11px] font-mono text-slate-500">Configurable Identifiers</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Model 1 */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-amber-300">Agent 1: Thermal Specialist</span>
              <input
                type="checkbox"
                checked={settings.enabledModels.model1}
                onChange={(e) => setSettings({
                  ...settings,
                  enabledModels: { ...settings.enabledModels, model1: e.target.checked }
                })}
                className="rounded accent-cyan-500"
              />
            </div>
            <input
              type="text"
              value={settings.model1}
              onChange={(e) => setSettings({ ...settings, model1: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200"
            />
          </div>

          {/* Model 2 */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-cyan-300">Agent 2: Physics Reasoner</span>
              <input
                type="checkbox"
                checked={settings.enabledModels.model2}
                onChange={(e) => setSettings({
                  ...settings,
                  enabledModels: { ...settings.enabledModels, model2: e.target.checked }
                })}
                className="rounded accent-cyan-500"
              />
            </div>
            <input
              type="text"
              value={settings.model2}
              onChange={(e) => setSettings({ ...settings, model2: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200"
            />
          </div>

          {/* Model 3 */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-purple-300">Agent 3: Degradation Analyst</span>
              <input
                type="checkbox"
                checked={settings.enabledModels.model3}
                onChange={(e) => setSettings({
                  ...settings,
                  enabledModels: { ...settings.enabledModels, model3: e.target.checked }
                })}
                className="rounded accent-cyan-500"
              />
            </div>
            <input
              type="text"
              value={settings.model3}
              onChange={(e) => setSettings({ ...settings, model3: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200"
            />
          </div>

          {/* Model 4 */}
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-emerald-300">Agent 4: Safety Auditor</span>
              <input
                type="checkbox"
                checked={settings.enabledModels.model4}
                onChange={(e) => setSettings({
                  ...settings,
                  enabledModels: { ...settings.enabledModels, model4: e.target.checked }
                })}
                className="rounded accent-cyan-500"
              />
            </div>
            <input
              type="text"
              value={settings.model4}
              onChange={(e) => setSettings({ ...settings, model4: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-slate-200"
            />
          </div>
        </div>

        {/* Nemotron Final Reasoner */}
        <div className="pt-2">
          <label className="block text-xs font-mono text-cyan-300 font-bold mb-1">
            Nemotron Final Reasoning Model Identifier
          </label>
          <input
            type="text"
            value={settings.nemotronModel}
            onChange={(e) => setSettings({ ...settings, nemotronModel: e.target.value })}
            placeholder="nvidia/nemotron-3-ultra-550b-a55b"
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-cyan-500/40 text-slate-100 text-xs font-mono focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Database Management & Export */}
      <div className="rounded-2xl bg-[#0c1322] border border-slate-800 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-400" /> Local Dexie.js Data Export & Backup
          </h3>
          <span className="text-[11px] font-mono text-emerald-400">IndexedDB Client-Only</span>
        </div>

        {exportNotice && (
          <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono">
            {exportNotice}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportJSON}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" /> Export Full JSON Backup
          </button>

          <button
            onClick={handleExportReadingsCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" /> Export Sensor Readings (CSV)
          </button>

          <button
            onClick={handleExportAssessmentsCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5 text-purple-400" /> Export Nemotron History (CSV)
          </button>

          <button
            onClick={handleClearTelemetry}
            className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear History
          </button>
        </div>
      </div>
    </div>
  );
};
