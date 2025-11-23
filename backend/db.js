// backend/db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbFile = path.join(__dirname, 'student_dashboard.sqlite');

const db = new sqlite3.Database(dbFile, (err) => {
  if (err) {
    console.error('Failed to open DB', err);
  } else {
    console.log('Opened sqlite DB at', dbFile);
  }
});

module.exports = db;