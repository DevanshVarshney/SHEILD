'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, AlertTriangle } from 'lucide-react';
import BluetoothConnectButton from '@/components/bluetooth-connect-button';
import { useBLE } from '@/hooks/use-ble';

export default function BluetoothExamplePage() {
    const {
        connectionState,
        isBluetoothAvailable,
        currentValue,
        dataHistory,
        statistics,
    } = useBLE();

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold">Web Bluetooth Example</h1>
                <p className="text-muted-foreground">
                    This page demonstrates how to use Web Bluetooth API in your website
                </p>
            </div>

            {/* Bluetooth Status */}
            <Card>
                <CardHeader>
                    <CardTitle>Bluetooth Status</CardTitle>
                    <CardDescription>
                        Current Bluetooth connection status and device information
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <span>Bluetooth Available:</span>
                        <Badge variant={isBluetoothAvailable ? "default" : "destructive"}>
                            {isBluetoothAvailable ? "Yes" : "No"}
                        </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                        <span>Connection Status:</span>
                        <Badge variant={connectionState.isConnected ? "default" : "secondary"}>
                            {connectionState.isConnected ? "Connected" : "Disconnected"}
                        </Badge>
                    </div>

                    {connectionState.device && (
                        <div className="flex items-center justify-between">
                            <span>Connected Device:</span>
                            <span className="font-medium">{connectionState.device.name}</span>
                        </div>
                    )}

                    {connectionState.error && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>{connectionState.error}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Connection Button */}
            <Card>
                <CardHeader>
                    <CardTitle>Connect to Device</CardTitle>
                    <CardDescription>
                        Click the button below to connect to a Bluetooth device
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <BluetoothConnectButton className="flex-1">
                            Connect to ESP32 Device
                        </BluetoothConnectButton>

                        <BluetoothConnectButton
                            variant="outline"
                            className="flex-1"
                        >
                            Connect to Any Device
                        </BluetoothConnectButton>
                    </div>
                </CardContent>
            </Card>

            {/* Real-time Data */}
            {connectionState.isConnected && (
                <Card>
                    <CardHeader>
                        <CardTitle>Real-time Data</CardTitle>
                        <CardDescription>
                            Live data from your connected device
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold">{currentValue}</div>
                                <div className="text-sm text-muted-foreground">Current Value</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold">{statistics.average}</div>
                                <div className="text-sm text-muted-foreground">Average</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold">{statistics.min}</div>
                                <div className="text-sm text-muted-foreground">Minimum</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold">{statistics.max}</div>
                                <div className="text-sm text-muted-foreground">Maximum</div>
                            </div>
                        </div>

                        <div className="text-center">
                            <div className="text-sm text-muted-foreground">
                                Total Readings: {dataHistory.length}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Instructions */}
            <Card>
                <CardHeader>
                    <CardTitle>How to Use</CardTitle>
                    <CardDescription>
                        Step-by-step instructions for using Web Bluetooth
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                <strong>Browser Support:</strong> Web Bluetooth API is supported in Chrome, Edge, Opera, and Samsung Internet browsers.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-2">
                            <h4 className="font-medium">Steps to Connect:</h4>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                                <li>Make sure Bluetooth is enabled on your device</li>
                                <li>Click the "Connect to ESP32 Device" button</li>
                                <li>Select your device from the browser's device picker</li>
                                <li>Grant permission when prompted</li>
                                <li>Wait for the connection to establish</li>
                            </ol>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-medium">Supported Devices:</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                                <li>ESP32 devices with name "ESP32-THAT-PROJECT"</li>
                                <li>Any ESP32 device (name starting with "ESP32")</li>
                                <li>Devices with the specified service UUID</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Code Example */}
            <Card>
                <CardHeader>
                    <CardTitle>Code Example</CardTitle>
                    <CardDescription>
                        How to implement Web Bluetooth in your own component
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                        {`import { useBLE } from '@/hooks/use-ble';
import BluetoothConnectButton from '@/components/bluetooth-connect-button';

function MyComponent() {
  const { connectionState, isBluetoothAvailable } = useBLE();

  return (
    <div>
      <BluetoothConnectButton>
        Connect to Device
      </BluetoothConnectButton>
      
      {connectionState.isConnected && (
        <p>Connected to: {connectionState.device?.name}</p>
      )}
    </div>
  );
}`}
                    </pre>
                </CardContent>
            </Card>
        </div>
    );
} 