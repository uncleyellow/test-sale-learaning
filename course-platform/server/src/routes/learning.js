const express = require("express");
const sheetsService = require("../services/sheetsService");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");
const { normalizeCourseType, normalizeChoice, parseJsonSafe } = require("../utils/helpers");

const router = express.Router();

router.use(requireAuth, requireRole("student"));

async function getCurrentStudentCourse(userId) {
  const usersResponse = await sheetsService.getUsers();
  const currentUser = (usersResponse.data || []).find((item) => item.id === userId);
  if (!currentUser) {
    return null;
  }
  return normalizeCourseType(currentUser.course_type || "");
}

router.get("/workspace", async (req, res, next) => {
  try {
    const courseType = await getCurrentStudentCourse(req.user.sub);
    if (courseType === null) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const response = await sheetsService.buildLessonWorkspace(req.user.sub, courseType);
    return res.json(response);
  } catch (error) {
    return next(error);
  }
});

router.post("/lessons/:id/watched", async (req, res, next) => {
  try {
    const courseType = await getCurrentStudentCourse(req.user.sub);
    if (courseType === null) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const workspaceResponse = await sheetsService.buildLessonWorkspace(req.user.sub, courseType);
    const targetLesson = (workspaceResponse.data.lessons || []).find((item) => item.id === req.params.id);

    if (!targetLesson) {
      return res.status(404).json({ success: false, message: "Lesson not found" });
    }

    if (!targetLesson.unlocked) {
      return res.status(403).json({ success: false, message: "Lesson is locked" });
    }

    const response = await sheetsService.markLessonWatched(req.user.sub, req.params.id);
    return res.status(201).json(response);
  } catch (error) {
    return next(error);
  }
});

router.post("/lessons/:id/submit", async (req, res, next) => {
  try {
    const lessonId = req.params.id;
    const answers = req.body.answers || {};

    const courseType = await getCurrentStudentCourse(req.user.sub);
    if (courseType === null) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const workspaceResponse = await sheetsService.buildLessonWorkspace(req.user.sub, courseType);
    const lesson = (workspaceResponse.data.lessons || []).find((item) => item.id === lessonId);
    if (!lesson) {
      return res.status(404).json({ success: false, message: "Lesson not found" });
    }

    if (!lesson.unlocked) {
      return res.status(403).json({ success: false, message: "Lesson is locked" });
    }

    if (!lesson.watched && !lesson.completed) {
      return res.status(400).json({ success: false, message: "Watch the lesson video before submitting quiz" });
    }

    const questionResponse = await sheetsService.getLessonQuestions(lessonId);
    const questions = questionResponse.data || [];

    let score = 0;
    const details = questions.map((question) => {
      const selected = normalizeChoice(answers[question.id]);
      const correctAnswer = normalizeChoice(question.correct_answer);
      const isCorrect = selected === correctAnswer;
      if (isCorrect) {
        score += 1;
      }

      return {
        question: question.question,
        selected,
        correct_answer: correctAnswer,
        is_correct: isCorrect,
        explanation: question.explanation || ""
      };
    });

    const passScore = Number(lesson.pass_score || questions.length || 0);
    const passed = score >= passScore;

    const attemptsResponse = await sheetsService.getLessonAttemptsByUser(req.user.sub);
    const lessonAttempts = (attemptsResponse.data || []).filter((item) => item.lesson_id === lessonId);

    const saveResponse = await sheetsService.saveLessonAttempt({
      user_id: req.user.sub,
      lesson_id: lessonId,
      attempt_no: lessonAttempts.length + 1,
      score,
      total: questions.length,
      pass_score: passScore,
      passed,
      answers,
      details
    });

    return res.status(201).json({
      success: true,
      data: {
        attempt_id: saveResponse.data.id,
        attempt_no: lessonAttempts.length + 1,
        score,
        total: questions.length,
        pass_score: passScore,
        passed,
        details,
        answers: parseJsonSafe(saveResponse.data.answers_json, answers)
      }
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
