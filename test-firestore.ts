import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { readFileSync } from "fs";

const config = JSON.parse(readFileSync("./firebase-applet-config.json", "utf8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  try {
    console.log("Fetching...");
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("SUCCESS");
    process.exit(0);
  } catch(e) {
    console.error("FAIL:", e);
    process.exit(1);
  }
}
run();
