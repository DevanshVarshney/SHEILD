# BLE Implementation Documentation

## Overview

This document describes the complete Bluetooth Low Energy (BLE) implementation for the SHEILD application. The implementation provides real-time communication with ESP32 devices for sound level monitoring and emergency alerts.

## Architecture

### System Components

```
SHEILD Web App (BLE Central)          ESP32 Device (BLE Peripheral)
├── BLE Service (lib/ble.ts)          ├── BLE Server
├── useBLE Hook (hooks/use-ble.tsx)   ├── Custom GATT Service
├── BLEChart Component                 ├── Data Characteristic
├── ConnectDevicePage                  ├── Sound Level Measurement
└── Real-time UI Updates              └── Data Transmission
```

### Technology Stack

- **Web Bluetooth API**: Native browser BLE support
- **React Hooks**: State management and lifecycle
- **TypeScript**: Type safety and development experience
- **Tailwind CSS**: UI styling and responsive design
- **Radix UI**: Accessible component primitives

## Core Features

### ✅ Implemented Features

1. **Bluetooth State Management**
   - Automatic Bluetooth availability detection
   - Permission request handling
   - State monitoring and updates

2. **Device Discovery**
   - Filtered device scanning by name
   - ESP32 device identification
   - Signal strength monitoring (RSSI)

3. **Connection Management**
   - GATT server connection
   - Service and characteristic discovery
   - Automatic reconnection logic
   - Graceful disconnection

4. **Real-time Data Reception**
   - Characteristic notifications
   - UTF-8 data decoding
   - Smart data parsing (JSON + simple string)
   - Data buffer management

5. **UI Integration**
   - Real-time value display
   - Progress bar visualization
   - Color-coded sound levels
   - Historical data chart
   - Statistics calculation

6. **Error Handling**
   - Comprehensive error detection
   - User-friendly error messages
   - Automatic error recovery
   - Connection state validation

## Configuration

### BLE Constants

```typescript
const BLE_CONFIG = {
  SERVICE_UUID: "4fafc201-1fb5-459e-8fcc-c5c9c331914b",
  CHARACTERISTIC_UUID: "beb5483e-36e1-4688-b7f5-ea07361b26a8",
  TARGET_DEVICE_NAME: "ESP32-THAT-PROJECT",
  SCAN_TIMEOUT: 3000, // 3 seconds
  MAX_DATA_BUFFER_SIZE: 20,
  MAX_DBA_VALUE: 120,
  RECONNECT_ATTEMPTS: 3,
  RECONNECT_DELAY: 2000, // 2 seconds
};
```

### Data Formats

#### Simple String Format
```
ESP32 sends: "65.5"
Parsed as: { value: 65.5, status: "ok" }
```

#### JSON Format
```json
{
  "dba": 65.5,
  "timestamp": 1234567890,
  "status": "ok",
  "battery": 85
}
```

## Usage

### Basic Usage

```typescript
import { useBLE } from '@/hooks/use-ble';

function MyComponent() {
  const {
    connectionState,
    isBluetoothAvailable,
    startDeviceDiscovery,
    connectToDevice,
    disconnect,
    currentValue,
    dataHistory,
    statistics,
  } = useBLE();

  // Start device discovery
  const handleSearch = async () => {
    const devices = await startDeviceDiscovery();
    if (devices.length > 0) {
      await connectToDevice(devices[0]);
    }
  };

  return (
    <div>
      <p>Current Value: {currentValue} dBA</p>
      <p>Connected: {connectionState.isConnected ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

### Advanced Usage

```typescript
// Custom data processing
const processData = (data) => {
  if (data.value > 85) {
    // Trigger high sound level alert
    triggerAlert('High sound level detected!');
  }
};

// Custom reconnection logic
const handleDisconnect = async () => {
  await disconnect();
  // Custom cleanup logic
  resetUI();
};
```

## Components

### BLE Service (`lib/ble.ts`)

Core BLE functionality provider with the following methods:

- `requestBluetoothPermission()`: Check and request BLE permissions
- `startDeviceDiscovery()`: Scan for compatible devices
- `connectToDevice(device)`: Connect to a specific device
- `disconnect()`: Disconnect from current device
- `sendData(data)`: Send data to connected device
- `subscribe(callback)`: Subscribe to state changes

### useBLE Hook (`hooks/use-ble.tsx`)

React hook providing BLE functionality:

```typescript
interface UseBLEReturn {
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
  statistics: Statistics;
  
  // UI helpers
  getSoundLevelColor: (value: number) => string;
  getSoundLevelProgress: (value: number) => number;
  formatValue: (value: number) => string;
}
```

### BLEChart Component (`components/ble-chart.tsx`)

Real-time data visualization component featuring:

- Current value display with color coding
- Progress bar for sound level
- Statistics (average, min, max, count)
- Historical data chart
- Trend indicators

### ConnectDevicePage (`app/(app)/connect-device/page.tsx`)

Complete BLE device management interface with:

- Bluetooth status monitoring
- Device discovery and connection
- Real-time data display
- Error handling and user feedback
- Configuration information

## Error Handling

### Common Errors

1. **Bluetooth Not Available**
   - Check device compatibility
   - Enable Bluetooth in system settings

2. **Permission Denied**
   - Grant Bluetooth permissions
   - Refresh page and try again

3. **Device Not Found**
   - Ensure ESP32 is powered on
   - Check device name matches configuration
   - Verify device is within range

4. **Connection Failed**
   - Check device is not already connected
   - Verify service and characteristic UUIDs
   - Ensure device supports required features

5. **Data Parsing Errors**
   - Verify data format from ESP32
   - Check for malformed JSON
   - Ensure UTF-8 encoding

### Error Recovery

The implementation includes automatic error recovery:

- **Reconnection Logic**: Automatic reconnection attempts (3 tries)
- **Data Validation**: Fallback to last valid data
- **State Management**: Graceful state transitions
- **User Feedback**: Clear error messages and instructions

## Performance Considerations

### Data Rate Management

- **ESP32 Data Rate**: 1-10 Hz typical
- **UI Updates**: Throttled by React rendering pipeline
- **Buffer Size**: Limited to 20 readings for memory efficiency
- **Memory Management**: Automatic cleanup on disconnect

### Optimization Techniques

1. **Efficient Data Parsing**: Smart parser handles multiple formats
2. **State Subscription**: Minimal re-renders with subscription model
3. **Buffer Management**: Circular buffer prevents memory leaks
4. **Connection Pooling**: Single connection per device

## Security

### Security Measures

1. **Permission-Based Access**: Requires explicit user permission
2. **Device Filtering**: Only connects to specified device names
3. **UUID Validation**: Validates service and characteristic UUIDs
4. **Connection State Validation**: Prevents invalid operations
5. **Data Validation**: Validates incoming data format

### Best Practices

- Always request user permission before BLE operations
- Validate all incoming data
- Implement proper error handling
- Use secure UUIDs for services and characteristics
- Monitor connection state changes

## Testing

### Test Coverage

The implementation includes comprehensive testing:

```bash
# Run BLE functionality tests
node tests/test-ble-functionality.js
```

### Test Scenarios

1. **Bluetooth State Changes**: Enable/disable during operation
2. **Device Discovery**: Multiple devices present
3. **Connection Loss**: Out of range scenarios
4. **Data Corruption**: Invalid data handling
5. **Rapid Data**: High-frequency transmission
6. **App Lifecycle**: Background/foreground transitions

## Browser Compatibility

### Supported Browsers

- **Chrome**: 56+ (Full support)
- **Edge**: 79+ (Full support)
- **Opera**: 43+ (Full support)
- **Samsung Internet**: 7.0+ (Full support)

### Required Features

- Web Bluetooth API
- Bluetooth permissions API
- GATT server connections
- Characteristic notifications
- DataView handling

## Troubleshooting

### Common Issues

1. **"Bluetooth not supported"**
   - Use supported browser (Chrome, Edge, Opera)
   - Enable experimental features if needed

2. **"Permission denied"**
   - Click the Bluetooth icon in address bar
   - Grant permissions when prompted
   - Refresh page and try again

3. **"Device not found"**
   - Check ESP32 is powered on
   - Verify device name in configuration
   - Ensure device is advertising

4. **"Connection failed"**
   - Check device is not already connected
   - Verify UUIDs match ESP32 firmware
   - Try disconnecting and reconnecting

### Debug Mode

Enable debug logging by setting:

```typescript
localStorage.setItem('ble-debug', 'true');
```

## Future Enhancements

### Planned Features

1. **Multiple Device Support**: Connect to multiple ESP32 devices
2. **Data Export**: Export historical data to CSV/JSON
3. **Custom Alerts**: Configurable sound level thresholds
4. **Offline Mode**: Cache data when disconnected
5. **Advanced Analytics**: Trend analysis and predictions

### Performance Improvements

1. **Web Workers**: Move data processing to background threads
2. **Compression**: Compress data for faster transmission
3. **Caching**: Implement intelligent data caching
4. **Optimization**: Further optimize UI rendering

## API Reference

### BLE Service Methods

```typescript
// Check Bluetooth availability
await bleService.isBluetoothAvailable(): Promise<boolean>

// Request permissions
await bleService.requestBluetoothPermission(): Promise<boolean>

// Start device discovery
await bleService.startDeviceDiscovery(): Promise<BLEDevice[]>

// Connect to device
await bleService.connectToDevice(device: BLEDevice): Promise<boolean>

// Disconnect from device
await bleService.disconnect(): Promise<void>

// Send data to device
await bleService.sendData(data: string): Promise<boolean>

// Subscribe to state changes
const unsubscribe = bleService.subscribe(callback: (state: BLEConnectionState) => void)

// Get current state
const state = bleService.getConnectionState(): BLEConnectionState

// Get statistics
const stats = bleService.getDataStatistics(): Statistics
```

### Data Types

```typescript
interface BLEDevice {
  id: string;
  name: string;
  rssi?: number;
  address?: string;
}

interface BLEData {
  value: number;
  timestamp: number;
  status: string;
  battery?: number;
  rawData?: string;
}

interface BLEConnectionState {
  isConnected: boolean;
  isScanning: boolean;
  isConnecting: boolean;
  device?: BLEDevice;
  error?: string;
  lastData?: BLEData;
  dataHistory: BLEData[];
}
```

## Conclusion

The BLE implementation provides a complete, production-ready solution for ESP32 device communication. It includes comprehensive error handling, real-time data visualization, and a user-friendly interface. The implementation follows best practices for security, performance, and user experience.

For support or questions, please refer to the main documentation or create an issue in the project repository. 