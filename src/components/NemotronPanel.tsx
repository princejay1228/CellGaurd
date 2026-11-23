import React from 'react';
import {
  Brain,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  HelpCircle,
  FileSearch,
  Scale,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { NemotronAssessment, RiskLevel } from '../types';

interface NemotronPanelProps {
  assessment: NemotronAssessment | null;
  isCycleRunning: boolean;
}

export const NemotronPanel: React.FC<NemotronPanelProps> = ({ assessment, isCycleRunning }) => {
  const getRiskBadge = (risk: RiskLevel) => {
    switch (risk) {
      case 'LOW':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          icon: <ShieldCheck className="w-4 h-4" />,
          label: 'LOW HAZARD RISK'
        };
      case 'MODERATE':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          icon: <AlertTriangle className="w-4 h-4" />,
          label: 'MODERATE RISK'
        };
      case 'HIGH':
        return {
          bg: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
          icon: <Flame className="w-4 h-4" />,
          label: 'HIGH RISK EXCURSION'
        };
      case 'CRITICAL':
        return {
          bg: 'bg-rose-500/10 border-rose-500/40 text-rose-400 animate-pulse',
          icon: <ShieldAlert className="w-4 h-4" />,
          label: 'CRITICAL THERMAL/VOLTAGE ALERT'
        };
    }
  };

  const riskBadge = assessment ? getRiskBadge(assessment.riskLevel) : getRiskBadge('LOW');

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-[#0c152a] via-[#091021] to-[#060a16] border-2 border-cyan-500/30 p-5 sm:p-6 shadow-[0_0_30px_rgba(0,242,254,0.08)] mt-6">
      {/* Background ambient accent */}
      <div className="pointer-events-none absolute -top-24 right-0 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-0 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl" />

      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/40 text-cyan-300 shadow-md">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold tracking-wide text-white uppercase flex items-center gap-2">
                NVIDIA Nemotron 3 Ultra 550B A55B
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                FINAL ARBITER
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Supreme Electrochemical Synthesis & Evidence-Grounded Reasoning
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold border ${riskBadge.bg}`}>
            {riskBadge.icon} {riskBadge.label}
          </span>

          <span className="text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-full">
            Conf: <strong className="text-white">{assessment?.confidence.toFixed(1) || '96.2'}%</strong>
          </span>
        </div>
      </div>

      {/* Primary Final Battery Assessment Statement */}
      <div className="my-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 shadow-inner">
        <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold uppercase tracking-wider mb-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Final Battery Assessment
        </div>
        <p className="text-sm text-slate-200 font-sans leading-relaxed">
          {assessment?.finalBatteryAssessment ||
            'Awaiting snapshot completion. Nemotron will synthesize multi-model debate rounds with empirical cell physics once the first 30-second window concludes.'}
        </p>
      </div>

      {/* 2-Column Grid: Findings & Disagreements */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
        {/* Important Findings */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-2 text-slate-300 text-xs font-mono font-semibold uppercase mb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Important Findings
          </div>
          <ul className="space-y-1.5">
            {assessment?.importantFindings.length ? (
              assessment.importantFindings.map((finding, i) => (
                <li key={i} className="text-xs text-slate-300 font-sans flex items-start gap-2">
                  <span className="text-cyan-400 font-mono text-[10px] mt-0.5">•</span>
                  <span>{finding}</span>
                </li>
              ))
            ) : (
              <li className="text-xs text-slate-500 font-mono">No findings recorded yet.</li>
            )}
          </ul>
        </div>

        {/* Model Disagreements (Preserved!) */}
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-purple-500/20">
          <div className="flex items-center gap-2 text-purple-300 text-xs font-mono font-semibold uppercase mb-2">
            <Scale className="w-4 h-4 text-purple-400" /> Preserved Model Disagreements
          </div>
          <ul className="space-y-1.5">
            {assessment?.modelDisagreements.length ? (
              assessment.modelDisagreements.map((disagreement, i) => (
                <li key={i} className="text-xs text-slate-300 font-sans flex items-start gap-2">
                  <span className="text-purple-400 font-mono text-[10px] mt-0.5">≠</span>
                  <span>{disagreement}</span>
                </li>
              ))
            ) : (
              <li className="text-xs text-slate-500 font-mono">No model friction detected.</li>
            )}
          </ul>
        </div>
      </div>

      {/* 3-Column Grid: Evidence, Anomalies, Recommended Investigations */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-4">
        {/* Physical Evidence */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="text-[11px] font-mono font-bold text-cyan-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FileSearch className="w-3.5 h-3.5 text-cyan-400" /> Physical Evidence
          </div>
          <ul className="space-y-1">
            {assessment?.evidence.map((item, i) => (
              <li key={i} className="text-[11px] text-slate-300 font-mono flex items-start gap-1.5">
                <span className="text-cyan-500">›</span> {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Detected Anomalies */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> Anomalies Logged
          </div>
          <ul className="space-y-1">
            {assessment?.anomalies.map((item, i) => (
              <li key={i} className="text-[11px] text-slate-300 font-mono flex items-start gap-1.5">
                <span className="text-amber-500">!</span> {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Recommended Investigations */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
          <div className="text-[11px] font-mono font-bold text-emerald-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ArrowRight className="w-3.5 h-3.5 text-emerald-400" /> Recommended Actions
          </div>
          <ul className="space-y-1">
            {assessment?.recommendedInvestigations.map((item, i) => (
              <li key={i} className="text-[11px] text-slate-300 font-mono flex items-start gap-1.5">
                <span className="text-emerald-500">→</span> {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Limitations Footer */}
      <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-500">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-3 h-3 text-slate-400" />
          <span>
            Limitations: {assessment?.limitations?.[0] || 'Surface temperature measurements subject to thermal diffusion lag.'}
          </span>
        </div>
        <span>
          Execution Time: {assessment?.executionTimeMs || 120} ms • Model: {assessment?.modelId || 'nvidia/nemotron-3-ultra-550b-a55b'}
        </span>
      </div>
    </div>
  );
};
