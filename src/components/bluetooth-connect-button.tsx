'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bluetooth, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useBLE } from '@/hooks/use-ble';
import { useToast } from '@/hooks/use-toast';

interface BluetoothConnectButtonProps {
    className?: string;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    children?: React.ReactNode;
}

const BluetoothConnectButton: React.FC<BluetoothConnectButtonProps> = ({
    className = '',
    variant = 'default',
    size = 'default',
    children
}) => {
    const {
        connectionState,
        isBluetoothAvailable,
        startDeviceDiscovery,
        disconnect,
    } = useBLE();

    const { toast } = useToast();
    const [isConnecting, setIsConnecting] = useState(false);

    const handleConnect = async () => {
        if (!isBluetoothAvailable) {
            toast({
                title: "Bluetooth Not Available",
                description: "Please enable Bluetooth on your device.",
                variant: "destructive",
            });
            return;
        }

        setIsConnecting(true);

        try {
            const devices = await startDeviceDiscovery();

            if (devices.length > 0) {
                toast({
                    title: "Connected Successfully!",
                    description: `Connected to ${devices[0].name}`,
                });
            } else {
                toast({
                    title: "No Devices Found",
                    description: "No compatible devices found. Make sure your device is powered on and nearby.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            toast({
                title: "Connection Failed",
                description: "Failed to connect to device. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsConnecting(false);
        }
    };

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

    // Show different states based on connection status
    if (connectionState.isConnected) {
        return (
            <Button
                onClick={handleDisconnect}
                variant="destructive"
                size={size}
                className={className}
            >
                <XCircle className="mr-2 h-4 w-4" />
                {children || "Disconnect Bluetooth"}
            </Button>
        );
    }

    if (connectionState.isConnecting || isConnecting) {
        return (
            <Button
                disabled
                variant={variant}
                size={size}
                className={className}
            >
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {children || "Connecting..."}
            </Button>
        );
    }

    if (connectionState.isScanning) {
        return (
            <Button
                disabled
                variant={variant}
                size={size}
                className={className}
            >
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {children || "Scanning..."}
            </Button>
        );
    }

    return (
        <Button
            onClick={handleConnect}
            disabled={!isBluetoothAvailable}
            variant={variant}
            size={size}
            className={className}
        >
            <Bluetooth className="mr-2 h-4 w-4" />
            {children || "Connect Bluetooth"}
        </Button>
    );
};

export default BluetoothConnectButton; 