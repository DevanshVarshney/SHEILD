
import logging
from typing import Tuple, List
from geopy.distance import geodesic

def setup_logging(level: str = 'INFO') -> logging.Logger:
    """Setup logging configuration"""
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    return logging.getLogger(__name__)

def validate_coordinates(lat: float, lon: float) -> bool:
    """Validate latitude and longitude values"""
    return (-90 <= lat <= 90) and (-180 <= lon <= 180)

def calculate_distance_km(start_lat: float, start_lon: float, 
                         end_lat: float, end_lon: float) -> float:
    """Calculate distance between two points in kilometers"""
    return geodesic((start_lat, start_lon), (end_lat, end_lon)).kilometers

def get_route_bounds(coordinates: List[Tuple[float, float]]) -> dict:
    """Get bounding box for a list of coordinates"""
    if not coordinates:
        return {}
    
    lats = [coord[0] for coord in coordinates]
    lons = [coord[1] for coord in coordinates]
    
    return {
        'north': max(lats),
        'south': min(lats),
        'east': max(lons),
        'west': min(lons)
    }

def format_duration(minutes: float) -> str:
    """Format duration in minutes to human readable format"""
    if minutes < 60:
        return f"{int(minutes)} mins"
    else:
        hours = int(minutes // 60)
        mins = int(minutes % 60)
        return f"{hours}h {mins}m" if mins > 0 else f"{hours}h"

def format_distance(km: float) -> str:
    """Format distance in km to human readable format"""
    if km < 1:
        return f"{int(km * 1000)} m"
    else:
        return f"{km:.1f} km"
