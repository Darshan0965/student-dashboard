// ==================== FETCH & RENDER DASHBOARD STATS ====================
async function loadDashboardStats() {
    try {
        const res = await fetch("/students");
        const students = await res.json();

        document.getElementById("totalStudents").innerText = students.length;

        const classList = [...new Set(students.map(s => s.class))];
        document.getElementById("totalClasses").innerText = classList.length;

        // ---- Attendance calculation
        let totalPresent = 0;
        let totalDays = 0;

        // fetch attendance for each student. keep sequential so sqlite doesn't get too many parallel requests
        for (let s of students) {
            try {
                const aRes = await fetch(`/attendance/${s.id}`);
                const att = await aRes.json();
                if (att && att.present_days != null && att.total_days != null) {
                    totalPresent += att.present_days;
                    totalDays += att.total_days;
                }
            } catch (e) {
                // ignore missing attendance
            }
        }

        let avg = totalDays ? ((totalPresent / totalDays) * 100).toFixed(1) : 0;
        document.getElementById("overallAttendance").innerText = avg + "%";

    } catch (err) {
        console.error("Error loading stats:", err);
    }
}

// ==================== CLASS GRID ====================
async function loadClassCards() {
    try {
        const res = await fetch("/students");
        const students = await res.json();

        const grid = document.getElementById("classGrid");
        grid.innerHTML = "";

        const classes = {};
        students.forEach(s => {
            if (!classes[s.class]) classes[s.class] = 0;
            classes[s.class]++;
        });

        Object.keys(classes).sort().forEach(cls => {
            const card = document.createElement("div");
            card.className = "class-card";

            card.innerHTML = `
                <div class="class-title">${cls}</div>
                <div class="student-count">${classes[cls]} Students</div>
                <div class="open-btn">Open</div>
            `;

            card.querySelector(".open-btn").onclick = () => {
                window.location.href = `class-view.html?class=${encodeURIComponent(cls)}`;
            };

            grid.appendChild(card);
        });

    } catch (err) {
        console.error("Error loading class cards:", err);
    }
}

// ==================== EDIT STUDENT NAV ====================
function editStudent(id) {
    // open edit page for a given student id
    window.location.href = `edit-student.html?id=${encodeURIComponent(id)}`;
}

// ==================== LOGOUT ====================
document.getElementById("logoutBtn").addEventListener("click", () => {
    fetch("/auth/logout", { method: "POST" })
        .then(() => window.location.href = "login.html")
        .catch(() => alert("Logout failed"));
});

// ==================== INITIALIZE ====================
loadDashboardStats();
loadClassCards();