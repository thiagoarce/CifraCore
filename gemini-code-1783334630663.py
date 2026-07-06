import os

spec_md = """# SPEC.md - Intenção e Comportamento (BDD)

## 1. Visão Geral
Sistema de gestão e sincronização de repertório para bandas (CifraCore).

## 2. Cenários de Comportamento (Gherkin)

### Funcionalidade: Sincronia de Palco Democrática
**Cenário: Líder altera a música em tempo real**
* **Dado** que a banda "Tarja Preta" possui uma `live_session` ativa
* **E** o músico "Thiago" está autenticado como `leader_id`
* **E** o músico "Membro X" está conectado na mesma sessão no 'Modo Banda'
* **Quando** o líder seleciona a música "Faroeste Caboclo" no setlist
* **Então** o sistema deve atualizar o `current_song_id` na base de dados
* **E** a tela de "Membro X" deve carregar a aba correspondente ao seu instrumento (`instrument` preferido em localStorage) em menos de 200ms.

### Funcionalidade: Importação Fricção Zero (HITL)
**Cenário: Validação Humana de Cifra Importada**
* **Dado** que o utilizador submeteu a URL "cifraclub.com.br/musica"
* **Quando** a Edge Function retorna o JSON (AST) da cifra
* **Então** o sistema NÃO deve fazer INSERT na tabela `songs`
* **E** deve renderizar a "Tela de Rascunho" para o utilizador
* **Quando** o utilizador clica em "Aprovar e Gravar"
* **Então** o sistema insere o payload validado nas tabelas `songs` e `song_tabs`.
"""

plan_md = """# PLAN.md - Convenções de Projeto e Arquitetura

## 1. Stack e Contratos Estritos
* **Frontend:** SvelteKit (App Shell / PWA). Adaptador: `@sveltejs/adapter-cloudflare`.
* **Motor de Notas:** Uso obrigatório de `@tonaljs/tonal` empacotado num Wrapper defensivo local (`src/lib/utils/tonalWrapper.ts`).
* **Concorrência (Scroll):** Obrigatório o uso de `worker-timers` em qualquer `setInterval` que afete o DOM (prevenção de throttling do iOS).

## 2. Convenções de Caminhos (Aliases)
* Componentes de UI: `$lib/components/ui/*`
* Contratos e Tipos TS: `$lib/types/*`
* Stores de Estado (Svelte): `$lib/stores/*`
* Utilitários Puros (Sem side-effects): `$lib/utils/*`

## 3. Contratos de Tipagem (Interfaces)
```typescript
// $lib/types/AST.ts
export interface ASTBlock {
  id: string; // UUID obrigatório
  type: 'verse' | 'chorus' | 'solo' | 'bridge';
  content: string;
  repeats: number;
  role?: string;
}