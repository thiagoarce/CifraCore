# Tasks 007 — Offline e PWA

Depende de: 003 (telas), 005 (status do canal para `$online`), 008 (PDFs — T3 pode fechar sem PDFs se a 008 ainda não existir, com TODO rastreado).

- [ ] **T1 `[FABLE]` PWA base + estratégia de cache do shell** — `@vite-pwa/sveltekit`, manifest (ícones, standalone, tema dark), `registerType: 'prompt'` com UI "Nova versão disponível", allowlist de rotas cacheáveis (proibido cachear API Supabase no HTTP cache).
  **DoD:** Lighthouse instalável; cenário "Atualização do app" passa com dois builds sequenciais; roteiro em `test-notes.md`.

- [ ] **T2 `[FABLE]` Camada IndexedDB + repositório** — `$lib/offline/db.ts` (idb, stores do plan), `songRepository.ts` (network-first com timeout → fallback local, flag de origem), `navigator.storage.persist()`.
  **DoD:** testes automatizados: salvar/ler setlist e música, fallback quando fetch rejeita, remoção limpa.

- [ ] **T3 `[FABLE]` Downloader "Baixar Show"** — `downloadSetlist` transacional por música, PDFs no cache `pdfs-v1`, estado por item, retry só do que falta, tratamento de `QuotaExceededError`.
  **DoD:** cenários "Baixar Show completo" e "Falha parcial no download" passam (simular queda com DevTools offline no meio do lote).

- [ ] **T4 `[SONNET]` UI de download e conectividade** — botão "Baixar Show" com progresso (n/total) e estados ✓/✗/retry por música, ação "Liberar espaço", badge global offline, aviso "Sem conexão — modo individual" integrando `$online` ao modo da sessão.
  **DoD:** cenário "Tocar offline" passa em modo avião em device real, incluindo reintegração à sessão quando a rede volta.
