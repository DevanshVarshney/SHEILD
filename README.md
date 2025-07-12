# SHEILD Safety Route Analysis
Smart Holistic Emergency &amp; Intelligent Location Device

A comprehensive safety-based route planning system using H3 spatial indexing and incident data analysis.

## Project Structure

```
SHEILD/
├── api/                    # API endpoints and web services
│   └── routes_api.py      # Flask API for route requests
├── configs/               # Configuration management
│   └── configurations.py  # Database and map API configurations
├── database/              # Data processing and H3 analysis
│   ├── h3_processing.py   # H3 safety score calculations
│   └── database.py        # Database connection utilities
├── map/                   # Route processing and safety analysis
│   └── route_processer.py # Main route calculation logic
├── raw_data_processing/   # Data ingestion and preprocessing
│   ├── data_processing.ipynb
│   └── webdriver_sel.py
├── utils/                 # Utility functions and helpers
│   ├── __init__.py
│   └── helpers.py         # Common utility functions
├── requirements.txt       # Python dependencies
└── README.md             # This file
```

## Key Components

### Route Processing (`map/route_processer.py`)
- **RouteAPIClient**: Handles external routing API calls (OpenRouteService)
- **MockRouteGenerator**: Generates test routes when API is unavailable
- **SafetyCalculator**: Calculates safety scores for route segments
- **RouteFormatter**: Formats output for frontend consumption
- **RouteProcessor**: Main orchestrator class

### H3 Safety Analysis (`database/h3_processing.py`)
- **H3IndexManager**: H3 spatial indexing operations
- **IncidentDataProcessor**: Loads and preprocesses incident data
- **SafetyScoreCalculator**: Calculates safety scores based on incident metrics
- **H3DatabaseManager**: Database operations for H3 data
- **H3SafetyProcessor**: Main H3 processing orchestrator

### API Service (`api/routes_api.py`)
- **RequestValidator**: Input validation for API requests
- REST endpoints for route calculation and system health

## Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Set up environment variables
# Edit .env with your database and API keys
```

## Environment Variables

```
DATABASE_URL=your_postgresql_connection_string
OPENROUTESERVICE_API_KEY=your_ors_api_key
```

## Usage

### Calculate H3 Safety Scores
```bash
python database/h3_processing.py
```

### Start API Server
```bash
python api/routes_api.py
```

### Use Route Processor Directly
```python
from map.route_processer import get_route_with_safety

result = get_route_with_safety(
    start_lat=28.6139,
    start_lon=77.2090,
    end_lat=28.5355,
    end_lon=77.3910,
    time_period='day'
)
```

## API Endpoints

- `POST /api/safe-routes` - Get safe routes between two points
- `GET /api/health` - System health check
- `GET /api/config` - Get system configuration

## Features

- H3-based spatial indexing for efficient safety analysis
- Time-based safety scoring (day/night)
- Multiple route alternatives with safety rankings
- Fallback to mock routes when external APIs are unavailable
- Comprehensive error handling and logging
- Clean separation of concerns with modular architecture

## Database functions

The current database handling is crude and rudimentary at best and the sole purpose was to push the data that we collected to the database. For the fully functioning app, we need to make changes so that the users can add incidents to our database
