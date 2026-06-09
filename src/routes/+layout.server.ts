import { type RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/public';

import type { LayoutServerLoad } from './$types';

/** Exposes public config at request time so production builds pick up container/process env. */
export const load: LayoutServerLoad = async ({ locals }: RequestEvent) => {
	return {
		locale: locals.locale,
		enableTracking: env.PUBLIC_ENABLE_TRACKING === 'true',
		brandName: env.PUBLIC_BRAND_NAME ?? 'ZooMeet',
	};
};
