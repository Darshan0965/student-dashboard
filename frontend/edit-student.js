(async function(){
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) { alert("Missing student ID"); history.back(); return; }

  const name = document.getElementById("name");
  const roll = document.getElementById("roll");
  const cls = document.getElementById("class");
  const gender = document.getElementById("gender");
  const status = document.getElementById("status");

  try {
    const res = await fetch(`/students/${id}`);
    if (!res.ok) throw new Error("load failed");
    const s = await res.json();
    name.value = s.name || "";
    roll.value = s.roll_no || "";
    cls.value = s.class || "";
    gender.value = s.gender || "Other";
  } catch (err) { console.error(err); alert("Unable to load student"); }

  window.saveStudent = async function () {
    status.textContent = "Saving...";
    const body = { name: name.value.trim(), roll_no: roll.value.trim(), class: cls.value.trim(), gender: gender.value };
    const res = await fetch(`/students/${id}`, { method: "PUT", headers: { "Content-Type":"application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { status.textContent = "Update failed: " + (data.error || data.message || "Unknown"); return; }
    status.textContent = "Updated successfully!";
    setTimeout(()=> history.back(), 900);
  };
})();