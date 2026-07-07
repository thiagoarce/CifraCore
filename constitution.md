# constitution.md — Leis Imutáveis do Projeto CifraCore

Estas regras valem para **qualquer agente ou humano** que escreva código neste repositório. Elas não são sugestões: violá-las é motivo para rejeitar o trabalho. Mudanças nestas leis exigem decisão explícita do dono do projeto.

---

## Lei 1 — Spec-Anchored Development (Sem Deriva)

Nenhuma mudança arquitetural, de dependência ou de contrato acontece direto no código. Se um obstáculo técnico exigir mudar a arquitetura, a alteração é proposta e escrita **primeiro** no `PLAN.md` (ou no `plan.md` da feature). Só depois que a documentação refletir a nova realidade a codificação prossegue.

## Lei 2 — TDD Pragmático

Teste escrito **antes ou junto** do código é obrigatório para toda lógica crítica:

- `tonalWrapper` e sanitizer de acordes
- Parser texto→AST e desdobramento linear (unroll)
- Stores de sincronia (`$liveSession`, `$renderedAST`)
- Qualquer função pura em `$lib/utils/`

Componentes Svelte de UI **não** exigem teste unitário. Testes gerados a posteriori para lógica crítica são violação.

## Lei 3 — Anti-Jitter (Comunicação de Rede Limitada)

O Supabase Realtime só pode trafegar **eventos de mudança de estado** (`PLAY`, `PAUSE`, `CHANGE_SONG`, `RESYNC`, etc.). É estritamente proibido sincronizar posições de scroll (ou qualquer dado contínuo pixel-a-pixel) via WebSocket. O relógio e o auto-scroll rodam **localmente** em cada dispositivo.

## Lei 4 — Degradação Graciosa (Blindagem da Tela de Palco)

O parser, o motor musical e o renderizador **jamais** podem crashar a visualização do músico. Se um acorde não for reconhecido, um PDF falhar ou um payload vier malformado, o componente renderiza o conteúdo original como texto puro (fallback). Exceção não tratada na tela de palco é bug crítico.

## Lei 5 — Timers em Worker + Wake Lock

Todo clock que afeta o DOM (auto-scroll, contadores) usa `worker-timers`, nunca `setInterval` nativo (prevenção de throttling do iOS/Android). Entrar no Modo Palco **obrigatoriamente** aciona a Wake Lock API (`navigator.wakeLock.request('screen')`).

## Lei 6 — Unroll na Camada de Dados

O desdobramento linear de repetições (refrões, solos) é computado em JavaScript puro **antes** de chegar ao renderizador. O array resultante é estático e imutável durante a exibição, renderizado com `{#each ... (block.id)}` com chaves únicas. Proibido recalcular teoria musical por bloco em tempo de render.

## Lei 7 — Multi-Tenant Absoluto

Toda tabela com dados de banda tem `band_id` e política RLS ativa. Nenhuma query no frontend ou em Edge Function acessa dados sem escopo de tenant. A segurança mora no banco (RLS), nunca apenas no client.

## Lei 8 — Delegação por Sensibilidade

As tarefas em `specs/*/tasks.md` são marcadas com `[FABLE]` (sensível) ou `[SONNET]` (delegável):

- Tarefas `[FABLE]` **não podem** ser executadas por agentes de menor capacidade. Envolvem segurança (RLS, tokens), concorrência/tempo real, parsing defensivo ou infraestrutura.
- Um agente executando tarefa `[SONNET]` segue o spec ao pé da letra. Se o spec estiver ambíguo ou incompleto, o agente **para e pergunta** — inventar comportamento não especificado é violação.

## Lei 9 — Idioma e Convenções

Documentação em PT-BR. Código, identificadores, nomes de tabelas/colunas, commits e testes em inglês. TypeScript estrito: as interfaces em `$lib/types/` são contratos absolutos — não criar variações locais dos mesmos tipos.
