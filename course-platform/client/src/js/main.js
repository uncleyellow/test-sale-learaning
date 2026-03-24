document.addEventListener("DOMContentLoaded", async () => {
  await window.DriveSchoolI18n.loadTranslations();
  window.DriveSchoolCommon.initAOS();
  window.DriveSchoolCommon.initZaloBubble();
  initPackageCards();
  initRegistrationForm();
  initCounters();
  window.DriveSchoolCommon.trackVisit();
});

function t(key, fallback = "") {
  return window.DriveSchoolI18n.t(key, fallback);
}

function initPackageCards() {
  document.querySelectorAll(".package-card input[type='radio']").forEach((input) => {
    input.addEventListener("change", () => {
      document.querySelectorAll(".package-card").forEach((card) => card.classList.remove("active"));
      input.closest(".package-card").classList.add("active");
      const field = document.getElementById("courseType");
      if (field) {
        field.value = input.value;
      }
    });
  });
}

function initCounters() {
  document.querySelectorAll("[data-counter-target]").forEach((element) => {
    const target = Number(element.dataset.counterTarget || 0);
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 60));
    const interval = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(interval);
      }
      element.textContent = current.toLocaleString();
    }, 30);
  });
}

function initRegistrationForm() {
  const form = document.getElementById("registrationForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(form).entries());
    const submitButton = form.querySelector("button[type='submit']");

    if (!payload.name || !payload.phone || !payload.email || !payload.course_type) {
      window.DriveSchoolCommon.showToast(t("home.toastMissingFields", "Please complete all required fields."), "danger");
      return;
    }

    submitButton.disabled = true;
    try {
      await window.DriveSchoolCommon.apiFetch("/api/registrations", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      window.DriveSchoolCommon.showToast(t("home.toastRegistrationSuccess", "Registration submitted successfully."), "success");
      form.reset();
    } catch (error) {
      window.DriveSchoolCommon.showToast(error.message, "danger");
    } finally {
      submitButton.disabled = false;
    }
  });
}
