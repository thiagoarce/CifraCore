# Tasks 008 — Arquivos e PDF

Depende de: 001 (schema/RLS), 003 (tela da música). Integrações: 006 (auto-scroll no container PDF), 007 (cache offline).

- [ ] **T1 `[FABLE]` Buckets + políticas de Storage** — migração `0003_storage_policies.sql`: buckets `scores`/`logos`, políticas por `band_id` no path conforme plan, limites de tamanho.
      **DoD:** cenário "Isolamento de tenant no Storage" passa com teste automatizado de dois usuários; URL assinada expirada nega acesso.

- [ ] **T2 `[SONNET]` Upload de PDF e logo** — `FileUpload.svelte` (validação MIME/tamanho), fluxo admin na música (criar/substituir tab `pdf_url` com instrumento), upload de logo na tela da banda; URLs assinadas geradas server-side conforme plan.
      **DoD:** cenário "Upload e visualização" (parte do upload) passa; member não vê controles de upload.

- [ ] **T3 `[SONNET]` Visualizador PDF** — `PdfViewer.svelte` com `pdfjs-dist` (import dinâmico), renderização lazy por página, zoom (botões + pinch), modo contínuo, boundary de erro com "Abrir em nova aba".
      **DoD:** cenários "Upload e visualização" (parte da leitura) e "PDF corrompido" passam; PDF de 30 páginas fluido em device modesto; worker validado em preview do Cloudflare Pages.

- [ ] **T4 `[FABLE]` Integrações offline e palco** — PDFs no fluxo "Baixar Show" (007) servidos do cache `pdfs-v1`; auto-scroll da 006 rolando o container do PDF quando a tab ativa é partitura.
      **DoD:** visualização offline em modo avião passa; auto-scroll funciona numa tab PDF em sessão ao vivo.
