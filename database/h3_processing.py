import h3.api.basic_str as h3
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from datetime import datetime, time
import os
from dotenv import load_dotenv
from typing import Dict, List, Tuple, Optional
import logging
from geopy.distance import geodesic
import json
from configs.configurations import DatabaseConfig

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class H3IndexManager:
    """Handles H3 index operations and conversions"""
    
    def __init__(self, resolution: int = 9):
        self.resolution = resolution
    
    def latlon_to_h3(self, lat: float, lon: float) -> str:
        """Convert latitude/longitude to H3 index"""
        return h3.latlng_to_cell(lat, lon, self.resolution)
    
    def h3_to_latlon(self, h3_index: str) -> Tuple[float, float]:
        """Convert H3 index to latitude/longitude"""
        return h3.cell_to_latlng(h3_index)

class IncidentDataProcessor:
    """Handles incident data loading and preprocessing"""
    
    def __init__(self, engine, h3_manager: H3IndexManager):
        self.engine = engine
        self.h3_manager = h3_manager
    
    def load_incident_data(self) -> pd.DataFrame:
        """Load incident data from database"""
        query = """
        SELECT latitude, longitude, severity, incident_date, time_from, categories
        FROM incident_details 
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        """
        try:
            df = pd.read_sql(query, self.engine)
            logger.info(f"Loaded {len(df)} incidents from database")
            return df
        except Exception as e:
            logger.error(f"Error loading incident data: {e}")
            raise
    
    def preprocess_incident_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add H3 indices and time period classification to incident data"""
        logger.info(f"Processing {len(df)} incidents...")
        
        df['h3_index'] = df.apply(
            lambda row: self.h3_manager.latlon_to_h3(row['latitude'], row['longitude']), 
            axis=1
        )
        
        # Separate day and night incidents
        df['hour'] = pd.to_datetime(df['time_from'], format='%H:%M:%S', errors='coerce').dt.hour
        df['time_period'] = df['hour'].apply(
            lambda x: 'day' if 6 <= x < 22 else 'night' if pd.notna(x) else 'unknown'
        )
        
        return df

class SafetyScoreCalculator:
    """Handles safety score calculations"""
    
    @staticmethod
    def calculate_safety_score(incident_count: int, avg_severity: float, max_severity: float) -> float:
        """Calculate safety score based on incident metrics"""
        incident_weight = min(incident_count / 10, 1.0) 
        severity_weight = avg_severity / 10 
        max_severity_penalty = max_severity / 10
        
        raw_score = 100 - (
            incident_weight * 40 +  
            severity_weight * 35 + 
            max_severity_penalty * 25 
        )
        
        return max(0, min(100, raw_score))
    
    def calculate_period_scores(self, df: pd.DataFrame, time_period: str, h3_manager: H3IndexManager) -> Dict[str, Dict]:
        """Calculate safety scores for a specific time period"""
        period_data = df[df['time_period'] == time_period]
        
        if len(period_data) == 0:
            logger.warning(f"No data found for time period: {time_period}")
            return {}
        
        # Group by H3 index and calculate metrics
        h3_stats = period_data.groupby('h3_index').agg({
            'severity': ['count', 'mean', 'max'],
            'latitude': 'first',
            'longitude': 'first'
        }).reset_index()
        
        h3_stats.columns = ['h3_index', 'incident_count', 'avg_severity', 'max_severity', 'lat', 'lon']
        
        scores = {}
        for _, row in h3_stats.iterrows():
            h3_index = row['h3_index']
            safety_score = self.calculate_safety_score(
                row['incident_count'], 
                row['avg_severity'], 
                row['max_severity']
            )
            
            scores[h3_index] = {
                'safety_score': safety_score,
                'incident_count': row['incident_count'],
                'avg_severity': row['avg_severity'],
                'max_severity': row['max_severity'],
                'lat': row['lat'],
                'lon': row['lon']
            }
        
        logger.info(f"Calculated scores for {len(scores)} H3 indices in {time_period} period")
        return scores

class H3DatabaseManager:
    """Handles database operations for H3 safety scores"""
    
    def __init__(self, engine):
        self.engine = engine
    
    def save_h3_scores_to_database(self, h3_safety_scores: Dict, resolution: int):
        """Save H3 safety scores to database"""
        logger.info("Saving H3 safety scores to database...")
        
        # Create H3 safety scores table
        create_table_query = """
        CREATE TABLE IF NOT EXISTS h3_safety_scores (
            h3_index VARCHAR(16) PRIMARY KEY,
            latitude DECIMAL(11, 8),
            longitude DECIMAL(11, 8),
            overall_score DECIMAL(5, 2),
            day_score DECIMAL(5, 2),
            night_score DECIMAL(5, 2),
            incident_count_day INTEGER,
            incident_count_night INTEGER,
            resolution INTEGER,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        
        with self.engine.connect() as conn:
            conn.execute(text(create_table_query))
            conn.commit()
        
        # Prepare data for insertion
        insert_data = []
        for h3_index, data in h3_safety_scores['overall'].items():
            day_data = h3_safety_scores['day'].get(h3_index, {})
            night_data = h3_safety_scores['night'].get(h3_index, {})
            
            insert_data.append({
                'h3_index': h3_index,
                'latitude': data.get('lat'),
                'longitude': data.get('lon'),
                'overall_score': data['safety_score'],
                'day_score': data['day_score'],
                'night_score': data['night_score'],
                'incident_count_day': day_data.get('incident_count', 0),
                'incident_count_night': night_data.get('incident_count', 0),
                'resolution': resolution
            })
        
        # Insert data
        df_scores = pd.DataFrame(insert_data)
        df_scores.to_sql('h3_safety_scores', self.engine, if_exists='replace', index=False)
        
        logger.info(f"Saved {len(insert_data)} H3 safety scores to database")

class H3SafetyProcessor:
    def __init__(self, resolution: int = 9):
        """
        Initialize H3 safety processor
        resolution: H3 resolution level (9 gives ~174m average hexagon edge length)
        """
        self.resolution = resolution
        self.connection_string = DatabaseConfig().connection_string
        self.engine = create_engine(self.connection_string)
        self.h3_safety_scores = {}
        self.h3_manager = H3IndexManager(resolution)
        self.incident_processor = IncidentDataProcessor(self.engine, self.h3_manager)
        self.safety_score_calculator = SafetyScoreCalculator()
        self.db_manager = H3DatabaseManager(self.engine)
        
    def calculate_h3_safety_scores(self):
        """Calculate safety scores for each H3 index based on incident data"""
        logger.info("Loading incident data from database...")
        
        # Load incident data
        df = self.incident_processor.load_incident_data()
        
        # Preprocess incident data (add H3 indices, time period classification)
        df = self.incident_processor.preprocess_incident_data(df)
        
        # Calculate safety scores for each H3 index
        h3_scores = {'day': {}, 'night': {}, 'overall': {}}
        
        for time_period in ['day', 'night']:
            period_scores = self.safety_score_calculator.calculate_period_scores(
                df, 
                time_period, 
                self.h3_manager
            )
            
            h3_scores[time_period] = period_scores
        
        # Calculate overall scores (weighted average of day/night)
        all_h3_indices = set(h3_scores['day'].keys()) | set(h3_scores['night'].keys())
        
        for h3_index in all_h3_indices:
            day_score = h3_scores['day'].get(h3_index, {}).get('safety_score', 75)  # Default moderate safety
            night_score = h3_scores['night'].get(h3_index, {}).get('safety_score', 60)  # Default lower night safety
            
            # Get coordinates from either day or night data, or convert from H3 index
            coords = (h3_scores['day'].get(h3_index) or h3_scores['night'].get(h3_index, {}))
            if not coords.get('lat') or not coords.get('lon'):
                lat, lon = self.h3_manager.h3_to_latlon(h3_index)
                coords = {'lat': lat, 'lon': lon}
            
            h3_scores['overall'][h3_index] = {
                'safety_score': (day_score + night_score) / 2,
                'day_score': day_score,
                'night_score': night_score,
                'lat': coords.get('lat'),
                'lon': coords.get('lon')
            }
        
        self.h3_safety_scores = h3_scores
        logger.info(f"Calculated safety scores for {len(all_h3_indices)} H3 indices")
        
        return h3_scores
    
    def get_safety_score_for_location(self, lat: float, lon: float, time_period: str = 'overall') -> float:
        """Get safety score for a specific location"""
        h3_index = self.h3_manager.latlon_to_h3(lat, lon)
        
        if time_period in self.h3_safety_scores and h3_index in self.h3_safety_scores[time_period]:
            return self.h3_safety_scores[time_period][h3_index]['safety_score']
        
        # Return default safety score if no data available
        default_scores = {'day': 75, 'night': 60, 'overall': 67.5}
        return default_scores.get(time_period, 67.5)
    
    def get_h3_crime_density(self) -> Dict:
        """Get crime density data for visualization (similar to your reference code)"""
        logger.info("Calculating H3 crime density...")
        
        # Load incident data
        query = """
        SELECT latitude, longitude, severity, incident_date, time_from, categories
        FROM incident_details 
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        """
        df = pd.read_sql(query, self.engine)
        
        # Add H3 index
        df['h3_index'] = df.apply(
            lambda row: self.h3_manager.latlon_to_h3(row['latitude'], row['longitude']), 
            axis=1
        )
        
        # Calculate crime density (similar to your reference)
        crime_density = df['h3_index'].value_counts().reset_index()
        crime_density.columns = ['h3_index', 'crime_count']
        
        # Add lat/lon for each H3 index
        crime_density[['lat', 'lon']] = crime_density['h3_index'].apply(
            lambda x: pd.Series(self.h3_manager.h3_to_latlon(x))
        )
        
        return crime_density.to_dict('records')
    
    def save_h3_scores_to_database(self):
        """Save H3 safety scores to database"""
        logger.info("Saving H3 safety scores to database...")
        
        self.db_manager.save_h3_scores_to_database(self.h3_safety_scores, self.resolution)
    
    def load_h3_scores_from_database(self):
        """Load precomputed H3 safety scores from the database"""
        query = "SELECT * FROM h3_safety_scores"
        df = pd.read_sql(query, self.engine)
        h3_scores = {'day': {}, 'night': {}, 'overall': {}}
        for _, row in df.iterrows():
            h3_index = row['h3_index']
            h3_scores['overall'][h3_index] = {
                'safety_score': row['overall_score'],
                'day_score': row['day_score'],
                'night_score': row['night_score'],
                'lat': row['latitude'],
                'lon': row['longitude']
            }
            h3_scores['day'][h3_index] = {
                'safety_score': row['day_score'],
                'lat': row['latitude'],
                'lon': row['longitude']
            }
            h3_scores['night'][h3_index] = {
                'safety_score': row['night_score'],
                'lat': row['latitude'],
                'lon': row['longitude']
            }
        self.h3_safety_scores = h3_scores

def main():
    """Main function to calculate and save H3 safety scores"""
    processor = H3SafetyProcessor(resolution=9)
    
    try:
        # Calculate safety scores
        scores = processor.calculate_h3_safety_scores()
        
        # Save to database
        processor.save_h3_scores_to_database()
        
        # Print some statistics
        total_indices = len(scores['overall'])
        avg_safety = np.mean([data['safety_score'] for data in scores['overall'].values()])
        
        logger.info(f"H3 Processing Complete!")
        logger.info(f"Total H3 indices: {total_indices}")
        logger.info(f"Average safety score: {avg_safety:.2f}")
        
        # Optional: Get crime density for visualization
        crime_density = processor.get_h3_crime_density()
        logger.info(f"Crime density calculated for {len(crime_density)} H3 cells")
        
    except Exception as e:
        logger.error(f"H3 processing failed: {e}")
        raise

# if __name__ == "__main__":
#     main()