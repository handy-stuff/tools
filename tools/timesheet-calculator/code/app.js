/* ============================================================
   Timesheet Calculator — Application Logic
   ============================================================ */

let rowCount = 0;

// ---- SVG icons as strings ----
const ICON_UP = '<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 7L5 3L8 7"/></svg>';
const ICON_DOWN = '<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2 3L5 7L8 3"/></svg>';
const ICON_DELETE = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>';

// ---- Helpers ----

function padZero(n) {
  return String(n).padStart(2, '0');
}

// Create a time input group: hour (1-12), colon, minute (00-59), AM/PM toggle, stepper arrows
function createTimeInputHTML(prefix, id) {
  return `
    <div class="time-input-group">
      <div class="stepper-group">
        <button type="button" class="stepper-btn" onclick="stepTime('${prefix}_${id}', 'hour', 1)" title="Hour up" tabindex="-1">${ICON_UP}</button>
        <button type="button" class="stepper-btn" onclick="stepTime('${prefix}_${id}', 'hour', -1)" title="Hour down" tabindex="-1">${ICON_DOWN}</button>
      </div>
      <input type="text" class="time-select hour-input" id="${prefix}_h_${id}" maxlength="2" value="12" placeholder="12"
             data-testid="input-${prefix}-hour-${id}"
             onkeydown="handleTimeKey(event, '${prefix}_${id}', 'hour')"
             onfocus="this.select()"
             oninput="clampHour(this)">
      <span class="time-colon">:</span>
      <input type="text" class="time-select minute-input" id="${prefix}_m_${id}" maxlength="2" value="00" placeholder="00"
             data-testid="input-${prefix}-minute-${id}"
             onkeydown="handleTimeKey(event, '${prefix}_${id}', 'minute')"
             onfocus="this.select()"
             oninput="clampMinute(this)">
      <div class="stepper-group">
        <button type="button" class="stepper-btn" onclick="stepTime('${prefix}_${id}', 'minute', 15)" title="Minute up" tabindex="-1">${ICON_UP}</button>
        <button type="button" class="stepper-btn" onclick="stepTime('${prefix}_${id}', 'minute', -15)" title="Minute down" tabindex="-1">${ICON_DOWN}</button>
      </div>
      <button type="button" class="ampm-toggle" id="${prefix}_ap_${id}" onclick="toggleAMPM(this)" data-testid="button-${prefix}-ampm-${id}">AM</button>
    </div>`;
}

// ---- Row Management ----

function addDay(dateVal, startH, startM, startAP, endH, endM, endAP) {
  rowCount++;
  const i = rowCount;
  const tbody = document.getElementById('days-body');
  const tr = document.createElement('tr');
  tr.id = `row_${i}`;
  tr.setAttribute('data-testid', `row-day-${i}`);

  const today = dateVal || '';

  tr.innerHTML = `
    <td class="row-index">${i}</td>
    <td>
      <div class="time-input-group">
        <div class="stepper-group">
          <button type="button" class="stepper-btn" onclick="stepDate('date_${i}', 1)" title="Next day" tabindex="-1">${ICON_UP}</button>
          <button type="button" class="stepper-btn" onclick="stepDate('date_${i}', -1)" title="Previous day" tabindex="-1">${ICON_DOWN}</button>
        </div>
        <input type="date" id="date_${i}" value="${today}" data-testid="input-date-${i}">
      </div>
    </td>
    <td>${createTimeInputHTML('start', i)}</td>
    <td>${createTimeInputHTML('end', i)}</td>
    <td class="hours-cell"><span id="hours_${i}" data-testid="text-hours-${i}">0.00</span></td>
    <td class="no-print">
      <button type="button" class="btn-delete" onclick="deleteRow(${i})" title="Remove" data-testid="button-delete-${i}">${ICON_DELETE}</button>
    </td>
  `;

  tbody.appendChild(tr);

  // Set prefilled values if provided
  if (startH !== undefined) {
    document.getElementById(`start_h_${i}`).value = padZero(startH);
    document.getElementById(`start_m_${i}`).value = padZero(startM);
    document.getElementById(`start_ap_${i}`).textContent = startAP || 'AM';
  }
  if (endH !== undefined) {
    document.getElementById(`end_h_${i}`).value = padZero(endH);
    document.getElementById(`end_m_${i}`).value = padZero(endM);
    document.getElementById(`end_ap_${i}`).textContent = endAP || 'AM';
  }

  // Scroll the new row into view
  tr.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function deleteRow(id) {
  const row = document.getElementById(`row_${id}`);
  if (row) {
    row.remove();
    renumberRows();
    calculateAll();
  }
}

function renumberRows() {
  const rows = document.querySelectorAll('#days-body tr');
  rows.forEach((row, idx) => {
    const indexCell = row.querySelector('.row-index');
    if (indexCell) indexCell.textContent = idx + 1;
  });
}

function getLastRow() {
  const tbody = document.getElementById('days-body');
  return tbody.lastElementChild || null;
}

function copyLastDay() {
  const lastRow = getLastRow();
  if (!lastRow) {
    addDay();
    return;
  }

  // Extract values from last row
  const dateInput = lastRow.querySelector('input[type="date"]');
  const dateVal = dateInput ? dateInput.value : '';

  const hourInputs = lastRow.querySelectorAll('.hour-input');
  const minuteInputs = lastRow.querySelectorAll('.minute-input');
  const ampmToggles = lastRow.querySelectorAll('.ampm-toggle');

  const startH = hourInputs[0] ? parseInt(hourInputs[0].value) || 12 : 12;
  const startM = minuteInputs[0] ? parseInt(minuteInputs[0].value) || 0 : 0;
  const startAP = ampmToggles[0] ? ampmToggles[0].textContent : 'AM';

  const endH = hourInputs[1] ? parseInt(hourInputs[1].value) || 12 : 12;
  const endM = minuteInputs[1] ? parseInt(minuteInputs[1].value) || 0 : 0;
  const endAP = ampmToggles[1] ? ampmToggles[1].textContent : 'AM';

  addDay(dateVal, startH, startM, startAP, endH, endM, endAP);
}

// ---- Date Stepper ----

function stepDate(inputId, direction) {
  const input = document.getElementById(inputId);
  if (!input) return;

  let date;
  if (input.value) {
    date = new Date(input.value + 'T00:00:00');
  } else {
    date = new Date();
  }

  date.setDate(date.getDate() + direction);

  const y = date.getFullYear();
  const m = padZero(date.getMonth() + 1);
  const d = padZero(date.getDate());
  input.value = `${y}-${m}-${d}`;
}

// ---- Time Stepper / Toggle ----

function toggleAMPM(btn) {
  btn.textContent = btn.textContent.trim() === 'AM' ? 'PM' : 'AM';
}

function stepTime(prefix, field, delta) {
  // prefix is like "start_1" or "end_2"
  const hInput = document.getElementById(`${prefix.replace(/_(\d+)$/, '_h_$1')}`);
  const mInput = document.getElementById(`${prefix.replace(/_(\d+)$/, '_m_$1')}`);

  // Actually, prefix is like "start_1" so we need "start_h_1" and "start_m_1"
  // Let's parse more carefully
  const parts = prefix.split('_');
  const type = parts[0]; // "start" or "end"
  const id = parts[1];   // row id

  const hourEl = document.getElementById(`${type}_h_${id}`);
  const minuteEl = document.getElementById(`${type}_m_${id}`);
  const ampmEl = document.getElementById(`${type}_ap_${id}`);

  if (!hourEl || !minuteEl || !ampmEl) return;

  let h = parseInt(hourEl.value) || 12;
  let m = parseInt(minuteEl.value) || 0;

  if (field === 'hour') {
    h += delta;
    if (h > 12) h = 1;
    if (h < 1) h = 12;
  } else {
    m += delta;
    if (m >= 60) { m = m - 60; }
    if (m < 0) { m = 60 + m; }
  }

  hourEl.value = padZero(h);
  minuteEl.value = padZero(m);
}

// Keyboard: up/down arrows step the focused time field
function handleTimeKey(event, prefix, field) {
  if (event.key === 'ArrowUp') {
    event.preventDefault();
    stepTime(prefix, field, field === 'hour' ? 1 : 15);
  } else if (event.key === 'ArrowDown') {
    event.preventDefault();
    stepTime(prefix, field, field === 'hour' ? -1 : -15);
  }
}

// ---- Input Clamping ----

function clampHour(input) {
  let val = input.value.replace(/\D/g, '');
  if (val.length > 2) val = val.slice(0, 2);
  let n = parseInt(val);
  if (!isNaN(n)) {
    if (n > 12) n = 12;
    if (n < 0) n = 0;
    input.value = val; // Keep raw while typing
  } else {
    input.value = val;
  }
}

function clampMinute(input) {
  let val = input.value.replace(/\D/g, '');
  if (val.length > 2) val = val.slice(0, 2);
  let n = parseInt(val);
  if (!isNaN(n)) {
    if (n > 59) n = 59;
    input.value = val;
  } else {
    input.value = val;
  }
}

// ---- Calculation ----

function to24(hour, minute, ampm) {
  let h = parseInt(hour) || 0;
  const m = parseInt(minute) || 0;
  const ap = (ampm || 'AM').toUpperCase().trim();

  if (ap === 'AM') {
    if (h === 12) h = 0; // 12 AM = midnight
  } else {
    if (h !== 12) h += 12; // PM: 1->13, 2->14, ..., 12 stays 12
  }

  return { h, m };
}

function calculateAll() {
  let total = 0;
  const rows = document.querySelectorAll('#days-body tr');

  rows.forEach(row => {
    const hourInputs = row.querySelectorAll('.hour-input');
    const minuteInputs = row.querySelectorAll('.minute-input');
    const ampmToggles = row.querySelectorAll('.ampm-toggle');
    const hoursSpan = row.querySelector('[id^="hours_"]');

    if (!hoursSpan || hourInputs.length < 2) return;

    const start = to24(hourInputs[0].value, minuteInputs[0].value, ampmToggles[0].textContent);
    const end = to24(hourInputs[1].value, minuteInputs[1].value, ampmToggles[1].textContent);

    let startMin = start.h * 60 + start.m;
    let endMin = end.h * 60 + end.m;

    // Handle overnight shift
    if (endMin <= startMin) {
      endMin += 24 * 60;
    }

    const diffMin = endMin - startMin;
    const hours = diffMin / 60;

    hoursSpan.textContent = hours.toFixed(2);
    total += hours;
  });

  document.getElementById('total-hours').textContent = total.toFixed(2);
}

// ---- Name Validation ----

function getEmployeeName() {
  const input = document.getElementById('employee-name');
  const error = document.getElementById('name-error');
  const name = input.value.trim();

  if (!name) {
    input.classList.add('input-error');
    error.classList.add('visible');
    input.focus();
    return null;
  }

  input.classList.remove('input-error');
  error.classList.remove('visible');
  return name;
}

// Clear error on typing
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('employee-name');
  if (input) {
    input.addEventListener('input', () => {
      input.classList.remove('input-error');
      document.getElementById('name-error').classList.remove('visible');
    });
  }
});

// ---- Build PDF filename ----

function buildPDFFilename(name) {
  // Get all dates from rows
  const rows = document.querySelectorAll('#days-body tr');
  const dates = [];

  rows.forEach(row => {
    const dateInput = row.querySelector('input[type="date"]');
    if (dateInput && dateInput.value) {
      dates.push(dateInput.value); // "YYYY-MM-DD"
    }
  });

  // Clean the name: lowercase, replace spaces with underscores, remove special chars
  const cleanName = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  if (dates.length === 0) {
    return `timesheets_${cleanName}.pdf`;
  }

  // Sort dates and get first & last
  dates.sort();
  const startDate = dates[0];  // "2026-03-16"
  const endDate = dates[dates.length - 1]; // "2026-03-20"

  // Format as MM_DD
  const startParts = startDate.split('-');
  const endParts = endDate.split('-');
  const startStr = startParts[1] + '_' + startParts[2]; // "03_16"
  const endStr = endParts[1] + '_' + endParts[2];       // "03_20"

  return `timesheets_${cleanName}_${startStr}_to_${endStr}.pdf`;
}

// ---- Save as PDF ----

function saveAsPDF() {
  // Validate name
  const employeeName = getEmployeeName();
  if (!employeeName) return;

  // Recalculate first
  calculateAll();

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // ---- Header ----
  doc.setFillColor(26, 86, 219); // primary blue
  doc.rect(0, 0, 297, 22, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text('Timesheet Calculator', 14, 14);

  // Date generated
  const now = new Date();
  const genDate = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Generated: ' + genDate, 297 - 14, 14, { align: 'right' });

  // ---- Employee Name ----
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(28, 33, 39);
  doc.text('Name: ', 14, 32);
  doc.setFont('helvetica', 'normal');
  doc.text(employeeName, 14 + doc.getTextWidth('Name: '), 32);

  // ---- Collect table data ----
  const rows = document.querySelectorAll('#days-body tr');
  const tableData = [];

  rows.forEach((row, idx) => {
    const dateInput = row.querySelector('input[type="date"]');
    const hourInputs = row.querySelectorAll('.hour-input');
    const minuteInputs = row.querySelectorAll('.minute-input');
    const ampmToggles = row.querySelectorAll('.ampm-toggle');
    const hoursSpan = row.querySelector('[id^="hours_"]');

    let dateStr = '';
    if (dateInput && dateInput.value) {
      const d = new Date(dateInput.value + 'T00:00:00');
      dateStr = d.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    }

    const startH = hourInputs[0] ? hourInputs[0].value : '12';
    const startM = minuteInputs[0] ? minuteInputs[0].value : '00';
    const startAP = ampmToggles[0] ? ampmToggles[0].textContent.trim() : 'AM';
    const startStr = startH + ':' + startM + ' ' + startAP;

    const endH = hourInputs[1] ? hourInputs[1].value : '12';
    const endM = minuteInputs[1] ? minuteInputs[1].value : '00';
    const endAP = ampmToggles[1] ? ampmToggles[1].textContent.trim() : 'AM';
    const endStr = endH + ':' + endM + ' ' + endAP;

    const hours = hoursSpan ? hoursSpan.textContent : '0.00';

    tableData.push([
      String(idx + 1),
      dateStr,
      startStr,
      endStr,
      hours
    ]);
  });

  // ---- Draw table ----
  doc.autoTable({
    startY: 38,
    head: [['#', 'Date', 'Start Time', 'End Time', 'Hours']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [36, 48, 63],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 10,
      halign: 'center',
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: 10,
      cellPadding: 4,
      textColor: [28, 33, 39],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { cellWidth: 70 },
      2: { halign: 'center', cellWidth: 45 },
      3: { halign: 'center', cellWidth: 45 },
      4: { halign: 'right', cellWidth: 30, fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    styles: {
      lineColor: [200, 205, 212],
      lineWidth: 0.3,
    },
    margin: { left: 14, right: 14 },
  });

  // ---- Total row ----
  const totalHours = document.getElementById('total-hours').textContent;
  const finalY = doc.lastAutoTable.finalY + 2;

  doc.setFillColor(36, 48, 63);
  doc.roundedRect(14, finalY, 297 - 28, 12, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text('TOTAL HOURS', 22, finalY + 8);
  doc.setFontSize(14);
  doc.text(totalHours, 297 - 22, finalY + 8, { align: 'right' });

  // ---- Save with dynamic filename ----
  const filename = buildPDFFilename(employeeName);
  doc.save(filename);
}

// ---- Print ----

function printSheet() {
  calculateAll();
  window.print();
}

// ---- Initialize with one row ----
addDay();
