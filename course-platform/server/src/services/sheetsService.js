const {
  createId,
  nowIso,
  parseBoolean,
  sanitizeEmail,
  normalizeCourseType,
  parseJsonSafe,
  normalizeChoice
} = require("../utils/helpers");
const { mockStore } = require("./mockStore");

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || "";
const APPS_SCRIPT_SECRET = process.env.APPS_SCRIPT_SECRET || "";
const USE_MOCK_DATA = String(process.env.USE_MOCK_DATA || "true").toLowerCase() === "true";

function normalizeExam(exam) {
  if (!exam) return exam;
  return {
    ...exam,
    pass_score: Number(exam.pass_score || 0),
    total_questions: Number(exam.total_questions || 0),
    duration_minutes: Number(exam.duration_minutes || 20),
    active: parseBoolean(exam.active)
  };
}

function normalizeQuestion(question) {
  if (!question) return question;
  return {
    ...question,
    correct_answer: normalizeChoice(question.correct_answer),
    is_critical: parseBoolean(question.is_critical),
    explanation: String(question.explanation || "").trim()
  };
}

async function callAppsScript(action, payload = {}, method = "POST") {
  if (!APPS_SCRIPT_URL) {
    throw new Error("APPS_SCRIPT_URL is not configured");
  }

  const url = new URL(APPS_SCRIPT_URL);
  if (method === "GET") {
    url.searchParams.set("action", action);
    url.searchParams.set("secret", APPS_SCRIPT_SECRET);
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const request = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json"
    },
    body:
      method === "GET"
        ? undefined
        : JSON.stringify({
            action,
            secret: APPS_SCRIPT_SECRET,
            ...payload
          })
  });

  if (!request.ok) {
    throw new Error(`Apps Script request failed with status ${request.status}`);
  }

  return request.json();
}

function matchFromDate(value, from) {
  if (!from) return true;
  return String(value).slice(0, 10) >= from;
}

function buildStats(filters) {
  const registrations = mockStore.registrations.filter(
    (item) => matchFromDate(item.created_at, filters.from) && (!filters.course || item.course_type === filters.course)
  );
  const results = mockStore.exam_results.filter((item) => matchFromDate(item.submitted_at, filters.from));
  const students = mockStore.users.filter((item) => item.role === "student");
  const visits = mockStore.visits.filter((item) => matchFromDate(item.visited_at, filters.from));

  return {
    totalVisits: visits.length,
    totalRegistrations: registrations.length,
    totalStudents: students.length,
    passedCount: results.filter((item) => item.passed).length,
    failedCount: results.filter((item) => !item.passed).length,
    registrations,
    results,
    students,
    chart: {
      labels: ["Visits", "Registrations", "Passed", "Failed"],
      values: [
        visits.length,
        registrations.length,
        results.filter((item) => item.passed).length,
        results.filter((item) => !item.passed).length
      ]
    }
  };
}

const sheetsService = {
  useMock: USE_MOCK_DATA || !APPS_SCRIPT_URL,

  async createRegistration(data) {
    const payload = {
      id: createId("reg"),
      name: data.name,
      phone: data.phone,
      email: sanitizeEmail(data.email),
      course_type: normalizeCourseType(data.course_type),
      note: data.note || "",
      created_at: nowIso()
    };

    if (this.useMock) {
      mockStore.registrations.unshift(payload);
      return { success: true, data: payload };
    }

    return callAppsScript("createRegistration", payload);
  },

  async getUsers() {
    if (this.useMock) {
      return { success: true, data: mockStore.users };
    }

    return callAppsScript("getUsers", {}, "GET");
  },

  async createUser(data) {
    const payload = {
      id: createId("user"),
      name: data.name,
      email: sanitizeEmail(data.email),
      password_hash: data.password_hash,
      role: data.role,
      course_type: data.course_type || "",
      created_at: nowIso()
    };

    if (this.useMock) {
      mockStore.users.unshift(payload);
      return { success: true, data: payload };
    }

    return callAppsScript("createUser", payload);
  },

  async getExams() {
    if (this.useMock) {
      return { success: true, data: mockStore.exams.map(normalizeExam) };
    }

    const response = await callAppsScript("getExams", {}, "GET");
    return { success: true, data: (response.data || []).map(normalizeExam) };
  },

  async getExamById(examId) {
    const response = await this.getExams();
    return {
      success: true,
      data: (response.data || []).find((item) => item.id === examId) || null
    };
  },

  async getQuestionsByExam(examId) {
    if (this.useMock) {
      return { success: true, data: mockStore.questions.filter((item) => item.exam_id === examId).map(normalizeQuestion) };
    }

    const response = await callAppsScript("getQuestionsByExam", { exam_id: examId }, "GET");
    return { success: true, data: (response.data || []).map(normalizeQuestion) };
  },

  async saveExamResult(data) {
    const payload = {
      id: createId("result"),
      user_id: data.user_id,
      exam_id: data.exam_id,
      attempt_no: Number(data.attempt_no || 1),
      score: data.score,
      passed: data.passed,
      failed_due_critical: data.failed_due_critical,
      submitted_at: nowIso(),
      answers_json: JSON.stringify(data.answers || {})
    };

    if (this.useMock) {
      mockStore.exam_results.unshift(payload);
      return { success: true, data: payload };
    }

    return callAppsScript("saveExamResult", payload);
  },

  async getResults() {
    if (this.useMock) {
      return { success: true, data: mockStore.exam_results };
    }

    return callAppsScript("getResults", {}, "GET");
  },

  async getResultById(id) {
    if (this.useMock) {
      return { success: true, data: mockStore.exam_results.find((item) => item.id === id) || null };
    }

    const response = await callAppsScript("getResults", {}, "GET");
    return {
      success: true,
      data: (response.data || []).find((item) => item.id === id) || null
    };
  },

  async trackVisit(data) {
    const payload = {
      id: createId("visit"),
      ip: data.ip || "",
      page: data.page || "/",
      lang: data.lang || "vi",
      visited_at: nowIso()
    };

    if (this.useMock) {
      mockStore.visits.unshift(payload);
      return { success: true, data: payload };
    }

    return callAppsScript("trackVisit", payload);
  },

  async getStats(filters = {}) {
    if (this.useMock) {
      return { success: true, data: buildStats(filters) };
    }

    return callAppsScript("getStats", filters, "GET");
  },

  async upsertExam(data) {
    const payload = {
      id: data.id || createId("exam"),
      title: data.title,
      pass_score: Number(data.pass_score),
      total_questions: Number(data.total_questions),
      duration_minutes: Number(data.duration_minutes || 20),
      active: parseBoolean(data.active)
    };

    if (this.useMock) {
      const index = mockStore.exams.findIndex((item) => item.id === payload.id);
      if (index >= 0) {
        mockStore.exams[index] = payload;
      } else {
        mockStore.exams.unshift(payload);
      }
      return { success: true, data: payload };
    }

    return callAppsScript("upsertExam", payload);
  },

  async deleteExam(examId) {
    if (this.useMock) {
      mockStore.exams = mockStore.exams.filter((item) => item.id !== examId);
      mockStore.questions = mockStore.questions.filter((item) => item.exam_id !== examId);
      return { success: true };
    }

    return callAppsScript("deleteExam", { id: examId });
  },

  async upsertQuestion(data) {
    const payload = {
      id: data.id || createId("question"),
      exam_id: data.exam_id,
      question: data.question,
      option_a: data.option_a,
      option_b: data.option_b,
      option_c: data.option_c,
      option_d: data.option_d,
      explanation: data.explanation || "",
      correct_answer: String(data.correct_answer || "").toUpperCase(),
      is_critical: parseBoolean(data.is_critical)
    };

    if (this.useMock) {
      const index = mockStore.questions.findIndex((item) => item.id === payload.id);
      if (index >= 0) {
        mockStore.questions[index] = payload;
      } else {
        mockStore.questions.unshift(payload);
      }
      return { success: true, data: payload };
    }

    return callAppsScript("upsertQuestion", payload);
  },

  async deleteQuestion(questionId) {
    if (this.useMock) {
      mockStore.questions = mockStore.questions.filter((item) => item.id !== questionId);
      return { success: true };
    }

    return callAppsScript("deleteQuestion", { id: questionId });
  },

  async getResultDetails(resultId) {
    const [resultResponse, examsResponse, usersResponse] = await Promise.all([
      this.getResultById(resultId),
      this.getExams(),
      this.getUsers()
    ]);

    const result = resultResponse.data;
    if (!result) {
      return { success: false, message: "Result not found" };
    }

    const questionsResponse = await this.getQuestionsByExam(result.exam_id);
    return {
      success: true,
      data: {
        ...result,
        answers: parseJsonSafe(result.answers_json, {}),
        exam: (examsResponse.data || []).find((item) => item.id === result.exam_id) || null,
        user: (usersResponse.data || []).find((item) => item.id === result.user_id) || null,
        questions: questionsResponse.data || []
      }
    };
  }
};

module.exports = sheetsService;
