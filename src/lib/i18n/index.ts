// https://poly-i18n.vercel.app/en/kitbook/docs/3-use-with-sveltekit

import en from './locales/en.json';
import { goto } from '$app/navigation';
import type { RequestEvent } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { LANGUAGES, Language } from '$lib/languages';
import type { RouteId } from '$app/types';
import { env } from '$env/dynamic/public';
import { enumFromString } from '$lib/utils';

export const DEFAULT_LOCALE = Language.en;

const VARIABLE_PLACEHOLDER = /{(?<key>\w+)}/g;

const loadedTranslations: Record<string, typeof en> = {
  en // start with English as default language. does not lazy load because we need it as fallback
};




const findByKey = (key: string, locale: string): string | null => {
  const dict = loadedTranslations[locale] as Record<string, string> | undefined;
  if (!dict) return null;
  const resolved = dict[key] ?? null;
  return resolved;
};

export type Translator = Awaited<ReturnType<typeof getTranslator>>;

export async function getTranslator(locale: Language) {
  locale = getSupportedLocale(locale);

  if (!loadedTranslations[locale]) {
    loadedTranslations[locale] = (await import(`./locales/${locale}.json`)).default;
  }



  return (key: string, values?: Record<string, string | number | null | undefined>): string => {
    const localeResult = findByKey(key, locale);

    if (localeResult && env.PUBLIC_ENABLE_TEST_OVERFLOW_I18N === 'true') {
      return `${'x'.repeat(localeResult.length)} ${'x'.repeat(localeResult.length)} ${'x'.repeat(localeResult.length)}`;
    }

    if (!localeResult && dev) {
      const error = `missing ${locale} translation for "${key}"`;

      console.warn(error);

      return `❌ ${key} ❌`;
    }

    if (localeResult) {
      return interpolate(localeResult, values);
    }

    return key;
  };
}

function interpolate(
  template: string,
  values?: Record<string, string | number | null | undefined>
): string {
  if (!values) return template;

  return template.replace(VARIABLE_PLACEHOLDER, (match, key) => {
    const value = values[key];
    if (value !== null && value !== undefined) {
      return String(value);
    } else {
      return match;
    }
  });
}

export function changeLocale(locale: string, url: URL) {
  setLocaleCookie(locale);
  goto(url, { invalidateAll: true });
}

function setLocaleCookie(locale: string) {
  const HUNDRED_YEARS = 60 * 60 * 24 * 365 * 100; // seconds * minutes * hours * days * years
  document.cookie = `locale=${locale}; max-age=${HUNDRED_YEARS}; path=/; samesite=strict`;
}

export function getSupportedLocale(userLocale: Language | null): Language {
  return userLocale && Object.keys(LANGUAGES).includes(String(userLocale))
    ? userLocale
    : DEFAULT_LOCALE;
}

export function getPathLocale(pathname: string): Language | null {
  const pathSegments = pathname.split('/');

  const pathSegment = pathSegments[0];
  if (!pathSegment) return null;

  const lang = enumFromString(Language, pathSegment);
  if (!lang) return Language.en;

  return lang;
}

export function getLocaleFromHeaders(headers: Headers): Language {
  const languages = headers.get('accept-language')?.split(',') || [];

  const language = languages[0];
  if (!language) return Language.en;

  const twoLetter = language.trim().split('-')[0];
  if (!twoLetter) return Language.en;

  const lang = enumFromString(Language, twoLetter);
  if (!lang) return Language.en;

  return lang;
}

export function getLocaleFromCookies(cookies: RequestEvent['cookies']): Language | null {
  return cookies.get('locale') ? (cookies.get('locale') as Language) : null;
}

export function getLocale(
  event: RequestEvent<Partial<Record<string, string>>, RouteId | null>
): Language {
  // first check URL path for language (highest priority)
  const pathLocale = getPathLocale(event.url.pathname);
  if (pathLocale) {
    return pathLocale;
  }

  const chosenLocale = getLocaleFromCookies(event.cookies);
  const acceptedLanguage = getLocaleFromHeaders(event.request.headers);

  return getSupportedLocale(chosenLocale || acceptedLanguage);
}
