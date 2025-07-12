import { NextRequest, NextResponse } from 'next/server';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { GetSMSAttributesCommand } from '@aws-sdk/client-sns';

// Initialize SNS client for India region
const sns = new SNSClient({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
});

export async function POST(request: NextRequest) {
    try {
        const { phone, message, location } = await request.json();

        // Validate input
        if (!phone || !message) {
            return NextResponse.json(
                { success: false, error: 'Phone number and message are required' },
                { status: 400 }
            );
        }

        try {
            const sns = new SNSClient({
                region: process.env.AWS_REGION || 'eu-north-1',
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
                }
            });

            // Only check MonthlySpendLimit - this is a valid attribute
            const quotaCheck = await sns.send(new GetSMSAttributesCommand({
                attributes: ['MonthlySpendLimit']
            }));

            // Check if monthly spend limit is set and not exceeded
            const monthlySpendLimit = Number(quotaCheck.attributes?.MonthlySpendLimit || 0);
            if (monthlySpendLimit === 0) {
                console.warn('⚠️ AWS SNS monthly spend limit is not set or reached');
                return NextResponse.json({
                    success: false,
                    error: 'SMS quota limit reached',
                    quotaExceeded: true,
                    fallbackAvailable: true
                });
            }

            // Format phone number for India (+91)
            const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone.replace(/\D/g, '')}`;

            // Create emergency SMS message
            const emergencyMessage = `🚨 EMERGENCY SOS ALERT 🚨

${message}

📍 Location: ${location || 'Unknown location'}
⏰ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

This is an automated emergency alert from SHEILD.
For emergency assistance, contact local authorities immediately.

- SHEILD Emergency System
- This is a transactional message`;

            console.log(`📱 Sending real SMS to ${formattedPhone}`);

            const command = new PublishCommand({
                Message: emergencyMessage,
                PhoneNumber: formattedPhone,
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

            console.log(`✅ SMS sent successfully to ${formattedPhone}:`, result.MessageId);

            return NextResponse.json({
                success: true,
                messageId: result.MessageId,
                phone: formattedPhone
            });

        } catch (error: any) {
            console.error('AWS SNS Error:', error);

            // Check for specific AWS errors
            if (error.name === 'InvalidParameter' || error.message?.includes('quota')) {
                return NextResponse.json({
                    success: false,
                    error: 'SMS quota exceeded or invalid parameter',
                    quotaExceeded: true,
                    fallbackAvailable: true
                });
            }

            // Handle throttling errors
            if (error.name === 'ThrottlingException') {
                return NextResponse.json({
                    success: false,
                    error: 'SMS sending rate limited',
                    shouldRetry: true
                });
            }

            return NextResponse.json({
                success: false,
                error: error.message || 'Failed to send SMS'
            });
        }

    } catch (error: any) {
        console.error('SMS API Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Failed to send SMS'
        });
    }
} 