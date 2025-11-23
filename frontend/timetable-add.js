document.getElementById("saveBtn").onclick = async () => {
  const cls = document.getElementById("classInput").value.trim();
  const time = document.getElementById("timeInput").value.trim();
  const subject = document.getElementById("subjectInput").value.trim();
  const faculty = document.getElementById("facultyInput").value.trim();

  if (!cls || !time || !subject || !faculty) {
    alert("Please fill all fields");
    return;
  }

  try {
    const res = await fetch("/timetable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        class: cls,
        time,
        subject,
        faculty
      })
    });

    if (!res.ok) throw new Error();

    alert("Timetable Added Successfully!");

    // Clear inputs
    document.getElementById("classInput").value = "";
    document.getElementById("timeInput").value = "";
    document.getElementById("subjectInput").value = "";
    document.getElementById("facultyInput").value = "";

  } catch (err) {
    console.error(err);
    alert("Failed to save timetable!");
  }
};