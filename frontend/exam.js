// frontend/exams.js
async function api(path, opts={}) {
  opts.credentials = 'same-origin';
  if (!opts.headers) opts.headers = {};
  return fetch(path, opts);
}

async function loadExams() {
  const cls = document.getElementById('examClass').value || '';
  const url = cls ? `/api/exams?class=${encodeURIComponent(cls)}` : '/api/exams';
  const res = await api(url);
  const data = await res.json();
  const list = document.getElementById('examsList');
  list.innerHTML = '';
  data.forEach(e => {
    const div = document.createElement('div');
    div.className = 'p-2 border rounded flex justify-between items-center';
    div.innerHTML = `
      <div>
        <div class="font-semibold">${e.name} <span class="text-sm text-gray-500">(${e.type} - ${e.class})</span></div>
        <div class="text-sm text-gray-600">${e.date || ''}</div>
      </div>
      <div class="flex gap-2">
        <a class="bg-green-500 text-white px-2 py-1 rounded" href="/api/exam-marks/export/${e.id}">Export XLSX</a>
        <button class="bg-gray-700 text-white px-2 py-1 rounded" onclick="openImport(${e.id})">Import XLSX</button>
        <button class="bg-red-500 text-white px-2 py-1 rounded" onclick="deleteExam(${e.id})">Delete</button>
        <a class="bg-blue-500 text-white px-2 py-1 rounded" href="/class-view.html?class=${encodeURIComponent(e.class)}">Open Class</a>
      </div>
    `;
    list.appendChild(div);
  });
}

document.getElementById('btnCreateExam').addEventListener('click', async ()=>{
  const name = document.getElementById('examName').value.trim();
  const cls = document.getElementById('examClass').value.trim();
  const type = document.getElementById('examType').value;
  const date = document.getElementById('examDate').value || null;
  if (!name || !cls) return alert('Name & class required');
  const res = await api('/api/exams', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, class: cls, type, date })});
  if (!res.ok) return alert('Create failed');
  await loadExams();
  alert('Exam created');
});

async function deleteExam(id){
  if (!confirm('Delete exam?')) return;
  const res = await api(`/api/exams/${id}`, { method: 'DELETE' });
  if (!res.ok) return alert('Delete failed');
  await loadExams();
}

function openImport(examId) {
  // go to import page with exam id
  window.location.href = `/import-export.html?exam_id=${examId}`;
}

loadExams();