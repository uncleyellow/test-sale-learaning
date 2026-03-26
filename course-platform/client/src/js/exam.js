let timerInterval = null;
let currentExamId = null;
let currentExam = null;
let currentResults = [];
let currentStudent = null;
let learningWorkspace = { lessons: [], completed_count: 0, total_count: 0 };
let currentLessonId = null;
let simulationWorkspace = { exam: null, clips: [], attempts: [] };
let simulationAnswers = {};
let simulationKeyHandlerBound = false;

function t(key, fallback = "") {
  return window.DriveSchoolI18n.t(key, fallback);
}

document.addEventListener("DOMContentLoaded", async () => {
  await window.DriveSchoolI18n.loadTranslations();
  window.DriveSchoolCommon.initZaloBubble();
  window.DriveSchoolCommon.trackVisit();

  const currentUser = await window.DriveSchoolCommon.getCurrentUser();
  if (!currentUser) {
    window.DriveSchoolCommon.redirectWithLang("/login.html");
    return;
  }
  if (currentUser.role !== "student") {
    window.DriveSchoolCommon.redirectWithLang("/admin.html");
    return;
  }

  currentStudent = currentUser;
  initStudentActions();
  renderStudentHeader(currentUser);
  await initLearningPath();
  await initSimulationWorkspace();
  await loadStudentWorkspace(currentUser);
});

function initStudentActions() {
  const logoutButton = document.getElementById("studentLogoutButton");
  if (logoutButton) {
    logoutButton.onclick = () => window.DriveSchoolCommon.logoutAndRedirect();
  }
}

function renderStudentHeader(currentUser) {
  document.getElementById("welcomeStudent").textContent = currentUser.name;
  document.getElementById("studentCourseBadge").textContent = currentUser.course_type || "-";
  document.getElementById("studentCurrentCourse").textContent = currentUser.course_type || "-";
  document.getElementById("studentCourseType").textContent = currentUser.course_type || "-";
}

async function initLearningPath() {
  try {
    await reloadLearningWorkspace();
  } catch (error) {
    document.getElementById("lessonContent").innerHTML = `<div class=\"alert alert-danger mb-0\">${window.DriveSchoolCommon.escapeHtml(error.message)}</div>`;
  }
}

async function reloadLearningWorkspace(preferredLessonId = "") {
  const response = await window.DriveSchoolCommon.apiFetch("/api/learning/workspace");
  learningWorkspace = response.data || { lessons: [], completed_count: 0, total_count: 0 };

  const lessons = learningWorkspace.lessons || [];
  const preferred = preferredLessonId ? lessons.find((item) => item.id === preferredLessonId && item.unlocked) : null;
  const unlocked = lessons.find((item) => item.unlocked) || lessons[0] || null;
  const current = currentLessonId ? lessons.find((item) => item.id === currentLessonId && item.unlocked) : null;

  currentLessonId = (preferred || current || unlocked || {}).id || null;

  renderLearningProgress();
  renderLessonList();
  renderLessonContent(currentLessonId);
}

function renderLearningProgress() {
  const progressBar = document.getElementById("learningProgressBar");
  const progressText = document.getElementById("learningProgressText");
  const completed = Number(learningWorkspace.completed_count || 0);
  const total = Number(learningWorkspace.total_count || 0);
  const percent = total ? Math.round((completed / total) * 100) : 0;

  if (progressBar) {
    progressBar.style.width = `${percent}%`;
    progressBar.textContent = `${percent}%`;
    progressBar.setAttribute("aria-valuenow", String(percent));
  }

  if (progressText) {
    progressText.textContent = `Da hoan thanh ${completed}/${total} bai`;
  }
}

function renderLessonList() {
  const lessonList = document.getElementById("lessonList");
  const lessons = learningWorkspace.lessons || [];

  if (!lessonList) return;
  if (!lessons.length) {
    lessonList.innerHTML = '<div class="text-muted">Chua co bai hoc phu hop voi khoa hoc cua hoc vien.</div>';
    return;
  }

  lessonList.innerHTML = lessons
    .map((lesson, index) => {
      const active = lesson.id === currentLessonId;
      const statusHtml = lesson.completed
        ? '<span class="badge text-bg-success">Da qua</span>'
        : lesson.unlocked
        ? '<span class="badge text-bg-warning">Dang hoc</span>'
        : '<span class="badge text-bg-secondary">Khoa</span>';

      return `
        <button
          type="button"
          class="lesson-item-btn ${active ? "active" : ""} ${lesson.unlocked ? "" : "locked"}"
          data-lesson-id="${lesson.id}"
        >
          <span class="lesson-item-order">${index + 1}</span>
          <span class="lesson-item-main">
            <strong>${window.DriveSchoolCommon.escapeHtml(lesson.title)}</strong>
            <small>${lesson.attempt_count || 0} lan lam bai</small>
          </span>
          ${statusHtml}
        </button>
      `;
    })
    .join("");

  lessonList.querySelectorAll("[data-lesson-id]").forEach((item) => {
    item.addEventListener("click", () => {
      const lessonId = item.dataset.lessonId;
      const lesson = (learningWorkspace.lessons || []).find((candidate) => candidate.id === lessonId);
      if (!lesson) return;
      if (!lesson.unlocked) {
        window.DriveSchoolCommon.showToast("Can hoan thanh bai truoc de mo khoa bai nay.", "warning");
        return;
      }

      currentLessonId = lessonId;
      renderLessonList();
      renderLessonContent(currentLessonId);
    });
  });
}

function renderLessonContent(lessonId) {
  const lessonContent = document.getElementById("lessonContent");
  const lesson = (learningWorkspace.lessons || []).find((item) => item.id === lessonId);

  if (!lessonContent) return;
  if (!lesson) {
    lessonContent.innerHTML = '<div class="text-muted">Chon mot bai hoc de bat dau.</div>';
    return;
  }

  const passScore = Number(lesson.pass_score || (lesson.questions || []).length || 0);
  const latestAttempt = lesson.latest_attempt || null;
  const canOpenQuiz = lesson.watched || lesson.completed;

  lessonContent.innerHTML = `
    <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
      <div>
        <h3 class="h4 mb-1">${window.DriveSchoolCommon.escapeHtml(lesson.title)}</h3>
        <p class="text-muted mb-0">${window.DriveSchoolCommon.escapeHtml(lesson.description || "")}</p>
      </div>
      <span class="compact-badge ${lesson.completed ? "" : "danger"}">
        <i class="fa-solid ${lesson.completed ? "fa-circle-check" : "fa-lock-open"}"></i>
        ${lesson.completed ? "Da hoan thanh" : "Chua hoan thanh"}
      </span>
    </div>

    <div class="lesson-video-shell mb-3">
      <video id="lessonVideoPlayer" class="lesson-video" controls preload="metadata">
        <source src="${window.DriveSchoolCommon.escapeHtml(lesson.video_url || "")}" type="video/mp4">
      </video>
      <p class="small text-muted mt-2 mb-0">Video lay tu assets. Khi xem het video, bai tap cua bai nay se duoc mo.</p>
    </div>

    <div class="lesson-quiz-shell">
      <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h4 class="h5 mb-0">Bai tap mo phong (${passScore}/${(lesson.questions || []).length} cau dung de dat)</h4>
        <span class="small text-muted">So lan lam: ${Number(lesson.attempt_count || 0)}</span>
      </div>

      ${
        canOpenQuiz
          ? ""
          : '<div class="alert alert-warning mb-3">Ban phai xem xong video bai nay truoc khi mo bai tap.</div>'
      }

      <div id="lessonQuizQuestions" class="lesson-quiz-questions ${canOpenQuiz ? "" : "locked"}">
        ${renderLessonQuestionsHtml(lesson)}
      </div>

      <div class="text-end mt-3">
        <button class="btn btn-primary" type="button" id="lessonQuizSubmit" ${canOpenQuiz ? "" : "disabled"}>Nop bai tap bai nay</button>
      </div>

      <div id="lessonQuizResult" class="mt-3">${renderLessonReportHtml(latestAttempt)}</div>
    </div>
  `;

  const videoPlayer = document.getElementById("lessonVideoPlayer");
  if (videoPlayer && !lesson.watched) {
    videoPlayer.addEventListener("ended", async () => {
      try {
        await window.DriveSchoolCommon.apiFetch(`/api/learning/lessons/${lesson.id}/watched`, { method: "POST" });
        window.DriveSchoolCommon.showToast("Da ghi nhan xem xong video. Bai tap da mo.", "success");
        await reloadLearningWorkspace(lesson.id);
      } catch (error) {
        window.DriveSchoolCommon.showToast(error.message, "danger");
      }
    });
  }

  const quizSubmitButton = document.getElementById("lessonQuizSubmit");
  if (quizSubmitButton) {
    quizSubmitButton.addEventListener("click", async () => {
      await submitLessonQuiz(lesson);
    });
  }
}

function renderLessonQuestionsHtml(lesson) {
  const questions = lesson.questions || [];
  if (!questions.length) {
    return '<div class="alert alert-light border mb-0">Chua co cau hoi cho bai nay.</div>';
  }

  return questions
    .map((question, index) => {
      const options = [
        ["A", question.option_a],
        ["B", question.option_b],
        ["C", question.option_c],
        ["D", question.option_d]
      ];

      return `
        <article class="question-card lesson-question-card" data-lesson-question-id="${question.id}">
          <h5 class="h6 mb-3">${index + 1}. ${window.DriveSchoolCommon.escapeHtml(question.question)}</h5>
          <div class="row g-2">
            ${options
              .map(
                ([value, label]) => `
                <div class="col-12 col-md-6">
                  <label class="form-check border rounded-4 p-3 d-flex gap-2 align-items-start">
                    <input class="form-check-input mt-1" type="radio" name="lesson_${lesson.id}_${question.id}" value="${value}">
                    <span><strong>${value}.</strong> ${window.DriveSchoolCommon.escapeHtml(label || "")}</span>
                  </label>
                </div>
              `
              )
              .join("")}
          </div>
        </article>
      `;
    })
    .join("");
}

function collectLessonAnswers(lesson) {
  const answers = {};
  let unanswered = 0;

  (lesson.questions || []).forEach((question) => {
    const checked = document.querySelector(`input[name=\"lesson_${lesson.id}_${question.id}\"]:checked`);
    if (!checked) {
      unanswered += 1;
      return;
    }
    answers[question.id] = checked.value;
  });

  return {
    answers,
    unanswered
  };
}

async function submitLessonQuiz(lesson) {
  const collected = collectLessonAnswers(lesson);
  if (collected.unanswered > 0) {
    window.DriveSchoolCommon.showToast(`Con ${collected.unanswered} cau chua tra loi.`, "warning");
    return;
  }

  try {
    const response = await window.DriveSchoolCommon.apiFetch(`/api/learning/lessons/${lesson.id}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers: collected.answers })
    });

    const result = response.data || {};
    window.DriveSchoolCommon.showToast(
      result.passed
        ? "Ban da dat bai tap nay. Neu co bai tiep theo, he thong se mo khoa tu dong."
        : "Ban chua dat. Hay xem giai thich ben duoi va lam lai.",
      result.passed ? "success" : "danger"
    );

    await reloadLearningWorkspace(lesson.id);
  } catch (error) {
    window.DriveSchoolCommon.showToast(error.message, "danger");
  }
}

function renderLessonReportHtml(attempt) {
  if (!attempt) {
    return "";
  }

  const status = attempt.passed
    ? '<span class="badge text-bg-success">Dat</span>'
    : '<span class="badge text-bg-danger">Chua dat</span>';

  const details = attempt.details || [];
  const detailRows = details
    .map((item, index) => {
      const rowStatus = item.is_correct
        ? '<span class="badge text-bg-success">Dung</span>'
        : '<span class="badge text-bg-danger">Sai</span>';

      return `
        <tr>
          <td>${index + 1}. ${window.DriveSchoolCommon.escapeHtml(item.question || "")}</td>
          <td>${window.DriveSchoolCommon.escapeHtml(item.selected || "-")}</td>
          <td>${window.DriveSchoolCommon.escapeHtml(item.correct_answer || "-")}</td>
          <td>${rowStatus}</td>
          <td>${window.DriveSchoolCommon.escapeHtml(item.explanation || "")}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="alert ${attempt.passed ? "alert-success" : "alert-danger"} mb-3">
      Ket qua gan nhat: ${attempt.score || 0}/${attempt.total || 0} cau dung (yeu cau ${attempt.pass_score || 0}) - ${status}
    </div>
    <div class="table-shell">
      <table class="table align-middle admin-table mb-0">
        <thead>
          <tr>
            <th>Cau hoi</th>
            <th>Ban chon</th>
            <th>Dap an</th>
            <th>Ket qua</th>
            <th>Giai thich</th>
          </tr>
        </thead>
        <tbody>
          ${detailRows || '<tr><td colspan="5" class="text-center text-muted py-3">Chua co chi tiet.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

async function initSimulationWorkspace() {
  try {
    await reloadSimulationWorkspace();
    bindSimulationSpaceHandler();
  } catch (error) {
    document.getElementById("simulationClipList").innerHTML = `<div class="alert alert-danger mb-0">${window.DriveSchoolCommon.escapeHtml(error.message)}</div>`;
  }
}

function bindSimulationSpaceHandler() {
  if (simulationKeyHandlerBound) return;
  simulationKeyHandlerBound = true;

  document.addEventListener("keydown", (event) => {
    if (event.code !== "Space") return;

    const active = Array.from(document.querySelectorAll(".simulation-video-player")).find((video) => !video.paused && !video.ended);
    if (!active) return;
    const clipId = active.dataset.clipId;
    if (!clipId || simulationAnswers[clipId] !== undefined) return;

    simulationAnswers[clipId] = Number(active.currentTime.toFixed(1));
    renderSimulationPressTag(clipId);
    window.DriveSchoolCommon.showToast(`Da ghi nhan Space tai ${simulationAnswers[clipId]} giay.`, "info");
    event.preventDefault();
  });
}

async function reloadSimulationWorkspace() {
  const response = await window.DriveSchoolCommon.apiFetch("/api/simulation/workspace");
  simulationWorkspace = response.data || { exam: null, clips: [], attempts: [] };
  simulationAnswers = {};
  renderSimulationWorkspace();
}

function renderSimulationWorkspace() {
  const exam = simulationWorkspace.exam;
  const clips = simulationWorkspace.clips || [];
  const attempts = simulationWorkspace.attempts || [];
  const examTitle = document.getElementById("simulationExamTitle");
  const examMeta = document.getElementById("simulationExamMeta");
  const clipList = document.getElementById("simulationClipList");
  const submitButton = document.getElementById("submitSimulationButton");
  const summary = document.getElementById("simulationAttemptSummary");

  if (!exam) {
    examTitle.textContent = "Chua co de mo phong duoc gan";
    examMeta.textContent = "";
    clipList.innerHTML = '<div class="text-muted">Admin chua tao de mo phong cho khoa hoc cua ban.</div>';
    submitButton.disabled = true;
    summary.innerHTML = "";
    return;
  }

  examTitle.textContent = exam.title;
  examMeta.textContent = `Diem dat ${exam.pass_score}/${(exam.total_clips || clips.length) * 5} - ${clips.length} tinh huong`;
  submitButton.disabled = clips.length === 0;

  clipList.innerHTML = clips
    .map(
      (clip, index) => `
        <article class="question-card simulation-clip-card">
          <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
            <h3 class="h5 mb-0">${index + 1}. ${window.DriveSchoolCommon.escapeHtml(clip.title)}</h3>
            <span class="compact-badge" id="simPressTag_${clip.id}">Chua bam Space</span>
          </div>
          <video class="lesson-video simulation-video-player" data-clip-id="${clip.id}" controls preload="metadata">
            <source src="${window.DriveSchoolCommon.escapeHtml(clip.video_url || "")}" type="video/mp4">
          </video>
          <p class="small text-muted mt-2 mb-0">Nhan phim Space khi nhan thay tinh huong nguy hiem.</p>
        </article>
      `
    )
    .join("");

  submitButton.onclick = submitSimulationExam;
  summary.innerHTML = renderSimulationLatestAttempt(attempts[0] || null);
}

function renderSimulationPressTag(clipId) {
  const tag = document.getElementById(`simPressTag_${clipId}`);
  if (!tag) return;
  const value = simulationAnswers[clipId];
  if (value === undefined) {
    tag.textContent = "Chua bam Space";
    return;
  }
  tag.textContent = `Space: ${value}s`;
}

async function submitSimulationExam() {
  const exam = simulationWorkspace.exam;
  const clips = simulationWorkspace.clips || [];
  if (!exam || !clips.length) return;

  const payloadAnswers = {};
  clips.forEach((clip) => {
    payloadAnswers[clip.id] = simulationAnswers[clip.id] !== undefined ? simulationAnswers[clip.id] : null;
  });

  try {
    const response = await window.DriveSchoolCommon.apiFetch(`/api/simulation/${exam.id}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers: payloadAnswers })
    });
    const result = response.data || {};
    window.DriveSchoolCommon.showToast(
      result.passed ? `Dat bai mo phong (${result.score}/${result.total}).` : `Chua dat (${result.score}/${result.total}).`,
      result.passed ? "success" : "danger"
    );
    await reloadSimulationWorkspace();
  } catch (error) {
    window.DriveSchoolCommon.showToast(error.message, "danger");
  }
}

function renderSimulationLatestAttempt(attempt) {
  if (!attempt) {
    return '<div class="text-muted">Chua co lan thi mo phong nao.</div>';
  }

  const details = attempt.details || [];
  const rows = details
    .map((item, index) => {
      const stateLabel =
        item.state === "correct"
          ? '<span class="badge text-bg-success">Dung</span>'
          : item.state === "early"
          ? '<span class="badge text-bg-warning">Som</span>'
          : item.state === "late"
          ? '<span class="badge text-bg-danger">Tre</span>'
          : '<span class="badge text-bg-secondary">Bo lo</span>';
      return `
        <tr>
          <td>${index + 1}. ${window.DriveSchoolCommon.escapeHtml(item.clip_title || "")}</td>
          <td>${item.pressed_at_sec === null || item.pressed_at_sec === undefined ? "-" : `${item.pressed_at_sec}s`}</td>
          <td>${stateLabel}</td>
          <td>${item.point || 0}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <div class="alert ${attempt.passed ? "alert-success" : "alert-danger"} mb-3">
      Lan gan nhat: ${attempt.score || 0} diem - ${attempt.passed ? "DAT" : "CHUA DAT"}
    </div>
    <div class="table-shell">
      <table class="table align-middle admin-table mb-0">
        <thead>
          <tr>
            <th>Tinh huong</th>
            <th>Bam luc</th>
            <th>Trang thai</th>
            <th>Diem</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

async function loadStudentWorkspace(currentUser) {
  const examsResponse = await window.DriveSchoolCommon.apiFetch("/api/exams");
  const allExams = examsResponse.data || [];
  currentResults = (await window.DriveSchoolCommon.apiFetch("/api/results")).data || [];

  const selectedExam = pickExamForStudent(allExams, currentUser.course_type);
  if (!selectedExam) {
    renderNoExamState();
    renderHistory([]);
    return;
  }

  currentExamId = selectedExam.id;
  const examResponse = await window.DriveSchoolCommon.apiFetch(`/api/exams/${selectedExam.id}/questions`);
  currentExam = examResponse.data.exam;

  renderExam(currentExam, examResponse.data.questions || []);
  renderCoursePanel(currentExam, currentUser, examResponse.data);
  renderHistory(currentResults);
  startTimer(Number(currentExam.duration_minutes || 20) * 60, () => submitExam(selectedExam.id, true));

  document.getElementById("submitExamButton").onclick = () => submitExam(selectedExam.id);
}

function pickExamForStudent(exams, courseType) {
  if (!exams.length) return null;
  const normalizedCourse = String(courseType || "").toUpperCase();
  return (
    exams.find((exam) => {
      const haystack = `${exam.id} ${exam.title}`.toUpperCase();
      return normalizedCourse && haystack.includes(normalizedCourse);
    }) || exams[0]
  );
}

function renderNoExamState() {
  document.getElementById("examTitle").textContent = t("exam.empty", "No active exam available.");
  document.getElementById("examMeta").textContent = "";
  document.getElementById("studentAssignedExam").textContent = t("student.noAssignedExam", "No exam assigned yet.");
  document.getElementById("studentPassScore").textContent = "-";
  document.getElementById("studentDuration").textContent = "-";
  document.getElementById("questionList").innerHTML = `<p class="text-muted mb-0">${t("exam.empty", "No active exam available.")}</p>`;
  document.getElementById("submitExamButton").disabled = true;
}

function renderCoursePanel(exam, currentUser, examResponse) {
  const attemptCount = Number(examResponse.attempt_count || 0);
  const latestAttempt = examResponse.latest_attempt;

  document.getElementById("studentAssignedExam").textContent = exam.title;
  document.getElementById("studentPassScore").textContent = `${exam.pass_score} ${t("student.points", "points")}`;
  document.getElementById("studentDuration").textContent = `${exam.duration_minutes} ${t("student.minutes", "minutes")}`;
  document.getElementById("studentAttemptCount").textContent = String(attemptCount);
  document.getElementById("studentLatestStatus").textContent = latestAttempt
    ? latestAttempt.passed
      ? t("result.pass", "PASSED")
      : t("result.fail", "FAILED")
    : t("student.notTaken", "Not taken");

  document.getElementById("examTitle").textContent = exam.title;
  document.getElementById("examMeta").textContent = `${exam.total_questions} ${t("student.questions", "questions")} - ${t("result.passScore", "Pass score")} ${exam.pass_score}`;

  if (attemptCount > 0) {
    document.getElementById("attemptInfo").textContent = `${t("exam.attemptInfo", "Previous attempts")}: ${attemptCount}`;
    document.getElementById("latestAttemptInfo").textContent = `${t("exam.latestAttempt", "Latest attempt")}: #${latestAttempt?.attempt_no || attemptCount} - ${latestAttempt?.passed ? t("result.pass", "PASSED") : t("result.fail", "FAILED")}`;
    window.DriveSchoolCommon.showToast(t("exam.toastRetakeAvailable", "This student can retake the exam. A new attempt will be saved."), "info");
  } else {
    document.getElementById("attemptInfo").textContent = `${t("exam.attemptInfo", "Previous attempts")}: 0`;
    document.getElementById("latestAttemptInfo").textContent = t("student.noAttemptCopy", "You have not submitted this exam yet.");
  }

  const resultLink = document.getElementById("studentResultLink");
  if (resultLink) {
    if (latestAttempt?.id) {
      resultLink.href = window.DriveSchoolCommon.withLangUrl(`/result.html?id=${latestAttempt.id}`);
    } else {
      resultLink.href = "#studentHistory";
    }
  }

  document.getElementById("studentCourseBadge").textContent = currentUser.course_type || "-";
}

function renderHistory(results) {
  const historyTable = document.getElementById("studentHistoryTable");
  const historyBadge = document.getElementById("studentHistoryBadge");

  historyBadge.textContent = `${results.length} ${t("student.attempts", "attempts")}`;
  historyTable.innerHTML = results.length
    ? results
      .map(
        (item) => `
          <tr>
            <td>#${item.attempt_no || 1}</td>
            <td>${window.DriveSchoolCommon.escapeHtml(item.exam_title || item.exam_id)}</td>
            <td>${window.DriveSchoolCommon.escapeHtml(String(item.score))}</td>
            <td>${item.passed ? `<span class="badge text-bg-success">${t("result.pass", "PASSED")}</span>` : `<span class="badge text-bg-danger">${t("result.fail", "FAILED")}</span>`}</td>
            <td><a class="btn btn-sm btn-outline-primary" href="${window.DriveSchoolCommon.withLangUrl(`/result.html?id=${item.id}`)}">${t("student.viewResult", "View result")}</a></td>
          </tr>
        `
      )
      .join("")
    : `<tr><td colspan="5" class="text-center text-muted py-4">${t("student.historyEmpty", "You have not taken any exams yet.")}</td></tr>`;
}

function renderExam(exam, questions) {
  document.getElementById("questionList").innerHTML = questions
    .map((question, index) => {
      const options = [
        ["A", question.option_a],
        ["B", question.option_b],
        ["C", question.option_c],
        ["D", question.option_d]
      ];

      return `
        <article class="question-card" data-question-id="${question.id}">
          <div class="d-flex justify-content-between align-items-start gap-3 mb-3">
            <div>
              <h3 class="h5 mb-2">${index + 1}. ${window.DriveSchoolCommon.escapeHtml(question.question)}</h3>
              ${question.is_critical ? `<span class="badge text-bg-danger">${t("admin.onlyCritical", "Critical")}</span>` : ""}
            </div>
          </div>
          <div class="row g-3">
            ${options
              .map(
                ([value, label]) => `
                <div class="col-12 col-md-6">
                  <label class="form-check border rounded-4 p-3 d-flex gap-2 align-items-start">
                    <input class="form-check-input mt-1" type="radio" name="question_${question.id}" value="${value}">
                    <span><strong>${value}.</strong> ${window.DriveSchoolCommon.escapeHtml(label)}</span>
                  </label>
                </div>
              `
              )
              .join("")}
          </div>
        </article>
      `;
    })
    .join("");
}

function startTimer(seconds, onExpire) {
  let remaining = seconds;
  renderTimer(remaining);
  timerInterval = setInterval(() => {
    remaining -= 1;
    renderTimer(Math.max(remaining, 0));
    if (remaining <= 0) {
      clearInterval(timerInterval);
      onExpire();
    }
  }, 1000);
}

function renderTimer(seconds) {
  const value = formatTime(seconds);
  document.getElementById("examTimer").textContent = value;
  document.getElementById("examTimerMirror").textContent = value;
}

function formatTime(seconds) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");
  return `${mins}:${secs}`;
}

function collectAnswers() {
  const answers = {};
  document.querySelectorAll("[data-question-id]").forEach((card) => {
    const checked = card.querySelector("input:checked");
    if (checked) {
      answers[card.dataset.questionId] = checked.value;
    }
  });
  return answers;
}

async function submitExam(examId, silent = false) {
  const submitButton = document.getElementById("submitExamButton");
  if (submitButton.disabled || !examId) return;
  submitButton.disabled = true;
  clearInterval(timerInterval);

  try {
    const response = await window.DriveSchoolCommon.apiFetch(`/api/exams/${examId}/submit`, {
      method: "POST",
      body: JSON.stringify({
        answers: collectAnswers()
      })
    });

    if (!silent) {
      window.DriveSchoolCommon.showToast(
        `${t("exam.toastSubmitted", "Exam submitted successfully.")} ${t("exam.attemptLabel", "Attempt")} #${response.data.attempt_no}.`,
        "success"
      );
    }

    window.location.href = window.DriveSchoolCommon.withLangUrl(`/result.html?id=${response.data.result_id}`);
  } catch (error) {
    window.DriveSchoolCommon.showToast(error.message, "danger");
    submitButton.disabled = false;
  }
}
