# PRD.md — CifraCore: Especificação de Produto

## 1. Visão do Produto

O **CifraCore** é um Web App Responsivo (PWA) para bandas gerenciarem seus repertórios e sincronizarem cifras/partituras em tempo real no palco. O sistema é **multi-tenant**: um mesmo músico pode participar de várias bandas, cada uma com catálogo, setlists e sessões ao vivo isolados.

### Diferenciais Competitivos

1. **Multi-Visão por Instrumento** — Uma música, várias abas: Letra, Cifra, Baixo, Partitura (PDF). Cada músico vê a visão do seu instrumento.
2. **Importação com Revisão (HITL)** — Colar texto ou importar por URL; o conteúdo sempre passa por uma Tela de Rascunho para validação humana antes de ser gravado.
3. **Liderança Democrática** — Qualquer membro sugere músicas e pode assumir o controle do setlist durante a sessão ao vivo.
4. **Tolerância a "Palco Sem Internet"** — Cache offline agressivo via Service Worker + pré-cache explícito do setlist ("Baixar Show").
5. **Feito para o palco** — Dark mode padrão, Modo Palco Extremo (visão de túnel), Wake Lock, auto-scroll com pausa por toque, suporte a pedal Bluetooth.

## 2. Personas e Cenário de Uso

- **O Líder do show:** monta o setlist, controla qual música está ativa; todos os devices da banda acompanham.
- **O Músico:** entra na sessão, vê a aba do seu instrumento no tom da banda, com acordes destacados; usa pedal ou toque para rolar.
- **O Substituto (convidado):** recebe um link temporário read-only para acompanhar o show de hoje sem criar conta na banda.
- **O Administrador da banda:** gerencia membros, catálogo e importações.

## 3. Stack Tecnológico (resumo — detalhes no PLAN.md)

- **Frontend:** SvelteKit (PWA) + Tailwind CSS, hospedado no Cloudflare Pages.
- **Backend:** Supabase — PostgreSQL (com RLS), Realtime (Broadcast/Presence), Storage (logos e PDFs), Edge Functions (Deno) para importação.
- **Motor musical:** `@tonaljs/tonal` atrás de wrapper defensivo.

## 4. Funcionalidades

### 4.1. Núcleo (MVP)

| # | Funcionalidade | Feature Spec |
|---|---|---|
| F1 | Autenticação, bandas, membros e papéis (admin/member) | `specs/001-fundacao` |
| F2 | Catálogo de músicas por banda, com abas por instrumento | `specs/001-fundacao`, `specs/003-catalogo-ui` |
| F3 | Importação "Modo Avançado" (colar texto → parser → AST) | `specs/002-importacao` |
| F4 | Importação por URL (scraper CifraClub) com Tela de Rascunho (HITL) | `specs/002-importacao` |
| F5 | Bootstrapping em lote (`batch-import.js` lendo `repertorio.txt`) | `specs/002-importacao` |
| F6 | Destaque visual de acordes + transposição de tom (±1 semitom) + capotraste | `specs/004-inteligencia-musical` |
| F7 | Tom preferido salvo por banda (`preferred_key`) | `specs/004-inteligencia-musical` |
| F8 | Setlists (CRUD + ordenação) | `specs/005-setlists-sync` |
| F9 | Sessão ao vivo: sync realtime por eventos, liderança democrática, sugestões, presença | `specs/005-setlists-sync` |
| F10 | Modo Convidado via link assinado (read-only, escopo = show atual) | `specs/005-setlists-sync` |
| F11 | Modo Palco (normal e Extremo), Wake Lock, auto-scroll, pausa por toque, pedal Bluetooth | `specs/006-modo-palco` |
| F12 | PWA offline + pré-cache do setlist ("Baixar Show") | `specs/007-offline-pwa` |
| F13 | Upload e visualização de PDFs (partituras) | `specs/008-arquivos-pdf` |

### 4.2. Backlog (pós-MVP — ver `specs/BACKLOG.md`)

AlphaTab (.gp/MusicXML), Construtor manual de tablaturas, scraper Ultimate Guitar, metrônomo audível, anotações pessoais por músico, exportação de setlist em PDF.

## 5. Decisões de Produto e Ajustes sobre a Ideia Original

Registro das mudanças feitas na consolidação dos specs (avaliação crítica sobre a versão do Gemini):

**Mantido como estava (decisões corretas):**
- Sincronia por gatilhos de evento, nunca scroll contínuo via rede.
- HITL na importação (rascunho antes de gravar).
- Wrapper defensivo do TonalJS com degradação graciosa.
- Catálogo por banda (não global) — RLS mais simples e isolamento claro.

**Alterado:**
1. **Scraping rebaixado de "coração da Fase 1" para acelerador.** O caminho primário de entrada de conteúdo é o **Modo Avançado** (colar texto), que é robusto e 100% sob nosso controle. O scraper do CifraClub vem depois, como conveniência. Motivos: fragilidade (mudanças de HTML, WAF) e risco de direitos autorais sobre conteúdo de terceiros. Ultimate Guitar saiu do roadmap comprometido (bloqueia servidores com 403) e virou backlog "se viável".
2. **Modo Convidado simplificado:** link assinado com token de curta duração em vez de RLS temporário. Menos superfície de erro de segurança.
3. **Metrônomo audível movido para backlog.** O que o palco precisa é o *clock* do auto-scroll; metrônomo sonoro sincronizado entre devices é um problema difícil (latência de áudio) de pouco valor real — o baterista dá o tempo.

**Adicionado:**
1. **Capotraste (capo)** por música/banda — transposição visual ≠ capo; guitarristas precisam dos dois.
2. **Tom preferido por banda** (`preferred_key`) — a banda canta no tom dela; a transposição ao vivo parte desse tom, não do original.
3. **Pré-cache explícito do setlist ("Baixar Show")** — botão que baixa todas as músicas/tabs/PDFs do setlist com indicador de progresso. Cache passivo não garante que a música 12 esteja disponível no palco.
4. **Presença na sessão ao vivo** (Supabase Presence) — ver quem está conectado é essencial para confiar na sincronia.
5. **Fila de sugestões modelada** — a ideia "Sugerir Música" agora tem modelo de dados e payload definidos (tabela `session_suggestions`).

## 6. Roadmap de Desenvolvimento

As fases mapeiam 1:1 para as pastas de `specs/`. Dependências no `TASKS.md`.

- **Fase 1 — Fundação** (`001`): SvelteKit + Tailwind + Supabase, autenticação, schema completo, RLS.
- **Fase 2 — Importação Data-First** (`002`): parser texto→AST, Modo Avançado, Tela de Rascunho, scraper CifraClub, `batch-import.js`. *O banco é populado antes de existir UI de catálogo.*
- **Fase 3 — Catálogo e UI** (`003`): design system, dashboard, tela da música com abas por instrumento.
- **Fase 4 — Inteligência Musical** (`004`): destaque de acordes, transposição, capo, tom preferido, unroll.
- **Fase 5 — Setlists e Sincronia** (`005`): setlists, sessão ao vivo, liderança, sugestões, presença, convidado.
- **Fase 6 — Modo Palco** (`006`): modo extremo, Wake Lock, auto-scroll, pedal Bluetooth.
- **Fase 7 — Offline** (`007`): PWA, Service Worker, pré-cache do show.
- **Fase 8 — Arquivos** (`008`): Storage e visualizador de PDF.
