(function () {
  let dictionary = {};

  function getByKey(source, key) {
    return key.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : null), source);
  }

  async function loadTranslations() {
    const lang = window.DriveSchoolCommon.getLang();
    const response = await fetch(`/src/i18n/${lang}.json`);
    dictionary = await response.json();
    applyTranslations();
    initSwitcher();
    return dictionary;
  }

  function t(key, fallback = "") {
    return getByKey(dictionary, key) ?? fallback;
  }

  function applyTranslations() {
    document.documentElement.lang = window.DriveSchoolCommon.getLang();

    document.querySelectorAll("[data-i18n]").forEach((element) => {
      const value = t(element.dataset.i18n, element.textContent);
      element.textContent = value;
    });

    document.querySelectorAll("[data-i18n-html]").forEach((element) => {
      const value = t(element.dataset.i18nHtml, element.innerHTML);
      element.innerHTML = value;
    });

    document.querySelectorAll("[data-i18n-meta]").forEach((element) => {
      const value = t(element.dataset.i18nMeta, element.getAttribute("content") || "");
      element.setAttribute("content", value);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      const value = t(element.dataset.i18nPlaceholder, element.getAttribute("placeholder") || "");
      element.setAttribute("placeholder", value);
    });

    const titleKey = document.body.dataset.pageTitle;
    if (titleKey) {
      document.title = t(titleKey, document.title);
    }
  }

  function initSwitcher() {
    document.querySelectorAll("[data-lang-switch]").forEach((button) => {
      const active = button.dataset.langSwitch === window.DriveSchoolCommon.getLang();
      const inactiveClass = button.classList.contains("btn-outline-light") ? "btn-outline-light" : "btn-outline-secondary";
      button.classList.toggle("btn-primary", active);
      button.classList.toggle("btn-outline-secondary", false);
      button.classList.toggle("btn-outline-light", false);
      button.classList.toggle(inactiveClass, !active);
      button.onclick = () => {
        window.DriveSchoolCommon.setLang(button.dataset.langSwitch);
        window.location.reload();
      };
    });
  }

  window.DriveSchoolI18n = {
    loadTranslations,
    t
  };
})();
