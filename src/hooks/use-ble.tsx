import { useState, useEffect, useCallback, useRef } from 'react';
import { bleService, type BLEDevice, type BLEData, type BLEConnectionState } from '@/lib/ble';

export interface UseBLEReturn {
    // State
    connectionState: BLEConnectionState;
    isBluetoothAvailable: boolean;

    // Actions
    startDeviceDiscovery: () => Promise<BLEDevice[]>;
    connectToDevice: (device: BLEDevice) => Promise<boolean>;
    disconnect: () => Promise<void>;
    sendData: (data: string) => Promise<boolean>;

    // Data
    currentValue: number;
    dataHistory: BLEData[];
    statistics: {
        average: number;
        min: number;
        max: number;
        count: number;
    };

    // UI helpers
    getSoundLevelColor: (value: number) => string;
    getSoundLevelProgress: (value: number) => number;
    formatValue: (value: number) => string;
}

export function useBLE(): UseBLEReturn {
    const [connectionState, setConnectionState] = useState<BLEConnectionState>({
        isConnected: false,
        isScanning: false,
        isConnecting: false,
        dataHistory: [],
    });

    const [isBluetoothAvailable, setIsBluetoothAvailable] = useState(false);
    const unsubscribeRef = useRef<(() => void) | null>(null);

    // Initialize BLE service and check availability
    useEffect(() => {
        const initializeBLE = async () => {
            try {
                const available = await bleService.isBluetoothAvailable();
                setIsBluetoothAvailable(available);

                // Subscribe to state changes
                const unsubscribe = bleService.subscribe((state) => {
                    setConnectionState(state);
                });

                unsubscribeRef.current = unsubscribe;

                // Get initial state
                setConnectionState(bleService.getConnectionState());

            } catch (error) {
                console.error('❌ BLE initialization error:', error);
                setIsBluetoothAvailable(false);
            }
        };

        initializeBLE();

        // Cleanup on unmount
        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
        };
    }, []);

    // Start device discovery
    const startDeviceDiscovery = useCallback(async (): Promise<BLEDevice[]> => {
        try {
            return await bleService.startDeviceDiscovery();
        } catch (error) {
            console.error('❌ Device discovery error:', error);
            return [];
        }
    }, []);

    // Connect to device
    const connectToDevice = useCallback(async (device: BLEDevice): Promise<boolean> => {
        try {
            return await bleService.connectToDevice(device);
        } catch (error) {
            console.error('❌ Connection error:', error);
            return false;
        }
    }, []);

    // Disconnect from device
    const disconnect = useCallback(async (): Promise<void> => {
        try {
            await bleService.disconnect();
        } catch (error) {
            console.error('❌ Disconnect error:', error);
        }
    }, []);

    // Send data to device
    const sendData = useCallback(async (data: string): Promise<boolean> => {
        try {
            return await bleService.sendData(data);
        } catch (error) {
            console.error('❌ Send data error:', error);
            return false;
        }
    }, []);

    // Get current value
    const currentValue = connectionState.lastData?.value || 0;

    // Get data history
    const dataHistory = connectionState.dataHistory;

    // Get statistics
    const statistics = bleService.getDataStatistics();

    // UI helper functions
    const getSoundLevelColor = useCallback((value: number): string => {
        return bleService.getSoundLevelColor(value);
    }, []);

    const getSoundLevelProgress = useCallback((value: number): number => {
        return bleService.getSoundLevelProgress(value);
    }, []);

    const formatValue = useCallback((value: number): string => {
        return `${value.toFixed(1)} dBA`;
    }, []);

    return {
        // State
        connectionState,
        isBluetoothAvailable,

        // Actions
        startDeviceDiscovery,
        connectToDevice,
        disconnect,
        sendData,

        // Data
        currentValue,
        dataHistory,
        statistics,

        // UI helpers
        getSoundLevelColor,
        getSoundLevelProgress,
        formatValue,
    };
} 