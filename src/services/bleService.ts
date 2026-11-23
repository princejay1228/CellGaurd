import { SensorReading, ESP32Status } from '../types';

/**
 * Web Bluetooth API Service for ESP32 DevKit V1
 * Connects directly to hardware running `esp32_cellguard.ino`
 */

// Custom GATT Service & Characteristics UUIDs
export const BLE_UUIDS = {
  SERVICE: '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
  TELEMETRY: 'beb5483e-36e1-4688-b7f5-ea07361b26a8',
  WIFI_PROV: 'cba1d466-344c-4be3-ab3f-189f80dd7518',
  DEVICE_INFO: 'd8e3b4a2-71c9-4b68-9689-0ef5b9e07831',
};

class BLEService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private telemetryChar: BluetoothRemoteGATTCharacteristic | null = null;
  private wifiProvChar: BluetoothRemoteGATTCharacteristic | null = null;
  private onReadingCallback: ((reading: SensorReading) => void) | null = null;
  private onStatusChangeCallback: ((status: ESP32Status) => void) | null = null;
  
  private status: ESP32Status = {
    connected: false,
    mode: 'ble',
    isSimulating: true,
  };

  public isBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  public getStatus(): ESP32Status {
    return { ...this.status };
  }

  public onReading(callback: (reading: SensorReading) => void) {
    this.onReadingCallback = callback;
  }

  public onStatusChange(callback: (status: ESP32Status) => void) {
    this.onStatusChangeCallback = callback;
  }

  private notifyStatus() {
    if (this.onStatusChangeCallback) {
      this.onStatusChangeCallback({ ...this.status });
    }
  }

  public async connect(): Promise<boolean> {
    if (!this.isBluetoothSupported()) {
      throw new Error('Web Bluetooth API is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Opera on Windows/Mac/Android.');
    }

    try {
      console.log('[BLE] Requesting Bluetooth Device...');
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ namePrefix: 'CellGuard' }],
        optionalServices: [BLE_UUIDS.SERVICE]
      });

      this.device.addEventListener('gattserverdisconnected', () => {
        console.warn('[BLE] ESP32 Disconnected!');
        this.status.connected = false;
        this.status.isSimulating = true;
        this.notifyStatus();
      });

      console.log('[BLE] Connecting to GATT Server...');
      this.server = await this.device.gatt?.connect() || null;
      if (!this.server) throw new Error('Failed to connect to GATT Server');

      console.log('[BLE] Getting Primary Service...');
      const service = await this.server.getPrimaryService(BLE_UUIDS.SERVICE);

      console.log('[BLE] Getting Telemetry Characteristic...');
      this.telemetryChar = await service.getCharacteristic(BLE_UUIDS.TELEMETRY);

      // Start Notifications
      await this.telemetryChar.startNotifications();
      this.telemetryChar.addEventListener('characteristicvaluechanged', (event: any) => {
        this.handleTelemetryData(event.target.value);
      });

      // Get Wi-Fi Provisioning Characteristic
      try {
        this.wifiProvChar = await service.getCharacteristic(BLE_UUIDS.WIFI_PROV);
      } catch (e) {
        console.log('[BLE] Wi-Fi Prov characteristic not available');
      }

      this.status.connected = true;
      this.status.isSimulating = false;
      this.status.deviceName = this.device.name || 'CellGuard-ESP32';
      this.status.deviceAddress = this.device.id;
      this.status.lastReadingTime = Date.now();
      this.notifyStatus();

      return true;
    } catch (err: any) {
      console.error('[BLE Error]', err);
      this.status.connected = false;
      this.status.isSimulating = true;
      this.notifyStatus();
      throw err;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.device && this.device.gatt?.connected) {
      await this.device.gatt.disconnect();
    }
    this.status.connected = false;
    this.status.isSimulating = true;
    this.device = null;
    this.server = null;
    this.telemetryChar = null;
    this.wifiProvChar = null;
    this.notifyStatus();
  }

  private handleTelemetryData(value: DataView) {
    const decoder = new TextDecoder('utf-8');
    const jsonStr = decoder.decode(value);

    try {
      const data = JSON.parse(jsonStr);
      const voltage = parseFloat(data.v) || 0;
      const current = parseFloat(data.i) || 0;
      const temperature = parseFloat(data.t) || 25;
      const power = parseFloat(data.p) || Math.abs(voltage * current);
      
      // Calculate derived SOC estimate from voltage
      const clampedV = Math.max(3.0, Math.min(4.2, voltage));
      const soc = Math.max(0, Math.min(100, ((clampedV - 3.0) / 1.2) * 100));

      const reading: SensorReading = {
        timestamp: Date.now(),
        voltage: parseFloat(voltage.toFixed(3)),
        current: parseFloat(current.toFixed(3)),
        temperature: parseFloat(temperature.toFixed(2)),
        power: parseFloat(power.toFixed(3)),
        soc: parseFloat(soc.toFixed(1)),
        soh: 98.0,
        isSimulated: false,
        source: 'ble'
      };

      this.status.lastReadingTime = Date.now();
      if (this.onReadingCallback) {
        this.onReadingCallback(reading);
      }
      this.notifyStatus();
    } catch (e) {
      console.error('[BLE] Failed to parse telemetry packet:', jsonStr, e);
    }
  }

  /**
   * Provision Wi-Fi Credentials to ESP32 over BLE
   */
  public async provisionWifi(ssid: string, pass: string): Promise<{ success: boolean; message: string }> {
    if (!this.status.connected || !this.wifiProvChar) {
      return {
        success: false,
        message: 'ESP32 is not connected via BLE. Please connect via Bluetooth first to provision Wi-Fi credentials.'
      };
    }

    try {
      const payload = JSON.stringify({ ssid, pass });
      const encoder = new TextEncoder();
      await this.wifiProvChar.writeValue(encoder.encode(payload));
      this.status.wifiSSID = ssid;
      this.notifyStatus();
      return {
        success: true,
        message: `Wi-Fi credentials successfully transmitted to ESP32 for network "${ssid}".`
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Failed to send credentials over BLE characteristic.'
      };
    }
  }
}

export const bleService = new BLEService();
