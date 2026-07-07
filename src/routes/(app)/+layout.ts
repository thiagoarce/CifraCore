import type { LayoutLoad } from './$types';
import type { CurrentBand } from '$lib/stores/currentBand';
import type { Database } from '$lib/types/database';

export interface BandMembership extends CurrentBand {
	logoUrl: string | null;
	role: Database['public']['Enums']['band_role'];
	instrument: Database['public']['Enums']['instrument'] | null;
}

export const load: LayoutLoad = async ({ parent, depends }) => {
	// Re-run whenever a band is created/left so the list (and $currentBand
	// reconciliation) stays in sync across (app) routes.
	depends('app:bands');

	const { supabase, user } = await parent();

	if (!user) {
		return { bands: [] as BandMembership[] };
	}

	const { data: memberships, error: membershipsError } = await supabase
		.from('band_members')
		.select('band_id, role, instrument')
		.eq('user_id', user.id);

	if (membershipsError || !memberships || memberships.length === 0) {
		return { bands: [] as BandMembership[] };
	}

	const bandIds = memberships.map((membership) => membership.band_id);

	const { data: bandsData, error: bandsError } = await supabase
		.from('bands')
		.select('id, name, logo_url')
		.in('id', bandIds);

	if (bandsError || !bandsData) {
		return { bands: [] as BandMembership[] };
	}

	const bands: BandMembership[] = memberships
		.map((membership) => {
			const band = bandsData.find((b) => b.id === membership.band_id);
			if (!band) return null;

			return {
				id: band.id,
				name: band.name,
				logoUrl: band.logo_url,
				role: membership.role,
				instrument: membership.instrument
			} satisfies BandMembership;
		})
		.filter((band): band is BandMembership => band !== null);

	return { bands };
};
