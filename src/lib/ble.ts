// BLE Service for SHEILD - Smart Holistic Emergency & Intelligent Location Device
// Implements complete BLE functionality for ESP32 device communication using Capacitor

import type { PluginListenerHandle } from '@capacitor/core';
import { BleClient, type BleDevice, type BleService, type BleCharacteristic } from '@capacitor-community/bluetooth-le';
// Use Geolocation from Capacitor Plugins for compatibility
const { Geolocation } = (window as any).Capacitor?.Plugins || {};

// Import WiFi service
import { wifiService, type WiFiDevice, type WiFiData } from './wifi';

// Only minimal fallback types for web Bluetooth
// (Do not redeclare global interfaces that may conflict with browser types)

export interface BLEDevice {
    id: string;
    name: string;
    rssi?: number;
    address?: string;
    deviceId?: string; // Capacitor device ID
}

export interface BLEData {
    value: number;
    timestamp: number;
    status: string;
    battery?: number;
    rawData?: string;
    location?: {
        latitude: number;
        longitude: number;
        accuracy?: number;
    };
}

export interface BLEConnectionState {
    isConnected: boolean;
    isScanning: boolean;
    isConnecting: boolean;
    device?: BLEDevice;
    error?: string;
    lastData?: BLEData;
    dataHistory: BLEData[];
    bluetoothState: 'enabled' | 'disabled' | 'unknown';
    permissions: {
        bluetooth: 'granted' | 'denied' | 'prompt' | 'unknown';
        location: 'granted' | 'denied' | 'prompt' | 'unknown';
    };
}

// BLE Configuration Constants (from BLE Setup.md)
export const BLE_CONFIG = {
    SERVICE_UUID: "4fafc201-1fb5-459e-8fcc-c5c9c331914b",
    CHARACTERISTIC_UUID: "beb5483e-36e1-4688-b7f5-ea07361b26a8",
    TARGET_DEVICE_NAME: "ESP32-THAT-PROJECT",
    SCAN_TIMEOUT: 3000, // 3 seconds
    MAX_DATA_BUFFER_SIZE: 20,
    MAX_DBA_VALUE: 120,
    RECONNECT_ATTEMPTS: 3,
    RECONNECT_DELAY: 2000, // 2 seconds
    DATA_UPDATE_INTERVAL: 100, // 100ms for real-time updates
} as const;

class BLEService {
    private device: BLEDevice | null = null;
    private connectionState: BLEConnectionState = {
        isConnected: false,
        isScanning: false,
        isConnecting: false,
        dataHistory: [],
        bluetoothState: 'enabled', // Always enabled since we're using WiFi
        permissions: {
            bluetooth: 'granted', // Always granted since we're using WiFi
            location: 'granted'
        },
    };
    private listeners: Set<(state: BLEConnectionState) => void> = new Set();
    private reconnectAttempts = 0;
    private reconnectTimer: NodeJS.Timeout | null = null;
    private notificationListener: (() => void) | null = null;
    private isCapacitor = false;

    constructor() {
        // Subscribe to WiFi service state changes
        wifiService.subscribe(this.handleWiFiStateChange.bind(this));
    }

    // Handle WiFi state changes
    private handleWiFiStateChange(wifiState: WiFiConnectionState) {
        // Map WiFi state to BLE state
        this.updateState({
            isConnected: wifiState.isConnected,
            isScanning: wifiState.isScanning,
            isConnecting: wifiState.isConnecting,
            device: wifiState.device ? this.mapWiFiDeviceToBLE(wifiState.device) : undefined,
            error: wifiState.error,
            lastData: wifiState.lastData ? this.mapWiFiDataToBLE(wifiState.lastData) : undefined,
            dataHistory: wifiState.dataHistory.map(this.mapWiFiDataToBLE)
        });
    }

    // Map WiFi device to BLE device format
    private mapWiFiDeviceToBLE(wifiDevice: WiFiDevice): BLEDevice {
        return {
            id: wifiDevice.id,
            name: wifiDevice.name,
            rssi: wifiDevice.rssi,
            address: wifiDevice.address
        };
    }

    // Map WiFi data to BLE data format
    private mapWiFiDataToBLE(wifiData: WiFiData): BLEData {
        return {
            value: wifiData.value,
            timestamp: wifiData.timestamp,
            status: wifiData.status,
            battery: wifiData.battery,
            rawData: wifiData.rawData
        };
    }

    // Initialize BLE service and detect platform
    private async initializeBLE(): Promise<void> {
        try {
            // Check if we're running on Capacitor
            if (typeof window !== 'undefined' && 'Capacitor' in window) {
                this.isCapacitor = true;
                console.log('📱 Running on Capacitor platform');

                // Initialize Capacitor BLE
                await BleClient.initialize();
                console.log('✅ Capacitor BLE initialized');

                // Check permissions and Bluetooth state
                await this.checkPermissionsAndState();
            } else {
                this.isCapacitor = false;
                console.log('🌐 Running on web platform');
                this.checkWebBluetoothSupport();
            }
        } catch (error) {
            console.error('❌ BLE initialization error:', error);
            this.updateState({
                error: 'Failed to initialize Bluetooth',
                bluetoothState: 'disabled'
            });
        }
    }

    // Check permissions and Bluetooth state on Capacitor
    private async checkPermissionsAndState(): Promise<void> {
        try {
            // Check if Bluetooth is enabled
            const isEnabled = await BleClient.isEnabled();
            const bluetoothState = isEnabled ? 'enabled' : 'disabled';

            // For Android, permissions are handled at runtime
            // We'll check them when actually needed
            this.updateState({
                bluetoothState,
                permissions: {
                    bluetooth: 'prompt', // Will be checked during operations
                    location: 'prompt',  // Will be checked during operations
                }
            });

            if (!isEnabled) {
                console.log('⚠️ Bluetooth is disabled');
            }

        } catch (error) {
            console.error('❌ Permission/state check error:', error);
            this.updateState({
                bluetoothState: 'unknown',
                permissions: {
                    bluetooth: 'unknown',
                    location: 'unknown',
                }
            });
        }
    }

    // Check Web Bluetooth support
    private checkWebBluetoothSupport(): boolean {
        if (!navigator.bluetooth) {
            console.error('❌ Web Bluetooth API not supported');
            this.updateState({
                error: 'Bluetooth not supported by this browser',
                bluetoothState: 'disabled',
                permissions: {
                    bluetooth: 'denied',
                    location: 'granted',
                }
            });
            return false;
        }
        this.updateState({
            bluetoothState: 'enabled',
            permissions: {
                bluetooth: 'granted',
                location: 'granted',
            }
        });
        return true;
    }

    // Request Web Bluetooth permission
    private async requestWebBluetoothPermission(): Promise<boolean> {
        try {
            if (!this.checkWebBluetoothSupport()) return false;
            const available = await navigator.bluetooth!.getAvailability();
            return available;
        } catch (error) {
            console.error('❌ Web Bluetooth permission error:', error);
            return false;
        }
    }

    // Request Bluetooth permissions (enhanced for Android 12+)
    async requestBluetoothPermission(): Promise<boolean> {
        try {
            if (this.isCapacitor) {
                console.log('🔐 Requesting Bluetooth permissions...');

                // Check if Bluetooth is enabled
                const isEnabled = await BleClient.isEnabled();
                if (!isEnabled) {
                    try {
                        console.log('🔵 Enabling Bluetooth...');
                        await BleClient.enable();
                        console.log('✅ Bluetooth enabled');
                    } catch (error) {
                        console.error('❌ Failed to enable Bluetooth:', error);
                        this.updateState({
                            error: 'Please enable Bluetooth in your device settings',
                            permissions: {
                                ...this.connectionState.permissions,
                                bluetooth: 'denied'
                            }
                        });
                        return false;
                    }
                }

                // Try to start a scan to trigger permission request
                // This will automatically request BLUETOOTH_SCAN and BLUETOOTH_CONNECT permissions
                try {
                    console.log('🔍 Testing scan to trigger permissions...');
                    await BleClient.requestLEScan(
                        {
                            services: [BLE_CONFIG.SERVICE_UUID],
                            allowDuplicates: false,
                        },
                        () => {
                            // This callback won't be called during permission test
                        }
                    );

                    // Immediately stop the test scan
                    await BleClient.stopLEScan();
                    console.log('✅ Bluetooth permissions granted');

                    this.updateState({
                        permissions: {
                            ...this.connectionState.permissions,
                            bluetooth: 'granted'
                        }
                    });

                    return true;
                } catch (scanError: any) {
                    console.error('❌ Scan permission test failed:', scanError);

                    // Check if it's a permission error
                    if (scanError.message?.includes('permission') ||
                        scanError.message?.includes('denied') ||
                        scanError.name === 'NotAllowedError') {

                        this.updateState({
                            error: 'Bluetooth permission denied. Please grant Bluetooth permissions in device settings.',
                            permissions: {
                                ...this.connectionState.permissions,
                                bluetooth: 'denied'
                            }
                        });
                        return false;
                    }

                    // Other scan errors might be due to no devices found, which is OK for permission test
                    console.log('⚠️ Scan test completed (no devices found, but permissions OK)');
                    this.updateState({
                        permissions: {
                            ...this.connectionState.permissions,
                            bluetooth: 'granted'
                        }
                    });
                    return true;
                }
            } else {
                return await this.requestWebBluetoothPermission();
            }
        } catch (error) {
            console.error('❌ Bluetooth permission error:', error);
            this.updateState({
                error: 'Failed to get Bluetooth permission',
                permissions: {
                    ...this.connectionState.permissions,
                    bluetooth: 'denied'
                }
            });
            return false;
        }
    }

    // Request Location permissions
    async requestLocationPermission(): Promise<boolean> {
        try {
            if (this.isCapacitor && Geolocation) {
                console.log('📍 Requesting location permissions...');
                try {
                    // Try to get current position to trigger permission request
                    await Geolocation.getCurrentPosition({
                        enableHighAccuracy: true,
                        timeout: 5000,
                    });

                    this.updateState({
                        permissions: {
                            ...this.connectionState.permissions,
                            location: 'granted'
                        }
                    });

                    console.log('✅ Location permission granted');
                    return true;
                } catch (error: any) {
                    console.error('❌ Location permission denied:', error);

                    // Check if it's a permission error
                    if (error.message?.includes('permission') ||
                        error.message?.includes('denied') ||
                        error.code === 1) { // PERMISSION_DENIED

                        this.updateState({
                            permissions: {
                                ...this.connectionState.permissions,
                                location: 'denied'
                            }
                        });
                        return false;
                    }

                    // Other location errors (like timeout) don't necessarily mean permission denied
                    console.log('⚠️ Location not available, but permission might be OK');
                    this.updateState({
                        permissions: {
                            ...this.connectionState.permissions,
                            location: 'granted'
                        }
                    });
                    return true;
                }
            } else {
                // Web or no Geolocation plugin
                this.updateState({
                    permissions: {
                        ...this.connectionState.permissions,
                        location: 'granted'
                    }
                });
                return true;
            }
        } catch (error) {
            console.error('❌ Location permission error:', error);
            return false;
        }
    }

    // Request all required permissions
    async requestAllPermissions(): Promise<boolean> {
        try {
            if (this.isCapacitor) {
                console.log('🔐 Requesting all Android permissions...');

                // Request Bluetooth permissions first
                const bluetoothGranted = await this.requestBluetoothPermission();
                if (!bluetoothGranted) {
                    this.updateState({
                        error: 'Bluetooth permission is required for device scanning. Please grant Bluetooth permissions in device settings.',
                        isScanning: false
                    });
                    return false;
                }

                // Request Location permissions (required for BLE scanning on Android 6+)
                const locationGranted = await this.requestLocationPermission();
                if (!locationGranted) {
                    console.log('⚠️ Location permission not granted, but continuing...');
                    // Location is not critical for BLE operation, so we continue
                }

                console.log('✅ All permissions requested successfully');
                return true;
            } else {
                // Web platform - permissions are handled differently
                return await this.requestWebBluetoothPermission();
            }
        } catch (error) {
            console.error('❌ Permission request error:', error);
            this.updateState({
                error: 'Failed to request permissions',
                isScanning: false
            });
            return false;
        }
    }

    // Start device discovery (using WiFi)
    async startDeviceDiscovery(): Promise<BLEDevice[]> {
        try {
            const wifiDevices = await wifiService.startDeviceDiscovery();
            return wifiDevices.map(this.mapWiFiDeviceToBLE);
        } catch (error: any) {
            console.error('Device discovery error:', error);
            return [];
        }
    }

    // Capacitor device discovery
    private async startCapacitorDiscovery(): Promise<BLEDevice[]> {
        const devices: BLEDevice[] = [];

        try {
            await BleClient.requestLEScan(
                {
                    services: [BLE_CONFIG.SERVICE_UUID],
                    allowDuplicates: false,
                },
                (result: any) => {
                    console.log('📡 Found device:', result.device.name);

                    if (result.device.name &&
                        (result.device.name === BLE_CONFIG.TARGET_DEVICE_NAME ||
                            result.device.name.startsWith('ESP32'))) {

                        const bleDevice: BLEDevice = {
                            id: result.device.deviceId,
                            name: result.device.name,
                            rssi: result.rssi,
                            deviceId: result.device.deviceId,
                        };

                        devices.push(bleDevice);
                    }
                }
            );

            // Stop scanning after timeout
            setTimeout(async () => {
                try {
                    await BleClient.stopLEScan();
                    console.log('⏹️ BLE scan stopped');
                } catch (error) {
                    console.error('❌ Error stopping scan:', error);
                }
            }, BLE_CONFIG.SCAN_TIMEOUT);

            this.updateState({ isScanning: false });

            if (devices.length > 0) {
                // Auto-connect to first found device
                await this.connectToDevice(devices[0]);
            }

            return devices;
        } catch (error) {
            await BleClient.stopLEScan();
            throw error;
        }
    }

    // Web Bluetooth device discovery (fallback)
    private async startWebDiscovery(): Promise<BLEDevice[]> {
        const device = await navigator.bluetooth!.requestDevice({
            filters: [
                { name: BLE_CONFIG.TARGET_DEVICE_NAME },
                { namePrefix: 'ESP32' },
            ],
            optionalServices: [BLE_CONFIG.SERVICE_UUID],
            acceptAllDevices: false,
        });

        const bleDevice: BLEDevice = {
            id: device.id,
            name: device.name || 'Unknown Device',
        };

        this.updateState({
            isScanning: false,
            device: bleDevice,
            error: undefined
        });

        // Auto-connect to selected device
        await this.connectToDevice(bleDevice);
        return [bleDevice];
    }

    // Connect to device (using WiFi)
    async connectToDevice(bleDevice: BLEDevice): Promise<boolean> {
        this.updateState({
            isConnecting: true,
            error: undefined
        });

        try {
            console.log('🔗 Connecting to device:', bleDevice.name);

            if (this.isCapacitor) {
                return await this.connectCapacitorDevice(bleDevice);
            } else {
                return await this.connectWebDevice(bleDevice);
            }
        } catch (error) {
            console.error('❌ Connection error:', error);
            this.updateState({
                isConnecting: false,
                error: 'Connection failed'
            });
            return false;
        }
    }

    // Capacitor device connection
    private async connectCapacitorDevice(bleDevice: BLEDevice): Promise<boolean> {
        if (!bleDevice.deviceId) {
            throw new Error('Device ID not available');
        }

        try {
            // Connect to device
            await BleClient.connect(bleDevice.deviceId);
            console.log('✅ Connected to device');

            // Discover services
            const services: BleService[] = await BleClient.getServices(bleDevice.deviceId);
            const targetService = services.find((s: BleService) => s.uuid === BLE_CONFIG.SERVICE_UUID);

            if (!targetService) {
                throw new Error('Required service not found');
            }

            // Enable notifications directly using known UUIDs
            await BleClient.startNotifications(
                bleDevice.deviceId,
                BLE_CONFIG.SERVICE_UUID,
                BLE_CONFIG.CHARACTERISTIC_UUID,
                (value: DataView) => {
                    this.handleDataReceived(value);
                }
            );

            this.device = bleDevice;
            this.updateState({
                isConnected: true,
                isConnecting: false,
                device: bleDevice,
                error: undefined
            });

            console.log('✅ Notifications enabled');
            return true;

        } catch (error) {
            console.error('❌ Capacitor connection error:', error);
            throw error;
        }
    }

    // Web Bluetooth device connection (fallback)
    private async connectWebDevice(bleDevice: BLEDevice): Promise<boolean> {
        // Web Bluetooth implementation (existing code)
        const device = await navigator.bluetooth!.requestDevice({
            filters: [{ name: bleDevice.name }],
            optionalServices: [BLE_CONFIG.SERVICE_UUID],
        });

        const server = await device.gatt?.connect();
        if (!server) {
            throw new Error('Failed to connect to GATT server');
        }

        const service = await server.getPrimaryService(BLE_CONFIG.SERVICE_UUID);
        if (!service) {
            throw new Error('Required service not found');
        }

        const characteristic = await service.getCharacteristic(BLE_CONFIG.CHARACTERISTIC_UUID);
        if (!characteristic) {
            throw new Error('Required characteristic not found');
        }

        // Enable notifications
        await characteristic.startNotifications();
        characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
            this.handleDataReceived(event.target.value);
        });

        this.device = bleDevice;
        this.updateState({
            isConnected: true,
            isConnecting: false,
            device: bleDevice,
            error: undefined
        });

        return true;
    }

    // Handle received data
    private async handleDataReceived(value: DataView): Promise<void> {
        try {
            // Convert DataView to string
            const decoder = new TextDecoder('utf-8');
            const rawData = decoder.decode(value);

            console.log('📊 Received data:', rawData);

            // Parse data using smart parser
            const parsedData = this.smartDataParser(rawData);

            // Get location if available
            let location = undefined;
            try {
                const position = await Geolocation.getCurrentPosition({
                    enableHighAccuracy: true,
                    timeout: 5000,
                });
                location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                };
            } catch (error) {
                console.log('⚠️ Location not available:', error);
            }

            // Create BLE data object
            const bleData: BLEData = {
                value: parsedData.value,
                timestamp: Date.now(),
                status: parsedData.status,
                battery: parsedData.battery,
                rawData: rawData,
                location: location,
            };

            // Update data buffer
            this.updateDataBuffer(bleData);

            // Update state
            this.updateState({
                lastData: bleData,
            });

        } catch (error) {
            console.error('❌ Data processing error:', error);
            this.handleDataParsingError(error, value);
        }
    }

    // Smart data parser (handles both simple string and JSON formats)
    private smartDataParser(rawData: string): { value: number; status: string; battery?: number } {
        try {
            // Try to parse as JSON first
            const jsonData = JSON.parse(rawData);

            if (typeof jsonData === 'object' && jsonData !== null) {
                return {
                    value: parseFloat(jsonData.dba) || 0,
                    status: jsonData.status || 'ok',
                    battery: jsonData.battery,
                };
            }
        } catch {
            // Not JSON, try as simple string
        }

        // Parse as simple numeric string
        const numericValue = parseFloat(rawData.trim());
        if (!isNaN(numericValue)) {
            return {
                value: numericValue,
                status: 'ok',
            };
        }

        // Fallback
        return {
            value: 0,
            status: 'error',
        };
    }

    // Update data buffer with new data
    private updateDataBuffer(newData: BLEData): void {
        this.connectionState.dataHistory.push(newData);

        // Keep only the last MAX_DATA_BUFFER_SIZE items
        if (this.connectionState.dataHistory.length > BLE_CONFIG.MAX_DATA_BUFFER_SIZE) {
            this.connectionState.dataHistory.shift();
        }
    }

    // Handle data parsing errors
    private handleDataParsingError(error: any, rawData: DataView): void {
        console.error('❌ Data parsing error:', error);
        console.error('Raw data:', rawData);

        // Use last valid value or default
        const lastValidData = this.connectionState.lastData;
        if (lastValidData) {
            this.updateState({
                lastData: {
                    ...lastValidData,
                    status: 'error',
                    timestamp: Date.now(),
                }
            });
        }
    }

    // Handle device disconnection
    private handleDeviceDisconnected(): void {
        console.log('📴 Device disconnected');

        this.updateState({
            isConnected: false,
            device: undefined,
            error: 'Device disconnected'
        });

        // Attempt reconnection
        if (this.device && this.reconnectAttempts < BLE_CONFIG.RECONNECT_ATTEMPTS) {
            this.attemptReconnect();
        }
    }

    // Attempt to reconnect to device
    private async attemptReconnect(): Promise<void> {
        if (!this.device) return;

        this.reconnectAttempts++;
        console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${BLE_CONFIG.RECONNECT_ATTEMPTS}`);

        this.reconnectTimer = setTimeout(async () => {
            try {
                await this.connectToDevice(this.device!);
                this.reconnectAttempts = 0; // Reset on successful connection
            } catch (error) {
                console.error('❌ Reconnection failed:', error);
                if (this.reconnectAttempts < BLE_CONFIG.RECONNECT_ATTEMPTS) {
                    this.attemptReconnect();
                }
            }
        }, BLE_CONFIG.RECONNECT_DELAY);
    }

    // Disconnect from device (using WiFi)
    async disconnect(): Promise<void> {
        await wifiService.disconnect();
    }

    // Send data to device (using WiFi)
    async sendData(data: string): Promise<boolean> {
        return await wifiService.sendData(data);
    }

    // Check if connected
    private isConnected(): boolean {
        return this.connectionState.isConnected;
    }

    // Get current connection state
    getConnectionState(): BLEConnectionState {
        return { ...this.connectionState };
    }

    // Subscribe to state changes
    subscribe(callback: (state: BLEConnectionState) => void): () => void {
        this.listeners.add(callback);

        // Return unsubscribe function
        return () => {
            this.listeners.delete(callback);
        };
    }

    // Update state and notify listeners
    private updateState(updates: Partial<BLEConnectionState>): void {
        this.connectionState = {
            ...this.connectionState,
            ...updates,
        };

        // Notify all listeners
        this.listeners.forEach(listener => {
            try {
                listener({ ...this.connectionState });
            } catch (error) {
                console.error('❌ Listener error:', error);
            }
        });
    }

    // Get data statistics (using WiFi service)
    getDataStatistics() {
        return wifiService.getDataStatistics();
    }

    // Get sound level color (using WiFi service)
    getSoundLevelColor(value: number): string {
        return wifiService.getSoundLevelColor(value);
    }

    // Get sound level progress (using WiFi service)
    getSoundLevelProgress(value: number): number {
        return wifiService.getSoundLevelProgress(value);
    }

    // Handle discovery errors
    private handleDiscoveryError(error: any): void {
        let errorMessage = 'Device discovery failed';

        if (error.name === 'NotFoundError') {
            errorMessage = 'No compatible devices found';
        } else if (error.name === 'NotAllowedError') {
            errorMessage = 'Bluetooth permission denied';
        } else if (error.name === 'UserCancelledError') {
            errorMessage = 'Device selection cancelled';
        } else if (error.message) {
            errorMessage = error.message;
        }

        this.updateState({
            isScanning: false,
            error: errorMessage
        });
    }

    // Cleanup resources
    destroy(): void {
        wifiService.destroy();
        this.listeners.clear();

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
}

// Export singleton instance
export const bleService = new BLEService(); 