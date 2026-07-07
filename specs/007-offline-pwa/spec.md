# Spec 007 — Offline e PWA: Service Worker e Pré-Cache do Show

## Intenção

"Palco sem internet" não pode derrubar o show. O app é um PWA instalável com cache do shell, e — mais importante — tem o botão **"Baixar Show"**: pré-cache explícito e verificável de todas as músicas, tabs e PDFs de um setlist antes do evento. Offline, o músico toca o setlist inteiro; a sincronia realtime fica indisponível e o app degrada para modo Individual com aviso claro.

## Requisitos

- **R1.** PWA instalável: manifest (nome, ícones, `display: standalone`, tema dark), Service Worker registrado.
- **R2.** Cache do App Shell: assets estáticos (JS/CSS/fonts) em cache-first com versionamento por build; atualização de versão nova detectada e aplicada com prompt discreto ("Nova versão disponível — Atualizar").
- **R3.** **"Baixar Show":** botão no setlist que baixa e persiste localmente todas as músicas do setlist: metadados, todas as `song_tabs` (AST) e PDFs referenciados. Indicador de progresso (n/total) e estado final visível por música (✓ baixada / ✗ falhou, com retry).
- **R4.** Dados de músicas/setlists ficam em **IndexedDB** (não no cache HTTP): a leitura offline da tela da música consulta IndexedDB quando a rede falha (network-first com fallback local).
- **R5.** Indicador global de conectividade: offline → badge visível; sessão ao vivo indisponível offline → app entra em modo Individual automaticamente com aviso ("Sem conexão — modo individual"), e reintegra a sessão quando a rede voltar (reconexão da 005).
- **R6.** Expiração: dados baixados de um setlist permanecem até serem explicitamente removidos ("Liberar espaço" no setlist) — nunca eviction silenciosa do conteúdo de um show baixado.
- **R7.** O que **não** funciona offline (explícito na UI, sem quebrar): importação, edição/gravação de catálogo, sugestões, presença.

## Cenários de Comportamento (Gherkin)

**Cenário: Baixar Show completo**
- **Dado** um setlist com 15 músicas, uma delas com tab em PDF
- **Quando** o usuário toca "Baixar Show"
- **Então** o progresso avança até 15/15
- **E** cada música exibe ✓
- **E** o PDF também foi armazenado localmente.

**Cenário: Tocar offline**
- **Dado** que o setlist foi baixado com sucesso
- **E** o device está em modo avião
- **Quando** o músico abre qualquer música do setlist
- **Então** a tela carrega do armazenamento local com todas as abas, transposição e auto-scroll funcionando
- **E** o badge "offline" está visível
- **E** o app está em modo Individual com o aviso correto.

**Cenário: Falha parcial no download**
- **Dado** que a rede caiu na música 12 de 15
- **Quando** o download falha
- **Então** as músicas 1–11 permanecem ✓ e as restantes mostram ✗ com botão "Tentar novamente"
- **E** nenhum estado fica corrompido (retry completa só o que falta).

**Cenário: Atualização do app não interrompe uso**
- **Dado** que uma nova versão foi deployada
- **Quando** o usuário abre o app
- **Então** a versão em cache abre normalmente
- **E** o prompt "Atualizar" aparece sem forçar reload no meio do uso.

## Critérios de Aceitação

- [ ] Lighthouse PWA: instalável, SW registrado, manifest válido.
- [ ] Cenários acima verificados com modo avião em device real.
- [ ] Teste automatizado da camada de armazenamento local (IndexedDB): salvar setlist, ler música, retry parcial, remoção.
- [ ] Auditoria: conteúdo baixado de um show nunca é removido sem ação do usuário (R6).

## Fora de Escopo

Sincronia offline peer-to-peer (fora do produto); edição offline com merge (backlog distante); pré-cache automático de todo o catálogo (só setlists, por escolha explícita).
