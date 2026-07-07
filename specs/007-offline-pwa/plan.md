# Plan 007 — Offline e PWA

## Decisões Técnicas

- **`@vite-pwa/sveltekit` (Workbox)** para registro do SW, precache do shell com versionamento por build e fluxo de atualização (`registerType: 'prompt'`). Não escrever Service Worker manual para o shell — Workbox resolve o versionamento; código custom só onde há valor (camada de dados).
- **Separação estrita de responsabilidades:**
  - **Cache HTTP (Workbox):** app shell + assets estáticos + PDFs (rota de Storage com estratégia cache-first e allowlist do bucket).
  - **IndexedDB (camada própria):** dados estruturados (setlists, songs, song_tabs). Wrapper fino `$lib/offline/db.ts` sobre `idb` com stores: `setlists`, `songs`, `tabs`, `downloads` (estado por setlist: por-música ✓/✗/pending).
- **"Baixar Show"** = `downloadSetlist(setlistId)` em `$lib/offline/downloader.ts`: busca setlist + músicas + tabs via Supabase, grava em IndexedDB transacionalmente por música (falha de uma não corrompe as demais), PDFs via `cache.add()` no cache nomeado `pdfs-v1`. Progresso via store `$downloadProgress`. Retry re-processa apenas itens ≠ ✓.
- **Leitura offline:** as load functions da tela da música tentam rede com timeout curto (~3s) e caem para IndexedDB; flag `source: 'network' | 'local'` exposta para a UI exibir o badge. (Implementação num repositório único `$lib/offline/songRepository.ts` para a tela não conhecer a origem.)
- **Conectividade:** store `$online` combinando `navigator.onLine` + status do canal realtime (005) — `onLine` sozinho mente em rede de palco "conectada mas morta".
- **Persistência garantida:** solicitar `navigator.storage.persist()` no primeiro download de show (evita eviction do IndexedDB/cache pelo browser — requisito R6).

## Riscos Específicos

- SW é fácil de errar silenciosamente (cache velho servido para sempre, updates presos). Mitigações: `registerType: 'prompt'` com UI de update testada; nunca cachear respostas da API do Supabase no cache HTTP (só IndexedDB explícito); teste manual de update com dois builds em sequência documentado em `test-notes.md`.
- Quota de armazenamento em devices cheios: tratar `QuotaExceededError` no download com mensagem clara ("Espaço insuficiente — libere espaço de outros shows").
