import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from './src/services/firebase';

async function updateAndSeed() {
  console.log("Updating names in Firestore and seeding Auth...");
  const snapshot = await getDocs(collection(db, 'users'));
  
  for (const userDoc of snapshot.docs) {
    const data = userDoc.data();
    let name = data.name;
    
    // Update name if needed
    let updated = false;
    if (name.includes('Ustadz ')) {
      name = name.replace('Ustadz ', 'Kak ');
      updated = true;
    }
    if (name.includes('Ustadzah ')) {
      name = name.replace('Ustadzah ', 'Kak ');
      updated = true;
    }
    
    if (updated) {
      await updateDoc(doc(db, 'users', userDoc.id), { name });
      console.log(`Updated name to ${name}`);
    }

    // Create auth account
    try {
      if (data.email) {
        await createUserWithEmailAndPassword(auth, data.email, '12345678');
        console.log(`Created auth for ${data.email}`);
      }
    } catch (e: any) {
      if (e.code === 'auth/email-already-in-use') {
        console.log(`Auth already exists for ${data.email}`);
      } else {
        console.error(`Error creating auth for ${data.email}: ${e.message}`);
      }
    }
  }
  
  // Create an admin account
  try {
    await createUserWithEmailAndPassword(auth, 'admin@smpn102.sch.id', '12345678');
    console.log("Created admin auth");
  } catch (e: any) {
    console.log("Admin auth exists or error:", e.code);
  }
  
  console.log("Done!");
  process.exit(0);
}

updateAndSeed().catch(console.error);
