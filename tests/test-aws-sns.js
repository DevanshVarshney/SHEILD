// Test script for AWS SNS SMS functionality
// Run with: node test-aws-sns.js

const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
require('dotenv').config({ path: '.env.local' });

// Initialize SNS client for India region
const sns = new SNSClient({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

async function testSMSSending() {
    try {
        console.log('🚀 Testing AWS SNS SMS functionality...\n');

        // Test phone number (replace with your test number)
        const testPhone = '+919369721072'; // Replace with actual test number

        // Test emergency message
        const emergencyMessage = `🚨 EMERGENCY SOS ALERT 🚨

Test emergency message from SHEILD

📍 Location: Sawai Madhopur, Rajasthan, India
⏰ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

This is an automated emergency alert from SHEILD.
For emergency assistance, contact local authorities immediately.

- SHEILD Emergency System
- This is a transactional message`;

        console.log('📱 Sending test SMS to:', testPhone);
        console.log('📝 Message:', emergencyMessage.substring(0, 100) + '...\n');

        const command = new PublishCommand({
            Message: emergencyMessage,
            PhoneNumber: testPhone,
            MessageAttributes: {
                'AWS.SNS.SMS.SMSType': {
                    DataType: 'String',
                    StringValue: 'Transactional'
                },
                'AWS.SNS.SMS.SenderID': {
                    DataType: 'String',
                    StringValue: process.env.AWS_SNS_SENDER_ID || 'SHEILD'
                }
            }
        });

        const result = await sns.send(command);

        console.log('✅ SMS sent successfully!');
        console.log('📋 Message ID:', result.MessageId);
        console.log('📞 Phone Number:', testPhone);
        console.log('💰 Cost: ~₹0.50 (within free tier)\n');

        return { success: true, messageId: result.MessageId };

    } catch (error) {
        console.error('❌ SMS sending failed:', error.message);

        // Handle specific AWS errors
        if (error.name === 'OptOutException') {
            console.error('📵 Phone number has opted out of SMS');
        } else if (error.name === 'InvalidParameterException') {
            console.error('📞 Invalid phone number format');
        } else if (error.name === 'ThrottledException') {
            console.error('⏱️ SMS rate limit exceeded');
        } else if (error.name === 'AuthorizationErrorException') {
            console.error('🔑 AWS credentials are invalid or missing');
            console.error('💡 Check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
        } else if (error.name === 'InvalidClientTokenId') {
            console.error('🔑 AWS access key is invalid');
        } else if (error.name === 'SignatureDoesNotMatch') {
            console.error('🔑 AWS secret key is invalid');
        }

        return { success: false, error: error.message };
    }
}

async function testConfiguration() {
    console.log('🔧 Testing AWS Configuration...\n');

    const requiredEnvVars = [
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_REGION'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        console.error('❌ Missing environment variables:', missingVars.join(', '));
        console.error('💡 Please add them to your .env.local file\n');
        return false;
    }

    console.log('✅ All required environment variables are set');
    console.log('🌍 AWS Region:', process.env.AWS_REGION);
    console.log('🆔 Sender ID:', process.env.AWS_SNS_SENDER_ID || 'SHEILD');
    console.log('💰 Monthly Limit:', process.env.AWS_SNS_MONTHLY_LIMIT || 'Not set');
    console.log('');

    return true;
}

async function main() {
    console.log('🇮🇳 AWS SNS Setup Test for India\n');
    console.log('='.repeat(50));

    // Test configuration first
    const configOk = await testConfiguration();
    if (!configOk) {
        process.exit(1);
    }

    // Test SMS sending
    const result = await testSMSSending();

    console.log('='.repeat(50));

    if (result.success) {
        console.log('🎉 AWS SNS setup is working correctly!');
        console.log('📱 You can now use SMS alerts in your SHEILD app');
    } else {
        console.log('⚠️ AWS SNS setup needs attention');
        console.log('📖 Check the AWS_SNS_SETUP.md guide for troubleshooting');
    }

    console.log('\n📚 Next steps:');
    console.log('1. Replace the test phone number with a real one');
    console.log('2. Test with your actual emergency contacts');
    console.log('3. Monitor SMS delivery in AWS SNS console');
    console.log('4. Set up spending limits to control costs');
}

// Run the test
main().catch(console.error); 