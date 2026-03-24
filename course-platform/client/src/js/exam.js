let timerInterval = null;
let currentExamId = null;
let currentExam = null;
let currentResults = [];

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

  initStudentActions();
  renderStudentHeader(currentUser);
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
