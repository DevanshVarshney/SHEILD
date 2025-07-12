# SOS Alert System Setup Guide

This guide explains how the SOS alert system works and how to set up real SMS and emergency services integration.

## 🔴 Current SOS Alert Flow

### 1. **User Triggers SOS**
- User clicks the SOS button on the dashboard
- System gets current GPS location
- Creates SOS alert record in Firestore
- Sends notifications to emergency contacts
- Notifies emergency services

### 2. **What Gets Sent**
- **Location**: GPS coordinates and address
- **User Info**: Name and contact details
- **Custom Message**: User-defined emergency message
- **Timestamp**: When the alert was triggered

### 3. **Who Gets Notified**
- **Emergency Contacts**: SMS/email alerts
- **Emergency Services**: Direct notification (911/local services)
- **App Users**: Real-time status updates

## 📱 SMS Integration Setup

### Option 1: Twilio SMS (Recommended)

1. **Sign up for Twilio**:
   ```bash
   # Install Twilio SDK
   npm install twilio
   ```

2. **Get Twilio Credentials**:
   - Account SID
   - Auth Token
   - Twilio phone number

3. **Update Environment Variables**:
   ```env
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_number
   ```

4. **Replace SMS Function** in `src/lib/sos.ts`:
   ```typescript
   import twilio from 'twilio';

   const client = twilio(
     process.env.TWILIO_ACCOUNT_SID,
     process.env.TWILIO_AUTH_TOKEN
   );

   async function sendSMS(phone: string, message: string, location: string) {
     try {
       const result = await client.messages.create({
         body: `🚨 EMERGENCY SOS ALERT 🚨\n\n${message}\n\nLocation: ${location}\n\nThis is an automated emergency alert.`,
         from: process.env.TWILIO_PHONE_NUMBER,
         to: phone
       });
       
       return { success: true, messageId: result.sid };
     } catch (error: any) {
       return { success: false, error: error.message };
     }
   }
   ```

### Option 2: AWS SNS

1. **Set up AWS SNS**:
   ```bash
   npm install @aws-sdk/client-sns
   ```

2. **Configure AWS**:
   ```env
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   AWS_REGION=us-east-1
   ```

3. **Update SMS Function**:
   ```typescript
   import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

   const sns = new SNSClient({ region: process.env.AWS_REGION });

   async function sendSMS(phone: string, message: string, location: string) {
     try {
       const command = new PublishCommand({
         Message: `🚨 EMERGENCY SOS ALERT 🚨\n\n${message}\n\nLocation: ${location}`,
         PhoneNumber: phone
       });
       
       const result = await sns.send(command);
       return { success: true, messageId: result.MessageId };
     } catch (error: any) {
       return { success: false, error: error.message };
     }
   }
   ```

## 🚨 Emergency Services Integration

### Option 1: 911 Emergency Services API

**Note**: Direct 911 integration requires special partnerships and compliance with emergency services regulations.

1. **Contact Emergency Services Provider**:
   - RapidSOS
   - Carbyne
   - Emergency Services APIs

2. **Get API Credentials**:
   ```env
   EMERGENCY_SERVICES_API_KEY=your_api_key
   EMERGENCY_SERVICES_ENDPOINT=https://api.emergencyservices.com
   ```

3. **Update Emergency Services Function**:
   ```typescript
   async function notifyEmergencyServices(location: { lat: number; lng: number; address?: string }, userInfo: { name: string; phone?: string }) {
     try {
       const response = await fetch(process.env.EMERGENCY_SERVICES_ENDPOINT, {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${process.env.EMERGENCY_SERVICES_API_KEY}`,
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({
           emergency_type: 'medical',
           location: {
             latitude: location.lat,
             longitude: location.lng,
             address: location.address
           },
           caller: {
             name: userInfo.name,
             phone: userInfo.phone
           },
           timestamp: new Date().toISOString()
         })
       });
       
       const result = await response.json();
       return { success: true, dispatchId: result.dispatch_id };
     } catch (error: any) {
       return { success: false, error: error.message };
     }
   }
   ```

### Option 2: Local Emergency Dispatch

For local emergency services integration:

1. **Contact Local Emergency Services**
2. **Get Integration Documentation**
3. **Implement Custom API Calls**

## 📧 Email Integration (Alternative to SMS)

### Option 1: SendGrid

1. **Set up SendGrid**:
   ```bash
   npm install @sendgrid/mail
   ```

2. **Configure SendGrid**:
   ```env
   SENDGRID_API_KEY=your_sendgrid_api_key
   SENDGRID_FROM_EMAIL=alerts@yourapp.com
   ```

3. **Add Email Function**:
   ```typescript
   import sgMail from '@sendgrid/mail';
   sgMail.setApiKey(process.env.SENDGRID_API_KEY);

   async function sendEmailAlert(contact: SOSContact, message: string, location: string) {
     if (!contact.email) return { success: false, error: 'No email provided' };
     
     try {
       await sgMail.send({
         to: contact.email,
         from: process.env.SENDGRID_FROM_EMAIL,
         subject: '🚨 EMERGENCY SOS ALERT 🚨',
         text: `Emergency SOS Alert\n\n${message}\n\nLocation: ${location}\n\nThis is an automated emergency alert.`,
         html: `
           <h2>🚨 EMERGENCY SOS ALERT 🚨</h2>
           <p><strong>Message:</strong> ${message}</p>
           <p><strong>Location:</strong> ${location}</p>
           <p><em>This is an automated emergency alert.</em></p>
         `
       });
       
       return { success: true };
     } catch (error: any) {
       return { success: false, error: error.message };
     }
   }
   ```

## 🔔 Push Notifications

### Firebase Cloud Messaging (FCM)

1. **Set up FCM**:
   ```bash
   npm install firebase/messaging
   ```

2. **Add Push Notification Function**:
   ```typescript
   import { getMessaging, send } from 'firebase/messaging';

   async function sendPushNotification(userId: string, message: string) {
     try {
       const messaging = getMessaging();
       await send(messaging, {
         token: userId, // User's FCM token
         notification: {
           title: '🚨 Emergency SOS Alert',
           body: message
         },
         data: {
           type: 'sos_alert',
           timestamp: new Date().toISOString()
         }
       });
       
       return { success: true };
     } catch (error: any) {
       return { success: false, error: error.message };
     }
   }
   ```

## 🛡️ Security & Compliance

### 1. **Data Protection**
- Encrypt sensitive data in transit and at rest
- Implement proper authentication and authorization
- Follow GDPR/CCPA compliance requirements

### 2. **Emergency Services Compliance**
- Verify emergency services API compliance
- Implement proper error handling and fallbacks
- Maintain audit logs for all emergency alerts

### 3. **Rate Limiting**
- Implement rate limiting to prevent abuse
- Add confirmation dialogs for SOS activation
- Log all SOS activations for review

## 🧪 Testing

### 1. **Test SMS Integration**
```typescript
// Test SMS sending
const testResult = await sendSMSAlert(
  [{ name: 'Test Contact', phone: '+1234567890' }],
  'Test emergency message',
  'Test location'
);
console.log('SMS Test Result:', testResult);
```

### 2. **Test Emergency Services**
```typescript
// Test emergency services notification
const testResult = await notifyEmergencyServices(
  { lat: 40.7128, lng: -74.0060, address: 'New York, NY' },
  { name: 'Test User', phone: '+1234567890' }
);
console.log('Emergency Services Test Result:', testResult);
```

### 3. **Test Location Services**
```typescript
// Test location retrieval
const location = await getCurrentLocation();
console.log('Current Location:', location);
```

## 🚀 Deployment Checklist

- [ ] Set up SMS service (Twilio/AWS SNS)
- [ ] Configure emergency services API
- [ ] Set up email notifications (optional)
- [ ] Configure push notifications (optional)
- [ ] Update environment variables
- [ ] Test all integrations
- [ ] Deploy updated Firestore rules
- [ ] Monitor error logs
- [ ] Set up alert monitoring

## 📞 Support

For emergency services integration:
- Contact local emergency services
- Work with emergency services API providers
- Ensure compliance with local regulations

For SMS/Email integration:
- Twilio Support: https://support.twilio.com
- SendGrid Support: https://support.sendgrid.com
- AWS SNS Documentation: https://docs.aws.amazon.com/sns 