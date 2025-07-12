'use client';

import { MapView } from '@/components/map-view';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2, Phone, MapPin, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/components/auth-provider';
import { useState, useEffect } from 'react';
import {
  createSOSAlert,
  getSOSAlert,
  updateSOSAlertStatus,
  getCurrentLocation,
  sendSMSAlert,
  notifyEmergencyServices,
  notifyIndianEmergencyServices,
  subscribeToSMSUpdates,
  type SOSAlert
} from '@/lib/sos';
import { loadSosSettings } from '@/lib/auth';

export default function DashboardPage() {
  const { toast } = useToast();
  const { user } = useAuth();

  const [isSOSActive, setIsSOSActive] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [currentAlert, setCurrentAlert] = useState<SOSAlert | null>(null);
  const [sosSettings, setSosSettings] = useState<{ message: string; contacts: any[] } | null>(null);
  const [smsStatus, setSmsStatus] = useState<{ [phone: string]: string }>({});

  // Load SOS settings and check for active alerts
  useEffect(() => {
    if (!user) return;

    // Load SOS settings
    loadSosSettings(user.uid).then(res => {
      if (res.success && res.data) {
        setSosSettings({
          message: res.data.message || '',
          contacts: res.data.contacts || []
        });
      }
    });

    // Check for active SOS alert
    getSOSAlert(user.uid).then(res => {
      if (res.success && res.alert && res.alert.status === 'active') {
        setCurrentAlert(res.alert);
        setIsSOSActive(true);

        // Set up real-time SMS status updates
        const unsubscribe = subscribeToSMSUpdates(user.uid, (updatedAlert) => {
          setCurrentAlert(updatedAlert);

          // Update SMS status for UI
          const newSmsStatus: { [phone: string]: string } = {};
          updatedAlert.contacts.forEach(contact => {
            if (contact.smsStatus) {
              newSmsStatus[contact.phone] = contact.smsStatus;
            }
          });
          setSmsStatus(newSmsStatus);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
      }
    });
  }, [user]);

  const getSMSStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSMSStatusText = (status: string) => {
    switch (status) {
      case 'sent':
        return 'Sent';
      case 'delivered':
        return 'Delivered';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Sending...';
      default:
        return 'Unknown';
    }
  };

  const handleSOS = async () => {
    if (!user || !sosSettings) {
      toast({
        title: "SOS Setup Required",
        description: "Please configure your SOS settings first.",
        variant: "destructive"
      });
      return;
    }

    setSosLoading(true);

    try {
      // Show location detection message
      toast({
        title: "Getting Your Location",
        description: "Please allow location access when prompted...",
      });

      // Get current location with better error handling
      let location;
      try {
        location = await getCurrentLocation();
        console.log('📍 SOS Location obtained:', location);
      } catch (locationError: any) {
        console.error('❌ Location error in SOS:', locationError);

        // Check if we have cached location from map
        if (typeof window !== 'undefined' && (window as any).globalLocationCache) {
          const cached = (window as any).globalLocationCache;
          const cacheAge = Date.now() - cached.timestamp;

          if (cacheAge < 5 * 60 * 1000) { // 5 minutes
            console.log('📍 Using cached location from map as fallback');
            location = {
              lat: cached.position.lat,
              lng: cached.position.lng
            };

            toast({
              title: "Using Cached Location",
              description: "Using your last known location. For better accuracy, please enable location permissions.",
            });
          } else {
            // Show specific error message
            toast({
              title: "Location Access Required",
              description: locationError.message || "Please enable location permissions and try again.",
              variant: "destructive"
            });

            setSosLoading(false);
            return;
          }
        } else {
          // Show specific error message
          toast({
            title: "Location Access Required",
            description: locationError.message || "Please enable location permissions and try again.",
            variant: "destructive"
          });

          setSosLoading(false);
          return;
        }
      }

      // Create SOS alert
      const alertResult = await createSOSAlert({
        userId: user.uid,
        userName: user.name,
        location,
        message: sosSettings.message || 'Emergency SOS alert activated',
        contacts: sosSettings.contacts.map(contact => ({
          name: contact.name,
          phone: contact.phone,
          notified: false
        }))
      });

      if (!alertResult.success) {
        throw new Error(alertResult.error);
      }

      setCurrentAlert({
        userId: user.uid,
        userName: user.name,
        location,
        message: sosSettings.message || 'Emergency SOS alert activated',
        timestamp: new Date(),
        status: 'active',
        contacts: sosSettings.contacts.map(contact => ({
          name: contact.name,
          phone: contact.phone,
          notified: false,
          smsStatus: 'pending'
        }))
      });
      setIsSOSActive(true);

      // Set up real-time SMS status updates
      const unsubscribe = subscribeToSMSUpdates(user.uid, (updatedAlert) => {
        setCurrentAlert(updatedAlert);

        // Update SMS status for UI
        const newSmsStatus: { [phone: string]: string } = {};
        updatedAlert.contacts.forEach(contact => {
          if (contact.smsStatus) {
            newSmsStatus[contact.phone] = contact.smsStatus;
          }
        });
        setSmsStatus(newSmsStatus);
      });

      // Send SMS alerts to contacts with real-time updates
      const smsResults = await sendSMSAlert(
        sosSettings.contacts,
        sosSettings.message || 'Emergency SOS alert activated',
        location.address || `${location.lat}, ${location.lng}`,
        user.uid
      );

      // Notify Indian emergency services
      const emergencyResult = await notifyIndianEmergencyServices(location, {
        name: user.name,
        phone: undefined // User phone not available in current User interface
      });

      // Show results
      const successfulSMS = smsResults.filter(r => r.success).length;
      const totalSMS = smsResults.length;

      toast({
        title: "SOS Alert Activated!",
        description: `Emergency services notified. ${successfulSMS}/${totalSMS} contacts alerted.`,
        variant: "destructive"
      });

      if (emergencyResult.success && 'dispatchId' in emergencyResult) {
        toast({
          title: "Emergency Services Dispatched",
          description: `Dispatch ID: ${emergencyResult.dispatchId}`,
        });
      }

    } catch (error: any) {
      console.error('❌ SOS Alert failed:', error);
      toast({
        title: "SOS Alert Failed",
        description: error.message || "Failed to activate SOS alert",
        variant: "destructive"
      });
    } finally {
      setSosLoading(false);
    }
  };

  const handleCancelSOS = async () => {
    if (!user || !currentAlert) return;

    setSosLoading(true);

    try {
      const result = await updateSOSAlertStatus(user.uid, 'cancelled');

      if (result.success) {
        setCurrentAlert(null);
        setIsSOSActive(false);
        setSmsStatus({});

        toast({
          title: "SOS Alert Cancelled",
          description: "Emergency alert has been cancelled.",
        });
      } else {
        throw new Error(result.error || 'Failed to cancel SOS alert');
      }
    } catch (error: any) {
      toast({
        title: "Failed to Cancel SOS",
        description: error.message || "Failed to cancel SOS alert",
        variant: "destructive"
      });
    } finally {
      setSosLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold md:text-2xl">Dashboard</h1>
        <div className="flex gap-2">
          {isSOSActive ? (
            <Button
              variant="outline"
              size="lg"
              onClick={handleCancelSOS}
              disabled={sosLoading}
              className="gap-2 shadow-md"
            >
              {sosLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Phone className="h-5 w-5" />
              )}
              <span className="font-bold">Cancel SOS</span>
            </Button>
          ) : (
            <Button
              variant="destructive"
              size="lg"
              onClick={handleSOS}
              disabled={sosLoading}
              className="gap-2 shadow-md active:shadow-inner"
            >
              {sosLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
              <span className="font-bold">SOS</span>
            </Button>
          )}
        </div>
      </div>

      {isSOSActive && currentAlert && (
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Emergency SOS Active</AlertTitle>
            <AlertDescription>
              Emergency services have been notified. Your location: {currentAlert.location.address || `${currentAlert.location.lat.toFixed(4)}, ${currentAlert.location.lng.toFixed(4)}`}
            </AlertDescription>
          </Alert>

          {/* SMS Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                SMS Status
              </CardTitle>
              <CardDescription>
                Real-time status of emergency SMS notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentAlert.contacts.map((contact, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      {getSMSStatusIcon(contact.smsStatus || 'pending')}
                      <div>
                        <p className="font-medium">{contact.name}</p>
                        <p className="text-sm text-muted-foreground">{contact.phone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {getSMSStatusText(contact.smsStatus || 'pending')}
                      </p>
                      {contact.smsStatus === 'sent' && contact.smsMessageId && (
                        <p className="text-xs text-muted-foreground">ID: {contact.smsMessageId}</p>
                      )}
                      {contact.smsStatus === 'failed' && contact.errorMessage && (
                        <p className="text-xs text-red-500">{contact.errorMessage}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex-1 rounded-lg shadow-md border overflow-hidden">
        <MapView />
      </div>
    </div>
  );
}
