import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc, doc, setDoc } from "firebase/firestore";
import { readFileSync } from "fs";

const config = JSON.parse(readFileSync("./firebase-applet-config.json", "utf8"));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

const roomMapping = {
  1: 'Mushola',
  2: 'Mushola',
  3: 'Mushola',
  4: '9A',
  5: '9B',
  6: '9C',
  7: 'Perpustakaan',
  8: 'Perpustakaan',
  9: '7C lantai 1',
  10: '9D',
  g1: 'Mushola',
  g2: 'Mushola',
  g3: 'Mushola',
  g4: '9A',
  g5: '9B',
  g6: '9C',
  g7: 'Perpustakaan',
  g8: 'Perpustakaan',
  g9: '7C lantai 1',
  g10: '9D',
};

async function updateRooms() {
  console.log("Updating group rooms in Firestore...");
  const qs = await getDocs(collection(db, 'groups'));
  
  if (qs.empty) {
    console.log("No existing groups in Firestore, creating 10 groups with updated rooms...");
    for (let i = 1; i <= 10; i++) {
      const id = `g${i}`;
      const room = roomMapping[i];
      await setDoc(doc(db, 'groups', id), {
        name: `Kelompok ${i}`,
        mentorId: `m${i}`,
        schedule: i % 2 === 0 ? 'Senin, 15:30 - 17:00' : 'Rabu, 15:30 - 17:00',
        room: room,
        gradeId: i <= 4 ? 'grade1' : i <= 8 ? 'grade2' : 'grade3',
        createdAt: new Date().toISOString()
      }, { merge: true });
      console.log(`Created/Merged ${id} with room: ${room}`);
    }
  } else {
    for (const d of qs.docs) {
      const id = d.id;
      const numMatch = id.match(/\d+/);
      const num = numMatch ? parseInt(numMatch[0]) : null;
      const targetRoom = num && roomMapping[num] ? roomMapping[num] : roomMapping[id] || 'Mushola';
      
      await updateDoc(doc(db, 'groups', id), {
        room: targetRoom
      });
      console.log(`Updated group ${id} (${d.data().name}) room to: ${targetRoom}`);
    }
  }

  console.log("Group room update completed successfully!");
  process.exit(0);
}

updateRooms().catch((err) => {
  console.error("Error updating rooms:", err);
  process.exit(1);
});
