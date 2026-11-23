import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { BatteryVisualizer } from './components/BatteryVisualizer';
import { SensorCards } from './components/SensorCards';
import { LiveTelemetryChart } from './components/LiveTelemetryChart';
import { ESP32Panel } from './components/ESP32Panel';
import { AIAgentCards } from './components/AIAgentCards';
import { DebateTranscript } from './components/DebateTranscript';
import { NemotronPanel } from './components/NemotronPanel';
import { AIChatView } from './components/AIChatView';
import { SettingsView } from './components/SettingsView';
import { DataLogsView } from './components/DataLogsView';
import { WifiProvisionModal } from './components/WifiProvisionModal';

import { monitoringService, MonitoringStatus } from './services/monitoringService';
import { debateEngine } from './services/debateEngine';
import { bleService } from './services/bleService';
import {
  SensorReading,
  AgentDebateState,
  DebateTranscriptEntry,
  NemotronAssessment,
  ESP32Status
} from './types';

export function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'chat' | 'settings' | 'logs'>('dashboard');
  const [currentReading, setCurrentReading] = useState<SensorReading | null>(null);
  const [readingHistory, setReadingHistory] = useState<SensorReading[]>([]);
  const [monitoringStatus, setMonitoringStatus] = useState<MonitoringStatus>(monitoringService.getStatus());
  const [espStatus, setEspStatus] = useState<ESP32Status>(bleService.getStatus());
  const [agents, setAgents] = useState<AgentDebateState[]>(debateEngine.getAgents());
  const [transcript, setTranscript] = useState<DebateTranscriptEntry[]>([]);
  const [lastAssessment, setLastAssessment] = useState<NemotronAssessment | null>(null);
  const [isWifiModalOpen, setIsWifiModalOpen] = useState(false);

  useEffect(() => {
    // 1. Subscribe to sensor readings
    const unsubscribeReading = monitoringService.onReading((reading) => {
      setCurrentReading(reading);
      setReadingHistory(prev => [...prev.slice(-60), reading]);
    });

    // 2. Subscribe to monitoring cycle status
    const unsubscribeStatus = monitoringService.onStatus((status) => {
      setMonitoringStatus(status);
      if (status.lastAssessment) {
        setLastAssessment(status.lastAssessment);
      }
    });

    // 3. Subscribe to BLE status
    bleService.onStatusChange((status) => {
      setEspStatus(status);
    });

    // 4. Hook up Debate Engine callbacks
    debateEngine.setCallbacks({
      onAgentStateChange: (updatedAgents) => {
        setAgents([...updatedAgents]);
      },
      onTranscriptEntry: (entry) => {
        setTranscript(prev => [...prev.slice(-30), entry]);
      },
      onNemotronComplete: (assessment) => {
        setLastAssessment(assessment);
      }
    });

    return () => {
      unsubscribeReading();
      unsubscribeStatus();
    };
  }, []);

  const handleManualCycle = async () => {
    await monitoringService.triggerCycle();
  };

  return (
    <div className="min-h-screen bg-[#0a0806] text-stone-100 flex flex-col font-sans selection:bg-red-950 selection:text-red-200">
      {/* Top Command Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        monitoringStatus={monitoringStatus}
        espStatus={espStatus}
        onTriggerManualCycle={handleManualCycle}
      />

      {/* Main App Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/*
              EXACT REQUIRED LAYOUT:
              Desktop: Left Half = Battery + ESP32 + Live Graphs
                       Right Half = Four AI Models + Live Debate Transcript
              Directly Below the Four Models = Nemotron Final Intelligence Panel
              Mobile: Stacks Vertically
            */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* LEFT HALF — BATTERY + SENSORS + ESP32 */}
              <div className="space-y-4">
                {/* Large Animated Battery Visualization */}
                <BatteryVisualizer reading={currentReading} />

                {/* Sensor Cards (Voltage, Current, Temp, Power, SOC, SOH) */}
                <SensorCards reading={currentReading} />

                {/* Live Recharts Graphs (Voltage, Current, Temperature) */}
                <LiveTelemetryChart history={readingHistory} />

                {/* ESP32 Connection Panel */}
                <ESP32Panel
                  status={espStatus}
                  lastReading={currentReading}
                  onOpenWifiModal={() => setIsWifiModalOpen(true)}
                />
              </div>

              {/* RIGHT HALF — FOUR AI MODELS + TRANSCRIPT + DIRECTLY BELOW = NEMOTRON */}
              <div className="space-y-4">
                {/* 2x2 Grid of Four AI Models */}
                <AIAgentCards
                  agents={agents}
                  isCycleRunning={monitoringStatus.isAnalyzing}
                />

                {/* Live Debate Transcript with Individual Model Responses */}
                <DebateTranscript
                  transcript={transcript}
                  isCycleRunning={monitoringStatus.isAnalyzing}
                />

                {/* DIRECTLY BELOW THE FOUR MODELS — NEMOTRON FINAL INTELLIGENCE */}
                <NemotronPanel
                  assessment={lastAssessment}
                  isCycleRunning={monitoringStatus.isAnalyzing}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <AIChatView currentReading={currentReading} />
        )}

        {activeTab === 'settings' && (
          <SettingsView />
        )}

        {activeTab === 'logs' && (
          <DataLogsView />
        )}
      </main>

      {/* Wi-Fi Provisioning Modal */}
      <WifiProvisionModal
        isOpen={isWifiModalOpen}
        onClose={() => setIsWifiModalOpen(false)}
      />

      {/* Footer Status Bar */}
      <footer className="border-t border-stone-800/80 bg-[#070503] px-4 py-2.5 text-center text-xs font-mono text-stone-500">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>CellGuard AI • Lithium-Ion Real-Time BMS & Debate Intelligence</span>
          <span>
            IndexedDB (Dexie.js) • NVIDIA NIM Models (Agent 1-4 + Nemotron) • Real Telemetry
          </span>
        </div>
      </footer>
    </div>
  );
}

export default App;
