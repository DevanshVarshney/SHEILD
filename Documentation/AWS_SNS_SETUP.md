# AWS SNS Setup Guide for India

This guide will help you set up AWS SNS for SMS alerts in India, including free tier usage and compliance with Indian SMS regulations.

## 🇮🇳 India-Specific Considerations

### **SMS Regulations in India**
- **DND (Do Not Disturb) Compliance**: Must respect TRAI's DND registry
- **Sender ID**: Must be pre-approved by telecom operators
- **Message Templates**: Must be pre-approved for promotional messages
- **Emergency Messages**: Have different compliance requirements

### **AWS SNS Free Tier for India**
- **1,000 SMS per month** (first 12 months)
- **$0.0069 per SMS** after free tier (as of 2024)
- **No setup fees**
- **Pay-as-you-go pricing**

## 🔧 Step-by-Step Setup

### **1. Create AWS Account**

1. **Go to AWS Console**: https://aws.amazon.com/
2. **Click "Create an AWS Account"**
3. **Fill in your details**:
   - Email address
   - Password
   - AWS account name
4. **Add payment information** (required even for free tier)
5. **Verify your identity** (phone verification)

### **2. Set Up SNS Service**

1. **Login to AWS Console**
2. **Search for "SNS"** in the services search bar
3. **Click on "Simple Notification Service"**
4. **Click "Get started with Amazon SNS"**

### **3. Configure SMS Settings**

1. **In SNS Console, go to "Text messaging (SMS)"**
2. **Click "Preferences"**
3. **Configure SMS settings**:

```json
{
  "Default SMS Type": "Transactional",
  "Default Sender ID": "SHEILD",
  "Monthly SMS Spending Limit": "5.00",
  "Delivery Status IAM Role": "Create new role"
}
```

### **4. Set Up IAM User for SNS**

1. **Go to IAM Console**
2. **Click "Users" → "Create user"**
3. **User name**: `sns-sms-user`
4. **Select "Programmatic access"**
5. **Attach policies**: `AmazonSNSFullAccess`
6. **Create user and save credentials**

### **5. Configure SMS Preferences for India**

1. **In SNS Console, go to "Text messaging (SMS)"**
2. **Click "Preferences"**
3. **Set up India-specific settings**:

```json
{
  "Default SMS Type": "Transactional",
  "Default Sender ID": "SHEILD",
  "Monthly SMS Spending Limit": "5.00",
  "Delivery Status IAM Role": "sns-sms-role",
  "Region": "ap-south-1 (Mumbai)"
}
```

## 📱 SMS Configuration for Emergency Alerts

### **Emergency SMS Template (India Compliant)**

```typescript
// Emergency SMS template that complies with Indian regulations
const emergencySMSTemplate = {
  message: `🚨 EMERGENCY SOS ALERT 🚨

${userMessage}

📍 Location: ${location}
👤 User: ${userName}
⏰ Time: ${timestamp}

This is an automated emergency alert from SHEILD.
For emergency assistance, contact local authorities immediately.

- SHEILD Emergency System
- This is a transactional message
- Reply STOP to unsubscribe`
};
```

### **SMS Type Classification**
- **Transactional**: Emergency alerts, account notifications
- **Promotional**: Marketing messages (not allowed for emergency alerts)

## 🔑 Environment Variables Setup

### **Create `.env.local` file**:

```env
# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=ap-south-1

# SNS Configuration
AWS_SNS_SENDER_ID=SHEILD
AWS_SNS_MONTHLY_LIMIT=5.00

# Emergency Services (India)
EMERGENCY_SERVICES_NUMBER=100
POLICE_NUMBER=100
AMBULANCE_NUMBER=102
FIRE_NUMBER=101
```

## 💻 Code Implementation

### **1. Install AWS SDK**

```bash
npm install @aws-sdk/client-sns
```

### **2. Update SMS Function in `src/lib/sos.ts`**

```typescript
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

// Initialize SNS client for India region
const sns = new SNSClient({ 
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

// India-compliant SMS function
async function sendSMS(phone: string, message: string, location: string) {
  try {
    // Format phone number for India (+91)
    const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone.replace(/\D/g, '')}`;
    
    // Create emergency SMS message
    const emergencyMessage = `🚨 EMERGENCY SOS ALERT 🚨

${message}

📍 Location: ${location}
⏰ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

This is an automated emergency alert from SHEILD.
For emergency assistance, contact local authorities immediately.

- SHEILD Emergency System
- This is a transactional message`;

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
    
    console.log(`SMS sent successfully to ${formattedPhone}:`, result.MessageId);
    
    return { 
      success: true, 
      messageId: result.MessageId,
      phone: formattedPhone
    };
  } catch (error: any) {
    console.error('SMS sending failed:', error);
    
    // Handle specific AWS errors
    if (error.name === 'OptOutException') {
      return { 
        success: false, 
        error: 'Phone number has opted out of SMS' 
      };
    } else if (error.name === 'InvalidParameterException') {
      return { 
        success: false, 
        error: 'Invalid phone number format' 
      };
    } else if (error.name === 'ThrottledException') {
      return { 
        success: false, 
        error: 'SMS rate limit exceeded' 
      };
    }
    
    return { 
      success: false, 
      error: error.message || 'SMS service unavailable' 
    };
  }
}
```

### **3. Add Emergency Services Integration for India**

```typescript
// India emergency services integration
export async function notifyIndianEmergencyServices(
  location: { lat: number; lng: number; address?: string }, 
  userInfo: { name: string; phone?: string }
) {
  try {
    // Create emergency alert for Indian emergency services
    const emergencyData = {
      emergency_type: 'medical',
      location: {
        latitude: location.lat,
        longitude: location.lng,
        address: location.address,
        city: 'Mumbai', // Extract from address
        state: 'Maharashtra' // Extract from address
      },
      caller: {
        name: userInfo.name,
        phone: userInfo.phone || 'Unknown',
        language: 'en' // or 'hi' for Hindi
      },
      timestamp: new Date().toISOString(),
      priority: 'high',
      source: 'SHEILD_APP'
    };

    // For now, log the emergency data
    // In production, this would integrate with:
    // - Local emergency services APIs
    // - Police control room APIs
    // - Ambulance services APIs
    
    console.log('Emergency services would be notified:', emergencyData);
    
    // Simulate emergency services response
    return new Promise<{ success: boolean; error?: string; dispatchId?: string }>((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.05; // 95% success rate
        resolve({
          success,
          error: success ? undefined : 'Emergency services unavailable',
          dispatchId: success ? `IN-ES-${Date.now()}` : undefined
        });
      }, 2000);
    });
    
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Failed to notify emergency services' 
    };
  }
}
```

## 🧪 Testing Setup

### **1. Test SMS Function**

```typescript
// Test SMS sending to Indian number
const testResult = await sendSMSAlert(
  [{ name: 'Test Contact', phone: '+919876543210' }],
  'Test emergency message from SHEILD',
  'Mumbai, Maharashtra, India'
);
console.log('SMS Test Result:', testResult);
```

### **2. Test Emergency Services**

```typescript
// Test emergency services notification
const testResult = await notifyIndianEmergencyServices(
  { lat: 19.0760, lng: 72.8777, address: 'Mumbai, Maharashtra, India' },
  { name: 'Test User', phone: '+919876543210' }
);
console.log('Emergency Services Test Result:', testResult);
```

## 💰 Cost Optimization

### **Free Tier Usage**
- **1,000 SMS per month** (first 12 months)
- **Monitor usage** in AWS SNS console
- **Set spending limits** to prevent unexpected charges

### **Cost Monitoring**
1. **Set up CloudWatch alarms** for SMS spending
2. **Monitor monthly usage** in SNS console
3. **Use AWS Cost Explorer** to track expenses

### **Spending Limits**
```json
{
  "Monthly SMS Spending Limit": "5.00",
  "Daily SMS Spending Limit": "1.00"
}
```

## 🔒 Security & Compliance

### **1. IAM Security**
- Use least privilege principle
- Rotate access keys regularly
- Enable MFA for AWS account

### **2. SMS Compliance**
- Respect DND registry
- Use transactional SMS type for emergencies
- Include opt-out instructions
- Maintain audit logs

### **3. Data Protection**
- Encrypt sensitive data
- Follow Indian data protection laws
- Implement proper access controls

## 🚨 Emergency Services Integration

### **Indian Emergency Numbers**
- **Police**: 100
- **Ambulance**: 102
- **Fire**: 101
- **Women Helpline**: 1091
- **Child Helpline**: 1098

### **Local Emergency Services APIs**
- **Mumbai Police API** (if available)
- **State Emergency Response APIs**
- **Private Emergency Services** (like Ziqitza)

## 📊 Monitoring & Analytics

### **SMS Delivery Status**
```typescript
// Monitor SMS delivery status
const deliveryStatus = await sns.send(new GetSMSAttributesCommand({
  attributes: ['DeliveryStatus', 'MonthlySpendLimit', 'SpendingLimit']
}));
```

### **Error Handling**
- Track failed SMS deliveries
- Monitor opt-out requests
- Handle rate limiting
- Log all emergency alerts

## 🚀 Deployment Checklist

- [ ] Create AWS account and verify payment
- [ ] Set up SNS service in ap-south-1 region
- [ ] Configure SMS preferences for India
- [ ] Create IAM user with SNS permissions
- [ ] Set up environment variables
- [ ] Test SMS sending with Indian numbers
- [ ] Configure spending limits
- [ ] Set up monitoring and alerts
- [ ] Test emergency services integration
- [ ] Deploy updated code
- [ ] Monitor usage and costs

## 📞 Support Resources

- **AWS SNS Documentation**: https://docs.aws.amazon.com/sns
- **AWS India Support**: https://aws.amazon.com/contact-us/
- **TRAI SMS Regulations**: https://www.trai.gov.in/
- **AWS Cost Calculator**: https://calculator.aws/

## ⚠️ Important Notes

1. **Emergency SMS**: Classified as transactional, not promotional
2. **DND Compliance**: Emergency alerts are exempt from DND restrictions
3. **Sender ID**: Must be pre-approved by telecom operators
4. **Testing**: Use test phone numbers before production deployment
5. **Monitoring**: Set up alerts for SMS delivery failures
6. **Compliance**: Keep records of all emergency SMS sent 