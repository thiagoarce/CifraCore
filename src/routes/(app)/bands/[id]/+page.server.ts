import { fail, redirect } from '@sveltejs/kit';

import type { Actions } from './$types';

export const actions: Actions = {
	leave: async ({ params, locals: { supabase, user } }) => {
		const { error } = await supabase
			.from('band_members')
			.delete()
			.eq('band_id', params.id)
			.eq('user_id', user!.id);

		if (error) {
			return fail(400, { leaveError: 'Não foi possível sair da banda.' });
		}

		redirect(303, '/bands');
	}
};
