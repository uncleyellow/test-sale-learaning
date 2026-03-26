const express = require("express");
const sheetsService = require("../services/sheetsService");
const { hashPassword } = require("../services/authService");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");
const { normalizeCourseType, sanitizeEmail } = require("../utils/helpers");

const router = express.Router();

router.use(requireAuth, requireRole("admin"));

router.get("/results", async (req, res, next) => {
  try {
    const response = await sheetsService.getResults();
    res.json({ success: true, data: response.data || [] });
  } catch (error) {
    next(error);
  }
});

router.get("/learning-attempts", async (req, res, next) => {
  try {
    const [attemptsResponse, usersResponse, lessonsResponse] = await Promise.all([
      sheetsService.getLessonAttempts(),
      sheetsService.getUsers(),
      sheetsService.getLessons()
    ]);

    const users = usersResponse.data || [];
    const lessons = lessonsResponse.data || [];
    const data = (attemptsResponse.data || []).map((item) => ({
      ...item,
      student_name: (users.find((user) => user.id === item.user_id) || {}).name || item.user_id,
      lesson_title: (lessons.find((lesson) => lesson.id === item.lesson_id) || {}).title || item.lesson_id
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get("/stats", async (req, res, next) => {
  try {
    const filters = {
      from: String(req.query.from || ""),
      course: normalizeCourseType(req.query.course || "")
    };
    const response = await sheetsService.getStats(filters);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get("/users", async (req, res, next) => {
  try {
    const response = await sheetsService.getUsers();
    res.json({ success: true, data: response.data || [] });
  } catch (error) {
    next(error);
  }
});

router.post("/users", async (req, res, next) => {
  try {
    const payload = {
      name: String(req.body.name || "").trim(),
      email: sanitizeEmail(req.body.email),
      password: String(req.body.password || ""),
      role: String(req.body.role || "student"),
      course_type: normalizeCourseType(req.body.course_type || "")
    };

    if (!payload.name || !payload.email || !payload.password) {
      return res.status(400).json({ success: false, message: "Missing required user fields" });
    }

    const usersResponse = await sheetsService.getUsers();
    const existingUser = (usersResponse.data || []).find((item) => sanitizeEmail(item.email) === payload.email);
    if (existingUser) {
      return res.status(409).json({ success: false, message: "Email already exists" });
    }

    const response = await sheetsService.createUser({
      ...payload,
      password_hash: hashPassword(payload.password)
    });

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

router.get("/exams", async (req, res, next) => {
  try {
    const response = await sheetsService.getExams();
    res.json({ success: true, data: response.data || [] });
  } catch (error) {
    next(error);
  }
});

router.get("/questions", async (req, res, next) => {
  try {
    const examId = String(req.query.exam_id || "");
    if (examId) {
      const response = await sheetsService.getQuestionsByExam(examId);
      return res.json({ success: true, data: response.data || [] });
    }

    const examsResponse = await sheetsService.getExams();
    const exams = examsResponse.data || [];
    const questionGroups = await Promise.all(
      exams.map(async (exam) => {
        const response = await sheetsService.getQuestionsByExam(exam.id);
        return (response.data || []).map((question) => ({
          ...question,
          exam_title: exam.title
        }));
      })
    );

    return res.json({ success: true, data: questionGroups.flat() });
  } catch (error) {
    next(error);
  }
});

router.post("/exams", async (req, res, next) => {
  try {
    const response = await sheetsService.upsertExam(req.body);
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

router.put("/exams/:id", async (req, res, next) => {
  try {
    const response = await sheetsService.upsertExam({ ...req.body, id: req.params.id });
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.delete("/exams/:id", async (req, res, next) => {
  try {
    const response = await sheetsService.deleteExam(req.params.id);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.post("/questions", async (req, res, next) => {
  try {
    const response = await sheetsService.upsertQuestion(req.body);
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

router.put("/questions/:id", async (req, res, next) => {
  try {
    const response = await sheetsService.upsertQuestion({ ...req.body, id: req.params.id });
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.delete("/questions/:id", async (req, res, next) => {
  try {
    const response = await sheetsService.deleteQuestion(req.params.id);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get("/lessons", async (req, res, next) => {
  try {
    const response = await sheetsService.getLessons({
      course_type: normalizeCourseType(req.query.course_type || ""),
      include_inactive: true
    });
    res.json({ success: true, data: response.data || [] });
  } catch (error) {
    next(error);
  }
});

router.post("/lessons", async (req, res, next) => {
  try {
    const response = await sheetsService.upsertLesson(req.body);
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

router.put("/lessons/:id", async (req, res, next) => {
  try {
    const response = await sheetsService.upsertLesson({ ...req.body, id: req.params.id });
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.delete("/lessons/:id", async (req, res, next) => {
  try {
    const response = await sheetsService.deleteLesson(req.params.id);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get("/lesson-questions", async (req, res, next) => {
  try {
    const lessonId = String(req.query.lesson_id || "");
    if (!lessonId) {
      return res.status(400).json({ success: false, message: "lesson_id is required" });
    }
    const response = await sheetsService.getLessonQuestions(lessonId);
    return res.json({ success: true, data: response.data || [] });
  } catch (error) {
    return next(error);
  }
});

router.post("/lesson-questions", async (req, res, next) => {
  try {
    const response = await sheetsService.upsertLessonQuestion(req.body);
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

router.put("/lesson-questions/:id", async (req, res, next) => {
  try {
    const response = await sheetsService.upsertLessonQuestion({ ...req.body, id: req.params.id });
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.delete("/lesson-questions/:id", async (req, res, next) => {
  try {
    const response = await sheetsService.deleteLessonQuestion(req.params.id);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get("/simulation-exams", async (req, res, next) => {
  try {
    const response = await sheetsService.getSimulationExams({
      course_type: normalizeCourseType(req.query.course_type || ""),
      include_inactive: true
    });
    res.json({ success: true, data: response.data || [] });
  } catch (error) {
    next(error);
  }
});

router.post("/simulation-exams", async (req, res, next) => {
  try {
    const response = await sheetsService.upsertSimulationExam(req.body);
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

router.put("/simulation-exams/:id", async (req, res, next) => {
  try {
    const response = await sheetsService.upsertSimulationExam({ ...req.body, id: req.params.id });
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.delete("/simulation-exams/:id", async (req, res, next) => {
  try {
    const response = await sheetsService.deleteSimulationExam(req.params.id);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get("/simulation-clips", async (req, res, next) => {
  try {
    const examId = String(req.query.exam_id || "");
    if (!examId) {
      return res.status(400).json({ success: false, message: "exam_id is required" });
    }
    const response = await sheetsService.getSimulationClips(examId, true);
    return res.json({ success: true, data: response.data || [] });
  } catch (error) {
    return next(error);
  }
});

router.post("/simulation-clips", async (req, res, next) => {
  try {
    const response = await sheetsService.upsertSimulationClip(req.body);
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

router.put("/simulation-clips/:id", async (req, res, next) => {
  try {
    const response = await sheetsService.upsertSimulationClip({ ...req.body, id: req.params.id });
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.delete("/simulation-clips/:id", async (req, res, next) => {
  try {
    const response = await sheetsService.deleteSimulationClip(req.params.id);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get("/simulation-attempts", async (req, res, next) => {
  try {
    const [attemptsResponse, usersResponse, examsResponse] = await Promise.all([
      sheetsService.getSimulationAttempts(),
      sheetsService.getUsers(),
      sheetsService.getSimulationExams({ include_inactive: true })
    ]);
    const users = usersResponse.data || [];
    const exams = examsResponse.data || [];
    const data = (attemptsResponse.data || []).map((item) => ({
      ...item,
      student_name: (users.find((user) => user.id === item.user_id) || {}).name || item.user_id,
      exam_title: (exams.find((exam) => exam.id === item.exam_id) || {}).title || item.exam_id
    }));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
