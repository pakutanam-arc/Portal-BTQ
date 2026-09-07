import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, initializeFirestore } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json'));
const app = initializeApp(config);
const db = initializeFirestore(app, {}, config.firestoreDatabaseId);

async function run() {
  try {
    console.log("Fetching students...");
    const snapshot = await getDocs(query(collection(db, 'students')));
    console.log(`Success! Found ${snapshot.size} students.`);
    
    console.log("Fetching users...");
    const snapshot2 = await getDocs(query(collection(db, 'users')));
    console.log(`Success! Found ${snapshot2.size} users.`);
    process.exit(0);
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }
}
run();
