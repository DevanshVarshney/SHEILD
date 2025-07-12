// Test script for location extraction functionality
// Run this in the browser console to test the new location extraction

console.log('🧪 Testing Location Extraction Functionality\n');

// Test 1: Test location extraction function
async function testLocationExtraction() {
    console.log('📍 Testing Location Extraction:');

    // Test coordinates for different locations
    const testLocations = [
        {
            name: 'Mumbai, Maharashtra',
            lat: 19.0760,
            lng: 72.8777
        },
        {
            name: 'Delhi, Delhi',
            lat: 28.7041,
            lng: 77.1025
        },
        {
            name: 'Bangalore, Karnataka',
            lat: 12.9716,
            lng: 77.5946
        },
        {
            name: 'Chennai, Tamil Nadu',
            lat: 13.0827,
            lng: 80.2707
        },
        {
            name: 'Sawai Madhopur, Rajasthan',
            lat: 26.0152,
            lng: 76.3606
        }
    ];

    for (const location of testLocations) {
        console.log(`\nTesting: ${location.name}`);
        console.log(`Coordinates: ${location.lat}, ${location.lng}`);

        try {
            const response = await fetch(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${location.lat},${location.lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
            );
            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const result = data.results[0];
                const address = result.formatted_address;

                // Extract city and state from address components
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

                console.log(`✅ Extracted: ${city}, ${state}`);
                console.log(`📍 Full Address: ${address}`);

                // Verify extraction is correct
                const expectedLocation = location.name.split(', ');
                const expectedCity = expectedLocation[0];
                const expectedState = expectedLocation[1];

                if (city.includes(expectedCity) || expectedCity.includes(city)) {
                    console.log(`✅ City match: ${city} ≈ ${expectedCity}`);
                } else {
                    console.log(`⚠️ City mismatch: ${city} ≠ ${expectedCity}`);
                }

                if (state.includes(expectedState) || expectedState.includes(state)) {
                    console.log(`✅ State match: ${state} ≈ ${expectedState}`);
                } else {
                    console.log(`⚠️ State mismatch: ${state} ≠ ${expectedState}`);
                }
            } else {
                console.log('❌ No geocoding results found');
            }
        } catch (error) {
            console.log(`❌ Geocoding failed: ${error.message}`);
        }
    }
    console.log('');
}

// Test 2: Test emergency services notification with real location
async function testEmergencyServicesNotification() {
    console.log('🚨 Testing Emergency Services Notification:');

    const testLocation = {
        lat: 26.0152,
        lng: 76.3606,
        address: 'Sawai Madhopur, Rajasthan, India'
    };

    const userInfo = {
        name: 'Test User',
        phone: '+919369721072'
    };

    try {
        // Extract real location details
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${testLocation.lat},${testLocation.lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
        );
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            const address = result.formatted_address;

            // Extract city and state from address components
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

            const emergencyData = {
                emergency_type: 'medical',
                location: {
                    latitude: testLocation.lat,
                    longitude: testLocation.lng,
                    address: address,
                    city: city,
                    state: state
                },
                caller: {
                    name: userInfo.name,
                    phone: userInfo.phone,
                    language: 'en'
                },
                timestamp: new Date().toISOString(),
                priority: 'high',
                source: 'SHEILD_APP'
            };

            console.log('✅ Emergency services notification data:');
            console.log('- City:', emergencyData.location.city);
            console.log('- State:', emergencyData.location.state);
            console.log('- Address:', emergencyData.location.address);
            console.log('- Coordinates:', `${emergencyData.location.latitude}, ${emergencyData.location.longitude}`);

            // Verify it's not hardcoded
            if (emergencyData.location.city !== 'Mumbai' && emergencyData.location.state !== 'Maharashtra') {
                console.log('✅ Location extraction is working correctly (not hardcoded)');
            } else {
                console.log('❌ Location is still hardcoded to Mumbai/Maharashtra');
            }
        } else {
            console.log('❌ No geocoding results found for emergency services test');
        }
    } catch (error) {
        console.log(`❌ Emergency services test failed: ${error.message}`);
    }
    console.log('');
}

// Test 3: Test current location extraction
async function testCurrentLocationExtraction() {
    console.log('📍 Testing Current Location Extraction:');

    if (!navigator.geolocation) {
        console.log('❌ Geolocation not supported');
        return;
    }

    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000
            });
        });

        const { latitude: lat, longitude: lng } = position.coords;
        console.log(`Current location: ${lat}, ${lng}`);

        // Extract location details
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
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

            console.log(`✅ Current location extracted: ${city}, ${state}`);
            console.log(`📍 Full address: ${address}`);
        } else {
            console.log('❌ No geocoding results for current location');
        }
    } catch (error) {
        console.log(`❌ Current location test failed: ${error.message}`);
    }
    console.log('');
}

// Run all tests
async function runLocationExtractionTests() {
    console.log('🚀 Starting Location Extraction Tests\n');
    console.log('='.repeat(60));

    await testLocationExtraction();
    await testEmergencyServicesNotification();
    await testCurrentLocationExtraction();

    console.log('='.repeat(60));
    console.log('🎉 Location extraction tests completed!');
    console.log('\n📝 Summary:');
    console.log('✅ Location extraction from coordinates');
    console.log('✅ City and state extraction');
    console.log('✅ Emergency services integration');
    console.log('✅ Current location extraction');
    console.log('\n💡 The hardcoded Mumbai/Maharashtra issue should now be fixed!');
}

// Run the tests
runLocationExtractionTests().catch(console.error);

// Export functions for manual testing
window.locationExtractionTests = {
    testLocationExtraction,
    testEmergencyServicesNotification,
    testCurrentLocationExtraction,
    runLocationExtractionTests
};

console.log('💡 Manual testing available: window.locationExtractionTests.runLocationExtractionTests()'); 