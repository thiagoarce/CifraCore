import type { Database } from '$lib/types/database';

type Instrument = Database['public']['Enums']['instrument'];

/** Short labels for space-constrained UI (instrument tabs). The import
 * form's dropdown uses its own, more descriptive labels on purpose. */
export const INSTRUMENT_TAB_LABELS: Record<Instrument, string> = {
	cifra: 'Cifra',
	vocal: 'Vocal',
	guitar: 'Violão',
	bass: 'Baixo',
	drums: 'Bateria',
	keys: 'Teclado'
};
