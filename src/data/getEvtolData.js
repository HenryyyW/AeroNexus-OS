import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue } from "firebase/database";

const firebaseConfig = {
  databaseURL: "https://ascendo-nexus-os-default-rtdb.asia-southeast1.firebasedatabase.app/",
  // other config...
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const path = ref(db, "telemetry/2018-02-05/15-16-24-013052");

onValue(path, (snapshot) => {
  if (snapshot.exists()) {
    const data = snapshot.val();
    console.log("battery:", data.battery);
  } else {
    console.log("No data");
  }
});