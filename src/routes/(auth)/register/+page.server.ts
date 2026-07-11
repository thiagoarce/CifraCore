import { fail, redirect } from '@sveltejs/kit';

import { mapAuthErrorMessage } from '../shared';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const email = String(formData.get('email') ?? '');
		const password = String(formData.get('password') ?? '');
		const confirmPassword = String(formData.get('confirmPassword') ?? '');

		if (password !== confirmPassword) {
			return fail(400, { error: 'As senhas não coincidem.', email });
		}

		const { data, error } = await supabase.auth.signUp({ email, password });

		if (error) {
			return fail(400, { error: mapAuthErrorMessage(error.message), email });
		}

		if (data.session) {
			// E-mail confirmation disabled: Supabase already returns a session.
			redirect(303, '/dashboard');
		}

		// E-mail confirmation required before the user can sign in.
		return { confirmationPending: true };
	}
};
