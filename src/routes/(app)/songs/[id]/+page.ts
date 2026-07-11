import { error } from '@sveltejs/kit';

import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params, depends }) => {
	depends('app:song');

	const { supabase, bands } = await parent();

	const { data: song, error: songError } = await supabase
		.from('songs')
		.select('id, band_id, title, artist, original_key, preferred_key, capo, bpm')
		.eq('id', params.id)
		.maybeSingle();

	if (songError || !song) {
		error(404, 'Música não encontrada.');
	}

	const { data: tabRows, error: tabsError } = await supabase
		.from('song_tabs')
		.select('id, instrument, content_type, content, content_url')
		.eq('song_id', params.id);

	if (tabsError) {
		error(404, 'Música não encontrada.');
	}

	const membership = bands.find((band) => band.id === song.band_id);

	return {
		song,
		tabs: tabRows ?? [],
		isAdmin: membership?.role === 'admin',
		memberInstrument: membership?.instrument ?? null
	};
};
