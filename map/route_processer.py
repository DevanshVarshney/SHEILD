import requests
import h3.api.basic_str as h3
import numpy as np
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime
import logging
from configs.configurations import MapConfig
from dotenv import load_dotenv
from functools import lru_cache

from database.h3_processing import H3SafetyProcessor
from configs.configurations import MapConfig

load_dotenv()
logger = logging.getLogger(__name__)

@dataclass
class RoutePoint:
    """Represents a geographic point with latitude and longitude"""
    lat: float
    lon: float

@dataclass
class SafetyRoute:
    """Represents a route with safety information"""
    coordinates: List[Tuple[float, float]]
    safety_score: float
    distance_km: float
    duration_minutes: float
    h3_indices: List[str]
    safety_breakdown: Dict[str, float]
    route_type: str = "standard"

class RouteAPIClient:
    """Handles external routing API calls"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.ors_api_key = MapConfig().ors_api_key
        self.base_url = "https://api.openrouteservice.org/v2"
        self.timeout = 10

    @staticmethod
    @lru_cache(maxsize=128)
    def _cached_ors_routes(api_key, start_lat, start_lon, end_lat, end_lon, alternatives):
        url = "https://api.openrouteservice.org/v2/directions/driving-car"
        headers = {
            'Authorization': api_key,
            'Content-Type': 'application/json'
        }
        body = {
            'coordinates': [[start_lon, start_lat], [end_lon, end_lat]],
            'alternative_routes': {
                'target_count': alternatives,
                'weight_factor': 1.4,
                'share_factor': 0.6
            },
            'format': 'json'
        }
        try:
            response = requests.post(url, json=body, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            if 'routes' in data:
                import polyline
                converted_routes = []
                for route in data['routes']:
                    coordinates = [[lon, lat] for lat, lon in polyline.decode(route['geometry'])]
                    converted_routes.append({
                        'geometry': {'type': 'LineString', 'coordinates': coordinates},
                        'properties': {
                            'summary': route.get('summary', {}),
                            'segments': route.get('segments', [])
                        }
                    })
                return converted_routes
            else:
                return []
        except Exception:
            return []

    def get_ors_routes(self, start: RoutePoint, end: RoutePoint, alternatives: int = 2) -> List[Dict]:
        if not self.ors_api_key:
            return []
        return self._cached_ors_routes(
            self.ors_api_key,
            start.lat, start.lon, end.lat, end.lon, alternatives
        )
    
class SafetyCalculator:
    """Handles safety score calculations for routes"""
    
    def __init__(self, h3_processor: H3SafetyProcessor):
        self.h3_processor = h3_processor
    
    def latlon_to_h3(self, lat: float, lon: float) -> str:
        """Convert latitude/longitude to H3 index"""
        return h3.latlng_to_cell(lat, lon, self.h3_processor.resolution)
    
    def calculate_route_safety(self, route_coords: List[Tuple[float, float]], 
                             time_period: str = 'overall') -> Dict:
        """Calculate safety score for a route using updated H3 API"""
        h3_indices = []
        safety_scores = []
        
        # Convert route coordinates to H3 indices
        for lat, lon in route_coords:
            try:
                h3_index = self.latlon_to_h3(lat, lon)
                if h3_index not in h3_indices:  # Avoid duplicates
                    h3_indices.append(h3_index)
                    safety_score = self.h3_processor.get_safety_score_for_location(lat, lon, time_period)
                    safety_scores.append(safety_score)
            except Exception as e:
                logger.warning(f"Error processing coordinate ({lat}, {lon}): {e}")
                continue
        
        if not safety_scores:
            default_score = 67.5
            return {
                'overall_safety': default_score,
                'min_safety': default_score,
                'max_safety': default_score,
                'safety_variance': 0,
                'h3_count': 0
            }
        
        # Calculate statistics
        overall_safety = np.mean(safety_scores)
        min_safety = np.min(safety_scores)
        max_safety = np.max(safety_scores)
        safety_variance = np.var(safety_scores)
        
        return {
            'overall_safety': float(overall_safety),
            'min_safety': float(min_safety),
            'max_safety': float(max_safety),
            'safety_variance': float(safety_variance),
            'h3_count': len(h3_indices)
        }

class RouteFormatter:
    """Handles formatting routes for frontend consumption"""
    
    @staticmethod
    def get_safety_level(score: float) -> str:
        """Convert safety score to descriptive level"""
        if score >= 80:
            return "Very Safe"
        elif score >= 65:
            return "Safe"
        elif score >= 50:
            return "Moderate"
        elif score >= 35:
            return "Caution Advised"
        else:
            return "High Risk"
    
    @staticmethod
    def get_route_recommendation(routes: List[SafetyRoute]) -> Dict:
        """Provide route recommendation based on safety and other factors"""
        if not routes:
            return {"message": "No routes available"}
        
        best_safety = max(routes, key=lambda x: x.safety_score)
        shortest = min(routes, key=lambda x: x.distance_km)
        
        if best_safety == shortest:
            return {
                "recommended_route": 0,
                "reason": "Best combination of safety and efficiency"
            }
        elif best_safety.safety_score - shortest.safety_score > 15:
            return {
                "recommended_route": routes.index(best_safety),
                "reason": "Prioritizing safety over shorter distance"
            }
        else:
            return {
                "recommended_route": routes.index(shortest),
                "reason": "Good balance of safety and efficiency"
            }
    
    def format_for_google_maps(self, routes: List[SafetyRoute]) -> Dict:
        """Format routes specifically for Google Maps frontend"""
        formatted_routes = []
        
        for i, route in enumerate(routes):
            # Google Maps expects path as array of {lat, lng} objects
            google_maps_path = [
                {"lat": lat, "lng": lon} for lat, lon in route.coordinates
            ]
            
            formatted_route = {
                'id': i,
                'name': f"Route {i + 1}",
                'type': route.route_type,
                'path': google_maps_path,  # Google Maps format
                'safety_score': round(route.safety_score, 2),
                'safety_level': self.get_safety_level(route.safety_score),
                'safety_color': self._get_safety_color(route.safety_score),
                'distance_km': round(route.distance_km, 2),
                'duration_minutes': round(route.duration_minutes, 1),
                'stroke_weight': 6 if i == 0 else 4,  # Primary route thicker
                'stroke_opacity': 0.8,
                'z_index': 100 - i,  # Primary route on top
                'safety_breakdown': {
                    'overall': round(route.safety_breakdown['overall_safety'], 2),
                    'minimum': round(route.safety_breakdown['min_safety'], 2),
                    'maximum': round(route.safety_breakdown['max_safety'], 2),
                    'variance': round(route.safety_breakdown['safety_variance'], 2)
                }
            }
            formatted_routes.append(formatted_route)
        
        return {
            'success': True,
            'routes': formatted_routes,
            'recommendation': self.get_route_recommendation(routes),
            'bounds': self._calculate_bounds(routes),
            'generated_at': datetime.now().isoformat()
        }
    
    def _calculate_bounds(self, routes: List[SafetyRoute]) -> Dict:
        """Calculate bounds for all routes to center the map"""
        if not routes:
            return {}
        
        all_coords = []
        for route in routes:
            all_coords.extend(route.coordinates)
        
        lats = [coord[0] for coord in all_coords]
        lngs = [coord[1] for coord in all_coords]
        
        return {
            'north': max(lats),
            'south': min(lats),
            'east': max(lngs),
            'west': min(lngs)
        }
    
    def format_routes_for_frontend(self, routes: List[SafetyRoute], output_format: str = 'standard') -> Dict:
        """Format routes for frontend consumption"""
        if output_format == 'google_maps':
            return self.format_for_google_maps(routes)
        elif output_format == 'geojson':
            return self._format_as_geojson(routes)
        else:
            # Standard format - keeping existing logic
            formatted_routes = []
            
            for i, route in enumerate(routes):
                formatted_route = {
                    'id': i,
                    'name': f"Route {i + 1}",
                    'type': route.route_type,
                    'coordinates': route.coordinates,
                    'safety_score': round(route.safety_score, 2),
                    'safety_level': self.get_safety_level(route.safety_score),
                    'distance_km': round(route.distance_km, 2),
                    'duration_minutes': round(route.duration_minutes, 1),
                    'h3_indices_count': len(route.h3_indices),
                    'safety_breakdown': {
                        'overall': round(route.safety_breakdown['overall_safety'], 2),
                        'minimum': round(route.safety_breakdown['min_safety'], 2),
                        'maximum': round(route.safety_breakdown['max_safety'], 2),
                        'variance': round(route.safety_breakdown['safety_variance'], 2)
                    }
                }
                formatted_routes.append(formatted_route)
            
            return {
                'success': True,
                'routes': formatted_routes,
                'recommendation': self.get_route_recommendation(routes),
                'generated_at': datetime.now().isoformat()
            }
    
    def _format_as_geojson(self, routes: List[SafetyRoute]) -> Dict:
        """Format routes as GeoJSON for mapping libraries"""
        features = []
        
        for i, route in enumerate(routes):
            # Convert coordinates to GeoJSON format [lon, lat]
            coordinates = [[lon, lat] for lat, lon in route.coordinates]
            
            feature = {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": coordinates
                },
                "properties": {
                    "id": i,
                    "name": f"Route {i + 1}",
                    "type": route.route_type,
                    "safety_score": round(route.safety_score, 2),
                    "safety_level": self.get_safety_level(route.safety_score),
                    "distance_km": round(route.distance_km, 2),
                    "duration_minutes": round(route.duration_minutes, 1),
                    "h3_indices_count": len(route.h3_indices),
                    "safety_breakdown": {
                        "overall": round(route.safety_breakdown['overall_safety'], 2),
                        "minimum": round(route.safety_breakdown['min_safety'], 2),
                        "maximum": round(route.safety_breakdown['max_safety'], 2),
                        "variance": round(route.safety_breakdown['safety_variance'], 2)
                    },
                    # Color coding for map styling
                    "color": self._get_safety_color(route.safety_score),
                    "weight": 5 if i == 0 else 3,  # Primary route thicker
                    "opacity": 0.8
                }
            }
            features.append(feature)
        
        return {
            "type": "FeatureCollection",
            "features": features,
            "properties": {
                "recommendation": self.get_route_recommendation(routes),
                "generated_at": datetime.now().isoformat()
            }
        }
    
    def _get_safety_color(self, score: float) -> str:
        """Get color code based on safety score for map styling"""
        if score >= 80:
            return "#28a745"  # Green - Very Safe
        elif score >= 65:
            return "#17a2b8"  # Blue - Safe
        elif score >= 50:
            return "#ffc107"  # Yellow - Moderate
        elif score >= 35:
            return "#fd7e14"  # Orange - Caution
        else:
            return "#dc3545"  # Red - High Risk

class RouteProcessor:
    """Main route processing orchestrator"""

    # Class-level cache for H3 safety scores
    _h3_scores_cache = None

    def __init__(self):
        self.h3_processor = H3SafetyProcessor()
        self.api_client = RouteAPIClient(MapConfig().ors_api_key)
        self.safety_calculator = SafetyCalculator(self.h3_processor)
        self.formatter = RouteFormatter()

        # Load H3 safety scores only once per process
        if RouteProcessor._h3_scores_cache is None:
            try:
                self.h3_processor.load_h3_scores_from_database()
                RouteProcessor._h3_scores_cache = self.h3_processor.h3_safety_scores
            except Exception as e:
                self.h3_processor.h3_safety_scores = {'day': {}, 'night': {}, 'overall': {}}
                RouteProcessor._h3_scores_cache = self.h3_processor.h3_safety_scores
        else:
            self.h3_processor.h3_safety_scores = RouteProcessor._h3_scores_cache

    def _get_routes(self, start: RoutePoint, end: RoutePoint, alternatives: int) -> List[Dict]:
        """Get route alternatives from API or mock data"""
        # Try real API first
        try:
            routes = self.api_client.get_ors_routes(start, end, alternatives)
        except Exception as e:
            logger.error(f"Error fetching routes from ORS API: {e}")
            logger.info("Using mock routes as fallback")
            raise f" Error fetching routes, {e}"
        
      
        return routes
    
    def _extract_route_data(self, route: Dict) -> Tuple[List[Tuple[float, float]], float, float]:
        """Extract coordinates and properties from route data"""
        if 'geometry' not in route or 'coordinates' not in route['geometry']:
            raise ValueError("Invalid route geometry")
            
        coords = route['geometry']['coordinates']
        route_coords = [(lat, lon) for lon, lat in coords]  # Convert [lon, lat] to [lat, lon]
        
        # Extract from ORS summary format
        properties = route.get('properties', {})
        summary = properties.get('summary', {})
        
        distance_km = summary.get('distance', 0) / 1000  # Convert meters to km
        duration_minutes = summary.get('duration', 0) / 60  # Convert seconds to minutes
        
        return route_coords, distance_km, duration_minutes
    
    def get_safe_routes(self, start_lat: float, start_lon: float, 
                       end_lat: float, end_lon: float,
                       time_period: str = 'overall',
                       num_alternatives: int = 2) -> List[SafetyRoute]:
        """Get multiple route options with safety scores"""
        start_point = RoutePoint(start_lat, start_lon)
        end_point = RoutePoint(end_lat, end_lon)
        
        raw_routes = self._get_routes(start_point, end_point, num_alternatives)
        
        safety_routes = []
        
        for i, route in enumerate(raw_routes):
            try:
                route_coords, distance_km, duration_minutes = self._extract_route_data(route)
                
                safety_breakdown = self.safety_calculator.calculate_route_safety(route_coords, time_period)
                
                h3_indices = [self.safety_calculator.latlon_to_h3(lat, lon) for lat, lon in route_coords]
                
                safety_route = SafetyRoute(
                    coordinates=route_coords,
                    safety_score=safety_breakdown['overall_safety'],
                    distance_km=distance_km,
                    duration_minutes=duration_minutes,
                    h3_indices=list(set(h3_indices)), 
                    safety_breakdown=safety_breakdown,
                    route_type="primary" if i == 0 else "alternative"
                )
                
                safety_routes.append(safety_route)
                
            except Exception as e:
                logger.warning(f"Error processing route {i}: {e}")
                continue
        
        safety_routes.sort(key=lambda x: x.safety_score, reverse=True)
        
        return safety_routes
    
    def format_routes_for_frontend(self, routes: List[SafetyRoute], output_format: str = 'standard') -> Dict:
        """Format routes for frontend consumption"""
        return self.formatter.format_routes_for_frontend(routes, output_format)


def get_route_with_safety(start_lat: float, start_lon: float, 
                         end_lat: float, end_lon: float,
                         time_period: str = 'overall',
                         num_alternatives: int = 2,
                         output_format: str = 'standard') -> Dict:
    """Main function to get routes with safety scores"""
    try:
        processor = RouteProcessor()
        routes = processor.get_safe_routes(
            start_lat, start_lon, end_lat, end_lon, 
            time_period, num_alternatives
        )
        return processor.formatter.format_routes_for_frontend(routes, output_format)
    except Exception as e:
        logger.error(f"Error getting routes with safety: {e}")
        return {
            'error': str(e),
            'routes': [],
            'generated_at': datetime.now().isoformat()
        }
# if __name__ == "__main__":
#     # start_lat=28.6139
#     # start_lon=77.2090
#     # end_lat=28.5355
#     # end_lon=77.3910
#     # ors_api= RouteAPIClient()
#     # res=ors_api.get_ors_routes(
#     #     start=RoutePoint(start_lat, start_lon),
#     #     end=RoutePoint(end_lat, end_lon)
#     # )
#     # print(res)

#     result = get_route_with_safety(
#         start_lat=28.6139,  # Delhi example
#         start_lon=77.2090,
#         end_lat=28.5355,
#         end_lon=77.3910,
#         time_period='day'
#     )
    
    
    print("Route Analysis Result:")
    if 'error' in result:
        print(f"Error: {result['error']}")
    else:
        print(f"Found {len(result['routes'])} routes")
        for route in result['routes']:
            print(f"Route {route['id'] + 1}: Safety {route['safety_score']} ({route['safety_level']}), Distance {route['distance_km']}km")