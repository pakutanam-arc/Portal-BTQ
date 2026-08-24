import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { readFileSync } from "fs";

const config = JSON.parse(readFileSync("./firebase-applet-config.json", "utf8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  const qs = await getDocs(collection(db, 'groups'));
  qs.forEach(d => console.log(d.id, d.data().name));
  process.exit(0);
}
run();
