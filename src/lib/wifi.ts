import { EventEmitter } from 'events';

export interface WiFiDevice {
    id: string;
    name: string;
    address: string;
    rssi?: number;
}

export interface WiFiData {
    value: number;
    timestamp: number;
    status: string;
    battery?: number;
    rawData?: string;
}

export interface WiFiConnectionState {
    isConnected: boolean;
    isScanning: boolean;
    isConnecting: boolean;
    device?: WiFiDevice;
    error?: string;
    lastData?: WiFiData;
    dataHistory: WiFiData[];
}

// Configuration for WiFi service
export const WIFI_CONFIG = {
    ESP_WEBSOCKET_PORT: 81, // Default WebSocket port for ESP
    ESP_DISCOVERY_PORT: 80, // HTTP port for device discovery
    SCAN_TIMEOUT: 3000, // 3 seconds
    MAX_DATA_BUFFER_SIZE: 20,
    MAX_DBA_VALUE: 120,
    RECONNECT_ATTEMPTS: 3,
    RECONNECT_DELAY: 2000, // 2 seconds
    DATA_UPDATE_INTERVAL: 100, // 100ms for real-time updates
} as const;

class WiFiService {
    private device: WiFiDevice | null = null;
    private socket: WebSocket | null = null;
    private eventEmitter = new EventEmitter();
    private connectionState: WiFiConnectionState = {
        isConnected: false,
        isScanning: false,
        isConnecting: false,
        dataHistory: []
    };
    private reconnectAttempts = 0;
    private reconnectTimer: NodeJS.Timeout | null = null;

    // Start device discovery
    async startDeviceDiscovery(): Promise<WiFiDevice[]> {
        this.updateState({ isScanning: true, error: undefined });

        try {
            // Use mDNS or network discovery to find ESP devices
            // For now, we'll simulate finding a device on the local network
            const devices: WiFiDevice[] = [{
                id: 'esp32-wifi',
                name: 'ESP32-WIFI',
                address: '192.168.1.100', // This would be dynamic in production
                rssi: -50 // Simulated signal strength
            }];

            // Simulate network scan delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            this.updateState({ isScanning: false });
            return devices;
        } catch (error: any) {
            this.updateState({
                isScanning: false,
                error: error.message
            });
            return [];
        }
    }

    // Connect to device
    async connectToDevice(device: WiFiDevice): Promise<boolean> {
        this.updateState({
            isConnecting: true,
            error: undefined
        });

        try {
            // Create WebSocket connection to ESP device
            const wsUrl = `ws://${device.address}:${WIFI_CONFIG.ESP_WEBSOCKET_PORT}`;
            this.socket = new WebSocket(wsUrl);

            return new Promise((resolve) => {
                if (!this.socket) {
                    throw new Error('WebSocket not initialized');
                }

                this.socket.onopen = () => {
                    this.device = device;
                    this.updateState({
                        isConnected: true,
                        isConnecting: false,
                        device,
                        error: undefined
                    });
                    this.setupSocketListeners();
                    resolve(true);
                };

                this.socket.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    this.updateState({
                        isConnecting: false,
                        error: 'Connection failed'
                    });
                    resolve(false);
                };
            });
        } catch (error: any) {
            this.updateState({
                isConnecting: false,
                error: error.message
            });
            return false;
        }
    }

    // Set up WebSocket listeners
    private setupSocketListeners() {
        if (!this.socket) return;

        this.socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleDataReceived(data);
            } catch (error) {
                console.error('Data parsing error:', error);
            }
        };

        this.socket.onclose = () => {
            this.handleDisconnection();
        };
    }

    // Handle received data
    private handleDataReceived(data: any) {
        const wifiData: WiFiData = {
            value: parseFloat(data.value) || 0,
            timestamp: Date.now(),
            status: data.status || 'ok',
            battery: data.battery,
            rawData: JSON.stringify(data)
        };

        this.updateDataBuffer(wifiData);
        this.updateState({ lastData: wifiData });
    }

    // Update data buffer
    private updateDataBuffer(newData: WiFiData) {
        this.connectionState.dataHistory.push(newData);
        if (this.connectionState.dataHistory.length > WIFI_CONFIG.MAX_DATA_BUFFER_SIZE) {
            this.connectionState.dataHistory.shift();
        }
    }

    // Handle device disconnection
    private handleDisconnection() {
        this.updateState({
            isConnected: false,
            device: undefined,
            error: 'Device disconnected'
        });

        if (this.device && this.reconnectAttempts < WIFI_CONFIG.RECONNECT_ATTEMPTS) {
            this.attemptReconnect();
        }
    }

    // Attempt to reconnect
    private attemptReconnect() {
        if (!this.device) return;

        this.reconnectAttempts++;
        console.log(`Attempting reconnection ${this.reconnectAttempts}/${WIFI_CONFIG.RECONNECT_ATTEMPTS}`);

        this.reconnectTimer = setTimeout(async () => {
            try {
                await this.connectToDevice(this.device!);
                this.reconnectAttempts = 0;
            } catch (error) {
                if (this.reconnectAttempts < WIFI_CONFIG.RECONNECT_ATTEMPTS) {
                    this.attemptReconnect();
                }
            }
        }, WIFI_CONFIG.RECONNECT_DELAY);
    }

    // Disconnect from device
    async disconnect(): Promise<void> {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        this.device = null;
        this.reconnectAttempts = 0;

        this.updateState({
            isConnected: false,
            isConnecting: false,
            device: undefined,
            error: undefined
        });
    }

    // Send data to device
    async sendData(data: string): Promise<boolean> {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return false;
        }

        try {
            this.socket.send(data);
            return true;
        } catch (error) {
            console.error('Send data error:', error);
            return false;
        }
    }

    // Subscribe to state changes
    subscribe(callback: (state: WiFiConnectionState) => void): () => void {
        const handler = (state: WiFiConnectionState) => callback(state);
        this.eventEmitter.on('stateChange', handler);
        return () => this.eventEmitter.off('stateChange', handler);
    }

    // Update state and notify listeners
    private updateState(updates: Partial<WiFiConnectionState>) {
        this.connectionState = {
            ...this.connectionState,
            ...updates
        };
        this.eventEmitter.emit('stateChange', { ...this.connectionState });
    }

    // Get current connection state
    getConnectionState(): WiFiConnectionState {
        return { ...this.connectionState };
    }

    // Get data statistics
    getDataStatistics() {
        const data = this.connectionState.dataHistory;

        if (data.length === 0) {
            return { average: 0, min: 0, max: 0, count: 0 };
        }

        const values = data.map(d => d.value);
        const sum = values.reduce((a, b) => a + b, 0);
        const average = sum / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);

        return {
            average: Math.round(average * 10) / 10,
            min: Math.round(min * 10) / 10,
            max: Math.round(max * 10) / 10,
            count: data.length,
        };
    }

    // Get sound level color based on value
    getSoundLevelColor(value: number): string {
        if (value < 60) return '#10B981'; // Green
        if (value < 85) return '#F59E0B'; // Yellow
        return '#EF4444'; // Red
    }

    // Get sound level progress percentage
    getSoundLevelProgress(value: number): number {
        return Math.min((value / WIFI_CONFIG.MAX_DBA_VALUE) * 100, 100);
    }

    // Cleanup resources
    destroy() {
        this.disconnect();
        this.eventEmitter.removeAllListeners();
    }
}

// Export singleton instance
export const wifiService = new WiFiService(); 