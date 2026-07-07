import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export interface BandMemberRow {
	id: string;
	userId: string;
	role: 'admin' | 'member';
	instrument: string | null;
}

export const load: PageLoad = async ({ parent, params, depends }) => {
	depends('app:band-members');

	const { supabase, user } = await parent();

	const { data: band, error: bandError } = await supabase
		.from('bands')
		.select('id, name, logo_url')
		.eq('id', params.id)
		.maybeSingle();

	if (bandError || !band) {
		error(404, 'Banda não encontrada.');
	}

	const { data: memberRows, error: membersError } = await supabase
		.from('band_members')
		.select('id, user_id, role, instrument')
		.eq('band_id', params.id);

	if (membersError) {
		error(404, 'Banda não encontrada.');
	}

	const members: BandMemberRow[] = (memberRows ?? []).map((row) => ({
		id: row.id,
		userId: row.user_id,
		role: row.role,
		instrument: row.instrument
	}));

	const isAdmin = members.some((member) => member.userId === user?.id && member.role === 'admin');

	return {
		band: { id: band.id, name: band.name, logoUrl: band.logo_url },
		members,
		isAdmin
	};
};
