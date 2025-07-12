# Web Bluetooth Implementation Guide for SHEILD

## Overview

This guide explains how to use Web Bluetooth API in your SHEILD website. The implementation provides multiple ways to connect to Bluetooth devices, from simple connections to advanced ESP32 device communication.

## Quick Start

### 1. Simple Bluetooth Connection

Use the basic `SimpleBluetoothButton` component for general Bluetooth connections:

```tsx
import SimpleBluetoothButton from '@/components/simple-bluetooth-button';

function MyComponent() {
  const handleConnect = (device) => {
    console.log('Connected to:', device.name);
  };

  const handleError = (error) => {
    console.error('Connection failed:', error);
  };

  return (
    <SimpleBluetoothButton
      onConnect={handleConnect}
      onError={handleError}
    >
      Connect to Bluetooth
    </SimpleBluetoothButton>
  );
}
```

### 2. Advanced ESP32 Connection

Use the full-featured `BluetoothConnectButton` for ESP32 devices with real-time data:

```tsx
import BluetoothConnectButton from '@/components/bluetooth-connect-button';
import { useBLE } from '@/hooks/use-ble';

function MyComponent() {
  const { connectionState, currentValue, dataHistory } = useBLE();

  return (
    <div>
      <BluetoothConnectButton>
        Connect to ESP32 Device
      </BluetoothConnectButton>
      
      {connectionState.isConnected && (
        <div>
          <p>Current Value: {currentValue}</p>
          <p>Data Points: {dataHistory.length}</p>
        </div>
      )}
    </div>
  );
}
```

## Available Components

### 1. SimpleBluetoothButton

A basic Bluetooth connection button that matches your original example:

**Features:**
- Simple device discovery
- Accepts any Bluetooth device
- Customizable callbacks
- Error handling

**Props:**
- `className`: CSS classes
- `children`: Button text
- `onConnect`: Callback when device connects
- `onError`: Callback when connection fails

### 2. BluetoothConnectButton

Advanced button with full BLE service integration:

**Features:**
- ESP32 device filtering
- Real-time data reception
- Connection state management
- Automatic reconnection
- Toast notifications

**Props:**
- `className`: CSS classes
- `variant`: Button variant (default, destructive, outline, etc.)
- `size`: Button size (default, sm, lg, icon)
- `children`: Button text

### 3. useBLE Hook

React hook providing complete BLE functionality:

```tsx
const {
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
} = useBLE();
```

## Configuration

### BLE Service Configuration

The BLE service is configured in `src/lib/ble.ts`:

```typescript
const BLE_CONFIG = {
  SERVICE_UUID: "4fafc201-1fb5-459e-8fcc-c5c9c331914b",
  CHARACTERISTIC_UUID: "beb5483e-36e1-4688-b7f5-ea07361b26a8",
  TARGET_DEVICE_NAME: "ESP32-THAT-PROJECT",
  SCAN_TIMEOUT: 3000,
  MAX_DATA_BUFFER_SIZE: 20,
  MAX_DBA_VALUE: 120,
  RECONNECT_ATTEMPTS: 3,
  RECONNECT_DELAY: 2000,
};
```

### Customizing Device Filters

To connect to different devices, modify the filters in the BLE service:

```typescript
// For specific device names
filters: [
  { name: "My-Device-Name" },
  { namePrefix: "ESP32" },
]

// For specific services
optionalServices: ["my-service-uuid"]

// For any device
acceptAllDevices: true
```

## Browser Support

### Supported Browsers
- **Chrome**: 56+ (Full support)
- **Edge**: 79+ (Full support)
- **Opera**: 43+ (Full support)
- **Samsung Internet**: 7.0+ (Full support)

### Required Features
- Web Bluetooth API
- HTTPS connection (required for security)
- User gesture (button click, etc.)

## Usage Examples

### Example 1: Basic Device Connection

```tsx
import React, { useState } from 'react';
import SimpleBluetoothButton from '@/components/simple-bluetooth-button';

function BasicBluetoothExample() {
  const [device, setDevice] = useState(null);
  const [error, setError] = useState(null);

  const handleConnect = (connectedDevice) => {
    setDevice(connectedDevice);
    setError(null);
  };

  const handleError = (err) => {
    setError(err.message);
    setDevice(null);
  };

  return (
    <div>
      <SimpleBluetoothButton
        onConnect={handleConnect}
        onError={handleError}
      >
        Connect to Any Device
      </SimpleBluetoothButton>

      {device && (
        <p>Connected to: {device.name}</p>
      )}

      {error && (
        <p style={{ color: 'red' }}>Error: {error}</p>
      )}
    </div>
  );
}
```

### Example 2: ESP32 Data Monitoring

```tsx
import React from 'react';
import BluetoothConnectButton from '@/components/bluetooth-connect-button';
import { useBLE } from '@/hooks/use-ble';
import { BLEChart } from '@/components/ble-chart';

function ESP32Monitor() {
  const {
    connectionState,
    currentValue,
    dataHistory,
    statistics,
    getSoundLevelColor,
    getSoundLevelProgress,
  } = useBLE();

  return (
    <div>
      <BluetoothConnectButton>
        Connect to ESP32
      </BluetoothConnectButton>

      {connectionState.isConnected && (
        <div>
          <h3>Real-time Data</h3>
          <p>Current Value: {currentValue}</p>
          <p>Average: {statistics.average}</p>
          
          <BLEChart
            dataHistory={dataHistory}
            currentValue={currentValue}
            statistics={statistics}
            getSoundLevelColor={getSoundLevelColor}
            getSoundLevelProgress={getSoundLevelProgress}
            formatValue={(value) => `${value} dBA`}
          />
        </div>
      )}
    </div>
  );
}
```

### Example 3: Custom Device Filtering

```tsx
import React from 'react';
import { useBLE } from '@/hooks/use-ble';

function CustomDeviceExample() {
  const { startDeviceDiscovery, connectionState } = useBLE();

  const connectToCustomDevice = async () => {
    try {
      // This will use the existing BLE service with ESP32 filters
      const devices = await startDeviceDiscovery();
      
      if (devices.length > 0) {
        console.log('Found devices:', devices);
      }
    } catch (error) {
      console.error('Discovery failed:', error);
    }
  };

  return (
    <div>
      <button onClick={connectToCustomDevice}>
        Find ESP32 Devices
      </button>

      {connectionState.device && (
        <p>Connected to: {connectionState.device.name}</p>
      )}
    </div>
  );
}
```

## Error Handling

### Common Errors and Solutions

1. **"Web Bluetooth API not supported"**
   - Use a supported browser (Chrome, Edge, Opera)
   - Enable experimental features if needed

2. **"User cancelled the request"**
   - User clicked cancel in device picker
   - Handle gracefully in your UI

3. **"Bluetooth permission denied"**
   - User denied Bluetooth permission
   - Guide user to enable permissions

4. **"Device not found"**
   - Device is not advertising
   - Device is out of range
   - Check device name filters

### Error Handling Example

```tsx
const handleError = (error) => {
  let message = 'Unknown error occurred';
  
  switch (error.name) {
    case 'NotFoundError':
      message = 'No compatible devices found';
      break;
    case 'NotAllowedError':
      message = 'Bluetooth permission denied';
      break;
    case 'UserCancelledError':
      message = 'Device selection cancelled';
      break;
    case 'NetworkError':
      message = 'Device is out of range';
      break;
    default:
      message = error.message || message;
  }
  
  // Show error to user
  console.error(message);
};
```

## Security Considerations

### HTTPS Requirement
Web Bluetooth API requires HTTPS in production. For development:
- Use `localhost` (always allowed)
- Use `127.0.0.1` (always allowed)
- Use a valid SSL certificate in production

### Permission Handling
- Always request user permission before BLE operations
- Handle permission denial gracefully
- Provide clear instructions for enabling permissions

### Data Validation
- Validate all incoming data from devices
- Sanitize device names and data
- Implement proper error boundaries

## Performance Tips

### Memory Management
- Disconnect devices when not in use
- Clear data buffers periodically
- Use React's cleanup functions

### Battery Optimization
- Disconnect when app goes to background
- Limit data polling frequency
- Implement connection timeouts

### UI Performance
- Throttle UI updates for real-time data
- Use React.memo for expensive components
- Implement virtual scrolling for large data sets

## Testing

### Manual Testing
1. Test with actual Bluetooth devices
2. Test permission scenarios
3. Test connection loss scenarios
4. Test different browsers

### Automated Testing
```typescript
// Mock Web Bluetooth API for testing
const mockBluetooth = {
  requestDevice: jest.fn(),
  getAvailability: jest.fn(),
};

Object.defineProperty(navigator, 'bluetooth', {
  value: mockBluetooth,
  writable: true,
});
```

## Troubleshooting

### Debug Mode
Enable debug logging:
```typescript
localStorage.setItem('ble-debug', 'true');
```

### Common Issues
1. **Device not appearing**: Check device name and advertising
2. **Connection drops**: Implement reconnection logic
3. **Data not received**: Check characteristic UUIDs
4. **Permission issues**: Clear browser permissions

## Next Steps

1. **Customize Device Filters**: Modify BLE service for your specific devices
2. **Add Data Processing**: Implement custom data parsing logic
3. **Enhance UI**: Create custom visualization components
4. **Add Analytics**: Track connection success rates and performance

## Resources

- [Web Bluetooth API Specification](https://webbluetoothcg.github.io/web-bluetooth/)
- [Chrome Web Bluetooth Samples](https://github.com/GoogleChrome/samples/tree/gh-pages/web-bluetooth)
- [MDN Web Bluetooth Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)

## Support

For issues or questions:
1. Check browser compatibility
2. Verify device configuration
3. Review error messages
4. Test with known working devices
5. Check the troubleshooting section above 