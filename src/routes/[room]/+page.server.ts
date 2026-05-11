import { env } from '$env/dynamic/public';

import type { PageServerLoad } from './$types';

/** Exposes public config at request time so production builds pick up container/process env. */
export const load: PageServerLoad = async () => {
	return {
		publicLivekitUrl: env.PUBLIC_LIVEKIT_URL ?? '',
		publicBrandName: env.PUBLIC_BRAND_NAME ?? 'ZooMeet',
	};
};
