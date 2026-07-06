import os

spec_md = """# SPEC.md - Intenção, Comportamento e Design (BDD)

## 1. Visão Geral e Diferenciais (SaaS Multi-Tenant)
O CifraCore é um PWA para bandas gerirem repertórios e sincronizarem cifras/partituras no palco com latência zero, suportando o "Modo Offline".

## 2. Design System e UI/UX
* **Paleta Dark Mode (Padrão de Palco):**
  * Fundo App: `bg-slate-900`
  * Fundo Containers: `bg-slate-800`
  * Texto Principal: `text-slate-50`
  * Texto Secundário (Voz Inativa): `text-slate-500` (opacity-50)
  * Destaque de Acorde (Voz Ativa): `text-amber-400`
* **Wireframe (Modo Palco Normal):**
  Header com controles de Tom -> Linha de Tabs (Letra, Cifra, Baixo, Partitura) -> Área de Cifra (Scroll) -> Rodapé Flutuante (Sugestão/Líder).
* **Modo Palco Extremo:** Injeção da classe `fullscreen-mode`. Oculta header e footer. Aciona `Wake Lock API` para impedir a tela de apagar.

## 3. Cenários de Comportamento (Gherkin)

### Funcionalidade: Sincronia de Palco Democrática
* **Dado** que a banda "Tarja Preta" possui uma `live_session` ativa
* **E** o músico "Thiago" está autenticado como `leader_id`
* **E** o músico "Membro X" está conectado na mesma sessão no 'Modo Banda'
* **Quando** o líder seleciona a música "Faroeste Caboclo" no setlist
* **Então** o sistema deve atualizar o `current_song_id` no Supabase
* **E** a tela de "Membro X" deve carregar a aba correspondente ao seu instrumento (`instrument` preferido em localStorage) em menos de 200ms.

### Funcionalidade: Importação Fricção Zero (HITL)
* **Dado** que o utilizador submeteu uma URL do CifraClub
* **Quando** a Edge Function retorna o JSON (AST) da cifra
* **Então** o sistema NÃO deve fazer INSERT no banco de dados ainda
* **E** deve renderizar a "Tela de Rascunho" (Draft) para correção de acordes/vozes
* **Quando** o utilizador clica em "Aprovar e Gravar"
* **Então** o sistema insere o payload validado.
"""

plan_md = """# PLAN.md - Arquitetura, Dados e Convenções

## 1. Infraestrutura e Stack
* **Frontend:** SvelteKit (PWA nativo). Hospedagem: **Cloudflare Pages** (usar `@sveltejs/adapter-cloudflare`).
* **Backend:** Supabase (PostgreSQL, Realtime Broadcast, Storage, Edge Functions em Deno).

## 2. Dependências Críticas de Engenharia
* **Tratamento de Notas:** `@tonaljs/tonal` (Obrigatório o uso através de um Wrapper defensivo para não quebrar com cifras sujas).
* **Renderização "Pro":** `AlphaTab` (para abas de arquivos `.gp` e MusicXML) e `pdf.js` (para PDFs de partitura).
* **Concorrência/Scroll:** `worker-timers` (para blindar relógios contra o iOS) e `svelte/motion` (`tweened`).

## 3. Esquema de Banco de Dados (PostgreSQL / RLS)
Todas as tabelas usam `UUID` e `created_at`. Isolamento Multi-Tenant via `band_id`.
* **bands:** `id`, `name`, `logo_url`. (RLS: Leitura p/ membros. Escrita p/ admin).
* **band_members:** `id`, `user_id`, `band_id`, `role` ('admin', 'member').
* **songs:** `id`, `band_id`, `title`, `artist`, `original_key`, `bpm`.
* **song_tabs:** `id`, `song_id`, `instrument` ('vocal', 'guitar', 'bass', 'drums', 'keys', 'cifra'), `content_type` ('ast', 'pdf_url', 'gpx_url'), `content` (jsonb / text).
* **live_sessions:** `id`, `band_id`, `setlist_id`, `leader_id`, `current_song_id`, `status`.

## 4. Contratos de Interface (API Payloads)
**Payload de Retorno da Edge Function (AST Draft):**
```json
{
  "success": true,
  "data": {
    "title": "Tempo Perdido",
    "artist": "Legião Urbana",
    "ast": [
      { "id": "uuid", "type": "verse", "label": "Parte 1", "content": "Todos os dias...", "repeats": 1, "role": "Ambos" }
    ]
  }
}