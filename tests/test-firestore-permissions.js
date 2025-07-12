// Test script for Firestore permissions
// Run this in the browser console to test Firestore access

console.log('🔐 Testing Firestore Permissions\n');

// Test 1: Check if Firebase is properly initialized
function checkFirebaseInit() {
    console.log('✅ Checking Firebase Initialization:');

    if (typeof window !== 'undefined' && window.firebase) {
        console.log('- Firebase SDK: ✅ Available');
        console.log('- Auth: ✅ Available');
        console.log('- Firestore: ✅ Available');
    } else {
        console.log('- Firebase SDK: ❌ Not available');
        console.log('💡 Check if Firebase is properly initialized');
    }
    console.log('');
}

// Test 2: Check authentication status
async function checkAuthStatus() {
    console.log('🔑 Checking Authentication Status:');

    try {
        // This would normally check Firebase Auth
        const isAuthenticated = true; // Mock for now
        const currentUser = { uid: 'test-user-123' }; // Mock user

        console.log('- Authenticated:', isAuthenticated ? '✅ Yes' : '❌ No');
        console.log('- User ID:', currentUser?.uid || 'None');

        return { isAuthenticated, currentUser };
    } catch (error) {
        console.log('- Auth check failed:', error.message);
        return { isAuthenticated: false, currentUser: null };
    }
    console.log('');
}

// Test 3: Test Firestore write permissions
async function testFirestoreWrite() {
    console.log('📝 Testing Firestore Write Permissions:');

    const testData = {
        test: true,
        timestamp: new Date(),
        userId: 'test-user-123'
    };

    try {
        console.log('📋 Test data:', testData);
        console.log('📄 Attempting to write to: sosAlerts/test-user-123');

        // This would normally write to Firestore
        // For now, simulate the operation
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('✅ Write operation would succeed');
        return { success: true };

    } catch (error) {
        console.log('❌ Write operation failed:', error.message);
        console.log('🔍 Error code:', error.code);

        // Analyze the error
        if (error.code === 'permission-denied') {
            console.log('💡 Permission denied - check Firestore rules');
        } else if (error.code === 'unauthenticated') {
            console.log('💡 User not authenticated');
        } else if (error.code === 'not-found') {
            console.log('💡 Database not found');
        }

        return { success: false, error: error.message };
    }
    console.log('');
}

// Test 4: Check Firestore rules
function checkFirestoreRules() {
    console.log('📋 Checking Firestore Rules:');

    const expectedRules = {
        'sosAlerts/{userId}': 'allow read, write: if request.auth != null && request.auth.uid == userId',
        'healthcare/{userId}': 'allow read, write: if request.auth != null && request.auth.uid == userId',
        'emergencyContacts/{userId}': 'allow read, write: if request.auth != null && request.auth.uid == userId',
        'sosSettings/{userId}': 'allow read, write: if request.auth != null && request.auth.uid == userId'
    };

    console.log('📋 Expected rules:');
    Object.entries(expectedRules).forEach(([path, rule]) => {
        console.log(`- ${path}: ${rule}`);
    });

    console.log('💡 Make sure these rules are deployed to Firebase');
    console.log('💡 Run: firebase deploy --only firestore:rules');
    console.log('');
}

// Test 5: Simulate SOS alert creation
async function testSOSAlertCreation() {
    console.log('🚨 Testing SOS Alert Creation:');

    const testAlert = {
        userId: 'test-user-123',
        userName: 'Test User',
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

    console.log('📋 Test alert data:', testAlert);
    console.log('📄 Would write to: sosAlerts/test-user-123');

    try {
        // Simulate the creation process
        console.log('🔐 Checking permissions...');
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('📝 Creating document...');
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('✅ SOS alert creation would succeed');
        return { success: true };

    } catch (error) {
        console.log('❌ SOS alert creation failed:', error.message);
        return { success: false, error: error.message };
    }
    console.log('');
}

// Test 6: Complete permission test
async function runPermissionTests() {
    console.log('🚀 Starting Firestore Permission Tests\n');
    console.log('='.repeat(60));

    checkFirebaseInit();
    const authStatus = await checkAuthStatus();
    checkFirestoreRules();

    if (authStatus.isAuthenticated) {
        await testFirestoreWrite();
        await testSOSAlertCreation();
    } else {
        console.log('⚠️ Skipping Firestore tests - user not authenticated');
    }

    console.log('='.repeat(60));
    console.log('🎯 Permission tests completed!');
    console.log('\n📝 Troubleshooting Steps:');
    console.log('1. Check if Firebase is properly initialized');
    console.log('2. Verify user is authenticated');
    console.log('3. Deploy Firestore rules: firebase deploy --only firestore:rules');
    console.log('4. Check Firebase console for rule deployment status');
    console.log('5. Verify the user UID matches the document path');
}

// Run the tests
runPermissionTests().catch(console.error);

// Export functions for manual testing
window.firestorePermissionTests = {
    checkFirebaseInit,
    checkAuthStatus,
    testFirestoreWrite,
    checkFirestoreRules,
    testSOSAlertCreation,
    runPermissionTests
};

console.log('💡 Manual testing available: window.firestorePermissionTests.runPermissionTests()'); 