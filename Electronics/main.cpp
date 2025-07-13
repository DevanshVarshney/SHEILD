//COMBINED BLE ALERT SYSTEM - Voice + Pin Triggers
#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEServer.h>
#include <TinyGPS++.h>
#include <BLE2902.h>
#include <I2S.h>
#include "FS.h"
#include "SD.h"
#include "SPI.h"

// GPS Configuration
TinyGPSPlus gps;
#define GPSBaud 9600
#define GPS_RX_PIN 44
#define GPS_TX_PIN 43
#define GPS_SERIAL_PORT Serial1

// BLE Configuration
#define SERVICE_UUID           "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define CHARACTERISTIC_UUID_RX "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
#define CHARACTERISTIC_UUID_TX "6e400003-b5a3-f393-e0a9-e50e24dcca9e"
BLECharacteristic *pTxCharacteristic = nullptr;
BLECharacteristic *pRxCharacteristic = nullptr;
BLEServer *pServer = nullptr;
bool deviceConnected = false;

// Pin Trigger Configuration
#define TRIGGER_PIN 1
bool pinTriggered = false;
unsigned long triggerBounceTime = 0;
unsigned long debounceDelay = 100;

// Voice Trigger Configuration
#define RECORD_TIME   10
#define SAMPLE_RATE   16000U
#define SAMPLE_BITS   16
#define WAV_HEADER_SIZE 44
#define SD_CS 21

// Voice Monitoring settings
#define MONITOR_BUFFER_SIZE (SAMPLE_RATE * SAMPLE_BITS / 8 * 0.05)  // 50ms buffer
#define TRIGGER_THRESHOLD 2300
#define RECORDING_GAIN 10
#define RECORDING_NOISE_THRESHOLD 120

// Scream detection settings
#define SUSTAINED_TRIGGER_TIME 150    // 150ms sustained sound
#define TRIGGER_SAMPLES_NEEDED 4      // 4 consecutive samples (200ms)
#define DEBUG_RECORDING_TIME 2

// State management
enum SystemState {
  IDLE,
  MONITORING,
  ALERT_TRIGGERED,
  SENDING_ALERT, 
  RECORDING
};

SystemState currentState = IDLE;
uint8_t *monitor_buffer = NULL;
int recordingCounter = 0;
unsigned long lastAlertTime = 0;
const unsigned long COOLDOWN_TIME = 2000; // 2 seconds between alerts
unsigned long lastTriggerTime = 0;
// Voice trigger variables
volatile bool voiceTriggerDetected = false;
hw_timer_t * timer = NULL;
portMUX_TYPE timerMux = portMUX_INITIALIZER_UNLOCKED;
int consecutiveTriggersCount = 0;
unsigned long firstTriggerTime = 0;
bool sustainedTriggerActive = false;

// Alert tracking
enum AlertType {
  VOICE_ALERT,
  PIN_ALERT
};
AlertType lastAlertType;

void sendPacket(byte *packet, byte len);
void changeBaudrate();
void startTriggeredRecording();
void pinTriggerActivated();
void onTimer();
void voiceTriggerInterrupt();
void startRecording();
void record_wav(int gain, int noise_threshold, const char *filename);
void generate_wav_header(uint8_t *wav_header, uint32_t wav_size, uint32_t sample_rate);


// GPS Functions
void sendPacket(byte *packet, byte len) {
    for (byte i = 0; i < len; i++) {
        Serial1.write(packet[i]);
    }
}

void changeBaudrate() {
    byte packet[] = {
        0xB5, 0x62, 0x06, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0xD0, 0x08, 0x00, 0x00,
        0x00, 0xC2, 0x01, 0x00, 0x07, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0xC0, 0x7E
    };
    sendPacket(packet, sizeof(packet));
}

String gps_data() {
    String data = "EMERGENCY ALERT!!\n";
    
    if (gps.location.isValid()) {
        data += "Location: " + String(gps.location.lat(), 6) + ", " + String(gps.location.lng(), 6) + "\n";
        Serial.print("Location: ");
        Serial.print(gps.location.lat(), 6);
        Serial.print(", ");
        Serial.println(gps.location.lng(), 6);
    } else {
        data += "Location: Not Available\n";
        Serial.println("Location: Not Available");
    }
    
    if (gps.date.isValid()) {
        data += "Date: " + String(gps.date.month()) + "/" + String(gps.date.day()) + "/" + String(gps.date.year()) + "\n";
    } else {
        data += "Date: Not Available\n";
    }
    
    if (gps.time.isValid()) {
        data += "Time: " + String(gps.time.hour()) + ":" + String(gps.time.minute()) + ":" + String(gps.time.second()) + "\n";
    } else {
        data += "Time: Not Available\n";
    }
    
    return data;
}

// Pin Trigger Interrupt
void IRAM_ATTR pinTriggerActivated() {
    if (millis() - triggerBounceTime > debounceDelay) {
        triggerBounceTime = millis();
        pinTriggered = true;
        lastAlertType = PIN_ALERT;
        Serial.println("PIN TRIGGER ACTIVATED!");
    }
}

// Voice Trigger Timer Interrupt
void IRAM_ATTR onTimer() {
    if (currentState == MONITORING) {
        portENTER_CRITICAL_ISR(&timerMux);
        voiceTriggerDetected = true;
        portEXIT_CRITICAL_ISR(&timerMux);
    }
}

// Voice processing functions
int16_t findPeakLevel(uint8_t *buffer, size_t size) {
    int16_t peak = 0;
    for (size_t i = 0; i < size; i += 2) {
        int16_t sample = *(int16_t *)(buffer + i);
        int16_t absSample = abs(sample);
        if (absSample > peak) {
            peak = absSample;
        }
    }
    return peak;
}

void voiceTriggerInterrupt() {
    if (currentState != MONITORING) return;
    
    size_t bytesRead = 0;
    esp_i2s::i2s_read(esp_i2s::I2S_NUM_0, monitor_buffer, MONITOR_BUFFER_SIZE, &bytesRead, 50);
    
    if (bytesRead > 0) {
        int16_t peak = findPeakLevel(monitor_buffer, bytesRead);
        
        if (peak > TRIGGER_THRESHOLD) {
            if (!sustainedTriggerActive) {
                sustainedTriggerActive = true;
                firstTriggerTime = millis();
                consecutiveTriggersCount = 1;
                Serial.printf("Voice trigger detected. Peak: %d\n", peak);
            } else {
                consecutiveTriggersCount++;
            }
            
            if (consecutiveTriggersCount >= TRIGGER_SAMPLES_NEEDED) {
                unsigned long sustainedTime = millis() - firstTriggerTime;
                
                if (sustainedTime >= SUSTAINED_TRIGGER_TIME && (millis() - lastAlertTime) > COOLDOWN_TIME) {
                    Serial.printf("VOICE ALERT! Sustained for %lu ms, Peak: %d\n", sustainedTime, peak);
                    
                    // Reset voice detection
                    sustainedTriggerActive = false;
                    consecutiveTriggersCount = 0;
                    
                    // Set voice alert flag
                    lastAlertType = VOICE_ALERT;
                    currentState = ALERT_TRIGGERED;
                    
                    // Optional: Record audio
                    recordingCounter++;
                    String filename = "/voice_alert_" + String(recordingCounter) + ".wav";
                    // You can add recording function here if needed
                    // startTriggeredRecording();
                }
            }
        } else {
            if (sustainedTriggerActive) {
                sustainedTriggerActive = false;
                consecutiveTriggersCount = 0;
            }
        }
    }
}

void startTriggeredRecording() {
  currentState = RECORDING;
  lastTriggerTime = millis();
  recordingCounter++;
  
  Serial.printf("Starting recording #%d...\n", recordingCounter);
  
  // Create filename with timestamp/counter
  String filename = "/triggered_" + String(recordingCounter) + "_gain(" + String(RECORDING_GAIN) + ")_noise(" + String(RECORDING_NOISE_THRESHOLD) + ").wav";
  
  // Start recording
  record_wav(RECORDING_GAIN, RECORDING_NOISE_THRESHOLD, filename.c_str());
  
  Serial.printf("Recording #%d complete. Saved as: %s\n", recordingCounter, filename.c_str());
  Serial.println("Returning to monitoring...");
  
  currentState = IDLE; // Brief pause before returning to monitoring
}

// BLE Callbacks
class myServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
        deviceConnected = true;
        Serial.println("Device Connected!");
    }
    
    void onDisconnect(BLEServer* pServer) {
        deviceConnected = false;
        Serial.println("Device Disconnected!");
    }
};

class myRxCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pRxCharacteristic) {
        std::string rxValue = pRxCharacteristic->getValue();
        if (rxValue.length() > 0) {
            Serial.print("Received From App: ");
            Serial.println(rxValue.c_str());
        }
    }
};

// Alert sending function
void sendAlert(AlertType alertType) {
    if (!deviceConnected) {
        Serial.println("No device connected - cannot send alert");
        return;
    }
    
    lastAlertTime = millis();
    currentState = SENDING_ALERT;
    
    String alertMessage;
    if (alertType == VOICE_ALERT) {
        alertMessage = "VOICE ALERT DETECTED!\n";
        Serial.println("Sending VOICE ALERT via BLE");
        voiceTriggerInterrupt();
    } else {
        alertMessage = "EMERGENCY BUTTON PRESSED!\n";
        Serial.println("Sending PIN ALERT via BLE");
    }
    
    // Send initial alert
    pTxCharacteristic->setValue(alertMessage.c_str());
    pTxCharacteristic->notify();
    delay(100);
    
    // Send GPS data
    String gpsData = gps_data();
    pTxCharacteristic->setValue(gpsData.c_str());
    pTxCharacteristic->notify();
    delay(100);
    
    Serial.println("Alert sent successfully!");
    currentState = IDLE;
}


void record_wav(int gain, int threshold, const char* filename) {
  uint32_t record_size = (SAMPLE_RATE * SAMPLE_BITS / 8) * RECORD_TIME;
  uint8_t *rec_buffer = (uint8_t *)ps_malloc(record_size);
  if (rec_buffer == NULL) {
    Serial.println("PSRAM malloc failed!");
    currentState = IDLE;
    return;
  }

  File file = SD.open(filename, FILE_WRITE);
  if (!file) {
    Serial.println("Failed to create WAV file!");
    free(rec_buffer);
    currentState = IDLE;
    return;
  }

  uint8_t wav_header[WAV_HEADER_SIZE];
  generate_wav_header(wav_header, record_size, SAMPLE_RATE);
  file.write(wav_header, WAV_HEADER_SIZE);

  size_t bytesRead = 0;
  esp_i2s::i2s_read(esp_i2s::I2S_NUM_0, rec_buffer, record_size, &bytesRead, portMAX_DELAY);
  if (bytesRead == 0) {
    Serial.println("Recording failed.");
    free(rec_buffer);
    file.close();
    currentState = IDLE;
    return;
  }

  // Apply gain and noise gate
  for (uint32_t i = 0; i < bytesRead; i += 2) {
    int16_t *sample = (int16_t *)(rec_buffer + i);
    if (abs(*sample) < threshold) {
      *sample = 0;
    } else {
      *sample = constrain((*sample) * gain, -32768, 32767);
    }
  }

  if (file.write(rec_buffer, bytesRead) != bytesRead) {
    Serial.println("Write error!");
  }

  free(rec_buffer);
  file.close();
}


void generate_wav_header(uint8_t *wav_header, uint32_t wav_size, uint32_t sample_rate) {
  uint32_t file_size = wav_size + WAV_HEADER_SIZE - 8;
  uint32_t byte_rate = SAMPLE_RATE * SAMPLE_BITS / 8;
  const uint8_t set_wav_header[] = {
    'R', 'I', 'F', 'F',
    file_size, file_size >> 8, file_size >> 16, file_size >> 24,
    'W', 'A', 'V', 'E',
    'f', 'm', 't', ' ',
    0x10, 0x00, 0x00, 0x00,
    0x01, 0x00,
    0x01, 0x00,
    sample_rate, sample_rate >> 8, sample_rate >> 16, sample_rate >> 24,
    byte_rate, byte_rate >> 8, byte_rate >> 16, byte_rate >> 24,
    0x02, 0x00,
    0x10, 0x00,
    'd', 'a', 't', 'a',
    wav_size, wav_size >> 8, wav_size >> 16, wav_size >> 24,
  };
  memcpy(wav_header, set_wav_header, sizeof(set_wav_header));
}

void setup() {
    Serial.begin(115200);
    delay(50);
    
    // Initialize GPS
    Serial1.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
    delay(200);
    changeBaudrate();
    Serial1.begin(115200, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
    
    // Initialize BLE
    Serial.println("Starting SHIELD Alert System!");
    BLEDevice::init("SHIELD");
    // BLEDevice::setPower(ESP_PWR_LVL_P9, ESP_BLE_PWR_TYPE_DEFAULT);
    pServer = BLEDevice::createServer();
    pServer->setCallbacks(new myServerCallbacks());
    
    BLEService *pService = pServer->createService(SERVICE_UUID);
    pTxCharacteristic = pService->createCharacteristic(CHARACTERISTIC_UUID_TX, BLECharacteristic::PROPERTY_NOTIFY);
    pTxCharacteristic->addDescriptor(new BLE2902());
    pRxCharacteristic = pService->createCharacteristic(CHARACTERISTIC_UUID_RX, BLECharacteristic::PROPERTY_WRITE);
    pRxCharacteristic->setCallbacks(new myRxCallbacks());
    
    pService->start();
    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06);
    pAdvertising->setMinPreferred(0x12);
    BLEDevice::startAdvertising();
    
    // Initialize SD Card for voice recording
    if (!SD.begin(SD_CS)) {
        Serial.println("SD Card initialization failed - voice recording disabled");
    } else {
        Serial.println("SD Card initialized");
    }
    
    // Initialize I2S for voice monitoring
    I2S.setAllPins(-1, 42, 41, -1, -1);
    if (!I2S.begin(PDM_MONO_MODE, SAMPLE_RATE, SAMPLE_BITS)) {
        Serial.println("I2S initialization failed - voice trigger disabled");
    } else {
        Serial.println("I2S initialized");
        
        // Allocate monitoring buffer
        monitor_buffer = (uint8_t *)malloc(MONITOR_BUFFER_SIZE);
        if (monitor_buffer != NULL) {
            // Setup timer for voice monitoring
            timer = timerBegin(0, 80, true);
            timerAttachInterrupt(timer, &onTimer, true);
            timerAlarmWrite(timer, 50000, true);  // 50ms interval
            timerAlarmEnable(timer);
            Serial.println("Voice monitoring enabled");
        } else {
            Serial.println("Failed to allocate voice monitoring buffer");
        }
    }
    
    // Setup pin trigger
    pinMode(TRIGGER_PIN, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(TRIGGER_PIN), pinTriggerActivated, FALLING);
    
    Serial.println("SHIELD Alert System Ready!");
    Serial.println("- Pin trigger on pin 1");
    Serial.println("- Voice trigger monitoring active");
    Serial.println("- BLE advertising as 'SHIELD_ALERT'");
    
    pTxCharacteristic->setValue("SHIELD Alert System Online");
    pTxCharacteristic->notify();
    
    currentState = MONITORING;
}

void loop() {
    // Process GPS data
    while (Serial1.available() > 0) {
        gps.encode(Serial1.read());
    }
    
    // Handle voice trigger interrupt
    if (voiceTriggerDetected) {
        portENTER_CRITICAL(&timerMux);
        voiceTriggerDetected = false;
        portEXIT_CRITICAL(&timerMux);
        voiceTriggerInterrupt();
    }
    
    // Handle pin trigger
    if (pinTriggered) {
        pinTriggered = false;
        currentState = ALERT_TRIGGERED;
        Serial.println("Pin trigger activated!");
    }
    
    // State machine
    switch (currentState) {
        case MONITORING:
            // Send periodic status if connected
            if (deviceConnected) {
                static unsigned long lastStatus = 0;
                if (millis() - lastStatus > 1000) { // Every 10 seconds
                    pTxCharacteristic->setValue("System monitoring - All OK");
                    pTxCharacteristic->notify();
                    lastStatus = millis();
                }
            }
            break;
            
        case ALERT_TRIGGERED:
            // Send alert based on trigger type

            sendAlert(lastAlertType);
            break;
            
        case SENDING_ALERT:
            // Handled in sendAlert function
            break;
            
        case IDLE:
            // Brief pause before returning to monitoring
            delay(100);
            currentState = MONITORING;
            break;
    }
    
    delay(10);
}