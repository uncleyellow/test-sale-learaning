const SHEET_HEADERS = {
  registrations: ['id', 'name', 'phone', 'email', 'course_type', 'note', 'created_at'],
  users: ['id', 'name', 'email', 'password_hash', 'role', 'course_type', 'created_at'],
  exams: ['id', 'title', 'pass_score', 'total_questions', 'duration_minutes', 'active'],
  questions: ['id', 'exam_id', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'is_critical', 'explanation'],
  lessons: ['id', 'course_type', 'title', 'description', 'order_no', 'video_url', 'pass_score', 'active'],
  lesson_questions: ['id', 'lesson_id', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer', 'explanation'],
  lesson_watches: ['id', 'user_id', 'lesson_id', 'watched_at'],
  lesson_attempts: ['id', 'user_id', 'lesson_id', 'attempt_no', 'score', 'total', 'pass_score', 'passed', 'submitted_at', 'answers_json', 'details_json'],
  simulation_exams: ['id', 'course_type', 'title', 'description', 'pass_score', 'total_clips', 'active'],
  simulation_clips: ['id', 'exam_id', 'title', 'video_url', 'order_no', 'trigger_start_sec', 'trigger_end_sec', 'active'],
  simulation_attempts: ['id', 'user_id', 'exam_id', 'attempt_no', 'score', 'passed', 'submitted_at', 'answers_json', 'details_json'],
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
  lessons: [
    ['lesson_b2_001', 'B2', 'Bai 1: Sa hinh co ban', 'Lam quen thao tac sa hinh co ban.', '1', '/assets/videos/b2-lesson-01.mp4', '2', 'true'],
    ['lesson_b2_002', 'B2', 'Bai 2: Xu ly duong truong', 'Quan sat bien bao va giu khoang cach.', '2', '/assets/videos/b2-lesson-02.mp4', '2', 'true'],
    ['lesson_b2_003', 'B2', 'Bai 3: Tinh huong nguy hiem', 'Mo phong xu ly tinh huong nguy hiem.', '3', '/assets/videos/b2-lesson-03.mp4', '2', 'true']
  ],
  lesson_questions: [
    ['lesson_q_001', 'lesson_b2_001', 'Truoc khi de-pa trong bai sa hinh, ban can?', 'Nhan ga manh', 'Kiem tra guong, day an toan va quan sat', 'Tat den xe', 'Bam coi', 'B', 'Kiem tra guong va day an toan la bat buoc.'],
    ['lesson_q_002', 'lesson_b2_001', 'Loi pho bien trong bai ghep doc la?', 'Danh lai sai thoi diem', 'Di so 1', 'Nhin guong', 'Di cham', 'A', 'Danh lai sai thoi diem de cham vach va truot bai.'],
    ['lesson_q_003', 'lesson_b2_002', 'Gap xe phanh gap phia truoc, ban nen?', 'Nhan ga', 'Phanh giam toc va giu khoang cach', 'Re gap', 'Tat den', 'B', 'Phanh co kiem soat va giu khoang cach giup tranh va cham.']
  ],
  lesson_watches: [],
  lesson_attempts: [],
  simulation_exams: [
    ['sim_b2_001', 'B2', 'De thi mo phong B2 - Co ban', 'Mo phong tinh huong giao thong, bam Space dung thoi diem.', '9', '3', 'true']
  ],
  simulation_clips: [
    ['sim_clip_001', 'sim_b2_001', 'Tinh huong 1: Xe cat ngang', '/assets/videos/sim-b2-01.mp4', '1', '3.5', '5.2', 'true'],
    ['sim_clip_002', 'sim_b2_001', 'Tinh huong 2: Nguoi di bo bang qua', '/assets/videos/sim-b2-02.mp4', '2', '4.2', '6.0', 'true'],
    ['sim_clip_003', 'sim_b2_001', 'Tinh huong 3: Xe truoc phanh gap', '/assets/videos/sim-b2-03.mp4', '3', '2.8', '4.0', 'true']
  ],
  simulation_attempts: [],
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
