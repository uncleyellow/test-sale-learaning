const express = require("express");
const sheetsService = require("../services/sheetsService");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");
const { normalizeCourseType, parseJsonSafe } = require("../utils/helpers");

const router = express.Router();

router.use(requireAuth, requireRole("student"));

async function getStudentCourse(userId) {
  const usersResponse = await sheetsService.getUsers();
  const user = (usersResponse.data || []).find((item) => item.id === userId);
  return user ? normalizeCourseType(user.course_type || "") : null;
}

router.get("/workspace", async (req, res, next) => {
  try {
    const courseType = await getStudentCourse(req.user.sub);
    if (courseType === null) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const examsResponse = await sheetsService.getSimulationExams({ course_type: courseType });
    const exams = examsResponse.data || [];
    const selectedExam = exams[0] || null;

    if (!selectedExam) {
      return res.json({ success: true, data: { exam: null, clips: [], attempts: [] } });
    }

    const [clipsResponse, attemptsResponse] = await Promise.all([
      sheetsService.getSimulationClips(selectedExam.id),
      sheetsService.getSimulationAttempts({ user_id: req.user.sub, exam_id: selectedExam.id })
    ]);

    const attempts = (attemptsResponse.data || []).map((item) => ({
      ...item,
      answers: parseJsonSafe(item.answers_json, {}),
      details: parseJsonSafe(item.details_json, [])
    }));

    return res.json({
      success: true,
      data: {
        exam: {
          ...selectedExam,
          total_clips: clipsResponse.data.length
        },
        clips: clipsResponse.data || [],
        attempts
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/:examId/submit", async (req, res, next) => {
  try {
    const examId = req.params.examId;
    const answers = req.body.answers || {};

    const [examResponse, clipsResponse, attemptsResponse] = await Promise.all([
      sheetsService.getSimulationExams({ include_inactive: false }),
      sheetsService.getSimulationClips(examId),
      sheetsService.getSimulationAttempts({ user_id: req.user.sub, exam_id: examId })
    ]);

    const exam = (examResponse.data || []).find((item) => item.id === examId);
    if (!exam) {
      return res.status(404).json({ success: false, message: "Simulation exam not found" });
    }

    const clips = clipsResponse.data || [];
    if (!clips.length) {
      return res.status(400).json({ success: false, message: "Simulation exam has no clips" });
    }

    let score = 0;
    const details = clips.map((clip) => {
      const pressedAtRaw = answers[clip.id];
      const pressedAt = pressedAtRaw === null || pressedAtRaw === undefined || pressedAtRaw === "" ? null : Number(pressedAtRaw);

      let state = "missed";
      let point = 0;
      if (pressedAt !== null && Number.isFinite(pressedAt)) {
        if (pressedAt < clip.trigger_start_sec) {
          state = "early";
        } else if (pressedAt > clip.trigger_end_sec) {
          state = "late";
        } else {
          state = "correct";
          const windowSize = Math.max(clip.trigger_end_sec - clip.trigger_start_sec, 0.1);
          const ratio = (pressedAt - clip.trigger_start_sec) / windowSize;
          point = Math.max(1, 5 - Math.floor(ratio * 5));
          score += point;
        }
      }

      return {
        clip_id: clip.id,
        clip_title: clip.title,
        trigger_start_sec: clip.trigger_start_sec,
        trigger_end_sec: clip.trigger_end_sec,
        pressed_at_sec: pressedAt,
        state,
        point
      };
    });

    const passScore = Number(exam.pass_score || clips.length * 3);
    const passed = score >= passScore;

    const saveResponse = await sheetsService.saveSimulationAttempt({
      user_id: req.user.sub,
      exam_id: examId,
      attempt_no: (attemptsResponse.data || []).length + 1,
      score,
      passed,
      answers,
      details
    });

    return res.status(201).json({
      success: true,
      data: {
        attempt_id: saveResponse.data.id,
        attempt_no: (attemptsResponse.data || []).length + 1,
        score,
        total: clips.length * 5,
        pass_score: passScore,
        passed,
        details
      }
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
