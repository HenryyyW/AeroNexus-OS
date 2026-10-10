import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue } from 'firebase/database';
import evtolData from './evtolData';

const databaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL;

if (!databaseURL) {
  throw new Error('VITE_FIREBASE_DATABASE_URL is required to connect to Firebase.');
}

const firebaseConfig = { databaseURL };

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export function streamEvtolData(setEvtolData) {
  const path = ref(db, 'telemetry/2018-02-05/15-16-24_013052');

  onValue(path, (snapshot) => {
    if (!snapshot.exists()) return;

    const data = snapshot.val();
    const battery = data.battery || {};
    const motor = data.motor || {};

    setEvtolData((prev) => ({
      ...prev,
      soc: battery.soc ?? prev.soc,
      temperature: battery.Cell_Temperature_C ?? prev.temperature,
      batteryCycles: battery.Cycle_Index ?? prev.batteryCycles,
      vibration: motor.vibration ?? prev.vibration,
      motorRpm: motor.rpm ?? motor.motorRpm ?? prev.motorRpm,
    }));
  });
}

export default evtolData;