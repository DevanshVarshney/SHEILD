'use client';

import { Bluetooth, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function ConnectDevicePage() {
    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Connect Bluetooth Device</CardTitle>
                    <CardDescription>
                        Pair your BLE (Bluetooth Low Energy) band to enable seamless emergency alerts.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-6">
                    <Bluetooth className="h-24 w-24 text-primary" />
                    <p className="text-center text-muted-foreground">
                        This feature allows your wearable device to automatically trigger an SOS alert through the SHEILD app, even if your phone is out of reach.
                    </p>
                    <Alert>
                        <AlertTitle>Coming Soon!</AlertTitle>
                        <AlertDescription>
                            We are working hard to bring this feature to you. Full Bluetooth device integration is currently under development.
                        </AlertDescription>
                    </Alert>
                    <Button disabled size="lg">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Searching for Devices...
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}