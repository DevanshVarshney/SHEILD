package com.wirelesswizards.sheild;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;
import android.widget.Toast;
import android.util.Log;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    
    private static final String TAG = "MainActivity";
    private static final int PERMISSIONS_REQUEST_CODE = 1001;
    
    // Permission arrays for different Android versions
    private static final String[] PERMISSIONS_ANDROID_10_AND_BELOW = {
        Manifest.permission.BLUETOOTH,
        Manifest.permission.BLUETOOTH_ADMIN,
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION,
        Manifest.permission.ACCESS_WIFI_STATE,
        Manifest.permission.CHANGE_WIFI_STATE,
        Manifest.permission.ACCESS_NETWORK_STATE,
        Manifest.permission.CHANGE_NETWORK_STATE
    };
    
    private static final String[] PERMISSIONS_ANDROID_11 = {
        Manifest.permission.BLUETOOTH,
        Manifest.permission.BLUETOOTH_ADMIN,
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION,
        Manifest.permission.ACCESS_WIFI_STATE,
        Manifest.permission.CHANGE_WIFI_STATE,
        Manifest.permission.ACCESS_NETWORK_STATE,
        Manifest.permission.CHANGE_NETWORK_STATE
    };
    
    private static final String[] PERMISSIONS_ANDROID_12_AND_13 = {
        Manifest.permission.BLUETOOTH_SCAN,
        Manifest.permission.BLUETOOTH_CONNECT,
        Manifest.permission.BLUETOOTH_ADVERTISE,
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION,
        Manifest.permission.ACCESS_WIFI_STATE,
        Manifest.permission.CHANGE_WIFI_STATE,
        Manifest.permission.ACCESS_NETWORK_STATE,
        Manifest.permission.CHANGE_NETWORK_STATE
    };
    
    private static final String[] PERMISSIONS_ANDROID_13_PLUS = {
        Manifest.permission.BLUETOOTH_SCAN,
        Manifest.permission.BLUETOOTH_CONNECT,
        Manifest.permission.BLUETOOTH_ADVERTISE,
        "android.permission.NEARBY_WIFI_DEVICES",
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION,
        Manifest.permission.ACCESS_WIFI_STATE,
        Manifest.permission.CHANGE_WIFI_STATE,
        Manifest.permission.ACCESS_NETWORK_STATE,
        Manifest.permission.CHANGE_NETWORK_STATE
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        disableEdgeToEdgeIfNeeded();
        
        // Request permissions on app start
        Log.d(TAG, "onCreate called, requesting permissions...");
        
        // For Android 10, directly request all permissions in sequence
        if (Build.VERSION.SDK_INT == Build.VERSION_CODES.Q) {
            Log.d(TAG, "Android 10 detected, directly requesting all permissions");
            
            Toast.makeText(this, 
                "This app requires Location, Bluetooth, and WiFi permissions. " +
                "Please grant all permissions when prompted.", 
                Toast.LENGTH_LONG).show();
            
            // First, request location permissions which are critical for BLE on Android 10
            ActivityCompat.requestPermissions(this,
                new String[]{
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                },
                1004);
                
            // Then directly try to enable Bluetooth and WiFi
            // This will be called after permissions are granted
            new android.os.Handler().postDelayed(() -> enableBluetoothAndWifi(), 2000); // 2 second delay to allow permission dialog to be handled first
            
        } else if (!areAllPermissionsGranted()) {
            requestAllPermissions();
        }
    }
    
    // Special method to directly enable Bluetooth and WiFi on Android 10
    private void enableBluetoothAndWifi() {
        Log.d(TAG, "Attempting to directly enable Bluetooth and WiFi");
        
        // Try to enable Bluetooth
        try {
            android.bluetooth.BluetoothAdapter bluetoothAdapter = android.bluetooth.BluetoothAdapter.getDefaultAdapter();
            if (bluetoothAdapter != null && !bluetoothAdapter.isEnabled()) {
                Log.d(TAG, "Requesting to enable Bluetooth");
                Toast.makeText(this, "Please enable Bluetooth when prompted", Toast.LENGTH_SHORT).show();
                
                // Request to enable Bluetooth - this will show the system dialog
                android.content.Intent enableBtIntent = new android.content.Intent(android.bluetooth.BluetoothAdapter.ACTION_REQUEST_ENABLE);
                startActivityForResult(enableBtIntent, 1005);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error enabling Bluetooth: " + e.getMessage());
        }
        
        // Try to enable WiFi
        try {
            android.net.wifi.WifiManager wifiManager = (android.net.wifi.WifiManager) getApplicationContext().getSystemService(android.content.Context.WIFI_SERVICE);
            if (wifiManager != null && !wifiManager.isWifiEnabled()) {
                Log.d(TAG, "Attempting to enable WiFi");
                Toast.makeText(this, "Please enable WiFi for full functionality", Toast.LENGTH_SHORT).show();
                
                // On Android 10, we can still directly enable WiFi
                try {
                    if (ContextCompat.checkSelfPermission(this, Manifest.permission.CHANGE_WIFI_STATE) == PackageManager.PERMISSION_GRANTED) {
                        wifiManager.setWifiEnabled(true); // Deprecated but still works on Android 10
                    } else {
                        Log.d(TAG, "No permission to change WiFi state");
                        // Open WiFi settings as fallback
                        startActivity(new android.content.Intent(android.provider.Settings.ACTION_WIFI_SETTINGS));
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Could not enable WiFi directly: " + e.getMessage());
                    // Open WiFi settings as fallback
                    startActivity(new android.content.Intent(android.provider.Settings.ACTION_WIFI_SETTINGS));
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error enabling WiFi: " + e.getMessage());
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        // Request permissions when activity is fully visible
        Log.d(TAG, "onResume called, checking permissions...");
        if (!areAllPermissionsGranted()) {
            Log.d(TAG, "Not all permissions granted, requesting...");
            requestAllPermissions();
        } else {
            Log.d(TAG, "All permissions already granted");
        }
    }

    private void requestAllPermissions() {
        // Special handling for Android 10 (API 29)
        if (Build.VERSION.SDK_INT == Build.VERSION_CODES.Q) {
            Log.d(TAG, "Android 10 detected, using special permission handling");
            
            // On Android 10, BLUETOOTH and WIFI_STATE are normal permissions
            // but ACCESS_FINE_LOCATION is required for BLE scanning and must be requested
            boolean locationGranted = ContextCompat.checkSelfPermission(this, 
                Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;
                
            if (!locationGranted) {
                Log.d(TAG, "Requesting LOCATION permission for Android 10 BLE scanning");
                
                // Show explanation dialog first
                Toast.makeText(this, 
                    "Location permission is required for Bluetooth scanning on Android 10. " +
                    "Please grant this permission for the app to function properly.", 
                    Toast.LENGTH_LONG).show();
                    
                // Request location permission - this is the key for BLE on Android 10
                ActivityCompat.requestPermissions(this, 
                    new String[]{
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                    }, 
                    1004);
            } else {
                Log.d(TAG, "Location permission already granted for Android 10");
                initializeServices();
            }
            
            return;
        }
        
        // Normal flow for other Android versions
        String[] permissionsToRequest = getPermissionsForCurrentAndroidVersion();
        List<String> permissionsNeeded = new ArrayList<>();
        
        Log.d(TAG, "Android version: " + Build.VERSION.SDK_INT);
        Log.d(TAG, "Checking " + permissionsToRequest.length + " permissions");
        
        for (String permission : permissionsToRequest) {
            boolean isGranted = ContextCompat.checkSelfPermission(this, permission) == PackageManager.PERMISSION_GRANTED;
            Log.d(TAG, "Permission " + permission + " granted: " + isGranted);
            if (!isGranted) {
                permissionsNeeded.add(permission);
            }
        }
        
        Log.d(TAG, "Permissions needed: " + permissionsNeeded.size());
        if (!permissionsNeeded.isEmpty()) {
            Log.d(TAG, "Requesting permissions: " + permissionsNeeded.toString());
            ActivityCompat.requestPermissions(this, 
                permissionsNeeded.toArray(new String[0]), 
                PERMISSIONS_REQUEST_CODE);
        } else {
            Log.d(TAG, "All permissions already granted");
        }
    }
    
    private String[] getPermissionsForCurrentAndroidVersion() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) { // Android 13+ (API 33+)
            return PERMISSIONS_ANDROID_13_PLUS;
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) { // Android 12 (API 31+)
            return PERMISSIONS_ANDROID_12_AND_13;
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) { // Android 11 (API 30)
            return PERMISSIONS_ANDROID_11;
        } else { // Android 10 and below
            return PERMISSIONS_ANDROID_10_AND_BELOW;
        }
    }
    
    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        // Track permissions for all request codes
        boolean allGranted = true;
        List<String> deniedPermissions = new ArrayList<>();
        
        for (int i = 0; i < permissions.length; i++) {
            Log.d(TAG, "Permission result: " + permissions[i] + " = " + 
                  (grantResults[i] == PackageManager.PERMISSION_GRANTED ? "GRANTED" : "DENIED"));
            
            if (grantResults[i] != PackageManager.PERMISSION_GRANTED) {
                allGranted = false;
                deniedPermissions.add(permissions[i]);
            }
        }
        
        // Handle Android 10 specific request codes
        if (requestCode == 1002 || requestCode == 1003 || requestCode == 1004) {
            if (allGranted) {
                Log.d(TAG, "Specific permissions granted for request code: " + requestCode);
                
                // Check if all permission types are granted
                if (areAllPermissionsGranted()) {
                    Toast.makeText(this, "All permissions granted!", Toast.LENGTH_SHORT).show();
                    initializeServices();
                }
            } else {
                handleDeniedPermissions(deniedPermissions);
            }
            return;
        }
        
        // Handle the standard permission request code
        if (requestCode == PERMISSIONS_REQUEST_CODE) {
            if (allGranted) {
                Toast.makeText(this, "All permissions granted!", Toast.LENGTH_SHORT).show();
                // Initialize your services here
                initializeServices();
            } else {
                handleDeniedPermissions(deniedPermissions);
            }
        }
    }
    
    private void handleDeniedPermissions(List<String> deniedPermissions) {
        StringBuilder message = new StringBuilder("Some permissions were denied:\n");
        for (String permission : deniedPermissions) {
            message.append("- ").append(getPermissionName(permission)).append("\n");
        }
        message.append("\nThe app may not function properly without these permissions.");
        
        Toast.makeText(this, message.toString(), Toast.LENGTH_LONG).show();
        
        // Check if we should show rationale for any denied permissions
        for (String permission : deniedPermissions) {
            if (ActivityCompat.shouldShowRequestPermissionRationale(this, permission)) {
                // Show rationale dialog and re-request
                showPermissionRationale(permission);
                break;
            }
        }
    }
    
    private void showPermissionRationale(String permission) {
        // You can implement a dialog here to explain why the permission is needed
        Toast.makeText(this, "Permission " + getPermissionName(permission) + " is required for app functionality", Toast.LENGTH_LONG).show();
    }
    
    private String getPermissionName(String permission) {
        return switch (permission) {
            case Manifest.permission.BLUETOOTH,
                 Manifest.permission.BLUETOOTH_ADMIN,
                 Manifest.permission.BLUETOOTH_SCAN,
                 Manifest.permission.BLUETOOTH_CONNECT,
                 Manifest.permission.BLUETOOTH_ADVERTISE -> "Bluetooth";
            case Manifest.permission.ACCESS_FINE_LOCATION,
                 Manifest.permission.ACCESS_COARSE_LOCATION -> "Location";
            case Manifest.permission.ACCESS_WIFI_STATE,
                 Manifest.permission.CHANGE_WIFI_STATE,
                 "android.permission.NEARBY_WIFI_DEVICES" -> "WiFi";
            case Manifest.permission.ACCESS_NETWORK_STATE,
                 Manifest.permission.CHANGE_NETWORK_STATE -> "Network";
            default -> permission;
        };
    }
    
    private void initializeServices() {
        // Initialize your WiFi, Bluetooth, and Location services here
        // This will be called after all permissions are granted
        Log.d(TAG, "Initializing services with all permissions granted");
        
        // For Android 10, explicitly check Bluetooth state after permissions are granted
        if (Build.VERSION.SDK_INT == Build.VERSION_CODES.Q) {
            Log.d(TAG, "Android 10: Explicitly checking Bluetooth state");
            
            // On Android 10, we need to explicitly request Bluetooth permissions
            // even though they're "normal" permissions that don't require runtime grants
            try {
                // This will trigger the system Bluetooth dialog if Bluetooth is off
                android.bluetooth.BluetoothAdapter bluetoothAdapter = android.bluetooth.BluetoothAdapter.getDefaultAdapter();
                if (bluetoothAdapter != null && !bluetoothAdapter.isEnabled()) {
                    Log.d(TAG, "Requesting to enable Bluetooth");
                    Toast.makeText(this, "Please enable Bluetooth when prompted", Toast.LENGTH_SHORT).show();
                    
                    // Request to enable Bluetooth - this will show the system dialog
                    android.content.Intent enableBtIntent = new android.content.Intent(android.bluetooth.BluetoothAdapter.ACTION_REQUEST_ENABLE);
                    // Use registerForActivityResult in newer code, but keeping startActivityForResult for compatibility
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
                        // For Android 12+, we should use the new API, but this requires more setup
                        // So we'll just show a message for now
                        Toast.makeText(this, "Please enable Bluetooth in settings", Toast.LENGTH_LONG).show();
                        startActivity(new android.content.Intent(android.provider.Settings.ACTION_BLUETOOTH_SETTINGS));
                    } else {
                        startActivityForResult(enableBtIntent, 1005);
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Error checking Bluetooth state: " + e.getMessage());
            }
            
            // Also check WiFi state
            try {
                android.net.wifi.WifiManager wifiManager = (android.net.wifi.WifiManager) getApplicationContext().getSystemService(android.content.Context.WIFI_SERVICE);
                if (wifiManager != null && !wifiManager.isWifiEnabled()) {
                    Log.d(TAG, "WiFi is disabled, showing prompt");
                    Toast.makeText(this, "Please enable WiFi for full functionality", Toast.LENGTH_SHORT).show();
                    
                    // On Android 10, we can still directly enable WiFi
                    // wifiManager.setWifiEnabled(true); // Deprecated but still works on Android 10
                    
                    // Open WiFi settings
                    startActivity(new android.content.Intent(android.provider.Settings.ACTION_WIFI_SETTINGS));
                }
            } catch (Exception e) {
                Log.e(TAG, "Error checking WiFi state: " + e.getMessage());
            }
        }
    }
    
    // Method to check if all required permissions are granted
    public boolean areAllPermissionsGranted() {
        String[] requiredPermissions = getPermissionsForCurrentAndroidVersion();
        for (String permission : requiredPermissions) {
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                return false;
            }
        }
        return true;
    }
    
    // This method can be called from JavaScript through the Capacitor bridge if needed
    public void requestPermissionsAgain() {
        requestAllPermissions();
    }

    private void disableEdgeToEdgeIfNeeded() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) { // Android 10+
            Window window = getWindow();
            View decorView = window.getDecorView();
            // For Android 10 and 11, clear immersive flags
            decorView.setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
            // For Android 11+ (API 30+), also clear WindowInsetsController flags
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                WindowInsetsController insetsController = window.getInsetsController();
                if (insetsController != null) {
                    insetsController.setSystemBarsAppearance(0, WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS);
                }
            }
        }
    }
    
    @Override
    protected void onActivityResult(int requestCode, int resultCode, android.content.Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        
        // Handle Bluetooth enable request result
        if (requestCode == 1005) {
            if (resultCode == RESULT_OK) {
                Log.d(TAG, "Bluetooth was enabled by the user");
                Toast.makeText(this, "Bluetooth enabled successfully", Toast.LENGTH_SHORT).show();
            } else {
                Log.d(TAG, "User declined to enable Bluetooth");
                Toast.makeText(this, "Bluetooth is required for device scanning", Toast.LENGTH_LONG).show();
            }
        }
    }
}
