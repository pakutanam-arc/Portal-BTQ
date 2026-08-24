import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from './src/services/firebase';
import { mockMentors, mockGroups, mockStudents } from './src/services/mockData';

async function seed() {
  console.log('Seeding mentors...');
  for (const m of mockMentors) {
    await setDoc(doc(collection(db, 'users'), m.id), {
      email: m.email,
      name: m.name,
      role: 'mentor',
      createdAt: new Date().toISOString()
    });
  }

  console.log('Seeding groups...');
  for (const g of mockGroups) {
    await setDoc(doc(collection(db, 'groups'), g.id), {
      name: g.name,
      mentorId: g.mentorId,
      schedule: g.schedule,
      room: g.room,
      createdAt: new Date().toISOString()
    });
  }

  console.log('Seeding students...');
  for (const s of mockStudents) {
    await setDoc(doc(collection(db, 'students'), s.id), {
      name: s.name,
      nis: s.nis,
      groupId: s.groupId,
      class: s.class,
      gender: s.gender,
      status: s.status,
      createdAt: s.createdAt
    });
  }

  console.log('Seeding complete.');
  process.exit(0);
}

seed().catch(console.error);
