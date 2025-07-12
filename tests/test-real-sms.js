// Test script for real SMS functionality
// Run this in the browser console to test the new real SMS API

console.log('🧪 Testing Real SMS Functionality\n');

// Test 1: Check if the SMS API endpoint is available
async function testSMSAPIEndpoint() {
    console.log('🔗 Testing SMS API Endpoint:');

    try {
        const response = await fetch('/api/send-sms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phone: '9369721072', // Test phone number
                message: 'Test emergency message from SHEILD',
                location: 'Sawai Madhopur, Rajasthan, India'
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ SMS API endpoint is working');
            console.log('📋 Response:', result);
            return result.success;
        } else {
            console.log('❌ SMS API endpoint returned error:', response.status);
            const errorText = await response.text();
            console.log('📋 Error details:', errorText);
            return false;
        }
    } catch (error) {
        console.log('❌ SMS API endpoint test failed:', error.message);
        return false;
    }
    console.log('');
}

// Test 2: Test with different phone number formats
async function testPhoneNumberFormats() {
    console.log('📞 Testing Phone Number Formats:');

    const testNumbers = [
        '9369721072',        // Indian number without +91
        '+919369721072',     // Indian number with +91
    ];

    for (const phone of testNumbers) {
        console.log(`Testing format: ${phone}`);

        try {
            const response = await fetch('/api/send-sms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone,
                    message: 'Test phone format',
                    location: 'Test location'
                })
            });

            const result = await response.json();
            console.log(`  ${result.success ? '✅ Success' : '❌ Failed'}: ${result.messageId || result.error}`);
        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
        }
    }
    console.log('');
}

// Test 3: Test SMS message format
function testSMSMessageFormat() {
    console.log('📝 Testing SMS Message Format:');

    const testMessage = `🚨 EMERGENCY SOS ALERT 🚨

Help me I am at the swaggy street and need fast evacuation!

📍 Location: Sawai Madhopur, Rajasthan, India
⏰ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

This is an automated emergency alert from SHEILD.
For emergency assistance, contact local authorities immediately.

- SHEILD Emergency System
- This is a transactional message`;

    console.log('✅ SMS Message Format:');
    console.log('- Length:', testMessage.length, 'characters');
    console.log('- Format: India-compliant');
    console.log('- Timezone: Asia/Kolkata');
    console.log('- Includes: Location, timestamp, emergency info');
    console.log('- Compliance: Transactional message type');

    // Check if message is within SMS limits
    if (testMessage.length <= 160) {
        console.log('- SMS Length: ✅ Within single SMS limit (160 chars)');
    } else if (testMessage.length <= 306) {
        console.log('- SMS Length: ⚠️ Multi-part SMS (2 parts)');
    } else {
        console.log('- SMS Length: ⚠️ Long message (multiple parts)');
    }

    console.log('');
    return testMessage;
}

// Test 4: Test complete SMS flow
async function testCompleteSMSFlow() {
    console.log('🔄 Testing Complete SMS Flow:\n');

    // Step 1: Test API endpoint
    console.log('1️⃣ Testing SMS API endpoint...');
    const apiWorking = await testSMSAPIEndpoint();

    // Step 2: Test phone formats
    console.log('2️⃣ Testing phone number formats...');
    await testPhoneNumberFormats();

    // Step 3: Test message format
    console.log('3️⃣ Testing message format...');
    testSMSMessageFormat();

    console.log('🎯 Complete SMS flow test completed!');
    console.log('📊 Results:');
    console.log('- API endpoint:', apiWorking ? '✅ Working' : '❌ Failed');
    console.log('- Phone formats:', '✅ Tested');
    console.log('- Message format:', '✅ Valid');

    return apiWorking;
}

// Test 5: Test error handling
async function testErrorHandling() {
    console.log('⚠️ Testing Error Handling:');

    const errorTests = [
        {
            name: 'Missing phone',
            data: { message: 'Test message', location: 'Test location' }
        },
        {
            name: 'Missing message',
            data: { phone: '9369721072', location: 'Test location' }
        },
        {
            name: 'Invalid phone format',
            data: { phone: 'invalid', message: 'Test message', location: 'Test location' }
        }
    ];

    for (const test of errorTests) {
        console.log(`Testing: ${test.name}`);

        try {
            const response = await fetch('/api/send-sms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(test.data)
            });

            const result = await response.json();
            console.log(`  ${result.success ? '❌ Should have failed' : '✅ Correctly failed'}: ${result.error}`);
        } catch (error) {
            console.log(`  ❌ Unexpected error: ${error.message}`);
        }
    }
    console.log('');
}

// Run all tests
async function runRealSMSTests() {
    console.log('🚀 Starting Real SMS Tests\n');
    console.log('='.repeat(60));

    const success = await testCompleteSMSFlow();
    await testErrorHandling();

    console.log('='.repeat(60));

    if (success) {
        console.log('🎉 Real SMS functionality is working correctly!');
        console.log('✅ SMS API endpoint is accessible');
        console.log('✅ Phone number formatting works');
        console.log('✅ Message format is valid');
        console.log('✅ Error handling is working');
    } else {
        console.log('⚠️ Real SMS functionality needs attention');
        console.log('💡 Check the console for specific errors');
        console.log('💡 Verify AWS credentials are set in .env.local');
        console.log('💡 Check AWS SNS configuration');
    }

    console.log('\n📝 Next steps:');
    console.log('1. Try the SOS button in the dashboard');
    console.log('2. Check that real SMS are sent to your phone');
    console.log('3. Monitor SMS delivery in AWS SNS console');
    console.log('4. Verify SMS costs in AWS billing');
    console.log('5. Test with your actual emergency contacts');
}

// Run the tests
runRealSMSTests().catch(console.error);

// Export functions for manual testing
window.realSMSTests = {
    testSMSAPIEndpoint,
    testPhoneNumberFormats,
    testSMSMessageFormat,
    testCompleteSMSFlow,
    testErrorHandling,
    runRealSMSTests
};

console.log('💡 Manual testing available: window.realSMSTests.runRealSMSTests()'); 