# Projeto CifraCore - Especificação de Produto (PRD)

## 1. Visão do Produto (Plataforma SaaS Multi-Banda)
Um Web App Responsivo (PWA) criado para bandas gerenciarem seus repertórios e sincronizarem cifras/partituras em tempo real no palco. O sistema é "Multi-Tenant", permitindo que um mesmo músico participe de várias bandas.

**Diferenciais Competitivos:**
* **Multi-Visão por Instrumento:** Uma música, várias abas (Letra, Cifra, Baixo, Partitura).
* **Fricção Zero:** Importação automática via raspagem de URLs.
* **Liderança Democrática:** Qualquer membro sugere e pode assumir o controle do setlist.
* **Tolerância a "Palco Sem Internet":** Cache offline agressivo via Service Worker.

## 2. Stack Tecnológico
* **Frontend:** SvelteKit (PWA nativo com suporte Offline) + Tailwind CSS.
* **UI/UX:** Suporte nativo a Temas (Dark Mode Padrão / Light Mode) e Modo Palco Extremo.
* **Backend / Banco de Dados:** Supabase (PostgreSQL + Storage para logos e PDFs).
* **Sincronia Ao Vivo:** Supabase Realtime (Canais de Broadcast).
* **Web Scraping:** Supabase Edge Functions (Strategy Pattern para importações).

## 3. Estrutura Base de Dados (Visão Geral)
* `bands`: Perfis das bandas (nome, logo).
* `band_members`: Vínculo dos usuários com as bandas (níveis de acesso).
* `songs`: Catálogo global ou por banda (com metadados).
* `song_tabs`: As versões dos instrumentos (Letra, Cifra, Tablatura, PDF).
* `setlists` & `setlist_songs`: As listas de shows, pertencentes a uma banda específica.
* `live_sessions`: O estado atual do palco (Sessão Realtime da banda).

---

## 4. Roadmap de Desenvolvimento (Fases de Implantação)

### Fase 1: Fundação Multi-Banda, Data-First e Motor de Importação
* Configurar SvelteKit, TailwindCSS (configurando paletas Dark/Light) e inicializar o Supabase.
* Implementar Autenticação e tabelas principais (`bands`, `band_members`, `songs`, `song_tabs`).
* **[Data-First] Motor de Importação:** Desenvolver Supabase Edge Function para importar cifras (CifraClub inicial) via URL.
* **[Data-First] Bootstrapping:** Criar script Node.js para importação em lote lendo um arquivo `.txt` local para popular o banco de dados antes de criar a UI.

### Fase 2: O Catálogo e as Abas (Interface Base e Offline)
* Criar a UI principal (Dashboard e Sidebar) aplicando o Design System.
* Construir a tela de Visualização da Música com navegação por abas.
* **Service Worker Base:** Configurar o PWA para cache estático e offline.
* **Modo Palco Extremo:** Visão de túnel, ocultando menus laterais.

### Fase 3: Inteligência Musical e Expansão de Scrapers
* Adicionar identificação de acordes (Regex) para destaque visual com cores do tema.
* Função matemática de **Transposição de Tom (+1/-1 Semitom)** na interface.
* Expandir a Edge Function para suportar Ultimate Guitar.

### Fase 4: O Palco e a Sincronia (Realtime)
* Implementar módulo de Setlists e a tabela `live_sessions` (Supabase Realtime).
* **Modos de Sincronia:** Seguir Líder, Metrônomo (Auto-scroll), Individual.
* **Suporte a Pedal Bluetooth:** Event listeners de teclado para rolar a tela ou passar de música.
* **Modo Convidado:** Acesso read-only temporário para músicos substitutos no show atual.

### Fase 5: Construtor de Tabs e Arquivos Nativos
* Visualizador nativo de PDFs via Supabase Storage.
* Interface (Construtor) para redigir e transpor tablaturas numéricas manualmente.