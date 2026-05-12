import { type RequestEvent } from '@sveltejs/kit';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }: RequestEvent) => {
	return {
		locale: locals.locale,
	};
};
