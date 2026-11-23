import { SensorReading, Snapshot30s, NemotronAssessment } from '../types';
import { db } from '../db';
import { debateEngine } from './debateEngine';
import { sensorSimulator } from './sensorSimulator';
import { bleService } from './bleService';

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
  private enabled: boolean = true;
  private intervalSeconds: number = 30;
  private countdown: number = 30;
  private timer: any = null;
  private sensorTickTimer: any = null;
  private readingBuffer: SensorReading[] = [];
  private lastSnapshot: Snapshot30s | null = null;
  private lastAssessment: NemotronAssessment | null = null;
  private totalSnapshotsTaken: number = 0;
  private listeners: Array<(status: MonitoringStatus) => void> = [];
  private readingListeners: Array<(reading: SensorReading) => void> = [];

  constructor() {
    this.loadPreferences();
    this.initSensorStream();
    this.startLoop();
  }

  private async loadPreferences() {
    try {
      const prefAuto = await db.preferences.get('autoMonitoringEnabled');
      if (prefAuto !== undefined) this.enabled = Boolean(prefAuto.value);

      const prefInterval = await db.preferences.get('monitoringInterval');
      if (prefInterval !== undefined && Number(prefInterval.value) >= 10) {
        this.intervalSeconds = Number(prefInterval.value);
        this.countdown = this.intervalSeconds;
      }

      // Load latest assessment from Dexie if available
      const latest = await db.nemotronAssessments.orderBy('timestamp').reverse().first();
      if (latest) {
        this.lastAssessment = latest;
      }
      const latestSnap = await db.snapshots30s.orderBy('timestamp').reverse().first();
      if (latestSnap) {
        this.lastSnapshot = latestSnap;
      }
      this.notifyStatus();
    } catch (e) {
      console.warn('[MonitoringService] Could not load stored preferences', e);
    }
  }

  private initSensorStream() {
    // 1. Listen for hardware BLE notifications if connected
    bleService.onReading((reading) => {
      this.handleIncomingReading(reading);
    });

    // 2. High-frequency sensor tick (1 second intervals for simulation / heartbeat)
    this.sensorTickTimer = setInterval(() => {
      const bleStatus = bleService.getStatus();
      if (!bleStatus.connected) {
        // Run realistic simulator
        const reading = sensorSimulator.generateReading();
        this.handleIncomingReading(reading);
      }
    }, 1000);
  }

  private notifyStatus() {
    const status = this.getStatus();
    for (const listener of this.listeners) {
      listener(status);
    }
  }

  private handleIncomingReading(reading: SensorReading) {
    // Buffer reading for 30s aggregation
    this.readingBuffer.push(reading);

    // Save reading to Dexie (keep most recent 5000 in DB to avoid unbounded bloat)
    db.sensorReadings.add(reading).catch(err => {
      console.error('[Dexie Reading Save Error]', err);
    });

    // Notify UI sensor cards and charts
    for (const listener of this.readingListeners) {
      listener(reading);
    }
  }

  private startLoop() {
    if (this.timer) clearInterval(this.timer);

    this.timer = setInterval(async () => {
      if (!this.enabled) {
        return;
      }

      this.countdown--;
      if (this.countdown <= 0) {
        this.countdown = this.intervalSeconds;
        await this.triggerCycle();
      }
      this.notifyStatus();
    }, 1000);
  }

  public async triggerCycle(): Promise<void> {
    if (debateEngine.isRunning()) {
      console.log('[MonitoringService] Analysis already active, skipping tick.');
      return;
    }

    if (this.readingBuffer.length === 0) {
      return;
    }

    // 1. Collect readings from buffer
    const windowReadings = [...this.readingBuffer];
    this.readingBuffer = []; // Reset buffer for next 30s window

    // 2. Compute min, max, averages
    const count = windowReadings.length;
    let sumV = 0, minV = Infinity, maxV = -Infinity;
    let sumI = 0, minI = Infinity, maxI = -Infinity;
    let sumT = 0, minT = Infinity, maxT = -Infinity;
    let sumP = 0, minP = Infinity, maxP = -Infinity;

    for (const r of windowReadings) {
      sumV += r.voltage;
      if (r.voltage < minV) minV = r.voltage;
      if (r.voltage > maxV) maxV = r.voltage;

      sumI += r.current;
      if (r.current < minI) minI = r.current;
      if (r.current > maxI) maxI = r.current;

      sumT += r.temperature;
      if (r.temperature < minT) minT = r.temperature;
      if (r.temperature > maxT) maxT = r.temperature;

      sumP += r.power;
      if (r.power < minP) minP = r.power;
      if (r.power > maxP) maxP = r.power;
    }

    const lastReading = windowReadings[count - 1];

    const snapshot: Snapshot30s = {
      timestamp: Date.now(),
      startTime: windowReadings[0].timestamp,
      endTime: lastReading.timestamp,
      readingCount: count,
      avgVoltage: parseFloat((sumV / count).toFixed(3)),
      minVoltage: parseFloat(minV.toFixed(3)),
      maxVoltage: parseFloat(maxV.toFixed(3)),
      avgCurrent: parseFloat((sumI / count).toFixed(3)),
      minCurrent: parseFloat(minI.toFixed(3)),
      maxCurrent: parseFloat(maxI.toFixed(3)),
      avgTemp: parseFloat((sumT / count).toFixed(2)),
      minTemp: parseFloat(minT.toFixed(2)),
      maxTemp: parseFloat(maxT.toFixed(2)),
      avgPower: parseFloat((sumP / count).toFixed(3)),
      minPower: parseFloat(minP.toFixed(3)),
      maxPower: parseFloat(maxP.toFixed(3)),
      currentSoc: lastReading.soc,
      currentSoh: lastReading.soh,
      isSimulated: lastReading.isSimulated
    };

    // 3. Save snapshot to Dexie
    const snapId = await db.snapshots30s.add(snapshot);
    snapshot.id = snapId;
    this.lastSnapshot = snapshot;
    this.totalSnapshotsTaken++;
    this.notifyStatus();

    // 4 & 5 & 6. Dispatch debate cycle
    try {
      const assessment = await debateEngine.executeDebateCycle(snapshot);
      if (assessment) {
        this.lastAssessment = assessment;
        this.notifyStatus();
      }
    } catch (e) {
      console.error('[MonitoringService] Debate cycle failed', e);
    }
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

  public onStatus(callback: (status: MonitoringStatus) => void): () => void {
    this.listeners.push(callback);
    callback(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  public onReading(callback: (reading: SensorReading) => void): () => void {
    this.readingListeners.push(callback);
    return () => {
      this.readingListeners = this.readingListeners.filter(l => l !== callback);
    };
  }

  public getStatus(): MonitoringStatus {
    return {
      enabled: this.enabled,
      intervalSeconds: this.intervalSeconds,
      secondsUntilNextAnalysis: this.countdown,
      isAnalyzing: debateEngine.isRunning(),
      lastSnapshot: this.lastSnapshot,
      lastAssessment: this.lastAssessment,
      totalSnapshotsTaken: this.totalSnapshotsTaken,
      bufferedReadingsCount: this.readingBuffer.length
    };
  }
}

export const monitoringService = new MonitoringService();
