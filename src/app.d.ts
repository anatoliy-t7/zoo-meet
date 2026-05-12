import type { Language } from '$lib/shared/languages';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			locale: Language;
		}
		interface PageData {
			locale: Language;
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
