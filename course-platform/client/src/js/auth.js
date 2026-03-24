document.addEventListener("DOMContentLoaded", async () => {
  await window.DriveSchoolI18n.loadTranslations();
  window.DriveSchoolCommon.initZaloBubble();
  window.DriveSchoolCommon.trackVisit();
  initLoginForm();
  guardLoggedIn();
});

function t(key, fallback = "") {
  return window.DriveSchoolI18n.t(key, fallback);
}

async function guardLoggedIn() {
  const currentUser = await window.DriveSchoolCommon.getCurrentUser();
  if (currentUser?.role === "admin") {
    window.DriveSchoolCommon.redirectWithLang("/admin.html");
  }
  if (currentUser?.role === "student") {
    window.DriveSchoolCommon.redirectWithLang("/exam.html");
  }
}

function initLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    const submitButton = form.querySelector("button[type='submit']");
    submitButton.disabled = true;

    try {
      const response = await window.DriveSchoolCommon.apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      window.DriveSchoolCommon.showToast(t("login.toastSuccess", "Login successful."), "success");
      if (response.data.user.role === "admin") {
        window.DriveSchoolCommon.redirectWithLang("/admin.html");
      } else {
        window.DriveSchoolCommon.redirectWithLang("/exam.html");
      }
    } catch (error) {
      window.DriveSchoolCommon.showToast(error.message, "danger");
    } finally {
      submitButton.disabled = false;
    }
  });
}
