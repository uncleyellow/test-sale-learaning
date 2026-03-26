const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const authRoutes = require("./routes/auth");
const examRoutes = require("./routes/exams");
const adminRoutes = require("./routes/admin");
const registrationRoutes = require("./routes/registrations");
const resultRoutes = require("./routes/results");
const trackingRoutes = require("./routes/tracking");
const learningRoutes = require("./routes/learning");
const simulationRoutes = require("./routes/simulation");

const app = express();
const PORT = process.env.PORT || 5000;
const rootDir = path.resolve(__dirname, "..", "..");
const clientPublic = path.join(rootDir, "client", "public");
const clientSrc = path.join(rootDir, "client", "src");

app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/src", express.static(clientSrc));
app.use(express.static(clientPublic));

app.get("/health", (req, res) => {
  res.json({ success: true, message: "Server is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tracking", trackingRoutes);
app.use("/api/learning", learningRoutes);
app.use("/api/simulation", simulationRoutes);

app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ success: false, message: "API route not found" });
  }
  return res.sendFile(path.join(clientPublic, "index.html"));
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(error.status || 500).json({
    success: false,
    message: error.message || "Internal server error"
  });
});

app.listen(PORT, () => {
  console.log(`Driving school platform running on http://localhost:${PORT}`);
});
