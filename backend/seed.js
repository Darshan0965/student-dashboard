// backend/seed.js  (robust seeder — use node seed.js)
const db = require('./db');

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this.lastID);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function seed() {
  try {
    console.log('Clearing tables...');
    await run('DELETE FROM marks');
    await run('DELETE FROM attendance');
    await run('DELETE FROM students');

    console.log('Inserting students...');
    const idRia = await run("INSERT INTO students (name, roll_no, class) VALUES (?, ?, ?)", ['Ria', 'R002', 'CS-A']);
    const idAman = await run("INSERT INTO students (name, roll_no, class) VALUES (?, ?, ?)", ['Aman', 'R001', 'CS-A']);

    console.log('Inserted students with ids:', idRia, idAman);

    console.log('Inserting marks for the new student ids...');
    // marks for Ria (idRia)
    await run("INSERT INTO marks (student_id, subject, marks) VALUES (?, ?, ?)", [idRia, 'Math', 92]);
    await run("INSERT INTO marks (student_id, subject, marks) VALUES (?, ?, ?)", [idRia, 'Physics', 88]);
    // marks for Aman (idAman)
    await run("INSERT INTO marks (student_id, subject, marks) VALUES (?, ?, ?)", [idAman, 'Math', 85]);
    await run("INSERT INTO marks (student_id, subject, marks) VALUES (?, ?, ?)", [idAman, 'Physics', 78]);

    console.log('Inserting attendance...');
    await run("INSERT INTO attendance (student_id, present_days, total_days) VALUES (?, ?, ?)", [idRia, 42, 45]);
    await run("INSERT INTO attendance (student_id, present_days, total_days) VALUES (?, ?, ?)", [idAman, 40, 45]);

    console.log('Seeding finished. Current DB state:');
    const studs = await all('SELECT * FROM students ORDER BY id');
    console.log('students:', studs);
    const marksAll = await all('SELECT * FROM marks ORDER BY id');
    console.log('marks:', marksAll);
    const attAll = await all('SELECT * FROM attendance ORDER BY id');
    console.log('attendance:', attAll);

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
