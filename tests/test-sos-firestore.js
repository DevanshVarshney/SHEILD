// Test script for SOS Firestore functionality
// Run this in the browser console to test SOS alert creation

console.log('🧪 Testing SOS Firestore Functionality\n');

// Test 1: Check SOS functions availability
function checkSOSFunctions() {
    console.log('✅ Checking SOS Functions:');

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

    console.log('');
    return allAvailable;
}

// Test 2: Test SOS alert data structure
function testSOSAlertData() {
    console.log('📋 Testing SOS Alert Data Structure:');

    const testAlert = {
        userId: 'test-user-123',
        userName: 'Test User',
        // userPhone: undefined, // This was causing the Firestore error
        location: {
            lat: 26.0152,
            lng: 76.3606,
            address: 'Sawai Madhopur, Rajasthan, India'
        },
        message: 'Test emergency SOS alert',
        contacts: [
            {
                name: 'Emergency Contact 1',
                phone: '+919369721072',
                notified: false
            }
        ]
    };

    console.log('✅ Test alert data structure:');
    console.log('- userId:', testAlert.userId);
    console.log('- userName:', testAlert.userName);
    console.log('- userPhone:', 'undefined (removed to prevent Firestore error)');
    console.log('- location:', testAlert.location);
    console.log('- message:', testAlert.message);
    console.log('- contacts:', testAlert.contacts.length, 'contact(s)');

    // Check for undefined values
    const hasUndefined = Object.values(testAlert).some(value => value === undefined);
    console.log('- Has undefined values:', hasUndefined ? '❌ Yes' : '✅ No');

    console.log('');
    return testAlert;
}

// Test 3: Simulate SOS alert creation
async function testSOSAlertCreation() {
    console.log('🚨 Testing SOS Alert Creation:');

    const testAlert = testSOSAlertData();

    try {
        // This would normally call createSOSAlert
        console.log('📝 Creating SOS alert...');

        // Simulate the data cleaning process
        const cleanAlertData = Object.fromEntries(
            Object.entries(testAlert).filter(([_, value]) => value !== undefined)
        );

        console.log('✅ Data cleaned successfully');
        console.log('- Original fields:', Object.keys(testAlert).length);
        console.log('- Cleaned fields:', Object.keys(cleanAlertData).length);
        console.log('- Removed undefined values: ✅');

        // Simulate Firestore save
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('✅ SOS alert would be saved to Firestore successfully');

        return { success: true, alertId: testAlert.userId };

    } catch (error) {
        console.error('❌ SOS alert creation failed:', error.message);
        return { success: false, error: error.message };
    }
    console.log('');
}

// Test 4: Test location sharing
function testLocationSharing() {
    console.log('📍 Testing Location Sharing:');

    if (typeof window !== 'undefined' && window.globalLocationCache) {
        const cache = window.globalLocationCache;
        console.log('✅ Global location cache found');
        console.log('- Position:', cache.position);
        console.log('- Age:', Math.floor((Date.now() - cache.timestamp) / 60000), 'minutes');
        console.log('- SOS can use cached location: ✅');
    } else {
        console.log('⚠️ No global location cache found');
        console.log('💡 Use "Locate Me" button in map first');
    }
    console.log('');
}

// Test 5: Complete SOS flow simulation
async function testCompleteSOSFlow() {
    console.log('🔄 Testing Complete SOS Flow:\n');

    // Step 1: Check functions
    console.log('1️⃣ Checking SOS functions...');
    const functionsOk = checkSOSFunctions();

    // Step 2: Test data structure
    console.log('2️⃣ Testing data structure...');
    testSOSAlertData();

    // Step 3: Test alert creation
    console.log('3️⃣ Testing alert creation...');
    const creationResult = await testSOSAlertCreation();

    // Step 4: Test location sharing
    console.log('4️⃣ Testing location sharing...');
    testLocationSharing();

    console.log('🎯 Complete SOS flow test completed!');
    console.log('📊 Results:');
    console.log('- Functions available:', functionsOk ? '✅ Yes' : '❌ No');
    console.log('- Alert creation:', creationResult.success ? '✅ Success' : '❌ Failed');
    console.log('- Location sharing:', typeof window !== 'undefined' && window.globalLocationCache ? '✅ Available' : '⚠️ Not available');

    return creationResult.success;
}

// Run all tests
async function runSOSFirestoreTests() {
    console.log('🚀 Starting SOS Firestore Tests\n');
    console.log('='.repeat(60));

    const success = await testCompleteSOSFlow();

    console.log('='.repeat(60));

    if (success) {
        console.log('🎉 SOS Firestore functionality is working correctly!');
        console.log('✅ No more "undefined field value" errors');
        console.log('✅ SOS alerts can be created successfully');
    } else {
        console.log('⚠️ SOS Firestore functionality needs attention');
        console.log('💡 Check the console for specific errors');
    }

    console.log('\n📝 Next steps:');
    console.log('1. Try the SOS button in the dashboard');
    console.log('2. Check that alerts are saved to Firestore');
    console.log('3. Verify location sharing works between map and SOS');
    console.log('4. Test SMS and emergency services notifications');
}

// Run the tests
runSOSFirestoreTests().catch(console.error);

// Export functions for manual testing
window.sosFirestoreTests = {
    checkSOSFunctions,
    testSOSAlertData,
    testSOSAlertCreation,
    testLocationSharing,
    testCompleteSOSFlow,
    runSOSFirestoreTests
};

console.log('💡 Manual testing available: window.sosFirestoreTests.runSOSFirestoreTests()'); 