# Real-time SMS Alert System Guide

This guide explains the enhanced SOS alert system with real-time SMS tracking and Firebase integration.

## 🚀 New Features

### **Real-time SMS Status Tracking**
- **Live Updates**: SMS status updates in real-time via Firebase
- **Status Tracking**: Track pending, sent, failed, and delivered status
- **Error Handling**: Detailed error messages for failed SMS
- **Message IDs**: Unique tracking IDs for each SMS

### **Enhanced Firebase Integration**
- **SMS Tracking Collection**: New `smsTracking` collection for detailed logs
- **Real-time Listeners**: Live updates using Firebase onSnapshot
- **Status Synchronization**: Automatic sync between alert and tracking data

## 📱 SMS Status Flow

### **Status Transitions**
```
pending → sent → delivered
    ↓
  failed (if error occurs)
```

### **Status Meanings**
- **pending**: SMS is queued for sending
- **sent**: SMS has been sent to the provider
- **delivered**: SMS has been delivered to recipient
- **failed**: SMS sending failed (with error details)

## 🔧 Implementation Details

### **1. Enhanced SOS Alert Structure**

```typescript
interface SOSAlert {
    userId: string;
    userName: string;
    userPhone?: string | null;
    location: {
        lat: number;
        lng: number;
        address?: string;
    };
    message: string;
    timestamp: Date;
    status: 'active' | 'resolved' | 'cancelled';
    contacts: Array<{
        name: string;
        phone: string;
        notified: boolean;
        notifiedAt?: Date;
        smsStatus?: 'pending' | 'sent' | 'failed' | 'delivered';
        smsMessageId?: string;
        errorMessage?: string;
    }>;
}
```

### **2. SMS Tracking Collection**

```typescript
interface SMSTracking {
    id: string;
    alertId: string;
    userId: string;
    contactName: string;
    contactPhone: string;
    status: 'pending' | 'sent' | 'failed' | 'delivered';
    messageId?: string;
    errorMessage?: string;
    sentAt: Date;
    deliveredAt?: Date;
    retryCount: number;
}
```

### **3. Real-time Updates**

```typescript
// Subscribe to real-time SMS updates
const unsubscribe = subscribeToSMSUpdates(userId, (updatedAlert) => {
    // Handle real-time updates
    setCurrentAlert(updatedAlert);
    
    // Update UI with new SMS status
    const newSmsStatus: { [phone: string]: string } = {};
    updatedAlert.contacts.forEach(contact => {
        if (contact.smsStatus) {
            newSmsStatus[contact.phone] = contact.smsStatus;
        }
    });
    setSmsStatus(newSmsStatus);
});
```

## 🎯 Dashboard Features

### **Real-time SMS Status Display**
- **Status Icons**: Visual indicators for each SMS status
- **Live Updates**: Real-time status changes without page refresh
- **Error Details**: Show specific error messages for failed SMS
- **Message IDs**: Display tracking IDs for successful SMS

### **SMS Status Card**
- Shows all emergency contacts with their current SMS status
- Real-time updates as SMS are sent
- Error messages for failed deliveries
- Message IDs for successful deliveries

## 🔒 Security & Permissions

### **Updated Firestore Rules**

```javascript
// Allow users to read and write their own SMS tracking records
match /smsTracking/{trackingId} {
  allow read, write: if request.auth != null && 
    (request.auth.uid == resource.data.userId || 
     request.auth.uid == request.resource.data.userId);
}
```

### **Data Protection**
- Users can only access their own SMS tracking data
- All SMS records are tied to user authentication
- Secure phone number handling
- Audit trail for all SMS activities

## 📊 SMS Message Format

### **India-Compliant Format**

```
🚨 EMERGENCY SOS ALERT 🚨

[Custom Message]

📍 Location: [Address/Coordinates]
⏰ Time: [Indian Timezone]

This is an automated emergency alert from SHEILD.
For emergency assistance, contact local authorities immediately.

- SHEILD Emergency System
- This is a transactional message
```

### **Features**
- **India Timezone**: Uses Asia/Kolkata timezone
- **Location Details**: Includes GPS coordinates and address
- **Compliance**: Marked as transactional message
- **Emergency Info**: Clear emergency instructions

## 🧪 Testing

### **Test Scripts Available**
1. **test-realtime-sms.js**: Test real-time SMS functionality
2. **test-aws-sns.js**: Test AWS SNS integration
3. **test-sos-firestore.js**: Test SOS Firestore operations

### **Manual Testing**
```javascript
// Run in browser console
window.realtimeSMSTests.runRealtimeSMSTests()
```

## 🔄 SMS Sending Process

### **Step-by-Step Flow**

1. **SOS Triggered**
   - User clicks SOS button
   - Location obtained
   - SOS alert created in Firestore

2. **SMS Preparation**
   - Contacts loaded from SOS settings
   - SMS status set to 'pending'
   - Real-time listeners activated

3. **SMS Sending**
   - Each contact processed individually
   - SMS sent via AWS SNS (or mock)
   - Status updated to 'sent' or 'failed'

4. **Real-time Updates**
   - Firebase listeners update UI
   - SMS tracking records created
   - Status displayed in dashboard

5. **Delivery Confirmation**
   - SMS delivery status tracked
   - Status updated to 'delivered'
   - Final confirmation shown

## 📈 Monitoring & Analytics

### **SMS Tracking Metrics**
- **Success Rate**: Percentage of successful SMS deliveries
- **Response Time**: Time from SOS trigger to SMS delivery
- **Error Analysis**: Common failure reasons
- **Cost Tracking**: SMS costs per user/alert

### **Firebase Console Monitoring**
- **smsTracking Collection**: Detailed SMS logs
- **sosAlerts Collection**: Alert status and contact updates
- **Real-time Updates**: Live status monitoring
- **Error Logs**: Failed SMS details

## 🚨 Emergency Services Integration

### **Indian Emergency Services**
- **Location Data**: GPS coordinates and address
- **User Information**: Name and contact details
- **Emergency Type**: Medical emergency classification
- **Priority Level**: High priority for SOS alerts

### **Dispatch Information**
- **Dispatch ID**: Unique identifier for emergency response
- **Response Time**: Time to emergency services notification
- **Status Tracking**: Emergency services response status

## 💡 Best Practices

### **SMS Optimization**
- **Rate Limiting**: 500ms delay between SMS sends
- **Error Handling**: Retry logic for failed SMS
- **Message Length**: Optimized for SMS character limits
- **Phone Formatting**: Automatic India (+91) formatting

### **User Experience**
- **Real-time Feedback**: Immediate status updates
- **Clear Status**: Visual indicators for SMS status
- **Error Messages**: Helpful error descriptions
- **Loading States**: Clear indication of SMS progress

## 🔧 Configuration

### **Environment Variables**
```env
# AWS SNS Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-south-1
AWS_SNS_SENDER_ID=SHEILD

# SMS Limits
AWS_SNS_MONTHLY_LIMIT=5.00
```

### **Firebase Configuration**
- **Real-time Database**: Enabled for live updates
- **Security Rules**: Updated for SMS tracking
- **Collections**: sosAlerts and smsTracking
- **Indexes**: Optimized for query performance

## 📞 Support & Troubleshooting

### **Common Issues**
1. **SMS Not Sending**: Check AWS credentials and limits
2. **Real-time Updates Not Working**: Verify Firebase connection
3. **Permission Errors**: Check Firestore security rules
4. **Status Not Updating**: Verify real-time listeners

### **Debug Tools**
- **Browser Console**: Real-time SMS test scripts
- **Firebase Console**: Live data monitoring
- **AWS SNS Console**: SMS delivery status
- **Network Tab**: API request monitoring

## 🚀 Next Steps

### **Production Deployment**
1. **AWS SNS Setup**: Configure real SMS sending
2. **Phone Number Validation**: Add number format validation
3. **Delivery Receipts**: Implement delivery confirmation
4. **Analytics Dashboard**: Add SMS performance metrics

### **Advanced Features**
1. **SMS Templates**: Multiple emergency message templates
2. **Contact Groups**: Organize contacts by priority
3. **Scheduled Alerts**: Delayed emergency notifications
4. **Multi-language Support**: Hindi and English messages

## 📚 Additional Resources

- **AWS SNS Documentation**: https://docs.aws.amazon.com/sns
- **Firebase Real-time Updates**: https://firebase.google.com/docs/firestore/query-data/listen
- **India SMS Regulations**: https://www.trai.gov.in/
- **Emergency Services APIs**: Contact local emergency services

---

**Note**: This system is designed for emergency use. Always test thoroughly before production deployment and ensure compliance with local emergency services regulations. 