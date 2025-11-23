document.addEventListener("DOMContentLoaded", loadDashboard);

async function loadDashboard() {
  try {
    // ========================
    // TOTAL STUDENTS
    // ========================
    const stuRes = await fetch("/students");
    const students = await stuRes.json();
    document.getElementById("totalStudents").textContent = students.length;

    // ========================
    // CLASS LIST
    // ========================
    const clsRes = await fetch("/class-list");
    const classes = await clsRes.json();
    document.getElementById("totalClasses").textContent = classes.length;

    const grid = document.getElementById("classGrid");
    grid.innerHTML = "";

    classes.forEach(c => {
      const box = document.createElement("div");
      box.className = "card cursor-pointer hover:bg-gray-700";
      box.onclick = () => location.href = `class-view.html?class=${c.class}`;

      box.innerHTML = `
        <div class="text-xl font-semibold">${c.class}</div>
        <div class="text-sm opacity-75">${c.total} Students</div>
      `;

      grid.appendChild(box);
    });

    // ========================
    // OVERALL ATTENDANCE
    // ========================
    const attRes = await fetch("/overall-attendance");
    const att = await attRes.json();
    document.getElementById("overallAttendance").textContent = att.percentage + "%";

  } catch (err) {
    console.error(err);
    alert("Unable to load dashboard");
  }
}

// ========================
// LOGOUT
// ========================
document.getElementById("logoutBtn").onclick = () => {
  location.href = "login.html";
};