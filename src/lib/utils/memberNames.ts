import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

/**
 * Maps user_id -> email for every member of a band, via the
 * get_band_member_emails RPC (auth.users is never readable directly by
 * clients). The UI uses the email as the display "name" — there is no
 * separate display-name concept in the schema yet.
 */
export async function fetchMemberEmails(
	supabase: SupabaseClient<Database>,
	bandId: string
): Promise<Map<string, string>> {
	const { data, error } = await supabase.rpc('get_band_member_emails', { target_band: bandId });

	if (error || !data) return new Map();

	return new Map(data.map((row) => [row.user_id, row.email]));
}
