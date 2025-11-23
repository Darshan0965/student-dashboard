// frontend/charts.js
(function(global){
  let marksChart = null;
  let attChart = null;

  function destroy(c){ try{ c && c.destroy(); }catch(e){} }

  function renderMarks(ctx, data){
    destroy(marksChart);
    if (!data || !data.length) return;
    const labels = data.map(d => d.subject);
    const vals = data.map(d => Number(d.marks));
    marksChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label:'Marks', data: vals }] },
      options: { responsive:true, scales:{ y:{ beginAtZero:true, max:100 } } }
    });
  }

  function renderAttendance(ctx, att){
    destroy(attChart);
    if (!att || typeof att.present_days === 'undefined') return;
    const present = Number(att.present_days || 0);
    const total = Number(att.total_days || 0);
    const absent = Math.max(0, total - present);
    attChart = new Chart(ctx, {
      type: 'doughnut',
      data: { labels:['Present','Absent'], datasets:[{ data:[present, absent] }] },
      options: { responsive:true }
    });
  }

  global.StudentCharts = { renderMarks, renderAttendance };
})(window);