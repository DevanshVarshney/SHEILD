// Test script for location permissions and geolocation
// Run this in the browser console to debug location issues

console.log('🧪 Testing Location Permissions and Geolocation\n');

// Test 1: Check if geolocation is supported
console.log('✅ Geolocation Support Check:');
console.log('- navigator.geolocation:', !!navigator.geolocation);
console.log('- navigator.permissions:', !!navigator.permissions);
console.log('');

// Test 2: Check current permission status
async function checkPermissionStatus() {
    console.log('🔐 Permission Status Check:');

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
async function testGeolocation() {
    console.log('📍 Geolocation Test:');

    if (!navigator.geolocation) {
        console.log('❌ Geolocation not supported');
        return;
    }

    const options = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 600000
    };

    console.log('🔧 Using options:', options);
    console.log('⏳ Requesting location...');

    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });

        console.log('✅ Location obtained successfully!');
        console.log('- Latitude:', position.coords.latitude);
        console.log('- Longitude:', position.coords.longitude);
        console.log('- Accuracy:', position.coords.accuracy, 'meters');
        console.log('- Timestamp:', new Date(position.timestamp).toLocaleString());

        // Test address resolution
        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${position.coords.latitude},${position.coords.longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
            );
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                console.log('✅ Address resolved:', data.results[0].formatted_address);
            } else {
                console.log('⚠️ Address resolution failed:', data.status);
            }
        } catch (error) {
            console.log('⚠️ Address resolution error:', error.message);
        }

    } catch (error) {
        console.log('❌ Geolocation failed:', error.message);
        console.log('- Error Code:', error.code);

        switch (error.code) {
            case error.PERMISSION_DENIED:
                console.log('💡 Solution: Enable location permissions in browser settings');
                break;
            case error.POSITION_UNAVAILABLE:
                console.log('💡 Solution: Check your internet connection and try again');
                break;
            case error.TIMEOUT:
                console.log('💡 Solution: Try again or check your GPS signal');
                break;
        }
    }
    console.log('');
}

// Test 4: Browser-specific checks
function checkBrowserInfo() {
    console.log('🌐 Browser Information:');
    console.log('- User Agent:', navigator.userAgent);
    console.log('- Platform:', navigator.platform);
    console.log('- Cookie Enabled:', navigator.cookieEnabled);
    console.log('- Online:', navigator.onLine);
    console.log('- Connection:', navigator.connection ? navigator.connection.effectiveType : 'Unknown');
    console.log('');
}

// Test 5: Security context check
function checkSecurityContext() {
    console.log('🔒 Security Context:');
    console.log('- Protocol:', window.location.protocol);
    console.log('- Host:', window.location.host);
    console.log('- HTTPS:', window.location.protocol === 'https:');
    console.log('- Localhost:', window.location.hostname === 'localhost');
    console.log('- 127.0.0.1:', window.location.hostname === '127.0.0.1');
    console.log('');
}

// Run all tests
async function runLocationTests() {
    console.log('🚀 Starting Location Permission Tests\n');
    console.log('='.repeat(50));

    checkBrowserInfo();
    checkSecurityContext();
    await checkPermissionStatus();
    await testGeolocation();

    console.log('='.repeat(50));
    console.log('🎉 Location tests completed!');
    console.log('\n📝 Troubleshooting Tips:');
    console.log('1. Ensure you\'re on HTTPS or localhost');
    console.log('2. Check browser location permissions');
    console.log('3. Try refreshing the page');
    console.log('4. Check if GPS is enabled on mobile');
    console.log('5. Clear browser cache and try again');
    console.log('\n💡 If location works in map but not SOS:');
    console.log('- The map might be using cached location');
    console.log('- SOS requests fresh location with different options');
    console.log('- Try the "Locate Me" button in the map first');
}

// Run the tests
runLocationTests().catch(console.error);

// Export functions for manual testing
window.locationTests = {
    checkPermissionStatus,
    testGeolocation,
    checkBrowserInfo,
    checkSecurityContext,
    runLocationTests
};

console.log('💡 Manual testing available: window.locationTests.runLocationTests()'); 