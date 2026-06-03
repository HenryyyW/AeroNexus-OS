import csv
import firebase_admin
from firebase_admin import credentials, db

SERVICE_ACCOUNT_FILE = "ascendo-nexus-os-firebase-adminsdk-fbsvc-9334452d6e.json"
DATABASE_URL = "https://ascendo-nexus-os-default-rtdb.asia-southeast1.firebasedatabase.app/"
CSV_FILE = "./rawdata/feeds.csv"

cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)
firebase_admin.initialize_app(cred, {
    "databaseURL": DATABASE_URL
})

root_ref = db.reference("telemetry")

def get_ordered_timestamp_paths():
    paths = []
    dates = root_ref.get() or {}
    for date_key in sorted(dates.keys()):
        time_nodes = dates[date_key] or {}
        for time_key in sorted(time_nodes.keys()):
            paths.append((date_key, time_key))
    return paths

timestamp_paths = get_ordered_timestamp_paths()

with open(CSV_FILE, newline="", encoding="utf-8-sig") as f:
    reader = csv.DictReader(f)
    rows = list(reader)

count = min(len(timestamp_paths), len(rows))

for i in range(count):
    date_key, time_key = timestamp_paths[i]
    row = rows[i]

    motor_data = {
        "current": float(row["current"]),
        "voltage": float(row["voltage"]),
        "temperature": float(row["temperature"]),
        "humidity": float(row["humidity"]),
        "vibration": int(row["vibration"])
    }

    root_ref.child(date_key).child(time_key).child("motor").update(motor_data)

print(f"Uploaded {count} motor records.")