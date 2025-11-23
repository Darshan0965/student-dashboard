// seed-large.js
// Usage: node seed-large.js
// This script populates backend/student_dashboard.sqlite with many classes & students.
// It uses backend/db.js (which must exist and export sqlite3 Database instance).

const path = require('path');
const db = require('./db'); // must exist
const bcrypt = require('bcryptjs');

const SUBJECTS = ['Math', 'Physics', 'Chemistry', 'English', 'Computer'];

// department-style class names (100 unique-ish names). We'll create 100 classes by combining dept + section.
const DEPTS = [
  'CS','IT','ECE','ME','CE','EE','DS','AI','SE','IS','BT','AUTO','AISEC','ROBO','BIO',
  'ENVI','AERO','CIV','MIN','MET','CHEM','PHAR','TEXT','ARCH','PETRO'
];
// We'll generate variations to reach 100 classes: dept + A..Z + numbers.
function buildClassNames() {
  const names = [];
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let idx = 0;
  for (let d = 0; d < DEPTS.length && names.length < 100; d++) {
    for (let s = 0; s < letters.length && names.length < 100; s++) {
      const cls = `${DEPTS[d]}-${letters[s]}`;
      names.push(cls);
    }
  }
  // If still under 100, add numeric suffixes
  let num = 1;
  while (names.length < 100) {
    names.push(`GEN-${String(num).padStart(2,'0')}`);
    num++;
  }
  return names.slice(0, 100);
}

const classNames = buildClassNames();

// Indian-style name pools (short lists; randomized combos)
const maleFirst = ['Arjun','Rahul','Vishal','Karthik','Aman','Rohit','Sanjay','Manish','Anand','Kiran','Siddharth','Rakesh','Ajay','Arav','Dev','Pranav','Vineet','Nikhil','Kumar','Hari'];
const femaleFirst = ['Priya','Sneha','Ananya','Deepa','Sakthi','Aishwarya','Nisha','Preethi','Keerthi','Shruti','Divya','Ria','Aditi','Swathi','Kavya','Pooja','Nandini','Meera','Shreya','Lakshmi'];
const lastNames = ['Reddy','Kumar','Sharma','Khan','Iyer','Nair','Singh','Patel','Gupta','Das','Prasad','Rao','Joshi','Bose','Khan','Naik','Chopra','Mehta','Shah','Chandra'];

// helper to pick random
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

// promisify db.run / db.get / db.all
function runAsync(sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}
function getAsync(sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}
function allAsync(sql, params=[]) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function clearDb() {
  // delete all tables' data (safe)
  console.log('Clearing existing marks, attendance, students, users...');
  await runAsync('DELETE FROM marks');
  await runAsync('DELETE FROM attendance');
  await runAsync('DELETE FROM students');
  await runAsync('DELETE FROM users');
  // reset sqlite_sequence for autoincrement (optional)
  try {
    await runAsync("DELETE FROM sqlite_sequence WHERE name IN ('students','marks','attendance','users')");
  } catch (e) { /* ignore */ }
}

async function seed() {
  try {
    console.log(`Seeding ${classNames.length} classes with 60-80 students each...`);
    await clearDb();

    let totalStudents = 0;
    // Insert students per class
    for (const cls of classNames) {
      // choose random between 60 and 80
      const count = Math.floor(Math.random() * 21) + 60; // 60..80
      for (let i = 1; i <= count; i++) {
        totalStudents++;
        // alternate gender roughly
        const gender = Math.random() < 0.52 ? 'Male' : 'Female';
        const fname = gender === 'Male' ? pick(maleFirst) : pick(femaleFirst);
        const lname = pick(lastNames);
        const name = `${fname} ${lname}`;
        const roll = `${cls.replace(/[^A-Z0-9]/g,'')}-${String(i).padStart(3,'0')}`; // e.g., CS-A-001 => CSA-001

        // insert student
        const res = await runAsync("INSERT INTO students (name, roll_no, class, gender) VALUES (?, ?, ?, ?)", [name, roll, cls, gender]);
        const studentId = res.lastID;

        // insert marks
        for (const sub of SUBJECTS) {
          const mark = Math.floor(Math.random() * 41) + 40; // 40..80
          await runAsync("INSERT INTO marks (student_id, subject, marks) VALUES (?, ?, ?)", [studentId, sub, mark]);
        }

        // attendance: totalDays between 180 and 220 (simulate semesters/years)
        const totalDays = 200;
        const present = Math.floor(Math.random() * 41) + 140; // 140..180
        await runAsync("INSERT INTO attendance (student_id, present_days, total_days) VALUES (?, ?, ?)", [studentId, present, totalDays]);
      } // end for students in class
      console.log(`Created ${count} students for class ${cls}`);
    } // end classes

    // create teacher user and one demo student user
    console.log('Creating demo users...');
    const teacherHash = bcrypt.hashSync('password123', 10);
    await runAsync("INSERT OR IGNORE INTO users (username, password_hash, role, student_id) VALUES (?, ?, ?, ?)", ['teacher', teacherHash, 'teacher', null]);

    // pick one random student as demo darshan
    const one = await allAsync("SELECT id FROM students LIMIT 1");
    if (one && one.length) {
      const sid = one[0].id;
      const studHash = bcrypt.hashSync('student123', 10);
      await runAsync("INSERT OR IGNORE INTO users (username, password_hash, role, student_id) VALUES (?, ?, ?, ?)", ['darshan', studHash, 'student', sid]);
    }

    console.log(`Seeding completed: ${classNames.length} classes, ~${totalStudents} students, subjects and attendance inserted.`);
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

// Run the seed
seed();