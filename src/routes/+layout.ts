import { getTranslator } from '$lib/i18n';
import type { LayoutLoad } from './$types';
import { Language } from '$lib/languages';

export const load: LayoutLoad = async ({ data }) => {
	const { locale, ...props } = data;

	const t = await getTranslator(locale || Language.en);

	return { ...props, locale, t };
};
