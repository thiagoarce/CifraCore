import { fail, redirect } from '@sveltejs/kit';

import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const bandName = String(formData.get('bandName') ?? '').trim();

		if (!bandName) {
			return fail(400, { error: 'Informe um nome para a banda.' });
		}

		const { data: newBandId, error } = await supabase.rpc('create_band', {
			band_name: bandName
		});

		if (error || !newBandId) {
			return fail(400, { error: error?.message ?? 'Não foi possível criar a banda.' });
		}

		redirect(303, `/bands/${newBandId}`);
	}
};
