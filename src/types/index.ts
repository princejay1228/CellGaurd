export type DataSource = 'ble' | 'wifi' | 'simulated';

export type BatteryState = 'idle' | 'charging' | 'discharging' | 'anomaly';

export interface SensorReading {
  id?: number;
  timestamp: number;
  voltage: number;       // Volts (V)
  current: number;       // Amperes (A) - positive charging, negative discharging
  temperature: number;   // Celsius (°C)
  power: number;         // Watts (W) = V * |I|
  soc: number;           // State of Charge (0-100%)
  soh: number;           // State of Health (0-100%)
  isSimulated: boolean;
  source: DataSource;
}

export interface Snapshot30s {
  id?: number;
  timestamp: number;
  startTime: number;
  endTime: number;
  readingCount: number;
  avgVoltage: number;
  minVoltage: number;
  maxVoltage: number;
  avgCurrent: number;
  minCurrent: number;
  maxCurrent: number;
  avgTemp: number;
  minTemp: number;
  maxTemp: number;
  avgPower: number;
  minPower: number;
  maxPower: number;
  currentSoc: number;
  currentSoh: number;
  isSimulated: boolean;
}

export type HealthVerdict = 'OPTIMAL' | 'DEGRADED' | 'ANOMALOUS' | 'CRITICAL';
export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface ModelConfig {
  id: string;            // NIM model identifier e.g. "meta/llama-3.3-70b-instruct"
  name: string;          // Human friendly name e.g. "Llama 3.3 70B"
  role: string;          // Specialty e.g. "Thermal & Chemical Kinetics Specialist"
  enabled: boolean;
  avatarColor: string;
}

export interface AgentDebateState {
  modelId: string;
  modelName: string;
  role: string;
  status: 'idle' | 'thinking' | 'argued' | 'error';
  currentRound: number; // 0=analysis, 1=critique, 2=rebuttal, 3=final
  currentPosition: HealthVerdict;
  confidence: number;   // 0-100%
  latestArgument: string;
  isLiveAPI: boolean;
}

export interface AIResponseRecord {
  id?: number;
  snapshotId: number;
  timestamp: number;
  modelId: string;
  modelName: string;
  round: number; // 0 = initial, 1 = critique, 2 = rebuttal, 3 = final
  content: string;
  confidence: number;
  healthVerdict: HealthVerdict;
  isLiveAPI: boolean;
}

export interface DebateTranscriptEntry {
  id: string;
  timestamp: number;
  modelId: string;
  modelName: string;
  role: string;
  round: number;
  type: 'initial' | 'critique' | 'rebuttal' | 'final';
  content: string;
  position: HealthVerdict;
  confidence: number;
  critiquedModels?: string[];
  isLiveAPI: boolean;
}

export interface NemotronAssessment {
  id?: number;
  snapshotId: number;
  timestamp: number;
  modelId: string;
  riskLevel: RiskLevel;
  finalBatteryAssessment: string;
  importantFindings: string[];
  modelDisagreements: string[];
  evidence: string[];
  anomalies: string[];
  confidence: number;
  limitations: string[];
  recommendedInvestigations: string[];
  isLiveAPI: boolean;
  executionTimeMs: number;
}

export interface ChatMessage {
  id?: number;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  modelId?: string;
  mode: 'quick' | 'debate';
  timestamp: number;
  isLiveAPI?: boolean;
  debateData?: {
    rounds: DebateTranscriptEntry[];
    nemotronSynthesis: string;
  };
}

export interface ChatConversation {
  id: string;
  title: string;
  mode: 'quick' | 'debate';
  createdAt: number;
  updatedAt: number;
  messageCount?: number;
}

export interface AppPreferences {
  key: string;
  value: any;
}

export interface ESP32Status {
  connected: boolean;
  mode: 'ble' | 'wifi';
  deviceName?: string;
  deviceAddress?: string;
  batteryLevel?: number;
  lastReadingTime?: number;
  rssi?: number;
  isSimulating: boolean;
  wifiSSID?: string;
  wifiIp?: string;
  corsRestricted?: boolean;
}
