let statsChart = null;
let examsCache = [];
let questionCache = [];
let usersCache = [];
let confirmActionHandler = null;

const adminState = {
  studentModal: null,
  examModal: null,
  questionModal: null,
  confirmModal: null
};

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
  if (currentUser.role !== "admin") {
    window.DriveSchoolCommon.redirectWithLang("/exam.html");
    return;
  }

  adminState.studentModal = new window.bootstrap.Modal(document.getElementById("studentModal"));
  adminState.examModal = new window.bootstrap.Modal(document.getElementById("examModal"));
  adminState.questionModal = new window.bootstrap.Modal(document.getElementById("questionModal"));
  adminState.confirmModal = new window.bootstrap.Modal(document.getElementById("confirmModal"));

  document.getElementById("adminName").textContent = currentUser.name;
  initModalResets();
  initControls();
  await refreshDashboard();
});

async function refreshDashboard() {
  await Promise.all([loadUsers(), loadExams()]);
  await loadStats();
}

async function loadStats() {
  const query = new URLSearchParams();
  const from = document.getElementById("filterDate").value;
  const course = document.getElementById("filterCourse").value;
  if (from) query.set("from", from);
  if (course) query.set("course", course);

  const response = await window.DriveSchoolCommon.apiFetch(`/api/admin/stats?${query.toString()}`);
  const stats = response.data;

  document.getElementById("statVisits").textContent = stats.totalVisits;
  document.getElementById("statRegistrations").textContent = stats.totalRegistrations;
  document.getElementById("statStudents").textContent = stats.totalStudents;
  document.getElementById("statPassed").textContent = stats.passedCount;
  document.getElementById("statFailed").textContent = stats.failedCount;
  document.getElementById("registrationCountBadge").textContent = `${stats.totalRegistrations} ${t("admin.statsRegistrations", "Registrations")}`;

  document.getElementById("registrationTable").innerHTML = stats.registrations
    .map(
      (item) => `
        <tr>
          <td>${window.DriveSchoolCommon.escapeHtml(item.name)}</td>
          <td>${window.DriveSchoolCommon.escapeHtml(item.phone)}</td>
          <td>${window.DriveSchoolCommon.escapeHtml(item.email)}</td>
          <td>${window.DriveSchoolCommon.escapeHtml(item.course_type)}</td>
          <td>${window.DriveSchoolCommon.formatDateTime(item.created_at)}</td>
        </tr>
      `
    )
    .join("");

  document.getElementById("resultTable").innerHTML = stats.results
    .map(
      (item) => {
        const user = usersCache.find((candidate) => candidate.id === item.user_id);
        const exam = examsCache.find((candidate) => candidate.id === item.exam_id);
        return `
        <tr>
          <td>${window.DriveSchoolCommon.escapeHtml(user?.name || item.user_id)}</td>
          <td>${window.DriveSchoolCommon.escapeHtml(exam?.title || item.exam_id)}</td>
          <td>${window.DriveSchoolCommon.escapeHtml(String(item.score))}</td>
          <td>${item.passed ? `<span class="badge text-bg-success">${t("admin.badgePass", "Pass")}</span>` : `<span class="badge text-bg-danger">${t("admin.badgeFail", "Fail")}</span>`}</td>
          <td>${item.failed_due_critical ? t("admin.badgeYes", "Yes") : t("admin.badgeNo", "No")}</td>
        </tr>
      `;
      }
    )
    .join("");

  renderStatsChart(stats.chart);
}

function renderStatsChart(chartData) {
  const chartCanvas = document.getElementById("statsChart");
  if (statsChart) {
    statsChart.destroy();
  }

  statsChart = new window.Chart(chartCanvas, {
    type: "bar",
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: t("admin.overview", "Overview"),
          data: chartData.values,
          borderRadius: 16,
          backgroundColor: ["#1565c0", "#ef6c00", "#03a9f4", "#2e7d32", "#c62828"].slice(0, chartData.values.length)
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          }
        }
      }
    }
  });
}

async function loadUsers() {
  const response = await window.DriveSchoolCommon.apiFetch("/api/admin/users");
  usersCache = response.data || [];
  document.getElementById("studentTable").innerHTML = usersCache
    .filter((item) => item.role === "student")
    .map(
      (item) => `
        <tr>
          <td>${window.DriveSchoolCommon.escapeHtml(item.name)}</td>
          <td>${window.DriveSchoolCommon.escapeHtml(item.email)}</td>
          <td>${window.DriveSchoolCommon.escapeHtml(item.course_type || "")}</td>
          <td>${window.DriveSchoolCommon.formatDateTime(item.created_at)}</td>
        </tr>
      `
    )
    .join("");
}

async function loadExams() {
  const response = await window.DriveSchoolCommon.apiFetch("/api/admin/exams");
  examsCache = response.data || [];

  document.getElementById("examTable").innerHTML = examsCache
    .map(
      (exam) => `
        <tr>
          <td>
            <div class="fw-semibold">${window.DriveSchoolCommon.escapeHtml(exam.title)}</div>
            <div class="text-muted small">#${window.DriveSchoolCommon.escapeHtml(exam.id)}</div>
          </td>
          <td>${window.DriveSchoolCommon.escapeHtml(String(exam.pass_score))}</td>
          <td>${window.DriveSchoolCommon.escapeHtml(String(exam.total_questions))}</td>
          <td>${window.DriveSchoolCommon.escapeHtml(String(exam.duration_minutes || 20))}</td>
          <td>${exam.active ? `<span class="compact-badge">${t("admin.badgeActive", "Active")}</span>` : `<span class="compact-badge danger">${t("admin.badgeInactive", "Hidden")}</span>`}</td>
          <td>
            <div class="d-flex flex-wrap gap-2">
              <button class="btn btn-sm btn-outline-primary" data-edit-exam="${exam.id}">${t("admin.edit", "Edit")}</button>
              <button class="btn btn-sm btn-outline-danger" data-delete-exam="${exam.id}">${t("admin.delete", "Delete")}</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");

  const examOptions = examsCache
    .map((exam) => `<option value="${exam.id}">${window.DriveSchoolCommon.escapeHtml(exam.title)}</option>`)
    .join("");

  document.getElementById("questionExamId").innerHTML = examOptions;
  document.getElementById("questionFilterExam").innerHTML = [
    `<option value="">${t("admin.allExams", "All exams")}</option>`,
    ...examsCache.map((exam) => `<option value="${exam.id}">${window.DriveSchoolCommon.escapeHtml(exam.title)}</option>`)
  ].join("");

  await loadQuestions();
}

async function loadQuestions() {
  const response = await window.DriveSchoolCommon.apiFetch("/api/admin/questions");
  questionCache = response.data || [];
  renderQuestionRows();
}

function renderQuestionRows() {
  const selectedExam = document.getElementById("questionFilterExam").value;
  const criticalFilter = document.getElementById("questionFilterCritical").value;
  const searchTerm = document.getElementById("questionSearchInput").value.trim().toLowerCase();

  const filteredQuestions = questionCache.filter((question) => {
    const matchesExam = !selectedExam || question.exam_id === selectedExam;
    const matchesCritical =
      criticalFilter === "all" ||
      (criticalFilter === "critical" && question.is_critical) ||
      (criticalFilter === "normal" && !question.is_critical);
    const haystack = `${question.question} ${question.exam_title} ${question.correct_answer} ${question.explanation || ""}`.toLowerCase();
    const matchesSearch = !searchTerm || haystack.includes(searchTerm);
    return matchesExam && matchesCritical && matchesSearch;
  });

  document.getElementById("questionTable").innerHTML = filteredQuestions.length
    ? filteredQuestions
      .map(
        (question) => `
          <tr>
            <td>
              <div class="fw-semibold question-snippet">${window.DriveSchoolCommon.escapeHtml(question.question)}</div>
              <div class="text-muted small">${window.DriveSchoolCommon.escapeHtml(question.explanation || "")}</div>
              <div class="text-muted small">#${window.DriveSchoolCommon.escapeHtml(question.id)}</div>
            </td>
            <td>${window.DriveSchoolCommon.escapeHtml(question.exam_title || question.exam_id)}</td>
            <td><span class="compact-badge">${window.DriveSchoolCommon.escapeHtml(question.correct_answer || "")}</span></td>
            <td>${question.is_critical ? `<span class="compact-badge danger">${t("admin.onlyCritical", "Critical")}</span>` : `<span class="compact-badge">${t("admin.onlyNormal", "Normal")}</span>`}</td>
            <td>
              <div class="d-flex flex-wrap gap-2">
                <button class="btn btn-sm btn-outline-primary" data-edit-question="${question.id}">${t("admin.edit", "Edit")}</button>
                <button class="btn btn-sm btn-outline-danger" data-delete-question="${question.id}">${t("admin.delete", "Delete")}</button>
              </div>
            </td>
          </tr>
        `
      )
      .join("")
    : `<tr><td colspan="5" class="text-center text-muted py-4">${t("admin.emptyQuestions", "No questions match the current filters.")}</td></tr>`;

  document.getElementById("questionCountBadge").textContent = `${filteredQuestions.length} ${t("admin.questions", "Questions")}`;
}

function initControls() {
  document.getElementById("filterButton").onclick = loadStats;
  document.getElementById("questionFilterExam").onchange = renderQuestionRows;
  document.getElementById("questionFilterCritical").onchange = renderQuestionRows;
  document.getElementById("questionSearchInput").oninput = renderQuestionRows;

  document.getElementById("openStudentModalButton").onclick = openStudentModal;
  document.getElementById("studentQuickAddButton").onclick = openStudentModal;
  document.getElementById("openExamModalButton").onclick = () => openExamModal();
  document.getElementById("examQuickAddButton").onclick = () => openExamModal();
  document.getElementById("openQuestionModalButton").onclick = () => openQuestionModal();
  document.getElementById("questionQuickAddButton").onclick = () => openQuestionModal();

  document.getElementById("createStudentForm").addEventListener("submit", handleStudentSubmit);
  document.getElementById("createExamForm").addEventListener("submit", handleExamSubmit);
  document.getElementById("createQuestionForm").addEventListener("submit", handleQuestionSubmit);
  document.getElementById("examTable").addEventListener("click", handleExamActions);
  document.getElementById("questionTable").addEventListener("click", handleQuestionActions);

  document.getElementById("confirmModalAction").onclick = async () => {
    if (confirmActionHandler) {
      await confirmActionHandler();
    }
  };

  document.getElementById("logoutButton").onclick = async () => {
    await window.DriveSchoolCommon.logoutAndRedirect();
  };
}

function initModalResets() {
  document.getElementById("studentModal").addEventListener("hidden.bs.modal", resetStudentForm);
  document.getElementById("examModal").addEventListener("hidden.bs.modal", resetExamForm);
  document.getElementById("questionModal").addEventListener("hidden.bs.modal", resetQuestionForm);
  document.getElementById("confirmModal").addEventListener("hidden.bs.modal", () => {
    confirmActionHandler = null;
    document.getElementById("confirmModalTitle").textContent = t("admin.confirmTitle", "Confirm action");
    document.getElementById("confirmModalText").textContent = t("admin.confirmBody", "Are you sure you want to continue?");
  });
}

function openStudentModal() {
  adminState.studentModal.show();
}

function openExamModal(exam = null) {
  resetExamForm();
  document.getElementById("examModalTitle").textContent = exam ? t("admin.editExam", "Edit exam") : t("admin.createExam", "Create or edit exam");
  if (exam) {
    document.getElementById("examId").value = exam.id;
    document.querySelector("#createExamForm [name='title']").value = exam.title;
    document.querySelector("#createExamForm [name='pass_score']").value = exam.pass_score;
    document.querySelector("#createExamForm [name='total_questions']").value = exam.total_questions;
    document.querySelector("#createExamForm [name='duration_minutes']").value = exam.duration_minutes || 20;
    document.getElementById("examActive").checked = Boolean(exam.active);
  }
  adminState.examModal.show();
}

function openQuestionModal(question = null) {
  resetQuestionForm();
  document.getElementById("questionModalTitle").textContent = question ? t("admin.editQuestion", "Edit question") : t("admin.createQuestion", "Create or edit question");
  if (question) {
    document.getElementById("questionId").value = question.id;
    document.getElementById("questionExamId").value = question.exam_id;
    document.querySelector("#createQuestionForm [name='question']").value = question.question;
    document.querySelector("#createQuestionForm [name='option_a']").value = question.option_a;
    document.querySelector("#createQuestionForm [name='option_b']").value = question.option_b;
    document.querySelector("#createQuestionForm [name='option_c']").value = question.option_c;
    document.querySelector("#createQuestionForm [name='option_d']").value = question.option_d;
    document.querySelector("#createQuestionForm [name='correct_answer']").value = question.correct_answer;
    document.querySelector("#createQuestionForm [name='explanation']").value = question.explanation || "";
    document.getElementById("questionCritical").checked = Boolean(question.is_critical);
  }
  adminState.questionModal.show();
}

function openConfirmModal({ title, message, onConfirm }) {
  document.getElementById("confirmModalTitle").textContent = title;
  document.getElementById("confirmModalText").textContent = message;
  confirmActionHandler = async () => {
    try {
      await onConfirm();
      adminState.confirmModal.hide();
    } catch (error) {
      window.DriveSchoolCommon.showToast(error.message, "danger");
    }
  };
  adminState.confirmModal.show();
}

async function handleStudentSubmit(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  try {
    await window.DriveSchoolCommon.apiFetch("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({ ...payload, role: "student" })
    });
    adminState.studentModal.hide();
    window.DriveSchoolCommon.showToast(t("admin.toastStudentCreated", "Student account created successfully."), "success");
    await refreshDashboard();
  } catch (error) {
    window.DriveSchoolCommon.showToast(error.message, "danger");
  }
}

async function handleExamSubmit(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  payload.active = document.getElementById("examActive").checked;
  try {
    const examId = payload.id;
    await window.DriveSchoolCommon.apiFetch(examId ? `/api/admin/exams/${examId}` : "/api/admin/exams", {
      method: examId ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    adminState.examModal.hide();
    window.DriveSchoolCommon.showToast(t("admin.toastExamSaved", "Exam saved successfully."), "success");
    await refreshDashboard();
  } catch (error) {
    window.DriveSchoolCommon.showToast(error.message, "danger");
  }
}

async function handleQuestionSubmit(event) {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
  payload.is_critical = document.getElementById("questionCritical").checked;
  try {
    const questionId = payload.id;
    await window.DriveSchoolCommon.apiFetch(questionId ? `/api/admin/questions/${questionId}` : "/api/admin/questions", {
      method: questionId ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    adminState.questionModal.hide();
    window.DriveSchoolCommon.showToast(t("admin.toastQuestionSaved", "Question saved successfully."), "success");
    await refreshDashboard();
  } catch (error) {
    window.DriveSchoolCommon.showToast(error.message, "danger");
  }
}

function handleExamActions(event) {
  const editButton = event.target.closest("[data-edit-exam]");
  const deleteButton = event.target.closest("[data-delete-exam]");

  if (editButton) {
    const exam = examsCache.find((item) => item.id === editButton.dataset.editExam);
    if (exam) {
      openExamModal(exam);
    }
    return;
  }

  if (deleteButton) {
    const exam = examsCache.find((item) => item.id === deleteButton.dataset.deleteExam);
    openConfirmModal({
      title: t("admin.deleteExamTitle", "Delete exam"),
      message: `${t("admin.deleteExamBody", "Are you sure you want to delete this exam?")} ${exam?.title || ""}`,
      onConfirm: async () => {
        await window.DriveSchoolCommon.apiFetch(`/api/admin/exams/${deleteButton.dataset.deleteExam}`, {
          method: "DELETE"
        });
        window.DriveSchoolCommon.showToast(t("admin.toastExamDeleted", "Exam deleted."), "success");
        await refreshDashboard();
      }
    });
  }
}

function handleQuestionActions(event) {
  const editButton = event.target.closest("[data-edit-question]");
  const deleteButton = event.target.closest("[data-delete-question]");

  if (editButton) {
    const question = questionCache.find((item) => item.id === editButton.dataset.editQuestion);
    if (question) {
      openQuestionModal(question);
    }
    return;
  }

  if (deleteButton) {
    const question = questionCache.find((item) => item.id === deleteButton.dataset.deleteQuestion);
    openConfirmModal({
      title: t("admin.deleteQuestionTitle", "Delete question"),
      message: `${t("admin.deleteQuestionBody", "Are you sure you want to delete this question?")} ${question?.question || ""}`,
      onConfirm: async () => {
        await window.DriveSchoolCommon.apiFetch(`/api/admin/questions/${deleteButton.dataset.deleteQuestion}`, {
          method: "DELETE"
        });
        window.DriveSchoolCommon.showToast(t("admin.toastQuestionDeleted", "Question deleted."), "success");
        await refreshDashboard();
      }
    });
  }
}

function resetStudentForm() {
  document.getElementById("createStudentForm").reset();
}

function resetExamForm() {
  document.getElementById("createExamForm").reset();
  document.getElementById("examId").value = "";
  document.getElementById("examActive").checked = true;
  document.getElementById("examModalTitle").textContent = t("admin.createExam", "Create or edit exam");
}

function resetQuestionForm() {
  document.getElementById("createQuestionForm").reset();
  document.getElementById("questionId").value = "";
  document.getElementById("questionCritical").checked = false;
  document.getElementById("questionModalTitle").textContent = t("admin.createQuestion", "Create or edit question");
}
