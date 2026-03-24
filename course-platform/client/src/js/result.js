document.addEventListener("DOMContentLoaded", async () => {
  await window.DriveSchoolI18n.loadTranslations();
  window.DriveSchoolCommon.initZaloBubble();
  window.DriveSchoolCommon.trackVisit();

  const currentUser = await window.DriveSchoolCommon.getCurrentUser();
  if (!currentUser) {
    window.DriveSchoolCommon.redirectWithLang("/login.html");
    return;
  }

  const logoutButton = document.getElementById("studentLogoutButton");
  if (logoutButton) {
    logoutButton.onclick = () => window.DriveSchoolCommon.logoutAndRedirect();
  }

  const params = new URLSearchParams(window.location.search);
  const resultId = params.get("id");
  if (!resultId) {
    window.DriveSchoolCommon.redirectWithLang("/exam.html");
    return;
  }

  const [resultResponse, historyResponse] = await Promise.all([
    window.DriveSchoolCommon.apiFetch(`/api/results/${resultId}`),
    window.DriveSchoolCommon.apiFetch("/api/results")
  ]);

  renderResult(resultResponse.data);
  renderHistory(historyResponse.data, resultId);
  renderAnswerReview(resultResponse.data);
});

function t(key, fallback = "") {
  return window.DriveSchoolI18n.t(key, fallback);
}

function renderResult(result) {
  const stateEl = document.getElementById("resultState");
  stateEl.textContent = result.passed ? t("result.pass", "PASSED") : t("result.fail", "FAILED");
  stateEl.classList.add(result.passed ? "pass" : "fail");
  document.getElementById("resultSummary").textContent = `${result.user?.name || ""} - ${result.exam?.title || ""}`;
  document.getElementById("attemptText").textContent = `${t("exam.attemptLabel", "Attempt")} #${result.attempt_no || 1}`;
  document.getElementById("scoreText").textContent = `${result.score}/${result.questions.length} - ${t("result.passScore", "Pass score")} ${result.exam?.pass_score || 0}`;
  document.getElementById("criticalText").textContent = result.failed_due_critical
    ? t("result.criticalFail", "Failed because of a critical question.")
    : t("result.noCriticalFail", "No critical-question failure detected.");
}

function renderHistory(results, activeResultId) {
  document.getElementById("historyCountBadge").textContent = `${results.length} ${t("result.historyCount", "attempts")}`;
  document.getElementById("historyTable").innerHTML = results.length
    ? results
      .map(
        (item) => `
          <tr class="${item.id === activeResultId ? "table-active" : ""}">
            <td>#${item.attempt_no || 1}</td>
            <td>${window.DriveSchoolCommon.escapeHtml(item.exam_title || item.exam_id)}</td>
            <td>${window.DriveSchoolCommon.escapeHtml(String(item.score))}</td>
            <td>${item.passed ? `<span class="badge text-bg-success">${t("result.pass", "PASSED")}</span>` : `<span class="badge text-bg-danger">${t("result.fail", "FAILED")}</span>`}</td>
            <td>${window.DriveSchoolCommon.formatDateTime(item.submitted_at)}</td>
            <td><a class="btn btn-sm btn-outline-primary" href="${window.DriveSchoolCommon.withLangUrl(`/result.html?id=${item.id}`)}">${t("result.historyView", "View")}</a></td>
          </tr>
        `
      )
      .join("")
    : `<tr><td colspan="6" class="text-center text-muted py-4">${t("result.historyEmpty", "No attempts yet.")}</td></tr>`;
}

function renderAnswerReview(result) {
  const reviewRows = (result.questions || []).map((question, index) => {
    const selectedAnswer = String(result.answers?.[question.id] || "").trim().toUpperCase();
    const correctAnswer = String(question.correct_answer || "").trim().toUpperCase();
    const isCorrect = selectedAnswer === correctAnswer;

    return `
      <tr>
        <td>
          <div class="fw-semibold">${index + 1}. ${window.DriveSchoolCommon.escapeHtml(question.question)}</div>
          ${question.is_critical ? `<div class="small text-danger mt-1">${t("admin.onlyCritical", "Critical")}</div>` : ""}
        </td>
        <td>${window.DriveSchoolCommon.escapeHtml(selectedAnswer || "-")}</td>
        <td>${window.DriveSchoolCommon.escapeHtml(correctAnswer || "-")}</td>
        <td>${isCorrect ? `<span class="badge text-bg-success">${t("result.answerCorrect", "Correct")}</span>` : `<span class="badge text-bg-danger">${t("result.answerWrong", "Wrong")}</span>`}</td>
        <td>${window.DriveSchoolCommon.escapeHtml(question.explanation || t("result.noExplanation", "No explanation available."))}</td>
      </tr>
    `;
  });

  document.getElementById("answerReviewTable").innerHTML = reviewRows.join("");
}
