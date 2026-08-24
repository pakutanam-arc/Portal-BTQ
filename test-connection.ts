import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer, initializeFirestore } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function testConnection() {
  try {
    console.log("Testing with getFirestore...");
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Success with getFirestore!");
  } catch (e: any) {
    console.error("Error with getFirestore:", e.message);
  }
}

testConnection();
