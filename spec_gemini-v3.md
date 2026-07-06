# Documentação Oficial - CifraCore

Documento central da arquitetura e especificações do projeto CifraCore, gerado através de Specs-Driven Development.

## 1\. PRD (Especificação do Produto)

### 1.1. Visão do Produto (Plataforma SaaS Multi-Banda)

Um Web App Responsivo (PWA) criado para bandas gerirem os seus repertórios e sincronizarem cifras/partituras em tempo real no palco. O sistema é "Multi-Tenant", permitindo que um mesmo músico participe em várias bandas.

- **Multi-Visão por Instrumento:** Uma música, várias abas (Letra, Cifra, Baixo, Partitura).
- **Fricção Zero com Revisão (HITL):** Importação automática via web scraping, mas com interface de validação humana antes de guardar.
- **Liderança Democrática:** Qualquer membro sugere e pode assumir o controlo do setlist.
- **Tolerância a "Palco Sem Internet":** Cache offline agressivo via Service Worker.

### 1.2. Roadmap de Desenvolvimento

- **Fase 1:** Fundação Multi-Banda, Data-First e Motor de Importação (Cloudflare + Supabase).
- **Fase 2:** O Catálogo, Revisão HITL e Abas.
- **Fase 3:** Inteligência Musical (AST e Linearização).
- **Fase 4:** O Palco e a Sincronia (Realtime + Wake Lock).
- **Fase 5:** Ficheiros Nativos (PDFs).

## 2\. SDD e Esquema de Banco de Dados

### 2.1. Tabelas Core e RLS

O sistema utiliza PostgreSQL no Supabase com isolamento Multi-Tenant por band_id.

| Tabela                    | Campos Principais                                               | Regra RLS                                                 |
| ------------------------- | --------------------------------------------------------------- | --------------------------------------------------------- |
| **bands**                 | id, name, logo_url                                              | Leitura para membros. Escrita restrita a administradores. |
| ---                       | ---                                                             | ---                                                       |
| **band_members**          | id, user_id, band_id, role ('admin', 'member')                  | Leitura para membros vinculados.                          |
| ---                       | ---                                                             | ---                                                       |
| **songs** / **song_tabs** | id, band_id, title, instrument, content_type ('ast', 'pdf_url') | Totalmente isolado pelo tenant (band_id) da banda.        |
| ---                       | ---                                                             | ---                                                       |
| **live_sessions**         | id, band_id, leader_id, current_song_id, status                 | Qualquer membro pode ler, sugerir e assumir liderança.    |
| ---                       | ---                                                             | ---                                                       |

### 2.2. Gestão de Estado no Frontend (SvelteKit Stores)

- \$currentBand: Banda ativa do utilizador.
- \$liveSession: Estado Realtime da banda no palco.
- \$renderedAST: Derived store que recalcula transposição via TonalJS sem mutar a base de dados original.
- \$scrollProgress: Tweened store gerida via worker-timers para auto-scroll suave.

## 3\. Especificações Técnicas e Design System

### 3.1. Infraestrutura e Dependências Críticas

- **Alojamento Frontend:** Cloudflare Pages (utilizando @sveltejs/adapter-cloudflare).
- **@tonaljs/tonal:** Core para matemática e teoria musical.
- **worker-timers:** Previne congelamentos de background em iOS/Android.
- **svelte/motion:** Interpolação nativa (tweened) para auto-scroll.

### 3.2. Payload e Contratos (Human-in-the-Loop)

Exemplo de Payload de rascunho retornado pela Edge Function para validação humana:

{  
"success": true,  
"data": {  
"title": "Tempo Perdido",  
"artist": "Legião Urbana",  
"ast": \[  
{ "id": 1, "type": "verse", "label": "Parte 1", "content": "Todos os dias quando...", "repeats": 1 }  
\]  
}  
}

## 4\. Análise de Riscos e Mitigação

| Gargalo Identificado                      | Mitigação de Arquitetura                                                                           |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Acordes "Sujos" quebrando a Matemática    | Camada de sanitização via Regex; graceful degradation para texto puro em caso de erro do parser.   |
| ---                                       | ---                                                                                                |
| Supressão de Threads Móveis (iOS/Android) | Implementação da Wake Lock API para manter a tela obrigatoriamente ligada em Modo Palco.           |
| ---                                       | ---                                                                                                |
| Auto-Scroll x Toque Manual                | Interação do toque pausa imediatamente a tweened interpolator. Botão flutuante para retomar.       |
| ---                                       | ---                                                                                                |
| Saturação de Rede no Palco via WebSockets | Enviar dados apenas via "Gatilhos de Estado" (ex: PLAY, PAUSE), sem enviar posições pixel a pixel. |
| ---                                       | ---                                                                                                |