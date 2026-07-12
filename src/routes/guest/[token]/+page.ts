import { fetchGuestState } from '$lib/utils/guestState';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch }) => {
	const state = await fetchGuestState(params.token, fetch);
	return { token: params.token, state };
};
