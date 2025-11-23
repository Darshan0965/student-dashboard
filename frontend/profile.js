// frontend/profile.js
(async function(){
  const qs = new URLSearchParams(window.location.search);
  const id = qs.get('student_id');
  if (!id) { alert('Missing student_id'); location.href='/admin-dashboard.html'; return; }

  const title = document.getElementById('title');
  const nameEl = document.getElementById('name');
  const meta = document.getElementById('meta');
  const marksTbody = document.getElementById('marksTbody');
  const summary = document.getElementById('summary');

  try {
    const stuRes = await fetch(`/students/${id}`);
    if (!stuRes.ok) throw new Error('not found');
    const stu = await stuRes.json();

    nameEl.textContent = stu.name;
    meta.textContent = `Roll: ${stu.roll_no} • Class: ${stu.class} • Gender: ${stu.gender}`;
    title.textContent = `Profile - ${stu.name}`;

    const marks = stu.marks || [];
    marksTbody.innerHTML = '';
    if (marks.length === 0) marksTbody.innerHTML = '<tr><td colspan="3">No marks</td></tr>';
    marks.forEach((m,i)=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td class="p-1">${i+1}</td><td class="p-1">${m.subject}</td><td class="p-1">${m.marks}</td>`;
      marksTbody.appendChild(tr);
    });

    const avg = marks.length ? Math.round(marks.reduce((a,b)=>a+(b.marks||0),0)/marks.length) : null;
    const att = stu.attendance || {};
    summary.innerHTML = `<div>Average Marks: <strong>${avg!==null?avg:'—'}</strong></div>
      <div>Attendance: <strong>${att.present_days||'—'}/${att.total_days||'—'}</strong></div>
      <div>Grade: <strong>${avg===null?'—': (avg>=85?'A': avg>=70?'B': avg>=55?'C': avg>=40?'D':'F')}</strong></div>`;

    // charts
    if (window.StudentCharts) {
      const marksCtx = document.getElementById('marksChart').getContext('2d');
      const attCtx = document.getElementById('attChart').getContext('2d');
      window.StudentCharts.renderMarks(marksCtx, marks);
      window.StudentCharts.renderAttendance(attCtx, att);
    }
  } catch (err) {
    console.error(err);
    alert('Error loading profile');
  }
})();