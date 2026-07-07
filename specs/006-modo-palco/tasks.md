# Tasks 006 — Modo Palco

Depende de: 003 (tela da música), 004 (renderização), 005 (eventos PLAY/PAUSE/RESYNC — T4/T6 podem andar antes da 005 usando eventos mockados).

- [ ] **T1 `[FABLE]` Controlador de auto-scroll** — máquina de estados do plan em `$lib/stores/autoScroll.ts` com `worker-timers` + tweened; testes unitários primeiro (Lei 2): transições, retomada de posição arbitrária, resync suave, recálculo por relógio de parede após suspensão.
  **DoD:** todos os estados/transições testados; zero `setInterval` nativo; duração restante proporcional correta na retomada.

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
