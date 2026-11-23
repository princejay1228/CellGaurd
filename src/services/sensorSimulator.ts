import { SensorReading, BatteryState } from '../types';

/**
 * Realistic Li-Ion Battery & Sensor Simulation Engine
 * Simulates nominal 3.7V - 4.2V 18650/21700 cell physics:
 * - OCV (Open Circuit Voltage) vs SOC curve
 * - Internal impedance IR drop
 * - Thermal inertia and I^2 * R self-heating
 * - Dynamic load changes and noise
 * - Configurable anomaly triggers for AI debate testing
 */

export type AnomalyType = 'NONE' | 'THERMAL_RUNAWAY' | 'VOLTAGE_DIP' | 'OVERCURRENT_DISCHARGE' | 'INTERNAL_RESISTANCE_SPIKE';

class SensorSimulator {
  private soc: number = 78.4; // Initial State of Charge (%)
  private soh: number = 96.8; // Initial State of Health (%)
  private voltage: number = 3.92; // Volts
  private current: number = -1.45; // Amps (negative = discharging)
  private temperature: number = 28.2; // °C
  private state: BatteryState = 'discharging';
  private activeAnomaly: AnomalyType = 'NONE';
  private anomalyDurationSec: number = 0;
  private nominalCapacityAh: number = 3.0; // 3000 mAh
  private internalResistanceOhms: number = 0.035; // 35 mOhm

  // OCV lookup curve for NMC Li-Ion cell
  private getOCV(socPercent: number): number {
    const s = Math.max(0, Math.min(100, socPercent)) / 100;
    // Approximated NMC discharge curve
    return 3.0 + 0.9 * Math.pow(s, 0.45) + 0.3 * Math.pow(s, 3);
  }

  public setAnomaly(anomaly: AnomalyType) {
    this.activeAnomaly = anomaly;
    this.anomalyDurationSec = 0;
  }

  public getActiveAnomaly(): AnomalyType {
    return this.activeAnomaly;
  }

  public setState(state: BatteryState) {
    this.state = state;
    if (state === 'charging') {
      this.current = 1.8; // 1.8A charge
    } else if (state === 'discharging') {
      this.current = -2.1; // -2.1A discharge
    } else {
      this.current = 0.0; // Idle
    }
  }

  public getState(): BatteryState {
    return this.state;
  }

  public generateReading(): SensorReading {
    const dtSeconds = 1.0;
    this.anomalyDurationSec += dtSeconds;

    // 1. Current dynamics based on state and anomaly
    let baseCurrent = this.current;
    if (this.state === 'charging') {
      // CC-CV profile: reduce current as SOC approaches 100%
      if (this.soc > 85) {
        baseCurrent = 1.8 * Math.max(0.15, (100 - this.soc) / 15);
      } else {
        baseCurrent = 1.8 + (Math.random() - 0.5) * 0.06;
      }
    } else if (this.state === 'discharging') {
      // Dynamic load fluctuation (e.g. drone/EV/load motor bursts)
      const loadPulse = Math.sin(Date.now() / 4000) * 0.4;
      baseCurrent = -1.75 + loadPulse + (Math.random() - 0.5) * 0.08;
    } else {
      baseCurrent = (Math.random() - 0.5) * 0.02; // Micro quiescent current
    }

    // Apply Anomaly Effects
    let effectiveR = this.internalResistanceOhms;
    if (this.activeAnomaly === 'INTERNAL_RESISTANCE_SPIKE') {
      effectiveR = 0.220; // 220 mOhm severe degradation
    }

    if (this.activeAnomaly === 'OVERCURRENT_DISCHARGE') {
      baseCurrent = -6.8 - Math.random() * 0.6; // Dangerous 2.5C discharge surge
    }

    this.current = baseCurrent;

    // 2. Coulomb counting for SOC
    const deltaAh = (this.current * dtSeconds) / 3600;
    this.soc += (deltaAh / this.nominalCapacityAh) * 100;
    this.soc = Math.max(0, Math.min(100, this.soc));

    // Auto flip state if limits reached
    if (this.soc >= 99.8 && this.state === 'charging') {
      this.state = 'idle';
    } else if (this.soc <= 2.0 && this.state === 'discharging') {
      this.state = 'idle';
    }

    // 3. Terminal Voltage calculation
    // V_terminal = OCV + (I * R_internal)
    let baseV = this.getOCV(this.soc) + (this.current * effectiveR);

    // Anomaly: Voltage collapse / dip
    if (this.activeAnomaly === 'VOLTAGE_DIP') {
      baseV -= (0.42 + Math.random() * 0.15); // Severe cell voltage drop
    }

    // Measurement noise (ADC jitter ~ 4mV)
    const noiseV = (Math.random() - 0.5) * 0.008;
    this.voltage = Math.max(2.5, Math.min(4.35, baseV + noiseV));

    // 4. Thermal dynamics (Joule Heating + Ambient Dissipation)
    const ambientTemp = 24.5;
    const jouleHeatWatts = Math.pow(this.current, 2) * effectiveR;
    const coolingRate = 0.02; // heat dissipation coefficient

    let dTemp = (jouleHeatWatts * 0.35) - (coolingRate * (this.temperature - ambientTemp));

    if (this.activeAnomaly === 'THERMAL_RUNAWAY') {
      // Exothermic accelerated self-heating!
      const runawayAcceleration = Math.exp((this.temperature - 35) / 10) * 0.4;
      dTemp += Math.max(0.6, runawayAcceleration);
    }

    this.temperature += dTemp * dtSeconds + (Math.random() - 0.5) * 0.05;
    this.temperature = Math.max(15, Math.min(95, this.temperature));

    // 5. SOH degradation model
    // Decrements slowly under high thermal stress or extreme C-rates
    if (this.temperature > 50 || Math.abs(this.current) > 4.5 || this.activeAnomaly !== 'NONE') {
      this.soh = Math.max(50, this.soh - 0.001);
    }

    // 6. Power in Watts (positive consumption/charge magnitude)
    const power = Math.abs(this.voltage * this.current);

    return {
      timestamp: Date.now(),
      voltage: parseFloat(this.voltage.toFixed(3)),
      current: parseFloat(this.current.toFixed(3)),
      temperature: parseFloat(this.temperature.toFixed(2)),
      power: parseFloat(power.toFixed(3)),
      soc: parseFloat(this.soc.toFixed(1)),
      soh: parseFloat(this.soh.toFixed(1)),
      isSimulated: true,
      source: 'simulated'
    };
  }
}

export const sensorSimulator = new SensorSimulator();
