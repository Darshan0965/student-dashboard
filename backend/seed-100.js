// backend/seed-100.js
// Usage: node seed-100.js
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, 'student_dashboard.sqlite');

// If you want a fresh DB, delete the file before running this script
if (fs.existsSync(DB_FILE)) {
  console.log('Using existing DB:', DB_FILE);
} else {
  console.log('Creating new DB:', DB_FILE);
}

const db = new sqlite3.Database(DB_FILE);

function runAsync(sql, params=[]) {
  return new Promise((res, rej) => db.run(sql, params, function(err) {
    if (err) rej(err); else res(this);
  }));
}

function allAsync(sql, params=[]) {
  return new Promise((res, rej) => db.all(sql, params, (err, rows) => {
    if (err) rej(err); else res(rows);
  }));
}

async function setup() {
  await runAsync(`PRAGMA foreign_keys = ON;`);
  await runAsync(`CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    roll_no TEXT,
    class TEXT,
    gender TEXT
  );`);
  await runAsync(`CREATE TABLE IF NOT EXISTS marks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    subject TEXT,
    marks INTEGER,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
  );`);
  await runAsync(`CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    present_days INTEGER,
    total_days INTEGER,
    FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
  );`);
  await runAsync(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password_hash TEXT,
    role TEXT,
    student_id INTEGER
  );`);

  // Clear existing data
  await runAsync(`DELETE FROM marks;`);
  await runAsync(`DELETE FROM attendance;`);
  await runAsync(`DELETE FROM students;`);
  await runAsync(`DELETE FROM users;`);

  // Departments & sections to make ~100 classes
  const depts = ['CSE','ECE','IT','ME','CE','EE','BT','DS','AI','SE','AUTO','IS','BT','BME'];
  // Create class names like CSE-A, CSE-B, CSE-C, ...
  const classNames = [];
  for (const d of depts) {
    // create up to 8 sections each department to reach 100 total across loop
    for (let s=0; s<8; s++) {
      classNames.push(`${d}-${String.fromCharCode(65 + s)}`);
    }
  }
  // trim or pad to exactly 100
  while (classNames.length > 100) classNames.pop();
  while (classNames.length < 100) classNames.push(`CLASS-${classNames.length+1}`);

  const subjects = ['Math','Physics','Chemistry','English','Computer'];

  console.log(`Generating ${classNames.length} classes with 60-80 students each...`);

  let studentCounter = 0;
  for (const cls of classNames) {
    // random 60..80
    const count = Math.floor(Math.random()*21) + 60;
    for (let i=1;i<=count;i++){
      studentCounter++;
      const name = `${cls}_Student_${String(i).padStart(3,'0')}`;
      const roll_no = `${cls.replace(/[^A-Z0-9]/g,'')}-${String(i).padStart(3,'0')}`;
      const gender = (Math.random() < 0.45) ? 'F' : 'M';

      const ins = await runAsync(`INSERT INTO students (name, roll_no, class, gender) VALUES (?,?,?,?)`, [name, roll_no, cls, gender]);
      const studentId = ins.lastID;

      // marks: each subject random 40-95
      for (const sub of subjects) {
        const mark = Math.floor(Math.random()*56) + 40; // 40..95
        await runAsync(`INSERT INTO marks (student_id, subject, marks) VALUES (?,?,?)`, [studentId, sub, mark]);
      }

      // attendance totalDays = 200, present random 130..200
      const totalDays = 200;
      const present = Math.floor(Math.random()*71) + 130; // 130..200
      await runAsync(`INSERT INTO attendance (student_id, present_days, total_days) VALUES (?,?,?)`, [studentId, present, totalDays]);
    }
    console.log(`Created class ${cls}`);
  }

  // Create teacher user and a sample student user for testing
  const teacherPassHash = bcrypt.hashSync('teacher123', 10);
  await runAsync(`INSERT OR IGNORE INTO users (username, password_hash, role, student_id) VALUES (?,?,?,NULL)`, ['teacher', teacherPassHash, 'teacher']);

  // pick one student to create a student account (if exists)
  const rows = await allAsync(`SELECT id, name FROM students LIMIT 1`);
  if (rows && rows.length) {
    const st = rows[0];
    const studentPassHash = bcrypt.hashSync('student123', 10);
    await runAsync(`INSERT OR IGNORE INTO users (username, password_hash, role, student_id) VALUES (?,?,?,?)`, [st.name.toLowerCase(), studentPassHash, 'student', st.id]);
    console.log('Created sample student user:', st.name.toLowerCase());
  }

  console.log('Done. Total students inserted:', studentCounter);
  db.close();
}

setup().catch(err => {
  console.error('Error seeding DB:', err);
  db.close();
});