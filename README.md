# SHEILD - Smart Holistic Emergency & Intelligent Location Device

<div align="center">

![SHEILD Logo](https://img.shields.io/badge/SHEILD-Safety%20Route%20Analysis-blue?style=for-the-badge&logo=shield)

**A comprehensive emergency response system with real-time location tracking, SOS functionality, and intelligent route planning using H3 spatial indexing.**

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-9-orange?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)

</div>

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

SHEILD is a comprehensive emergency response web application that combines real-time location tracking, SOS functionality, and intelligent route planning. The system uses H3 spatial indexing for efficient safety analysis and provides users with the safest routes based on incident data.

### Key Capabilities

- **Emergency Response**: Instant SOS alerts with location sharing
- **Safety Route Planning**: AI-powered route optimization using incident data
- **Real-time Tracking**: Live location monitoring and sharing
- **Contact Management**: Emergency contact organization and communication
- **Healthcare Integration**: Medical information storage and emergency access

## ✨ Features

### 🚨 Emergency Features
- **SOS System**: One-tap emergency alerts with custom messages
- **Location Sharing**: Real-time GPS coordinates with emergency contacts
- **Emergency Contacts**: Manage and communicate with trusted contacts
- **Healthcare Info**: Store critical medical information for emergency responders

### 🗺️ Navigation & Safety
- **Smart Route Planning**: Safety-optimized routes using H3 spatial indexing
- **Incident Analysis**: Real-time safety scoring based on historical data
- **Time-based Safety**: Day/night safety considerations
- **Multiple Route Options**: Alternative routes with safety rankings

### 👤 User Management
- **Profile Management**: Personal information and photo management
- **Authentication**: Secure Firebase-based user authentication
- **Settings**: Customizable app preferences and notifications
- **Theme Support**: Dark/light mode toggle

### 📱 Mobile & Web
- **Responsive Design**: Works seamlessly across all devices
- **Progressive Web App**: Installable web application
- **Offline Support**: Core functionality available without internet
- **Push Notifications**: Real-time alerts and updates

## 🏗️ Architecture

### Frontend Stack
- **Framework**: Next.js 15 with App Router
- **UI Library**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **Maps**: Google Maps API with @vis.gl/react-google-maps
- **Forms**: React Hook Form with Zod validation

### Backend Services
- **Authentication**: Firebase Auth
- **Database**: Firestore (NoSQL)
- **Storage**: Firebase Storage
- **Functions**: Firebase Cloud Functions
- **SMS**: AWS SNS for emergency notifications

### Data Processing
- **Spatial Indexing**: H3 hexagonal grid system
- **Route Analysis**: OpenRouteService API integration
- **Safety Scoring**: Incident-based risk assessment
- **Data Processing**: Python-based analytics pipeline

### Project Structure
```
SHEILD/
├── src/                    # Next.js application
│   ├── app/               # App router pages
│   ├── components/        # React components
│   ├── hooks/            # Custom React hooks
│   └── lib/              # Utility libraries
├── api/                   # Python API services
├── database/              # Data processing & H3 analysis
├── map/                   # Route processing logic
├── functions/             # Firebase Cloud Functions
├── android/               # Android app (Capacitor)
└── Documentation/         # Setup guides & documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Python 3.8+ (for data processing)
- Firebase project
- Google Cloud project with Maps API
- AWS account (for SMS functionality)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/SHEILD.git
cd SHEILD
```

### 2. Install Dependencies
```bash
# Frontend dependencies
npm install

# Python dependencies (for data processing)
pip install -r requirements.txt
```

### 3. Environment Setup
Create a `.env.local` file in the project root:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_MEASUREMENT_ID=your_measurement_id

# Google Maps Configuration
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=your_map_id

# AWS SNS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=eu-north-1
AWS_SNS_SENDER_ID=SHEILD
AWS_SNS_MONTHLY_LIMIT=1.00
AWS_SNS_DEFAULT_SENDER_ID=SHEILD
AWS_SNS_SMS_TYPE=Transactional

# Database Configuration
DATABASE_URL=your_postgresql_connection_string
OPENROUTESERVICE_API_KEY=your_ors_api_key
```

### 4. Start Development Server
```bash
npm run dev
```

Open [http://localhost:9002](http://localhost:9002) to view the application.

## ⚙️ Installation

### Firebase Setup
1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password)
3. Create Firestore Database
4. Configure Storage for profile pictures
5. Deploy security rules from `firestore.rules` and `storage.rules`

### Google Maps Setup
1. Create a Google Cloud project
2. Enable required APIs:
   - Maps JavaScript API
   - Directions API
   - Geocoding API
   - Places API
3. Create API key with appropriate restrictions
4. Set up billing (required for Maps API)

### AWS SNS Setup
1. Create AWS account
2. Set up IAM user with SNS permissions
3. Configure SMS settings in SNS console
4. Set up spending limits and verification

## 🔧 Configuration

### Security Rules
The application includes comprehensive security rules:
- Users can only access their own data
- All Firestore collections are protected by authentication
- Profile pictures are restricted to user's own uploads
- Emergency contacts require mutual consent

### Database Schema
```typescript
// User Profile
interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  emergencyContacts: EmergencyContact[];
  healthcareInfo: HealthcareInfo;
  settings: UserSettings;
}

// Emergency Contact
interface EmergencyContact {
  id: string;
  name: string;
  phoneNumber: string;
  relationship: string;
  isVerified: boolean;
}

// Healthcare Information
interface HealthcareInfo {
  bloodType?: string;
  allergies?: string[];
  medications?: string[];
  conditions?: string[];
  emergencyNotes?: string;
}
```

## 📖 Usage

### Emergency SOS
1. Tap the SOS button on the dashboard
2. Add optional emergency message
3. System automatically:
   - Sends SMS to emergency contacts
   - Shares current location
   - Logs emergency event

### Route Planning
1. Enter start and destination locations
2. System calculates multiple route options
3. Routes are ranked by safety score
4. Select preferred route for navigation

### Contact Management
1. Add emergency contacts with phone numbers
2. Contacts receive verification SMS
3. Manage contact relationships and permissions
4. Test emergency communication

## 🔌 API Documentation

### REST Endpoints

#### Route Planning
```http
POST /api/safe-routes
Content-Type: application/json

{
  "start_lat": 28.6139,
  "start_lon": 77.2090,
  "end_lat": 28.5355,
  "end_lon": 77.3910,
  "time_period": "day"
}
```

#### System Health
```http
GET /api/health
```

#### Configuration
```http
GET /api/config
```

### Python API Usage
```python
from map.route_processer import get_route_with_safety

result = get_route_with_safety(
    start_lat=28.6139,
    start_lon=77.2090,
    end_lat=28.5355,
    end_lon=77.3910,
    time_period='day'
)
```

### H3 Safety Analysis
```bash
# Calculate H3 safety scores
python database/h3_processing.py

# Start API server
python api/routes_api.py
```

## 🛠️ Development

### Available Scripts
```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks

# Testing
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode

# Mobile Development
npm run cap:add      # Add Capacitor platforms
npm run cap:sync     # Sync web code to native
npm run cap:open     # Open in native IDE
```

### Code Structure
- **Components**: Reusable UI components in `src/components/`
- **Hooks**: Custom React hooks in `src/hooks/`
- **Utilities**: Helper functions in `src/lib/`
- **Pages**: Route pages in `src/app/`
- **API**: Backend services in `api/` and `functions/`

### Testing
```bash
# Run all tests
npm run test

# Test specific functionality
node tests/test-sos-functionality.js
node tests/test-location-sharing.js
node tests/test-aws-sns.js
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards
- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write comprehensive tests for new features
- Update documentation for API changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Documentation**: [SETUP.md](./Documentation/SETUP.md)
- **Issues**: [GitHub Issues](https://github.com/DevanshVarshney/SHEILD/issues)
- **Discussions**: [GitHub Discussions](https://github.com/DevanshVarshney/SHEILD/discussions)

## 🙏 Acknowledgments

- [Firebase](https://firebase.google.com/) for backend services
- [Google Maps](https://developers.google.com/maps) for mapping
- [H3](https://h3geo.org/) for spatial indexing
- [shadcn/ui](https://ui.shadcn.com/) for UI components
- [Next.js](https://nextjs.org/) for the React framework

---

<div align="center">

**Made with ❤️ for community safety**

[![GitHub stars](https://img.shields.io/github/stars/your-username/SHEILD?style=social)](https://github.com/DevanshVarshney/SHEILD/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/your-username/SHEILD?style=social)](https://github.com/DevanshVarshney/SHEILD/network/members)
[![GitHub issues](https://img.shields.io/github/issues/your-username/SHEILD)](https://github.com/DevanshVarshney/SHEILD/issues)

</div>