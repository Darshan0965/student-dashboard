function goBack(){ window.history.back(); }
function getId(){ return new URLSearchParams(window.location.search).get('id'); }
async function jsonGet(url){ const r = await fetch(url); return r.ok ? await r.json() : null; }

let marksChart = null, attendanceChart = null;
async function loadProfile(){
  const id = getId(); if (!id) return alert('No student id');
  const data = await jsonGet(`/students/${id}`);
  if (!data) return alert('Failed to load');
  document.getElementById('stuName').innerText = data.name || '';
  document.getElementById('stuRoll').innerText = 'Roll: ' + (data.roll_no || '');
  document.getElementById('stuClass').innerText = 'Class: ' + (data.class || '');
  document.getElementById('stuGender').innerText = 'Gender: ' + (data.gender || '');
  document.getElementById('stuNotes').innerText = (data.notes || '');
  document.getElementById('profilePhoto').src = data.photo || '/favicon.ico';
  const marks = data.marks || [];
  const labels = marks.map(m=>m.subject);
  const values = marks.map(m=>Number(m.marks||0));
  const ctx = document.getElementById('marksChart').getContext('2d'); if (marksChart) marksChart.destroy();
  marksChart = new Chart(ctx, { type:'bar', data:{ labels, datasets:[{ label:'Marks', data: values }] }, options:{ responsive:true } });
  const att = data.attendance || null; const ctx2 = document.getElementById('attendanceChart').getContext('2d'); if (attendanceChart) attendanceChart.destroy();
  if (att) {
    const pct = att.total_days ? ((att.present_days/att.total_days)*100).toFixed(1) : 0;
    attendanceChart = new Chart(ctx2, { type:'doughnut', data:{ labels: ['Present %','Absent %'], datasets:[{ data: [Number(pct), 100-Number(pct)] }] }, options:{ responsive:true } });
  } else {
    attendanceChart = new Chart(ctx2, { type:'doughnut', data:{ labels:['No data'], datasets:[{ data:[100] }] }, options:{ responsive:true } });
  }
}
document.getElementById && setTimeout(loadProfile, 50);