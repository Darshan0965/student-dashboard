// create-teacher.js
const db = require('./db');
const bcrypt = require('bcryptjs');

const username = 'teacher';
const plain = 'password123';
const hash = bcrypt.hashSync(plain, 10);

db.serialize(() => {
  db.run('DELETE FROM users WHERE username = ?', [username], function (delErr) {
    if (delErr) console.error('DELETE ERR', delErr);
    db.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, hash, 'teacher'], function (insErr) {
      if (insErr) { console.error('INSERT ERR', insErr); process.exit(1); }
      console.log('Inserted teacher user with id', this.lastID);
      db.all('SELECT id, username, role, student_id FROM users ORDER BY id', [], (err, rows) => {
        if (err) console.error('SELECT ERR', err);
        else console.log('USERS NOW:', rows);
        process.exit();
      });
    });
  });
});
