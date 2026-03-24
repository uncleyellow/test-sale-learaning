const express = require("express");
const sheetsService = require("../services/sheetsService");

const router = express.Router();

router.post("/visit", async (req, res, next) => {
  try {
    const response = await sheetsService.trackVisit({
      ip: req.ip,
      page: req.body.page,
      lang: req.body.lang
    });
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
