import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { Wifi } from '@codext/capacitor-wifi';

const getAndroidVersion = async (): Promise<number | null> => {
    try {
        const info = await Device.getInfo();
        if (info.platform === 'android' && info.osVersion) {
            const versionNumber = parseInt(info.osVersion, 10);
            return isNaN(versionNumber) ? null : versionNumber;
        }
        return null;
    } catch {
        return null;
    }
};

export const requestAndroidPermissions = async () => {
    if (Capacitor.getPlatform() !== 'android') {
        console.log('Not Android platform, skipping permissions');
        return;
    }

    const version = await getAndroidVersion();

    const permissionsToRequest: string[] = [
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_WIFI_STATE',
        'android.permission.CHANGE_WIFI_STATE',
    ];

    if (version !== null) {
        if (version >= 13) {
            permissionsToRequest.push('android.permission.NEARBY_WIFI_DEVICES');
        }
        if (version >= 12) {
            permissionsToRequest.push(
                'android.permission.BLUETOOTH_CONNECT',
                'android.permission.BLUETOOTH_SCAN',
                'android.permission.BLUETOOTH_ADVERTISE'
            );
        } else {
            permissionsToRequest.push(
                'android.permission.BLUETOOTH',
                'android.permission.BLUETOOTH_ADMIN'
            );
        }
        if (version >= 10) {
            permissionsToRequest.push('android.permission.ACCESS_BACKGROUND_LOCATION');
        }
    }

    try {
        // Initialize Bluetooth client with permission flag
        await BleClient.initialize({ androidNeverForLocation: true });

        // Request WiFi permissions using the @codext/capacitor-wifi plugin
        const wifiPermissions = await Wifi.requestPermissions();
        console.log('WiFi Permissions:', wifiPermissions);

        console.log('Bluetooth and WiFi clients initialized successfully');
    } catch (error) {
        console.error('Error initializing clients:', error);
    }
};
