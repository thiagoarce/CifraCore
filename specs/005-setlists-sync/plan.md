# Plan 005 — Setlists e Sincronia

## Arquitetura da Sincronia

**Canal:** Supabase Realtime, um canal por sessão: `live:{band_id}`. Broadcast para eventos + Presence para conectados. Além do broadcast, o estado durável fica em `live_sessions` (banco) — o broadcast é notificação, o banco é verdade (permite reconexão via R9).

**Protocolo de eventos (broadcast):**

```typescript
// $lib/types/realtime.ts
export type LiveEvent =
  | { type: 'CHANGE_SONG'; song_id: string; leader_timestamp: number }
  | { type: 'PLAY';        leader_timestamp: number }   // consumido pela 006
  | { type: 'PAUSE';       leader_timestamp: number }
  | { type: 'RESYNC';      elapsed_ms: number; leader_timestamp: number } // 006
  | { type: 'LEADER_CHANGE'; leader_id: string; leader_name: string; leader_timestamp: number }
  | { type: 'SUGGESTION';  suggestion_id: string; song_title: string; suggested_by_name: string; leader_timestamp: number };
```

Regras:
- `leader_timestamp` (epoch ms do emissor) obrigatório em todo evento; `$liveSession` descarta payloads sem ele ou com timestamp menor que o último aplicado (proteção contra reordenação de pacotes — risco R4).
- Fluxo de escrita do líder: UPDATE em `live_sessions` **primeiro**, broadcast depois. Se o broadcast se perder, a reconexão/refetch corrige.
- **Proibido** qualquer evento de posição de scroll (Lei 3).

**Tomada de liderança:** UPDATE direto em `live_sessions.leader_id` (RLS permite a member — spec 001) + evento `LEADER_CHANGE`. Corrida entre dois membros: última escrita vence; o evento carrega o nome para a UI se corrigir.

**Reconexão:** listener no status do canal (`CHANNEL_ERROR`/`TIMED_OUT` → reconectado); ao reconectar, refetch de `live_sessions` + `session_suggestions` pendentes e reconciliação da store.

## Modo Convidado (token assinado)

- Edge Function `guest-access`:
  - `POST /generate` (autenticado, membro da sessão): gera JWT próprio (secret dedicada, não a service key) com claims `{ session_id, band_id, exp: now+24h }`; retorna URL `/guest/{token}`.
  - `GET /state?token=...`: valida assinatura/expiração e retorna estado da sessão + música corrente + tabs (payload montado server-side com service role — **o token nunca vira sessão Supabase e não passa por RLS de membro**).
- Rota `/guest/[token]`: página standalone (fora do grupo `(app)`), assina o canal realtime em modo somente-leitura (broadcast é público por canal; a *escrita* de convidado é impossível porque toda mutação passa por RLS/Edge autenticada).
- Justificativa (PRD §5): superfície de segurança mínima — sem RLS temporária, sem conta fantasma.

## Setlists

- Rotas `(app)/setlists` (lista) e `(app)/setlists/[id]` (edição + botão "Iniciar Sessão").
- Reordenação persiste `position` em lote (uma chamada com array de `{id, position}` via RPC `reorder_setlist(setlist_id, song_ids[])` para atomicidade).
- Tela da sessão ao vivo reusa a tela da música (003/004) + `FloatingFooter` agora funcional (líder, presença, sugerir, assumir liderança).

## Riscos Específicos (de PLAN.md R4)

- Rede de palco com jitter/perda: mitigado por eventos-apenas + timestamps monotônicos + estado durável no banco + refetch na reconexão. Teste obrigatório com throttling de rede (DevTools offline/slow-3G) simulando queda no meio da troca de música.
