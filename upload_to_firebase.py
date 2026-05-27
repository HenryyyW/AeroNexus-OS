import csv
from pathlib import Path
import firebase_admin
from firebase_admin import credentials, db

SERVICE_ACCOUNT_PATH = "ascendo-nexus-os-firebase-adminsdk-fbsvc-489f3b505d.json"
DATABASE_URL = "https://ascendo-nexus-os-default-rtdb.asia-southeast1.firebasedatabase.app/"
FILE_PATH = "./rawdata/SNL_18650_LFP_25C_0-100_0.5-2C_a_timeseries.txt"

def to_num(v):
    v = v.strip()
    if v == "":
        return None
    try:
        if "." in v or "e" in v.lower():
            return float(v)
        return int(v)
    except ValueError:
        return v

def split_datetime(dt_str):
    date_part, time_part = dt_str.strip().split(" ", 1)
    time_key = time_part.replace(":", "-").replace(".", "_")
    return date_part, time_key

def row_to_battery(row):
    return {
        "Date_Time": row["Date_Time"].strip(),
        "Test_Time_s": to_num(row["Test_Time (s)"]),
        "Cycle_Index": to_num(row["Cycle_Index"]),
        "Current_A": to_num(row["Current (A)"]),
        "Voltage_V": to_num(row["Voltage (V)"]),
        "Charge_Capacity_Ah": to_num(row["Charge_Capacity (Ah)"]),
        "Discharge_Capacity_Ah": to_num(row["Discharge_Capacity (Ah)"]),
        "Charge_Energy_Wh": to_num(row["Charge_Energy (Wh)"]),
        "Discharge_Energy_Wh": to_num(row["Discharge_Energy (Wh)"]),
        "Environment_Temperature_C": to_num(row["Environment_Temperature (C)"]),
        "Cell_Temperature_C": to_num(row["Cell_Temperature (C)"]),
    }

def main():
    cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred, {"databaseURL": DATABASE_URL})

    root_ref = db.reference("telemetry")
    total = 0

    with open(FILE_PATH, "r", newline="", encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f)
        for row in reader:
            dt = row["Date_Time"].strip()
            date_key, time_key = split_datetime(dt)

            battery_data = row_to_battery(row)

            root_ref.child(date_key).child(time_key).set({
                "battery": battery_data
            })

            total += 1
            if total % 200 == 0:
                print(f"Uploaded {total} rows")

    print(f"Done. Uploaded {total} rows")

if __name__ == "__main__":
    main()