# Documentação Oficial Completa v2 - CifraCore (Agent-Ready SDD)

Este documento consolida a arquitetura e as especificações do projeto CifraCore sob o rigoroso padrão Spec-Driven Development (SDD) preparado para Agentes de IA.

## 1\. SPEC.md - Intenção e Comportamento (BDD)

### Funcionalidade: Sincronia de Palco Democrática

**Cenário: Líder altera a música em tempo real**

- **Dado** que a banda "Tarja Preta" possui uma live_session ativa
- **E** o músico "Thiago" está autenticado como leader_id
- **E** o músico "Membro X" está conectado na mesma sessão no 'Modo Banda'
- **Quando** o líder seleciona a música "Faroeste Caboclo" no setlist
- **Então** o sistema deve atualizar o current_song_id na base de dados
- **E** o ecrã de "Membro X" deve carregar a aba correspondente ao seu instrumento em menos de 200ms.

### Funcionalidade: Importação Fricção Zero (HITL)

**Cenário: Validação Humana de Cifra Importada**

- **Dado** que o utilizador submeteu a URL "cifraclub.com.br/musica"
- **Quando** a Edge Function retorna o JSON (AST) da cifra
- **Então** o sistema NÃO deve fazer INSERT na tabela songs
- **E** deve renderizar a "Tela de Rascunho" para o utilizador
- **Quando** o utilizador clica em "Aprovar e Gravar"
- **Então** o sistema insere o payload validado nas tabelas songs e song_tabs.

## 2\. PLAN.md - Convenções de Projeto e Arquitetura

- **Stack e Contratos Estritos:** Frontend em SvelteKit (App Shell / PWA) com adaptador @sveltejs/adapter-cloudflare.
- **Motor de Notas:** Uso obrigatório de @tonaljs/tonal empacotado num Wrapper defensivo local (src/lib/utils/tonalWrapper.ts).
- **Concorrência (Scroll):** Obrigatório o uso de worker-timers em qualquer setInterval que afete o DOM (prevenção de throttling do iOS).

### Contratos de Tipagem (Interfaces)

export interface ASTBlock {  
id: string; // UUID obrigatório  
type: 'verse' | 'chorus' | 'solo' | 'bridge';  
content: string;  
repeats: number;  
role?: string;  
}

## 3\. TASKS.md - Execução Operacional (TDD e DoD)

_Atenção Agente: Siga estritamente o ciclo Red-Green-Refactor. Não escreva código de implementação sem que o teste correspondente esteja a falhar._

- **Tarefa 1: Setup do Wrapper do TonalJS**
  - **Red:** Criar src/lib/utils/tonalWrapper.test.ts com asserções para lidar com entrada vazia, acordes válidos e acordes mal formatados.
  - **Green:** Implementar o wrapper até que todos os testes passem.
  - **Refactor:** Otimizar as expressões regulares internas.
  - **Definition of Done (DoD):** Cobertura de teste de 100%; Função retorna texto puro original se o parsing falhar (não lança exceção).
- **Tarefa 2: Estado de Sincronia de Palco (Svelte Store)**
  - **Red:** Criar testes unitários para a store \$liveSession com payloads mockados.
  - **Green:** Implementar a store.
  - **Integração:** Ligar a store ao listener do canal Supabase Realtime.
  - **DoD:** A store rejeita payloads que não possuam leader_timestamp válido.

## 4\. constitution.md - Leis Imutáveis do Agente

- **TDD Obrigatório:** É terminantemente proibido escrever código de produção sem antes escrever um teste que falhe (Red). Testes gerados a posteriori são violações críticas.
- **Separação de Papéis:** Assuma que todo o output gerado será escrutinado por um agente adversário testador. Siga as assinaturas de tipo (TypeScript) de forma absoluta.
- **Spec-Anchored Development (Sem Deriva):** Se um obstáculo técnico exigir mudança arquitetural, proponha a alteração no SPEC.md ou PLAN.md primeiro. Apenas após a documentação refletir a nova realidade é que a codificação prossegue.
- **Blindagem de UI contra Erros Matemáticos:** O motor de parsing e o Svelte jamais devem travar a renderização (crash) da página de palco se um acorde for desconhecido. A degradação graciosa para texto puro é obrigatória.
- **Comunicação de Rede Limitada (Anti-Jitter):** A transmissão de dados pelo Supabase Realtime só pode trafegar eventos de mudança de estado (Triggers). É proibido sincronizar posições de scroll via WebSocket.