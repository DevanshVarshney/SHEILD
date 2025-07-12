'use client';

import React, { useState, useEffect } from 'react';
import { bleService, type BLEConnectionState, type BLEDevice } from '@/lib/ble';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bluetooth, Wifi, MapPin, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

export default function BluetoothTest() {
    const [connectionState, setConnectionState] = useState<BLEConnectionState>(bleService.getConnectionState());
    const [foundDevices, setFoundDevices] = useState<BLEDevice[]>([]);
    const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);

    useEffect(() => {
        const unsubscribe = bleService.subscribe((state) => {
            setConnectionState(state);
        });

        return () => unsubscribe();
    }, []);

    const handleStartScan = async () => {
        setFoundDevices([]);
        try {
            const devices = await bleService.startDeviceDiscovery();
            setFoundDevices(devices);
        } catch (error) {
            console.error('Scan error:', error);
        }
    };

    const handleRequestPermissions = async () => {
        setIsRequestingPermissions(true);
        try {
            const granted = await bleService.requestAllPermissions();
            if (granted) {
                console.log('✅ All permissions granted');
            } else {
                console.log('❌ Some permissions denied');
            }
        } catch (error) {
            console.error('Permission request error:', error);
        } finally {
            setIsRequestingPermissions(false);
        }
    };

    const handleDisconnect = async () => {
        await bleService.disconnect();
    };

    const getPermissionStatus = (type: 'bluetooth' | 'location') => {
        const status = connectionState.permissions[type];
        switch (status) {
            case 'granted':
                return { icon: <CheckCircle className="h-4 w-4 text-green-500" />, text: 'Granted', color: 'bg-green-100 text-green-800' };
            case 'denied':
                return { icon: <XCircle className="h-4 w-4 text-red-500" />, text: 'Denied', color: 'bg-red-100 text-red-800' };
            case 'prompt':
                return { icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />, text: 'Request Required', color: 'bg-yellow-100 text-yellow-800' };
            default:
                return { icon: <AlertTriangle className="h-4 w-4 text-gray-500" />, text: 'Unknown', color: 'bg-gray-100 text-gray-800' };
        }
    };

    const getBluetoothStateStatus = () => {
        switch (connectionState.bluetoothState) {
            case 'enabled':
                return { icon: <CheckCircle className="h-4 w-4 text-green-500" />, text: 'Enabled', color: 'bg-green-100 text-green-800' };
            case 'disabled':
                return { icon: <XCircle className="h-4 w-4 text-red-500" />, text: 'Disabled', color: 'bg-red-100 text-red-800' };
            default:
                return { icon: <AlertTriangle className="h-4 w-4 text-gray-500" />, text: 'Unknown', color: 'bg-gray-100 text-gray-800' };
        }
    };

    return (
        <div className="container mx-auto p-4 space-y-6">
            <div className="text-center">
                <h1 className="text-3xl font-bold mb-2">Bluetooth Test</h1>
                <p className="text-gray-600">Test and debug Bluetooth functionality</p>
            </div>

            {/* Status Overview */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bluetooth className="h-5 w-5" />
                        System Status
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-2">
                            {getBluetoothStateStatus().icon}
                            <span className="text-sm font-medium">Bluetooth State:</span>
                            <Badge className={getBluetoothStateStatus().color}>
                                {getBluetoothStateStatus().text}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                            {getPermissionStatus('bluetooth').icon}
                            <span className="text-sm font-medium">Bluetooth Permission:</span>
                            <Badge className={getPermissionStatus('bluetooth').color}>
                                {getPermissionStatus('bluetooth').text}
                            </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                            {getPermissionStatus('location').icon}
                            <span className="text-sm font-medium">Location Permission:</span>
                            <Badge className={getPermissionStatus('location').color}>
                                {getPermissionStatus('location').text}
                            </Badge>
                        </div>
                    </div>

                    {connectionState.error && (
                        <Alert className="border-red-200 bg-red-50">
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                            <AlertDescription className="text-red-700">
                                {connectionState.error}
                            </AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Permission Management */}
            <Card>
                <CardHeader>
                    <CardTitle>Permission Management</CardTitle>
                    <CardDescription>
                        Request required permissions for Bluetooth functionality
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        <Button
                            onClick={handleRequestPermissions}
                            disabled={isRequestingPermissions}
                            className="flex items-center gap-2"
                        >
                            {isRequestingPermissions ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                <Bluetooth className="h-4 w-4" />
                            )}
                            {isRequestingPermissions ? 'Requesting...' : 'Request All Permissions'}
                        </Button>

                        <Button
                            variant="outline"
                            onClick={handleStartScan}
                            disabled={connectionState.isScanning || connectionState.permissions.bluetooth === 'denied'}
                            className="flex items-center gap-2"
                        >
                            <Wifi className="h-4 w-4" />
                            {connectionState.isScanning ? 'Scanning...' : 'Start Scan'}
                        </Button>

                        {connectionState.isConnected && (
                            <Button
                                variant="destructive"
                                onClick={handleDisconnect}
                                className="flex items-center gap-2"
                            >
                                <XCircle className="h-4 w-4" />
                                Disconnect
                            </Button>
                        )}
                    </div>

                    <div className="text-sm text-gray-600">
                        <p><strong>Note:</strong> On Android 12+, Bluetooth scanning requires both Bluetooth and Location permissions.</p>
                        <p>If permissions are denied, you may need to grant them manually in device settings.</p>
                    </div>
                </CardContent>
            </Card>

            {/* Connection Status */}
            <Card>
                <CardHeader>
                    <CardTitle>Connection Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Status:</span>
                        <Badge variant={connectionState.isConnected ? "default" : "secondary"}>
                            {connectionState.isConnected ? 'Connected' : 'Disconnected'}
                        </Badge>
                    </div>

                    {connectionState.device && (
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Connected Device:</span>
                                <Badge variant="outline">{connectionState.device.name}</Badge>
                            </div>
                            {connectionState.device.rssi && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Signal Strength:</span>
                                    <Badge variant="outline">{connectionState.device.rssi} dBm</Badge>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Found Devices */}
            {foundDevices.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Found Devices</CardTitle>
                        <CardDescription>
                            {foundDevices.length} device(s) found
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {foundDevices.map((device, index) => (
                                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Bluetooth className="h-5 w-5 text-blue-500" />
                                        <div>
                                            <p className="font-medium">{device.name}</p>
                                            <p className="text-sm text-gray-500">ID: {device.id}</p>
                                        </div>
                                    </div>
                                    {device.rssi && (
                                        <Badge variant="outline">{device.rssi} dBm</Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Real-time Data */}
            {connectionState.lastData && (
                <Card>
                    <CardHeader>
                        <CardTitle>Real-time Data</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-medium mb-2">Sound Level (dB)</p>
                                <div className="flex items-center gap-2">
                                    <Progress
                                        value={bleService.getSoundLevelProgress(connectionState.lastData.value)}
                                        className="flex-1"
                                    />
                                    <span className="text-lg font-bold" style={{ color: bleService.getSoundLevelColor(connectionState.lastData.value) }}>
                                        {connectionState.lastData.value}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm font-medium mb-2">Status</p>
                                <Badge variant={connectionState.lastData.status === 'ok' ? 'default' : 'destructive'}>
                                    {connectionState.lastData.status}
                                </Badge>
                            </div>
                        </div>

                        {connectionState.lastData.location && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <MapPin className="h-4 w-4" />
                                <span>
                                    Lat: {connectionState.lastData.location.latitude.toFixed(6)},
                                    Lng: {connectionState.lastData.location.longitude.toFixed(6)}
                                </span>
                            </div>
                        )}

                        {connectionState.lastData.rawData && (
                            <div>
                                <p className="text-sm font-medium mb-2">Raw Data</p>
                                <code className="block p-2 bg-gray-100 rounded text-sm">
                                    {connectionState.lastData.rawData}
                                </code>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Data Statistics */}
            {connectionState.dataHistory.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Data Statistics</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {Object.entries(bleService.getDataStatistics()).map(([key, value]) => (
                                <div key={key} className="text-center">
                                    <p className="text-2xl font-bold">{value}</p>
                                    <p className="text-sm text-gray-600 capitalize">{key}</p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
} 