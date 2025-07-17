import os
import psycopg2
import pandas as pd
from dotenv import load_dotenv
from typing import Optional
import logging
from sqlalchemy import create_engine
from tqdm import tqdm

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseConnection:
    def __init__(self):
        self.connection_string = os.getenv('DATABASE_URL')
        self.connection = None
        self.engine = None
    
    def connect(self):
        """Establish connection to the Neon PostgreSQL database"""
        try:
            self.connection = psycopg2.connect(self.connection_string)
            # Create SQLAlchemy engine for pandas operations
            self.engine = create_engine(self.connection_string)
            logger.info("Successfully connected to Neon PostgreSQL database")
            return self.connection
        except Exception as e:
            logger.error(f"Error connecting to database: {e}")
            raise
    
    def disconnect(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
        if self.engine:
            self.engine.dispose()
        logger.info("Database connection closed")
    
    def execute_query(self, query: str, params: Optional[tuple] = None):
        """Execute a query with optional parameters"""
        try:
            cursor = self.connection.cursor()
            cursor.execute(query, params)
            self.connection.commit()
            logger.info("Query executed successfully")
            return cursor
        except Exception as e:
            logger.error(f"Error executing query: {e}")
            self.connection.rollback()
            raise
    
    def create_incidents_table(self):
        """Create table for incident details based on your CSV structure"""
        create_table_query = """
        CREATE TABLE IF NOT EXISTS incident_details (
            id SERIAL PRIMARY KEY,
            area VARCHAR(255),
            city VARCHAR(255),
            state VARCHAR(255),
            country VARCHAR(255),
            latitude DECIMAL(11, 8),
            longitude DECIMAL(11, 8),
            created_on TIMESTAMP,
            description TEXT,
            age INTEGER,
            gender VARCHAR(50),
            incident_date DATE,
            time_from TIME,
            time_to TIME,
            categories TEXT,
            severity INTEGER
        );
        """
        self.execute_query(create_table_query)
        logger.info("Incidents table created successfully")
    
    def upload_csv_data(self, csv_file_path: str):
        """Upload data from CSV file to the database using bulk insert with progress tracking"""
        try:
            # Read the CSV file with progress bar
            logger.info(f"Reading CSV file: {csv_file_path}")
            df = pd.read_csv(csv_file_path)
            total_rows = len(df)
            logger.info(f"Loaded {total_rows} rows from {csv_file_path}")
            
            # Create table if it doesn't exist
            self.create_incidents_table()
            
            # Prepare the dataframe for insertion
            logger.info("Processing data...")
            with tqdm(total=3, desc="Data preprocessing", unit="step") as pbar:
                # Handle null values in time columns
                df['time_from'] = df['time_from'].replace('00:00:00', None)
                pbar.update(1)
                
                df['time_to'] = df['time_to'].replace('00:00:00', None)
                pbar.update(1)
                
                # Handle null/empty values
                df = df.where(pd.notnull(df), None)
                pbar.update(1)
            
            # Use smaller chunk size to avoid parameter limit
            chunk_size = 500  # Reduced from 1000
            num_chunks = (total_rows + chunk_size - 1) // chunk_size
            
            logger.info(f"Starting bulk upload of {total_rows} rows in {num_chunks} chunks...")
            
            # Use pandas to_sql for bulk insert with progress tracking
            uploaded_rows = 0
            with tqdm(total=total_rows, desc="Uploading to database", unit="rows") as pbar:
                try:
                    for i in range(0, total_rows, chunk_size):
                        chunk = df.iloc[i:i+chunk_size]
                        
                        # Use 'replace' method instead of 'multi' to avoid parameter limit
                        if i == 0:
                            # First chunk - replace table
                            chunk.to_sql(
                                name='incident_details',
                                con=self.engine,
                                if_exists='replace',
                                index=False,
                                method=None  # Use default method
                            )
                        else:
                            # Subsequent chunks - append
                            chunk.to_sql(
                                name='incident_details',
                                con=self.engine,
                                if_exists='append',
                                index=False,
                                method=None  # Use default method
                            )
                        
                        uploaded_rows += len(chunk)
                        pbar.update(len(chunk))
                        
                        # Log progress every 10 chunks
                        if (i // chunk_size + 1) % 10 == 0:
                            logger.info(f"Uploaded {uploaded_rows}/{total_rows} rows ({uploaded_rows/total_rows*100:.1f}%)")
                
                except Exception as chunk_error:
                    logger.error(f"Error uploading chunk starting at row {i}: {chunk_error}")
                    raise
            
            logger.info(f"✅ Successfully bulk uploaded {uploaded_rows} incidents to database")
            
        except Exception as e:
            logger.error(f"❌ Error uploading CSV data: {e}")
            raise

def main():
    """Main function to demonstrate database operations"""
    db = DatabaseConnection()
    
    try:
        # Connect to database
        db.connect()
        
        # Upload data from your processed CSV
        csv_path = "processed_incident_details.csv"
        if os.path.exists(csv_path):
            db.upload_csv_data(csv_path)
        else:
            logger.error(f"CSV file not found: {csv_path}")
        
    except Exception as e:
        logger.error(f"Database operation failed: {e}")
    finally:
        db.disconnect()

if __name__ == "__main__":
    main()