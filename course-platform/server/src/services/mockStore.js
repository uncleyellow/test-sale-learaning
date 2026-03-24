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
  exam_results: [],
  visits: []
};

module.exports = {
  mockStore
};
