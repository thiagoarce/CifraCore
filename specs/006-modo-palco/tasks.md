# Tasks 006 — Modo Palco

Depende de: 003 (tela da música), 004 (renderização), 005 (eventos PLAY/PAUSE/RESYNC — T4/T6 podem andar antes da 005 usando eventos mockados).

- [x] **T1 `[FABLE]` Controlador de auto-scroll** — máquina de estados do plan em `$lib/stores/autoScroll.ts` com `worker-timers` + tweened; testes unitários primeiro (Lei 2): transições, retomada de posição arbitrária, resync suave, recálculo por relógio de parede após suspensão.
      **DoD:** todos os estados/transições testados; zero `setInterval` nativo; duração restante proporcional correta na retomada.
      _Feito. `$lib/stores/autoScroll.ts` implementa exatamente a máquina de estados do plan (`idle`/`playing`/`pausedByUser`/`pausedByLeader`), com `elapsedAtPause`/`startedAt` (relógio de parede) em vez de contagem de ticks acumulados — é isso que faz o recálculo pós-suspensão (`recalcFromWallClock`) funcionar corretamente mesmo se ticks foram perdidos. `worker-timers` (`npm install`, pacote novo) alimenta só o *tick* de baixo nível (250ms) que dispara o recálculo do alvo do `tweened`; nenhum `setInterval` nativo é chamado em nenhum caminho (13º teste do arquivo espiona `globalThis.setInterval` e confirma zero chamadas)._
      _**Achado real de ambiente de teste, não hipotético:** `svelte/motion`'s `tweened` precisa de `requestAnimationFrame` pra animar transições com `duration > 0`, e o ambiente de teste deste projeto é `environment: 'node'` (não `jsdom`) — confirmado escrevendo um script standalone que mostrou um tween de `{ duration: 50 }` nunca sair do valor inicial em Node puro. Descoberta a tempo: `{ duration: 0 }` aplica o valor **sincronamente**, sem precisar de RAF (confirmado no mesmo script) — e é exatamente o que todo caminho de pausa/retomada usa (`pauseByUser`, `pauseByLeader`, `resumeFrom`, `recalcFromWallClock`). Resultado: a máquina de estados inteira e toda a matemática de tempo decorrido/duração são 100% testáveis sem RAF; só a suavização visual dos ticks periódicos (250ms) e do RESYNC (500ms) fica de fato animada e não é verificável em Node — essa parte é o objeto do T2 (verificação em device real)._
      _`worker-timers` também é mockado no teste (`vi.mock('worker-timers', ...)`) com um fake controlável que expõe o callback do tick pro teste disparar manualmente — sem isso os testes dependeriam de um Web Worker real, indisponível em Vitest. 13 testes cobrindo: estado inicial, todas as transições da máquina, tick avançando proporcionalmente, pausa por toque com/sem posição real do scroll, retomada de posição arbitrária com duração restante proporcional correta (cenário explícito do DoD), `pauseByLeader`, `resync` realinhando o relógio sem forçar despausa, recálculo por relógio de parede (com e sem estar tocando), fim natural do scroll (para de "tickar" sem inventar um estado novo), `reset()`, e a auditoria de `setInterval` nativo._

- [ ] **T2 `[FABLE]` Pausa por toque + Retomar Sincronia** — listeners no container da cifra, kill síncrono da interpolação, botão flutuante de retomada conforme plan.
      **DoD:** cenário "Toque interrompe o auto-scroll" passa em device touch real, sem trepidação.

- [ ] **T3 `[FABLE]` Wake Lock** — `$lib/utils/wakeLock.ts` com re-aquisição em `visibilitychange` e aviso para browsers sem suporte; ativado ao entrar em Modo Palco.
      **DoD:** cenários "Wake Lock re-adquirido" e tela ligada por 10 min passam em Android real.

- [ ] **T4 `[SONNET]` UI do Modo Extremo** — classe `fullscreen-mode` (CSS ocultando header/sidebar/footer), botão de entrada no rodapé, botão `[X]` translúcido, requestFullscreen com fallback silencioso, wireframe do spec respeitado.
      **DoD:** cenário "Entrar no Modo Extremo" passa; transição sem layout shift do conteúdo da cifra.

- [ ] **T5 `[FABLE]` Integração com eventos da sessão** — ligar PLAY/PAUSE/RESYNC da store `$liveSession` (005) ao controlador; modo Individual ignora; auditoria de rede da Lei 3.
      **DoD:** cenário "PLAY do líder dispara clocks locais" passa com 2 devices; auditoria confirma zero tráfego durante rolagem.

- [ ] **T6 `[SONNET]` Pedal Bluetooth + controles de duração** — `pedalInput.ts` conforme plan (mapa configurável, ignora inputs focados), tela de configuração simples, slider de duração do scroll por música (localStorage), heurística default por BPM/linhas.
      **DoD:** cenário "Pedal passa a página" passa com teclado físico simulando pedal; configuração persiste.
