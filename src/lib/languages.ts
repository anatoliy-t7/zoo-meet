export enum Language {
	en = 'en', // English
	de = 'de', // German
	fr = 'fr', // French
	es = 'es', // Spanish
	it = 'it', // Italian
	nl = 'nl', // Dutch
	pt = 'pt', // Portuguese
	pl = 'pl', // Polish
	cs = 'cs', // Czech
	ro = 'ro', // Romanian
	no = 'no', // Norwegian
	uk = 'uk', // Ukrainian
	da = 'da', // Danish
	fi = 'fi', // Finnish
	ar = 'ar', // Arabic
	gr = 'gr', // Greek
	my = 'my', // Malay
	ru = 'ru', // Russian
	sv = 'sv', // Swedish
	tr = 'tr', // Turkish
}

// used only in survey settings
export const LANGUAGES = [
	{ value: Language.en, label: 'English' },
	{ value: Language.de, label: 'Deutsch' },
	{ value: Language.fr, label: 'Français' },
	{ value: Language.es, label: 'Español' },
	{ value: Language.it, label: 'Italiano' },
	{ value: Language.nl, label: 'Nederlands' },
	{ value: Language.pt, label: 'Português' },
	{ value: Language.pl, label: 'Polski' },
	{ value: Language.cs, label: 'Čeština' },
	{ value: Language.ro, label: 'Română' },
	{ value: Language.no, label: 'Norsk' },
	{ value: Language.uk, label: 'Українська' },
	{ value: Language.da, label: 'Dansk' },
	{ value: Language.fi, label: 'Suomi' },
	{ value: Language.ar, label: 'العربية' },
	{ value: Language.gr, label: 'Ελληνικά' },
	{ value: Language.my, label: 'Bahasa Melayu' },
	{ value: Language.ru, label: 'Русский' },
	{ value: Language.sv, label: 'Svenska' },
	{ value: Language.tr, label: 'Türkçe' },
];

export const findLanguage = (lang: Language) => {
	return LANGUAGES.find((language) => language.value === lang);
};
