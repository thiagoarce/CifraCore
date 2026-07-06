# Especificações Técnicas e de Engenharia - CifraCore

## 1. Dependências Críticas de Engenharia
Para garantir precisão musical e imunidade a engasgos de performance em dispositivos móveis, o projeto deve adotar obrigatoriamente:
* **`@tonaljs/tonal`**: Biblioteca core para toda a matemática e teoria musical (transposição de acordes sem usar Regex puro e complexo).
* **`worker-timers`**: Substitui o `setInterval` nativo. Roda o relógio do metrônomo e do auto-scroll em um Web Worker, impedindo que o iOS/Android congelem a rolagem se a tela escurecer.
* **`svelte/motion` (`tweened`)**: Usado nativamente para a matemática de interpolação do auto-scroll proporcional das abas, garantindo fluidez.

---

## 2. Design System e Paleta de Cores (Tailwind)
O aplicativo deve suportar alternância de temas, com o **Dark Mode como padrão absoluto**. 

### Paleta Dark Mode (Padrão de Palco)
* **Fundo App / Containers:** `bg-slate-900` / `bg-slate-800`
* **Texto Principal (Letra/Cifra):** `text-slate-50`
* **Texto Secundário / Voz Inativa (Duetos):** `text-slate-500` (Opacidade reduzida para não confundir os cantores).
* **Destaque de Acorde / Voz Ativa:** `text-amber-400` (Amarelo alto contraste).

### Wireframe - Tela de Palco (Modo Extremo / Visão de Túnel)
Oculta componentes (Header, Sidebar) via injeção de classe `fullscreen-mode` para evitar emissão de luz indesejada.
```text
+-----------------------------------------------------------+
|                                                           |
|  [Voz: Maria] (Linha com opacidade reduzida 50%)          |
|  Eu fecho os olhos e posso ver...                         |
|                                                           |
|  [Am]             [C]             [G]                     |
|  [Voz: João] (Linha em Destaque Brilhante)                |
|  O vento sopra, a noite cai...                            |
|                                                           |
| [X] <--- (Botão pequeno e translúcido para Sair)          |
+-----------------------------------------------------------+