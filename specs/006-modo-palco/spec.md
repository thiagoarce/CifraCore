# Spec 006 — Modo Palco: Modo Extremo, Wake Lock, Auto-Scroll e Pedal

## Intenção

A experiência de tocar ao vivo: tela limpa (visão de túnel), tela que nunca apaga (Wake Lock), rolagem automática suave que respeita o toque do músico, e controle por pedal Bluetooth. Todos os relógios rodam **localmente** em cada device (Lei 3); os eventos `PLAY`/`PAUSE`/`RESYNC` da 005 apenas disparam/pausam o clock local.

## Requisitos

- **R1.** **Modo Palco (normal):** já é a tela da música dentro da sessão (005). Botão "Modo Palco" no rodapé ativa o **Modo Extremo**.
- **R2.** **Modo Extremo (visão de túnel):** injeta classe `fullscreen-mode` que oculta header, sidebar e rodapé — só o conteúdo musical emite luz. Botão `[X]` pequeno e translúcido para sair. Entrar também solicita fullscreen do browser quando disponível.
- **R3.** **Wake Lock:** ao entrar em Modo Palco (normal ou extremo), solicitar `navigator.wakeLock.request('screen')`; re-adquirir no evento `visibilitychange` (o lock é liberado pelo SO quando a aba sai de foco). Se a API não existir (Safari antigo), exibir aviso único sugerindo desativar o bloqueio automático de tela.
- **R4.** **Auto-scroll proporcional:** rolagem contínua da cifra do topo ao fim numa duração configurável por música (`duration_sec` estimada por BPM quando existir, ajustável na UI). Implementação: store tweened (`svelte/motion`) com clock em `worker-timers` — nunca `setInterval` nativo (Lei 5).
- **R5.** **Pausa por toque (prioridade absoluta do músico):** qualquer `touchstart`, `wheel` ou `mousedown` na área da cifra pausa o auto-scroll **imediatamente** (mesmo frame). Aparece botão flutuante "Retomar Sincronia" que retoma do ponto atual (recalculando a interpolação a partir da posição real do scroll, não da posição teórica).
- **R6.** **Integração com a sessão (005):** evento `PLAY` inicia o clock local; `PAUSE` pausa; `RESYNC { elapsed_ms }` realinha o clock local ao tempo do líder (salto suave, nunca teleporte brusco: animar até a posição em ~500ms). Devices em modo Individual ignoram esses eventos.
- **R7.** **Pedal Bluetooth:** pedais de página (AirTurn etc.) emitem teclas. Mapear: `PageDown`/`ArrowDown`/`ArrowRight` → rolar um "passo" (60% da altura visível) ou próxima música (configurável); `PageUp`/`ArrowUp`/`ArrowLeft` → passo para cima / música anterior. Configuração por usuário (localStorage). Funciona também para navegação de setlist quando o usuário é o líder.
- **R8.** Auto-scroll e pedal funcionam também **fora** de sessão ao vivo (ensaio individual).

## Wireframe — Modo Extremo (Visão de Túnel)

```text
+-----------------------------------------------------------+
|                                                           |
|  [Voz: Maria] (linha com opacidade reduzida 50%)          |
|  Eu fecho os olhos e posso ver...                         |
|                                                           |
|  [Am]             [C]             [G]                     |
|  [Voz: João] (linha em destaque brilhante)                |
|  O vento sopra, a noite cai...                            |
|                                                           |
| [X] <--- (botão pequeno e translúcido para sair)          |
+-----------------------------------------------------------+
```

## Cenários de Comportamento (Gherkin)

**Cenário: Entrar no Modo Extremo**

- **Dado** que o músico está na tela da música em sessão ativa
- **Quando** ele toca "Modo Palco"
- **Então** header, sidebar e rodapé desaparecem (`fullscreen-mode`)
- **E** o Wake Lock está ativo (tela não apaga)
- **E** o botão `[X]` translúcido restaura a visão normal.

**Cenário: Toque interrompe o auto-scroll**

- **Dado** que o auto-scroll está rolando a cifra
- **Quando** o músico toca na tela e arrasta para cima
- **Então** o auto-scroll para instantaneamente, sem "cabo de guerra" com o dedo
- **E** o botão "Retomar Sincronia" aparece
- **Quando** ele toca "Retomar Sincronia"
- **Então** a rolagem retoma suavemente a partir da posição atual.

**Cenário: PLAY do líder dispara clocks locais**

- **Dado** dois devices na sessão em modo "Seguir Líder"
- **Quando** o líder aperta Play
- **Então** cada device inicia seu próprio auto-scroll com clock local
- **E** nenhum dado de posição de scroll trafega pela rede durante a rolagem.

**Cenário: Wake Lock re-adquirido**

- **Dado** o Modo Palco ativo com Wake Lock
- **Quando** o usuário alterna de app e volta (visibilitychange)
- **Então** o Wake Lock é re-solicitado automaticamente.

**Cenário: Pedal passa a página**

- **Dado** um pedal Bluetooth pareado emitindo `PageDown`
- **Quando** o músico pisa no pedal
- **Então** a cifra rola um passo de 60% da altura visível com animação curta.

## Critérios de Aceitação

- [ ] Cenários verificados em device móvel real (Android e, se possível, iOS/Safari).
- [ ] Zero uso de `setInterval`/`setTimeout` nativos em código de clock (grep no CI).
- [ ] Teste unitário do controlador de auto-scroll: estados (idle/playing/paused-by-touch/paused-by-leader), retomada a partir de posição arbitrária, resync suave.
- [ ] Tela não apaga durante 10 minutos de Modo Palco sem toque.

## Fora de Escopo

Metrônomo audível (backlog); sincronia de eventos em si (005); pré-cache offline (007).
