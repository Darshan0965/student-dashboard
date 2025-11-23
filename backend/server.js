require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// ===============================
// Serve Frontend
// ===============================
const FRONTEND = path.join(__dirname, "..", "frontend");
app.use(express.static(FRONTEND));

app.get("/", (req, res) => {
  res.sendFile(path.join(FRONTEND, "login.html"));
});

// ===============================
// Create Tables if Not Exists
// ===============================
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      roll_no TEXT,
      class TEXT,
      gender TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS marks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      subject TEXT,
      marks INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER,
      present_days INTEGER,
      total_days INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password_hash TEXT,
      role TEXT,
      student_id INTEGER
  )`);
});

// ===============================
// LOGIN ENDPOINT
// ===============================
app.post("/auth/login", (req, res) => {
  const { username, password } = req.body;

  db.get("SELECT * FROM users WHERE username = ?", [username], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!user) return res.status(401).json({ error: "Invalid username" });

    const bcrypt = require("bcryptjs");
    if (!bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "Wrong password" });
    }

    res.json({
      success: true,
      role: user.role,
      student_id: user.student_id
    });
  });
});

// ===============================
// STUDENT LIST (Admin Dashboard)
// ===============================
app.get("/students", (req, res) => {
  db.all("SELECT * FROM students ORDER BY class, roll_no", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// ===============================
// GET CLASS LIST
// ===============================
app.get("/class-list", (req, res) => {
  db.all(
    "SELECT class, COUNT(*) AS total FROM students GROUP BY class ORDER BY class",
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ===============================
// OVERALL ATTENDANCE
// ===============================
app.get("/overall-attendance", (req, res) => {
  db.all("SELECT present_days, total_days FROM attendance", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!rows.length) return res.json({ percentage: 0 });

    let present = 0;
    let total = 0;

    rows.forEach((x) => {
      present += x.present_days || 0;
      total += x.total_days || 0;
    });

    const percent =
      total === 0 ? 0 : Math.round((present / total) * 100);

    res.json({ percentage: percent });
  });
});

// ===============================
// GET CLASS DETAILS
// ===============================
app.get("/class-details", (req, res) => {
  const cls = req.query.class;
  if (!cls) return res.status(400).json({ error: "Class missing" });

  const sql = `
    SELECT s.id AS student_id, s.name, s.roll_no, s.gender,
           m.subject, m.marks,
           a.present_days, a.total_days
    FROM students s
    LEFT JOIN marks m ON s.id = m.student_id
    LEFT JOIN attendance a ON s.id = a.student_id
    WHERE s.class = ?
    ORDER BY s.id;
  `;

  db.all(sql, [cls], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const output = {};

    rows.forEach((r) => {
      if (!output[r.student_id]) {
        output[r.student_id] = {
          id: r.student_id,
          name: r.name,
          roll_no: r.roll_no,
          gender: r.gender,
          subjects: [],
          attendance: {
            present: r.present_days,
            total: r.total_days
          }
        };
      }

      if (r.subject) {
        output[r.student_id].subjects.push({
          subject: r.subject,
          marks: r.marks
        });
      }
    });

    res.json(Object.values(output));
  });
});

// ===============================
// START SERVER
// ===============================
const PORT = 5000;
app.listen(PORT, () => {
  console.log("Server running → http://localhost:" + PORT);
});