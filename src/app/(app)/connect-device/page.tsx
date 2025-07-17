'use client';

import { useState, useEffect } from 'react';
import {
    Bluetooth,
    Loader2,
    Search,
    Signal,
    Battery,
    Settings,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Activity,
    Zap,
    WifiOff,
    Wifi
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useBLE } from '@/hooks/use-ble';
import { BLEChart } from '@/components/ble-chart';
import { useToast } from '@/hooks/use-toast';
import { BLE_CONFIG, bleService, type BLEDevice } from '@/lib/ble';

export default function ConnectDevicePage() {
    const {
        connectionState,
        isBluetoothAvailable,
        startDeviceDiscovery,
        connectToDevice,
        disconnect,
        sendData,
        currentValue,
        dataHistory,
        statistics,
        getSoundLevelColor,
        getSoundLevelProgress,
        formatValue,
    } = useBLE();

    const { toast } = useToast();
    const [isManualScanning, setIsManualScanning] = useState(false);
    const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
    const [discoveredDevices, setDiscoveredDevices] = useState<BLEDevice[]>([]);
    const [isEnablingBluetooth, setIsEnablingBluetooth] = useState(false);

    // Update last update time when new data arrives
    useEffect(() => {
        if (connectionState.lastData) {
            setLastUpdateTime(new Date());
        }
    }, [connectionState.lastData]);

    // Handle device discovery
    const handleStartDiscovery = async () => {
        setIsManualScanning(true);
        setDiscoveredDevices([]); // Clear previous results

        try {
            const devices = await startDeviceDiscovery();
            setDiscoveredDevices(devices);

            if (devices.length > 0) {
                toast({
                    title: "Device Found!",
                    description: `Found ${devices.length} compatible device(s)`,
                });
            } else {
                toast({
                    title: "No Devices Found",
                    description: "No compatible ESP32 devices found. Make sure your device is powered on and nearby.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Discovery Failed",
                description: "Failed to search for devices. Please check your Bluetooth settings.",
                variant: "destructive",
            });
        } finally {
            setIsManualScanning(false);
        }
    };

    // Handle device connection
    const handleConnect = async () => {
        if (!connectionState.device) return;

        try {
            const success = await connectToDevice(connectionState.device);

            if (success) {
                toast({
                    title: "Connected Successfully!",
                    description: `Connected to ${connectionState.device.name}`,
                });
            } else {
                toast({
                    title: "Connection Failed",
                    description: "Failed to connect to device. Please try again.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Connection Error",
                description: "An error occurred while connecting to the device.",
                variant: "destructive",
            });
        }
    };

    // Handle device disconnection
    const handleDisconnect = async () => {
        try {
            await disconnect();
            toast({
                title: "Disconnected",
                description: "Device has been disconnected.",
            });
        } catch (error) {
            toast({
                title: "Disconnect Error",
                description: "An error occurred while disconnecting.",
                variant: "destructive",
            });
        }
    };

    // Handle test data sending
    const handleSendTestData = async () => {
        try {
            const success = await sendData("TEST");
            if (success) {
                toast({
                    title: "Test Data Sent",
                    description: "Test data sent successfully to device.",
                });
            } else {
                toast({
                    title: "Send Failed",
                    description: "Failed to send test data to device.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Send Error",
                description: "An error occurred while sending data.",
                variant: "destructive",
            });
        }
    };

    // Get connection status
    const getConnectionStatus = () => {
        if (connectionState.isConnected) {
            return {
                icon: <CheckCircle className="h-4 w-4 text-green-500" />,
                text: "Connected",
                color: "text-green-500",
                bgColor: "bg-green-500/10",
            };
        } else if (connectionState.isConnecting) {
            return {
                icon: <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />,
                text: "Connecting...",
                color: "text-yellow-500",
                bgColor: "bg-yellow-500/10",
            };
        } else if (connectionState.isScanning) {
            return {
                icon: <Search className="h-4 w-4 animate-pulse text-blue-500" />,
                text: "Scanning...",
                color: "text-blue-500",
                bgColor: "bg-blue-500/10",
            };
        } else {
            return {
                icon: <XCircle className="h-4 w-4 text-red-500" />,
                text: "Disconnected",
                color: "text-red-500",
                bgColor: "bg-red-500/10",
            };
        }
    };

    const connectionStatus = getConnectionStatus();

    return (
        <div className="grid gap-6">
            {/* Bluetooth Status Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bluetooth className="h-5 w-5" />
                        Bluetooth Status
                    </CardTitle>
                    <CardDescription>
                        Monitor your Bluetooth connection and device status
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Bluetooth Availability */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                            {isBluetoothAvailable ? (
                                <Bluetooth className="h-5 w-5 text-green-500" />
                            ) : (
                                <Bluetooth className="h-5 w-5 text-red-500" />
                            )}
                            <div>
                                <p className="font-medium">Bluetooth</p>
                                <p className="text-sm text-muted-foreground">
                                    {isBluetoothAvailable ? "Available" : "Not Available"}
                                </p>
                            </div>
                        </div>
                        <Badge variant={isBluetoothAvailable ? "default" : "destructive"}>
                            {isBluetoothAvailable ? "Ready" : "Unavailable"}
                        </Badge>
                    </div>

                    {/* Enable Bluetooth Button */}
                    {!isBluetoothAvailable && (
                        <Button
                            onClick={async () => {
                                setIsEnablingBluetooth(true);
                                try {
                                    // This will trigger the native Bluetooth enable dialog on mobile
                                    const result = await bleService.requestBluetoothPermission();
                                    if (result) {
                                        toast({
                                            title: "Bluetooth Enabled",
                                            description: "Bluetooth has been successfully enabled."
                                        });
                                    } else {
                                        toast({
                                            title: "Bluetooth Not Enabled",
                                            description: "Please enable Bluetooth in your device settings.",
                                            variant: "destructive"
                                        });
                                    }
                                } catch (error) {
                                    toast({
                                        title: "Error",
                                        description: "Failed to enable Bluetooth.",
                                        variant: "destructive"
                                    });
                                } finally {
                                    setIsEnablingBluetooth(false);
                                }
                            }}
                            className="w-full"
                            disabled={isEnablingBluetooth}
                        >
                            {isEnablingBluetooth ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Bluetooth className="mr-2 h-4 w-4" />
                            )}
                            {isEnablingBluetooth ? "Enabling..." : "Enable Bluetooth"}
                        </Button>
                    )}

                    {/* Connection Status */}
                    <div className={`flex items-center justify-between p-3 rounded-lg ${connectionStatus.bgColor}`}>
                        <div className="flex items-center gap-3">
                            {connectionStatus.icon}
                            <div>
                                <p className="font-medium">Connection</p>
                                <p className={`text-sm ${connectionStatus.color}`}>
                                    {connectionStatus.text}
                                </p>
                            </div>
                        </div>
                        {connectionState.device && (
                            <div className="text-right">
                                <p className="text-sm font-medium">{connectionState.device.name}</p>
                                <p className="text-xs text-muted-foreground">ESP32 Device</p>
                            </div>
                        )}
                    </div>

                    {/* Error Display */}
                    {connectionState.error && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Connection Error</AlertTitle>
                            <AlertDescription>{connectionState.error}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Device Control Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Device Control
                    </CardTitle>
                    <CardDescription>
                        Discover, connect, and manage your ESP32 device
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Action Buttons */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {!connectionState.isConnected ? (
                            <>
                                <Button
                                    onClick={handleStartDiscovery}
                                    disabled={!isBluetoothAvailable || isManualScanning}
                                    className="w-full"
                                >
                                    {isManualScanning ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Search className="mr-2 h-4 w-4" />
                                    )}
                                    {isManualScanning ? "Searching..." : "Search Devices"}
                                </Button>

                                {connectionState.device && (
                                    <Button
                                        onClick={handleConnect}
                                        disabled={connectionState.isConnecting}
                                        className="w-full"
                                    >
                                        {connectionState.isConnecting ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Bluetooth className="mr-2 h-4 w-4" />
                                        )}
                                        {connectionState.isConnecting ? "Connecting..." : "Connect"}
                                    </Button>
                                )}
                            </>
                        ) : (
                            <>
                                <Button
                                    onClick={handleDisconnect}
                                    variant="destructive"
                                    className="w-full"
                                >
                                    <span className="material-symbols-outlined mr-2 h-4 w-4">bluetooth_disabled</span>
                                    Disconnect
                                </Button>

                                <Button
                                    onClick={handleSendTestData}
                                    variant="outline"
                                    className="w-full"
                                >
                                    <Zap className="mr-2 h-4 w-4" />
                                    Send Test Data
                                </Button>
                            </>
                        )}
                    </div>

                    {/* Discovered Devices List */}
                    {discoveredDevices.length > 0 && !connectionState.isConnected && (
                        <div className="mt-4">
                            <h4 className="font-medium mb-2">Discovered Devices</h4>
                            <div className="space-y-2">
                                {discoveredDevices.map((device) => (
                                    <div
                                        key={device.id}
                                        className="p-3 rounded-lg border border-muted hover:border-primary cursor-pointer transition-colors"
                                        onClick={() => connectToDevice(device)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Bluetooth className="h-4 w-4 text-primary" />
                                                <div>
                                                    <p className="font-medium">{device.name || "Unknown Device"}</p>
                                                    <p className="text-xs text-muted-foreground font-mono">{device.id}</p>
                                                </div>
                                            </div>
                                            {device.rssi && (
                                                <div className="flex items-center gap-1">
                                                    <Signal className="h-4 w-4" />
                                                    <span className="text-sm">{device.rssi} dBm</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Device Information */}
                    {connectionState.device && (
                        <div className="p-3 rounded-lg bg-muted/50">
                            <h4 className="font-medium mb-2">Device Information</h4>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Name:</span>
                                    <span>{connectionState.device.name}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">ID:</span>
                                    <span className="font-mono text-xs">{connectionState.device.id}</span>
                                </div>
                                {connectionState.device.rssi && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Signal:</span>
                                        <span>{connectionState.device.rssi} dBm</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Real-time Data Display */}
            {connectionState.isConnected && (
                <BLEChart
                    dataHistory={dataHistory}
                    currentValue={currentValue}
                    statistics={statistics}
                    getSoundLevelColor={getSoundLevelColor}
                    getSoundLevelProgress={getSoundLevelProgress}
                    formatValue={formatValue}
                />
            )}

            {/* Data Status Card */}
            {connectionState.isConnected && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="h-5 w-5" />
                            Data Status
                        </CardTitle>
                        <CardDescription>
                            Monitor real-time data transmission and quality
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Last Update */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-3">
                                <Signal className="h-5 w-5 text-blue-500" />
                                <div>
                                    <p className="font-medium">Last Update</p>
                                    <p className="text-sm text-muted-foreground">
                                        {lastUpdateTime ? lastUpdateTime.toLocaleTimeString() : "No data yet"}
                                    </p>
                                </div>
                            </div>
                            <Badge variant={lastUpdateTime ? "default" : "secondary"}>
                                {lastUpdateTime ? "Live" : "Waiting"}
                            </Badge>
                        </div>

                        {/* Data Quality */}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div className="flex items-center gap-3">
                                <Battery className="h-5 w-5 text-green-500" />
                                <div>
                                    <p className="font-medium">Data Quality</p>
                                    <p className="text-sm text-muted-foreground">
                                        {dataHistory.length > 0 ? "Good" : "No data"}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium">{dataHistory.length}</p>
                                <p className="text-xs text-muted-foreground">readings</p>
                            </div>
                        </div>

                        {/* BLE Configuration Info */}
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">BLE Configuration</h4>
                            <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                                <div className="flex justify-between">
                                    <span>Service UUID:</span>
                                    <span className="font-mono text-xs">{BLE_CONFIG.SERVICE_UUID}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Characteristic UUID:</span>
                                    <span className="font-mono text-xs">{BLE_CONFIG.CHARACTERISTIC_UUID}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Target Device:</span>
                                    <span>{BLE_CONFIG.TARGET_DEVICE_NAME}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Instructions Card */}
            {!connectionState.isConnected && (
                <Card>
                    <CardHeader>
                        <CardTitle>Getting Started</CardTitle>
                        <CardDescription>
                            Follow these steps to connect your ESP32 device
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                                    1
                                </div>
                                <div>
                                    <p className="font-medium">Enable Bluetooth</p>
                                    <p className="text-sm text-muted-foreground">
                                        Make sure Bluetooth is enabled on your device
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                                    2
                                </div>
                                <div>
                                    <p className="font-medium">Power On ESP32</p>
                                    <p className="text-sm text-muted-foreground">
                                        Ensure your ESP32 device is powered on and nearby
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                                    3
                                </div>
                                <div>
                                    <p className="font-medium">Search & Connect</p>
                                    <p className="text-sm text-muted-foreground">
                                        Click "Search Devices" to find and connect to your ESP32
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}