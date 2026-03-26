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

function normalizeResult(result) {
  if (!result) return result;
  return {
    ...result,
    attempt_no: Number(result.attempt_no || 1),
    score: Number(result.score || 0),
    passed: parseBoolean(result.passed),
    failed_due_critical: parseBoolean(result.failed_due_critical)
  };
}

function normalizeLesson(lesson) {
  if (!lesson) return lesson;
  return {
    ...lesson,
    course_type: normalizeCourseType(lesson.course_type || ""),
    order_no: Number(lesson.order_no || 0),
    pass_score: Number(lesson.pass_score || 0),
    active: parseBoolean(lesson.active),
    video_url: String(lesson.video_url || "").trim()
  };
}

function normalizeLessonQuestion(question) {
  if (!question) return question;
  return {
    ...question,
    correct_answer: normalizeChoice(question.correct_answer),
    explanation: String(question.explanation || "").trim()
  };
}

function normalizeLessonAttempt(attempt) {
  if (!attempt) return attempt;
  return {
    ...attempt,
    attempt_no: Number(attempt.attempt_no || 1),
    score: Number(attempt.score || 0),
    total: Number(attempt.total || 0),
    pass_score: Number(attempt.pass_score || 0),
    passed: parseBoolean(attempt.passed)
  };
}

function normalizeSimulationExam(exam) {
  if (!exam) return exam;
  return {
    ...exam,
    course_type: normalizeCourseType(exam.course_type || ""),
    pass_score: Number(exam.pass_score || 0),
    total_clips: Number(exam.total_clips || 0),
    active: parseBoolean(exam.active)
  };
}

function normalizeSimulationClip(clip) {
  if (!clip) return clip;
  return {
    ...clip,
    order_no: Number(clip.order_no || 0),
    trigger_start_sec: Number(clip.trigger_start_sec || 0),
    trigger_end_sec: Number(clip.trigger_end_sec || 0),
    active: parseBoolean(clip.active)
  };
}

function normalizeSimulationAttempt(attempt) {
  if (!attempt) return attempt;
  return {
    ...attempt,
    attempt_no: Number(attempt.attempt_no || 1),
    score: Number(attempt.score || 0),
    passed: parseBoolean(attempt.passed)
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
      const normalized = normalizeResult(payload);
      mockStore.exam_results.unshift(normalized);
      return { success: true, data: normalized };
    }

    return callAppsScript("saveExamResult", payload);
  },

  async getResults() {
    if (this.useMock) {
      return { success: true, data: mockStore.exam_results.map(normalizeResult) };
    }

    const response = await callAppsScript("getResults", {}, "GET");
    return { success: true, data: (response.data || []).map(normalizeResult) };
  },

  async getResultById(id) {
    if (this.useMock) {
      return { success: true, data: normalizeResult(mockStore.exam_results.find((item) => item.id === id) || null) };
    }

    const response = await callAppsScript("getResults", {}, "GET");
    return {
      success: true,
      data: normalizeResult((response.data || []).find((item) => item.id === id) || null)
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

  async upsertLesson(data) {
    const payload = {
      id: data.id || createId("lesson"),
      course_type: normalizeCourseType(data.course_type || ""),
      title: data.title,
      description: data.description || "",
      order_no: Number(data.order_no || 0),
      video_url: String(data.video_url || "").trim(),
      pass_score: Number(data.pass_score || 0),
      active: parseBoolean(data.active)
    };

    if (this.useMock) {
      const index = (mockStore.lessons || []).findIndex((item) => item.id === payload.id);
      if (index >= 0) {
        mockStore.lessons[index] = payload;
      } else {
        mockStore.lessons.unshift(payload);
      }
      return { success: true, data: normalizeLesson(payload) };
    }

    return callAppsScript("upsertLesson", payload);
  },

  async deleteLesson(lessonId) {
    if (this.useMock) {
      mockStore.lessons = (mockStore.lessons || []).filter((item) => item.id !== lessonId);
      mockStore.lesson_questions = (mockStore.lesson_questions || []).filter((item) => item.lesson_id !== lessonId);
      mockStore.lesson_watches = (mockStore.lesson_watches || []).filter((item) => item.lesson_id !== lessonId);
      mockStore.lesson_attempts = (mockStore.lesson_attempts || []).filter((item) => item.lesson_id !== lessonId);
      return { success: true };
    }

    return callAppsScript("deleteLesson", { id: lessonId });
  },

  async upsertLessonQuestion(data) {
    const payload = {
      id: data.id || createId("lesson_q"),
      lesson_id: data.lesson_id,
      question: data.question,
      option_a: data.option_a,
      option_b: data.option_b,
      option_c: data.option_c,
      option_d: data.option_d,
      correct_answer: normalizeChoice(data.correct_answer || ""),
      explanation: data.explanation || ""
    };

    if (this.useMock) {
      const index = (mockStore.lesson_questions || []).findIndex((item) => item.id === payload.id);
      if (index >= 0) {
        mockStore.lesson_questions[index] = payload;
      } else {
        mockStore.lesson_questions.unshift(payload);
      }
      return { success: true, data: normalizeLessonQuestion(payload) };
    }

    return callAppsScript("upsertLessonQuestion", payload);
  },

  async deleteLessonQuestion(questionId) {
    if (this.useMock) {
      mockStore.lesson_questions = (mockStore.lesson_questions || []).filter((item) => item.id !== questionId);
      return { success: true };
    }

    return callAppsScript("deleteLessonQuestion", { id: questionId });
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
  ,

  async getLessons(filters = {}) {
    const courseType = normalizeCourseType(filters.course_type || "");
    const includeInactive = parseBoolean(filters.include_inactive);

    if (this.useMock) {
      const lessons = (mockStore.lessons || [])
        .map(normalizeLesson)
        .filter((lesson) => (!courseType || lesson.course_type === courseType) && (includeInactive || lesson.active))
        .sort((left, right) => left.order_no - right.order_no);
      return { success: true, data: lessons };
    }

    const response = await callAppsScript(
      "getLessons",
      { course_type: courseType, include_inactive: includeInactive ? "true" : "" },
      "GET"
    );
    return {
      success: true,
      data: (response.data || []).map(normalizeLesson).sort((left, right) => left.order_no - right.order_no)
    };
  },

  async getLessonQuestions(lessonId) {
    if (this.useMock) {
      return {
        success: true,
        data: (mockStore.lesson_questions || []).filter((item) => item.lesson_id === lessonId).map(normalizeLessonQuestion)
      };
    }

    const response = await callAppsScript("getLessonQuestions", { lesson_id: lessonId }, "GET");
    return { success: true, data: (response.data || []).map(normalizeLessonQuestion) };
  },

  async getLessonAttemptsByUser(userId) {
    if (this.useMock) {
      return {
        success: true,
        data: (mockStore.lesson_attempts || [])
          .filter((item) => item.user_id === userId)
          .map(normalizeLessonAttempt)
          .sort((left, right) => new Date(left.submitted_at || 0) - new Date(right.submitted_at || 0))
      };
    }

    const response = await callAppsScript("getLessonAttempts", { user_id: userId }, "GET");
    return {
      success: true,
      data: (response.data || []).map(normalizeLessonAttempt).sort((left, right) => new Date(left.submitted_at || 0) - new Date(right.submitted_at || 0))
    };
  },

  async getLessonAttempts(filters = {}) {
    const userId = String(filters.user_id || "").trim();

    if (this.useMock) {
      return {
        success: true,
        data: (mockStore.lesson_attempts || [])
          .filter((item) => !userId || item.user_id === userId)
          .map(normalizeLessonAttempt)
          .sort((left, right) => new Date(right.submitted_at || 0) - new Date(left.submitted_at || 0))
      };
    }

    const response = await callAppsScript("getLessonAttempts", userId ? { user_id: userId } : {}, "GET");
    return {
      success: true,
      data: (response.data || []).map(normalizeLessonAttempt).sort((left, right) => new Date(right.submitted_at || 0) - new Date(left.submitted_at || 0))
    };
  },

  async getLessonWatchesByUser(userId) {
    if (this.useMock) {
      return {
        success: true,
        data: (mockStore.lesson_watches || []).filter((item) => item.user_id === userId)
      };
    }

    return callAppsScript("getLessonWatches", { user_id: userId }, "GET");
  },

  async markLessonWatched(userId, lessonId) {
    const payload = {
      id: createId("lesson_watch"),
      user_id: userId,
      lesson_id: lessonId,
      watched_at: nowIso()
    };

    if (this.useMock) {
      const exists = (mockStore.lesson_watches || []).find((item) => item.user_id === userId && item.lesson_id === lessonId);
      if (!exists) {
        mockStore.lesson_watches.unshift(payload);
      }
      return { success: true, data: exists || payload };
    }

    return callAppsScript("markLessonWatched", payload);
  },

  async saveLessonAttempt(data) {
    const payload = {
      id: createId("lesson_attempt"),
      user_id: data.user_id,
      lesson_id: data.lesson_id,
      attempt_no: Number(data.attempt_no || 1),
      score: Number(data.score || 0),
      total: Number(data.total || 0),
      pass_score: Number(data.pass_score || 0),
      passed: parseBoolean(data.passed),
      submitted_at: nowIso(),
      answers_json: JSON.stringify(data.answers || {}),
      details_json: JSON.stringify(data.details || [])
    };

    const normalized = normalizeLessonAttempt(payload);
    if (this.useMock) {
      (mockStore.lesson_attempts || []).unshift(normalized);
      return { success: true, data: normalized };
    }

    return callAppsScript("saveLessonAttempt", payload);
  },

  async buildLessonWorkspace(userId, courseType) {
    const [lessonsResponse, attemptsResponse, watchesResponse] = await Promise.all([
      this.getLessons({ course_type: courseType }),
      this.getLessonAttemptsByUser(userId),
      this.getLessonWatchesByUser(userId)
    ]);

    const lessons = lessonsResponse.data || [];
    const attempts = attemptsResponse.data || [];
    const watches = watchesResponse.data || [];
    const watchedIds = new Set(watches.map((item) => item.lesson_id));

    const workspaceLessons = [];
    let previousPassed = true;

    for (const lesson of lessons) {
      const lessonAttempts = attempts.filter((item) => item.lesson_id === lesson.id);
      const passed = lessonAttempts.some((item) => item.passed);
      const latestAttempt =
        lessonAttempts.sort((left, right) => new Date(right.submitted_at || 0) - new Date(left.submitted_at || 0))[0] || null;

      workspaceLessons.push({
        ...lesson,
        unlocked: previousPassed,
        watched: watchedIds.has(lesson.id),
        completed: passed,
        attempt_count: lessonAttempts.length,
        latest_attempt: latestAttempt
          ? {
              ...latestAttempt,
              answers: parseJsonSafe(latestAttempt.answers_json, {}),
              details: parseJsonSafe(latestAttempt.details_json, [])
            }
          : null
      });

      previousPassed = passed;
    }

    const questionGroups = await Promise.all(
      workspaceLessons.map(async (lesson) => {
        const response = await this.getLessonQuestions(lesson.id);
        return {
          lesson_id: lesson.id,
          questions: (response.data || []).map(({ correct_answer, ...question }) => question)
        };
      })
    );

    const questionMap = questionGroups.reduce((accumulator, item) => {
      accumulator[item.lesson_id] = item.questions;
      return accumulator;
    }, {});

    return {
      success: true,
      data: {
        lessons: workspaceLessons.map((lesson) => ({
          ...lesson,
          questions: questionMap[lesson.id] || []
        })),
        completed_count: workspaceLessons.filter((item) => item.completed).length,
        total_count: workspaceLessons.length
      }
    };
  },

  async getSimulationExams(filters = {}) {
    const courseType = normalizeCourseType(filters.course_type || "");
    const includeInactive = parseBoolean(filters.include_inactive);

    if (this.useMock) {
      return {
        success: true,
        data: (mockStore.simulation_exams || [])
          .map(normalizeSimulationExam)
          .filter((item) => (!courseType || item.course_type === courseType) && (includeInactive || item.active))
      };
    }

    const response = await callAppsScript(
      "getSimulationExams",
      { course_type: courseType, include_inactive: includeInactive ? "true" : "" },
      "GET"
    );
    return { success: true, data: (response.data || []).map(normalizeSimulationExam) };
  },

  async getSimulationClips(examId, includeInactive = false) {
    if (this.useMock) {
      return {
        success: true,
        data: (mockStore.simulation_clips || [])
          .map(normalizeSimulationClip)
          .filter((item) => item.exam_id === examId && (includeInactive || item.active))
          .sort((left, right) => left.order_no - right.order_no)
      };
    }

    const response = await callAppsScript(
      "getSimulationClips",
      { exam_id: examId, include_inactive: includeInactive ? "true" : "" },
      "GET"
    );
    return { success: true, data: (response.data || []).map(normalizeSimulationClip).sort((left, right) => left.order_no - right.order_no) };
  },

  async getSimulationAttempts(filters = {}) {
    const userId = String(filters.user_id || "").trim();
    const examId = String(filters.exam_id || "").trim();

    if (this.useMock) {
      return {
        success: true,
        data: (mockStore.simulation_attempts || [])
          .map(normalizeSimulationAttempt)
          .filter((item) => (!userId || item.user_id === userId) && (!examId || item.exam_id === examId))
          .sort((left, right) => new Date(right.submitted_at || 0) - new Date(left.submitted_at || 0))
      };
    }

    const response = await callAppsScript("getSimulationAttempts", { user_id: userId, exam_id: examId }, "GET");
    return {
      success: true,
      data: (response.data || []).map(normalizeSimulationAttempt).sort((left, right) => new Date(right.submitted_at || 0) - new Date(left.submitted_at || 0))
    };
  },

  async upsertSimulationExam(data) {
    const payload = {
      id: data.id || createId("sim_exam"),
      course_type: normalizeCourseType(data.course_type || ""),
      title: data.title,
      description: data.description || "",
      pass_score: Number(data.pass_score || 0),
      total_clips: Number(data.total_clips || 0),
      active: parseBoolean(data.active)
    };

    if (this.useMock) {
      const index = (mockStore.simulation_exams || []).findIndex((item) => item.id === payload.id);
      if (index >= 0) {
        mockStore.simulation_exams[index] = payload;
      } else {
        mockStore.simulation_exams.unshift(payload);
      }
      return { success: true, data: normalizeSimulationExam(payload) };
    }

    return callAppsScript("upsertSimulationExam", payload);
  },

  async deleteSimulationExam(examId) {
    if (this.useMock) {
      mockStore.simulation_exams = (mockStore.simulation_exams || []).filter((item) => item.id !== examId);
      mockStore.simulation_clips = (mockStore.simulation_clips || []).filter((item) => item.exam_id !== examId);
      mockStore.simulation_attempts = (mockStore.simulation_attempts || []).filter((item) => item.exam_id !== examId);
      return { success: true };
    }

    return callAppsScript("deleteSimulationExam", { id: examId });
  },

  async upsertSimulationClip(data) {
    const payload = {
      id: data.id || createId("sim_clip"),
      exam_id: data.exam_id,
      title: data.title,
      video_url: String(data.video_url || "").trim(),
      order_no: Number(data.order_no || 0),
      trigger_start_sec: Number(data.trigger_start_sec || 0),
      trigger_end_sec: Number(data.trigger_end_sec || 0),
      active: parseBoolean(data.active)
    };

    if (this.useMock) {
      const index = (mockStore.simulation_clips || []).findIndex((item) => item.id === payload.id);
      if (index >= 0) {
        mockStore.simulation_clips[index] = payload;
      } else {
        mockStore.simulation_clips.unshift(payload);
      }
      return { success: true, data: normalizeSimulationClip(payload) };
    }

    return callAppsScript("upsertSimulationClip", payload);
  },

  async deleteSimulationClip(clipId) {
    if (this.useMock) {
      mockStore.simulation_clips = (mockStore.simulation_clips || []).filter((item) => item.id !== clipId);
      return { success: true };
    }

    return callAppsScript("deleteSimulationClip", { id: clipId });
  },

  async saveSimulationAttempt(data) {
    const payload = {
      id: createId("sim_attempt"),
      user_id: data.user_id,
      exam_id: data.exam_id,
      attempt_no: Number(data.attempt_no || 1),
      score: Number(data.score || 0),
      passed: parseBoolean(data.passed),
      submitted_at: nowIso(),
      answers_json: JSON.stringify(data.answers || {}),
      details_json: JSON.stringify(data.details || [])
    };

    if (this.useMock) {
      const normalized = normalizeSimulationAttempt(payload);
      (mockStore.simulation_attempts || []).unshift(normalized);
      return { success: true, data: normalized };
    }

    return callAppsScript("saveSimulationAttempt", payload);
  }
};

module.exports = sheetsService;
