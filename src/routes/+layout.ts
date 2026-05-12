import { getTranslator } from '$lib/i18n';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data }) => {
  const { locale, ...props } = data;

  const t = await getTranslator(locale);

  return { ...props, locale, t };
};
