# Spec 005 — Setlists e Sincronia de Palco

## Intenção

O coração ao vivo do produto: setlists por banda e a sessão de palco sincronizada em tempo real. Liderança democrática (qualquer membro pode sugerir e assumir o controle), presença visível e acesso de convidado por link. Toda a sincronia é por **eventos de estado** — nunca dados contínuos (Lei 3).

## Requisitos

- **R1.** CRUD de setlists (admin): nome, data do evento, adicionar/remover/reordenar músicas (drag ou botões subir/descer, persistindo `position`).
- **R2.** Sessão ao vivo: uma por banda (`live_sessions.band_id UNIQUE`). Qualquer membro pode iniciar a sessão a partir de um setlist; quem inicia vira líder.
- **R3.** Quando o líder troca a música (`current_song_id`), todos os devices conectados carregam a nova música — cada um na aba do seu instrumento — em menos de 200ms a partir do recebimento do evento.
- **R4.** Tomada de liderança: qualquer membro conectado pode clicar "Assumir Liderança"; o líder anterior é notificado visualmente; não há aprovação (democrático por design).
- **R5.** Sugestões: qualquer membro sugere uma música do catálogo durante a sessão; a fila aparece para o líder, que aceita (vira `current_song_id`) ou dispensa. Persistidas em `session_suggestions`.
- **R6.** Presença: lista de membros conectados na sessão (Supabase Presence), visível no rodapé flutuante.
- **R7.** Modos de acompanhamento por device: **Seguir Líder** (troca de música e play/pause vêm do líder) ou **Individual** (ignora eventos; botão para voltar a seguir). Auto-scroll/clock local é assunto da 006.
- **R8.** Modo Convidado: líder gera link com token assinado (validade: 24h), read-only, escopo restrito à sessão ao vivo atual (música corrente + tabs dela). Convidado não precisa de conta.
- **R9.** Reconexão: ao recuperar rede, o device re-sincroniza o estado (busca `live_sessions` atual) em vez de confiar em eventos perdidos.

## Cenários de Comportamento (Gherkin)

### Funcionalidade: Sincronia de Palco Democrática

**Cenário: Líder altera a música em tempo real**

- **Dado** que a banda "Tarja Preta" possui uma `live_session` ativa
- **E** o músico "Thiago" está autenticado como `leader_id`
- **E** o músico "Membro X" está conectado na mesma sessão em modo "Seguir Líder"
- **Quando** o líder seleciona a música "Faroeste Caboclo" no setlist
- **Então** o sistema atualiza `current_song_id` no Supabase
- **E** a tela de "Membro X" carrega a aba correspondente ao instrumento preferido dele em menos de 200ms após receber o evento.

**Cenário: Tomada de liderança**

- **Dado** que "Thiago" é o líder atual
- **Quando** "Membro X" clica em "Assumir Liderança"
- **Então** `leader_id` passa a ser o de Membro X
- **E** todos os devices exibem "Líder: Membro X" no rodapé
- **E** os controles de troca de música aparecem para Membro X e somem para Thiago.

**Cenário: Sugestão aceita**

- **Dado** uma sessão ativa com líder "Thiago"
- **Quando** "Membro X" sugere "Tempo Perdido"
- **Então** a sugestão aparece na fila do líder com o nome de quem sugeriu
- **Quando** Thiago aceita
- **Então** "Tempo Perdido" vira a música corrente para todos e a sugestão fica `accepted`.

**Cenário: Membro em modo Individual**

- **Dado** que "Membro Y" ativou o modo Individual para revisar outra música
- **Quando** o líder troca a música corrente
- **Então** a tela de Membro Y **não** muda
- **E** um indicador discreto mostra que a banda está em outra música, com botão "Voltar a seguir".

### Funcionalidade: Convidado

**Cenário: Substituto acompanha o show**

- **Dado** que o líder gerou um link de convidado para a sessão ativa
- **Quando** o substituto abre o link sem estar logado
- **Então** ele vê a música corrente (read-only, com abas de instrumento) e acompanha as trocas do líder
- **E** não consegue acessar catálogo, setlists nem outras rotas
- **E** após expirar o token, o link mostra "convite expirado".

### Funcionalidade: Resiliência

**Cenário: Reconexão após queda de rede**

- **Dado** que "Membro X" perdeu a conexão durante 2 músicas
- **Quando** a rede volta
- **Então** o app detecta a reconexão do canal, busca o estado atual de `live_sessions` e alinha a tela — sem depender dos eventos perdidos.

## Critérios de Aceitação

- [ ] Todos os cenários acima verificados com 2+ browsers simultâneos.
- [ ] Nenhuma mensagem de scroll/posição contínua trafega no canal (auditar payloads — Lei 3).
- [ ] Store `$liveSession` com testes unitários: rejeita payloads sem `leader_timestamp` válido; aplica eventos em ordem; ignora eventos obsoletos (timestamp menor que o atual).
- [ ] Token de convidado: assinado no servidor, expirável, sem acesso a nada fora do escopo da sessão (testes de tentativa de acesso indevido).

## Fora de Escopo

Auto-scroll, metrônomo/clock e Wake Lock (006); modo offline da sessão (007).
