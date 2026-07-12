import { error } from '@sveltejs/kit';

import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params, depends }) => {
	depends('app:setlist');

	const { supabase, bands } = await parent();

	const { data: setlist, error: setlistError } = await supabase
		.from('setlists')
		.select('id, band_id, name, event_date')
		.eq('id', params.id)
		.maybeSingle();

	if (setlistError || !setlist) {
		error(404, 'Setlist não encontrado.');
	}

	const { data: items, error: itemsError } = await supabase
		.from('setlist_songs')
		.select('id, song_id, position, songs (title, artist, original_key)')
		.eq('setlist_id', params.id)
		.order('position');

	if (itemsError) {
		error(404, 'Setlist não encontrado.');
	}

	const membership = bands.find((band) => band.id === setlist.band_id);

	return {
		setlist,
		items: items ?? [],
		isAdmin: membership?.role === 'admin'
	};
};
