// backend/seed-dept.js
// Standalone script to generate 100 classes (Option A).
// Usage: node seed-dept.js

const db = require('./db');
const bcrypt = require('bcryptjs');

// promisified helpers
function runAsync(sql, params = []) {
  return new Promise((res, rej) => {
    db.run(sql, params, function (err) {
      if (err) return rej(err);
      return res(this);
    });
  });
}
function getAsync(sql, params = []) {
  return new Promise((res, rej) => {
    db.get(sql, params, (err, row) => {
      if (err) return rej(err);
      return res(row);
    });
  });
}

async function generate() {
  const departments = [
    'CSE','IT','ECE','ME','CE','EE','BT','DS','AI','SE',
    'AUTO','IS','BT2','BIO','CHEM','ENV','MATH','PHY','ENG','ARCH'
  ];
  const sections = ['A','B','C','D','E']; // 5 sections -> 100 classes total
  const subjects = ['Math','Physics','Chemistry','English','Computer'];

  console.log('Seeding 100 classes (this may take a while)...');

  // create tables if not exist (defensive)
  await runAsync(`CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, roll_no TEXT, class TEXT, gender TEXT
  )`);
  await runAsync(`CREATE TABLE IF NOT EXISTS marks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER, subject TEXT, marks INTEGER
  )`);
  await runAsync(`CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER, present_days INTEGER, total_days INTEGER
  )`);
  await runAsync(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE, password_hash TEXT, role TEXT, student_id INTEGER
  )`);

  // Use transaction
  await runAsync('BEGIN TRANSACTION');
  try {
    // Clear old data (uncomment if you want to append instead)
    await runAsync('DELETE FROM marks');
    await runAsync('DELETE FROM attendance');
    await runAsync('DELETE FROM students');

    // ensure teacher user exists
    const teacherHash = bcrypt.hashSync('password123', 10);
    await runAsync('INSERT OR REPLACE INTO users (id, username, password_hash, role) VALUES ((SELECT id FROM users WHERE username=?), ?, ?, ?)', ['teacher','teacher', teacherHash, 'teacher']);

    let totalStudents = 0;
    for (const d of departments) {
      for (const s of sections) {
        const cls = `${d}-${s}`;
        const count = Math.floor(Math.random() * 21) + 60; // 60..80
        for (let i = 1; i <= count; i++) {
          const name = `${cls}-Student-${String(i).padStart(3,'0')}`;
          const roll = `${d}${s}-${String(i).padStart(3,'0')}`;
          const gender = Math.random() > 0.45 ? 'M' : 'F';
          const info = await runAsync('INSERT INTO students (name, roll_no, class, gender) VALUES (?, ?, ?, ?)', [name, roll, cls, gender]);
          const sid = info.lastID;
          for (const sub of subjects) {
            const mk = Math.floor(Math.random() * 56) + 40;
            await runAsync('INSERT INTO marks (student_id, subject, marks) VALUES (?, ?, ?)', [sid, sub, mk]);
          }
          const present = Math.floor(Math.random() * 61) + 140;
          await runAsync('INSERT INTO attendance (student_id, present_days, total_days) VALUES (?, ?, ?)', [sid, present, 200]);
          totalStudents++;
        }
        console.log(`Created class ${cls}`);
      }
    }

    await runAsync('COMMIT');
    console.log(`Seeding complete. Total students created: ${totalStudents}`);
    process.exit(0);
  } catch (err) {
    await runAsync('ROLLBACK');
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

generate();