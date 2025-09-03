// Pump Logger main JS - uses localStorage
const storageKey = 'pump_logs_v1';
let logs = JSON.parse(localStorage.getItem(storageKey) || '[]');

const tankSelect = document.getElementById('tankSelect');
const pumpSelect = document.getElementById('pumpSelect');
const depthInput = document.getElementById('depthInput');
const statusSelect = document.getElementById('statusSelect');
const notesInput = document.getElementById('notesInput');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');
const logsList = document.getElementById('logsList');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const settingsBtn = document.getElementById('settingsBtn');
const chartBtn = document.getElementById('chartBtn');
const settingsSection = document.getElementById('settingsSection');
const chartSection = document.getElementById('chartSection');
const thresholdInput = document.getElementById('thresholdInput');
const saveSettings = document.getElementById('saveSettings');
const closeSettings = document.getElementById('closeSettings');
const plotBtn = document.getElementById('plotBtn');
const chartTank = document.getElementById('chartTank');
const chartPump = document.getElementById('chartPump');
const depthChartCtx = document.getElementById('depthChart').getContext('2d');
const closeChart = document.getElementById('closeChart');

let chartInstance = null;
let threshold = parseFloat(localStorage.getItem('pump_threshold') || '0.5');

function renderLogs() {
  logsList.innerHTML = '';
  logs.slice().reverse().forEach((l) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${l.tank}</strong> - ${l.pump} | Depth: ${l.depth} m | ${l.status}
      <div class="small">${new Date(l.ts).toLocaleString()}</div>
      <div>${l.notes || ''}</div>`;
    logsList.appendChild(li);
  });
}

function saveLogsToStorage() {
  localStorage.setItem(storageKey, JSON.stringify(logs));
}

saveBtn.addEventListener('click', () => {
  const depthVal = parseFloat(depthInput.value);
  if (isNaN(depthVal)) { alert('Enter a valid depth'); return; }
  const log = {
    id: Date.now(),
    tank: tankSelect.value,
    pump: pumpSelect.value,
    depth: depthVal,
    status: statusSelect.value,
    notes: notesInput.value,
    ts: Date.now()
  };
  logs.push(log);
  saveLogsToStorage();
  renderLogs();
  depthInput.value=''; notesInput.value='';

  if (log.depth < threshold) {
    // in-app alert + browser notification if permission
    alert(`⚠️ Alert: ${log.tank} ${log.pump} depth ${log.depth} m below threshold ${threshold} m`);
    if (Notification && Notification.permission === 'granted') {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) reg.showNotification('Pump Alert', {
          body: `${log.tank} ${log.pump} depth ${log.depth} m`
        });
      });
    } else if (Notification && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }
});

clearBtn.addEventListener('click', () => {
  if (!confirm('Clear all logs?')) return;
  logs=[]; saveLogsToStorage(); renderLogs();
});

exportCsvBtn.addEventListener('click', () => {
  if (logs.length === 0) { alert('No logs to export'); return; }
  const header = 'id,tank,pump,depth,status,notes,timestamp\n';
  const rows = logs.map(l => 
    `${l.id},${l.tank},${l.pump},${l.depth},${l.status},"${(l.notes||'').replace(/"/g,'""')}",${l.ts}`
  ).join('\n');
  const blob = new Blob([header+rows], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); 
  a.href=url; 
  a.download = `pump_logs_${Date.now()}.csv`; 
  a.click();
  URL.revokeObjectURL(url);
});

settingsBtn.addEventListener('click', () => {
  thresholdInput.value = threshold;
  settingsSection.style.display = 'block';
});

saveSettings.addEventListener('click', () => {
  threshold = parseFloat(thresholdInput.value) || 0.5;
  localStorage.setItem('pump_threshold', threshold);
  settingsSection.style.display = 'none';
  alert('Settings saved ✅');
});

closeSettings.addEventListener('click', () => settingsSection.style.display='none');

chartBtn.addEventListener('click', () => {
  chartSection.style.display='block';
});

closeChart.addEventListener('click', () => chartSection.style.display='none');

plotBtn.addEventListener('click', () => {
  const selected = logs
    .filter(l => l.tank===chartTank.value && l.pump===chartPump.value)
    .sort((a,b)=>a.ts-b.ts);
  if (selected.length===0) { alert('No logs for selected pump'); return; }
  const labels = selected.map(s => new Date(s.ts).toLocaleString());
  const data = selected.map(s => s.depth);
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(depthChartCtx, {
    type: 'line',
    data: { 
      labels, 
      datasets: [{ 
        label: `${chartTank.value} - ${chartPump.value}`, 
        data, 
        fill:false, 
        borderColor:'#2563eb',
        tension:0.2 
      }]
    },
    options: { 
      responsive:true, 
      plugins:{legend:{display:true}}, 
      scales:{y:{title:{display:true,text:'Depth (m)'}}}
    }
  });
});

renderLogs();

// prompt for notification permission on first load
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission();
}
