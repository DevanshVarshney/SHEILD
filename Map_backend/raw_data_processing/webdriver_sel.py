import requests
import json

# For progress bar
from tqdm import tqdm

# Load incident IDs from safecity_crime_data.json
with open("safecity_crime_data.json", "r") as f:
    data = json.load(f)

# Find all incident IDs (tag 'id')
incident_ids = []
if isinstance(data, dict) and "data" in data:
    for item in data["data"]:
        if isinstance(item, dict) and "id" in item:
            incident_ids.append(item["id"])
elif isinstance(data, list):
    for item in data:
        if isinstance(item, dict) and "id" in item:
            incident_ids.append(item["id"])

print(f"Found {len(incident_ids)} incident IDs.")

results = []
for incident_id in tqdm(incident_ids, desc="Fetching incidents"):
    try:
        resp = requests.post(
            "https://webapp.safecity.in/api/reported-incident/details",
            data={"incident_id": incident_id},
            headers={"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"},
            timeout=10
        )
        if resp.status_code == 200:
            result = resp.json()
            result["incident_id"] = incident_id
            results.append(result)
            print(f"Added incident {incident_id}")
        else:
            print(f"Failed for incident_id {incident_id}: HTTP {resp.status_code}")
    except Exception as e:
        print(f"Error for incident_id {incident_id}: {e}")

# Save all results to a new JSON file
with open("safecity_incident_details.json", "w") as f:
    json.dump(results, f, indent=2)

print(f"Fetched details for {len(results)} incidents. Saved to safecity_incident_details.json.")
