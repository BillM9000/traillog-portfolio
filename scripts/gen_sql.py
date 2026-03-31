import json, sys

with open("server/itinerary_seed.json") as f:
    data = json.load(f)

print("BEGIN;")
for it in data:
    rd = json.dumps(it["route_data"]).replace("'", "''")
    gi = json.dumps({
        "description": it.get("description", ""),
        "elevations": it.get("elevations", {}),
        "camps_info": it.get("camps_info", ""),
        "conservation": it.get("conservation", ""),
    }).replace("'", "''")
    iid = it["id"].replace("'", "''")
    print(f"UPDATE itineraries SET route_data = '{rd}', global_info = '{gi}' WHERE id = '{iid}';")
print("COMMIT;")
