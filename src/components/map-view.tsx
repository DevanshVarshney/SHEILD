'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Navigation, MapPin, Route, Plus, Minus, Loader2, AlertTriangle, Shield, X } from 'lucide-react';
import * as L from 'leaflet';

// Fix for default markers in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Position {
  lat: number;
  lng: number;
}

interface RouteInfo {
  origin: string;
  destination: string;
  distance?: string;
  duration?: string;
  originCoords?: Position;
  destinationCoords?: Position;
}

interface SafeRoute {
  coordinates: [number, number][];
  safety_rating?: number;
  distance?: number;
  duration?: number;
  // New fields from updated API
  name?: string;
  safety_score?: number;
  safety_breakdown?: {
    maximum?: number;
    minimum?: number;
    overall?: number;
    variance?: number;
  };
  safety_level?: string;
  distance_km?: number;
  duration_minutes?: number;
  id?: number;
  type?: string;
  h3_indices_count?: number;
}

interface SafeRoutesResponse {
  generated_at: string;
  recommendation: {
    reason: string;
    recommended_route: number;
  };
  routes: SafeRoute[];
}

// Global location cache to prevent conflicts
let globalLocationCache: { position: Position; timestamp: number } | null = null;
const LOCATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Map event handlers component
function MapEventHandlers({
  onMapLoad,
  position,
  setPosition
}: {
  onMapLoad: (map: L.Map) => void;
  position: Position;
  setPosition: (pos: Position) => void;
}) {
  const map = useMap();
  const isUpdatingRef = useRef(false);
  const lastPositionRef = useRef<Position | null>(null);

  // Call onMapLoad when map is available
  useEffect(() => {
    if (map) {
      console.log('🗺️ Map instance available, calling onMapLoad');
      onMapLoad(map);
    }
  }, [map, onMapLoad]);

  const mapEvents = useMapEvents({
    load: () => {
      console.log('🗺️ Map load event triggered');
      onMapLoad(map);
    },
    moveend: () => {
      // Only update position if we're not currently updating from external source
      if (!isUpdatingRef.current) {
        const center = map.getCenter();
        const newPosition = { lat: center.lat, lng: center.lng };

        // Only update if position actually changed
        if (!lastPositionRef.current ||
          Math.abs(lastPositionRef.current.lat - newPosition.lat) > 0.000001 ||
          Math.abs(lastPositionRef.current.lng - newPosition.lng) > 0.000001) {
          lastPositionRef.current = newPosition;
          console.log('🗺️ Map moved to:', newPosition);
          setPosition(newPosition);
        }
      } else {
        console.log('🗺️ Skipping position update (external update in progress)');
      }
    },
  });

  // Update map center when position changes from external source
  useEffect(() => {
    if (map && position) {
      const currentCenter = map.getCenter();
      const positionChanged = Math.abs(currentCenter.lat - position.lat) > 0.000001 ||
        Math.abs(currentCenter.lng - position.lng) > 0.000001;

      if (positionChanged) {
        console.log('🗺️ External position update:', position);
        isUpdatingRef.current = true;
        map.setView([position.lat, position.lng], map.getZoom());
        lastPositionRef.current = position;

        // Reset the flag after a short delay
        setTimeout(() => {
          isUpdatingRef.current = false;
          console.log('🗺️ External update complete');
        }, 100);
      }
    }
  }, [map, position.lat, position.lng]);

  return null;
}

export function MapView() {
  const [position, setPosition] = useState<Position>({ lat: 28.6139, lng: 77.2090 }); // Default to Delhi (Connaught Place area)
  const [error, setError] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo>({
    origin: '',
    destination: ''
  });
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [zoom, setZoom] = useState(13); // Better zoom level for Delhi city view
  const [isUsingDefaultLocation, setIsUsingDefaultLocation] = useState(true);
  const [safeRoutes, setSafeRoutes] = useState<SafeRoutesResponse | null>(null);
  const [routePolylines, setRoutePolylines] = useState<L.Polyline[]>([]);
  const [showLocationMarker, setShowLocationMarker] = useState(true);
  const [locationMarker, setLocationMarker] = useState<L.Marker | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Function to show location marker
  const showLocationMarkerOnMap = useCallback(() => {
    if (!mapRef.current) {
      console.log('🗺️ Map not ready, cannot show location marker');
      return;
    }

    // Remove existing location marker if any
    if (locationMarker) {
      locationMarker.remove();
      setLocationMarker(null);
    }

    // Create and add new location marker
    const marker = L.marker([position.lat, position.lng])
      .addTo(mapRef.current)
      .bindPopup(`
        <div class="text-sm">
          <div class="font-medium">
            ${isUsingDefaultLocation ? 'Default Location (Delhi)' : 'Your current location'}
          </div>
          <div class="text-muted-foreground">
            Lat: ${position.lat.toFixed(6)}<br />
            Lng: ${position.lng.toFixed(6)}
            ${isUsingDefaultLocation && (
          '<br /><span class="text-orange-600 font-medium">Click "Locate Me" to get your actual location</span>'
        )}
          </div>
        </div>
      `);

    setLocationMarker(marker);
    setShowLocationMarker(true);
    console.log('🗺️ Location marker shown at:', position);
  }, [position.lat, position.lng, isUsingDefaultLocation, locationMarker]);

  // Function to hide location marker
  const hideLocationMarkerFromMap = useCallback(() => {
    if (locationMarker) {
      locationMarker.remove();
      setLocationMarker(null);
    }
    setShowLocationMarker(false);
    console.log('🗺️ Location marker hidden');
  }, [locationMarker]);

  // Function to toggle location marker visibility
  const toggleLocationMarker = useCallback(() => {
    if (showLocationMarker) {
      hideLocationMarkerFromMap();
    } else {
      showLocationMarkerOnMap();
    }
  }, [showLocationMarker, hideLocationMarkerFromMap, showLocationMarkerOnMap]);

  // Function to fetch safe routes
  const fetchSafeRoutes = async (start: Position, end: Position) => {
    try {
      console.log('🌐 Calling safe routes API with:', {
        start_lat: start.lat,
        start_lon: start.lng,
        end_lat: end.lat,
        end_lon: end.lng
      });

      const response = await fetch('https://safemaps.onrender.com/api/safe-routes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          start_lat: start.lat,
          start_lon: start.lng,
          end_lat: end.lat,
          end_lon: end.lng,
          time_period: "day",
          num_alternatives: 2
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('🌐 Safe routes API response:', data);
      return data as SafeRoutesResponse;
    } catch (error: any) {
      console.error('❌ Failed to fetch safe routes:', error);
      throw error;
    }
  };

  // Clear existing routes from map
  const clearExistingRoutes = useCallback(() => {
    if (mapRef.current) {
      routePolylines.forEach(polyline => {
        polyline.remove();
      });
      setRoutePolylines([]);
    }
  }, [routePolylines]);

  // Draw routes on map
  const drawRoutes = useCallback((routes: SafeRoute[], recommendedIndex: number) => {
    console.log('🗺️ Attempting to draw routes, map ref:', mapRef.current);

    if (!mapRef.current) {
      console.error('❌ Map reference not available, retrying in 500ms...');
      // Retry after a short delay
      setTimeout(() => {
        if (mapRef.current) {
          console.log('🗺️ Map reference now available, retrying drawRoutes');
          drawRoutes(routes, recommendedIndex);
        } else {
          console.error('❌ Map reference still not available after retry');
        }
      }, 500);
      return;
    }

    console.log('🗺️ Drawing routes:', { routes, recommendedIndex });
    clearExistingRoutes();

    const newPolylines: L.Polyline[] = [];

    routes.forEach((route, index) => {
      const isRecommended = index === recommendedIndex;
      const color = isRecommended ? '#3b82f6' : '#ad0afd'; // blue for recommended, bright purple for others
      const weight = isRecommended ? 6 : 4;
      const opacity = isRecommended ? 0.8 : 0.6;

      // Convert coordinates to LatLng array
      const latLngs = route.coordinates.map(coord => [coord[0], coord[1]] as L.LatLngExpression);
      console.log(`🗺️ Route ${index} coordinates:`, latLngs);

      if (latLngs.length > 0) {
        const polyline = L.polyline(latLngs, {
          color,
          weight,
          opacity,
        });

        // Add to map
        polyline.addTo(mapRef.current!);
        newPolylines.push(polyline);

        // Add popup with safety information
        const safetyScore = route.safety_score ?? route.safety_breakdown?.overall;
        const safetyLevel = route.safety_level ?? 'N/A';
        const distance = route.distance_km ? route.distance_km.toFixed(1) : '?';
        const duration = route.duration_minutes ? route.duration_minutes.toFixed(1) : '?';

        polyline.bindPopup(`
          <div class="text-sm">
            <div class="font-medium">${isRecommended ? '✨ Recommended Route' : 'Alternative Route'}</div>
            <div>Safety: ${safetyScore !== undefined ? safetyScore.toFixed(2) : 'N/A'} (${safetyLevel})</div>
            <div>Distance: ${distance} km</div>
            <div>Duration: ${duration} min</div>
          </div>
        `);

        // Add a label/marker at the midpoint of the route
        if (latLngs.length > 1) {
          const midIdx = Math.floor(latLngs.length / 2);
          const midLatLng = latLngs[midIdx];
          const labelContent = `<div style="background: white; border-radius: 6px; padding: 2px 8px; font-size: 12px; font-weight: bold; color: #222; border: 1px solid #ccc; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
            ${safetyScore !== undefined ? safetyScore.toFixed(1) : 'N/A'} (${safetyLevel})
          </div>`;
          const labelIcon = L.divIcon({
            html: labelContent,
            className: '',
            iconSize: [80, 24],
            iconAnchor: [40, 12],
          });
          L.marker(midLatLng, { icon: labelIcon, interactive: false }).addTo(mapRef.current!);
        }

        console.log(`🗺️ Route ${index} polyline added to map`);
      } else {
        console.warn(`⚠️ Route ${index} has no coordinates`);
      }
    });

    setRoutePolylines(newPolylines);
    console.log('🗺️ All polylines added:', newPolylines.length);

    // Fit map bounds to show all routes
    if (routes.length > 0) {
      const allCoordinates = routes.flatMap(route => route.coordinates);
      if (allCoordinates.length > 0) {
        const bounds = L.latLngBounds(allCoordinates.map(coord => [coord[0], coord[1]]));
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        console.log('🗺️ Map bounds adjusted to show routes');
      }
    }
  }, [clearExistingRoutes]);

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
          setIsUsingDefaultLocation(false);

          // Show location marker if it should be visible
          if (showLocationMarker) {
            showLocationMarkerOnMap();
          }

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

  // Initialize location on component mount
  useEffect(() => {
    getCurrentLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Show location marker when map is ready and location marker should be visible
  useEffect(() => {
    if (mapRef.current && showLocationMarker && !locationMarker) {
      showLocationMarkerOnMap();
    }
  }, [mapRef.current, showLocationMarker, locationMarker, showLocationMarkerOnMap]);

  const calculateRoute = useCallback(async () => {
    if (!routeInfo.origin || !routeInfo.destination) {
      setError('Please enter both origin and destination cities.');
      return;
    }

    setIsCalculating(true);
    setError(null);

    try {
      // Add "India" to the search query to improve geocoding accuracy
      const originQuery = `${routeInfo.origin}, India`;
      const destinationQuery = `${routeInfo.destination}, India`;

      // Use OpenStreetMap Nominatim for geocoding with better parameters
      const originResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(originQuery)}&limit=1&countrycodes=in`
      );
      const originData = await originResponse.json();

      const destinationResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationQuery)}&limit=1&countrycodes=in`
      );
      const destinationData = await destinationResponse.json();

      if (originData.length === 0) {
        throw new Error(`Could not find location: ${routeInfo.origin}`);
      }

      if (destinationData.length === 0) {
        throw new Error(`Could not find location: ${routeInfo.destination}`);
      }

      const origin = {
        lat: parseFloat(originData[0].lat),
        lng: parseFloat(originData[0].lon)
      };
      const destination = {
        lat: parseFloat(destinationData[0].lat),
        lng: parseFloat(destinationData[0].lon)
      };

      console.log('🗺️ Geocoding results:', {
        origin: { city: routeInfo.origin, ...origin },
        destination: { city: routeInfo.destination, ...destination }
      });

      // Add markers for origin and destination
      if (mapRef.current) {
        // Remove existing route markers and hide location marker
        mapRef.current.eachLayer((layer: any) => {
          if (layer instanceof L.Marker) {
            layer.remove();
          }
        });

        // Hide location marker when showing routes
        hideLocationMarkerFromMap();

        // Add new markers
        L.marker([origin.lat, origin.lng])
          .addTo(mapRef.current)
          .bindPopup(`<b>Origin:</b> ${routeInfo.origin}`);

        L.marker([destination.lat, destination.lng])
          .addTo(mapRef.current)
          .bindPopup(`<b>Destination:</b> ${routeInfo.destination}`);
      }

      // Store coordinates for later use
      setRouteInfo(prev => ({
        ...prev,
        originCoords: origin,
        destinationCoords: destination
      }));

      // Fetch safe routes
      console.log('🗺️ Fetching safe routes...');
      const safeRoutesData = await fetchSafeRoutes(origin, destination);
      console.log('🗺️ Safe routes data received:', safeRoutesData);
      setSafeRoutes(safeRoutesData);

      // Draw routes on map
      if (safeRoutesData.routes && safeRoutesData.routes.length > 0) {
        console.log('🗺️ Drawing routes on map...');

        // Ensure map is ready before drawing
        const waitForMap = (attempts = 0) => {
          if (mapRef.current) {
            console.log('🗺️ Map ready, drawing routes now');
            drawRoutes(safeRoutesData.routes, safeRoutesData.recommendation.recommended_route);
          } else if (attempts < 10) {
            console.log(`🗺️ Waiting for map to be ready... (attempt ${attempts + 1}/10)`);
            setTimeout(() => waitForMap(attempts + 1), 500);
          } else {
            console.error('❌ Map not ready after 10 attempts');
            setError('Map is not ready. Please refresh the page and try again.');
          }
        };

        waitForMap();

        // Update route info with recommended route details
        const recommendedRoute = safeRoutesData.routes[safeRoutesData.recommendation.recommended_route];
        if (recommendedRoute) {
          setRouteInfo(prev => ({
            ...prev,
            distance: recommendedRoute.distance_km ? `${recommendedRoute.distance_km.toFixed(1)} km` : undefined,
            duration: recommendedRoute.duration_minutes ? `${Math.round(recommendedRoute.duration_minutes)} min` : undefined
          }));
        }
      } else {
        console.warn('⚠️ No routes received from API');
        throw new Error('No routes available for the selected cities');
      }

      setError(null);
    } catch (err: any) {
      console.error('❌ Route calculation error:', err);
      setError(err.message || 'Failed to calculate route. Please check the city names and try again.');
      setRouteInfo(prev => ({ ...prev, distance: undefined, duration: undefined }));
      setSafeRoutes(null);
      clearExistingRoutes();
    } finally {
      setIsCalculating(false);
    }
  }, [routeInfo.origin, routeInfo.destination, fetchSafeRoutes, drawRoutes, clearExistingRoutes, hideLocationMarkerFromMap]);

  const clearRoute = useCallback(() => {
    setRouteInfo({ origin: '', destination: '' });
    setSafeRoutes(null);
    clearExistingRoutes();

    // Clear all markers and restore location marker if it should be visible
    if (mapRef.current) {
      mapRef.current.eachLayer((layer: any) => {
        if (layer instanceof L.Marker) {
          layer.remove();
        }
      });

      // Restore location marker if it should be visible
      if (showLocationMarker) {
        showLocationMarkerOnMap();
      }
    }

    setError(null);
  }, [clearExistingRoutes, showLocationMarker, showLocationMarkerOnMap]);

  const handleZoomIn = useCallback(() => {
    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom();
      const newZoom = Math.min(currentZoom + 1, 20);
      setZoom(newZoom);
      mapRef.current.setZoom(newZoom);
      console.log('🔍 Zoom in:', currentZoom, '→', newZoom);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom();
      const newZoom = Math.max(currentZoom - 1, 1);
      setZoom(newZoom);
      mapRef.current.setZoom(newZoom);
      console.log('🔍 Zoom out:', currentZoom, '→', newZoom);
    }
  }, []);

  const onMapLoad = useCallback((map: L.Map) => {
    console.log('🗺️ onMapLoad called with map:', map);
    if (map && typeof map.getContainer === 'function') {
      console.log('🗺️ Map is valid, setting reference');
      mapRef.current = map;

      // Ensure map is ready before any operations
      setTimeout(() => {
        if (mapRef.current) {
          console.log('🗺️ Map reference confirmed:', mapRef.current);
          console.log('🗺️ Map container:', mapRef.current.getContainer());
          console.log('🗺️ Map center:', mapRef.current.getCenter());
        } else {
          console.error('❌ Map reference lost after timeout');
        }
      }, 100);
    } else {
      console.error('❌ Invalid map object passed to onMapLoad:', map);
    }
  }, []);

  // Add keyboard shortcuts for zooming
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't handle shortcuts when typing in input fields
      }

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Error Message */}
      {error && (
        <div className="absolute top-4 left-4 right-4 z-[1000] p-3 text-destructive-foreground bg-destructive rounded-md shadow-lg border border-destructive/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Location Status Indicator */}
      {isUsingDefaultLocation && (
        <div className="absolute top-4 left-4 z-[20] p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 rounded-md shadow-lg border border-orange-200 dark:border-orange-800">
          <div className="flex items-center gap-2 text-xs">
            <Navigation className="h-3 w-3" />
            <span className="font-medium">Showing Delhi (Default)</span>
          </div>
        </div>
      )}

      {/* Map Container */}
      <div className="absolute inset-0 z-0">
        <MapContainer
          center={[position.lat, position.lng]}
          zoom={zoom}
          className="h-full w-full"
          zoomControl={false}
          attributionControl={false}
          ref={(map) => {
            if (map && !mapRef.current) {
              console.log('🗺️ MapContainer ref callback, setting map reference');
              mapRef.current = map;
            }
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEventHandlers
            onMapLoad={onMapLoad}
            position={position}
            setPosition={setPosition}
          />
        </MapContainer>
      </div>

      {/* Controls - Bottom Left */}
      <div className="absolute bottom-4 left-4 z-[40] space-y-2">
        <Button
          onClick={getCurrentLocation}
          size="sm"
          className={`${isUsingDefaultLocation ? 'bg-orange-600 hover:bg-orange-700' : 'bg-primary hover:bg-primary/90'} text-primary-foreground shadow-lg border-0`}
          disabled={isLocating}
        >
          {isLocating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4 mr-2" />
          )}
          {isLocating ? 'Locating...' : isUsingDefaultLocation ? 'Get My Location' : 'Locate Me'}
        </Button>

        <Button
          onClick={toggleLocationMarker}
          size="sm"
          variant={showLocationMarker ? "default" : "outline"}
          className={`${showLocationMarker ? 'bg-green-600 hover:bg-green-700' : 'bg-background/95 backdrop-blur-sm'} shadow-lg border border-border/50`}
        >
          <MapPin className="h-4 w-4 mr-2" />
          {showLocationMarker ? 'Hide Location' : 'Show Location'}
        </Button>

        <Button
          onClick={() => setShowRouteForm(!showRouteForm)}
          size="sm"
          variant="outline"
          className="bg-background/95 backdrop-blur-sm shadow-lg border border-border/50"
        >
          <Route className="h-4 w-4 mr-2" />
          {showRouteForm ? 'Hide Route Planner' : 'Show Route Planner'}
        </Button>
      </div>

      {/* Route Form */}
      {showRouteForm && (
        <Card className="absolute top-4 left-4 z-[40] w-80 bg-background/95 backdrop-blur-sm shadow-xl border border-border/50">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center">
              <Route className="h-4 w-4 mr-2" />
              <CardTitle className="text-lg">Route Planner</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              onClick={() => setShowRouteForm(false)}
              aria-label="Close Route Planner"
            >
              <X className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Input
                placeholder="Enter origin city"
                value={routeInfo.origin}
                onChange={(e) => setRouteInfo(prev => ({ ...prev, origin: e.target.value }))}
                className="text-sm"
              />
              <Input
                placeholder="Enter destination city"
                value={routeInfo.destination}
                onChange={(e) => setRouteInfo(prev => ({ ...prev, destination: e.target.value }))}
                className="text-sm"
              />
            </div>

            {(routeInfo.distance || routeInfo.duration || safeRoutes) && (
              <div className="p-3 bg-muted/50 rounded-md text-sm border border-border/50">
                <div className="font-medium">Route Information:</div>
                {routeInfo.distance && <div>Distance: {routeInfo.distance}</div>}
                {routeInfo.duration && <div>Duration: {routeInfo.duration}</div>}
                {safeRoutes && (
                  <>
                    <div className="mt-2 flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-blue-500">Safety Recommendation</span>
                    </div>
                    <div className="text-xs mt-1">{safeRoutes.recommendation.reason}</div>
                    {safeRoutes.routes.map((route, index) => (
                      <div
                        key={index}
                        className={`mt-2 text-xs p-2 rounded ${index === safeRoutes.recommendation.recommended_route ? 'bg-blue-50 text-blue-700 font-semibold' : 'bg-purple-50 text-purple-700'}`}
                      >
                        <div>
                          <span>
                            {index === safeRoutes.recommendation.recommended_route
                              ? '✨ Recommended Route'
                              : route.name || 'Alternative Route'}
                          </span>
                        </div>
                        <div>
                          <span>Safety: {route.safety_score?.toFixed(2) ?? route.safety_breakdown?.overall?.toFixed(2) ?? 'N/A'}</span>
                        </div>
                        <div>
                          <span>Level: {route.safety_level ?? 'N/A'}</span>
                        </div>
                        <div>
                          <span>Distance: {route.distance_km ? `${route.distance_km.toFixed(2)} km` : 'N/A'}</span>
                        </div>
                        <div>
                          <span>Duration: {route.duration_minutes ? `${route.duration_minutes.toFixed(1)} min` : 'N/A'}</span>
                        </div>
                      </div>
                    ))}
                  </>
                )}
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

      {/* Attribution - Bottom Right */}
      <div className="absolute bottom-2 right-2 z-[20] opacity-{10}">
        <div className="bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-muted-foreground opacity-{10}">
          © OpenStreetMap contributors
        </div>
      </div>
    </div>
  );
}

// Export the global location cache for SOS to use
export { globalLocationCache };
