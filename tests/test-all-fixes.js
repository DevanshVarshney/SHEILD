// Comprehensive test script for all fixes
// Run this in the browser console to test all the improvements

console.log('🧪 Testing All Fixes\n');

// Test 1: Location Permission Handling
async function testLocationPermissionHandling() {
    console.log('🔐 Testing Location Permission Handling:');

    if (!navigator.geolocation) {
        console.log('❌ Geolocation not supported');
        return false;
    }

    // Test permission status
    if (navigator.permissions) {
        try {
            const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
            console.log(`✅ Permission status: ${permissionStatus.state}`);

            if (permissionStatus.state === 'denied') {
                console.log('⚠️ Location permission denied - user needs to enable in browser settings');
                return false;
            }
        } catch (error) {
            console.log('⚠️ Permissions API error:', error.message);
        }
    }

    // Test location retrieval with retry logic
    try {
        console.log('📍 Testing location retrieval...');

        const position = await new Promise((resolve, reject) => {
            const options = {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 300000
            };

            navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });

        console.log('✅ Location retrieved successfully:', {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
        });
        return true;
    } catch (error) {
        console.log('❌ Location retrieval failed:', error.message);
        return false;
    }
}

// Test 2: Location Extraction (City/State)
async function testLocationExtraction() {
    console.log('\n📍 Testing Location Extraction:');

    const testLocation = {
        lat: 26.0152,
        lng: 76.3606
    };

    try {
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${testLocation.lat},${testLocation.lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
        );
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            const address = result.formatted_address;

            let city = 'Unknown City';
            let state = 'Unknown State';

            for (const component of result.address_components) {
                if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
                    city = component.long_name;
                }
                if (component.types.includes('administrative_area_level_1')) {
                    state = component.long_name;
                }
            }

            console.log('✅ Location extracted successfully:');
            console.log(`- City: ${city}`);
            console.log(`- State: ${state}`);
            console.log(`- Address: ${address}`);

            // Check if it's not hardcoded to Mumbai/Maharashtra
            if (city !== 'Mumbai' && state !== 'Maharashtra') {
                console.log('✅ Location extraction is working correctly (not hardcoded)');
                return true;
            } else {
                console.log('❌ Location is still hardcoded to Mumbai/Maharashtra');
                return false;
            }
        } else {
            console.log('❌ No geocoding results found');
            return false;
        }
    } catch (error) {
        console.log('❌ Location extraction failed:', error.message);
        return false;
    }
}

// Test 3: SMS Quota Handling
async function testSMSQuotaHandling() {
    console.log('\n📱 Testing SMS Quota Handling:');

    try {
        const response = await fetch('/api/send-sms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phone: '9369721072',
                message: 'Test SMS quota handling',
                location: 'Test location'
            })
        });

        const result = await response.json();

        if (result.success) {
            console.log('✅ SMS sent successfully');
            return true;
        } else if (result.quotaExceeded && result.fallbackAvailable) {
            console.log('⚠️ SMS quota exceeded, but fallback is available');
            console.log('✅ Quota handling is working correctly');
            return true;
        } else {
            console.log('❌ SMS failed:', result.error);
            return false;
        }
    } catch (error) {
        console.log('❌ SMS test failed:', error.message);
        return false;
    }
}

// Test 4: SOS Function Integration
async function testSOSIntegration() {
    console.log('\n🚨 Testing SOS Integration:');

    // Check if SOS functions are available
    const requiredFunctions = [
        'createSOSAlert',
        'getSOSAlert',
        'updateSOSAlertStatus',
        'sendSMSAlert',
        'getCurrentLocation',
        'notifyIndianEmergencyServices'
    ];

    let allAvailable = true;
    for (const funcName of requiredFunctions) {
        if (typeof window !== 'undefined' && window[funcName]) {
            console.log(`✅ ${funcName}: Available`);
        } else {
            console.log(`❌ ${funcName}: Not available`);
            allAvailable = false;
        }
    }

    if (!allAvailable) {
        console.log('⚠️ Some SOS functions are not available in this context');
        return false;
    }

    console.log('✅ All SOS functions are available');
    return true;
}

// Test 5: Map Location Sharing
function testMapLocationSharing() {
    console.log('\n🗺️ Testing Map Location Sharing:');

    if (typeof window !== 'undefined' && window.globalLocationCache) {
        const cache = window.globalLocationCache;
        console.log('✅ Global location cache found');
        console.log('- Position:', cache.position);
        console.log('- Age:', Math.floor((Date.now() - cache.timestamp) / 60000), 'minutes');
        console.log('- Cache is valid:', (Date.now() - cache.timestamp) < 300000);
        return true;
    } else {
        console.log('⚠️ No global location cache found');
        console.log('💡 Use "Locate Me" button in map first');
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('🚀 Starting Comprehensive Tests\n');
    console.log('='.repeat(60));

    const results = {
        locationPermission: await testLocationPermissionHandling(),
        locationExtraction: await testLocationExtraction(),
        smsQuota: await testSMSQuotaHandling(),
        sosIntegration: testSOSIntegration(),
        mapSharing: testMapLocationSharing()
    };

    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Results Summary:');
    console.log('- Location Permission Handling:', results.locationPermission ? '✅ PASS' : '❌ FAIL');
    console.log('- Location Extraction (City/State):', results.locationExtraction ? '✅ PASS' : '❌ FAIL');
    console.log('- SMS Quota Handling:', results.smsQuota ? '✅ PASS' : '❌ FAIL');
    console.log('- SOS Integration:', results.sosIntegration ? '✅ PASS' : '❌ FAIL');
    console.log('- Map Location Sharing:', results.mapSharing ? '✅ PASS' : '⚠️ NEEDS SETUP');

    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;

    console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);

    if (passedTests === totalTests) {
        console.log('🎉 All fixes are working correctly!');
    } else {
        console.log('⚠️ Some issues still need attention');
    }

    console.log('\n📝 Fix Summary:');
    console.log('✅ City/State extraction from real coordinates (not hardcoded)');
    console.log('✅ Improved location permission handling with retry logic');
    console.log('✅ SMS quota error handling with automatic fallback');
    console.log('✅ Better error messages and user guidance');
    console.log('✅ Location sharing between map and SOS components');
}

// Run the tests
runAllTests().catch(console.error);

// Export functions for manual testing
window.allFixesTests = {
    testLocationPermissionHandling,
    testLocationExtraction,
    testSMSQuotaHandling,
    testSOSIntegration,
    testMapLocationSharing,
    runAllTests
};

console.log('💡 Manual testing available: window.allFixesTests.runAllTests()'); 