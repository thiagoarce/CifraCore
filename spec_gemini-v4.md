# Documentação Oficial Definitiva - CifraCore (Agent-Ready SDD)

Este documento consolida 100% da arquitetura, especificações visuais/técnicas e regras agênticas do projeto CifraCore sob o padrão Spec-Driven Development (SDD).

## 1\. SPEC.md - Intenção, Comportamento e Design (BDD)

### 1.1. Visão Geral e Diferenciais (SaaS Multi-Tenant)

O CifraCore é um PWA para bandas gerirem repertórios e sincronizarem cifras/partituras no palco com latência zero, suportando o "Modo Offline".

### 1.2. Design System e UI/UX

- **Paleta Dark Mode (Padrão de Palco):** Fundo App: bg-slate-900 | Fundo Containers: bg-slate-800 | Texto Principal: text-slate-50 | Texto Secundário: text-slate-500 (opacity-50) | Destaque de Acorde: text-amber-400
- **Wireframe (Modo Palco Normal):** Header com controles de Tom -> Linha de Tabs (Letra, Cifra, Baixo, Partitura) -> Área de Cifra (Scroll) -> Rodapé Flutuante (Sugestão/Líder).
- **Modo Palco Extremo:** Injeção da classe fullscreen-mode. Oculta header e footer. Aciona Wake Lock API.

### 1.3. Cenários de Comportamento (Gherkin)

#### Sincronia de Palco Democrática

- **Dado** que a banda "Tarja Preta" possui uma live_session ativa
- **E** o músico "Thiago" está autenticado como leader_id
- **E** o músico "Membro X" está conectado na mesma sessão no 'Modo Banda'
- **Quando** o líder seleciona a música "Faroeste Caboclo" no setlist
- **Então** o sistema deve atualizar o current_song_id no Supabase
- **E** a tela de "Membro X" deve carregar a aba correspondente ao seu instrumento em menos de 200ms.

#### Importação Fricção Zero (HITL)

- **Dado** que o utilizador submeteu uma URL do CifraClub
- **Quando** a Edge Function retorna o JSON (AST) da cifra
- **Então** o sistema NÃO deve fazer INSERT no banco de dados ainda
- **E** deve renderizar a "Tela de Rascunho" (Draft) para correção de acordes/vozes
- **Quando** o utilizador clica em "Aprovar e Gravar"
- **Então** o sistema insere o payload validado.

## 2\. PLAN.md - Arquitetura, Dados e Convenções

### 2.1. Infraestrutura e Stack

- **Frontend:** SvelteKit (PWA nativo). Hospedagem: **Cloudflare Pages** (usar @sveltejs/adapter-cloudflare).
- **Backend:** Supabase (PostgreSQL, Realtime Broadcast, Storage, Edge Functions em Deno).

### 2.2. Dependências Críticas de Engenharia

- **Tratamento de Notas:** @tonaljs/tonal (Obrigatório uso através de Wrapper defensivo).
- **Renderização "Pro":** AlphaTab (para abas .gp e MusicXML) e pdf.js (para PDFs).
- **Concorrência/Scroll:** worker-timers (contra throttling iOS) e svelte/motion (tweened).

### 2.3. Esquema de Banco de Dados (PostgreSQL / RLS)

Todas as tabelas usam UUID e created_at. Isolamento Multi-Tenant via band_id.

- **bands:** id, name, logo_url. (RLS: Leitura p/ membros. Escrita p/ admin).
- **band_members:** id, user_id, band_id, role ('admin', 'member').
- **songs:** id, band_id, title, artist, original_key, bpm.
- **song_tabs:** id, song_id, instrument ('vocal', 'guitar', 'bass', 'drums', 'keys', 'cifra'), content_type ('ast', 'pdf_url', 'gpx_url'), content (jsonb / text).
- **live_sessions:** id, band_id, setlist_id, leader_id, current_song_id, status.

### 2.4. Contratos de Interface (API Payloads)

{  
"success": true,  
"data": {  
"title": "Tempo Perdido",  
"artist": "Legião Urbana",  
"ast": \[  
{ "id": "uuid", "type": "verse", "label": "Parte 1", "content": "Todos os dias...", "repeats": 1, "role": "Ambos" }  
\]  
}  
}

## 3\. TASKS.md - Execução Operacional (TDD e DoD)

_Atenção Agente: Siga estritamente o ciclo Red-Green-Refactor. Não implemente sem teste falhando._

- **Tarefa 1: Setup do Wrapper TonalJS (Defesa contra Cifras Sujas)**
  - **Red:** Criar testes garantindo que o wrapper separe a nota pura do sufixo, calcule a transposição e devolva a string formatada.
  - **Green:** Implementar src/lib/utils/tonalWrapper.ts.
  - **DoD:** 100% coverage. Se a nota for inválida, retorna o texto original sem dar throw.
- **Tarefa 2: Script de Bootstrapping (Data-First)**
  - **Red:** Criar teste para o parser de arquivo de texto local.
  - **Green:** Criar batch-import.js (Node.js) na raiz. Ele deve ler repertorio.txt e fazer os inserts no Supabase.
  - **DoD:** Script executa com sucesso localmente, sem depender de UI de Svelte.
- **Tarefa 3: Stores de Estado do SvelteKit**
  - **Red:** Testes unitários para \$renderedAST e \$liveSession.
  - **Green:** Implementação em src/lib/stores/.
  - **DoD:** \$renderedAST não muta o estado original.

## 4\. constitution.md - Leis Imutáveis do Agente

- **Desenvolvimento Orientado a Testes (TDD):** Código de produção sem teste prévio que falhe (Red) é violação crítica.
- **Spec-Anchored Development (Sem Deriva):** Mudanças arquiteturais ou de dependências devem ser propostas e alteradas no PLAN.md ANTES de serem codificadas.
- **Comunicação de Rede Limitada (Anti-Jitter):** O Supabase Realtime só pode trafegar eventos de estado (Triggers: PLAY, PAUSE). É estritamente proibido sincronizar posições de scroll via WebSocket. O relógio e o scroll rodam localmente com worker-timers.
- **Resiliência de UI (Degradação Graciosa):** Se o AlphaTab falhar, ou o Regex de acordes não entender um formato, o componente DEVE renderizar o formato puro (Fallback). Erros matemáticos não podem crachar a visualização do músico.
- **Prevenção de Renderização Massiva (DOM Size):** O Desdobramento Linear (Unroll) de refrões deve ser computado na camada de dados (JS) com chaves únicas {#each} para não saturar o Virtual DOM do Svelte.