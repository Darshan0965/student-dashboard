// dump-users.js
const db = require('./db');
db.all('SELECT id, username, role, student_id FROM users ORDER BY id', [], (err, rows) => {
  if (err) { console.error('ERR', err); process.exit(1); }
  console.log('USERS:');
  console.log(rows);
  process.exit();
});
