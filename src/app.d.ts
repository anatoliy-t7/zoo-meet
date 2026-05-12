import type { Language } from '$lib/languages';
// import type { Translator } from '$lib/i18n';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			locale: Language;
		}
		interface PageData {
			locale: Language;
			// t: Translator;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
