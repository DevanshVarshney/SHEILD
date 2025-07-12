// Test script for location sharing between map and SOS
// Run this in the browser console to test the location cache functionality

console.log('🧪 Testing Location Sharing Between Map and SOS\n');

// Test 1: Check if global location cache exists
function checkLocationCache() {
    console.log('🔍 Checking Global Location Cache:');

    if (typeof window !== 'undefined' && window.globalLocationCache) {
        const cache = window.globalLocationCache;
        const age = Date.now() - cache.timestamp;
        const ageMinutes = Math.floor(age / 60000);

        console.log('✅ Global location cache found!');
        console.log('- Position:', cache.position);
        console.log('- Age:', ageMinutes, 'minutes ago');
        console.log('- Valid:', age < (5 * 60 * 1000) ? 'Yes' : 'No (expired)');

        return cache;
    } else {
        console.log('❌ No global location cache found');
        console.log('💡 Try using the "Locate Me" button in the map first');
        return null;
    }
    console.log('');
}

// Test 2: Simulate SOS location request
async function testSOSLocation() {
    console.log('🚨 Testing SOS Location Request:');

    // Check if we have cached location first
    const cache = checkLocationCache();

    if (cache && (Date.now() - cache.timestamp) < (5 * 60 * 1000)) {
        console.log('✅ SOS would use cached location from map');
        console.log('- Lat:', cache.position.lat);
        console.log('- Lng:', cache.position.lng);
        console.log('- No new geolocation request needed');
        return cache.position;
    } else {
        console.log('⚠️ No valid cached location, SOS would request new location');
        console.log('💡 This might cause geolocation conflicts');
        return null;
    }
    console.log('');
}

// Test 3: Check for geolocation conflicts
function checkForConflicts() {
    console.log('🔍 Checking for Geolocation Conflicts:');

    // Check if there are multiple geolocation requests
    const hasMapLocation = typeof window !== 'undefined' && window.globalLocationCache;
    const hasSOSLocation = typeof window !== 'undefined' && window.sosLocationRequested;

    if (hasMapLocation && hasSOSLocation) {
        console.log('⚠️ Both map and SOS have requested location');
        console.log('💡 This might cause permission conflicts');
    } else if (hasMapLocation) {
        console.log('✅ Only map has requested location');
        console.log('💡 SOS should use cached location');
    } else if (hasSOSLocation) {
        console.log('⚠️ Only SOS has requested location');
        console.log('💡 Map should also cache location');
    } else {
        console.log('❌ No location requests detected');
        console.log('💡 Try using the map or SOS functionality');
    }
    console.log('');
}

// Test 4: Simulate the complete flow
async function testCompleteFlow() {
    console.log('🔄 Testing Complete Location Flow:\n');

    // Step 1: Map gets location
    console.log('1️⃣ Map requests location...');
    if (typeof window !== 'undefined' && window.globalLocationCache) {
        console.log('   ✅ Map has cached location');
    } else {
        console.log('   ❌ Map has no cached location');
    }

    // Step 2: SOS tries to get location
    console.log('2️⃣ SOS requests location...');
    const sosLocation = await testSOSLocation();

    if (sosLocation) {
        console.log('   ✅ SOS got location (cached or fresh)');
    } else {
        console.log('   ❌ SOS failed to get location');
    }

    // Step 3: Check for conflicts
    console.log('3️⃣ Checking for conflicts...');
    checkForConflicts();

    console.log('🎯 Flow test completed!');
}

// Test 5: Manual location cache management
function manageLocationCache() {
    console.log('⚙️ Location Cache Management:');

    if (typeof window !== 'undefined') {
        if (window.globalLocationCache) {
            console.log('🗑️ Clearing location cache...');
            delete window.globalLocationCache;
            console.log('✅ Cache cleared');
        } else {
            console.log('📝 Creating test location cache...');
            window.globalLocationCache = {
                position: { lat: 26.0152, lng: 76.3606 },
                timestamp: Date.now()
            };
            console.log('✅ Test cache created');
        }
    }
    console.log('');
}

// Run all tests
async function runLocationSharingTests() {
    console.log('🚀 Starting Location Sharing Tests\n');
    console.log('='.repeat(60));

    checkLocationCache();
    await testSOSLocation();
    checkForConflicts();
    await testCompleteFlow();

    console.log('='.repeat(60));
    console.log('🎉 Location sharing tests completed!');
    console.log('\n📝 Recommendations:');
    console.log('1. Use "Locate Me" button in map first');
    console.log('2. Then try SOS functionality');
    console.log('3. SOS should use cached location from map');
    console.log('4. This prevents geolocation conflicts');
}

// Run the tests
runLocationSharingTests().catch(console.error);

// Export functions for manual testing
window.locationSharingTests = {
    checkLocationCache,
    testSOSLocation,
    checkForConflicts,
    testCompleteFlow,
    manageLocationCache,
    runLocationSharingTests
};

console.log('💡 Manual testing available: window.locationSharingTests.runLocationSharingTests()'); 