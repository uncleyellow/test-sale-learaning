const express = require("express");
const sheetsService = require("../services/sheetsService");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");
const { normalizeChoice } = require("../utils/helpers");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const response = await sheetsService.getExams();
    const activeExams = (response.data || []).filter((item) => item.active !== false);
    res.json({ success: true, data: activeExams });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/questions", requireAuth, requireRole("student"), async (req, res, next) => {
  try {
    const [examResponse, questionResponse, resultResponse] = await Promise.all([
      sheetsService.getExamById(req.params.id),
      sheetsService.getQuestionsByExam(req.params.id),
      sheetsService.getResults()
    ]);

    if (!examResponse.data) {
      return res.status(404).json({ success: false, message: "Exam not found" });
    }

    const attempts = (resultResponse.data || []).filter(
      (item) => item.exam_id === req.params.id && item.user_id === req.user.sub
    );
    const latestAttempt =
      attempts.sort((left, right) => new Date(right.submitted_at || 0) - new Date(left.submitted_at || 0))[0] || null;

    return res.json({
      success: true,
      data: {
        exam: examResponse.data,
        questions: (questionResponse.data || []).map(({ correct_answer, ...question }) => question),
        attempt_count: attempts.length,
        latest_attempt: latestAttempt
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/:id/submit", requireAuth, requireRole("student"), async (req, res, next) => {
  try {
    const examId = req.params.id;
    const answers = req.body.answers || {};

    const [examResponse, questionResponse, resultResponse] = await Promise.all([
      sheetsService.getExamById(examId),
      sheetsService.getQuestionsByExam(examId),
      sheetsService.getResults()
    ]);

    const exam = examResponse.data;
    const questions = questionResponse.data || [];

    if (!exam) {
      return res.status(404).json({ success: false, message: "Exam not found" });
    }

    const attempts = (resultResponse.data || []).filter(
      (item) => item.exam_id === examId && item.user_id === req.user.sub
    );
    const nextAttempt = attempts.length + 1;

    let score = 0;
    let failedDueCritical = false;

    questions.forEach((question) => {
      const answer = normalizeChoice(answers[question.id]);
      const correct = answer === normalizeChoice(question.correct_answer);
      if (correct) {
        score += 1;
      }
      if (question.is_critical && !correct) {
        failedDueCritical = true;
      }
    });

    const passed = !failedDueCritical && score >= Number(exam.pass_score || 0);
    const saveResponse = await sheetsService.saveExamResult({
      user_id: req.user.sub,
      exam_id: examId,
      attempt_no: nextAttempt,
      score,
      passed,
      failed_due_critical: failedDueCritical,
      answers
    });

    return res.status(201).json({
      success: true,
      data: {
        result_id: saveResponse.data.id,
        attempt_no: nextAttempt,
        score,
        passed,
        failed_due_critical: failedDueCritical,
        pass_score: Number(exam.pass_score || 0)
      }
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
