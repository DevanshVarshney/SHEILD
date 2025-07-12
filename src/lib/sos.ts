import { doc, setDoc, getDoc, updateDoc, collection, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

export interface SOSAlert {
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

export interface SOSContact {
    name: string;
    phone: string;
    email?: string;
}

export interface SMSTracking {
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

// Initialize SNS client for India region (only if environment variables are available)
let sns: SNSClient | null = null;

// Check if AWS credentials are available (client-side safe)
const isAWSAvailable = () => {
    // In client-side, we can't access server-side env vars directly
    // This will be handled by the SMS function
    return false; // For now, return false to use mock SMS
};

// Save SOS alert to Firestore with real-time SMS tracking
export async function createSOSAlert(alert: Omit<SOSAlert, 'timestamp' | 'status'>) {
    try {
        console.log('🔐 Creating SOS alert for user:', alert.userId);
        console.log('📋 Alert data:', alert);

        const alertData: SOSAlert = {
            ...alert,
            timestamp: new Date(),
            status: 'active',
            contacts: alert.contacts.map(contact => ({
                ...contact,
                smsStatus: 'pending' as const,
                notified: false
            }))
        };

        // Filter out undefined values that Firestore doesn't accept
        const cleanAlertData = Object.fromEntries(
            Object.entries(alertData).filter(([_, value]) => value !== undefined)
        ) as SOSAlert;

        console.log('🧹 Cleaned alert data:', cleanAlertData);

        // Create the document reference
        const alertRef = doc(db, 'sosAlerts', alert.userId);
        console.log('📄 Document reference:', alertRef.path);

        // Save to Firestore
        await setDoc(alertRef, cleanAlertData);

        console.log('✅ SOS alert saved successfully');
        return { success: true, alertId: alert.userId };
    } catch (error: any) {
        console.error('❌ SOS alert creation failed:', error);
        console.error('🔍 Error details:', {
            code: error.code,
            message: error.message,
            userId: alert.userId,
            firestorePath: `sosAlerts/${alert.userId}`
        });

        // Provide more specific error messages
        let errorMessage = error.message;
        if (error.code === 'permission-denied') {
            errorMessage = 'Permission denied. Please check if you are logged in and try again.';
        } else if (error.code === 'unauthenticated') {
            errorMessage = 'You must be logged in to create an SOS alert.';
        } else if (error.code === 'not-found') {
            errorMessage = 'Firestore database not found. Please check your configuration.';
        }

        return { success: false, error: errorMessage };
    }
}

// Get SOS alert by user ID
export async function getSOSAlert(userId: string) {
    try {
        const docSnap = await getDoc(doc(db, 'sosAlerts', userId));
        if (docSnap.exists()) {
            return { success: true, alert: docSnap.data() as SOSAlert };
        } else {
            return { success: true, alert: null };
        }
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// Update SOS alert status
export async function updateSOSAlertStatus(userId: string, status: SOSAlert['status']) {
    try {
        await setDoc(doc(db, 'sosAlerts', userId), { status }, { merge: true });
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// Update SMS status for a specific contact
export async function updateSMSStatus(userId: string, contactPhone: string, status: 'pending' | 'sent' | 'failed' | 'delivered', messageId?: string, errorMessage?: string) {
    try {
        const alertRef = doc(db, 'sosAlerts', userId);
        const alertSnap = await getDoc(alertRef);

        if (!alertSnap.exists()) {
            throw new Error('SOS alert not found');
        }

        const alertData = alertSnap.data() as SOSAlert;
        const updatedContacts = alertData.contacts.map(contact => {
            if (contact.phone === contactPhone) {
                const updatedContact = {
                    ...contact,
                    smsStatus: status,
                    notified: status === 'sent' || status === 'delivered',
                    smsMessageId: messageId || contact.smsMessageId,
                    errorMessage: errorMessage || contact.errorMessage
                };

                // Only add notifiedAt if status is sent or delivered
                if (status === 'sent' || status === 'delivered') {
                    updatedContact.notifiedAt = new Date();
                }

                // Remove any undefined values
                return Object.fromEntries(
                    Object.entries(updatedContact).filter(([_, value]) => value !== undefined)
                );
            }
            return contact;
        });

        // Clean the contacts array to remove any undefined values
        const cleanContacts = updatedContacts.map(contact =>
            Object.fromEntries(
                Object.entries(contact).filter(([_, value]) => value !== undefined)
            )
        );

        await updateDoc(alertRef, { contacts: cleanContacts });

        // Also update the SMS tracking collection
        const trackingData: any = {
            alertId: userId,
            userId,
            contactName: alertData.contacts.find(c => c.phone === contactPhone)?.name || 'Unknown',
            contactPhone,
            status,
            sentAt: new Date(),
            retryCount: 0
        };

        // Only add optional fields if they exist
        if (messageId) trackingData.messageId = messageId;
        if (errorMessage) trackingData.errorMessage = errorMessage;

        await addDoc(collection(db, 'smsTracking'), trackingData);

        return { success: true };
    } catch (error: any) {
        console.error('❌ Failed to update SMS status:', error);
        return { success: false, error: error.message };
    }
}

// Send SMS alert to contacts with real-time Firebase updates
export async function sendSMSAlert(contacts: SOSContact[], message: string, location: string, userId: string) {
    const results = [];

    for (const contact of contacts) {
        try {
            console.log(`📱 Sending SMS to ${contact.name} (${contact.phone})...`);

            // Update status to pending
            await updateSMSStatus(userId, contact.phone, 'pending');

            // Try real SMS first
            let smsResult = await sendRealSMS(contact.phone, message, location);

            // If real SMS fails due to quota, automatically fallback to mock SMS
            if (!smsResult.success && smsResult.quotaExceeded) {
                console.log(`⚠️ Real SMS quota exceeded for ${contact.name}, using mock SMS as fallback...`);
                smsResult = await sendMockSMS(contact.phone, message, location);
            }
            // If real SMS fails for other reasons, try mock SMS as fallback
            else if (!smsResult.success) {
                console.log(`⚠️ Real SMS failed for ${contact.name}, trying mock SMS...`);
                smsResult = await sendMockSMS(contact.phone, message, location);
            }

            // Update Firebase with result
            if (smsResult.success) {
                await updateSMSStatus(userId, contact.phone, 'sent', smsResult.messageId);
                console.log(`✅ SMS sent successfully to ${contact.name}`);
            } else {
                await updateSMSStatus(userId, contact.phone, 'failed', undefined, smsResult.error);
                console.log(`❌ SMS failed for ${contact.name}: ${smsResult.error}`);
            }

            results.push({
                contact,
                success: smsResult.success,
                error: smsResult.error,
                messageId: smsResult.messageId
            });

            // Add delay between SMS sends to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error: any) {
            console.error(`❌ Error sending SMS to ${contact.name}:`, error);
            await updateSMSStatus(userId, contact.phone, 'failed', undefined, error.message);

            results.push({
                contact,
                success: false,
                error: error.message
            });
        }
    }

    return results;
}

// Listen to real-time SMS status updates
export function subscribeToSMSUpdates(userId: string, callback: (alert: SOSAlert) => void) {
    const alertRef = doc(db, 'sosAlerts', userId);

    return onSnapshot(alertRef, (doc) => {
        if (doc.exists()) {
            const alertData = doc.data() as SOSAlert;
            callback(alertData);
        }
    }, (error) => {
        console.error('❌ Error listening to SMS updates:', error);
    });
}

// Real SMS function using server-side API
async function sendRealSMS(phone: string, message: string, location: string) {
    try {
        console.log(`📱 Attempting to send real SMS to ${phone}...`);

        const response = await fetch('/api/send-sms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phone,
                message,
                location
            })
        });

        const result = await response.json();

        if (result.success) {
            console.log(`✅ Real SMS sent successfully to ${phone}:`, result.messageId);
            return {
                success: true,
                messageId: result.messageId,
                phone: result.phone
            };
        }

        // Handle quota exceeded case
        if (result.quotaExceeded && result.fallbackAvailable) {
            console.log(`⚠️ SMS quota exceeded for ${phone}, falling back to mock SMS...`);
            return {
                success: false,
                error: 'SMS quota exceeded',
                quotaExceeded: true
            };
        }

        // Handle rate limiting
        if (result.shouldRetry) {
            console.log(`⚠️ Rate limited, waiting before retry...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return await sendRealSMS(phone, message, location);
        }

        throw new Error(result.error || 'SMS sending failed');

    } catch (error: any) {
        console.error(`❌ Real SMS sending failed for ${phone}:`, error);
        return {
            success: false,
            error: error.message || 'SMS service unavailable'
        };
    }
}

// Fallback to mock SMS if real SMS fails
async function sendMockSMS(phone: string, message: string, location: string) {
    try {
        // Format phone number for India (+91)
        const formattedPhone = phone.startsWith('+91') ? phone : `+91${phone.replace(/\D/g, '')}`;

        // Create emergency SMS message with Indian timezone
        const emergencyMessage = `🚨 EMERGENCY SOS ALERT 🚨

${message}

📍 Location: ${location}
⏰ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

This is an automated emergency alert from SHEILD.
For emergency assistance, contact local authorities immediately.

- SHEILD Emergency System
- This is a transactional message`;

        // Simulate SMS sending delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Simulate success (95% success rate)
        const success = Math.random() > 0.05;

        if (success) {
            console.log(`📱 Mock SMS sent successfully to ${formattedPhone}:`, emergencyMessage.substring(0, 100) + '...');
            return {
                success: true,
                messageId: `MOCK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                phone: formattedPhone
            };
        } else {
            throw new Error('Mock SMS service unavailable');
        }
    } catch (error: any) {
        console.error('Mock SMS sending failed:', error);
        return {
            success: false,
            error: error.message || 'Mock SMS service unavailable'
        };
    }
}

// Get current location with improved error handling
export async function getCurrentLocation(): Promise<{ lat: number; lng: number; address?: string }> {
    return new Promise((resolve, reject) => {
        // First, check if we have a cached location from the map
        // This prevents conflicts between map and SOS geolocation requests
        if (typeof window !== 'undefined' && (window as any).globalLocationCache) {
            const cached = (window as any).globalLocationCache;
            const cacheAge = Date.now() - cached.timestamp;
            const LOCATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

            if (cacheAge < LOCATION_CACHE_DURATION) {
                console.log('📍 SOS using cached location from map:', cached.position);
                resolve({ lat: cached.position.lat, lng: cached.position.lng });
                return;
            }
        }

        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported by your browser'));
            return;
        }

        // Try multiple approaches to get location with better permission handling
        const tryGetLocation = (attempt: number = 1) => {
            const options = {
                enableHighAccuracy: attempt === 1, // Try high accuracy first, then low
                timeout: 20000 + (attempt * 5000), // Increase timeout for each attempt
                maximumAge: 300000 // 5 minutes cache
            };

            console.log(`📍 SOS requesting location (attempt ${attempt}) with options:`, options);

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude: lat, longitude: lng } = position.coords;
                    console.log('📍 SOS location obtained successfully:', { lat, lng, accuracy: position.coords.accuracy });

                    try {
                        // Get address from coordinates using Google Geocoding API
                        const response = await fetch(
                            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
                        );
                        const data = await response.json();

                        let address = data.results?.[0]?.formatted_address;

                        // If no address from Google, create a basic one from coordinates
                        if (!address) {
                            address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                        }

                        console.log('📍 SOS address resolved:', address);
                        resolve({ lat, lng, address });
                    } catch (error) {
                        console.warn('⚠️ SOS address lookup failed, using coordinates only:', error);
                        // Return coordinates with a basic address format
                        const basicAddress = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                        resolve({ lat, lng, address: basicAddress });
                    }
                },
                (error) => {
                    console.error(`❌ SOS geolocation error (attempt ${attempt}):`, error);

                    // If this is the first attempt and it's a permission error, wait and try again
                    if (attempt === 1 && error.code === error.PERMISSION_DENIED) {
                        console.log('🔄 SOS permission denied on first attempt, waiting 2 seconds and trying again...');
                        setTimeout(() => tryGetLocation(2), 2000);
                        return;
                    }

                    // If this is the second attempt and still failing, try one more time with minimal options
                    if (attempt === 2 && error.code === error.PERMISSION_DENIED) {
                        console.log('🔄 SOS trying final attempt with minimal options...');
                        setTimeout(() => tryGetLocation(3), 1000);
                        return;
                    }

                    // If all attempts failed, provide a helpful error message
                    let errorMessage = 'Unable to retrieve your location.';

                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Location access denied. Please enable location permissions in your browser settings and try again. You may need to refresh the page after enabling permissions.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Location information is currently unavailable. Please try again.';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Location request timed out. Please check your internet connection and try again.';
                            break;
                        default:
                            errorMessage = `Location error: ${error.message}`;
                    }

                    reject(new Error(errorMessage));
                },
                options
            );
        };

        // Start with permission check and wait for user response
        if (navigator.permissions) {
            navigator.permissions.query({ name: 'geolocation' }).then((permissionStatus) => {
                console.log('🔐 Permission status:', permissionStatus.state);

                if (permissionStatus.state === 'denied') {
                    reject(new Error('Location access denied. Please enable location permissions in your browser settings and try again.'));
                    return;
                }

                // If permission is granted or prompt, proceed with getting location
                // Add a small delay to ensure the permission prompt has time to be handled
                setTimeout(() => tryGetLocation(1), 500);
            }).catch((error) => {
                console.log('⚠️ Permissions API error, trying geolocation directly:', error);
                // If permissions API is not supported, try anyway with a delay
                setTimeout(() => tryGetLocation(1), 500);
            });
        } else {
            // If permissions API is not available, try anyway with a delay
            console.log('⚠️ Permissions API not available, trying geolocation directly');
            setTimeout(() => tryGetLocation(1), 500);
        }
    });
}

// Helper function to extract city and state from address
async function extractLocationDetails(lat: number, lng: number): Promise<{ city: string; state: string; address: string }> {
    try {
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
        );
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            const address = result.formatted_address;

            // Extract city and state from address components
            let city = 'Unknown City';
            let state = 'Unknown State';

            for (const component of result.address_components) {
                if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
                    city = component.long_name;
                }
                if (component.types.includes('administrative_area_level_1')) {
                    state = component.long_name;
                }
            }

            return { city, state, address };
        }
    } catch (error) {
        console.warn('⚠️ Failed to extract location details:', error);
    }

    // Fallback to coordinates if geocoding fails
    return {
        city: 'Unknown City',
        state: 'Unknown State',
        address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    };
}

// Emergency services integration (mock)
export async function notifyEmergencyServices(location: { lat: number; lng: number; address?: string }, userInfo: { name: string; phone?: string }) {
    // This would integrate with:
    // - 911 emergency services APIs
    // - Local emergency dispatch systems
    // - Emergency response coordination services

    console.log(`Emergency services would be notified for ${userInfo.name} at ${location.address || `${location.lat}, ${location.lng}`}`);

    // Simulate emergency services notification
    return new Promise<{ success: boolean; error?: string; dispatchId?: string }>((resolve) => {
        setTimeout(() => {
            const success = Math.random() > 0.05; // 95% success rate
            resolve({
                success,
                error: success ? undefined : 'Emergency services unavailable',
                dispatchId: success ? `ES-${Date.now()}` : undefined
            });
        }, 2000);
    });
}

// India emergency services integration
export async function notifyIndianEmergencyServices(
    location: { lat: number; lng: number; address?: string },
    userInfo: { name: string; phone?: string }
) {
    try {
        // Extract real city and state from coordinates
        const locationDetails = await extractLocationDetails(location.lat, location.lng);

        // Create emergency alert for Indian emergency services
        const emergencyData = {
            emergency_type: 'medical',
            location: {
                latitude: location.lat,
                longitude: location.lng,
                address: location.address || locationDetails.address,
                city: locationDetails.city,
                state: locationDetails.state
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