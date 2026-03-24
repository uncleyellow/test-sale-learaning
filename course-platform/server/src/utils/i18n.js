// This file provides utility functions for handling internationalization.

const i18n = {
    currentLanguage: 'en',
    translations: {
        en: {},
        vi: {}
    },

    loadTranslations: function(lang) {
        return fetch(`/src/i18n/${lang}.json`)
            .then(response => response.json())
            .then(data => {
                this.translations[lang] = data;
            });
    },

    setLanguage: function(lang) {
        this.currentLanguage = lang;
    },

    translate: function(key) {
        return this.translations[this.currentLanguage][key] || key;
    }
};

export default i18n;