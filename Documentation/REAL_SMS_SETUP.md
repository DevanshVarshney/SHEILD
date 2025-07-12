# Real SMS Setup Guide

This guide will help you set up real SMS functionality using AWS SNS for the SHEILD emergency alert system.

## 🚀 Quick Setup

### 1. **AWS SNS Setup**

1. **Create AWS Account** (if you don't have one):
   - Go to [AWS Console](https://aws.amazon.com/)
   - Create a new account or sign in
   - Add payment information (required for SMS)

2. **Set up SNS Service**:
   - Go to SNS Console
   - Enable SMS messaging
   - Configure for India region (ap-south-1)

3. **Create IAM User**:
   - Go to IAM Console
   - Create user with SNS permissions
   - Save Access Key ID and Secret Access Key

### 2. **Environment Variables**

Add these to your `.env.local` file:

```env
# AWS SNS Configuration for Real SMS
AWS_ACCESS_KEY_ID=your_aws_access_key_id
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key
AWS_REGION=ap-south-1
AWS_SNS_SENDER_ID=SHEILD
AWS_SNS_MONTHLY_LIMIT=5.00
```

### 3. **Test Real SMS**

1. **Run the test script** in browser console:
   ```javascript
   // Copy and paste the content of test-real-sms.js
   // Then run:
   window.realSMSTests.runRealSMSTests()
   ```

2. **Test SOS button** in the dashboard

## 📱 SMS Features

### **Real SMS Benefits**
- ✅ **Actual SMS delivery** to phone numbers
- ✅ **India-compliant** formatting (+91)
- ✅ **Transactional SMS** type (not promotional)
- ✅ **Real-time delivery status**
- ✅ **Cost tracking** in AWS console

### **Message Format**
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

### **Phone Number Handling**
- **Automatic formatting**: Adds +91 for Indian numbers
- **Multiple formats supported**: 
  - `9369721072` → `+919369721072`
  - `+919369721072` → `+919369721072`
  - `919369721072` → `+919369721072`

## 💰 Cost Information

### **AWS SNS Pricing (India)**
- **Free Tier**: 1,000 SMS per month (first 12 months)
- **After Free Tier**: $0.0069 per SMS (~₹0.50)
- **No setup fees**
- **Pay-as-you-go**

### **Cost Control**
- Set monthly spending limits in AWS SNS console
- Monitor usage in AWS Cost Explorer
- Set up CloudWatch alarms for spending alerts

## 🔧 Technical Details

### **API Endpoint**
- **URL**: `/api/send-sms`
- **Method**: POST
- **Headers**: `Content-Type: application/json`

### **Request Body**
```json
{
  "phone": "9369721072",
  "message": "Emergency message",
  "location": "Sawai Madhopur, Rajasthan, India"
}
```

### **Response**
```json
{
  "success": true,
  "messageId": "aws-sns-message-id",
  "phone": "+919369721072"
}
```

### **Error Handling**
- **Invalid phone**: Returns 400 with error message
- **AWS errors**: Returns 500 with specific error
- **Rate limiting**: Handles throttling automatically
- **Fallback**: Falls back to mock SMS if real SMS fails

## 🧪 Testing

### **1. API Endpoint Test**
```javascript
// Test the SMS API directly
const response = await fetch('/api/send-sms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phone: '9369721072',
    message: 'Test emergency message',
    location: 'Test location'
  })
});
const result = await response.json();
console.log(result);
```

### **2. Complete Flow Test**
```javascript
// Run the complete test suite
window.realSMSTests.runRealSMSTests();
```

### **3. SOS Button Test**
1. Go to dashboard
2. Configure SOS settings with your phone number
3. Click SOS button
4. Check your phone for SMS

## 🔒 Security

### **AWS Credentials**
- ✅ **Server-side only**: Credentials never exposed to client
- ✅ **IAM permissions**: Least privilege principle
- ✅ **Environment variables**: Secure storage
- ✅ **No hardcoding**: Credentials in .env.local

### **SMS Compliance**
- ✅ **Transactional SMS**: Emergency alerts only
- ✅ **India compliance**: TRAI regulations
- ✅ **DND exempt**: Emergency messages
- ✅ **Sender ID**: Pre-approved format

## 🚨 Emergency Services Integration

### **Current Status**
- ✅ **SMS alerts**: Working with real SMS
- ✅ **Location resolution**: GPS + address
- ✅ **Emergency services**: Mock integration
- ⚠️ **Real emergency services**: Requires partnerships

### **Next Steps for Emergency Services**
1. Contact local emergency services
2. Get API access for emergency dispatch
3. Implement real emergency services integration
4. Test with emergency services

## 📊 Monitoring

### **AWS SNS Console**
- **SMS delivery status**
- **Success/failure rates**
- **Cost tracking**
- **Rate limiting**

### **Application Logs**
- **SMS sending attempts**
- **Success/failure logs**
- **Error details**
- **Performance metrics**

## 🛠️ Troubleshooting

### **Common Issues**

1. **"AWS credentials are invalid"**
   - Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
   - Verify IAM user has SNS permissions
   - Ensure credentials are in .env.local

2. **"Phone number format invalid"**
   - Use 10-digit Indian number (9369721072)
   - Or use +91 format (+919369721072)
   - Check for extra spaces or characters

3. **"SMS not delivered"**
   - Check AWS SNS console for delivery status
   - Verify phone number is correct
   - Check if number has opted out of SMS

4. **"Rate limit exceeded"**
   - Wait before sending more SMS
   - Check AWS SNS console for limits
   - Consider upgrading AWS plan

### **Debug Commands**
```javascript
// Check if API endpoint is working
window.realSMSTests.testSMSAPIEndpoint();

// Test phone number formats
window.realSMSTests.testPhoneNumberFormats();

// Check error handling
window.realSMSTests.testErrorHandling();
```

## 📞 Support

### **AWS Support**
- **AWS SNS Documentation**: https://docs.aws.amazon.com/sns
- **AWS India Support**: https://aws.amazon.com/contact-us/
- **AWS Cost Calculator**: https://calculator.aws/

### **SHEILD Support**
- Check console logs for detailed errors
- Run test scripts to diagnose issues
- Verify environment variables are set correctly
- Test with different phone numbers

## 🎯 Success Checklist

- [ ] AWS account created and verified
- [ ] SNS service enabled in ap-south-1 region
- [ ] IAM user created with SNS permissions
- [ ] Environment variables added to .env.local
- [ ] SMS API endpoint tested successfully
- [ ] SOS button sends real SMS
- [ ] SMS received on test phone number
- [ ] Cost monitoring set up in AWS console
- [ ] Emergency contacts configured
- [ ] Location resolution working correctly

---

**Note**: This system is designed for emergency use. Always test thoroughly before production deployment and ensure compliance with local emergency services regulations. 