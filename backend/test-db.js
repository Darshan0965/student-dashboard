const db = require('./db');

db.all("PRAGMA table_info(students);", [], (err, rows) => {
  if (err) console.error(err);
  console.log("STUDENTS TABLE STRUCTURE:");
  console.log(rows);
  process.exit();
});
