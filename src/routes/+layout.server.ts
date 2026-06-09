import { type RequestEvent } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { env } from '$env/dynamic/public';

export const load: LayoutServerLoad = async ({ locals }: RequestEvent) => {
	return {
		locale: locals.locale,
    enableTracking: env.PUBLIC_ENABLE_TRACKING === 'true',
    brandName: env.PUBLIC_BRAND_NAME || 'ZooMeet',
	};
	};
};
