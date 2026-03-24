const SHEET_HEADERS = {
  registrations: ['id', 'name', 'phone', 'email', 'course_type', 'note', 'created_at'],
  users: ['id', 'name', 'email', 'password_hash', 'role', 'course_type', 'created_at'],
  exams: ['id', 'title', 'pass_score', 'total_questions', 'duration_minutes', 'active'],
  questions: ['id', 'exam_id', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'is_critical', 'explanation'],
  exam_results: ['id', 'user_id', 'exam_id', 'attempt_no', 'score', 'passed', 'failed_due_critical', 'submitted_at', 'answers_json'],
  visits: ['id', 'ip', 'page', 'lang', 'visited_at']
};

const SEED_ROWS = {
  registrations: [
    ['reg_001', 'Nguyen Thi Lan', '0901234567', 'lan@example.com', 'B2', 'Muon hoc cuoi tuan', '2026-03-24T08:30:00.000Z'],
    ['reg_002', 'Tran Quoc Huy', '0913456789', 'huy@example.com', 'A1', 'Can tu van hoc phi', '2026-03-24T10:15:00.000Z']
  ],
  users: [
    ['admin_001', 'System Admin', 'admin@drivingschool.vn', '102910389baad6d441492a93ccf5857e:f4ab0f9193f158840b89c7c637ae9109601486cf6b3601b5fe0cac0946d31eb7427d227e176eb7ef63b258114e0c549cbdb4a662e367df16a84eebf6c07d437c', 'admin', '', '2026-03-24T07:00:00.000Z'],
    ['student_001', 'Nguyen Minh Anh', 'student@drivingschool.vn', 'e74a46decb5ccdade128152d9931f832:ea82eb5b257467872d3a1bc256f5b26e29f098cb36af2623cfc94c5b91095a87cb8bbc840c8a18b1c67b3126513917dc5b18944debb34f82d2229679c1146d80', 'student', 'B2', '2026-03-24T07:15:00.000Z']
  ],
  exams: [
    ['exam_b2_001', 'De thi B2 mo phong so 01', '26', '30', '20', 'true'],
    ['exam_a1_001', 'De thi A1 co ban', '21', '25', '18', 'true']
  ],
  questions: [
    ['question_001', 'exam_b2_001', 'Den do, nguoi lai xe phai lam gi?', 'Tang toc nhanh de vuot', 'Dung lai truoc vach', 'Bam coi lien tuc', 'Re phai neu duong vang', 'B', 'true', 'Khi gap den do, nguoi lai xe phai dung lai truoc vach dung de bao dam an toan va dung luat.'],
    ['question_002', 'exam_b2_001', 'Khi chuyen lan can thuc hien thao tac nao?', 'Chi can nhin guong chieu hau', 'Bat xi nhan va quan sat diem mu', 'Tang toc roi tat dau', 'Khong can quan sat', 'B', 'false', 'Bat xi nhan va quan sat diem mu giup tai xe chuyen lan an toan hon va tranh va cham.'],
    ['question_003', 'exam_a1_001', 'Nguoi dieu khien xe may can mang theo gi?', 'Chi can CCCD', 'Chi can dang ky xe', 'GPLX va giay to lien quan', 'Khong can giay to', 'C', 'false', 'Nguoi lai xe can mang day du giay phep lai xe va giay to lien quan de xuat trinh khi can.']
  ],
  exam_results: [
    ['result_001', 'student_001', 'exam_b2_001', '1', '27', 'true', 'false', '2026-03-24T12:30:00.000Z', '{"question_001":"B","question_002":"B"}']
  ],
  visits: [
    ['visit_001', '127.0.0.1', '/index.html', 'vi', '2026-03-24T07:20:00.000Z'],
    ['visit_002', '127.0.0.1', '/login.html', 'en', '2026-03-24T07:25:00.000Z']
  ]
};

function setupDrivingSchoolSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SHEET_HEADERS).forEach((sheetName) => {
    const headers = SHEET_HEADERS[sheetName];
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    sheet.clearContents();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  });
}

function seedDrivingSchoolDemoData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setupDrivingSchoolSheets();

  Object.keys(SEED_ROWS).forEach((sheetName) => {
    const rows = SEED_ROWS[sheetName];
    if (!rows.length) return;
    const sheet = ss.getSheetByName(sheetName);
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  });
}
