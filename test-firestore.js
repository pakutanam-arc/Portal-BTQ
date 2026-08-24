import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { readFileSync } from "fs";

const config = JSON.parse(readFileSync("./firebase-applet-config.json"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("SUCCESS");
  } catch(e) {
    console.error("FAIL:", e);
  }
}
run();
