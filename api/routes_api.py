from flask import Flask, request, jsonify
from flask_cors import CORS
import logging
from typing import Dict, Any
from datetime import datetime

from map.route_processer import get_route_with_safety
from configs.configurations import MapConfig

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

class RequestValidator:
    """Handles request validation"""
    
    @staticmethod
    def validate_route_request(data: Dict[str, Any]) -> tuple[bool, str]:
        """Validate route request data"""
        required_fields = ['start_lat', 'start_lon', 'end_lat', 'end_lon']
        
        for field in required_fields:
            if field not in data:
                return False, f'Missing required field: {field}'
        
        try:
            start_lat = float(data['start_lat'])
            start_lon = float(data['start_lon'])
            end_lat = float(data['end_lat'])
            end_lon = float(data['end_lon'])
            
            if not (-90 <= start_lat <= 90) or not (-90 <= end_lat <= 90):
                return False, 'Invalid latitude values'
            if not (-180 <= start_lon <= 180) or not (-180 <= end_lon <= 180):
                return False, 'Invalid longitude values'
                
        except (ValueError, TypeError):
            return False, 'Invalid coordinate format'
        
        # Validate time period
        time_period = data.get('time_period', 'overall')
        if time_period not in ['day', 'night', 'overall']:
            return False, 'Invalid time_period. Must be: day, night, or overall'
        
        return True, ''

@app.route('/api/safe-routes', methods=['POST'])
def get_safe_routes():
    """API endpoint to get safe routes"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        validator = RequestValidator()
        is_valid, error_message = validator.validate_route_request(data)
        if not is_valid:
            return jsonify({'error': error_message}), 400
        
        start_lat = float(data['start_lat'])
        start_lon = float(data['start_lon'])
        end_lat = float(data['end_lat'])
        end_lon = float(data['end_lon'])
        time_period = data.get('time_period', 'overall')
        num_alternatives = min(int(data.get('num_alternatives', 2)), 3)  
        
        result = get_route_with_safety(
            start_lat=start_lat,
            start_lon=start_lon,
            end_lat=end_lat,
            end_lon=end_lon,
            time_period=time_period,
            num_alternatives=num_alternatives
        )
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error in get_safe_routes: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    map_config = MapConfig()
    
    return jsonify({
        'status': 'healthy',
        'service': 'SHEILD Safety API',
        'timestamp': datetime.now().isoformat(),
        'api_keys_configured': {
            'ors': bool(map_config.ors_api_key)
        }
    })



@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    logger.info("Starting SHEILD Safety API...")
    app.run(debug=True, host='0.0.0.0', port=5000)
