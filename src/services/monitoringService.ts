import { SensorReading, Snapshot30s, NemotronAssessment } from '../types';
import { db } from '../db';
import { debateEngine } from './debateEngine';
import { bleService } from './bleService';

/**
 * Monitoring service — ONLY uses real sensor data from ESP32 BLE.
 * No simulator fallback. When hardware is disconnected, no readings are collected.
 */

export interface MonitoringStatus {
  enabled: boolean;
  intervalSeconds: number;
  secondsUntilNextAnalysis: number;
  isAnalyzing: boolean;
  lastSnapshot: Snapshot30s | null;
  lastAssessment: NemotronAssessment | null;
  totalSnapshotsTaken: number;
  bufferedReadingsCount: number;
}

class MonitoringService {
  private enabled = true;
  private intervalSeconds = 30;
  private countdown = 30;
  private timer: any = null;
  private readingBuffer: SensorReading[] = [];
  private lastSnapshot: Snapshot30s | null = null;
  private lastAssessment: NemotronAssessment | null = null;
  private totalSnapshotsTaken = 0;
  private listeners: Array<(status: MonitoringStatus) => void> = [];
  private readingListeners: Array<(reading: SensorReading) => void> = [];

  constructor() {
    this.loadPreferences();
    this.initSensorStream();
    this.startLoop();
  }

  private async loadPreferences() {
    try {
      const pa = await db.preferences.get('autoMonitoringEnabled');
      if (pa !== undefined) this.enabled = Boolean(pa.value);
      const pi = await db.preferences.get('monitoringInterval');
      if (pi !== undefined && Number(pi.value) >= 10) {
        this.intervalSeconds = Number(pi.value);
        this.countdown = this.intervalSeconds;
      }
      const latestA = await db.nemotronAssessments.orderBy('timestamp').reverse().first();
      if (latestA) this.lastAssessment = latestA;
      const latestS = await db.snapshots30s.orderBy('timestamp').reverse().first();
      if (latestS) this.lastSnapshot = latestS;
      this.notifyStatus();
    } catch {}
  }

  private notifyStatus() {
    const st = this.getStatus();
    for (const l of this.listeners) l(st);
  }

  private initSensorStream() {
    // Only hardware BLE readings — no simulator
    bleService.onReading((reading) => {
      this.handleIncomingReading(reading);
    });
  }

  private handleIncomingReading(reading: SensorReading) {
    this.readingBuffer.push(reading);
    db.sensorReadings.add(reading).catch(console.error);
    for (const l of this.readingListeners) l(reading);
  }

  private startLoop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(async () => {
      if (!this.enabled) return;
      this.countdown--;
      if (this.countdown <= 0) {
        this.countdown = this.intervalSeconds;
        await this.triggerCycle();
      }
      this.notifyStatus();
    }, 1000);
  }

  public async triggerCycle(): Promise<void> {
    if (debateEngine.isRunning()) return;
    if (this.readingBuffer.length === 0) return;

    const windowReadings = [...this.readingBuffer];
    this.readingBuffer = [];

    const count = windowReadings.length;
    let sumV = 0, minV = Infinity, maxV = -Infinity;
    let sumI = 0, minI = Infinity, maxI = -Infinity;
    let sumT = 0, minT = Infinity, maxT = -Infinity;
    let sumP = 0, minP = Infinity, maxP = -Infinity;

    for (const r of windowReadings) {
      sumV += r.voltage; if (r.voltage < minV) minV = r.voltage; if (r.voltage > maxV) maxV = r.voltage;
      sumI += r.current; if (r.current < minI) minI = r.current; if (r.current > maxI) maxI = r.current;
      sumT += r.temperature; if (r.temperature < minT) minT = r.temperature; if (r.temperature > maxT) maxT = r.temperature;
      sumP += r.power; if (r.power < minP) minP = r.power; if (r.power > maxP) maxP = r.power;
    }
    const last = windowReadings[count - 1];

    const snapshot: Snapshot30s = {
      timestamp: Date.now(), startTime: windowReadings[0].timestamp, endTime: last.timestamp, readingCount: count,
      avgVoltage: +(sumV / count).toFixed(3), minVoltage: +minV.toFixed(3), maxVoltage: +maxV.toFixed(3),
      avgCurrent: +(sumI / count).toFixed(3), minCurrent: +minI.toFixed(3), maxCurrent: +maxI.toFixed(3),
      avgTemp: +(sumT / count).toFixed(2), minTemp: +minT.toFixed(2), maxTemp: +maxT.toFixed(2),
      avgPower: +(sumP / count).toFixed(3), minPower: +minP.toFixed(3), maxPower: +maxP.toFixed(3),
      currentSoc: last.soc, currentSoh: last.soh, isSimulated: false
    };

    const snapId = await db.snapshots30s.add(snapshot);
    snapshot.id = snapId;
    this.lastSnapshot = snapshot;
    this.totalSnapshotsTaken++;
    this.notifyStatus();

    try {
      const assessment = await debateEngine.executeDebateCycle(snapshot);
      if (assessment) { this.lastAssessment = assessment; this.notifyStatus(); }
    } catch (e) { console.error('[MonitoringService] Debate failed', e); }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    db.preferences.put({ key: 'autoMonitoringEnabled', value: enabled }).catch(console.error);
    this.notifyStatus();
  }

  public setInterval(seconds: number) {
    this.intervalSeconds = Math.max(10, Math.min(180, seconds));
    this.countdown = this.intervalSeconds;
    db.preferences.put({ key: 'monitoringInterval', value: this.intervalSeconds }).catch(console.error);
    this.notifyStatus();
  }

  public onStatus(cb: (s: MonitoringStatus) => void): () => void {
    this.listeners.push(cb); cb(this.getStatus());
    return () => { this.listeners = this.listeners.filter(l => l !== cb); };
  }

  public onReading(cb: (r: SensorReading) => void): () => void {
    this.readingListeners.push(cb);
    return () => { this.readingListeners = this.readingListeners.filter(l => l !== cb); };
  }

  public getStatus(): MonitoringStatus {
    return {
      enabled: this.enabled, intervalSeconds: this.intervalSeconds,
      secondsUntilNextAnalysis: this.countdown, isAnalyzing: debateEngine.isRunning(),
      lastSnapshot: this.lastSnapshot, lastAssessment: this.lastAssessment,
      totalSnapshotsTaken: this.totalSnapshotsTaken, bufferedReadingsCount: this.readingBuffer.length
    };
  }
}

export const monitoringService = new MonitoringService();
