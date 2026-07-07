# PLAN.md — CifraCore: Arquitetura Global

Fonte da verdade para stack, esquema de dados, contratos e convenções. Decisões específicas de cada feature ficam no `plan.md` da respectiva pasta em `specs/`. Mudanças aqui seguem a Lei 1 da `constitution.md` (documentar antes de codar).

---

## 1. Infraestrutura e Stack

| Camada     | Tecnologia                     | Observações                       |
| ---------- | ------------------------------ | --------------------------------- |
| Frontend   | SvelteKit (PWA, App Shell)     | Svelte 5, TypeScript estrito      |
| Hospedagem | Cloudflare Pages               | `@sveltejs/adapter-cloudflare`    |
| Estilo     | Tailwind CSS                   | Temas dark (padrão) / light       |
| Banco      | Supabase PostgreSQL            | RLS em todas as tabelas de tenant |
| Tempo real | Supabase Realtime              | Broadcast (eventos) + Presence    |
| Arquivos   | Supabase Storage               | Logos e PDFs, bucket por tipo     |
| Importação | Supabase Edge Functions (Deno) | Strategy Pattern por fonte        |
| Auth       | Supabase Auth                  | E-mail/senha no MVP               |

## 2. Dependências Críticas de Engenharia

- **`@tonaljs/tonal`** — toda a matemática e teoria musical (transposição, capo). **Uso obrigatório através do wrapper defensivo** `src/lib/utils/tonalWrapper.ts` — nunca chamar o Tonal direto de componentes (cifras "sujas" da web quebram a lib; ver risco R1).
- **`worker-timers`** — substitui `setInterval` nativo em qualquer clock que afete o DOM (auto-scroll). Roda em Web Worker para escapar do throttling de iOS/Android (risco R2).
- **`svelte/motion` (`tweened`)** — interpolação do auto-scroll proporcional (risco R3).
- **`pdf.js`** — visualização de partituras em PDF (spec 008).

## 3. Esquema de Banco de Dados (PostgreSQL / Supabase)

Todas as tabelas usam `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` e `created_at timestamptz DEFAULT now()`. Isolamento multi-tenant via `band_id`. DDL definitiva e políticas RLS completas em `specs/001-fundacao/plan.md`.

### 3.1. Tabelas Core

- **`bands`**: `id`, `name` (text, not null), `logo_url` (text, nullable).
- **`band_members`**: `id`, `user_id` (FK `auth.users`, not null), `band_id` (FK `bands`, not null), `role` (enum: `'admin'`, `'member'`), `instrument` (enum, preferência padrão do músico). UNIQUE (`user_id`, `band_id`).
- **`songs`**: `id`, `band_id` (FK `bands`), `title` (text), `artist` (text), `original_key` (text), `preferred_key` (text, nullable — tom em que a banda toca), `capo` (int, default 0), `bpm` (int, nullable), `source_url` (text, nullable — dedupe de importações).
- **`song_tabs`**: `id`, `song_id` (FK `songs`, ON DELETE CASCADE), `instrument` (enum: `'vocal'`, `'guitar'`, `'bass'`, `'drums'`, `'keys'`, `'cifra'`), `content_type` (enum: `'ast'`, `'pdf_url'`), `content` (jsonb para AST, text para URL).

### 3.2. Tabelas de Palco (Realtime)

- **`setlists`**: `id`, `band_id` (FK `bands`), `name` (text), `event_date` (date, nullable).
- **`setlist_songs`**: `id`, `setlist_id` (FK `setlists`, ON DELETE CASCADE), `song_id` (FK `songs`), `position` (int).
- **`live_sessions`**: `id`, `band_id` (FK `bands`, UNIQUE — uma sessão ativa por banda), `setlist_id` (FK `setlists`), `leader_id` (FK `auth.users`), `current_song_id` (FK `songs`, nullable), `status` (enum: `'idle'`, `'playing'`, `'paused'`).
- **`session_suggestions`**: `id`, `session_id` (FK `live_sessions`, ON DELETE CASCADE), `song_id` (FK `songs`), `suggested_by` (FK `auth.users`), `status` (enum: `'pending'`, `'accepted'`, `'dismissed'`).

### 3.3. Regras RLS (visão geral)

- **Leitura:** usuário só lê linhas cujo `band_id` conste em `band_members` para o seu `auth.uid()`.
- **Escrita em catálogo/setlists/banda:** apenas `role = 'admin'`.
- **Exceções democráticas:** qualquer `member` pode inserir em `session_suggestions` e assumir `leader_id` em `live_sessions`.
- **Convidado:** não usa RLS de membro; acesso via token assinado validado em Edge Function (ver `specs/005`).

## 4. Contratos de Tipagem (TypeScript)

Interfaces canônicas em `$lib/types/`. Contrato central do conteúdo musical:

```typescript
// $lib/types/ast.ts
export interface ASTBlock {
	id: string; // UUID obrigatório (chave do {#each})
	type: 'verse' | 'chorus' | 'solo' | 'bridge' | 'intro' | 'outro';
	label: string; // ex: "Parte 1", "Refrão"
	content: string; // linhas com acordes inline: "[Am]Letra..."
	repeats: number; // >= 1; unroll acontece na camada de dados
	role?: string; // voz em duetos: "João", "Maria", "Todos"
}
```

**Payload da Edge Function `import-tab` (estado Draft — nunca gravado direto):**

```json
// Request (Frontend -> Edge)
{ "url": "https://www.cifraclub.com.br/legiao-urbana/tempo-perdido/" }

// Response (Edge -> Frontend)
{
  "success": true,
  "data": {
    "title": "Tempo Perdido",
    "artist": "Legião Urbana",
    "original_key": "C",
    "ast": [
      { "id": "uuid", "type": "verse", "label": "Parte 1", "content": "Todos os dias...", "repeats": 1, "role": "Todos" }
    ]
  }
}
```

**Eventos Realtime (broadcast — payload completo em `specs/005`):** `PLAY`, `PAUSE`, `CHANGE_SONG`, `RESYNC`, `LEADER_CHANGE`, `SUGGESTION`. Nunca dados contínuos (Lei 3).

## 5. Gestão de Estado no Frontend (Stores SvelteKit)

- **`$currentBand`** — banda ativa do usuário (persistida em localStorage).
- **`$liveSession`** — estado realtime da sessão; rejeita payloads sem `leader_timestamp` válido.
- **`$renderedAST`** — derived store: AST original + transposição/capo via tonalWrapper, **sem mutar** o dado original.
- **`$scrollProgress`** — tweened store do auto-scroll, clock via worker-timers.
- **`$theme`** — dark (padrão) / light.
- Preferência de instrumento do usuário: localStorage (`instrument`), com fallback para `band_members.instrument`.

## 6. Convenções de Caminhos

- Componentes de UI: `$lib/components/ui/*`
- Componentes de domínio: `$lib/components/{song,setlist,stage}/*`
- Contratos e tipos: `$lib/types/*`
- Stores: `$lib/stores/*`
- Utilitários puros (sem side-effects, 100% testáveis): `$lib/utils/*`
- Edge Functions: `supabase/functions/*`
- Migrações SQL: `supabase/migrations/*`

## 7. Registro de Riscos e Mitigações

| #   | Risco                                                                                                                         | Mitigação                                                                                                                                 | Feature dona |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| R1  | TonalJS é rigoroso; cifras "sujas" da web (regionalismos, `A(add9)`, inversões truncadas) retornam `empty` ou quebram a linha | Sanitizer via regex antes do Tonal; se ainda falhar, mantém o acorde original como texto puro (Lei 4)                                     | `004`        |
| R2  | iOS/Android suspendem Web Workers com tela apagada → metrônomo/scroll "saltam" ao reativar                                    | Wake Lock API obrigatória ao entrar no Modo Palco                                                                                         | `006`        |
| R3  | `tweened` do auto-scroll briga com o dedo do músico (stuttering)                                                              | `touchstart`/`wheel`/`mousedown` pausam o tweened imediatamente; botão flutuante "Retomar Sincronia"                                      | `006`        |
| R4  | Rede de palco caótica satura WebSocket se sincronizar scroll contínuo                                                         | Só eventos de estado via Realtime; clock local em cada device; líder pode emitir `RESYNC` (Lei 3)                                         | `005`        |
| R5  | Scraping frágil: CifraClub muda HTML; Ultimate Guitar bloqueia servidores (403/WAF)                                           | Scraper é acelerador, não dependência: Modo Avançado (colar texto) é o caminho primário; User-Agent de navegador real; UG fica no backlog | `002`        |
| R6  | Unroll de músicas repetitivas gera DOM gigante e engasgos em devices antigos                                                  | Unroll computado na camada de dados antes do render; array imutável; `{#each}` com keys (Lei 6)                                           | `004`        |

## 8. Modelo de Delegação

Ver tabela mestre em `TASKS.md`. Resumo do critério: **Fable** executa o que envolve segurança, concorrência/tempo real, parsing defensivo e infraestrutura; **Sonnet** executa UI, CRUD e integrações com contrato fechado, sempre a partir do spec detalhado da feature.
