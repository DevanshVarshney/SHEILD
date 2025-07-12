'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Bluetooth } from 'lucide-react';

interface SimpleBluetoothButtonProps {
    className?: string;
    children?: React.ReactNode;
    onConnect?: (device: any) => void;
    onError?: (error: any) => void;
}

const SimpleBluetoothButton: React.FC<SimpleBluetoothButtonProps> = ({
    className = '',
    children = 'Connect to Bluetooth',
    onConnect,
    onError
}) => {
    const handleConnect = async () => {
        try {
            // Check if Web Bluetooth API is supported
            if (!navigator.bluetooth) {
                throw new Error('Web Bluetooth API not supported in this browser');
            }

            // Request device with flexible options
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: ['battery_service'], // You can change this as needed
            });

            console.log('Connected to device:', device.name);

            // Call the onConnect callback if provided
            if (onConnect) {
                onConnect(device);
            }

        } catch (error) {
            console.error('Bluetooth connection failed:', error);

            // Call the onError callback if provided
            if (onError) {
                onError(error);
            }
        }
    };

    return (
        <Button
            onClick={handleConnect}
            className={className}
        >
            <Bluetooth className="mr-2 h-4 w-4" />
            {children}
        </Button>
    );
};

export default SimpleBluetoothButton; 