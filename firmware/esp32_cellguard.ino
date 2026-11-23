/*
  =============================================================================
  CellGuard AI — ESP32 Sensor & BLE / Wi-Fi Telemetry Firmware
  =============================================================================
  Hardware Architecture:
  - ESP32 DevKit V1
  - INA219 Current & Voltage Sensor (I2C: SDA=GPIO 21, SCL=GPIO 22)
  - DS18B20 High-Precision Temperature Sensor (OneWire: DATA=GPIO 4)
  - SSD1306 0.96" I2C OLED Display (128x64, address 0x3C)
  
  Features:
  - High-frequency battery telemetry sampling (Voltage, Current, Temp, Power)
  - Bluetooth Low Energy (BLE) GATT server with continuous notifications
  - Web Bluetooth API compatible service UUID and notification characteristic
  - Wi-Fi provisioning over BLE characteristic (SSID + Password reception)
  - Built-in local HTTP telemetry endpoint when connected to Wi-Fi
  - OLED real-time statistics display & connection state indicators
  =============================================================================
*/

#include <Wire.h>
#include <WiFi.h>
#include <WebServer.h>
#include <Adafruit_INA219.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <ArduinoJson.h>

// Pin Configuration
#define ONE_WIRE_BUS 4       // DS18B20 Data pin
#define I2C_SDA 21           // I2C SDA
#define I2C_SCL 22           // I2C SCL

// OLED Configuration
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// Sensors
Adafruit_INA219 ina219;
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensor(&oneWire);

// BLE UUIDs (Matching Web Bluetooth client)
#define SERVICE_UUID                 "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define CHARACTERISTIC_TELEMETRY     "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define CHARACTERISTIC_WIFI_PROV     "cba1d466-344c-4be3-ab3f-189f80dd7518"
#define CHARACTERISTIC_DEVICE_INFO   "d8e3b4a2-71c9-4b68-9689-0ef5b9e07831"

// Global States
BLEServer* pServer = NULL;
BLECharacteristic* pTelemetryCharacteristic = NULL;
BLECharacteristic* pWifiProvCharacteristic = NULL;
BLECharacteristic* pDeviceInfoCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

// Wi-Fi Web Server (for local direct Wi-Fi mode)
WebServer server(80);
bool wifiConnected = false;
String currentIP = "0.0.0.0";
String currentSSID = "";

// Telemetry Values
float busVoltage = 0.0;
float current_mA = 0.0;
float power_mW = 0.0;
float temperatureC = 25.0;
unsigned long lastTelemetryMillis = 0;
const unsigned long TELEMETRY_INTERVAL = 1000; // 1 second notification interval

// Server Callbacks
class MyServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) {
    deviceConnected = true;
    Serial.println("[BLE] CellGuard Client Connected!");
  };

  void onDisconnect(BLEServer* pServer) {
    deviceConnected = false;
    Serial.println("[BLE] CellGuard Client Disconnected!");
  }
};

// Wi-Fi Provisioning Callback
class WifiProvCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pCharacteristic) {
    String rxValue = pCharacteristic->getValue().c_str();
    if (rxValue.length() > 0) {
      Serial.print("[BLE Prov] Received Wi-Fi credentials JSON: ");
      Serial.println(rxValue);
      
      StaticJsonDocument<256> doc;
      DeserializationError error = deserializeJson(doc, rxValue);
      if (!error) {
        const char* ssid = doc["ssid"];
        const char* pass = doc["pass"];
        if (ssid && strlen(ssid) > 0) {
          Serial.printf("[Wi-Fi] Attempting connection to SSID: %s\n", ssid);
          currentSSID = String(ssid);
          WiFi.disconnect();
          WiFi.begin(ssid, pass);
          
          int attempts = 0;
          while (WiFi.status() != WL_CONNECTED && attempts < 20) {
            delay(500);
            Serial.print(".");
            attempts++;
          }
          
          if (WiFi.status() == WL_CONNECTED) {
            wifiConnected = true;
            currentIP = WiFi.localIP().toString();
            Serial.println("\n[Wi-Fi] Connected! IP Address: " + currentIP);
            
            // Notify client of success through device info
            String infoJson = "{\"status\":\"wifi_connected\",\"ip\":\"" + currentIP + "\"}";
            pDeviceInfoCharacteristic->setValue(infoJson.c_str());
            pDeviceInfoCharacteristic->notify();
          } else {
            Serial.println("\n[Wi-Fi] Failed to connect to network.");
            String infoJson = "{\"status\":\"wifi_failed\"}";
            pDeviceInfoCharacteristic->setValue(infoJson.c_str());
            pDeviceInfoCharacteristic->notify();
          }
        }
      }
    }
  }
};

// HTTP Handlers for Direct Wi-Fi Access
void handleTelemetryHTTP() {
  // CORS Headers for browser access
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  
  StaticJsonDocument<256> doc;
  doc["voltage"] = busVoltage;
  doc["current"] = current_mA / 1000.0; // Amperes
  doc["temperature"] = temperatureC;
  doc["power"] = power_mW / 1000.0;     // Watts
  doc["timestamp"] = millis();
  doc["device"] = "ESP32-CellGuard";
  doc["ip"] = currentIP;

  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void handleOptionsHTTP() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
  server.send(204);
}

void setup() {
  Serial.begin(115200);
  Serial.println("\n--- Starting CellGuard AI ESP32 Firmware ---");

  // I2C Init
  Wire.begin(I2C_SDA, I2C_SCL);

  // OLED Init
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("[Warning] SSD1306 OLED allocation failed (check address 0x3C)");
  } else {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("CELLGUARD AI v1.0");
    display.println("Initializing sensors...");
    display.display();
  }

  // INA219 Init
  if (!ina219.begin()) {
    Serial.println("[Warning] Failed to find INA219 sensor chip. Checking connections...");
  } else {
    Serial.println("[OK] INA219 Current/Voltage sensor initialized.");
  }

  // DS18B20 Init
  tempSensor.begin();
  Serial.println("[OK] DS18B20 Temperature sensor initialized on GPIO 4.");

  // BLE Init
  BLEDevice::init("CellGuard-ESP32");
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Telemetry Characteristic (NOTIFY)
  pTelemetryCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_TELEMETRY,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pTelemetryCharacteristic->addDescriptor(new BLE2902());

  // Wi-Fi Provisioning Characteristic (WRITE)
  pWifiProvCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_WIFI_PROV,
    BLECharacteristic::PROPERTY_WRITE
  );
  pWifiProvCharacteristic->setCallbacks(new WifiProvCallbacks());

  // Device Info Characteristic (READ | NOTIFY)
  pDeviceInfoCharacteristic = pService->createCharacteristic(
    CHARACTERISTIC_DEVICE_INFO,
    BLECharacteristic::PROPERTY_READ |
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pDeviceInfoCharacteristic->addDescriptor(new BLE2902());
  pDeviceInfoCharacteristic->setValue("{\"name\":\"CellGuard-ESP32\",\"hw\":\"v1\",\"model\":\"Li-Ion-1S\"}");

  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  Serial.println("[BLE] Advertising started. Ready for Web Bluetooth pairing!");

  // Local HTTP Server
  server.on("/api/telemetry", HTTP_GET, handleTelemetryHTTP);
  server.on("/api/telemetry", HTTP_OPTIONS, handleOptionsHTTP);
}

void loop() {
  // Read Sensors
  tempSensor.requestTemperatures();
  float t = tempSensor.getTempCByIndex(0);
  if (t > -50 && t < 125) {
    temperatureC = t;
  }

  busVoltage = ina219.getBusVoltage_V();
  current_mA = ina219.getCurrent_mA();
  power_mW = ina219.getPower_mW();

  // Periodic Telemetry Dispatch
  if (millis() - lastTelemetryMillis >= TELEMETRY_INTERVAL) {
    lastTelemetryMillis = millis();

    // Build JSON packet
    StaticJsonDocument<192> doc;
    doc["v"] = serialized(String(busVoltage, 3));
    doc["i"] = serialized(String(current_mA / 1000.0, 3)); // Convert to Amperes
    doc["t"] = serialized(String(temperatureC, 2));
    doc["p"] = serialized(String(power_mW / 1000.0, 3));   // Convert to Watts
    doc["ts"] = millis();

    char payload[192];
    serializeJson(doc, payload);

    if (deviceConnected && pTelemetryCharacteristic) {
      pTelemetryCharacteristic->setValue((uint8_t*)payload, strlen(payload));
      pTelemetryCharacteristic->notify();
    }

    // Refresh OLED
    display.clearDisplay();
    display.setCursor(0, 0);
    display.setTextSize(1);
    display.printf("CELLGUARD [ESP32]\n");
    display.printf("BLE: %s | WiFi: %s\n", deviceConnected ? "ON" : "OFF", wifiConnected ? "OK" : "NO");
    display.printf("---------------------\n");
    display.printf("Volt : %.3f V\n", busVoltage);
    display.printf("Curr : %.3f A\n", current_mA / 1000.0);
    display.printf("Temp : %.1f C\n", temperatureC);
    display.printf("Power: %.2f W\n", power_mW / 1000.0);
    display.display();
  }

  // Handle Wi-Fi HTTP requests if connected
  if (wifiConnected) {
    server.handleClient();
  }

  // Handle BLE reconnection
  if (!deviceConnected && oldDeviceConnected) {
    delay(500);
    pServer->startAdvertising();
    Serial.println("[BLE] Restarted advertising");
    oldDeviceConnected = deviceConnected;
  }
  if (deviceConnected && !oldDeviceConnected) {
    oldDeviceConnected = deviceConnected;
  }

  delay(20);
}
