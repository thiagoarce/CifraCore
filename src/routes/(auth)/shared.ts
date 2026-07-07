// Shared helpers for the (auth) route group. Kept out of $lib/utils/ on purpose:
// constitution.md Lei 2 requires a unit test for every pure function placed in
// $lib/utils/, and this is a thin presentation-layer mapping, not critical domain logic.

/**
 * Maps Supabase Auth error messages (always in English) to a friendly PT-BR
 * message. Falls back to a generic message for anything unrecognized.
 */
export function mapAuthErrorMessage(message: string | undefined | null): string {
	const raw = (message ?? '').toLowerCase();

	if (raw.includes('invalid login credentials')) {
		return 'E-mail ou senha inválidos.';
	}
	if (raw.includes('email not confirmed')) {
		return 'Confirme seu e-mail antes de entrar.';
	}
	if (raw.includes('already registered') || raw.includes('already been registered')) {
		return 'Este e-mail já está cadastrado.';
	}
	if (raw.includes('password should be at least') || raw.includes('password should contain')) {
		return 'A senha precisa ter pelo menos 6 caracteres.';
	}
	if (raw.includes('unable to validate email address') || raw.includes('invalid email')) {
		return 'E-mail inválido.';
	}
	if (raw.includes('rate limit')) {
		return 'Muitas tentativas. Aguarde um momento e tente novamente.';
	}
	if (raw.includes('signup requires a valid password')) {
		return 'Informe uma senha válida.';
	}
	if (raw.length === 0) {
		return 'Ocorreu um erro. Tente novamente.';
	}

	return 'Ocorreu um erro. Tente novamente.';
}
