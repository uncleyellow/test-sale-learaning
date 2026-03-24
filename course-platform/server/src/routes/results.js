const express = require("express");
const sheetsService = require("../services/sheetsService");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const [response, examsResponse] = await Promise.all([sheetsService.getResults(), sheetsService.getExams()]);
    const results = response.data || [];
    const exams = examsResponse.data || [];
    const mappedResults = results.map((item) => ({
      ...item,
      exam_title: (exams.find((exam) => exam.id === item.exam_id) || {}).title || item.exam_id
    }));

    if (req.user.role === "admin") {
      return res.json({ success: true, data: mappedResults });
    }

    const ownResults = mappedResults
      .filter((item) => item.user_id === req.user.sub)
      .sort((left, right) => new Date(right.submitted_at || 0) - new Date(left.submitted_at || 0));

    return res.json({ success: true, data: ownResults });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const response = await sheetsService.getResultDetails(req.params.id);
    if (!response.success || !response.data) {
      return res.status(404).json({ success: false, message: "Result not found" });
    }

    const result = response.data;
    const isOwner = result.user_id === req.user.sub;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
