// //FREERTOS OPTIMIZED BLE ALERT SYSTEM WITH AUDIO STREAMING
// #include <Arduino.h>
// #include <BLEDevice.h>
// #include <BLEUtils.h>
// #include <BLEServer.h>
// #include <TinyGPS++.h>
// #include <BLE2902.h>
// #include <I2S.h>
// #include "FS.h"
// #include "SD.h"
// #include "SPI.h"
// #include "freertos/FreeRTOS.h"
// #include "freertos/task.h"
// #include "freertos/queue.h"
// #include "freertos/semphr.h"

// // GPS Configuration
// TinyGPSPlus gps;
// #define GPSBaud 9600
// #define GPS_RX_PIN 44
// #define GPS_TX_PIN 43
// #define GPS_SERIAL_PORT Serial1

// // BLE Configuration
// #define SERVICE_UUID           "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
// #define CHARACTERISTIC_UUID_RX "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
// #define CHARACTERISTIC_UUID_TX "6e400003-b5a3-f393-e0a9-e50e24dcca9e"
// #define AUDIO_SERVICE_UUID     "12345678-1234-5678-9012-123456789abc"
// #define AUDIO_CHAR_UUID        "87654321-4321-8765-2109-abcdef123456"

// BLECharacteristic *pTxCharacteristic = nullptr;
// BLECharacteristic *pRxCharacteristic = nullptr;
// BLECharacteristic *pAudioCharacteristic = nullptr;
// BLEServer *pServer = nullptr;
// bool deviceConnected = false;

// // Pin Trigger Configuration
// #define TRIGGER_PIN 1
// volatile bool pinTriggered = false;
// unsigned long triggerBounceTime = 0;
// unsigned long debounceDelay = 100;

// // Audio Configuration
// #define RECORD_TIME   10
// #define SAMPLE_RATE   16000U
// #define SAMPLE_BITS   16
// #define WAV_HEADER_SIZE 44
// #define SD_CS 21

// // Audio streaming settings
// #define AUDIO_BUFFER_SIZE 512    // Size of each audio chunk to send via BLE
// #define AUDIO_QUEUE_SIZE 20      // Number of audio buffers in queue
// #define MAX_BLE_PACKET_SIZE 244  // Maximum BLE packet size (MTU-3)

// // Voice Monitoring settings
// #define MONITOR_BUFFER_SIZE (SAMPLE_RATE * SAMPLE_BITS / 8 * 0.05)  // 50ms buffer
// #define TRIGGER_THRESHOLD 2300
// #define RECORDING_GAIN 10
// #define RECORDING_NOISE_THRESHOLD 120
// #define SUSTAINED_TRIGGER_TIME 150
// #define TRIGGER_SAMPLES_NEEDED 3

// // FreeRTOS Configuration
// #define STACK_SIZE_LARGE 8192
// #define STACK_SIZE_MEDIUM 4096
// #define STACK_SIZE_SMALL 2048

// // Task handles
// TaskHandle_t xGPSTaskHandle = NULL;
// TaskHandle_t xVoiceMonitorTaskHandle = NULL;
// TaskHandle_t xAudioRecordTaskHandle = NULL;
// TaskHandle_t xAudioStreamTaskHandle = NULL;
// TaskHandle_t xBLETaskHandle = NULL;

// // Queues and Semaphores
// QueueHandle_t audioQueue;
// QueueHandle_t alertQueue;
// SemaphoreHandle_t sdCardMutex;
// SemaphoreHandle_t bleStreamMutex;

// // Audio buffer structure
// typedef struct {
//     uint8_t data[AUDIO_BUFFER_SIZE];
//     size_t length;
//     bool isLast;
// } AudioBuffer_t;

// // Alert structure
// typedef struct {
//     enum AlertType { VOICE_ALERT, PIN_ALERT } type;
//     unsigned long timestamp;
//     String gpsData;
// } Alert_t;

// // Global variables
// volatile bool isRecording = false;
// volatile bool streamAudio = false;
// int recordingCounter = 0;
// File currentRecordingFile;

// // Voice detection variables
// int consecutiveTriggersCount = 0;
// unsigned long firstTriggerTime = 0;
// bool sustainedTriggerActive = false;
// uint8_t *monitor_buffer = NULL;

// // GPS Functions
// void sendPacket(byte *packet, byte len) {
//     for (byte i = 0; i < len; i++) {
//         Serial1.write(packet[i]);
//     }
// }

// void changeBaudrate() {
//     byte packet[] = {
//         0xB5, 0x62, 0x06, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0xD0, 0x08, 0x00, 0x00,
//         0x00, 0xC2, 0x01, 0x00, 0x07, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0xC0, 0x7E
//     };
//     sendPacket(packet, sizeof(packet));
// }

// String getCurrentGPSData() {
//     String data = "EMERGENCY ALERT!!\n";
    
//     if (gps.location.isValid()) {
//         data += "Location: " + String(gps.location.lat(), 6) + ", " + String(gps.location.lng(), 6) + "\n";
//     } else {
//         data += "Location: Not Available\n";
//     }
    
//     if (gps.date.isValid()) {
//         data += "Date: " + String(gps.date.month()) + "/" + String(gps.date.day()) + "/" + String(gps.date.year()) + "\n";
//     } else {
//         data += "Date: Not Available\n";
//     }
    
//     if (gps.time.isValid()) {
//         data += "Time: " + String(gps.time.hour()) + ":" + String(gps.time.minute()) + ":" + String(gps.time.second()) + "\n";
//     } else {
//         data += "Time: Not Available\n";
//     }
    
//     return data;
// }

// // Pin Trigger Interrupt
// void IRAM_ATTR pinTriggerActivated() {
//     if (millis() - triggerBounceTime > debounceDelay) {
//         triggerBounceTime = millis();
//         pinTriggered = true;
//     }
// }

// // Voice processing functions
// int16_t findPeakLevel(uint8_t *buffer, size_t size) {
//     int16_t peak = 0;
//     for (size_t i = 0; i < size; i += 2) {
//         int16_t sample = *(int16_t *)(buffer + i);
//         int16_t absSample = abs(sample);
//         if (absSample > peak) {
//             peak = absSample;
//         }
//     }
//     return peak;
// }

// void generate_wav_header(uint8_t *wav_header, uint32_t wav_size, uint32_t sample_rate) {
//     uint32_t file_size = wav_size + WAV_HEADER_SIZE - 8;
//     uint32_t byte_rate = sample_rate * SAMPLE_BITS / 8;
//     const uint8_t set_wav_header[] = {
//         'R', 'I', 'F', 'F',
//         file_size, file_size >> 8, file_size >> 16, file_size >> 24,
//         'W', 'A', 'V', 'E',
//         'f', 'm', 't', ' ',
//         0x10, 0x00, 0x00, 0x00,
//         0x01, 0x00, 0x01, 0x00,
//         sample_rate, sample_rate >> 8, sample_rate >> 16, sample_rate >> 24,
//         byte_rate, byte_rate >> 8, byte_rate >> 16, byte_rate >> 24,
//         0x02, 0x00, 0x10, 0x00,
//         'd', 'a', 't', 'a',
//         wav_size, wav_size >> 8, wav_size >> 16, wav_size >> 24,
//     };
//     memcpy(wav_header, set_wav_header, sizeof(set_wav_header));
// }

// // BLE Callbacks
// class myServerCallbacks: public BLEServerCallbacks {
//     void onConnect(BLEServer* pServer) {
//         deviceConnected = true;
//         Serial.println("Device Connected!");
//     }
    
//     void onDisconnect(BLEServer* pServer) {
//         deviceConnected = false;
//         Serial.println("Device Disconnected!");
//     }
// };

// class myRxCallbacks: public BLECharacteristicCallbacks {
//     void onWrite(BLECharacteristic *pRxCharacteristic) {
//         std::string rxValue = pRxCharacteristic->getValue();
//         if (rxValue.length() > 0) {
//             Serial.print("Received: ");
//             Serial.println(rxValue.c_str());
//         }
//     }
// };

// // FreeRTOS Tasks

// // GPS Task - Handles GPS data reading
// void vGPSTask(void *pvParameters) {
//     TickType_t xLastWakeTime = xTaskGetTickCount();
    
//     while (1) {
//         while (Serial1.available() > 0) {
//             gps.encode(Serial1.read());
//         }
//         vTaskDelayUntil(&xLastWakeTime, pdMS_TO_TICKS(100));
//     }
// }

// // Voice Monitor Task - Detects voice triggers
// void vVoiceMonitorTask(void *pvParameters) {
//     TickType_t xLastWakeTime = xTaskGetTickCount();
    
//     while (1) {
//         if (!isRecording && monitor_buffer != NULL) {
//             size_t bytesRead = 0;
//             esp_i2s::i2s_read(esp_i2s::I2S_NUM_0, monitor_buffer, MONITOR_BUFFER_SIZE, &bytesRead, 50);
            
//             if (bytesRead > 0) {
//                 int16_t peak = findPeakLevel(monitor_buffer, bytesRead);
                
//                 if (peak > TRIGGER_THRESHOLD) {
//                     if (!sustainedTriggerActive) {
//                         sustainedTriggerActive = true;
//                         firstTriggerTime = millis();
//                         consecutiveTriggersCount = 1;
//                     } else {
//                         consecutiveTriggersCount++;
//                     }
                    
//                     if (consecutiveTriggersCount >= TRIGGER_SAMPLES_NEEDED) {
//                         unsigned long sustainedTime = millis() - firstTriggerTime;
                        
//                         if (sustainedTime >= SUSTAINED_TRIGGER_TIME) {
//                             Serial.printf("VOICE ALERT! Peak: %d\n", peak);
                            
//                             // Reset detection
//                             sustainedTriggerActive = false;
//                             consecutiveTriggersCount = 0;
                            
//                             // Create alert
//                             Alert_t alert;
//                             alert.type = Alert_t::VOICE_ALERT;
//                             alert.timestamp = millis();
//                             alert.gpsData = getCurrentGPSData();
                            
//                             // Send alert to queue
//                             xQueueSend(alertQueue, &alert, 0);
//                         }
//                     }
//                 } else {
//                     if (sustainedTriggerActive) {
//                         sustainedTriggerActive = false;
//                         consecutiveTriggersCount = 0;
//                     }
//                 }
//             }
//         }
        
//         // Check pin trigger
//         if (pinTriggered) {
//             pinTriggered = false;
            
//             Alert_t alert;
//             alert.type = Alert_t::PIN_ALERT;
//             alert.timestamp = millis();
//             alert.gpsData = getCurrentGPSData();
            
//             xQueueSend(alertQueue, &alert, 0);
//             Serial.println("PIN ALERT!");
//         }
        
//         vTaskDelayUntil(&xLastWakeTime, pdMS_TO_TICKS(50));
//     }
// }

// // Audio Record Task - Records audio and puts it in queue
// void vAudioRecordTask(void *pvParameters) {
//     uint8_t *record_buffer = (uint8_t *)malloc(AUDIO_BUFFER_SIZE);
    
//     while (1) {
//         if (isRecording) {
//             size_t bytesRead = 0;
//             esp_i2s::i2s_read(esp_i2s::I2S_NUM_0, record_buffer, AUDIO_BUFFER_SIZE, &bytesRead, portMAX_DELAY);
            
//             if (bytesRead > 0) {
//                 // Apply gain and noise gate
//                 for (uint32_t i = 0; i < bytesRead; i += 2) {
//                     int16_t *sample = (int16_t *)(record_buffer + i);
//                     if (abs(*sample) < RECORDING_NOISE_THRESHOLD) {
//                         *sample = 0;
//                     } else {
//                         *sample = constrain((*sample) * RECORDING_GAIN, -32768, 32767);
//                     }
//                 }
                
//                 // Create audio buffer
//                 AudioBuffer_t audioBuffer;
//                 memcpy(audioBuffer.data, record_buffer, bytesRead);
//                 audioBuffer.length = bytesRead;
//                 audioBuffer.isLast = false;
                
//                 // Send to queue for streaming
//                 if (streamAudio) {
//                     xQueueSend(audioQueue, &audioBuffer, 0);
//                 }
                
//                 // Write to SD card
//                 if (currentRecordingFile && xSemaphoreTake(sdCardMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
//                     currentRecordingFile.write(record_buffer, bytesRead);
//                     xSemaphoreGive(sdCardMutex);
//                 }
//             }
//         } else {
//             vTaskDelay(pdMS_TO_TICKS(100));
//         }
//     }
// }

// // Audio Stream Task - Streams audio via BLE
// void vAudioStreamTask(void *pvParameters) {
//     AudioBuffer_t audioBuffer;
    
//     while (1) {
//         if (xQueueReceive(audioQueue, &audioBuffer, portMAX_DELAY) == pdTRUE) {
//             if (deviceConnected && pAudioCharacteristic) {
//                 if (xSemaphoreTake(bleStreamMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
//                     // Send audio data in chunks if larger than BLE packet size
//                     size_t offset = 0;
//                     while (offset < audioBuffer.length) {
//                         size_t chunkSize = min((size_t)MAX_BLE_PACKET_SIZE, audioBuffer.length - offset);
                        
//                         pAudioCharacteristic->setValue(&audioBuffer.data[offset], chunkSize);
//                         pAudioCharacteristic->notify();
                        
//                         offset += chunkSize;
//                         vTaskDelay(pdMS_TO_TICKS(10)); // Small delay between chunks
//                     }
//                     xSemaphoreGive(bleStreamMutex);
//                 }
//             }
//         }
//     }
// }

// // BLE Task - Handles BLE communication and alerts
// void vBLETask(void *pvParameters) {
//     Alert_t alert;
    
//     while (1) {
//         if (xQueueReceive(alertQueue, &alert, portMAX_DELAY) == pdTRUE) {
//             // Start recording for this alert
//             if (!isRecording) {
//                 recordingCounter++;
//                 String filename = "/alert_" + String(recordingCounter) + "_" + 
//                                  (alert.type == Alert_t::VOICE_ALERT ? "voice" : "pin") + ".wav";
                
//                 if (xSemaphoreTake(sdCardMutex, pdMS_TO_TICKS(1000)) == pdTRUE) {
//                     currentRecordingFile = SD.open(filename, FILE_WRITE);
//                     if (currentRecordingFile) {
//                         // Write WAV header
//                         uint8_t wav_header[WAV_HEADER_SIZE];
//                         uint32_t record_size = (SAMPLE_RATE * SAMPLE_BITS / 8) * RECORD_TIME;
//                         generate_wav_header(wav_header, record_size, SAMPLE_RATE);
//                         currentRecordingFile.write(wav_header, WAV_HEADER_SIZE);
                        
//                         Serial.printf("Started recording: %s\n", filename.c_str());
//                         isRecording = true;
//                         streamAudio = true;
//                     }
//                     xSemaphoreGive(sdCardMutex);
//                 }
//             }
            
//             // Send alert via BLE
//             if (deviceConnected && pTxCharacteristic) {
//                 String alertMsg = (alert.type == Alert_t::VOICE_ALERT) ? 
//                                  "VOICE ALERT DETECTED!\n" : "EMERGENCY BUTTON PRESSED!\n";
                
//                 pTxCharacteristic->setValue(alertMsg.c_str());
//                 pTxCharacteristic->notify();
//                 vTaskDelay(pdMS_TO_TICKS(100));
                
//                 pTxCharacteristic->setValue(alert.gpsData.c_str());
//                 pTxCharacteristic->notify();
//                 vTaskDelay(pdMS_TO_TICKS(100));
                
//                 // Send audio start indicator
//                 pTxCharacteristic->setValue("AUDIO_START");
//                 pTxCharacteristic->notify();
//             }
            
//             // Record for specified time
//             vTaskDelay(pdMS_TO_TICKS(RECORD_TIME * 1000));
            
//             // Stop recording
//             isRecording = false;
//             streamAudio = false;
            
//             if (currentRecordingFile) {
//                 if (xSemaphoreTake(sdCardMutex, pdMS_TO_TICKS(1000)) == pdTRUE) {
//                     currentRecordingFile.close();
//                     Serial.println("Recording stopped and saved");
//                     xSemaphoreGive(sdCardMutex);
//                 }
//             }
            
//             // Send audio end indicator
//             if (deviceConnected && pTxCharacteristic) {
//                 pTxCharacteristic->setValue("AUDIO_END");
//                 pTxCharacteristic->notify();
//             }
//         }
//     }
// }

// void setup() {
//     Serial.begin(115200);
//     delay(1000);
    
//     // Initialize GPS
//     Serial1.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
//     delay(200);
//     changeBaudrate();
//     Serial1.begin(115200, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
    
//     // Initialize BLE
//     BLEDevice::init("SHIELD");
//     BLEDevice::setPower(ESP_PWR_LVL_P9, ESP_BLE_PWR_TYPE_DEFAULT);
//     pServer = BLEDevice::createServer();
//     pServer->setCallbacks(new myServerCallbacks());
    
//     // Main service
//     BLEService *pService = pServer->createService(SERVICE_UUID);
//     pTxCharacteristic = pService->createCharacteristic(CHARACTERISTIC_UUID_TX, BLECharacteristic::PROPERTY_NOTIFY);
//     pTxCharacteristic->addDescriptor(new BLE2902());
//     pRxCharacteristic = pService->createCharacteristic(CHARACTERISTIC_UUID_RX, BLECharacteristic::PROPERTY_WRITE);
//     pRxCharacteristic->setCallbacks(new myRxCallbacks());
    
//     // Audio service
//     BLEService *pAudioService = pServer->createService(AUDIO_SERVICE_UUID);
//     pAudioCharacteristic = pAudioService->createCharacteristic(AUDIO_CHAR_UUID, BLECharacteristic::PROPERTY_NOTIFY);
//     pAudioCharacteristic->addDescriptor(new BLE2902());
    
//     pService->start();
//     pAudioService->start();
    
//     BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
//     pAdvertising->addServiceUUID(SERVICE_UUID);
//     pAdvertising->addServiceUUID(AUDIO_SERVICE_UUID);
//     pAdvertising->setScanResponse(true);
//     pAdvertising->setMinPreferred(0x06);
//     pAdvertising->setMinPreferred(0x12);
//     BLEDevice::startAdvertising();
    
//     // Initialize SD Card
//     if (!SD.begin(SD_CS)) {
//         Serial.println("SD Card failed!");
//     } else {
//         Serial.println("SD Card initialized");
//     }
    
//     // Initialize I2S
//     I2S.setAllPins(-1, 42, 41, -1, -1);
//     if (!I2S.begin(PDM_MONO_MODE, SAMPLE_RATE, SAMPLE_BITS)) {
//         Serial.println("I2S failed!");
//     } else {
//         Serial.println("I2S initialized");
//         monitor_buffer = (uint8_t *)malloc(MONITOR_BUFFER_SIZE);
//     }
    
//     // Setup pin trigger
//     pinMode(TRIGGER_PIN, INPUT_PULLUP);
//     attachInterrupt(digitalPinToInterrupt(TRIGGER_PIN), pinTriggerActivated, FALLING);
    
//     // Create queues and semaphores
//     audioQueue = xQueueCreate(AUDIO_QUEUE_SIZE, sizeof(AudioBuffer_t));
//     alertQueue = xQueueCreate(5, sizeof(Alert_t));
//     sdCardMutex = xSemaphoreCreateMutex();
//     bleStreamMutex = xSemaphoreCreateMutex();
    
//     // Create FreeRTOS tasks
//     xTaskCreatePinnedToCore(vGPSTask, "GPS_Task", STACK_SIZE_SMALL, NULL, 1, &xGPSTaskHandle, 0);
//     xTaskCreatePinnedToCore(vVoiceMonitorTask, "Voice_Monitor", STACK_SIZE_MEDIUM, NULL, 3, &xVoiceMonitorTaskHandle, 1);
//     xTaskCreatePinnedToCore(vAudioRecordTask, "Audio_Record", STACK_SIZE_LARGE, NULL, 4, &xAudioRecordTaskHandle, 1);
//     xTaskCreatePinnedToCore(vAudioStreamTask, "Audio_Stream", STACK_SIZE_MEDIUM, NULL, 2, &xAudioStreamTaskHandle, 0);
//     xTaskCreatePinnedToCore(vBLETask, "BLE_Task", STACK_SIZE_LARGE, NULL, 3, &xBLETaskHandle, 0);
    
//     Serial.println("SHIELD Audio Alert System Ready!");
//     Serial.println("Tasks created and running...");
// }

// void loop() {
//     // Main loop can be used for system monitoring
//     vTaskDelay(pdMS_TO_TICKS(1000));
    
//     // Print system status
//     Serial.printf("Free heap: %d bytes\n", ESP.getFreeHeap());
//     Serial.printf("Recording: %s, Streaming: %s\n", 
//                   isRecording ? "YES" : "NO", 
//                   streamAudio ? "YES" : "NO");
//     }
