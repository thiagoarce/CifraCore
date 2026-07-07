# Tasks 003 — Catálogo e UI Base

Depende de: 001 (auth/schema), 002 (dados importados para testar com conteúdo real).

- [ ] **T1 `[SONNET]` Design system** — config Tailwind com tokens semânticos das duas paletas (spec §Design System), store `$theme` (dark padrão, persistência, classe no `<html>`), componentes `ui/` básicos (Button, Card, Tabs, Modal, Input, Badge).
  **DoD:** cenário "Tema padrão" passa; nenhum hex fora da config; página de amostra exibe todos os componentes nos dois temas.

- [ ] **T2 `[SONNET]` AppShell + Dashboard** — layout `(app)` com Sidebar (seletor de banda usando `$currentBand`, navegação), dashboard com lista/busca de músicas e atalho "Importar".
  **DoD:** dashboard lista só músicas da banda ativa; busca filtra por título/artista; navegação mobile funciona (sidebar colapsável).

- [ ] **T3 `[SONNET]` Tela da música** — rota `songs/[id]` conforme wireframe: `SongHeader` (controles de tom desabilitados), `InstrumentTabs` (aba padrão pela preferência de instrumento), `AstRenderer` texto puro (fonte mono, `whitespace-pre`, `{#each}` com keys, badge de repetição "Nx"), `VoiceSelector` com opacidade de voz inativa, `FloatingFooter` com placeholders.
  **DoD:** cenários "Aba do instrumento preferido" e "Voz ativa em dueto" passam; usável em viewport de celular.

- [ ] **T4 `[SONNET]` Edição de música** — admin edita metadados (title, artist, keys, capo, bpm) e reabre blocos no componente de Rascunho da 002 (reuso, não cópia).
  **DoD:** edição persiste; member não vê botões de edição (e RLS bloqueia por baixo).
