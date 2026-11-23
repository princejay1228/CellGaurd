import Dexie, { Table } from 'dexie';
import {
  SensorReading,
  Snapshot30s,
  AIResponseRecord,
  DebateTranscriptEntry,
  NemotronAssessment,
  ChatMessage,
  ChatConversation,
  AppPreferences
} from '../types';

export class CellGuardDatabase extends Dexie {
  sensorReadings!: Table<SensorReading, number>;
  snapshots30s!: Table<Snapshot30s, number>;
  aiResponses!: Table<AIResponseRecord, number>;
  debateRounds!: Table<{
    id?: number;
    snapshotId: number;
    roundNumber: number;
    timestamp: number;
    transcript: DebateTranscriptEntry[];
    disagreements: string[];
  }, number>;
  nemotronAssessments!: Table<NemotronAssessment, number>;
  chatConversations!: Table<ChatConversation, string>;
  chatMessages!: Table<ChatMessage, number>;
  preferences!: Table<AppPreferences, string>;

  constructor() {
    super('CellGuardAI_DB');
    this.version(1).stores({
      sensorReadings: '++id, timestamp, source, isSimulated',
      snapshots30s: '++id, timestamp, startTime, endTime',
      aiResponses: '++id, snapshotId, timestamp, modelId, round, healthVerdict',
      debateRounds: '++id, snapshotId, roundNumber, timestamp',
      nemotronAssessments: '++id, snapshotId, timestamp, modelId, riskLevel',
      chatConversations: 'id, createdAt, updatedAt, mode',
      chatMessages: '++id, conversationId, timestamp, role, mode',
      preferences: 'key'
    });
  }

  // Backup & Export methods
  async exportAllDataJSON(): Promise<string> {
    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      sensorReadings: await this.sensorReadings.limit(2000).toArray(),
      snapshots30s: await this.snapshots30s.toArray(),
      aiResponses: await this.aiResponses.toArray(),
      debateRounds: await this.debateRounds.toArray(),
      nemotronAssessments: await this.nemotronAssessments.toArray(),
      chatConversations: await this.chatConversations.toArray(),
      chatMessages: await this.chatMessages.toArray(),
      preferences: await this.preferences.toArray()
    };
    return JSON.stringify(data, null, 2);
  }

  async exportReadingsCSV(): Promise<string> {
    const readings = await this.sensorReadings.orderBy('timestamp').reverse().limit(1000).toArray();
    const headers = ['Timestamp', 'ISO Date', 'Voltage (V)', 'Current (A)', 'Temperature (°C)', 'Power (W)', 'SOC (%)', 'SOH (%)', 'Source', 'Simulated'];
    const rows = readings.map(r => [
      r.timestamp,
      new Date(r.timestamp).toISOString(),
      r.voltage.toFixed(3),
      r.current.toFixed(3),
      r.temperature.toFixed(2),
      r.power.toFixed(3),
      r.soc.toFixed(1),
      r.soh.toFixed(1),
      r.source,
      r.isSimulated ? 'YES' : 'NO'
    ]);
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  async exportAssessmentsCSV(): Promise<string> {
    const assessments = await this.nemotronAssessments.orderBy('timestamp').reverse().limit(500).toArray();
    const headers = ['Timestamp', 'ISO Date', 'Snapshot ID', 'Model ID', 'Risk Level', 'Confidence (%)', 'Assessment', 'Disagreements Count', 'Execution Time (ms)'];
    const rows = assessments.map(a => [
      a.timestamp,
      new Date(a.timestamp).toISOString(),
      a.snapshotId,
      a.modelId,
      a.riskLevel,
      a.confidence.toFixed(1),
      `"${a.finalBatteryAssessment.replace(/"/g, '""')}"`,
      a.modelDisagreements.length,
      a.executionTimeMs
    ]);
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  async importDataJSON(jsonStr: string): Promise<{ success: boolean; message: string }> {
    try {
      const data = JSON.parse(jsonStr);
      await this.transaction('rw', [
        this.sensorReadings,
        this.snapshots30s,
        this.aiResponses,
        this.debateRounds,
        this.nemotronAssessments,
        this.chatConversations,
        this.chatMessages,
        this.preferences
      ], async () => {
        if (data.sensorReadings?.length) await this.sensorReadings.bulkPut(data.sensorReadings);
        if (data.snapshots30s?.length) await this.snapshots30s.bulkPut(data.snapshots30s);
        if (data.aiResponses?.length) await this.aiResponses.bulkPut(data.aiResponses);
        if (data.debateRounds?.length) await this.debateRounds.bulkPut(data.debateRounds);
        if (data.nemotronAssessments?.length) await this.nemotronAssessments.bulkPut(data.nemotronAssessments);
        if (data.chatConversations?.length) await this.chatConversations.bulkPut(data.chatConversations);
        if (data.chatMessages?.length) await this.chatMessages.bulkPut(data.chatMessages);
        if (data.preferences?.length) await this.preferences.bulkPut(data.preferences);
      });
      return { success: true, message: 'Database backup imported successfully' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to parse JSON backup' };
    }
  }

  async clearAllTelemetry(): Promise<void> {
    await this.transaction('rw', [
      this.sensorReadings,
      this.snapshots30s,
      this.aiResponses,
      this.debateRounds,
      this.nemotronAssessments
    ], async () => {
      await this.sensorReadings.clear();
      await this.snapshots30s.clear();
      await this.aiResponses.clear();
      await this.debateRounds.clear();
      await this.nemotronAssessments.clear();
    });
  }
}

export const db = new CellGuardDatabase();
