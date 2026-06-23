/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('payroll-page-indicator')) return;

  // Initialize Month/Year filters
  const mSel = document.getElementById('select-payroll-month');
  const ySel = document.getElementById('select-payroll-year');
  if (mSel && ySel) {
    mSel.value = '06';
    ySel.value = '2026';
    
    mSel.addEventListener('change', renderPayrollLedger);
    ySel.addEventListener('change', renderPayrollLedger);
  }

  // Bind live search
  const searchInput = document.getElementById('search-payroll');
  if (searchInput) {
    searchInput.addEventListener('input', renderPayrollLedger);
  }

  // Bind Export Excel
  const exportBtn = document.getElementById('export-payroll');
  if (exportBtn) {
    exportBtn.addEventListener('click', exportPayrollToExcel);
  }

  renderPayrollLedger();
});

// Calculate metrics per employee representing their monthly payroll row
function renderPayrollLedger() {
  const m = document.getElementById('select-payroll-month').value;
  const y = document.getElementById('select-payroll-year').value;
  const yearMonth = `${y}-${m}`;

  const employees = DB.getEmployees();
  const shifts = DB.getShifts();
  const attendance = DB.getAttendance(yearMonth);
  const searchVal = (document.getElementById('search-payroll')?.value || '').toLowerCase();

  const tbody = document.getElementById('payroll-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  const filteredEmployees = employees.filter(emp => {
    return emp.name.toLowerCase().includes(searchVal) || emp.empNo.toLowerCase().includes(searchVal);
  });

  if (filteredEmployees.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="12" class="text-center py-4 text-muted bg-white">
          <i class="bi bi-cash-stack fs-1 d-block mb-2"></i>
          لا توجد بيانات موظفين مسجلة لعمل كشف الرواتب.
        </td>
      </tr>
    `;
    return;
  }

  // Sum indicators
  let totals = {
    basic: 0,
    absentDays: 0,
    absentDeduct: 0,
    rawDelayMins: 0,
    delayMins: 0,
    delayDeduct: 0,
    earlyOutMins: 0,
    earlyOutDeduct: 0,
    net: 0
  };

  filteredEmployees.forEach(emp => {
    const shift = shifts.find(s => s.code === emp.shiftCode);
    const standardWorkHours = shift ? shift.workingHours : 8; // default to 8 if not found

    // Hourly calculations
    const dayPay = emp.basicSalary / 30;
    const hourPay = dayPay / standardWorkHours;
    const minutePay = hourPay / 60;

    // Accumulators for current employee
    let totalAbsentDaysCount = 0;
    let totalDelayMinutesCount = 0;
    let totalRawDelayMinutesCount = 0;
    let totalEarlyOutMinutesCount = 0;

    // Loop through attendance values
    Object.keys(attendance).forEach(key => {
      // Key format: `${empNo}_${date}`
      if (key.startsWith(`${emp.empNo}_`)) {
        const record = attendance[key];

        // Deduct as absence if marked as 'غياب بدون عذر' or if absent is true and no reason
        const unpaidReasons = ['غياب بدون عذر', 'إجازة بدون راتب'];
        if (record.isAbsent && (!record.reason || unpaidReasons.includes(record.reason))) {
          totalAbsentDaysCount++;
        } else if (unpaidReasons.includes(record.reason)) {
          totalAbsentDaysCount++;
        }

        // Delay and early outs
        if (!record.isLeave && !record.isAbsent) {
          totalRawDelayMinutesCount += record.rawDelayMinutes || record.delayMinutes || 0;
          if (!record.reason || record.reason === '') {
            totalDelayMinutesCount += record.delayMinutes || 0;
            totalEarlyOutMinutesCount += record.earlyOutMinutes || 0;
          }
        }
      }
    });

    // Formulate final deductions
    const absentDeduction = totalAbsentDaysCount * dayPay;
    const delayDeduction = totalDelayMinutesCount * minutePay;
    const earlyOutDeduction = totalEarlyOutMinutesCount * minutePay;

    // Net Salary
    const netSalary = Math.max(0, emp.basicSalary - (absentDeduction + delayDeduction + earlyOutDeduction));

    // Update totals
    totals.basic += emp.basicSalary;
    totals.absentDays += totalAbsentDaysCount;
    totals.absentDeduct += absentDeduction;
    totals.rawDelayMins += totalRawDelayMinutesCount;
    totals.delayMins += totalDelayMinutesCount;
    totals.delayDeduct += delayDeduction;
    totals.earlyOutMins += totalEarlyOutMinutesCount;
    totals.earlyOutDeduct += earlyOutDeduction;
    totals.net += netSalary;

    // Create row
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="fw-bold">${emp.empNo}</td>
      <td class="fw-semibold text-start">${emp.name}</td>
      <td>${emp.department}</td>
      <td class="fw-bold text-dark font-mono">${emp.basicSalary.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
      
      <!-- Absence Column -->
      <td class="font-mono text-danger">${totalAbsentDaysCount} أيام</td>
      <td class="font-mono text-danger fw-medium">${absentDeduction.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
      
      <!-- Delay Column -->
      <td class="font-mono text-warning text-center small" style="font-size: 0.78rem; line-height: 1.25;">
        <div class="text-muted text-nowrap" style="font-size: 0.7rem;">الخام: ${totalRawDelayMinutesCount} د</div>
        <div class="text-muted text-nowrap" style="font-size: 0.7rem;">السماحية: ${totalRawDelayMinutesCount - totalDelayMinutesCount} د</div>
        <div class="fw-bold text-danger text-nowrap" style="font-size: 0.72rem;">المحتسب: ${totalDelayMinutesCount} د</div>
      </td>
      <td class="font-mono text-warning fw-medium">${delayDeduction.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
      
      <!-- Early Out Column -->
      <td class="font-mono text-info">${totalEarlyOutMinutesCount} د</td>
      <td class="font-mono text-info fw-medium">${earlyOutDeduction.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
      
      <!-- Net Column -->
      <td class="font-mono text-success fw-bold text-center bg-success-subtle rounded-1">${netSalary.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
    `;
    tbody.appendChild(tr);
  });

  // Populate overall Sums row
  const totalRow = document.createElement('tr');
  totalRow.className = 'table-secondary fw-bold border-top-2';
  totalRow.innerHTML = `
    <td colspan="3" class="text-center">الإجمالي العام الكلي (ريال سعودي)</td>
    <td class="font-mono">${totals.basic.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
    <td class="font-mono text-danger">${totals.absentDays} أيام</td>
    <td class="font-mono text-danger">${totals.absentDeduct.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
    <td class="font-mono text-warning text-center small" style="font-size: 0.78rem; line-height: 1.25;">
      <div class="text-muted text-nowrap" style="font-size: 0.7rem;">الخام: ${totals.rawDelayMins} د</div>
      <div class="text-muted text-nowrap" style="font-size: 0.7rem;">السماحية: ${totals.rawDelayMins - totals.delayMins} د</div>
      <div class="fw-bold text-danger text-nowrap" style="font-size: 0.72rem;">المحتسب: ${totals.delayMins} د</div>
    </td>
    <td class="font-mono text-warning">${totals.delayDeduct.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
    <td class="font-mono text-info">${totals.earlyOutMins} دقيقة</td>
    <td class="font-mono text-info">${totals.earlyOutDeduct.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
    <td class="font-mono text-success text-center bg-success-subtle fs-6" style="border:2px solid #198754">${totals.net.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
  `;
  tbody.appendChild(totalRow);
}

// Export Ledger to Excel
function exportPayrollToExcel() {
  const m = document.getElementById('select-payroll-month').value;
  const y = document.getElementById('select-payroll-year').value;
  const yearMonth = `${y}-${m}`;

  const employees = DB.getEmployees();
  const shifts = DB.getShifts();
  const attendance = DB.getAttendance(yearMonth);

  const exportData = employees.map(emp => {
    const shift = shifts.find(s => s.code === emp.shiftCode);
    const standardWorkHours = shift ? shift.workingHours : 8;

    const dayPay = emp.basicSalary / 30;
    const hourPay = dayPay / standardWorkHours;
    const minutePay = hourPay / 60;

    let totalAbsentDaysCount = 0;
    let totalDelayMinutesCount = 0;
    let totalRawDelayMinutesCount = 0;
    let totalEarlyOutMinutesCount = 0;

    Object.keys(attendance).forEach(key => {
      if (key.startsWith(`${emp.empNo}_`)) {
        const record = attendance[key];
        const unpaidReasons = ['غياب بدون عذر', 'إجازة بدون راتب'];
        if (record.isAbsent && (!record.reason || unpaidReasons.includes(record.reason))) {
          totalAbsentDaysCount++;
        } else if (unpaidReasons.includes(record.reason)) {
          totalAbsentDaysCount++;
        }

        if (!record.isLeave && !record.isAbsent) {
          totalRawDelayMinutesCount += record.rawDelayMinutes || record.delayMinutes || 0;
          if (!record.reason || record.reason === '') {
            totalDelayMinutesCount += record.delayMinutes || 0;
            totalEarlyOutMinutesCount += record.earlyOutMinutes || 0;
          }
        }
      }
    });

    const absentDeduction = totalAbsentDaysCount * dayPay;
    const delayDeduction = totalDelayMinutesCount * minutePay;
    const earlyOutDeduction = totalEarlyOutMinutesCount * minutePay;
    const netSalary = Math.max(0, emp.basicSalary - (absentDeduction + delayDeduction + earlyOutDeduction));

    return {
      'الرقم الوظيفي': emp.empNo,
      'اسم الموظف': emp.name,
      'القسم': emp.department,
      'الراتب الأساسي': emp.basicSalary,
      'أيام الغياب': totalAbsentDaysCount,
      'خصم الغياب': parseFloat(absentDeduction.toFixed(2)),
      'دقائق التأخير الخام': totalRawDelayMinutesCount,
      'سماحية التأخير (دقائق)': totalRawDelayMinutesCount - totalDelayMinutesCount,
      'دقائق التأخير المحتسب': totalDelayMinutesCount,
      'خصم التأخير': parseFloat(delayDeduction.toFixed(2)),
      'دقائق الخروج المبكر': totalEarlyOutMinutesCount,
      'خصم الخروج المبكر': parseFloat(earlyOutDeduction.toFixed(2)),
      'صافي الراتب المستحق': parseFloat(netSalary.toFixed(2))
    };
  });

  window.ImportExport.exportToExcel(exportData, `مسير_الرواتب_الشهري_${yearMonth}`, 'مسير الرواتب');
  window.Toast.success('تم تصدير مسير الرواتب الشهري لملف إكسل بنجاح.');
}
