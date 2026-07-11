// Run: node --test batch-import.test.js
// (No --experimental-strip-types needed here: parseRepertoireLine never
// triggers the dynamic import of chordSheetParser.ts, which only happens
// inside importEntry() when actually processing a local-file entry.)
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseRepertoireLine } from './batch-import.js';

test('skips blank lines', () => {
	assert.equal(parseRepertoireLine(''), null);
	assert.equal(parseRepertoireLine('   '), null);
});

test('skips comment lines', () => {
	assert.equal(parseRepertoireLine('# isto é um comentário'), null);
	assert.equal(parseRepertoireLine('  # com espaço antes'), null);
});

test('parses a URL entry', () => {
	const entry = parseRepertoireLine(
		'Tempo Perdido; Legião Urbana; https://www.cifraclub.com.br/legiao-urbana/tempo-perdido/'
	);
	assert.deepEqual(entry, {
		title: 'Tempo Perdido',
		artist: 'Legião Urbana',
		source: 'https://www.cifraclub.com.br/legiao-urbana/tempo-perdido/',
		kind: 'url'
	});
});

test('parses a local .txt file entry', () => {
	const entry = parseRepertoireLine('Minha Música; Minha Banda; minha-musica.txt');
	assert.deepEqual(entry, {
		title: 'Minha Música',
		artist: 'Minha Banda',
		source: 'minha-musica.txt',
		kind: 'file'
	});
});

test('trims whitespace around each field', () => {
	const entry = parseRepertoireLine('  Título  ;  Artista  ;  musica.txt  ');
	assert.deepEqual(entry, {
		title: 'Título',
		artist: 'Artista',
		source: 'musica.txt',
		kind: 'file'
	});
});

test('allows an empty artist field', () => {
	const entry = parseRepertoireLine('Título Solo; ; musica.txt');
	assert.deepEqual(entry, { title: 'Título Solo', artist: '', source: 'musica.txt', kind: 'file' });
});

test('rejects a line with the wrong number of fields', () => {
	assert.throws(() => parseRepertoireLine('Título; Artista'), /esperado.*encontrado 2 campo/);
	assert.throws(() => parseRepertoireLine('Título; Artista; a.txt; extra'), /encontrado 4 campo/);
});

test('rejects a line with an empty title', () => {
	assert.throws(() => parseRepertoireLine('; Artista; musica.txt'), /título é obrigatório/);
});

test('rejects a line with an empty source', () => {
	assert.throws(() => parseRepertoireLine('Título; Artista; '), /obrigatório/);
});

test('rejects a local path that is not a .txt file', () => {
	assert.throws(
		() => parseRepertoireLine('Título; Artista; musica.pdf'),
		/deve ser um arquivo \.txt/
	);
});

test('never throws for well-formed input regardless of accents/case', () => {
	const entry = parseRepertoireLine('Canção Não-Óbvia; Grupo Ação; HTTPS://cifraclub.com.br/x/y/');
	assert.equal(entry.kind, 'url');
	assert.equal(entry.title, 'Canção Não-Óbvia');
});
