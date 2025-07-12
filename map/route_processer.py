import requests
import h3.api.basic_str as h3
import numpy as np
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from datetime import datetime
import logging
import os
from dotenv import load_dotenv
from database.h3_processing import H3SafetyProcessor
from configs.configurations import MapConfig

load_dotenv()
logger = logging.getLogger(__name__)

@dataclass
class RoutePoint:
    lat: float
    lon: float

@dataclass
class SafetyRoute:
    coordinates: List[Tuple[float, float]]
    safety_score: float
    distance_km: float
    duration_minutes: float
    h3_indices: List[str]
    safety_breakdown: Dict[str, float]

class RouteProcessor:
    def __init__(self):
        self.h3_processor = H3SafetyProcessor()
        try:
            self.h3_processor.calculate_h3_safety_scores()
        except Exception as e:
            logger.error(f"Failed to load H3 safety scores: {e}")
            self.h3_processor.h3_safety_scores = {'day': {}, 'night': {}, 'overall': {}}
        
        self.ors_api_key = MapConfig().ors_api_key
    
    def latlon_to_h3(self, lat: float, lon: float) -> str:
        """Convert latitude/longitude to H3 index"""
        return h3.latlng_to_cell(lat, lon, self.h3_processor.resolution)
        
    def get_routes_from_ors(self, start: RoutePoint, end: RoutePoint, alternatives: int = 2) -> List[Dict]:
        """Get route alternatives from OpenRouteService"""
        if not self.ors_api_key:
            logger.warning("No ORS API key found, using mock routes")
            return self._generate_mock_routes(start, end, alternatives)
        
        url = "https://api.openrouteservice.org/v2/directions/driving-car"
        
        headers = {
            'Authorization': self.ors_api_key,
            'Content-Type': 'application/json'
        }
        
        body = {
            'coordinates': [[start.lon, start.lat], [end.lon, end.lat]],
            'alternative_routes': {
                'target_count': alternatives,
                'weight_factor': 1.4,
                'share_factor': 0.6
            },
            'format': 'geojson'
        }
        
        try:
            response = requests.post(url, json=body, headers=headers, timeout=10)
            response.raise_for_status()
            return response.json()['features']
        except Exception as e:
            logger.error(f"ORS API error: {e}")
            return self._generate_mock_routes(start, end, alternatives)
    
    def _generate_mock_routes(self, start: RoutePoint, end: RoutePoint, alternatives: int) -> List[Dict]:
        """Generate mock routes for testing when API is not available"""
        routes = []
        
        # Direct route
        direct_coords = [[start.lon, start.lat], [end.lon, end.lat]]
        routes.append({
            'geometry': {'coordinates': direct_coords},
            'properties': {
                'segments': [{
                    'distance': self._calculate_distance(start, end) * 1000,  # meters
                    'duration': self._calculate_distance(start, end) * 60    # rough minutes
                }]
            }
        })
        
        # Alternative routes (slightly offset)
        for i in range(alternatives):
            offset = 0.01 * (i + 1)
            mid_lat = (start.lat + end.lat) / 2 + offset
            mid_lon = (start.lon + end.lon) / 2 + offset
            
            alt_coords = [
                [start.lon, start.lat],
                [mid_lon, mid_lat],
                [end.lon, end.lat]
            ]
            
            routes.append({
                'geometry': {'coordinates': alt_coords},
                'properties': {
                    'segments': [{
                        'distance': self._calculate_distance(start, end) * 1200,  # slightly longer
                        'duration': self._calculate_distance(start, end) * 70
                    }]
                }
            })
        
        return routes
    
    def _calculate_distance(self, start: RoutePoint, end: RoutePoint) -> float:
        """Calculate distance between two points in km"""
        from geopy.distance import geodesic
        return geodesic((start.lat, start.lon), (end.lat, end.lon)).kilometers
    
    def calculate_route_safety(self, route_coords: List[Tuple[float, float]], 
                             time_period: str = 'overall') -> Dict:
        """Calculate safety score for a route using updated H3 API"""
        h3_indices = []
        safety_scores = []
        
        # Convert route coordinates to H3 indices
        for lat, lon in route_coords:
            h3_index = self.latlon_to_h3(lat, lon)
            if h3_index not in h3_indices:  # Avoid duplicates
                h3_indices.append(h3_index)
                safety_score = self.h3_processor.get_safety_score_for_location(lat, lon, time_period)
                safety_scores.append(safety_score)
        
        if not safety_scores:
            return {
                'overall_safety': 67.5,  # Default moderate safety
                'min_safety': 67.5,
                'max_safety': 67.5,
                'safety_variance': 0,
                'h3_count': 0
            }
        
        # Calculate weighted average (can be improved with distance weighting)
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
    
    def get_safe_routes(self, start_lat: float, start_lon: float, 
                       end_lat: float, end_lon: float,
                       time_period: str = 'overall',
                       num_alternatives: int = 2) -> List[SafetyRoute]:
        """Get multiple route options with safety scores"""
        start_point = RoutePoint(start_lat, start_lon)
        end_point = RoutePoint(end_lat, end_lon)
        
        # Get route alternatives
        raw_routes = self.get_routes_from_ors(start_point, end_point, num_alternatives)
        
        safety_routes = []
        
        for route in raw_routes:
            # Extract coordinates (format depends on routing service)
            if 'geometry' in route and 'coordinates' in route['geometry']:
                coords = route['geometry']['coordinates']
                # Convert [lon, lat] to [lat, lon]
                route_coords = [(lat, lon) for lon, lat in coords]
            else:
                continue
            
            # Calculate safety metrics
            safety_breakdown = self.calculate_route_safety(route_coords, time_period)
            
            # Extract route properties
            properties = route.get('properties', {})
            segments = properties.get('segments', [{}])
            segment = segments[0] if segments else {}
            
            distance_km = segment.get('distance', 0) / 1000  # Convert to km
            duration_minutes = segment.get('duration', 0) / 60  # Convert to minutes
            
            # Get H3 indices for the route using updated API
            h3_indices = [self.latlon_to_h3(lat, lon) for lat, lon in route_coords]
            
            safety_route = SafetyRoute(
                coordinates=route_coords,
                safety_score=safety_breakdown['overall_safety'],
                distance_km=distance_km,
                duration_minutes=duration_minutes,
                h3_indices=list(set(h3_indices)),  # Remove duplicates
                safety_breakdown=safety_breakdown
            )
            
            safety_routes.append(safety_route)
        
        # Sort by safety score (highest first)
        safety_routes.sort(key=lambda x: x.safety_score, reverse=True)
        
        return safety_routes
    
    def format_routes_for_frontend(self, routes: List[SafetyRoute]) -> Dict:
        """Format routes for frontend consumption"""
        formatted_routes = []
        
        for i, route in enumerate(routes):
            formatted_route = {
                'id': i,
                'name': f"Route {i + 1}",
                'coordinates': route.coordinates,
                'safety_score': round(route.safety_score, 2),
                'safety_level': self._get_safety_level(route.safety_score),
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
            'routes': formatted_routes,
            'recommendation': self._get_route_recommendation(routes),
            'generated_at': datetime.now().isoformat()
        }
    
    def _get_safety_level(self, score: float) -> str:
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
    
    def _get_route_recommendation(self, routes: List[SafetyRoute]) -> Dict:
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

# Example usage function
def get_route_with_safety(start_lat: float, start_lon: float, 
                         end_lat: float, end_lon: float,
                         time_period: str = 'overall') -> Dict:
    """Main function to get routes with safety scores"""
    processor = RouteProcessor()
    routes = processor.get_safe_routes(start_lat, start_lon, end_lat, end_lon, time_period)
    return processor.format_routes_for_frontend(routes)

if __name__ == "__main__":
    # Example usage
    result = get_route_with_safety(
        start_lat=28.6139,  # Delhi example
        start_lon=77.2090,
        end_lat=28.5355,
        end_lon=77.3910,
        time_period='day'
    )
    
    print("Route Analysis Result:")
    print(f"Found {len(result['routes'])} routes")
    for route in result['routes']:
        print(f"Route {route['id'] + 1}: Safety {route['safety_score']}, Distance {route['distance_km']}km")