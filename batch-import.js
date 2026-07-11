#!/usr/bin/env -S node --experimental-strip-types
// Bootstrapping (Data-First) script — spec 002-importacao R5, plan.md.
//
// Reads a repertoire file and imports every entry directly into a band's
// catalog, bypassing the Tela de Rascunho (HITL) review that every other
// import path (Modo Avançado, URL) goes through. This is a conscious
// trade-off for populating a band's catalog in bulk before any UI exists
// to browse it — see the --help text for the explicit warning.
//
// Usage:
//   node --experimental-strip-types batch-import.js <repertorio.txt> --band <band_id>
//   npm run batch-import -- <repertorio.txt> --band <band_id>   (same thing)
//
// Requires SUPABASE_URL (or PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_KEY
// in the environment. The --experimental-strip-types flag is Node's native
// TypeScript loader (stable since Node 22.6): it lets this plain-JS script
// reuse the real $lib/utils/chordSheetParser.ts (the same parser the app
// and the import-tab Edge Function use) for local .txt entries, instead of
// a third hand-maintained copy of that logic.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const HELP_TEXT = `
Uso:
  node --experimental-strip-types batch-import.js <repertorio.txt> --band <band_id>

Popula o catálogo de uma banda em lote, lendo um arquivo de repertório.

  ATENÇÃO — este script GRAVA DIRETO no banco, sem passar pela Tela de
  Rascunho (HITL) que todo outro caminho de importação exige. Use apenas
  para bootstrapping consciente de dados antes do catálogo existir na UI;
  revise o repertório.txt com cuidado antes de rodar.

Formato do arquivo (uma entrada por linha):
  Título; Artista; URL-ou-arquivo.txt

  - Linhas em branco e linhas iniciadas com "#" são ignoradas (comentários).
  - Se o terceiro campo for uma URL (http/https), a Edge Function
    "import-tab" busca e faz o parsing da cifra remotamente.
  - Se for um caminho de arquivo .txt (relativo ao repertorio.txt), o texto
    é lido localmente e processado pelo mesmo parser do Modo Avançado.

Exemplo: veja repertorio.example.txt.

Variáveis de ambiente obrigatórias:
  SUPABASE_URL (ou PUBLIC_SUPABASE_URL)   URL do projeto Supabase
  SUPABASE_SERVICE_KEY                     service role key (nunca a anon key)
`;

/**
 * Parses one line of a repertoire file. Pure function — no I/O — so it's
 * unit-tested directly (constitution law 2: parsing logic needs tests).
 * Returns null for blank/comment lines, throws a descriptive Error for a
 * malformed non-comment line (the caller turns that into a per-line
 * failure instead of aborting the batch, per spec R5's Gherkin scenario).
 */
export function parseRepertoireLine(rawLine) {
	const line = rawLine.trim();
	if (line === '' || line.startsWith('#')) {
		return null;
	}

	const parts = line.split(';').map((part) => part.trim());
	if (parts.length !== 3) {
		throw new Error(
			`formato inválido: esperado "Título; Artista; URL-ou-arquivo.txt", encontrado ${parts.length} campo(s)`
		);
	}

	const [title, artist, source] = parts;
	if (!title) {
		throw new Error('título é obrigatório');
	}
	if (!source) {
		throw new Error('URL ou caminho de arquivo é obrigatório');
	}

	const kind = /^https?:\/\//i.test(source) ? 'url' : 'file';
	if (kind === 'file' && !source.toLowerCase().endsWith('.txt')) {
		throw new Error(`caminho local deve ser um arquivo .txt (recebido "${source}")`);
	}

	return { title, artist, source, kind };
}

function parseArgs(argv) {
	if (argv.includes('--help') || argv.includes('-h')) {
		return { help: true };
	}

	const bandFlagIndex = argv.indexOf('--band');
	const bandId = bandFlagIndex !== -1 ? argv[bandFlagIndex + 1] : undefined;
	const file = argv.find((arg, index) => !arg.startsWith('-') && argv[index - 1] !== '--band');

	return { help: false, file, bandId };
}

async function importEntry(supabase, bandId, entry, repertoireDir) {
	let originalKey = null;
	let ast;

	if (entry.kind === 'url') {
		const { data: fnData, error: fnError } = await supabase.functions.invoke('import-tab', {
			body: { url: entry.source }
		});
		if (fnError) {
			throw new Error(`falha ao chamar import-tab: ${fnError.message}`);
		}
		if (!fnData?.success) {
			throw new Error(fnData?.error?.message ?? 'import-tab retornou falha desconhecida');
		}
		originalKey = fnData.data.original_key ?? null;
		ast = fnData.data.ast;
	} else {
		const { parseChordSheet } = await import('./src/lib/utils/chordSheetParser.ts');
		const filePath = resolve(repertoireDir, entry.source);
		const rawText = readFileSync(filePath, 'utf-8');
		ast = parseChordSheet(rawText);
	}

	if (!ast || ast.length === 0) {
		throw new Error('nenhum bloco reconhecido no conteúdo');
	}

	const { data: songId, error } = await supabase.rpc('import_song', {
		target_band: bandId,
		song_title: entry.title,
		song_artist: entry.artist,
		song_original_key: originalKey ?? '',
		tab_instrument: 'cifra',
		tab_content: ast,
		song_source_url: entry.kind === 'url' ? entry.source : undefined
	});

	if (error || !songId) {
		throw new Error(error?.message ?? 'import_song não retornou um id');
	}

	return songId;
}

export async function runBatchImport({ repertoirePath, bandId, supabase, log = console.log }) {
	const repertoireDir = dirname(repertoirePath);
	const lines = readFileSync(repertoirePath, 'utf-8').split(/\r?\n/);

	let successCount = 0;
	const failures = [];

	for (let i = 0; i < lines.length; i++) {
		const lineNumber = i + 1;
		let entry;
		try {
			entry = parseRepertoireLine(lines[i]);
		} catch (err) {
			failures.push({ lineNumber, reason: err.message });
			continue;
		}
		if (entry === null) continue;

		try {
			const songId = await importEntry(supabase, bandId, entry, repertoireDir);
			successCount++;
			log(`  OK    linha ${lineNumber}: "${entry.title}" -> ${songId}`);
		} catch (err) {
			failures.push({ lineNumber, reason: err.message });
			log(`  FALHA linha ${lineNumber}: ${err.message}`);
		}
	}

	return { successCount, failures };
}

async function main() {
	const { help, file, bandId } = parseArgs(process.argv.slice(2));

	if (help) {
		console.log(HELP_TEXT);
		return;
	}

	if (!file || !bandId) {
		console.error('Erro: informe o arquivo de repertório e --band <band_id>.\n');
		console.log(HELP_TEXT);
		process.exitCode = 1;
		return;
	}

	const supabaseUrl = process.env.SUPABASE_URL ?? process.env.PUBLIC_SUPABASE_URL;
	const serviceKey = process.env.SUPABASE_SERVICE_KEY;

	if (!supabaseUrl || !serviceKey) {
		console.error(
			'Erro: defina SUPABASE_URL (ou PUBLIC_SUPABASE_URL) e SUPABASE_SERVICE_KEY no ambiente.'
		);
		process.exitCode = 1;
		return;
	}

	const supabase = createClient(supabaseUrl, serviceKey);
	const repertoirePath = resolve(process.cwd(), file);

	console.log(`Importando "${repertoirePath}" para a banda ${bandId}...\n`);

	const { successCount, failures } = await runBatchImport({ repertoirePath, bandId, supabase });

	console.log('');
	console.log(`Importadas: ${successCount}`);
	console.log(`Falhas: ${failures.length}`);

	process.exitCode = successCount === 0 && failures.length > 0 ? 1 : 0;
}

// Only run when executed directly (`node batch-import.js`), not when
// imported by the test file.
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
