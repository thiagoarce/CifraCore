# Especificações Técnicas e de Engenharia - CifraCore

## 1. Design System e Paleta de Cores (Tailwind)

O aplicativo deve suportar alternância de temas (Dark/Light), com o **Dark Mode como padrão absoluto** devido ao ambiente de palco. As cores dos acordes devem garantir alto contraste para leitura rápida.

### Paleta Dark Mode (Padrão)
* **Fundo App (Background):** `bg-slate-900` (#0f172a)
* **Fundo Containers (Cards/Menu):** `bg-slate-800` (#1e293b)
* **Texto Principal (Letra da música):** `text-slate-50` (#f8fafc)
* **Texto Secundário (UI/Menus):** `text-slate-400` (#94a3b8)
* **Destaque de Acorde (Regex):** `text-amber-400` (#fbbf24) - *Amarelo para máximo contraste e leitura periférica em ambientes escuros.*
* **Acentos e Botões Primários:** `bg-indigo-500` (#6366f1)

### Paleta Light Mode (Para Ensaios/Estudos de Dia)
* **Fundo App (Background):** `bg-slate-50` (#f8fafc)
* **Fundo Containers (Cards/Menu):** `bg-white` (#ffffff)
* **Texto Principal (Letra da música):** `text-slate-900` (#0f172a)
* **Texto Secundário (UI/Menus):** `text-slate-500` (#64748b)
* **Destaque de Acorde (Regex):** `text-blue-600` (#2563eb) - *Azul forte para garantir legibilidade sobre fundos claros.*
* **Acentos e Botões Primários:** `bg-indigo-600` (#4f46e5)

---

## 2. Wireframes de Usabilidade (Visão de Palco)

O layout da rota da música ativa deve seguir estritamente o modelo de reconhecimento rápido, priorizando toques fáceis para músicos com as mãos ocupadas.

### 2.1. Tela de Palco (Modo Normal)
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
|                                                           |
|             (Área de Conteúdo / Scroll)                   |
|                                                           |
|                                                           |
+-----------------------------------------------------------+
| [ Sugerir Música ] <--- [ Líder: Thiago ]  [ Modo Palco ] | <--- Rodapé Flutuante
+-----------------------------------------------------------+