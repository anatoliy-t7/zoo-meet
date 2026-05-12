export enum Language {
	en = 'en', // English
	de = 'de', // German
	fr = 'fr', // French
	es = 'es', // Spanish
	it = 'it', // Italian
}

// used only in survey settings
export const LANGUAGES = [
	{ value: Language.en, label: 'English' },
	{ value: Language.de, label: 'Deutsch' },
	{ value: Language.fr, label: 'Français' },
	{ value: Language.es, label: 'Español' },
	{ value: Language.it, label: 'Italiano' },
];

export const findLanguage = (lang: Language) => {
	return LANGUAGES.find((language) => language.value === lang);
};
