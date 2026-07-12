# Notas de teste — 005-T7 Resiliência de rede

Roteiro do cenário "Reconexão após queda de rede" (spec.md, Funcionalidade
"Resiliência"), executado com Playwright + 2 `BrowserContext`s reais contra
o stack local (não simulação/mock — `context.setOffline()` corta a conexão
de rede de verdade do browser, inclusive o WebSocket do Supabase Realtime).

## Roteiro

1. Líder e membro entram na mesma sessão ao vivo (`/session`), ambos vendo
   "Musica Um".
2. Membro perde a conexão (`context.setOffline(true)`).
3. Líder troca de música duas vezes enquanto o membro está desconectado
   ("perdeu a conexão durante 2 músicas"): Musica Um → Musica Dois → Musica
   Tres. Cada troca é um `UPDATE` em `live_sessions` + broadcast
   `CHANGE_SONG` — ambos os broadcasts **nunca chegam** ao membro offline
   (perdidos de verdade, não hipoteticamente).
4. Rede volta (`context.setOffline(false)`).
5. Verifica-se que a tela do membro converge para "Musica Tres" — a música
   real e atual — **sem nunca ter recebido nenhum dos dois broadcasts
   perdidos**.

## Resultado

- ✅ Passou. O cliente Realtime do Supabase detecta sozinho que precisa
  reconectar o canal assim que a rede volta, e isso dispara de novo o
  callback de `status === 'SUBSCRIBED'` em `$lib/realtime/liveChannel.ts`
  (o mesmo callback do primeiro `subscribe()`, não um handler diferente
  pra reconexão) — que já chama `refetchAndReconcile()` incondicionalmente
  a cada vez que entra em `SUBSCRIBED`. Isso busca o estado atual de
  `live_sessions` direto do banco e reconcilia a store `$liveSession` via
  `reconcile()`, que sempre vence sobre qualquer coisa que o broadcast
  tivesse (ou não) entregue. Nenhum código novo foi necessário — a
  reconexão funcionou porque o mecanismo do R9 já tinha sido projetado
  (T2) e implementado (T2/T3) exatamente para este caso, não como um
  tratamento especial de "modo desconectado".
- Tempo de reconciliação medido do momento em que a rede volta até a tela
  mostrar a música correta: **~60ms** — bem rápido, porque o Realtime
  detecta a queda quase imediatamente (o teste usa `setOffline`, uma queda
  limpa, diferente de uma conexão degradando aos poucos) e o refetch em si
  é uma única query indexada por `band_id`.
- Confirmado nenhum evento de scroll/posição trafega em nenhum momento
  (auditoria já feita nas tasks anteriores; este teste não introduziu
  nenhum payload novo).

## Nenhum bug encontrado nesta task

Diferente das tasks anteriores (T3: bug real de self-broadcast; T1: achado
de semântica de RLS em UPDATE/DELETE), a verificação de resiliência **não
achou nenhum bug novo** — o mecanismo de reconciliação por refetch, já
implementado desde a T2 pensando exatamente neste cenário, funcionou de
primeira. Registrado aqui porque o DoD desta task pede explicitamente que
bugs encontrados virem fixes antes de fechar a feature — não havia nenhum
a corrigir.
