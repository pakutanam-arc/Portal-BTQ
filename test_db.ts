import { getStudents, getGroups } from './src/services/db';

async function run() {
  const students = await getStudents();
  console.log("Students count:", students.length);
}
run();
