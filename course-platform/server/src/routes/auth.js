const express = require("express");
const sheetsService = require("../services/sheetsService");
const { comparePassword, signToken } = require("../services/authService");
const { requireAuth } = require("../middleware/authMiddleware");
const { sanitizeEmail } = require("../utils/helpers");

const router = express.Router();

router.post("/login", async (req, res, next) => {
  try {
    const email = sanitizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const usersResponse = await sheetsService.getUsers();
    const user = (usersResponse.data || []).find((item) => sanitizeEmail(item.email) === email);

    if (!user || !comparePassword(password, user.password_hash)) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = signToken(user);
    res.cookie("auth_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 8 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          course_type: user.course_type || ""
        }
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("auth_token");
  res.json({ success: true, message: "Logged out" });
});

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const usersResponse = await sheetsService.getUsers();
    const user = (usersResponse.data || []).find((item) => item.id === req.user.sub);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        course_type: user.course_type || ""
      }
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
