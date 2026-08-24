import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { readFileSync } from "fs";

const config = JSON.parse(readFileSync("./firebase-applet-config.json", "utf8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  const qs = await getDocs(collection(db, 'groups'));
  for (const d of qs.docs) {
    const id = d.id; // 'g1', 'g2', etc.
    const num = parseInt(id.replace('g', ''));
    let gradeId = 'grade1';
    if (num >= 6 && num <= 9) gradeId = 'grade2';
    if (num === 10) gradeId = 'grade3';
    
    await updateDoc(doc(db, 'groups', id), { gradeId });
    console.log(`Updated ${id} to ${gradeId}`);
  }
  process.exit(0);
}
run();
