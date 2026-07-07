import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

// Second line of defense: hooks.server.ts already guards '/(app)' routes,
// but this keeps the group safe even if a route slips past the hook.
export const load: LayoutServerLoad = async ({ locals: { session } }) => {
	if (!session) {
		redirect(303, '/login');
	}

	return {};
};
