// BLE Service for SHEILD - Smart Holistic Emergency & Intelligent Location Device
// Implements complete BLE functionality for ESP32 device communication

export interface BLEDevice {
    id: string;
    name: string;
    rssi?: number;
    address?: string;
}

export interface BLEData {
    value: number;
    timestamp: number;
    status: string;
    battery?: number;
    rawData?: string;
}

export interface BLEConnectionState {
    isConnected: boolean;
    isScanning: boolean;
    isConnecting: boolean;
    device?: BLEDevice;
    error?: string;
    lastData?: BLEData;
    dataHistory: BLEData[];
}

// BLE Configuration Constants
const BLE_CONFIG = {
    SERVICE_UUID: "4fafc201-1fb5-459e-8fcc-c5c9c331914b",
    CHARACTERISTIC_UUID: "beb5483e-36e1-4688-b7f5-ea07361b26a8",
    TARGET_DEVICE_NAME: "ESP32-THAT-PROJECT",
    SCAN_TIMEOUT: 3000, // 3 seconds
    MAX_DATA_BUFFER_SIZE: 20,
    MAX_DBA_VALUE: 120,
    RECONNECT_ATTEMPTS: 3,
    RECONNECT_DELAY: 2000, // 2 seconds
} as const;

class BLEService {
    private bluetooth: Bluetooth | null = null;
    private device: BluetoothDevice | null = null;
    private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
    private connectionState: BLEConnectionState = {
        isConnected: false,
        isScanning: false,
        isConnecting: false,
        dataHistory: [],
    };
    private listeners: Set<(state: BLEConnectionState) => void> = new Set();
    private reconnectAttempts = 0;
    private reconnectTimer: NodeJS.Timeout | null = null;

    constructor() {
        this.checkBluetoothSupport();
    }

    // Check if Bluetooth is supported
    private checkBluetoothSupport(): boolean {
        if (!navigator.bluetooth) {
            console.error('❌ Bluetooth API not supported');
            this.updateState({ error: 'Bluetooth not supported by this browser' });
            return false;
        }
        return true;
    }

    // Request Bluetooth permissions and check availability
    async requestBluetoothPermission(): Promise<boolean> {
        try {
            if (!this.checkBluetoothSupport()) return false;

            // Request Bluetooth permission
            const available = await navigator.bluetooth.getAvailability();
            if (!available) {
                this.updateState({ error: 'Bluetooth is not available on this device' });
                return false;
            }

            return true;
        } catch (error) {
            console.error('❌ Bluetooth permission error:', error);
            this.updateState({ error: 'Failed to get Bluetooth permission' });
            return false;
        }
    }

    // Start device discovery
    async startDeviceDiscovery(): Promise<BLEDevice[]> {
        if (!await this.requestBluetoothPermission()) {
            return [];
        }

        this.updateState({ isScanning: true, error: undefined });

        try {
            console.log('🔍 Starting BLE device discovery...');

            const device = await navigator.bluetooth.requestDevice({
                filters: [
                    {
                        name: BLE_CONFIG.TARGET_DEVICE_NAME,
                    },
                    {
                        namePrefix: 'ESP32',
                    },
                ],
                optionalServices: [BLE_CONFIG.SERVICE_UUID],
                acceptAllDevices: false,
            });

            console.log('✅ Device selected:', device.name);

            const bleDevice: BLEDevice = {
                id: device.id,
                name: device.name || 'Unknown Device',
            };

            this.updateState({
                isScanning: false,
                device: bleDevice,
                error: undefined
            });

            // Automatically connect to the selected device
            await this.connectToDevice(bleDevice);

            return [bleDevice];
        } catch (error: any) {
            console.error('❌ Device discovery error:', error);

            let errorMessage = 'Device discovery failed';
            if (error.name === 'NotFoundError') {
                errorMessage = 'No compatible devices found';
            } else if (error.name === 'NotAllowedError') {
                errorMessage = 'Bluetooth permission denied';
            } else if (error.name === 'UserCancelledError') {
                errorMessage = 'Device selection cancelled';
            }

            this.updateState({
                isScanning: false,
                error: errorMessage
            });

            return [];
        }
    }

    // Connect to a specific device
    async connectToDevice(bleDevice: BLEDevice): Promise<boolean> {
        if (!this.checkBluetoothSupport()) return false;

        this.updateState({
            isConnecting: true,
            error: undefined
        });

        try {
            console.log('🔗 Connecting to device:', bleDevice.name);

            // Request device with specific service
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ name: bleDevice.name }],
                optionalServices: [BLE_CONFIG.SERVICE_UUID],
            });

            this.device = device;

            // Connect to GATT server
            const server = await device.gatt?.connect();
            if (!server) {
                throw new Error('Failed to connect to GATT server');
            }

            console.log('✅ Connected to GATT server');

            // Discover services
            const service = await server.getPrimaryService(BLE_CONFIG.SERVICE_UUID);
            if (!service) {
                throw new Error('Required service not found');
            }

            console.log('✅ Service discovered');

            // Get characteristic
            this.characteristic = await service.getCharacteristic(BLE_CONFIG.CHARACTERISTIC_UUID);
            if (!this.characteristic) {
                throw new Error('Required characteristic not found');
            }

            console.log('✅ Characteristic found');

            // Enable notifications
            await this.characteristic.startNotifications();
            this.characteristic.addEventListener('characteristicvaluechanged', this.handleDataReceived.bind(this));

            console.log('✅ Notifications enabled');

            // Set up device disconnect listener
            device.addEventListener('gattserverdisconnected', this.handleDeviceDisconnected.bind(this));

            this.updateState({
                isConnected: true,
                isConnecting: false,
                device: bleDevice,
                error: undefined,
            });

            this.reconnectAttempts = 0;
            return true;

        } catch (error: any) {
            console.error('❌ Connection error:', error);

            let errorMessage = 'Failed to connect to device';
            if (error.name === 'NetworkError') {
                errorMessage = 'Device is out of range or not available';
            } else if (error.name === 'InvalidStateError') {
                errorMessage = 'Device is already connected';
            }

            this.updateState({
                isConnected: false,
                isConnecting: false,
                error: errorMessage,
            });

            return false;
        }
    }

    // Handle incoming data from BLE device
    private handleDataReceived(event: Event): void {
        const target = event.target as BluetoothRemoteGATTCharacteristic;
        const value = target.value;

        if (!value) {
            console.warn('⚠️ Received empty data');
            return;
        }

        try {
            // Convert DataView to string
            const decoder = new TextDecoder('utf-8');
            const rawData = decoder.decode(value);

            console.log('📊 Received BLE data:', rawData);

            // Parse the data using smart parser
            const parsedData = this.smartDataParser(rawData);

            const bleData: BLEData = {
                value: parsedData.value,
                timestamp: Date.now(),
                status: parsedData.status,
                battery: parsedData.battery,
                rawData: rawData,
            };

            // Update data history
            this.updateDataBuffer(bleData);

            // Update state with new data
            this.updateState({
                lastData: bleData,
            });

        } catch (error) {
            console.error('❌ Data parsing error:', error);
            this.handleDataParsingError(error, value);
        }
    }

    // Smart data parser that handles both simple string and JSON formats
    private smartDataParser(rawData: string): { value: number; status: string; battery?: number } {
        try {
            // Try to parse as JSON first
            const jsonData = JSON.parse(rawData);

            if (typeof jsonData === 'object' && jsonData !== null) {
                return {
                    value: typeof jsonData.dba === 'number' ? jsonData.dba : 0,
                    status: jsonData.status || 'ok',
                    battery: typeof jsonData.battery === 'number' ? jsonData.battery : undefined,
                };
            }
        } catch {
            // Not JSON, try as simple string
        }

        // Parse as simple numeric string
        const numericValue = parseFloat(rawData);
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

    // Update data buffer with new values
    private updateDataBuffer(newData: BLEData): void {
        const currentHistory = [...this.connectionState.dataHistory];
        currentHistory.push(newData);

        // Keep only the last MAX_DATA_BUFFER_SIZE items
        if (currentHistory.length > BLE_CONFIG.MAX_DATA_BUFFER_SIZE) {
            currentHistory.shift();
        }

        this.connectionState.dataHistory = currentHistory;
    }

    // Handle data parsing errors
    private handleDataParsingError(error: any, rawData: DataView): void {
        console.error('❌ Data parsing error:', error, 'Raw data:', rawData);

        // Keep last valid value or use safe default
        const lastValidData = this.connectionState.lastData;
        if (lastValidData) {
            console.log('🔄 Using last valid data:', lastValidData.value);
        } else {
            console.log('🔄 No valid data available, using default');
        }
    }

    // Handle device disconnection
    private handleDeviceDisconnected(): void {
        console.log('🔌 Device disconnected');

        this.updateState({
            isConnected: false,
            isConnecting: false,
            error: 'Device disconnected',
        });

        // Attempt to reconnect if we have a device
        if (this.connectionState.device && this.reconnectAttempts < BLE_CONFIG.RECONNECT_ATTEMPTS) {
            this.attemptReconnect();
        }
    }

    // Attempt to reconnect to device
    private async attemptReconnect(): Promise<void> {
        this.reconnectAttempts++;
        console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${BLE_CONFIG.RECONNECT_ATTEMPTS})`);

        this.updateState({
            error: `Attempting to reconnect... (${this.reconnectAttempts}/${BLE_CONFIG.RECONNECT_ATTEMPTS})`,
        });

        // Clear any existing reconnect timer
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }

        this.reconnectTimer = setTimeout(async () => {
            if (this.connectionState.device) {
                const success = await this.connectToDevice(this.connectionState.device);
                if (!success && this.reconnectAttempts < BLE_CONFIG.RECONNECT_ATTEMPTS) {
                    this.attemptReconnect();
                } else if (!success) {
                    this.updateState({
                        error: 'Failed to reconnect after multiple attempts',
                    });
                }
            }
        }, BLE_CONFIG.RECONNECT_DELAY);
    }

    // Disconnect from current device
    async disconnect(): Promise<void> {
        console.log('🔌 Disconnecting from device');

        // Clear reconnect timer
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        try {
            // Stop notifications
            if (this.characteristic) {
                await this.characteristic.stopNotifications();
                this.characteristic = null;
            }

            // Disconnect from GATT server
            if (this.device?.gatt?.connected) {
                await this.device.gatt.disconnect();
            }

            this.device = null;
            this.reconnectAttempts = 0;

            this.updateState({
                isConnected: false,
                isConnecting: false,
                device: undefined,
                error: undefined,
            });

            console.log('✅ Disconnected successfully');
        } catch (error) {
            console.error('❌ Disconnect error:', error);
        }
    }

    // Send data to device (if write characteristic is available)
    async sendData(data: string): Promise<boolean> {
        if (!this.characteristic || !this.connectionState.isConnected) {
            console.error('❌ Cannot send data: not connected');
            return false;
        }

        try {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(data);

            await this.characteristic.writeValue(dataBuffer);
            console.log('📤 Data sent successfully:', data);
            return true;
        } catch (error) {
            console.error('❌ Failed to send data:', error);
            return false;
        }
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
        this.connectionState = { ...this.connectionState, ...updates };

        // Notify all listeners
        this.listeners.forEach(callback => {
            try {
                callback({ ...this.connectionState });
            } catch (error) {
                console.error('❌ Error in state listener:', error);
            }
        });
    }

    // Get data statistics
    getDataStatistics(): {
        average: number;
        min: number;
        max: number;
        count: number;
    } {
        const history = this.connectionState.dataHistory;

        if (history.length === 0) {
            return { average: 0, min: 0, max: 0, count: 0 };
        }

        const values = history.map(d => d.value);
        const sum = values.reduce((a, b) => a + b, 0);
        const average = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        return {
            average: Math.round(average * 100) / 100,
            min: Math.round(min * 100) / 100,
            max: Math.round(max * 100) / 100,
            count: history.length,
        };
    }

    // Check if Bluetooth is available
    async isBluetoothAvailable(): Promise<boolean> {
        if (!navigator.bluetooth) return false;

        try {
            return await navigator.bluetooth.getAvailability();
        } catch {
            return false;
        }
    }

    // Get color based on sound level
    getSoundLevelColor(value: number): string {
        if (value < 60) return 'text-green-500';
        if (value < 85) return 'text-yellow-500';
        return 'text-red-500';
    }

    // Get progress percentage for sound level
    getSoundLevelProgress(value: number): number {
        return Math.min((value / BLE_CONFIG.MAX_DBA_VALUE) * 100, 100);
    }

    // Cleanup resources
    destroy(): void {
        this.disconnect();
        this.listeners.clear();
    }
}

// Create singleton instance
export const bleService = new BLEService();

// Export types and constants
export { BLE_CONFIG };
export type { BLEService }; 