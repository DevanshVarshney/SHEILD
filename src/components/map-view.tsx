'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Navigation, MapPin, Route, Plus, Minus, Loader2 } from 'lucide-react';

interface Position {
  lat: number;
  lng: number;
}

interface RouteInfo {
  origin: string;
  destination: string;
  distance?: string;
  duration?: string;
}

// Global location cache to prevent conflicts
let globalLocationCache: { position: Position; timestamp: number } | null = null;
const LOCATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function MapView({ mapId }: { mapId?: string }) {
  const [position, setPosition] = useState<Position>({ lat: 25.2486, lng: 83.1944 }); // Default to Lauda
  const [error, setError] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo>({
    origin: '',
    destination: ''
  });
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [zoom, setZoom] = useState(17);
  const mapRef = useRef<google.maps.Map | null>(null);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }

    // Check if we have a recent cached location
    if (globalLocationCache && (Date.now() - globalLocationCache.timestamp) < LOCATION_CACHE_DURATION) {
      console.log('📍 Using cached location:', globalLocationCache.position);
      setPosition(globalLocationCache.position);
      setError(null);
      return;
    }

    setIsLocating(true);
    setError(null);

    // Try multiple approaches to get location with better permission handling
    const tryGetLocation = (attempt: number = 1) => {
      const options = {
        enableHighAccuracy: attempt === 1, // Try high accuracy first, then low
        timeout: 20000 + (attempt * 5000), // Increase timeout for each attempt
        maximumAge: 300000 // 5 minutes cache
      };

      console.log(`📍 Map requesting location (attempt ${attempt}) with options:`, options);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPosition = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };

          // Cache the location globally
          globalLocationCache = {
            position: newPosition,
            timestamp: Date.now()
          };

          // Expose cache on window for SOS to use
          if (typeof window !== 'undefined') {
            (window as any).globalLocationCache = globalLocationCache;
          }

          setPosition(newPosition);
          setError(null);
          setIsLocating(false);
          console.log('📍 Map location obtained and cached:', newPosition);
        },
        (err) => {
          console.error(`❌ Map geolocation error (attempt ${attempt}):`, err);

          // If this is the first attempt and it's a permission error, wait and try again
          if (attempt === 1 && err.code === err.PERMISSION_DENIED) {
            console.log('🔄 Map permission denied on first attempt, waiting 2 seconds and trying again...');
            setTimeout(() => tryGetLocation(2), 2000);
            return;
          }

          // If this is the second attempt and still failing, try one more time with minimal options
          if (attempt === 2 && err.code === err.PERMISSION_DENIED) {
            console.log('🔄 Map trying final attempt with minimal options...');
            setTimeout(() => tryGetLocation(3), 1000);
            return;
          }

          // If all attempts failed, show error
          let errorMessage = 'Unable to retrieve your location.';
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location permissions in your browser settings and try again.';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable.';
              break;
            case err.TIMEOUT:
              errorMessage = 'Location request timed out.';
              break;
            default:
              errorMessage = `Location error: ${err.message}`;
          }
          setError(errorMessage);
          setIsLocating(false);
        },
        options
      );
    };

    // Start with permission check and wait for user response
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((permissionStatus) => {
        console.log('🔐 Map permission status:', permissionStatus.state);

        if (permissionStatus.state === 'denied') {
          setError('Location access denied. Please enable location permissions in your browser settings and try again.');
          setIsLocating(false);
          return;
        }

        // If permission is granted or prompt, proceed with getting location
        // Add a small delay to ensure the permission prompt has time to be handled
        setTimeout(() => tryGetLocation(1), 500);
      }).catch((error) => {
        console.log('⚠️ Map permissions API error, trying geolocation directly:', error);
        // If permissions API is not supported, try anyway with a delay
        setTimeout(() => tryGetLocation(1), 500);
      });
    } else {
      // If permissions API is not available, try anyway with a delay
      console.log('⚠️ Map permissions API not available, trying geolocation directly');
      setTimeout(() => tryGetLocation(1), 500);
    }
  }, []);

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  const calculateRoute = useCallback(async () => {
    if (!routeInfo.origin || !routeInfo.destination) {
      setError('Please enter both origin and destination.');
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      // Use Google Maps Directions API via fetch
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(routeInfo.origin)}&destination=${encodeURIComponent(routeInfo.destination)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
      );

      const data = await response.json();

      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];

        setRouteInfo(prev => ({
          ...prev,
          distance: leg.distance?.text,
          duration: leg.duration?.text
        }));
        setError(null);
      } else {
        setError(`Unable to calculate route: ${data.status}. Please check your addresses and API key.`);
        setRouteInfo(prev => ({ ...prev, distance: undefined, duration: undefined }));
      }
    } catch (err) {
      setError('Failed to calculate route. Please check your API key and try again.');
      setRouteInfo(prev => ({ ...prev, distance: undefined, duration: undefined }));
    } finally {
      setIsCalculating(false);
    }
  }, [routeInfo.origin, routeInfo.destination]);

  const clearRoute = useCallback(() => {
    setRouteInfo({ origin: '', destination: '' });
    setError(null);
  }, []);

  const handleZoomIn = useCallback(() => {
    if (mapRef.current) {
      const newZoom = Math.min(zoom + 1, 20);
      setZoom(newZoom);
      mapRef.current.setZoom(newZoom);
    }
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    if (mapRef.current) {
      const newZoom = Math.max(zoom - 1, 1);
      setZoom(newZoom);
      mapRef.current.setZoom(newZoom);
    }
  }, [zoom]);

  const onMapLoad = useCallback((event: any) => {
    mapRef.current = event.detail.map;
  }, []);

  // Only use mapId if it's properly configured and not causing conflicts
  const mapConfig = {
    center: position,
    zoom: zoom,
    fullscreenControl: true,
    streetViewControl: true,
    mapTypeControl: true,
    zoomControl: false, // Disable default zoom control since we have custom ones
    gestureHandling: "auto" as const,
    // Only add mapId if it's properly configured
    ...(mapId && mapId !== 'your_map_id_here' ? { mapId } : {})
  };

  return (
    <div className="relative h-full w-full">
      {error && (
        <div className="absolute top-4 left-4 right-4 z-10 p-3 text-destructive-foreground bg-destructive rounded-md shadow-lg">
          {error}
        </div>
      )}

      {/* Controls - Bottom Left */}
      <div className="absolute bottom-4 left-4 z-10 space-y-2">
        <Button
          onClick={getCurrentLocation}
          size="sm"
          className="bg-primary hover:bg-primary/90 w-full"
          disabled={isLocating}
        >
          {isLocating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4 mr-2" />
          )}
          {isLocating ? 'Locating...' : 'Locate Me'}
        </Button>

        <Button
          onClick={() => setShowRouteForm(!showRouteForm)}
          size="sm"
          variant="outline"
          className="bg-background/80 backdrop-blur-sm w-full"
        >
          <MapPin className="h-4 w-4 mr-2" />
          {showRouteForm ? 'Hide Route' : 'Show Route'}
        </Button>
      </div>

      {/* Route Form */}
      {showRouteForm && (
        <Card className="absolute top-16 left-4 z-10 w-80 bg-background/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <Route className="h-4 w-4 mr-2" />
              Route Planner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Input
                placeholder="From (origin)"
                value={routeInfo.origin}
                onChange={(e) => setRouteInfo(prev => ({ ...prev, origin: e.target.value }))}
                className="text-sm"
              />
              <Input
                placeholder="To (destination)"
                value={routeInfo.destination}
                onChange={(e) => setRouteInfo(prev => ({ ...prev, destination: e.target.value }))}
                className="text-sm"
              />
            </div>

            {(routeInfo.distance || routeInfo.duration) && (
              <div className="p-3 bg-muted rounded-md text-sm">
                <div className="font-medium">Route Information:</div>
                {routeInfo.distance && <div>Distance: {routeInfo.distance}</div>}
                {routeInfo.duration && <div>Duration: {routeInfo.duration}</div>}
              </div>
            )}

            <div className="flex space-x-2">
              <Button
                onClick={calculateRoute}
                size="sm"
                className="flex-1"
                disabled={isCalculating}
              >
                {isCalculating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                {isCalculating ? 'Calculating...' : 'Get Route'}
              </Button>
              <Button onClick={clearRoute} size="sm" variant="outline">
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Map
        {...mapConfig}
        className="h-full w-full"
      >
        <AdvancedMarker position={position} />
      </Map>
    </div>
  );
}

// Export the global location cache for SOS to use
export { globalLocationCache };
