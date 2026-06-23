/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ImportExport utilities with rich validations
const ImportExport = {
  // Export JSON array to Excel (using SheetJS)
  exportToExcel(data, fileName, sheetName = 'Sheet1') {
    if (typeof XLSX === 'undefined') {
      console.error('SheetJS (XLSX) is not loaded.');
      alert('مكتبة تصدير الإكسل غير محملة حالياً.');
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  },

  // Export any HTML Table element to Excel
  exportTableToExcel(tableId, fileName, sheetName = 'Sheet1') {
    if (typeof XLSX === 'undefined') {
      console.error('SheetJS (XLSX) is not loaded.');
      return;
    }
    const table = document.getElementById(tableId);
    if (!table) return;
    const worksheet = XLSX.utils.table_to_sheet(table);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  },

  // Import Employees from Excel with full validation
  importEmployees(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet);
        
        const employees = DB.getEmployees();
        const shifts = DB.getShifts();
        
        let importedCount = 0;
        let updatedCount = 0;
        const rejected = [];
        const seenEmpNos = new Set();

        rows.forEach((row, index) => {
          const rowNum = index + 2; // Row number in Excel (header is row 1)
          
          // Map flexible columns
          const empNo = String(row['الرقم الوظيفي'] || row['empNo'] || '').trim();
          const name = String(row['اسم الموظف'] || row['name'] || '').trim();
          const department = String(row['القسم'] || row['department'] || 'عام').trim();
          const position = String(row['المسمى الوظيفي'] || row['position'] || 'موظف').trim();
          const shiftCode = String(row['الوردية'] || row['shiftCode'] || 'SH-01').trim();
          const basicSalaryRaw = row['الراتب الأساسي'] || row['basicSalary'] || '';
          const leaveBalanceRaw = row['رصيد الإجازات'] || row['leaveBalance'] || '21';
          const status = String(row['الحالة'] || row['status'] || 'نشط').trim();

          // 1. Validate empty empNo
          if (!empNo) {
            rejected.push({ row: rowNum, item: 'بدون رقم', reason: 'الرقم الوظيفي حقل إلزامي فارغ.' });
            return;
          }

          // 2. Validate empty name
          if (!name) {
            rejected.push({ row: rowNum, item: empNo, reason: 'اسم الموظف حقل إلزامي فارغ.' });
            return;
          }

          // 3. Check for duplicates in the current file
          if (seenEmpNos.has(empNo)) {
            rejected.push({ row: rowNum, item: empNo, reason: 'الرقم الوظيفي مكرر داخل نفس ملف الإكسل.' });
            return;
          }
          seenEmpNos.add(empNo);

          // 4. Validate basicSalary is a valid positive number
          const basicSalary = parseFloat(basicSalaryRaw);
          if (isNaN(basicSalary) || basicSalary <= 0) {
            rejected.push({ row: rowNum, item: empNo, reason: `قيمة الراتب الأساسي غير صالحة: "${basicSalaryRaw}". يجب أن تكون رقماً أكبر من صفر.` });
            return;
          }

          // 5. Validate shiftCode exists in the database
          const shiftExists = shifts.some(s => s.code === shiftCode);
          if (!shiftExists) {
            rejected.push({ row: rowNum, item: empNo, reason: `رمز الوردية "${shiftCode}" غير مسجل في النظام حالياً.` });
            return;
          }

          const leaveBalance = parseInt(leaveBalanceRaw, 10) || 0;

          const existingIdx = employees.findIndex(e => e.empNo === empNo);
          const seq = existingIdx >= 0 ? employees[existingIdx].seq : (employees.length + 1);

          const empData = {
            seq,
            empNo,
            name,
            department,
            position,
            shiftCode,
            basicSalary,
            leaveBalance,
            status: (status === 'نشط' || status === 'موقوف') ? status : 'نشط'
          };

          if (existingIdx >= 0) {
            employees[existingIdx] = empData;
            updatedCount++;
          } else {
            employees.push(empData);
            importedCount++;
          }
        });

        DB.saveEmployees(employees);
        callback(null, {
          importedCount,
          updatedCount,
          rejected
        });
      } catch (err) {
        callback(err.message || 'حدث خطأ أثناء قراءة ملف الإكسل.');
      }
    };
    reader.onerror = function(err) {
      callback(err);
    };
    reader.readAsArrayBuffer(file);
  },

  // Import Shifts from Excel with full validations
  importShifts(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet);
        
        const shifts = DB.getShifts();
        let importedCount = 0;
        let updatedCount = 0;
        const rejected = [];
        const seenCodes = new Set();

        rows.forEach((row, index) => {
          const rowNum = index + 2;

          // Map flexible columns
          const code = String(row['الرمز'] || row['shiftCode'] || row['code'] || '').trim();
          const name = String(row['اسم الوردية'] || row['shiftName'] || row['name'] || '').trim();
          const checkIn1 = String(row['الحضور 1'] || row['checkIn1'] || '').trim();
          const checkOut1 = String(row['الانصراف 1'] || row['checkOut1'] || '').trim();
          const checkIn2 = String(row['الحضور 2'] || row['checkIn2'] || '').trim();
          const checkOut2 = String(row['الانصراف 2'] || row['checkOut2'] || '').trim();
          const gracePeriodsRaw = row['فترة السماح (دقائق)'] || row['gracePeriods'] || '15';
          const workingHoursRaw = row['ساعات العمل'] || row['workingHours'] || '8';
          const status = String(row['الحالة'] || row['status'] || 'نشط').trim();

          // 1. Validate empty code
          if (!code) {
            rejected.push({ row: rowNum, item: 'بدون رمز', reason: 'رمز الوردية حقل إلزامي فارغ.' });
            return;
          }

          // 2. Validate empty name
          if (!name) {
            rejected.push({ row: rowNum, item: code, reason: 'اسم الوردية حقل إلزامي فارغ.' });
            return;
          }

          // 3. Check for duplicates in the current file
          if (seenCodes.has(code)) {
            rejected.push({ row: rowNum, item: code, reason: 'رمز الوردية مكرر داخل نفس ملف الإكسل.' });
            return;
          }
          seenCodes.add(code);

          // 4. Validate core times checkIn1 / checkOut1
          const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
          if (!checkIn1 || !timeRegex.test(checkIn1)) {
            rejected.push({ row: rowNum, item: code, reason: `وقت الحضور الأول "${checkIn1}" فارغ أو بتنسيق غير صالح (يجب أن يكون HH:MM).` });
            return;
          }
          if (!checkOut1 || !timeRegex.test(checkOut1)) {
            rejected.push({ row: rowNum, item: code, reason: `وقت الانصراف الأول "${checkOut1}" فارغ أو بتنسيق غير صالح (يجب أن يكون HH:MM).` });
            return;
          }

          // 5. Validate optional secondary times
          if (checkIn2 && !timeRegex.test(checkIn2)) {
            rejected.push({ row: rowNum, item: code, reason: `وقت الحضور الثاني "${checkIn2}" بتنسيق غير صالح.` });
            return;
          }
          if (checkOut2 && !timeRegex.test(checkOut2)) {
            rejected.push({ row: rowNum, item: code, reason: `وقت الانصراف الثاني "${checkOut2}" بتنسيق غير صالح.` });
            return;
          }

          const gracePeriods = parseInt(gracePeriodsRaw, 10) || 0;
          const workingHours = parseFloat(workingHoursRaw) || 8.0;

          const existingIdx = shifts.findIndex(s => s.code === code);
          const shiftData = {
            code,
            name,
            checkIn1,
            checkOut1,
            checkIn2,
            checkOut2,
            gracePeriods,
            workingHours,
            status: status === 'نشط' || status === 'غير نشط' ? status : 'نشط'
          };

          if (existingIdx >= 0) {
            shifts[existingIdx] = shiftData;
            updatedCount++;
          } else {
            shifts.push(shiftData);
            importedCount++;
          }
        });

        DB.saveShifts(shifts);
        callback(null, {
          importedCount,
          updatedCount,
          rejected
        });
      } catch (err) {
        callback(err.message || 'حدث خطأ أثناء قراءة ملف الوردية.');
      }
    };
    reader.onerror = function(err) {
      callback(err);
    };
    reader.readAsArrayBuffer(file);
  },

  // Import Leaves from Excel with full validations
  importLeaves(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet);
        
        const leaves = DB.getLeaves();
        const employees = DB.getEmployees();
        
        let importedCount = 0;
        let updatedCount = 0; // Not typically updated since leaves don't have unique natural IDs, but we tracks new creations.
        const rejected = [];

        rows.forEach((row, index) => {
          const rowNum = index + 2;

          const empNo = String(row['الرقم الوظيفي'] || row['empNo'] || '').trim();
          const leaveType = String(row['نوع الإجازة'] || row['leaveType'] || '').trim();
          const startDateRaw = String(row['تاريخ البداية'] || row['startDate'] || '').trim();
          const endDateRaw = String(row['تاريخ النهاية'] || row['endDate'] || '').trim();
          const notes = String(row['ملاحظات'] || row['notes'] || '').trim();

          // 1. Validate employee exists
          if (!empNo) {
            rejected.push({ row: rowNum, item: 'بدون رقم موظف', reason: 'الرقم الوظيفي حقل إلزامي فارغ.' });
            return;
          }
          const emp = employees.find(e => e.empNo === empNo);
          if (!emp) {
            rejected.push({ row: rowNum, item: empNo, reason: `الرقم الوظيفي "${empNo}" غير مسجل بقاعدة بيانات الموظفين.` });
            return;
          }

          // 2. Validate empty leaveType
          if (!leaveType) {
            rejected.push({ row: rowNum, item: empNo, reason: 'نوع الإجازة حقل إلزامي فارغ.' });
            return;
          }

          // 3. Validate valid date formats
          const start = new Date(startDateRaw);
          const end = new Date(endDateRaw);

          if (isNaN(start.getTime())) {
            rejected.push({ row: rowNum, item: empNo, reason: `تاريخ البداية "${startDateRaw}" بتنسيق غير صالح (توقع YYYY-MM-DD).` });
            return;
          }
          if (isNaN(end.getTime())) {
            rejected.push({ row: rowNum, item: empNo, reason: `تاريخ النهاية "${endDateRaw}" بتنسيق غير صالح (توقع YYYY-MM-DD).` });
            return;
          }

          // 4. Validate endDate >= startDate
          if (end < start) {
            rejected.push({ row: rowNum, item: empNo, reason: `تاريخ النهاية (${endDateRaw}) يسبق تاريخ البداية (${startDateRaw}).` });
            return;
          }

          // Calculate days
          const diffTime = Math.abs(end - start);
          const calculatedDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          const daysCount = parseInt(row['عدد الأيام'] || row['daysCount'] || calculatedDays, 10);

          const newLeave = {
            id: 'L-' + Date.now() + '-' + index,
            empNo,
            leaveType,
            startDate: startDateRaw,
            endDate: endDateRaw,
            daysCount,
            notes
          };

          leaves.push(newLeave);
          importedCount++;

          // Deduct from employee leave balance if annual leave
          if (leaveType === 'إجازة سنوية') {
            emp.leaveBalance = Math.max(0, emp.leaveBalance - daysCount);
          }
        });

        // Save everything
        DB.saveLeaves(leaves);
        DB.saveEmployees(employees);

        callback(null, {
          importedCount,
          updatedCount,
          rejected
        });
      } catch (err) {
        callback(err.message || 'حدث خطأ أثناء قراءة ملف الإجازات.');
      }
    };
    reader.onerror = function(err) {
      callback(err);
    };
    reader.readAsArrayBuffer(file);
  },

  // Parse Biometric clock punches Excel file and auto-cluster them daily
  importBiometricExcel(file, yearMonth, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet);

        // Helper date/time parsers
        function parseExcelDate(val) {
          if (!val) return null;
          val = String(val).trim();
          // 1. If it's a numeric serial from excel
          if (/^\d+(\.\d+)?$/.test(val)) {
            const num = parseFloat(val);
            const dateObj = XLSX.SSF.parse_date_code(num);
            const month = String(dateObj.m).padStart(2, '0');
            const day = String(dateObj.d).padStart(2, '0');
            return `${dateObj.y}-${month}-${day}`;
          }
          // 2. If it is a string like DD/MM/YYYY or D/M/YYYY
          const partsDMy = val.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
          if (partsDMy) {
            const day = partsDMy[1].padStart(2, '0');
            const month = partsDMy[2].padStart(2, '0');
            const year = partsDMy[3];
            return `${year}-${month}-${day}`;
          }
          // 3. If it is a string like YYYY-MM-DD
          const partsYMD = val.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
          if (partsYMD) {
            const year = partsYMD[1];
            const month = partsYMD[2].padStart(2, '0');
            const day = partsYMD[3].padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
          // 4. Try JS Date
          const parsed = new Date(val);
          if (!isNaN(parsed.getTime())) {
            const month = String(parsed.getMonth() + 1).padStart(2, '0');
            const day = String(parsed.getDate()).padStart(2, '0');
            return `${parsed.getFullYear()}-${month}-${day}`;
          }
          return null;
        }

        function parseExcelTime(val) {
          if (!val) return '';
          val = String(val).trim();
          // 1. If it's a fractional number from Excel (e.g., 0.3347)
          if (/^0\.\d+$/.test(val)) {
            const num = parseFloat(val);
            const totalSecs = Math.round(num * 24 * 3600);
            const hours = Math.floor(totalSecs / 3600);
            const minutes = Math.floor((totalSecs % 3600) / 60);
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
          }
          // 2. If it is format HH:MM or HH:MM:SS or H:M or H:M:S
          const parts = val.match(/^(\d{1,2}):(\d{1,2})/);
          if (parts) {
            return `${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
          }
          return '';
        }

        const rawRows = [];
        rows.forEach(row => {
          let empNo = '';
          let empName = '';
          let dateVal = '';
          let timeVal = '';

          // Support flexible column titles
          for (let k in row) {
            const kTrimmed = k.trim();
            if (kTrimmed === 'الرقم الوظيفي' || kTrimmed === 'jobNo' || kTrimmed === 'empNo' || kTrimmed === 'رقم الموظف') {
              empNo = String(row[k]).trim();
            } else if (kTrimmed === 'اسم الموظف' || kTrimmed === 'empName' || kTrimmed === 'الاسم' || kTrimmed === 'Name') {
              empName = String(row[k]).trim();
            } else if (kTrimmed === 'التاريخ' || kTrimmed === 'date' || kTrimmed === 'Date') {
              dateVal = row[k];
            } else if (kTrimmed === 'الوقت' || kTrimmed === 'time' || kTrimmed === 'Time') {
              timeVal = row[k];
            } else if (kTrimmed === 'التاريخ والوقت' || kTrimmed === 'datetime' || kTrimmed === 'timestamp') {
              const combinedStr = String(row[k]).trim();
              if (combinedStr.includes(' ')) {
                const parts = combinedStr.split(' ');
                dateVal = parts[0];
                timeVal = parts[1];
              } else {
                dateVal = combinedStr;
              }
            }
          }

          if (!empNo) return;

          // Split combined date / times if timeVal is missing but space is found in dateVal
          if (!timeVal && String(dateVal).includes(' ')) {
            const parts = String(dateVal).split(' ');
            dateVal = parts[0];
            timeVal = parts[1];
          }

          rawRows.push({
            empNo,
            empName,
            dateVal,
            timeVal
          });
        });

        if (rawRows.length === 0) {
          callback('الملف فارغ أو لا يحتوي على بنية البيانات المعمدة: "الرقم الوظيفي"، "اسم الموظف"، "التاريخ"، "الوقت"');
          return;
        }

        const employees = DB.getEmployees();
        const shifts = DB.getShifts();

        const unknownRows = [];
        const parsedPunches = [];

        rawRows.forEach(r => {
          const emp = employees.find(e => String(e.empNo).trim() === r.empNo);
          if (!emp) {
            const alreadyAdded = unknownRows.some(x => x.empNo === r.empNo);
            if (!alreadyAdded) {
              unknownRows.push({
                empNo: r.empNo,
                empName: r.empName || 'غير معروف'
              });
            }
            return;
          }

          const dateStr = parseExcelDate(r.dateVal);
          const timeStr = parseExcelTime(r.timeVal);

          if (dateStr && timeStr) {
            parsedPunches.push({
              empNo: r.empNo,
              empName: emp.name,
              date: dateStr,
              time: timeStr
            });
          }
        });

        // Group punches by empNo and Date
        const grouped = {};
        parsedPunches.forEach(p => {
          // Filter within current active month
          if (p.date.substring(0, 7) !== yearMonth) return;

          const groupKey = `${p.empNo}_${p.date}`;
          if (!grouped[groupKey]) {
            grouped[groupKey] = {
              empNo: p.empNo,
              empName: p.empName,
              date: p.date,
              times: []
            };
          }
          if (!grouped[groupKey].times.includes(p.time)) {
            grouped[groupKey].times.push(p.time);
          }
        });

        const attendance = DB.getAttendance(yearMonth);
        let updatedDaysCount = 0;
        const incompleteRows = [];
        const overflowRows = [];

        Object.keys(grouped).forEach(key => {
          const item = grouped[key];
          const empNo = item.empNo;
          const date = item.date;
          const emp = employees.find(e => e.empNo === empNo);
          if (!emp) return;

          const shift = shifts.find(s => s.code === emp.shiftCode);

          // Sort times ascending order
          const times = item.times.sort((a, b) => DB.timeToMinutes(a) - DB.timeToMinutes(b));

          let checkIn1 = '';
          let checkOut1 = '';
          let checkIn2 = '';
          let checkOut2 = '';
          let extraPunches = [];

          if (times.length > 0) checkIn1 = times[0];
          if (times.length > 1) checkOut1 = times[1];
          if (times.length > 2) checkIn2 = times[2];
          if (times.length > 3) checkOut2 = times[3];
          if (times.length > 4) {
            extraPunches = times.slice(4);
          }

          // Fetch or prepare daily attendance slot
          const originRecord = attendance[key] || {
            empNo,
            date,
            reason: '',
            isAbsent: false,
            isLeave: false
          };

          originRecord.checkIn1 = checkIn1;
          originRecord.checkOut1 = checkOut1;
          originRecord.checkIn2 = checkIn2;
          originRecord.checkOut2 = checkOut2;
          originRecord.extraPunches = extraPunches;

          if (times.length < 4) {
            incompleteRows.push({
              empNo,
              empName: item.empName,
              date,
              timesCount: times.length,
              times: times.join(', ')
            });
          }

          if (times.length > 4) {
            overflowRows.push({
              empNo,
              empName: item.empName,
              date,
              timesCount: times.length,
              times: times.join(', '),
              extraPunches: extraPunches.join(', ')
            });
          }

          if (shift) {
            DB.calculateAttendanceStats(originRecord, shift);
          }

          attendance[key] = originRecord;
          updatedDaysCount++;
        });

        DB.saveAttendance(yearMonth, attendance);
        
        callback(null, {
          updatedDaysCount,
          unknownRows,
          incompleteRows,
          overflowRows
        });
      } catch (err) {
        callback(err.message || 'حدث خطأ غير متوقع أثناء معالجة ملف الإكسل.');
      }
    };
    reader.onerror = function(err) {
      callback(err);
    };
    reader.readAsArrayBuffer(file);
  },

  // Show a beautiful, highly structured pop-up report with imported, updated, and rejected items
  showImportReport(report, title) {
    let reportHTML = `
      <div class="text-start direction-rtl font-sans p-2" style="direction:rtl; text-align:right;">
        <div class="row g-2 mb-3 text-center">
          <div class="col-6">
            <div class="bg-success-subtle text-success p-2 rounded border border-success-subtle">
              <span class="small d-block text-muted" style="font-size:0.75rem">سجلات جديدة (تم الإضافة)</span>
              <strong class="fs-5">${report.importedCount}</strong>
            </div>
          </div>
          <div class="col-6">
            <div class="bg-primary-subtle text-primary p-2 rounded border border-primary-subtle">
              <span class="small d-block text-muted" style="font-size:0.75rem">سجلات مسبقة (تم التحديث)</span>
              <strong class="fs-5">${report.updatedCount}</strong>
            </div>
          </div>
        </div>
    `;

    if (report.rejected && report.rejected.length > 0) {
      reportHTML += `
        <div class="alert alert-danger p-2 mb-3" style="font-size: 0.78rem;">
          <i class="bi bi-exclamation-triangle-fill me-1"></i>
          تنبيه: تم رفض واستبعاد عدد <strong>(${report.rejected.length})</strong> سجل لعدم مطابقتها للشروط.
        </div>
        <div class="table-responsive" style="max-height: 200px; overflow-y: auto;">
          <table class="table table-sm table-striped table-bordered mb-0" style="font-size: 0.72rem;">
            <thead class="table-dark sticky-top">
              <tr>
                <th class="py-1">السطر</th>
                <th class="py-1">المعرف / المفتاح</th>
                <th class="py-1">سبب الرفض والحل المقترح</th>
              </tr>
            </thead>
            <tbody>
              ${report.rejected.map(rej => `
                <tr>
                  <td class="text-center fw-bold">${rej.row}</td>
                  <td class="text-center font-mono">${rej.item}</td>
                  <td class="text-danger">${rej.reason}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      reportHTML += `
        <div class="alert alert-success p-2 mb-0 text-center" style="font-size: 0.82rem;">
          <i class="bi bi-check-circle-fill me-1 text-success"></i>
          تم استيراد وتحديث كافة السجلات بنجاح دون أي استبعاد أو أخطاء!
        </div>
      `;
    }

    reportHTML += `</div>`;

    Swal.fire({
      title: title || 'تقرير نتائج عملية الاستيراد 📑',
      html: reportHTML,
      width: '600px',
      confirmButtonText: 'موافق، تم الاطلاع',
      confirmButtonColor: '#4f46e5'
    });
  }
};

window.ImportExport = {
  exportToExcel: ImportExport.exportToExcel,
  exportTableToExcel: ImportExport.exportTableToExcel,
  importEmployees: ImportExport.importEmployees,
  importShifts: ImportExport.importShifts,
  importLeaves: ImportExport.importLeaves,
  importBiometricExcel: ImportExport.importBiometricExcel,
  showImportReport: ImportExport.showImportReport
};
