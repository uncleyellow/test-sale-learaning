const express = require("express");
const sheetsService = require("../services/sheetsService");
const { sanitizeEmail } = require("../utils/helpers");

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const payload = {
      name: String(req.body.name || "").trim(),
      phone: String(req.body.phone || "").trim(),
      email: sanitizeEmail(req.body.email),
      course_type: String(req.body.course_type || "").trim(),
      note: String(req.body.note || "").trim()
    };

    if (!payload.name || !payload.phone || !payload.email || !payload.course_type) {
      return res.status(400).json({ success: false, message: "Missing required registration fields" });
    }

    const response = await sheetsService.createRegistration(payload);
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
