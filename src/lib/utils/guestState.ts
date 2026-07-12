import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { Database } from '$lib/types/database';

type Instrument = Database['public']['Enums']['instrument'];

export interface GuestSongTab {
	id: string;
	instrument: Instrument;
	content_type: Database['public']['Enums']['tab_content_type'];
	content: unknown;
	content_url: string | null;
}

export interface GuestSong {
	id: string;
	title: string;
	artist: string | null;
	original_key: string | null;
	preferred_key: string | null;
	capo: number;
}

export type GuestState =
	| { status: 'invalid' }
	| { status: 'ok'; bandId: string; song: GuestSong | null; tabs: GuestSongTab[] };

/**
 * Fetches the guest-access Edge Function's /state endpoint. No Supabase
 * session exists for a guest (R8), so this uses the public anon key as the
 * gateway's required Authorization Bearer — the anon key is itself a
 * valid, low-privilege JWT; the actual authorization is the signed guest
 * token itself, verified inside the function (never RLS, since the guest
 * never has a Supabase session to run RLS as).
 */
export async function fetchGuestState(token: string, fetchFn: typeof fetch): Promise<GuestState> {
	const url = `${PUBLIC_SUPABASE_URL}/functions/v1/guest-access/state?token=${encodeURIComponent(token)}`;

	const response = await fetchFn(url, {
		headers: {
			apikey: PUBLIC_SUPABASE_ANON_KEY,
			authorization: `Bearer ${PUBLIC_SUPABASE_ANON_KEY}`
		}
	});

	if (!response.ok) return { status: 'invalid' };

	const body = (await response.json()) as {
		success: boolean;
		data?: { band_id: string; song: GuestSong | null; tabs: GuestSongTab[] };
	};

	if (!body.success || !body.data) return { status: 'invalid' };

	return { status: 'ok', bandId: body.data.band_id, song: body.data.song, tabs: body.data.tabs };
}
