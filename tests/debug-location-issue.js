// Debug script for location permission issue
// Run this in the browser console to debug the specific "User denied Geolocation" error

console.log('🔍 Debugging Location Permission Issue\n');

// Test 1: Check browser geolocation support
console.log('✅ Browser Support Check:');
console.log('- navigator.geolocation:', !!navigator.geolocation);
console.log('- navigator.permissions:', !!navigator.permissions);
console.log('- window.location.protocol:', window.location.protocol);
console.log('- window.location.hostname:', window.location.hostname);
console.log('');

// Test 2: Check permission status in detail
async function checkDetailedPermissions() {
    console.log('🔐 Detailed Permission Check:');

    if (navigator.permissions) {
        try {
            const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
            console.log('- Permission State:', permissionStatus.state);
            console.log('- Permission Granted:', permissionStatus.state === 'granted');
            console.log('- Permission Denied:', permissionStatus.state === 'denied');
            console.log('- Permission Prompt:', permissionStatus.state === 'prompt');

            // Listen for permission changes
            permissionStatus.onchange = () => {
                console.log('🔄 Permission changed to:', permissionStatus.state);
            };

        } catch (error) {
            console.log('- Permissions API error:', error.message);
        }
    } else {
        console.log('- Permissions API not supported');
    }
    console.log('');
}

// Test 3: Test geolocation with different options
async function testGeolocationOptions() {
    console.log('📍 Testing Different Geolocation Options:\n');

    const testOptions = [
        {
            name: 'Low Accuracy (Default)',
            options: { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
        },
        {
            name: 'High Accuracy',
            options: { enableHighAccuracy: true, timeout: 15000, maximumAge: 300000 }
        },
        {
            name: 'Long Timeout',
            options: { enableHighAccuracy: false, timeout: 30000, maximumAge: 600000 }
        },
        {
            name: 'No Cache',
            options: { enableHighAccuracy: false, timeout: 10000, maximumAge: 0 }
        }
    ];

    for (const test of testOptions) {
        console.log(`🧪 Testing: ${test.name}`);
        console.log(`   Options:`, test.options);

        try {
            const position = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, test.options);
            });

            console.log(`   ✅ SUCCESS - Lat: ${position.coords.latitude}, Lng: ${position.coords.longitude}`);
            console.log(`   Accuracy: ${position.coords.accuracy}m`);
            console.log('');

            // If any test succeeds, we can use those options
            return test.options;

        } catch (error) {
            console.log(`   ❌ FAILED - ${error.message}`);
            console.log(`   Error Code: ${error.code}`);
            console.log('');
        }
    }

    return null;
}

// Test 4: Check if it's a browser-specific issue
function checkBrowserSpecifics() {
    console.log('🌐 Browser-Specific Checks:');
    console.log('- User Agent:', navigator.userAgent);
    console.log('- Platform:', navigator.platform);
    console.log('- Cookie Enabled:', navigator.cookieEnabled);
    console.log('- Online:', navigator.onLine);
    console.log('- Do Not Track:', navigator.doNotTrack);
    console.log('- Language:', navigator.language);
    console.log('');

    // Check for Chrome-specific settings
    if (navigator.userAgent.includes('Chrome')) {
        console.log('🔍 Chrome-Specific Notes:');
        console.log('- Check chrome://settings/content/location');
        console.log('- Ensure localhost is not blocked');
        console.log('- Try incognito mode to test');
        console.log('');
    }
}

// Test 5: Try to force permission prompt
async function forcePermissionPrompt() {
    console.log('🔄 Attempting to Force Permission Prompt:');

    // Clear any cached permissions by using a different context
    try {
        // Try with a different timeout to see if it triggers the prompt
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: false,
                timeout: 5000,
                maximumAge: 0
            });
        });

        console.log('✅ Permission prompt worked!');
        console.log('Location:', position.coords.latitude, position.coords.longitude);

    } catch (error) {
        console.log('❌ Permission prompt failed:', error.message);
        console.log('Error code:', error.code);
    }
    console.log('');
}

// Test 6: Check for conflicting extensions or settings
function checkForConflicts() {
    console.log('🔍 Checking for Potential Conflicts:');
    console.log('- VPN/Proxy: Check if you\'re using a VPN that might block location');
    console.log('- Browser Extensions: Disable location-blocking extensions');
    console.log('- Windows Location Settings: Check Windows privacy settings');
    console.log('- Antivirus: Some antivirus software blocks location access');
    console.log('- Corporate Network: Some networks block location services');
    console.log('');
}

// Test 7: Test the specific SOS location function
async function testSOSLocationFunction() {
    console.log('🚨 Testing SOS Location Function:');

    // Check if the SOS function is available
    if (typeof window !== 'undefined' && window.getCurrentLocation) {
        try {
            console.log('✅ SOS getCurrentLocation function found');
            const location = await window.getCurrentLocation();
            console.log('✅ SOS location obtained:', location);
        } catch (error) {
            console.log('❌ SOS location failed:', error.message);
        }
    } else {
        console.log('⚠️ SOS getCurrentLocation function not available');
    }
    console.log('');
}

// Test 8: Check for global location cache
function checkGlobalLocationCache() {
    console.log('🗂️ Checking Global Location Cache:');

    if (typeof window !== 'undefined' && window.globalLocationCache) {
        const cache = window.globalLocationCache;
        console.log('✅ Global location cache found');
        console.log('- Position:', cache.position);
        console.log('- Age:', Math.floor((Date.now() - cache.timestamp) / 60000), 'minutes');
        console.log('- Cache is valid:', (Date.now() - cache.timestamp) < 300000);
    } else {
        console.log('❌ No global location cache found');
        console.log('💡 Try using the "Locate Me" button in the map first');
    }
    console.log('');
}

// Run all tests
async function runDebugTests() {
    console.log('🚀 Starting Location Debug Tests\n');
    console.log('='.repeat(60));

    checkBrowserSpecifics();
    await checkDetailedPermissions();
    await testGeolocationOptions();
    await forcePermissionPrompt();
    checkForConflicts();
    await testSOSLocationFunction();
    checkGlobalLocationCache();

    console.log('='.repeat(60));
    console.log('🎯 Debug Summary:');
    console.log('1. Check browser location settings');
    console.log('2. Try different geolocation options');
    console.log('3. Check for browser extensions');
    console.log('4. Verify Windows location permissions');
    console.log('5. Try incognito/private mode');
    console.log('6. Check if VPN is blocking location');
    console.log('\n💡 If permission shows "granted" but still fails:');
    console.log('- Try refreshing the page');
    console.log('- Clear browser cache and cookies');
    console.log('- Restart the browser');
    console.log('- Check Windows location privacy settings');
}

// Run the debug tests
runDebugTests().catch(console.error);

// Export functions for manual testing
window.locationDebug = {
    checkDetailedPermissions,
    testGeolocationOptions,
    forcePermissionPrompt,
    testSOSLocationFunction,
    checkGlobalLocationCache,
    runDebugTests
};

console.log('💡 Manual testing available: window.locationDebug.runDebugTests()'); 