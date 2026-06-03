import firebase_admin
from firebase_admin import credentials, db
import time

SERVICE_ACCOUNT_PATH = "ascendo-nexus-os-firebase-adminsdk-fbsvc-9334452d6e.json"
DATABASE_URL = "https://ascendo-nexus-os-default-rtdb.asia-southeast1.firebasedatabase.app/"

# uncommon for execution
#cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
firebase_admin.initialize_app(cred, {"databaseURL": DATABASE_URL})

ref = db.reference("telemetry")
children = ref.get() or {}

keys = list(children.keys())
print(f"Found {len(keys)} top-level children")

batch_size = 50
for i in range(0, len(keys), batch_size):
    batch_keys = keys[i:i+batch_size]
    updates = {k: None for k in batch_keys}
    ref.update(updates)
    print(f"Deleted {i + len(batch_keys)} / {len(keys)}")
    time.sleep(0.2)

print("Done")