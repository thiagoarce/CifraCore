# BACKLOG — Pós-MVP

Ideias aprovadas em conceito, mas fora do escopo do MVP. Antes de implementar qualquer item: criar `specs/NNN-nome/` completo (spec + plan + tasks) seguindo a `constitution.md`.

## Renderização Avançada

- **AlphaTab (.gp / MusicXML):** tablaturas profissionais renderizadas nativamente. Adiado: dependência pesada, nicho de usuários; exige spec próprio de UX (player? cursor?). `song_tabs.content_type` ganharia `'gpx_url'`.
- **Construtor de Tablaturas:** interface para redigir e transpor tablaturas numéricas manualmente. Adiado: editor é um produto em si; validar demanda antes.
- **Diagramas de acorde:** popover com o desenho do acorde ao tocar nele.

## Importação

- **Ultimate Guitar:** estratégia adicional na Edge Function `import-tab`. Marcado "se viável": UG bloqueia servidores (403/WAF) — reavaliar custo/fragilidade; o Modo Avançado já cobre o caso na prática.
- **Detecção automática de tom** pela análise dos acordes importados.

## Palco e Sessão

- **Metrônomo audível:** clock visual/sonoro por música (BPM). Adiado do MVP: sincronizar áudio entre devices é difícil (latências distintas) e o baterista dá o tempo; reavaliar como metrônomo **local** apenas para ensaio individual.
- **Anotações pessoais por músico:** notas privadas por música (ex: "entrar depois do violão"), visíveis só ao autor. Tabela nova `member_song_notes` + RLS por `user_id`.
- **Histórico de shows:** sessões encerradas viram registro (o que foi tocado, em que ordem).

## Utilidades

- **Exportar setlist em PDF:** backup de papel para o palco. Geração client-side.
- **OAuth social (Google):** conveniência de cadastro.
- **Edição offline com sincronização:** editar catálogo offline e reconciliar ao voltar — complexidade alta (merge), só com demanda real.
