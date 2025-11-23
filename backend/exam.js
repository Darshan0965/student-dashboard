// backend/exams.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const db = require('./db'); // your sqlite3 db instance
const { authenticateToken, authorizeRole } = require('./auth');

// multer setup (store in memory)
const upload = multer({ storage: multer.memoryStorage() });

// ----------------- Helper -----------------
function sendExcelResponse(res, wb, filename) {
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
}

// ----------------- Exams CRUD -----------------

// Create exam (teacher only)
router.post('/exams', authenticateToken, authorizeRole('teacher'), (req, res) => {
  const { name, class: cls, type, date } = req.body;
  if (!name || !cls) return res.status(400).json({ error: 'name and class required' });
  db.run('INSERT INTO exams(name, class, type, date) VALUES (?, ?, ?, ?)', [name, cls, type || '', date || null], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, class: cls, type, date });
  });
});

// List exams (optionally filter by class)
router.get('/exams', authenticateToken, (req, res) => {
  const cls = req.query.class;
  const sql = cls ? 'SELECT * FROM exams WHERE class = ? ORDER BY date DESC' : 'SELECT * FROM exams ORDER BY date DESC';
  db.all(sql, cls ? [cls] : [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Delete exam (teacher only)
router.delete('/exams/:id', authenticateToken, authorizeRole('teacher'), (req, res) => {
  const id = req.params.id;
  db.run('DELETE FROM exam_marks WHERE exam_id = ?', [id], (e) => {
    db.run('DELETE FROM exams WHERE id = ?', [id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ deleted: true });
    });
  });
});

// ----------------- Exam Marks -----------------

// Add/update a single mark (teacher only)
router.post('/exam-marks', authenticateToken, authorizeRole('teacher'), (req, res) => {
  const { exam_id, student_id, marks } = req.body;
  if (!exam_id || !student_id) return res.status(400).json({ error: 'exam_id and student_id required' });
  // upsert logic
  db.get('SELECT id FROM exam_marks WHERE exam_id = ? AND student_id = ?', [exam_id, student_id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) {
      db.run('UPDATE exam_marks SET marks = ? WHERE id = ?', [marks || 0, row.id], function(err2){
        if (err2) return res.status(500).json({ error: err2.message });
        res.json({ updated: true });
      });
    } else {
      db.run('INSERT INTO exam_marks (exam_id, student_id, marks) VALUES (?, ?, ?)', [exam_id, student_id, marks || 0], function(err3){
        if (err3) return res.status(500).json({ error: err3.message });
        res.json({ id: this.lastID });
      });
    }
  });
});

// Get marks for an exam
router.get('/exam-marks/exam/:examId', authenticateToken, (req, res) => {
  const examId = req.params.examId;
  const sql = `
    SELECT em.id, em.exam_id, em.student_id, em.marks,
           s.name AS student_name, s.roll_no, s.class
    FROM exam_marks em
    LEFT JOIN students s ON s.id = em.student_id
    WHERE em.exam_id = ?
    ORDER BY s.roll_no
  `;
  db.all(sql, [examId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Export marks for an exam as Excel
router.get('/exam-marks/export/:examId', authenticateToken, authorizeRole('teacher'), (req, res) => {
  const examId = req.params.examId;
  db.get('SELECT * FROM exams WHERE id = ?', [examId], (err,einfo) => {
    if (err || !einfo) return res.status(404).json({ error: 'Exam not found' });
    const sql = `
      SELECT s.roll_no, s.name, s.class, em.marks
      FROM students s
      LEFT JOIN exam_marks em ON em.student_id = s.id AND em.exam_id = ?
      WHERE s.class = ?
      ORDER BY s.roll_no
    `;
    db.all(sql, [examId, einfo.class], (err2, rows) => {
      if (err2) return res.status(500).json({ error: err2.message });
      // create workbook
      const wsData = [['roll_no','name','class','marks']];
      rows.forEach(r => wsData.push([r.roll_no, r.name, r.class, r.marks != null ? r.marks : '']));
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'marks');
      const filename = `${einfo.name || 'exam'}_${einfo.class || 'class'}.xlsx`;
      sendExcelResponse(res, wb, filename);
    });
  });
});

// ----------------- Import marks from Excel (upload) -----------------
// Expects an XLSX file with columns: roll_no OR student_id, and marks
// Query param ?exam_id=123 required
router.post('/exam-marks/import', authenticateToken, authorizeRole('teacher'), upload.single('file'), (req, res) => {
  const examId = req.query.exam_id;
  if (!examId) return res.status(400).json({ error: 'exam_id query parameter required' });
  if (!req.file) return res.status(400).json({ error: 'file upload required' });

  // read workbook
  const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

  // data expected: either {student_id, marks} or {roll_no, marks}
  const ops = [];
  data.forEach(row => {
    const marks = row.marks == null ? row.Marks || row.MARKS || '' : row.marks;
    const roll = row.roll_no || row.Roll_No || row.roll || row.Roll || row['Roll No'] || row['roll_no'];
    const studentId = row.student_id || row.studentId || row['student_id'];
    if (studentId) {
      ops.push({ type: 'byId', student_id: Number(studentId), marks: Number(marks) });
    } else if (roll) {
      ops.push({ type: 'byRoll', roll_no: String(roll), marks: Number(marks) });
    }
  });

  // process sequentially (simple)
  (async function processOps() {
    for (const op of ops) {
      if (op.type === 'byId') {
        await new Promise((res, rej) => {
          db.get('SELECT id FROM exam_marks WHERE exam_id = ? AND student_id = ?', [examId, op.student_id], (err, row) => {
            if (err) { console.error(err); return res(); }
            if (row) {
              db.run('UPDATE exam_marks SET marks = ? WHERE id = ?', [op.marks, row.id], (e)=> res());
            } else {
              db.run('INSERT INTO exam_marks (exam_id, student_id, marks) VALUES (?, ?, ?)', [examId, op.student_id, op.marks], (e)=> res());
            }
          });
        });
      } else {
        // by roll
        await new Promise((res, rej) => {
          db.get('SELECT id FROM students WHERE roll_no = ?', [op.roll_no], (err, srow) => {
            if (err || !srow) return res();
            const sid = srow.id;
            db.get('SELECT id FROM exam_marks WHERE exam_id = ? AND student_id = ?', [examId, sid], (err2, row2) => {
              if (row2) {
                db.run('UPDATE exam_marks SET marks = ? WHERE id = ?', [op.marks, row2.id], (e)=> res());
              } else {
                db.run('INSERT INTO exam_marks (exam_id, student_id, marks) VALUES (?, ?, ?)', [examId, sid, op.marks], (e)=> res());
              }
            });
          });
        });
      }
    }
    res.json({ message: 'Imported rows processed', processed: ops.length });
  })();

});

// ----------------- Teacher class assignment endpoints -----------------

// Assign class to teacher (admin or teacher themselves)
router.post('/teacher/assign', authenticateToken, authorizeRole('teacher'), (req, res) => {
  // req.user contains id of logged-in user (user table id). Only teachers can assign classes to themselves or admin may have separate route
  const teacherUserId = req.user.id;
  const cls = req.body.class;
  if (!cls) return res.status(400).json({ error: 'class required' });
  db.run('INSERT OR IGNORE INTO teacher_classes (teacher_user_id, class) VALUES (?, ?)', [teacherUserId, cls], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ assigned: true });
  });
});

// Remove assignment
router.post('/teacher/unassign', authenticateToken, authorizeRole('teacher'), (req, res) => {
  const teacherUserId = req.user.id;
  const cls = req.body.class;
  if (!cls) return res.status(400).json({ error: 'class required' });
  db.run('DELETE FROM teacher_classes WHERE teacher_user_id = ? AND class = ?', [teacherUserId, cls], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ removed: true });
  });
});

// List classes assigned to teacher (self)
router.get('/teacher/classes', authenticateToken, authorizeRole('teacher'), (req, res) => {
  const teacherUserId = req.user.id;
  db.all('SELECT class FROM teacher_classes WHERE teacher_user_id = ?', [teacherUserId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r=>r.class));
  });
});

// Middleware helper for owner-of-class checks (used in frontend to determine allowed actions)
router.get('/teacher/is-owner/:class', authenticateToken, authorizeRole('teacher'), (req, res) => {
  const teacherUserId = req.user.id;
  const cls = req.params.class;
  db.get('SELECT 1 FROM teacher_classes WHERE teacher_user_id = ? AND class = ?', [teacherUserId, cls], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ owner: !!row });
  });
});

module.exports = router;