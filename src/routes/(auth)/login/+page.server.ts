import { fail, redirect } from '@sveltejs/kit';

import { mapAuthErrorMessage } from '../shared';
import type { Actions } from './$types';

// Server-side form action instead of a client-side supabase.auth call +
// goto(): a client call followed by invalidate()+goto() races SvelteKit's
// own re-render of the current page against the explicit navigation (the
// dashboard's data fetch succeeds — 200 — but the browser never commits the
// navigation). A form action's redirect() is a single response the browser
// (via use:enhance's default handling) follows natively — no race.
export const actions: Actions = {
	default: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const email = String(formData.get('email') ?? '');
		const password = String(formData.get('password') ?? '');

		const { error } = await supabase.auth.signInWithPassword({ email, password });

		if (error) {
			return fail(400, { error: mapAuthErrorMessage(error.message), email });
		}

		redirect(303, '/dashboard');
	}
};
