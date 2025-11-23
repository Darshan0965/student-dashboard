// frontend/timetable.js
(async function(){
  const classSelect = document.getElementById('classSelect');
  const timetableContent = document.getElementById('timetableContent');
  const btnAdd = document.getElementById('btnAdd');
  const btnRefresh = document.getElementById('btnRefresh');

  // days order
  const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  async function loadClasses() {
    try {
      const res = await fetch('/timetable-classes');
      const classes = await res.json();
      // combine with students list as fallback
      if (!classes || classes.length === 0) {
        const sres = await fetch('/students');
        const studs = await sres.json();
        const unique = [...new Set(studs.map(s=>s.class))].sort();
        populateClasses(unique);
        return;
      }
      populateClasses(classes);
    } catch (e) {
      console.error(e);
      try {
        const sres = await fetch('/students');
        const studs = await sres.json();
        const unique = [...new Set(studs.map(s=>s.class))].sort();
        populateClasses(unique);
      } catch {}
    }
  }

  function populateClasses(list) {
    classSelect.innerHTML = '';
    const opt = document.createElement('option');
    opt.value = '';
    opt.innerText = 'Select class...';
    classSelect.appendChild(opt);
    list.forEach(c => {
      const o = document.createElement('option');
      o.value = c;
      o.innerText = c;
      classSelect.appendChild(o);
    });
  }

  async function loadTimetableForClass(cls) {
    if (!cls) {
      timetableContent.innerHTML = '<div class="empty">Select a class to view its timetable</div>';
      return;
    }

    try {
      const res = await fetch(`/timetable?class=${encodeURIComponent(cls)}`);
      if (!res.ok) throw new Error('Failed to fetch timetable');
      const rows = await res.json();
      if (!rows || rows.length === 0) {
        timetableContent.innerHTML = '<div class="empty">No timetable entries for this class yet. Click "Add Entry" to create.</div>';
        return;
      }

      // group by day
      const byDay = {};
      DAYS.forEach(d => byDay[d] = []);
      rows.forEach(r => {
        if (!byDay[r.day]) byDay[r.day] = [];
        byDay[r.day].push(r);
      });

      // sort each day by start_time
      for (const d of Object.keys(byDay)) {
        byDay[d].sort((a,b)=> a.start_time.localeCompare(b.start_time));
      }

      // render HTML
      let html = '';
      for (const d of DAYS) {
        const arr = byDay[d] || [];
        if (!arr.length) continue;
        html += `<h3 style="margin-top:10px;color:#cde8ff">${d}</h3>`;
        html += `<table class="table"><thead><tr><th>Time</th><th>Subject</th><th>Teacher</th><th>Room</th><th>Notes</th><th>Actions</th></tr></thead><tbody>`;
        arr.forEach(r => {
          html += `<tr>
            <td>${r.start_time} - ${r.end_time}</td>
            <td>${r.subject}</td>
            <td>${r.teacher || '-'}</td>
            <td>${r.room || '-'}</td>
            <td>${r.notes || '-'}</td>
            <td>
              <button data-id="${r.id}" class="btn-edit small" style="margin-right:6px">Edit</button>
              <button data-id="${r.id}" class="btn-del small" style="background:#f97316">Delete</button>
            </td>
          </tr>`;
        });
        html += `</tbody></table>`;
      }

      timetableContent.innerHTML = html;

      // wire edit/delete buttons
      document.querySelectorAll('.btn-edit').forEach(b => {
        b.addEventListener('click', () => {
          const id = b.dataset.id;
          window.location.href = `timetable-add.html?id=${id}`;
        });
      });
      document.querySelectorAll('.btn-del').forEach(b => {
        b.addEventListener('click', async () => {
          if (!confirm('Delete this timetable entry?')) return;
          const id = b.dataset.id;
          try {
            const r = await fetch(`/timetable/${id}`, { method: 'DELETE' });
            if (!r.ok) throw new Error('delete failed');
            alert('Deleted');
            loadTimetableForClass(classSelect.value);
          } catch (e) {
            console.error(e); alert('Delete failed');
          }
        });
      });

    } catch (e) {
      console.error(e);
      timetableContent.innerHTML = `<div class="empty">Failed to load timetable</div>`;
    }
  }

  classSelect.addEventListener('change', ()=> loadTimetableForClass(classSelect.value));
  btnRefresh.addEventListener('click', ()=> loadTimetableForClass(classSelect.value));
  btnAdd.addEventListener('click', ()=> {
    const cls = classSelect.value;
    // pass class in query for convenience
    window.location.href = `timetable-add.html?class=${encodeURIComponent(cls || '')}`;
  });

  // initial load
  await loadClasses();
  // if URL contains ?class=..., auto select
  const urlCls = new URLSearchParams(window.location.search).get('class');
  if (urlCls) {
    classSelect.value = urlCls;
    loadTimetableForClass(urlCls);
  } else {
    timetableContent.innerHTML = '<div class="empty">Select a class to view timetable</div>';
  }
})();