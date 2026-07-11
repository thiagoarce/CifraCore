import { createServerClient } from '@supabase/ssr';
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { Database } from '$lib/types/database';

const supabase: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient<Database>(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_ANON_KEY,
		{
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (cookiesToSet) => {
					cookiesToSet.forEach(({ name, value, options }) => {
						event.cookies.set(name, value, { ...options, path: '/' });
					});
				}
			}
		}
	);

	/**
	 * getSession() alone reads the (unverified) cookie. To trust the session
	 * we also call getUser(), which validates the JWT against the auth server.
	 */
	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) {
			return { session: null, user: null };
		}

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		if (error || !user) {
			return { session: null, user: null };
		}

		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};

const authGuard: Handle = async ({ event, resolve }) => {
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	const routeId = event.route.id ?? '';

	// Only the "already logged in" case redirects server-side. The
	// unauthenticated case can't redirect here: a Supabase email-confirmation
	// link lands on "/" with the session in a URL fragment (never sent to the
	// server), so root's own +page.svelte has to render, let the browser
	// client pick up the fragment client-side, and redirect from there.
	if (routeId === '/' && session) {
		redirect(303, '/dashboard');
	}

	if (!session && routeId.startsWith('/(app)')) {
		redirect(303, '/login');
	}

	if (session && routeId.startsWith('/(auth)')) {
		redirect(303, '/dashboard');
	}

	return resolve(event);
};

export const handle = sequence(supabase, authGuard);
