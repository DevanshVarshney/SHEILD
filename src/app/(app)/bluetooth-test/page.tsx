import BluetoothTest from '@/components/bluetooth-test';

export default function BluetoothTestPage() {
    return (
        <div className="container mx-auto py-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold">Bluetooth Test</h1>
                <p className="text-muted-foreground">
                    Test and debug Bluetooth Low Energy functionality
                </p>
            </div>
            <BluetoothTest />
        </div>
    );
} 