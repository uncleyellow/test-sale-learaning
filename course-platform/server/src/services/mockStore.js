const { createId, nowIso } = require("../utils/helpers");
const { hashPassword } = require("./authService");

const mockStore = {
  registrations: [],
  users: [
    {
      id: "admin_001",
      name: "System Admin",
      email: "admin@drivingschool.vn",
      password_hash: hashPassword("Admin@123"),
      role: "admin",
      course_type: "",
      created_at: nowIso()
    },
    {
      id: "student_001",
      name: "Nguyen Minh Anh",
      email: "student@drivingschool.vn",
      password_hash: hashPassword("Student@123"),
      role: "student",
      course_type: "B2",
      created_at: nowIso()
    }
  ],
  exams: [
    {
      id: "exam_b2_001",
      title: "B2 Mock Test 01",
      pass_score: 3,
      total_questions: 4,
      duration_minutes: 20,
      active: true
    }
  ],
  lessons: [
    {
      id: "lesson_b2_001",
      course_type: "B2",
      title: "Bai 1: Sa hinh co ban",
      description: "Lam quen voi thao tac sa hinh, dung dung vi tri va can chuan toc do.",
      order_no: 1,
      video_url: "/assets/videos/b2-lesson-01.mp4",
      pass_score: 2,
      active: true
    },
    {
      id: "lesson_b2_002",
      course_type: "B2",
      title: "Bai 2: Xu ly duong truong",
      description: "Quan sat bien bao, giu khoang cach va thao tac vuot an toan.",
      order_no: 2,
      video_url: "/assets/videos/b2-lesson-02.mp4",
      pass_score: 2,
      active: true
    },
    {
      id: "lesson_b2_003",
      course_type: "B2",
      title: "Bai 3: Tinh huong nguy hiem",
      description: "Mo phong cac tinh huong khan cap va cach xu ly de tranh tai nan.",
      order_no: 3,
      video_url: "/assets/videos/b2-lesson-03.mp4",
      pass_score: 2,
      active: true
    }
  ],
  simulation_exams: [
    {
      id: "sim_b2_001",
      course_type: "B2",
      title: "De thi mo phong B2 - Co ban",
      description: "Mo phong tinh huong giao thong, nhan Space dung thoi diem nguy hiem.",
      pass_score: 9,
      total_clips: 3,
      active: true
    }
  ],
  simulation_clips: [
    {
      id: createId("sim_clip"),
      exam_id: "sim_b2_001",
      title: "Tinh huong 1: Xe cat ngang",
      video_url: "/assets/videos/sim-b2-01.mp4",
      order_no: 1,
      trigger_start_sec: 3.5,
      trigger_end_sec: 5.2,
      active: true
    },
    {
      id: createId("sim_clip"),
      exam_id: "sim_b2_001",
      title: "Tinh huong 2: Nguoi di bo bang qua",
      video_url: "/assets/videos/sim-b2-02.mp4",
      order_no: 2,
      trigger_start_sec: 4.2,
      trigger_end_sec: 6.0,
      active: true
    },
    {
      id: createId("sim_clip"),
      exam_id: "sim_b2_001",
      title: "Tinh huong 3: Xe truoc phanh gap",
      video_url: "/assets/videos/sim-b2-03.mp4",
      order_no: 3,
      trigger_start_sec: 2.8,
      trigger_end_sec: 4.0,
      active: true
    }
  ],
  simulation_attempts: [],
  lesson_questions: [
    {
      id: createId("lesson_q"),
      lesson_id: "lesson_b2_001",
      question: "Truoc khi de-pa trong bai sa hinh, ban can uu tien thao tac nao?",
      option_a: "Nhan ga manh",
      option_b: "Kiem tra guong, that day an toan va quan sat",
      option_c: "Tat den xe",
      option_d: "Bam coi lien tuc",
      correct_answer: "B",
      explanation: "Kiem tra guong va day an toan la bat buoc truoc khi khoi hanh."
    },
    {
      id: createId("lesson_q"),
      lesson_id: "lesson_b2_001",
      question: "Loi pho bien trong bai ghep doc la gi?",
      option_a: "Danh lai sai thoi diem",
      option_b: "Di so 1",
      option_c: "Nhin guong",
      option_d: "Di cham",
      correct_answer: "A",
      explanation: "Danh lai qua som hoac qua muon de cham vach va truot bai."
    },
    {
      id: createId("lesson_q"),
      lesson_id: "lesson_b2_002",
      question: "Gap xe phanh gap phia truoc, ban nen lam gi?",
      option_a: "Nhan ga",
      option_b: "Phanh giam toc va giu khoang cach",
      option_c: "Re gap",
      option_d: "Tat den",
      correct_answer: "B",
      explanation: "Phanh co kiem soat va giu khoang cach giup tranh va cham."
    },
    {
      id: createId("lesson_q"),
      lesson_id: "lesson_b2_002",
      question: "Khi troi mua lon, dieu chinh dung la?",
      option_a: "Tang toc",
      option_b: "Bat den, giam toc va tang khoang cach",
      option_c: "Tat den",
      option_d: "Chi dung ga",
      correct_answer: "B",
      explanation: "Tam nhin giam va duong truot nen can giam toc, giu khoang cach."
    },
    {
      id: createId("lesson_q"),
      lesson_id: "lesson_b2_003",
      question: "Xe may cat ngang dot ngot truoc dau xe, xu ly dung la?",
      option_a: "Danh lai gap",
      option_b: "Phanh co kiem soat va giu huong",
      option_c: "Nhan ga",
      option_d: "Nham mat",
      correct_answer: "B",
      explanation: "Phanh co kiem soat giup xe on dinh va han che mat lai."
    },
    {
      id: createId("lesson_q"),
      lesson_id: "lesson_b2_003",
      question: "Muc tieu uu tien khi xu ly nguy hiem la?",
      option_a: "Bao ve xe",
      option_b: "Bao dam an toan tinh mang nguoi",
      option_c: "Tranh truot diem",
      option_d: "Tang toc",
      correct_answer: "B",
      explanation: "An toan con nguoi luon la muc tieu uu tien cao nhat."
    }
  ],
  questions: [
    {
      id: createId("q"),
      exam_id: "exam_b2_001",
      question: "What should a driver do when a red traffic light appears?",
      option_a: "Proceed if the road is clear",
      option_b: "Stop behind the line",
      option_c: "Honk and continue",
      option_d: "Slow down only",
      correct_answer: "B",
      is_critical: true,
      explanation: "At a red light, the driver must stop behind the stop line and wait for the next signal."
    },
    {
      id: createId("q"),
      exam_id: "exam_b2_001",
      question: "What is a safe action before changing lanes?",
      option_a: "Check mirrors and blind spots",
      option_b: "Accelerate immediately",
      option_c: "Turn without signaling",
      option_d: "Only look forward",
      correct_answer: "A",
      is_critical: false,
      explanation: "Before changing lanes, the driver should check mirrors and blind spots to avoid collisions."
    },
    {
      id: createId("q"),
      exam_id: "exam_b2_001",
      question: "Which document should be carried while driving?",
      option_a: "Driving license and vehicle papers",
      option_b: "Library card",
      option_c: "Only identity card",
      option_d: "No documents are needed",
      correct_answer: "A",
      is_critical: false,
      explanation: "Drivers should carry their driving license and relevant vehicle papers while operating a vehicle."
    },
    {
      id: createId("q"),
      exam_id: "exam_b2_001",
      question: "What must you do at a pedestrian crossing with people waiting?",
      option_a: "Speed up",
      option_b: "Yield and stop when needed",
      option_c: "Ignore if there is no traffic police",
      option_d: "Use high beam",
      correct_answer: "B",
      is_critical: true,
      explanation: "Pedestrians have priority at the crossing. The safe and lawful action is to slow down and yield."
    }
  ],
  lesson_watches: [],
  lesson_attempts: [],
  exam_results: [],
  visits: []
};

module.exports = {
  mockStore
};
