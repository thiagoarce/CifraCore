# TASKS.md — Índice Mestre de Execução

Visão geral da ordem de construção, dependências entre features e delegação de tarefas. O detalhe de cada tarefa (descrição + DoD) está no `tasks.md` da respectiva feature.

## 1. Ordem e Dependências

```
001-fundacao ──▶ 002-importacao ──▶ 003-catalogo-ui ──▶ 004-inteligencia-musical
                                          │                      │
                                          ▼                      ▼
                                   005-setlists-sync ──▶ 006-modo-palco
                                          │                      │
                                          ▼                      ▼
                                   007-offline-pwa ◀──── 008-arquivos-pdf
```

- **Sequência principal:** 001 → 002 → 003 → 004 → 005 → 006 → 007 → 008.
- Paralelismos possíveis: 008 (T1–T3) pode andar em paralelo com 005/006; 006 T1/T4 podem começar antes da 005 com eventos mockados.
- 007 fecha por último a integração de PDFs (depende da 008 T4).

## 2. Estado das Features

| Feature                  | Spec                              | Status          |
| ------------------------ | --------------------------------- | --------------- |
| 001 Fundação             | `specs/001-fundacao/`             | ✅ Concluída    |
| 002 Importação           | `specs/002-importacao/`           | ✅ Concluída    |
| 003 Catálogo e UI        | `specs/003-catalogo-ui/`          | 📋 Especificada |
| 004 Inteligência Musical | `specs/004-inteligencia-musical/` | 📋 Especificada |
| 005 Setlists e Sincronia | `specs/005-setlists-sync/`        | 📋 Especificada |
| 006 Modo Palco           | `specs/006-modo-palco/`           | 📋 Especificada |
| 007 Offline e PWA        | `specs/007-offline-pwa/`          | 📋 Especificada |
| 008 Arquivos e PDF       | `specs/008-arquivos-pdf/`         | 📋 Especificada |

(Atualizar para 🚧 Em andamento / ✅ Concluída conforme as tasks fecham.)

## 3. Tabela Mestre de Delegação

Critério (Lei 8 da constitution): **🔴 FABLE** = segurança, concorrência/tempo real, parsing defensivo, infraestrutura. **🟢 SONNET** = UI, CRUD e integrações com contrato fechado, executadas estritamente a partir do spec.

### 🔴 FABLE (23 tarefas)

| Tarefa                                     | Feature | Por que é sensível                              |
| ------------------------------------------ | ------- | ----------------------------------------------- |
| 001-T1 Scaffold do projeto                 | 001     | Infra: decisões de build/adapter/CI afetam tudo |
| 001-T2 Schema + migrações                  | 001     | Fonte da verdade dos dados                      |
| 001-T3 Políticas RLS                       | 001     | Erro = vazamento entre bandas                   |
| 001-T4 Auth no SvelteKit                   | 001     | Sessão/guards de segurança                      |
| 002-T1 Parser texto→AST                    | 002     | Núcleo de dados; parsing defensivo              |
| 002-T3 Edge Function scraper               | 002     | Frágil, anti-bot, erros estruturados            |
| 004-T1 Sanitizer de acordes                | 004     | Defesa única entre web e Tonal                  |
| 004-T2 tonalWrapper                        | 004     | Coração musical; edge cases                     |
| 004-T3 unrollAst + linhas                  | 004     | Performance + integridade do conteúdo           |
| 004-T4 Store $renderedAST                  | 004     | Imutabilidade + degradação graciosa             |
| 005-T2 Protocolo realtime + $liveSession   | 005     | Concorrência distribuída, anti-jitter           |
| 005-T3 Ciclo de vida da sessão + liderança | 005     | Corridas de escrita                             |
| 005-T6 Modo Convidado                      | 005     | Tokens assinados — segurança                    |
| 005-T7 Resiliência de rede                 | 005     | Validação do protocolo sob falha                |
| 006-T1 Controlador de auto-scroll          | 006     | Máquina de estados + timers em worker           |
| 006-T2 Pausa por toque                     | 006     | Conflito de concorrência UI                     |
| 006-T3 Wake Lock                           | 006     | Comportamento de SO móvel                       |
| 006-T5 Integração eventos↔scroll           | 006     | Junção dos dois sistemas críticos               |
| 007-T1 PWA + cache do shell                | 007     | SW erra silenciosamente                         |
| 007-T2 IndexedDB + repositório             | 007     | Integridade de dados offline                    |
| 007-T3 Downloader "Baixar Show"            | 007     | Transacionalidade, quota                        |
| 008-T1 Políticas de Storage                | 008     | Isolamento de tenant em arquivos                |
| 008-T4 Integrações offline/palco           | 008     | Junção com sistemas críticos                    |

### 🟢 SONNET (20 tarefas)

| Tarefa                              | Feature | Contrato que a governa                   |
| ----------------------------------- | ------- | ---------------------------------------- |
| 001-T5 Telas de autenticação        | 001     | Fluxos Supabase Auth prontos (T4)        |
| 001-T6 CRUD bandas/membros          | 001     | RPC `create_band` + RLS prontos          |
| 001-T7 Teste $currentBand           | 001     | Comportamento definido no spec           |
| 002-T2 Modo Avançado + Rascunho     | 002     | `ASTBlock` + parser prontos              |
| 002-T4 Importação por URL (UI)      | 002     | Payload da Edge Function fechado         |
| 002-T5 batch-import.js              | 002     | Formato de arquivo definido no plan      |
| 003-T1 Design system                | 003     | Paletas em hex no spec                   |
| 003-T2 AppShell + Dashboard         | 003     | Wireframes + RLS por baixo               |
| 003-T3 Tela da música               | 003     | Wireframe + contrato AstRenderer         |
| 003-T4 Edição de música             | 003     | Reuso do componente de Rascunho          |
| 004-T5 UI de tom e capo             | 004     | Consome stores/utils da 004 T1–T4        |
| 004-T6 Verificação de performance   | 004     | Roteiro e limites no spec                |
| 005-T1 CRUD de setlists             | 005     | Schema + RPC definidos                   |
| 005-T4 Presença + UI da sessão      | 005     | API Presence + store $liveSession pronta |
| 005-T5 Fila de sugestões            | 005     | Tabela + evento definidos                |
| 006-T4 UI do Modo Extremo           | 006     | Wireframe + classe CSS definidas         |
| 006-T6 Pedal + duração do scroll    | 006     | Mapa de teclas e heurística no plan      |
| 007-T4 UI de download/conectividade | 007     | Stores do downloader prontas             |
| 008-T2 Upload PDF/logo              | 008     | Políticas de Storage prontas (T1)        |
| 008-T3 Visualizador PDF             | 008     | Plan detalha pdf.js/lazy/zoom            |

## 4. Regras de Execução (resumo operacional)

1. Abrir uma feature = ler `constitution.md` → `PLAN.md` → `specs/NNN/spec.md` → `plan.md` → `tasks.md`, nessa ordem.
2. Tarefas na ordem listada; uma tarefa só fecha com o DoD cumprido.
3. Tarefa `[SONNET]`: seguir o spec ao pé da letra; ambiguidade → parar e perguntar (Lei 8).
4. Tarefa `[FABLE]`: além de implementar, revisar se o plan da feature ainda reflete a realidade; desvio → atualizar o plan primeiro (Lei 1).
5. Ao fechar todas as tasks de uma feature: atualizar a tabela de Estado (§2) e marcar os checkboxes no `tasks.md`.
