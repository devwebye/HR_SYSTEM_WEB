/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import AdmZip from 'adm-zip';

// We make sure public directory exists
const publicDir = path.resolve('./public');
const testDataDir = path.resolve('./public/test_data');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
if (!fs.existsSync(testDataDir)) {
  fs.mkdirSync(testDataDir, { recursive: true });
}

// ----------------------------------------------------
// 1. SHIFTS DATA
// ----------------------------------------------------
const shiftsData = [
  {
    'كود الوردية': 'SH-01',
    'اسم الوردية': 'الوردية الصباحية',
    'دخول1': '08:00',
    'خروج1': '13:00',
    'دخول2': '15:00',
    'خروج2': '18:00',
    'السماحية': 15,
    'ساعات العمل': 8,
    'الحالة': 'نشط'
  },
  {
    'كود الوردية': 'SH-02',
    'اسم الوردية': 'الوردية الإدارية',
    'دخول1': '08:30',
    'خروج1': '16:30',
    'دخول2': '',
    'خروج2': '',
    'السماحية': 15,
    'ساعات العمل': 8,
    'الحالة': 'نشط'
  },
  {
    'كود الوردية': 'SH-03',
    'اسم الوردية': 'الوردية المسائية',
    'دخول1': '14:00',
    'خروج1': '22:00',
    'دخول2': '',
    'خروج2': '',
    'السماحية': 15,
    'ساعات العمل': 8,
    'الحالة': 'نشط'
  }
];

// Write Shifts Excel
const wbShifts = XLSX.utils.book_new();
const wsShifts = XLSX.utils.json_to_sheet(shiftsData);
XLSX.utils.book_append_sheet(wbShifts, wsShifts, 'الورديات');
XLSX.writeFile(wbShifts, path.join(testDataDir, 'Shifts.xlsx'));
XLSX.writeFile(wbShifts, path.join(publicDir, 'Shifts.xlsx'));

// ----------------------------------------------------
// 2. EMPLOYEES DATA
// ----------------------------------------------------
const employeesData = [
  { 'الرقم الوظيفي': 'EMP2001', 'اسم الموظف': 'أحمد علي المشرقي', 'القسم': 'الإدارة', 'المسمى الوظيفي': 'مدير', 'الوردية': 'SH-02', 'الراتب الأساسي': 500000, 'رصيد الإجازات': 30, 'الحالة': 'نشط' },
  { 'الرقم الوظيفي': 'EMP2002', 'اسم الموظف': 'محمد حسن الشرفي', 'القسم': 'الموارد البشرية', 'المسمى الوظيفي': 'مدير', 'الوردية': 'SH-02', 'الراتب الأساسي': 350000, 'رصيد الإجازات': 25, 'الحالة': 'نشط' },
  { 'الرقم الوظيفي': 'EMP2003', 'اسم الموظف': 'فاطمة خالد القدسي', 'القسم': 'المالية', 'المسمى الوظيفي': 'مدير', 'الوردية': 'SH-02', 'الراتب الأساسي': 400000, 'رصيد الإجازات': 28, 'الحالة': 'نشط' },
  { 'الرقم الوظيفي': 'EMP2004', 'اسم الموظف': 'عمر يحيى باوزير', 'القسم': 'الحسابات', 'المسمى الوظيفي': 'محاسب', 'الوردية': 'SH-02', 'الراتب الأساسي': 220000, 'رصيد الإجازات': 21, 'الحالة': 'نشط' },
  { 'الرقم الوظيفي': 'EMP2005', 'اسم الموظف': 'أروى طه الحمادي', 'القسم': 'الموارد البشرية', 'المسمى الوظيفي': 'أخصائي موارد بشرية', 'الوردية': 'SH-02', 'الراتب الأساسي': 180000, 'رصيد الإجازات': 24, 'الحالة': 'نشط' },
  { 'الرقم الوظيفي': 'EMP2006', 'اسم الموظف': 'صالح عبده الريمي', 'القسم': 'المشتريات', 'المسمى الوظيفي': 'مشرف', 'الوردية': 'SH-01', 'الراتب الأساسي': 250000, 'رصيد الإجازات': 22, 'الحالة': 'نشط' },
  { 'الرقم الوظيفي': 'EMP2007', 'اسم الموظف': 'منال عادل الحيمي', 'القسم': 'خدمة العملاء', 'المسمى الوظيفي': 'مشرف', 'الوردية': 'SH-03', 'الراتب الأساسي': 220000, 'رصيد الإجازات': 20, 'الحالة': 'نشط' },
  { 'الرقم الوظيفي': 'EMP2008', 'اسم الموظف': 'ياسر أحمد السامعي', 'القسم': 'تقنية المعلومات', 'المسمى الوظيفي': 'مشرف', 'الوردية': 'SH-02', 'الراتب الأساسي': 300000, 'رصيد الإجازات': 26, 'الحالة': 'نشط' },
  { 'الرقم الوظيفي': 'EMP2009', 'اسم الموظف': 'رانيا عبد الله العبسي', 'القسم': 'تقنية المعلومات', 'المسمى الوظيفي': 'فني دعم', 'الوردية': 'SH-02', 'الراتب الأساسي': 150000, 'رصيد الإجازات': 21, 'الحالة': 'نشط' },
  { 'الرقم الوظيفي': 'EMP2010', 'اسم الموظف': 'مروان فؤاد الحكيمي', 'القسم': 'المخازن', 'المسمى الوظيفي': 'أمين مخزن', 'الوردية': 'SH-01', 'الراتب الأساسي': 150000, 'رصيد الإجازات': 18, 'الحالة': 'نشط' },
  { 'الرقم الوظيفي': 'EMP2011', 'اسم الموظف': 'سمير طارق السقاف', 'القسم': 'الحسابات', 'المسمى الوظيفي': 'محاسب', 'الوردية': 'SH-02', 'الراتب الأساسي': 180000, 'رصيد الإجازات': 21, 'الحالة': 'نشط' },
  { 'الرقم الوظيفي': 'EMP2012', 'اسم الموظف': 'نادية عبد الرؤوف المقالح', 'القسم': 'خدمة العملاء', 'المسمى الوظيفي': 'موظف خدمة عملاء', 'الوردية': 'SH-03', 'الراتب الأساسي': 120000, 'رصيد الإجازات': 21, 'الحالة': 'نشط' },
  { 'الرقم الوظيفي': 'EMP2013', 'اسم الموظف': 'خالد وليد الأصبحي', 'القسم': 'المخازن', 'المسمى الوظيفي': 'موظف إدخال بيانات', 'الوردية': 'SH-01', 'الراتب الأساسي': 120000, 'رصيد الإجازات': 15, 'الحالة': 'نشط' },
  { 'الرقم الوظيفي': 'EMP2014', 'اسم الموظف': 'سلوى سيف العريقي', 'القسم': 'الإدارة', 'المسمى الوظيفي': 'سكرتير', 'الوردية': 'SH-02', 'الراتب الأساسي': 150000, 'رصيد الإجازات': 20, 'الحالة': 'نشط' },
  { 'الرقم الوظيفي': 'EMP2015', 'اسم الموظف': 'توفيق جميل المحيا', 'القسم': 'المشتريات', 'المسمى الوظيفي': 'موظف إدخال بيانات', 'الوردية': 'SH-01', 'الراتب الأساسي': 120000, 'رصيد الإجازات': 19, 'الحالة': 'نشط' },
  { 'الرقم الوظيفي': 'EMP2016', 'اسم الموظف': 'إيمان نجيب الحبيشي', 'القسم': 'الموارد البشرية', 'المسمى الوظيفي': 'موظف إدخال بيانات', 'الوردية': 'SH-02', 'الراتب الأساسي': 120000, 'رصيد الإجازات': 22, 'الحالة': 'نشط' },
  { 'الرقم الوظيفي': 'EMP2017', 'اسم الموظف': 'هاني مطهر الوشلي', 'القسم': 'خدمة العملاء', 'المسمى الوظيفي': 'موظف خدمة عملاء', 'الوردية': 'SH-03', 'الراتب الأساسي': 120000, 'رصيد الإجازات': 21, 'الحالة': 'نشط' },
  { 'الرقم الوظيفي': 'EMP2018', 'اسم الموظف': 'بلقيس منصور الوجيه', 'القسم': 'المالية', 'المسمى الوظيفي': 'محاسب', 'الوردية': 'SH-02', 'الراتب الأساسي': 180000, 'رصيد الإجازات': 25, 'الحالة': 'نشط' },
  { 'الرقم الوظيفي': 'EMP2019', 'اسم الموظف': 'نبيل مسعد الحرازي', 'القسم': 'المخازن', 'المسمى الوظيفي': 'أمين مخزن', 'الوردية': 'SH-01', 'الراتب الأساسي': 150000, 'رصيد الإجازات': 17, 'الحالة': 'نشط' },
  { 'الرقم الوظيفي': 'EMP2020', 'اسم الموظف': 'تهاني يوسف عبد المغني', 'القسم': 'خدمة العملاء', 'المسمى الوظيفي': 'موظف خدمة عملاء', 'الوردية': 'SH-03', 'الراتب الأساسي': 120000, 'رصيد الإجازات': 22, 'الحالة': 'موقوف' }
];

// Write Employees Excel
const wbEmployees = XLSX.utils.book_new();
const wsEmployees = XLSX.utils.json_to_sheet(employeesData);
XLSX.utils.book_append_sheet(wbEmployees, wsEmployees, 'الموظفين');
XLSX.writeFile(wbEmployees, path.join(testDataDir, 'Employees.xlsx'));
XLSX.writeFile(wbEmployees, path.join(publicDir, 'Employees.xlsx'));

// ----------------------------------------------------
// 3. LEAVES DATA
// ----------------------------------------------------
const leavesData = [
  {
    'الرقم الوظيفي': 'EMP2004',
    'نوع الإجازة': 'إجازة سنوية',
    'تاريخ البداية': '2026-06-14',
    'تاريخ النهاية': '2026-06-16',
    'عدد الأيام': 3,
    'ملاحظات': 'عطلة عائلية طارئة معتمدة'
  },
  {
    'الرقم الوظيفي': 'EMP2009',
    'نوع الإجازة': 'إجازة مرضية',
    'تاريخ البداية': '2026-06-07',
    'تاريخ النهاية': '2026-06-08',
    'عدد الأيام': 2,
    'ملاحظات': 'وعكة صحية حادة وتقرير طبي مرافق'
  },
  {
    'الرقم الوظيفي': 'EMP2015',
    'نوع الإجازة': 'إجازة سنوية',
    'تاريخ البداية': '2026-06-21',
    'تاريخ النهاية': '2026-06-25',
    'عدد الأيام': 5,
    'ملاحظات': 'طلب إجازة سنوية اعتيادية'
  }
];

// Write Leaves Excel
const wbLeaves = XLSX.utils.book_new();
const wsLeaves = XLSX.utils.json_to_sheet(leavesData);
XLSX.utils.book_append_sheet(wbLeaves, wsLeaves, 'الإجازات');
XLSX.writeFile(wbLeaves, path.join(testDataDir, 'Leaves.xlsx'));
XLSX.writeFile(wbLeaves, path.join(publicDir, 'Leaves.xlsx'));

// ----------------------------------------------------
// 4. ATTENDANCE (BIOMETRIC PUNCHES) DATA
// ----------------------------------------------------
const attendancePunches = [];

// Helper to check if a date is weekend (Friday=5, Saturday=6)
function isWeekend(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  return day === 5 || day === 6; // Friday and Saturday
}

// Helper to check if employee is on leave on a certain date
function isOnLeave(empNo, dateStr) {
  const d = new Date(dateStr).getTime();
  for (const leave of leavesData) {
    if (leave['الرقم الوظيفي'] === empNo) {
      const start = new Date(leave['تاريخ البداية']).getTime();
      const end = new Date(leave['تاريخ النهاية']).getTime();
      if (d >= start && d <= end) {
        return true;
      }
    }
  }
  return false;
}

// Generate month-long records (June 1st to June 30th, 2026)
for (let day = 1; day <= 30; day++) {
  const dayString = String(day).padStart(2, '0');
  const dateStr = `2026-06-${dayString}`;
  
  // Skip weekends to make it realistic (no punches on weekends)
  if (isWeekend(dateStr)) continue;

  employeesData.forEach(emp => {
    const empNo = emp['الرقم الوظيفي'];
    const shiftCode = emp['الوردية'];
    const empStatus = emp['الحالة'];

    // 1. Skip suspended employees (e.g. EMP2020)
    if (empStatus !== 'نشط') return;

    // 2. Skip days where employee is on leave
    if (isOnLeave(empNo, dateStr)) return;

    // 3. Complete absence scenarios
    // EMP2012 has full unexcused absence on June 9th and 10th
    if (empNo === 'EMP2012' && (day === 9 || day === 10)) {
      return; // No punches
    }
    // EMP2018 has full unexcused absence on June 16th
    if (empNo === 'EMP2018' && day === 16) {
      return; // No punches
    }

    // 4. Incomplete & Overflow punch scenarios
    const dateParts = dateStr.split('-');
    const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
    const empName = emp['اسم الموظف'];

    // EMP2006 (double shift: SH-01) forgets afternoon check-in & check-out on June 8th (2 punches total)
    if (empNo === 'EMP2006' && day === 8) {
      attendancePunches.push({ 'الرقم الوظيفي': empNo, 'اسم الموظف': empName, 'التاريخ': formattedDate, 'الوقت': '07:58' });
      attendancePunches.push({ 'الرقم الوظيفي': empNo, 'اسم الموظف': empName, 'التاريخ': formattedDate, 'الوقت': '13:01' });
      return;
    }
    // EMP2010 (double shift: SH-01) misses first check-out (13:00) on June 15th (3 punches total)
    if (empNo === 'EMP2010' && day === 15) {
      attendancePunches.push({ 'الرقم الوظيفي': empNo, 'اسم الموظف': empName, 'التاريخ': formattedDate, 'الوقت': '08:02' });
      attendancePunches.push({ 'الرقم الوظيفي': empNo, 'اسم الموظف': empName, 'التاريخ': formattedDate, 'الوقت': '14:55' });
      attendancePunches.push({ 'الرقم الوظيفي': empNo, 'اسم الموظف': empName, 'التاريخ': formattedDate, 'الوقت': '18:01' });
      return;
    }
    // EMP2001 (single shift: SH-02) logs 5 punches on June 15th (overflow test)
    if (empNo === 'EMP2001' && day === 15) {
      attendancePunches.push({ 'الرقم الوظيفي': empNo, 'اسم الموظف': empName, 'التاريخ': formattedDate, 'الوقت': '08:26' });
      attendancePunches.push({ 'الرقم الوظيفي': empNo, 'اسم الموظف': empName, 'التاريخ': formattedDate, 'الوقت': '11:58' });
      attendancePunches.push({ 'الرقم الوظيفي': empNo, 'اسم الموظف': empName, 'التاريخ': formattedDate, 'الوقت': '12:55' });
      attendancePunches.push({ 'الرقم الوظيفي': empNo, 'اسم الموظف': empName, 'التاريخ': formattedDate, 'الوقت': '15:10' });
      attendancePunches.push({ 'الرقم الوظيفي': empNo, 'اسم الموظف': empName, 'التاريخ': formattedDate, 'الوقت': '16:32' });
      return;
    }

    // 5. Normal day punches with variances (Tardiness and Early Departure)
    let in1 = '';
    let out1 = '';
    let in2 = '';
    let out2 = '';

    if (shiftCode === 'SH-01') {
      // الوردية الصباحية: 08:00 - 13:00 and 15:00 - 18:00 (Double shift)
      // Normal variation:
      in1 = '07:57';
      out1 = '13:02';
      in2 = '14:58';
      out2 = '18:03';

      // Specific variance examples
      if (day === 3 && empNo === 'EMP2013') {
        // Late arrival at 08:24
        in1 = '08:24';
      }
      if (day === 11 && empNo === 'EMP2019') {
        // Early departure at 17:15
        out2 = '17:15';
      }

    } else if (shiftCode === 'SH-02') {
      // الوردية الإدارية: 08:30 - 16:30 (Single shift)
      in1 = '08:26';
      out1 = '16:32';

      // Specific variance examples
      if (day === 1 && empNo === 'EMP2002') {
        // Late arrival at 08:48 (18 minutes late)
        in1 = '08:48';
      }
      if (day === 2 && empNo === 'EMP2005') {
        // Late arrival at 09:15 (45 minutes late)
        in1 = '09:15';
      }
      if (day === 3 && empNo === 'EMP2008') {
        // Early departure at 15:45 (45 minutes early)
        out1 = '15:45';
      }
      if (day === 4 && empNo === 'EMP2011') {
        // Large delay: arrival at 10:10 (100 minutes late)
        in1 = '10:10';
      }
      if (day === 4 && empNo === 'EMP2014') {
        // Early departure at 16:10 (20 minutes early)
        out1 = '16:10';
      }

    } else if (shiftCode === 'SH-03') {
      // الوردية المسائية: 14:00 - 22:00 (Single shift)
      in1 = '13:58';
      out1 = '22:03';

      // Specific variance examples
      if (day === 5 && empNo === 'EMP2007') {
        // Late arrival at 14:35
        in1 = '14:35';
      }
      if (day === 12 && empNo === 'EMP2012') {
        // Early departure at 21:15
        out1 = '21:15';
      }
    }

    // Push records
    if (in1) attendancePunches.push({ 'الرقم الوظيفي': empNo, 'اسم الموظف': empName, 'التاريخ': formattedDate, 'الوقت': in1 });
    if (out1) attendancePunches.push({ 'الرقم الوظيفي': empNo, 'اسم الموظف': empName, 'التاريخ': formattedDate, 'الوقت': out1 });
    if (in2) attendancePunches.push({ 'الرقم الوظيفي': empNo, 'اسم الموظف': empName, 'التاريخ': formattedDate, 'الوقت': in2 });
    if (out2) attendancePunches.push({ 'الرقم الوظيفي': empNo, 'اسم الموظف': empName, 'التاريخ': formattedDate, 'الوقت': out2 });
  });
}

// Write Attendance Excel
const wbAttendance = XLSX.utils.book_new();
const wsAttendance = XLSX.utils.json_to_sheet(attendancePunches);
XLSX.utils.book_append_sheet(wbAttendance, wsAttendance, 'البصمات الخام');
XLSX.writeFile(wbAttendance, path.join(testDataDir, 'Attendance.xlsx'));
XLSX.writeFile(wbAttendance, path.join(publicDir, 'Attendance.xlsx'));

// ----------------------------------------------------
// 5. ZIP FILE CREATION
// ----------------------------------------------------
const zip = new AdmZip();
zip.addLocalFile(path.join(testDataDir, 'Employees.xlsx'));
zip.addLocalFile(path.join(testDataDir, 'Shifts.xlsx'));
zip.addLocalFile(path.join(testDataDir, 'Attendance.xlsx'));
zip.addLocalFile(path.join(testDataDir, 'Leaves.xlsx'));
zip.writeZip(path.join(testDataDir, 'TestData.zip'));
zip.writeZip(path.join(publicDir, 'TestData.zip'));

// Also copy everything to the root directory for standard root access
const rootDir = path.resolve('.');
fs.copyFileSync(path.join(publicDir, 'Employees.xlsx'), path.join(rootDir, 'Employees.xlsx'));
fs.copyFileSync(path.join(publicDir, 'Shifts.xlsx'), path.join(rootDir, 'Shifts.xlsx'));
fs.copyFileSync(path.join(publicDir, 'Attendance.xlsx'), path.join(rootDir, 'Attendance.xlsx'));
fs.copyFileSync(path.join(publicDir, 'Leaves.xlsx'), path.join(rootDir, 'Leaves.xlsx'));
fs.copyFileSync(path.join(publicDir, 'TestData.zip'), path.join(rootDir, 'TestData.zip'));

console.log('Successfully completed generating and packaging all Excel test spreadsheets, and copied them to the root workspace!');
