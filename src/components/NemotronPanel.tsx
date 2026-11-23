import React from 'react';
import { Brain, ShieldAlert, ShieldCheck, AlertTriangle, Flame, CheckCircle2, HelpCircle, FileSearch, Scale, ArrowRight } from 'lucide-react';
import { NemotronAssessment, RiskLevel } from '../types';

interface Props { assessment: NemotronAssessment | null; isCycleRunning: boolean; }

const riskBadge = (r: RiskLevel) => {
  if (r === 'LOW') return { cls: 'bg-amber-500/10 border-amber-500/30 text-amber-400', icon: <ShieldCheck className="w-4 h-4" />, label: 'LOW RISK' };
  if (r === 'MODERATE') return { cls: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400', icon: <AlertTriangle className="w-4 h-4" />, label: 'MODERATE' };
  if (r === 'HIGH') return { cls: 'bg-orange-500/10 border-orange-500/30 text-orange-400', icon: <Flame className="w-4 h-4" />, label: 'HIGH RISK' };
  return { cls: 'bg-red-500/10 border-red-500/40 text-red-400 animate-pulse', icon: <ShieldAlert className="w-4 h-4" />, label: 'CRITICAL' };
};

export const NemotronPanel: React.FC<Props> = ({ assessment }) => {
  const badge = assessment ? riskBadge(assessment.riskLevel) : null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#140c06] via-[#0f0a04] to-[#0a0604] border-2 border-red-500/30 p-5 sm:p-6 shadow-[0_0_30px_rgba(220,38,38,0.08)] mt-6">
      <div className="pointer-events-none absolute -top-24 right-0 w-80 h-80 rounded-full bg-red-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-0 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500/20 to-amber-500/20 border border-red-500/40 text-red-400 shadow-md"><Brain className="w-6 h-6" /></div>
          <div>
            <h3 className="text-base font-extrabold tracking-wide text-white uppercase">Final Intelligence</h3>
            <p className="text-xs text-stone-400 font-mono">{assessment?.modelId || 'Nemotron arbiter — configure model in Settings'}</p>
          </div>
        </div>
        {badge && (
          <div className="flex items-center gap-2.5">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${badge.cls}`}>{badge.icon} {badge.label}</span>
            <span className="text-xs font-mono text-stone-400 bg-stone-900 border border-stone-800 px-2.5 py-1 rounded-full">Conf: <strong className="text-white">{assessment!.confidence.toFixed(1)}%</strong></span>
          </div>
        )}
      </div>

      {!assessment ? (
        <div className="my-6 p-4 rounded-xl bg-stone-950/80 border border-stone-800 text-center text-stone-500 text-xs font-mono">
          No assessment yet. Connect ESP32 hardware and configure NVIDIA API key to run a real analysis cycle.
        </div>
      ) : (
        <>
          <div className="my-4 p-4 rounded-xl bg-stone-950/80 border border-stone-800/90">
            <div className="flex items-center gap-2 text-red-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1.5"><Brain className="w-3.5 h-3.5" /> Assessment</div>
            <p className="text-sm text-stone-200 leading-relaxed">{assessment.finalBatteryAssessment}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
            <div className="p-3.5 rounded-xl bg-stone-900/60 border border-stone-800">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-mono font-semibold uppercase mb-2"><CheckCircle2 className="w-4 h-4 text-amber-400" /> Findings</div>
              <ul className="space-y-1.5">{assessment.importantFindings.map((f, i) => <li key={i} className="text-xs text-stone-300 flex items-start gap-2"><span className="text-red-400 font-mono text-[10px] mt-0.5">•</span>{f}</li>)}</ul>
            </div>
            <div className="p-3.5 rounded-xl bg-stone-900/60 border border-amber-500/20">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-mono font-semibold uppercase mb-2"><Scale className="w-4 h-4 text-amber-400" /> Disagreements</div>
              <ul className="space-y-1.5">{assessment.modelDisagreements.map((d, i) => <li key={i} className="text-xs text-stone-300 flex items-start gap-2"><span className="text-amber-400 font-mono text-[10px] mt-0.5">≠</span>{d}</li>)}</ul>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
            <div className="p-3 rounded-xl bg-stone-950/70 border border-stone-800">
              <div className="text-[11px] font-mono font-bold text-red-300 uppercase tracking-wider mb-2 flex items-center gap-1.5"><FileSearch className="w-3.5 h-3.5 text-red-400" /> Evidence</div>
              <ul className="space-y-1">{assessment.evidence.map((e, i) => <li key={i} className="text-[11px] text-stone-300 font-mono flex items-start gap-1.5"><span className="text-red-500">›</span> {e}</li>)}</ul>
            </div>
            <div className="p-3 rounded-xl bg-stone-950/70 border border-stone-800">
              <div className="text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Anomalies</div>
              <ul className="space-y-1">{assessment.anomalies.map((a, i) => <li key={i} className="text-[11px] text-stone-300 font-mono flex items-start gap-1.5"><span className="text-amber-500">!</span> {a}</li>)}</ul>
            </div>
            <div className="p-3 rounded-xl bg-stone-950/70 border border-stone-800">
              <div className="text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5"><ArrowRight className="w-3.5 h-3.5 text-amber-400" /> Actions</div>
              <ul className="space-y-1">{assessment.recommendedInvestigations.map((r, i) => <li key={i} className="text-[11px] text-stone-300 font-mono flex items-start gap-1.5"><span className="text-amber-500">→</span> {r}</li>)}</ul>
            </div>
          </div>

          <div className="pt-3 border-t border-stone-800/80 text-[10px] font-mono text-stone-500 flex flex-wrap items-center justify-between gap-2">
            <span><HelpCircle className="w-3 h-3 inline text-stone-400" /> {assessment.limitations?.[0] || 'No limitations reported.'}</span>
            <span>Exec: {assessment.executionTimeMs}ms</span>
          </div>
        </>
      )}
    </div>
  );
};
