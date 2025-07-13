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
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
    
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
        requestAllPermissions();
        disableEdgeToEdgeIfNeeded();
    }

    private void requestAllPermissions() {
        String[] permissionsToRequest = getPermissionsForCurrentAndroidVersion();
        List<String> permissionsNeeded = new ArrayList<>();
        
        for (String permission : permissionsToRequest) {
            if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(permission);
            }
        }
        
        if (!permissionsNeeded.isEmpty()) {
            ActivityCompat.requestPermissions(this, 
                permissionsNeeded.toArray(new String[0]), 
                PERMISSIONS_REQUEST_CODE);
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
        
        if (requestCode == PERMISSIONS_REQUEST_CODE) {
            boolean allGranted = true;
            List<String> deniedPermissions = new ArrayList<>();
            
            for (int i = 0; i < permissions.length; i++) {
                if (grantResults[i] != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    deniedPermissions.add(permissions[i]);
                }
            }
            
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
        switch (permission) {
            case Manifest.permission.BLUETOOTH:
            case Manifest.permission.BLUETOOTH_ADMIN:
            case Manifest.permission.BLUETOOTH_SCAN:
            case Manifest.permission.BLUETOOTH_CONNECT:
            case Manifest.permission.BLUETOOTH_ADVERTISE:
                return "Bluetooth";
            case Manifest.permission.ACCESS_FINE_LOCATION:
            case Manifest.permission.ACCESS_COARSE_LOCATION:
                return "Location";
            case Manifest.permission.ACCESS_WIFI_STATE:
            case Manifest.permission.CHANGE_WIFI_STATE:
            case "android.permission.NEARBY_WIFI_DEVICES":
                return "WiFi";
            case Manifest.permission.ACCESS_NETWORK_STATE:
            case Manifest.permission.CHANGE_NETWORK_STATE:
                return "Network";
            default:
                return permission;
        }
    }
    
    private void initializeServices() {
        // Initialize your WiFi, Bluetooth, and Location services here
        // This will be called after all permissions are granted
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
    
    // Method to request permissions again if needed
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
}
