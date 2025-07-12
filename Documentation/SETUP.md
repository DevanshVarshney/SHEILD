# SHEILD Web App Setup Guide

This guide will help you resolve the permission errors and map functionality issues.

## 🔧 Firebase Setup

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one
3. Enable Authentication and Firestore Database

### 2. Configure Authentication
1. In Firebase Console, go to Authentication > Sign-in method
2. Enable Email/Password authentication
3. Add your domain to authorized domains

### 3. Configure Firestore Database
1. Go to Firestore Database in Firebase Console
2. Create database in test mode (for development)
3. The security rules are already configured in `firestore.rules`

### 4. Configure Storage
1. Go to Storage in Firebase Console
2. Create storage bucket
3. The security rules are already configured in `storage.rules`

### 5. Deploy Security Rules
Run these commands in your terminal:

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (select your project)
firebase init

# Deploy security rules
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

## 🗺️ Google Maps Setup

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable billing (required for Maps API)

### 2. Enable Required APIs
Enable these APIs in Google Cloud Console:
- Maps JavaScript API
- Directions API
- Geocoding API
- Places API

### 3. Create API Key
1. Go to APIs & Services > Credentials
2. Click "Create Credentials" > "API Key"
3. Restrict the API key to your domain
4. Enable only the required APIs listed above

### 4. Create Map ID (Optional but Recommended)
1. Go to Google Cloud Console > Maps > Map Management
2. Create a new Map ID for advanced features

## 📝 Environment Variables

Create a `.env.local` file in your project root:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google Maps Configuration
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=your_map_id_here
```

## 🚀 Running the Application

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:9002](http://localhost:9002)

## 🔍 Troubleshooting

### Permission Errors
If you still get "You don't have enough permission" errors:

1. **Check Firebase Rules**: Ensure the security rules are deployed
2. **Check Authentication**: Make sure users are properly authenticated
3. **Check Firestore**: Ensure the database is created and accessible

### Map Issues
If the map doesn't work properly:

1. **Check API Key**: Verify your Google Maps API key is correct
2. **Check APIs**: Ensure all required APIs are enabled
3. **Check Billing**: Google Maps API requires billing to be enabled
4. **Check Domain**: Ensure your domain is authorized in the API key restrictions

### Common Error Messages

- **"Maps JavaScript API error"**: Check API key and billing
- **"Directions API error"**: Ensure Directions API is enabled
- **"Permission denied"**: Check Firestore security rules
- **"API key not valid"**: Verify API key and restrictions

## 📱 Features Fixed

### ✅ Profile & Settings Updates
- Healthcare information saving
- Emergency contacts management
- SOS settings configuration
- Profile picture upload

### ✅ Map Functionality
- Custom zoom controls (+ and - buttons)
- Route calculation with Directions API
- Current location detection
- Improved error handling and loading states

## 🔒 Security

The application now includes proper security rules:
- Users can only access their own data
- Profile pictures are restricted to user's own uploads
- All Firestore collections are protected by authentication

## 📞 Support

If you continue to experience issues:
1. Check the browser console for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure Firebase project is properly configured
4. Check Google Cloud Console for API usage and errors 