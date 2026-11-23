# CellGuard AI — Autonomous Multi-Model Battery Intelligence Command Centre

A web application for real-time lithium-ion battery health diagnosis, safety auditing, and autonomous AI debate synthesis. Powered by **Web Bluetooth API**, **NVIDIA NIM inference microservices**, **Dexie.js (IndexedDB)**, and **ESP32 IoT hardware**.

---

## 🏛️ System Architecture & Dashboard Layout

The desktop dashboard strictly implements the command-centre layout:

```
+-----------------------------------------------------------------------------------------+
|                                CELLGUARD AI COMMAND BAR                                 |
|  [Hardware Link: BLE/WiFi]  [Test Scenario: Normal/Thermal/Sag]  [Auto-30s Loop: ON]   |
+--------------------------------------------+--------------------------------------------+
| LEFT HALF: BATTERY + SENSORS + ESP32       | RIGHT HALF: FOUR AI MODELS & TRANSCRIPT    |
|                                            |                                            |
| 1. Large Animated Liquid Battery           | 1. 2x2 Grid of 4 AI Specialist Models:     |
|    - Flowing electrons & charge level      |    - Llama 3.3 70B (Thermal & Kinetics)    |
|    - Dynamic SOC % and SOH %               |    - DeepSeek R1 (Deep Anomaly & Physics)  |
|                                            |    - Mistral Large 2 (Impedance & SOH)     |
| 2. Precision Metric Cards:                 |    - Llama 3.1 Nemotron 70B (BMS Safety)   |
|    - Voltage (V), Current (A), Temp (°C)   |    - Real-time thinking pulse & rounds     |
|    - Power (W), SOC (%), SOH (%)           |                                            |
|                                            | 2. Live Debate Transcript:                 |
| 3. Rolling Recharts Telemetry Graph:       |    - Round 1: Cross-model critique         |
|    - Triple-view or tabbed metrics         |    - Round 2: Rebuttal & stance revision   |
|    - Critical threshold markers            |    - Round 3: Definitive closing positions |
|                                            +--------------------------------------------+
| 4. ESP32 Hardware Connection Panel:        | DIRECTLY BELOW 4 MODELS:                   |
|    - Web Bluetooth BLE pairing             | NVIDIA NEMOTRON 3 ULTRA 550B A55B          |
|    - Wi-Fi provisioning tool               | Final Evidence-Grounded Arbiter            |
|    - Last reading age & status             | - Risk Level (Low/Moderate/High/Critical)  |
|    - Active Simulation fallback            | - Important Findings & Preserved Friction  |
|                                            | - Empirical Evidence & Anomaly Log         |
|                                            | - Recommended Physical Investigations      |
+--------------------------------------------+--------------------------------------------+
```

---

## ⚡ Tech Stack

- **Framework**: React 18 + Vite 6 + TypeScript
- **Styling**: Tailwind CSS + Custom Cyberpunk / AI Research Command Centre tokens
- **Visuals & Charts**: Recharts + Lucide Icons + Fluid Animated Battery Shader
- **Database**: Dexie.js (IndexedDB) — zero backend, zero Firebase, zero Supabase
- **Hardware Link**: Web Bluetooth API (GATT continuous notifications)
- **AI Core**: NVIDIA NIM APIs (`integrate.api.nvidia.com/v1`) with 17-call debate architecture and physics-grounded fallback
- **Deployment**: Vercel ready (`vercel.json`)

---

## 🔬 Four-Model Debate Architecture (17 Expected Calls)

Every 30 seconds (or on manual trigger):
1. **Window Aggregation**: 30-second sensor readings are compiled into min, max, avg voltage, current, temperature, power, and Coulomb-counted SOC.
2. **Phase 0 — Independent Analysis (4 calls)**: All 4 models analyze the electrochemical window concurrently.
3. **Phase 1 — Round 1 Critique (4 calls)**: Each model critiques the other 3 initial hypotheses and defends its stance.
4. **Phase 2 — Round 2 Rebuttal (4 calls)**: Models respond to peer criticisms, challenge fallacies, and adjust confidence intervals.
5. **Phase 3 — Round 3 Final Position (4 calls)**: Each model delivers its closing diagnosis and highlights unresolved physical friction.
6. **Phase 4 — Nemotron Synthesis (1 call)**: NVIDIA Nemotron 3 Ultra 550B A55B synthesizes all 16 debate rounds alongside raw sensor metrics, preserving genuine disagreements without forcing consensus.
7. **Persistence**: Every snapshot, response, debate round, and Nemotron assessment is stored in local IndexedDB.

---

## 🔌 ESP32 DevKit V1 Hardware Pinout

Flash the included firmware in `firmware/esp32_cellguard.ino`:

| Component | Pin / Signal | ESP32 GPIO | Description |
|-----------|--------------|------------|-------------|
| **INA219** | SDA | **GPIO 21** | I2C Data (Bus Voltage & Shunt Current) |
| **INA219** | SCL | **GPIO 22** | I2C Clock |
| **SSD1306 OLED** | SDA | **GPIO 21** | Shared I2C Data (Address `0x3C`) |
| **SSD1306 OLED** | SCL | **GPIO 22** | Shared I2C Clock |
| **DS18B20** | DATA | **GPIO 4** | OneWire Temperature Sensor (4.7kΩ pullup to 3.3V) |

### BLE GATT Service Specifications
- **Service UUID**: `4fafc201-1fb5-459e-8fcc-c5c9c331914b`
- **Telemetry Characteristic (NOTIFY)**: `beb5483e-36e1-4688-b7f5-ea07361b26a8`
- **Wi-Fi Provisioning Characteristic (WRITE)**: `cba1d466-344c-4be3-ab3f-189f80dd7518`

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start development server
npm run dev

# 3. Build for production
npm run build

# 4. Preview production build
npm run preview
```

Open `http://localhost:3000` (or the Vite dev URL) in Google Chrome, Microsoft Edge, or Opera with Bluetooth enabled.

---

## 🔒 Security & CORS Disclosure

- **Prototype Storage**: API keys are stored in browser `localStorage`. This is intended for personal development and testing. Masking and clear controls are provided in the Settings page.
- **Browser CORS**: If direct browser fetch to `https://integrate.api.nvidia.com/v1` is blocked by browser CORS policy, CellGuard AI provides high-fidelity, physically calibrated domain-specific simulation clearly labelled `[SIMULATED]` vs `[LIVE NVIDIA NIM API]`.
- **Wi-Fi Credentials**: Router passwords are transmitted over BLE and never saved to IndexedDB.
