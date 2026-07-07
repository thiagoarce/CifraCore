# Plan 006 — Modo Palco

## Decisões Técnicas

- **Controlador de auto-scroll como máquina de estados** em `$lib/stores/autoScroll.ts`:

```
idle ──PLAY──▶ playing ──touch──▶ pausedByUser ──resume──▶ playing
                 │  ▲                                        
              PAUSE │RESYNC(realinha clock, segue playing)   
                 ▼  │                                        
               pausedByLeader
```

  - Estado interno: `startedAt` (clock local), `elapsedAtPause`, `durationMs`, `scrollRange` (medido do DOM no início e em `resize`).
  - Saída: store `$scrollProgress` (tweened 0→1); o componente aplica `scrollTop = progress * scrollRange`.
  - Clock: tick de baixa frequência via `worker-timers` (`setInterval` do pacote, ~250ms) que alimenta o target do tweened — o tweened faz a suavização entre ticks; a UI nunca depende do timer para cada frame.
- **Pausa por toque (risco R3):** listeners `touchstart`/`wheel`/`mousedown` (passive) no container → transição `pausedByUser` síncrona + `tweened.set(currentProgress, { duration: 0 })` para matar a interpolação em andamento. "Retomar": lê `scrollTop` real, converte em progress, recalcula duração restante proporcional e retoma.
- **RESYNC suave:** ao receber `RESYNC { elapsed_ms }`, animar até `elapsed_ms/durationMs` em ~500ms e continuar — proibido salto instantâneo.
- **Wake Lock** em `$lib/utils/wakeLock.ts`: `acquire()`, `release()`, re-aquisição em `visibilitychange`, detecção de suporte com callback de aviso. Ativado pelo layout do Modo Palco.
- **Modo Extremo:** classe `fullscreen-mode` no root da rota (CSS oculta header/sidebar/footer) + `document.documentElement.requestFullscreen()` com fallback silencioso (iOS Safari não suporta em todos os casos — a classe CSS é o comportamento garantido; o fullscreen nativo é bônus).
- **Pedal:** `$lib/utils/pedalInput.ts` — listener global de `keydown` ativo apenas na tela da música/palco; mapa de ações configurável (`scroll-step` | `nav-song`) persistido em localStorage; passo de 60% com `scrollBy({ behavior: 'smooth' })`. Cuidado: ignorar eventos quando foco está em input/textarea.
- **Duração do scroll:** `duration_sec` default = estimativa por linhas/BPM (heurística simples documentada no código) com ajuste manual na UI (slider), persistido por música em localStorage no MVP (não no banco — evita migração; promover a coluna se a banda pedir para compartilhar).

## Riscos Específicos (de PLAN.md R2 e R3)

- Suspensão de Web Worker com tela apagada → Wake Lock obrigatório; além disso, ao voltar de suspensão (`visibilitychange`), o controlador **recalcula** a posição pelo relógio de parede (`Date.now() - startedAt`) em vez de confiar em ticks acumulados — sem salto violento, aplica a regra do RESYNC suave.
- Conflito tweened × dedo → máquina de estados acima; testar em hardware real com throttling de CPU.
