import os

cifracore_sdd = """# Software Design Document (SDD) Completo - CifraCore
> Metodologia: Specs-Driven Development

Este documento é a fonte da verdade para a arquitetura de dados, contratos de comunicação e fluxos de estado do CifraCore.

## 1. Dicionário de Dados e Esquema Físico (Supabase / PostgreSQL)

Todas as tabelas utilizam `UUID` gerados automaticamente e campos de auditoria `created_at`. O sistema é estritamente Multi-Tenant (isolado por `band_id`).

### 1.1. Tabelas Core
* **`bands`**: `id` (PK), `name` (text, not null), `logo_url` (text, nullable).
* **`band_members`**: `id` (PK), `user_id` (FK auth.users, not null), `band_id` (FK bands, not null), `role` (enum: 'admin', 'member').
* **`songs`**: `id` (PK), `band_id` (FK bands), `title` (text), `artist` (text), `original_key` (text), `bpm` (int).
* **`song_tabs`**: `id` (PK), `song_id` (FK songs, ON DELETE CASCADE), `instrument` (enum: 'vocal', 'guitar', 'bass', 'drums', 'keys', 'cifra'), `content_type` (enum: 'ast', 'pdf_url'), `content` (jsonb para AST, text para URL).

### 1.2. Tabelas de Palco (Realtime)
* **`setlists`**: `id` (PK), `band_id` (FK bands), `name` (text), `event_date` (date).
* **`setlist_songs`**: `id` (PK), `setlist_id` (FK setlists, ON DELETE CASCADE), `song_id` (FK songs), `position` (int).
* **`live_sessions`**: `id` (PK), `band_id` (FK bands, UNIQUE), `setlist_id` (FK setlists), `leader_id` (FK auth.users), `current_song_id` (FK songs), `status` (enum: 'idle', 'playing', 'paused').

### 1.3. Políticas de Segurança (Row Level Security - RLS)
* **Regra Global de Leitura (SELECT):** Um utilizador só pode ler registos onde o `band_id` da linha corresponda a um `band_id` existente na tabela `band_members` associado ao seu `auth.uid()`.
* **Regra de Escrita (INSERT/UPDATE/DELETE):** Apenas utilizadores com `role = 'admin'` na tabela `band_members` podem alterar dados da banda, catálogo ou setlists. (Exceção: Sugestões e liderança na `live_sessions` podem ser alteradas por qualquer 'member').

---

## 2. Contratos de Interface e Payloads (API & Realtime)

### 2.1. Payload Edge Function (`import-tab`)
* **Request (Frontend -> Edge):**
  `{ "url": "https://www.cifraclub.com.br/legiao-urbana/tempo-perdido/" }`
* **Response (Edge -> Frontend) - Estado Draft:**
  ```json
  {
    "success": true,
    "data": {
      "title": "Tempo Perdido",
      "artist": "Legião Urbana",
      "original_key": "C",
      "ast": [
        { "id": 1, "type": "verse", "label": "Parte 1", "content": "Todos os dias quando acordo...", "repeats": 1, "role": "Todos" }
      ]
    }
  }