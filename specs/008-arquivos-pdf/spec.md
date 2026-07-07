# Spec 008 — Arquivos e PDF: Storage e Visualizador de Partituras

## Intenção

Fechar o ciclo da "Multi-Visão por Instrumento": além de AST, uma tab pode ser um PDF (partitura, grade, arranjo escaneado). Upload para o Supabase Storage e visualização nativa na aba do instrumento via pdf.js — com o mesmo padrão de robustez do resto do app (fallback, offline via 007).

## Requisitos

- **R1.** Upload de PDF (admin): na música, criar/substituir uma `song_tab` com `content_type: 'pdf_url'`, instrumento associado, limite de 20MB, apenas `application/pdf`.
- **R2.** Storage: bucket `scores` privado; arquivos em `{band_id}/{song_id}/{tab_id}.pdf`; acesso por URL assinada de curta duração gerada sob demanda (nunca URL pública).
- **R3.** Visualizador embutido (pdf.js) na aba do instrumento: renderização por página com zoom (pinch e botões), navegação de páginas, modo contínuo com scroll — integrado ao auto-scroll da 006 quando em sessão (rolagem proporcional do container).
- **R4.** Também upload de logo da banda (bucket `logos`, imagem ≤ 2MB) — pendência da 001 que se resolve aqui com a mesma infra de upload.
- **R5.** Fallback (Lei 4): PDF corrompido ou falha do pdf.js → mensagem amigável + botão "Abrir em nova aba" (URL assinada) — a tela nunca quebra.
- **R6.** Offline: PDFs de setlists baixados vêm do cache `pdfs-v1` (007); visualizador funciona offline para conteúdo baixado.

## Cenários de Comportamento (Gherkin)

**Cenário: Upload e visualização de partitura**

- **Dado** que o admin está na música "Tempo Perdido"
- **Quando** ele envia `partitura-teclado.pdf` para o instrumento "keys"
- **Então** a aba "Teclado" passa a existir na tela da música
- **E** qualquer membro da banda abre a aba e vê o PDF renderizado com zoom e páginas.

**Cenário: Isolamento de tenant no Storage**

- **Dado** um usuário que não é membro da banda dona do arquivo
- **Quando** ele tenta acessar o caminho do PDF (mesmo com a URL do path)
- **Então** o Storage nega o acesso (políticas por `band_id` no caminho)
- **E** URLs assinadas expiradas também são negadas.

**Cenário: PDF corrompido não quebra a tela**

- **Dado** uma tab apontando para um arquivo corrompido
- **Quando** o membro abre a aba
- **Então** aparece a mensagem de falha com "Abrir em nova aba"
- **E** as demais abas da música continuam funcionando.

## Critérios de Aceitação

- [ ] Cenários acima passam, incluindo teste de acesso indevido entre bandas.
- [ ] Zoom por pinch funciona em device touch real.
- [ ] PDF de 30 páginas navega sem travar em device modesto (renderização por página, não tudo de uma vez).
- [ ] Visualização offline de PDF baixado via "Baixar Show" funciona em modo avião.

## Fora de Escopo

AlphaTab / arquivos `.gp` e MusicXML (backlog); anotações sobre o PDF (backlog); OCR de partituras (fora do produto).
