import { redirect } from '@sveltejs/kit';

import type { Actions } from './$types';

// POST-only target for the Sidebar's logout form (action="/logout"); never
// meant to be visited directly. Same reasoning as the login/register form
// actions: signOut() + redirect() in one request/response cycle, no
// invalidate()+goto() race.
export const actions: Actions = {
	default: async ({ locals: { supabase } }) => {
		await supabase.auth.signOut();
		redirect(303, '/login');
	}
};

export const load = async () => {
	redirect(303, '/dashboard');
};
