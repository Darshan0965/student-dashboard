(async function () {
  const params = new URLSearchParams(window.location.search);
  const cls = params.get("class");
  if (!cls) { alert("Class missing"); location.href = "/admin-dashboard.html"; return; }
  document.getElementById("classTitle").textContent = `Class: ${cls}`;
  const tbody = document.getElementById("studentBody");
  const status = document.getElementById("status");

  const profileModal = document.getElementById("profileModal");
  const attendanceModal = document.getElementById("attendanceModal");
  const marksModal = document.getElementById("marksModal");
  const profileContent = document.getElementById("profileContent");
  const attendanceContent = document.getElementById("attendanceContent");
  const marksContent = document.getElementById("marksContent");

  function closeProfile() { profileModal.style.display = "none"; }
  function closeAttendance() { attendanceModal.style.display = "none"; }
  function closeMarks() { marksModal.style.display = "none"; }
  window.closeProfile = closeProfile;
  window.closeAttendance = closeAttendance;
  window.closeMarks = closeMarks;

  try {
    status.textContent = "Loading...";
    const res = await fetch(`/class-details?class=${encodeURIComponent(cls)}`);
    if (!res.ok) throw new Error("Failed fetch");
    const rows = await res.json();
    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="9" class="p-3 text-center text-gray-400">No students found</td></tr>`;
      status.textContent = ""; return;
    }

    rows.forEach((s, i) => {
      const avg = s.subjects?.length ? Math.round(s.subjects.reduce((a,b)=>a+(b.marks||0),0)/s.subjects.length) : null;
      const att = s.attendance ? `${s.attendance.present}/${s.attendance.total}` : "N/A";
      const grade = avg===null ? "N/A" : (avg>=85?"A":avg>=70?"B":avg>=55?"C":avg>=40?"D":"F");

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="p-2">${i+1}</td>
        <td class="p-2">${s.name}</td>
        <td class="p-2">${s.roll_no}</td>
        <td class="p-2">${s.gender}</td>
        <td class="p-2">${(s.subjects||[]).map(x=>x.subject+':'+x.marks).join(', ')}</td>
        <td class="p-2">${avg!==null?avg:'—'}</td>
        <td class="p-2">${att}</td>
        <td class="p-2 font-bold">${grade}</td>
        <td class="p-2 flex gap-2">
          <button data-action="profile" data-id="${s.id}" class="action-btn bg-blue-500"><img class="icon" src="https://cdn-icons-png.flaticon.com/512/64/64572.png"></button>
          <button data-action="attendance" data-id="${s.id}" class="action-btn bg-yellow-500"><img class="icon" src="https://cdn-icons-png.flaticon.com/512/1827/1827313.png"></button>
          <button data-action="marks" data-id="${s.id}" class="action-btn bg-green-500"><img class="icon" src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png"></button>
          <button data-action="edit" data-id="${s.id}" class="action-btn bg-purple-600"><img class="icon" src="https://cdn-icons-png.flaticon.com/512/1159/1159633.png"></button>
          <button data-action="delete" data-id="${s.id}" class="action-btn bg-red-600"><img class="icon" src="https://cdn-icons-png.flaticon.com/512/3096/3096673.png"></button>
        </td>`;
      tbody.appendChild(tr);
    });

    tbody.addEventListener("click", async (ev) => {
      const btn = ev.target.closest("button");
      if (!btn) return;
      const id = btn.dataset.id; const act = btn.dataset.action;

      if (act === "profile") {
        const r = await fetch(`/students/${id}`); const d = await r.json();
        profileContent.innerHTML = `<p><b>Name:</b> ${d.name}</p><p><b>Roll:</b> ${d.roll_no}</p><p><b>Gender:</b> ${d.gender}</p><p><b>Class:</b> ${d.class}</p><br><p><b>Subjects:</b></p><ul class="list-disc ml-4">${(d.marks||[]).map(m=>`<li>${m.subject}: ${m.marks}</li>`).join("")}</ul>`;
        profileModal.style.display = "flex";
      }

      if (act === "attendance") {
        const r = await fetch(`/attendance/${id}`); const d = await r.json();
        const pct = d.total_days ? Math.round((d.present_days / d.total_days)*100) : 0;
        attendanceContent.innerHTML = `<p><b>Present:</b> ${d.present_days}</p><p><b>Total:</b> ${d.total_days}</p><p><b>Percentage:</b> ${pct}%</p>`;
        attendanceModal.style.display = "flex";
      }

      if (act === "marks") {
        const r = await fetch(`/marks/${id}`); const d = await r.json();
        marksContent.innerHTML = d.map(m=>`<p>${m.subject}: <b>${m.marks}</b></p>`).join("");
        marksModal.style.display = "flex";
      }

      if (act === "edit") window.location.href = `/edit-student.html?id=${id}`;
      if (act === "delete") { if (!confirm("Delete student?")) return; await fetch(`/students/${id}`, { method: "DELETE" }); location.reload(); }
    });

    status.textContent = "";
  } catch (err) {
    console.error(err);
    status.textContent = "Unable to load class data";
  }
})();