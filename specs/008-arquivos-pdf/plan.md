# Plan 008 — Arquivos e PDF

## Decisões Técnicas

- **Buckets:** `scores` (PDF, privado) e `logos` (imagens, privado). Políticas de Storage espelham o RLS: leitura para membros da banda extraída do primeiro segmento do path (`storage.foldername(name)[1] = band_id` + `is_band_member(...)`); escrita apenas admin. Como as policies de Storage são SQL, entram como migração (`0003_storage_policies.sql`).
- **URLs assinadas** (`createSignedUrl`, TTL 1h) geradas na load function server-side; o client nunca vê service key. Para offline (007), o downloader baixa o binário via URL assinada no momento do "Baixar Show" e serve do cache — a expiração da URL não afeta o conteúdo já baixado.
- **pdf.js via `pdfjs-dist`** com worker configurado pelo bundler (atenção ao worker no build Cloudflare — testar no preview real). Componente `$lib/components/song/PdfViewer.svelte`:
  - Renderização lazy por página (IntersectionObserver) — nunca renderizar o documento inteiro de uma vez.
  - Zoom: escala re-renderiza a página visível; pinch via `touch-action: none` + pointer events (ou lib pequena, decidir na implementação e registrar aqui).
  - Modo contínuo: páginas empilhadas num container com scroll — é esse container que o auto-scroll da 006 rola quando a tab ativa é PDF.
- **Upload:** componente reutilizável `$lib/components/ui/FileUpload.svelte` (validação de MIME/tamanho no client **e** limite no bucket), usado para PDF e logo.
- **Fallback:** boundary de erro em volta do `PdfViewer` (Lei 4) com "Abrir em nova aba".

## Riscos Específicos

- pdf.js é pesado (~1MB): importar dinamicamente apenas quando uma aba PDF é aberta (code-splitting), para não punir o caminho principal (cifra AST).
- Worker do pdf.js em Cloudflare Pages tem pegadinhas de path: validar no deploy de preview antes de dar a tarefa por encerrada.
