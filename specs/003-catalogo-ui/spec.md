# Spec 003 — Catálogo e UI Base: Design System, Dashboard e Tela da Música

## Intenção

Dar cara ao app: design system com temas dark/light, dashboard com o catálogo da banda e a tela de visualização da música com abas por instrumento. Ao final, a banda navega pelo repertório importado na fase 002 — ainda sem inteligência musical (acordes são texto estilizado só na fase 004).

## Requisitos

- **R1.** Design system Tailwind com as duas paletas abaixo; **dark mode é o padrão absoluto** (ambiente de palco). Toggle persistido (`$theme`).
- **R2.** Dashboard: sidebar (bandas, navegação), lista/busca de músicas da banda ativa, atalho para importar.
- **R3.** Tela da música (`/songs/[id]`): header com título e controles de tom (funcionais só na 004 — renderizar desabilitados), linha de abas por instrumento (uma aba por `song_tab` existente), área de conteúdo com scroll.
- **R4.** A aba aberta por padrão respeita o instrumento preferido do usuário (localStorage `instrument`, fallback `band_members.instrument`).
- **R5.** Renderização do AST: blocos na ordem, com `label` visível e repetições desdobradas (consumir util de unroll da 004 quando existir; até lá, exibir badge "2x" no bloco).
- **R6.** Suporte a vozes (duetos): linhas com `role` diferente do selecionado renderizam com opacidade reduzida (`text-slate-500`/50%); seletor de voz na tela.
- **R7.** Edição básica: admin pode editar metadados da música e reabrir os blocos numa tela igual à de Rascunho da 002 (reuso do componente).
- **R8.** Responsivo mobile-first: a tela da música é utilizável num celular na estante do teclado.

## Design System (paletas oficiais)

### Paleta Dark Mode (padrão de palco)

| Papel | Classe | Hex |
|---|---|---|
| Fundo App | `bg-slate-900` | `#0f172a` |
| Fundo Containers (cards/menu) | `bg-slate-800` | `#1e293b` |
| Texto Principal (letra) | `text-slate-50` | `#f8fafc` |
| Texto Secundário (UI/menus) | `text-slate-400` | `#94a3b8` |
| Voz inativa (duetos) | `text-slate-500` + opacity 50% | `#64748b` |
| Destaque de Acorde / Voz ativa | `text-amber-400` | `#fbbf24` |
| Acentos e Botões Primários | `bg-indigo-500` | `#6366f1` |

### Paleta Light Mode (ensaios/estudo de dia)

| Papel | Classe | Hex |
|---|---|---|
| Fundo App | `bg-slate-50` | `#f8fafc` |
| Fundo Containers | `bg-white` | `#ffffff` |
| Texto Principal | `text-slate-900` | `#0f172a` |
| Texto Secundário | `text-slate-500` | `#64748b` |
| Destaque de Acorde | `text-blue-600` | `#2563eb` |
| Acentos e Botões Primários | `bg-indigo-600` | `#4f46e5` |

## Wireframe — Tela da Música (Modo Normal)

```text
+-----------------------------------------------------------+
| [Menu]  Música: Título da Música           [ - ] Tom [ + ]| <--- Header
|-----------------------------------------------------------|
| [ Letra ] [ Cifra ] [ Baixo ] [ Partitura ]               | <--- Tabs de Instrumentos
|-----------------------------------------------------------|
|                                                           |
|  [Am]             [C]             [G]           [D]       | <--- Acordes estilizados
|  Letra da música rolando de forma legível                 |
|                                                           |
|             (Área de Conteúdo / Scroll)                   |
|                                                           |
+-----------------------------------------------------------+
| [ Sugerir Música ] <--- [ Líder: Thiago ]  [ Modo Palco ] | <--- Rodapé Flutuante
+-----------------------------------------------------------+
```

O rodapé flutuante (sugestão/líder/modo palco) é montado aqui como componente, mas seus botões só ganham comportamento nas fases 005/006.

## Cenários de Comportamento (Gherkin)

**Cenário: Aba do instrumento preferido**
- **Dado** que a música "Tempo Perdido" tem tabs `cifra` e `bass`
- **E** o usuário tem `instrument = 'bass'` no localStorage
- **Quando** ele abre a tela da música
- **Então** a aba "Baixo" está ativa por padrão.

**Cenário: Voz ativa em dueto**
- **Dado** um AST com blocos `role: "João"` e `role: "Maria"`
- **Quando** o usuário seleciona a voz "João"
- **Então** as linhas de Maria renderizam com opacidade 50% e as de João em destaque.

**Cenário: Tema padrão**
- **Dado** um usuário novo sem preferência salva
- **Quando** ele abre o app
- **Então** o tema é dark; ao alternar para light, a escolha persiste após reload.

## Critérios de Aceitação

- [ ] Todas as cores da UI vêm dos tokens das paletas (nenhum hex hardcoded fora da config Tailwind).
- [ ] Dashboard lista e busca músicas da banda ativa (e só dela).
- [ ] Tela da música cumpre wireframe, cenários e responsividade mobile.
- [ ] Componente de Rascunho da 002 reutilizado na edição (sem duplicação).

## Fora de Escopo

Destaque real de acordes e transposição (004), Modo Palco Extremo (006), aba Partitura funcional (008 — renderizar aba desabilitada com cadeado se a tab for PDF).
