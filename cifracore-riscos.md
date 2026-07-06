# Análise de Riscos e Problemas Conhecidos - CifraCore

Como Engenheiro de Produto, antecipar as falhas de arquitetura e limitações de bibliotecas é o que separa um app amador de um produto resiliente em produção (SaaS). Abaixo estão listados os problemas conhecidos das dependências escolhidas e os gargalos da arquitetura proposta, acompanhados de suas respectivas estratégias de mitigação.

---

## 1. Problemas Conhecidos das Dependências (NPM)

### 1.1. `@tonaljs/tonal` vs. Cifras "Sujas" da Web
* **O Problema:** A biblioteca Tonal é extremamente rigorosa com a teoria musical. Ela espera notações padrão internacionais (ex: `C#m7`, `Bb7`). Plataformas como o CifraClub frequentemente contêm anomalias de digitação, regionalismos (como acordes escritos por extenso ou acentos errados) ou inversões complexas mal formatadas (ex: `C/G` escrito de forma truncada, ou notas de passagem como `A(add9)` com caracteres especiais). Se o texto "sujo" for passado diretamente para o método de transposição do Tonal, a biblioteca retornará um objeto vazio (`empty`) ou poderá quebrar a renderização da linha.
* **Mitigação:** O Frontend Svelte nunca deve passar a cifra bruta para o Tonal. Deve haver uma camada intermediária de sanitização (Sanitizer) via Regex que padroniza os acordes antes da transposição. Caso o Tonal não reconheça o acorde após a limpeza, o sistema deve adotar um comportamento defensivo: manter o acorde original intocado como texto puro, em vez de quebrar a tela.

### 1.2. `worker-timers` vs. Gerenciamento de Energia do Sistema Operacional (iOS/Android)
* **O Problema:** Embora o `worker-timers` use Web Workers para fugir do estrangulamento (*throttling*) padrão do JavaScript quando a aba do navegador perde o foco, os sistemas operacionais móveis modernos (especialmente o iOS/Safari) adotam políticas agressivas de economia de energia. Se a tela do tablet/celular apagar por inatividade ou o usuário bloquear o aparelho, o sistema operacional pode suspender a thread inteira do Web Worker. Quando o músico reativar a tela, o metrônomo ou o auto-scroll darão um "salto" violento para compensar o tempo perdido, quebrando a sincronia com a banda.
* **Mitigação:** O PWA deve implementar obrigatoriamente a **Wake Lock API** (`navigator.wakeLock.request('screen')`) assim que o músico entrar no "Modo Palco". Isso impede via software que o sistema operacional apague a tela ou entre em modo de hibernação durante o show.

### 1.3. `svelte/motion` (`tweened`) vs. Interação Manual do Músico
* **O Problema:** A função `tweened` do Svelte faz uma interpolação matemática linear contínua para atualizar a posição do scroll (ex: de 0px a 2000px em 180 segundos). Se o auto-scroll estiver ativo e o músico tentar usar o dedo na tela para rolar manualmente para cima (porque se perdeu ou quer revisar uma parte anterior), haverá um conflito severo de hardware/software: o usuário força o scroll para cima, mas o loop do `tweened` força o scroll de volta para a posição matemática do milissegundo atual, causando um efeito de trepidação (*stuttering*) inutilizável.
* **Mitigação:** É necessário interceptar os eventos de toque (`touchstart`, `wheel`, `mousedown`) na área da cifra. No momento em que qualquer interação manual for detectada, o app deve pausar imediatamente o `tweened` do auto-scroll, liberando o controle para o músico e exibindo um botão flutuante de "Retomar Sincronia".

---

## 2. Gargalos e Riscos de Arquitetura

### 2.1. Conexão Instável de Palco vs. Supabase Realtime (Broadcast)
* **O Problema:** Ambientes de show (bares, estúdios subterrâneos, palcos de festivais) possuem conexões de rede notoriamente caóticas, com alta perda de pacotes e flutuação de latência (*jitter*). Se a arquitetura enviar a posição exata do scroll do Líder (pixel por pixel) continuamente via WebSockets, a rede vai saturar, estourando os limites de taxa (*rate limits*) do Supabase e fazendo as telas dos outros músicos darem "teletransportes" e travadas devido a pacotes que chegam fora de ordem.
* **Mitigação:** **Nunca envie dados de scroll contínuo via rede.** O Supabase Realtime deve sincronizar apenas "Gatilhos de Eventos" (ex: `PLAY`, `PAUSE`, `RESET` ou `MUDOU_PARA_BLOCO_ID`). Quando o líder aperta o Play, o sinal é enviado e cada dispositivo roda o seu próprio relógio local via `worker-timers` e roda o seu próprio auto-scroll. Se houver descompasso, o líder pode enviar um sinal de "re-sync" sutil que realinha os tempos locais.

### 2.2. Fragilidade de Web Scraping em Edge Functions
* **O Problema:** Depender de scraping de terceiros (CifraClub e Ultimate Guitar) coloca o coração da Fase 1 sob risco constante. Essas plataformas mudam suas estruturas de HTML sem aviso prévio para proteger seus direitos intelectuais ou implementam barreiras rígidas como o Cloudflare WAF (Web Application Firewall). O Ultimate Guitar, por exemplo, bloqueia requisições puras de servidores (como as Edge Functions do Supabase) retornando erro `403 Forbidden`.
* **Mitigação:** 1. A Edge Function deve usar cabeçalhos de requisição (*User-Agent*) que simulem navegadores reais.
  2. A arquitetura deve tratar o scraping como um *facilitador*, mas nunca como uma dependência única. O app deve fornecer uma área de texto estruturada ("Modo Avançado") onde o usuário pode simplesmente copiar o texto da cifra na web, colar no app, e o parser local do Svelte faz a divisão em blocos AST da mesma forma.

### 2.3. Desdobramento Linear (Unroll) vs. Desempenho de Renderização (DOM Size)
* **O Problema:** Músicas longas com muitas repetições (ex: refrão que se repete 4 ou 6 vezes, solos intermeados) quando passam pelo processo de "Desdobramento Linear" geram uma árvore de elementos HTML muito grande na tela. Se o app processar a estilização de acordes via Regex e teoria musical do Tonal individualmente para cada bloco duplicado em tempo de execução, a troca de músicas pode apresentar um atraso perceptível (*layout shifting* e engasgos de CPU), especialmente em tablets ou celulares mais antigos da banda.
* **Mitigação:** O desdobramento linear deve ser computado na camada de dados (JavaScript puro) antes de enviar para o renderizador do Svelte. O array resultante deve ser estático e imutável durante a exibição, utilizando a diretiva `{#each songs as song (song.id)}` com chaves exclusivas para que o Svelte faça a renderização otimizada diretamente no Virtual DOM.
