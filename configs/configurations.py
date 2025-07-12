from dataclasses import dataclass
import os
from dotenv import load_dotenv

load_dotenv()
@dataclass
class DatabaseConfig:
    db_name: str = os.getenv('DB_NAME')
    user: str = os.getenv('DB_USER')
    password: str = os.getenv('DB_PASSWORD')
    host: str = os.getenv('DB_HOST')
    port: int = int(os.getenv('DB_PORT', 5432))
    connection_string: str = os.getenv('DATABASE_URL', f"postgresql://{user}:{password}@{host}:{port}/{db_name}")

@dataclass
class MapConfig:
    ors_api_key: str = os.getenv('OPENROUTESERVICE_API_KEY')