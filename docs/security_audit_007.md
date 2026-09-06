# Relatório Formal e Exaustivo de Auditoria de Segurança e Diagnóstico 007
**Projeto**: KumonGen / mathbook-main (Versão Canônica 3.9.0)  
**Agente Especialista**: Worker M2 — Chief Security Architect AI (Framework 007)  
**Data da Emissão**: 2026-09-06  
**Status do Documento**: Diagnóstico Consultivo Estrito (Backend/Frontend Freeze Respeitado)  
**Referência Normativa**: Framework 007 (Licença para Auditar), STRIDE, DREAD, PASTA (7 Estágios), OWASP Client-Side / PWA  

---

## 1. Resumo Executivo e Escopo do Diagnóstico

### 1.1 Contexto e Arquitetura do Sistema
O **KumonGen** é uma plataforma educacional desenvolvida segundo os princípios do Método Kumon de aprendizagem autodirigida e progressiva. A aplicação opera com uma arquitetura **100% *client-side* (Zero Backend)** na forma de uma Progressive Web Application (PWA). O sistema cumpre duas funções pedagógicas principais:
1. **Gerador Curricular de Cadernos Didáticos**: Montagem e compilação de folhas de exercícios em formato A4 para impressão física e geração de pacotes semanais (PDFs de 10 páginas com gabarito integrado), compreendendo 25 níveis curriculares distribuídos em Matemática (M1–M10), Português (P1–P8) e Inglês (I1–I7), implementados em `matematica.js`, `portugues.js`, `ingles.js` e compilados via `gerador.js`.
2. **Tablet Player & Treino Interativo**: Interface interativa de treino diário (`tablet.html` e `tablet-player.js`) equipada com sintetizador de áudio Web Audio (`SoundEngine`), reconhecimento por voz (`SpeechSynthesis`), cronômetro SCT (Standard Completion Time), teclado virtual responsivo e loop de gamificação/maestria (*Gauntlet Mode*).

Por se tratar de uma aplicação sem camada de servidor dedicado, **todo o estado persistente do sistema é armazenado no navegador do usuário** através da Web Storage API (`window.localStorage`). Isso inclui identificadores de alunos, nomes, idades, preferências de mascotes, estrelas acumuladas, sequências de ofensiva (*streaks*), registros de maestria curricular e histórico de cadernos gerados.

### 1.2 Metodologia da Auditoria 007
Esta auditoria foi conduzida em conformidade estrita com o protocolo de 6 fases do framework **007 (Chief Security Architect AI)**:
```
+---------------------------------------------------------------------------------------------------+
|                                 CICLO DE AUDITORIA FORMAL 007                                     |
+---------------------------------------------------------------------------------------------------+
|  FASE 1: Mapeamento Detalhado da Superfície de Ataque e Trust Boundaries                          |
|  FASE 2: Modelagem Formal de Ameaças STRIDE e Matriz Quantitativa DREAD                           |
|  FASE 3: Modelagem PASTA (Process for Attack Simulation and Threat Analysis) em 7 Estágios       |
|  FASE 4: Checklist Técnico OWASP Client-Side / PWA Top 10                                         |
|  FASE 5: Simulação Red Team e Provas de Conceito (PoCs) de Exploração                             |
|  FASE 6: Plano de Hardening e Remediação Defensiva Blue Team                                      |
+---------------------------------------------------------------------------------------------------+
```

### 1.3 Diretriz de Governança (Freeze de Produção)
Em conformidade com as regras globais do projeto KumonGen e as instruções do orquestrador, **nenhum arquivo de código de produção foi modificado** durante este diagnóstico. Este relatório possui caráter estritamente consultivo e prescreve as especificações técnicas exatas para a futura sprint de mitigação.

### 1.4 Veredito Consolidado Preliminar
O KumonGen obteve uma pontuação ponderada consolidada de **59.5 / 100**, resultando no veredito formal **BLOQUEADO PARCIAL (Nível C — Requer correções mandatórias de segurança antes de liberação para ambiente de produção)**. Embora a ausência de backend mitigue riscos clássicos de injeção SQL e vazamento de segredos de servidor, a aplicação apresenta vulnerabilidades críticas de integridade de dados locais, injeção de scripts no DOM (*DOM-based XSS*) e ausência de mecanismos defensivos de rede (SRI e CSP).

---

## 2. Fase 1: Mapeamento Detalhado da Superfície de Ataque

### 2.1 Diagrama da Superfície e Fronteiras de Confiança (*Trust Boundaries*)
O mapeamento identificou quatro fronteiras de confiança fundamentais na arquitetura do KumonGen:

```
[ Usuário / Vetor Externo ]
         │
         ▼  (Fronteira 1: Não Confiável)
┌─────────────────────────────────────────────────────────────┐
│  PONTOS DE ENTRADA DO DOM                                   │
│  - Campos de Formulário (Nome do Aluno, Idade, Mascote)     │
│  - Prompt Nativo (window.prompt no Tablet Player)           │
│  - Leitor de Arquivos (input type="file" para Backup JSON)  │
│  - Parâmetros de Query String (URLSearchParams: sub, lvl)   │
└──────────────────────────────┬──────────────────────────────┘
                               │
         ▼ (Fronteira 2: Semi-Confiável / Ausência de Validação)
┌─────────────────────────────────────────────────────────────┐
│  SUBSISTEMA DE PERSISTÊNCIA (STORAGE)                       │
│  - SafeStorage (Closure Privada em student-profiles.js)     │
│  - window.localStorage Direto (Bypass em 5 arquivos)        │
│  - Chaves: kumongen_students, kumongen_history, etc.        │
└──────────────────────────────┬──────────────────────────────┘
                               │
         ▼ (Fronteira 3: Suposição Falha de Confiança)
┌─────────────────────────────────────────────────────────────┐
│  MOTOR DE INTERPOLAÇÃO E RENDERIZAÇÃO DOM                   │
│  - modal.innerHTML (student-profiles.js, tablet-player.js)  │
│  - Container de Celebração e Troféus do Tablet              │
└──────────────────────────────┬──────────────────────────────┘
                               │
         ▼ (Fronteira 4: Rede Externa / CDNs Remotas)
┌─────────────────────────────────────────────────────────────┐
│  DEPENDÊNCIAS EXTERNAS E SERVICE WORKER                     │
│  - cdnjs.cloudflare.com (jsPDF, html2canvas, Font Awesome)  │
│  - sw.js (Cache Storage: Stale-While-Revalidate)            │
│  - Ausência de Subresource Integrity (SRI)                  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Mecanismos de Armazenamento: SafeStorage e Bypasses
* **Implementação Localizada**: `student-profiles.js` (linhas 10 a 46).
* **Diagnóstico Estrutural**:
  O objeto `SafeStorage` foi concebido para mitigar restrições de navegadores em modo estrito (como Safari em aba anônima ou navegadores com bloqueio de cookies de terceiros) implementando um fallback transparente em memória (`_mem`):
  ```javascript
  const SafeStorage = {
      _mem: {},
      getItem(key) { ... },
      setItem(key, value) { ... },
      removeItem(key) { ... }
  };
  ```
* **Falha de Encapsulamento e Isolamento**:
  O identificador `SafeStorage` foi declarado com escopo restrito dentro da IIFE `(function(window) { ... })(window);`. Na linha 1107, apenas `StudentProfileEngine` é exportado para o escopo global (`window.StudentProfileEngine = StudentProfileEngine;`). `SafeStorage` **não é disponibilizado** em `window.SafeStorage` nem como membro estático de `StudentProfileEngine`.
* **Chamadas Desprotegidas e Bypassed na Aplicação**:
  Como o wrapper não é global, múltiplos módulos realizam chamadas diretas ao objeto nativo `window.localStorage` sem interceptação de erros:
  - `gerador.js`:
    - Linha 1146: `localStorage.setItem('kumongen_history', JSON.stringify(history.slice(0, 30)));` (sem `try...catch`).
    - Linha 1181: `localStorage.setItem('kumongen_history', JSON.stringify(history));` (sem `try...catch`).
    - Linhas 38, 47, 416, 419, 1135, 1164, 1174, 1210: leituras e manipulações sem validação de integridade.
  - `tablet-player.js`:
    - Linha 41: `localStorage.setItem('kumongen_tablet_muted', this.muted ? 'true' : 'false');` (sem `try...catch`).
    - Linha 217: `localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));` (sem `try...catch`).
    - Linhas 24, 194, 292, 756, 765, 1009: leituras e escritas dispersas.
  - `matematica.js`:
    - Linhas 70-71: `localStorage.setItem('kumongen_mat_level', currentLevelId); localStorage.setItem('kumongen_mat_params', ...);` (sem `try...catch`).
  - `portugues.js`:
    - Linhas 175-176: escrita direta sem `try...catch`.
  - `ingles.js`:
    - Linhas 75-76: escrita direta sem `try...catch`.

* **Consequência Técnica**: Quando a cota de armazenamento local é atingida (~5MB padrão na maioria dos navegadores baseados em Chromium/WebKit) ou o armazenamento local é restrito por políticas corporativas/parentais, qualquer invocação desprotegida de `setItem` dispara `DOMException: QuotaExceededError`. Como a chamada não é interceptada, a pilha síncrona do JavaScript é interrompida, resultando no congelamento (*crash*) do gerador de folhas ou do Tablet Player.

### 2.3 Resiliência a JSON Malformado e Risco de Destruição de Estado
Em `student-profiles.js` (linhas 201 a 210), o método `getAll()` implementa a leitura e desserialização da base de dados de alunos:
```javascript
getAll() {
    try {
        const raw = SafeStorage.getItem(STORAGE_STUDENTS);
        if (!raw) return _migrateLegacyData();
        const list = JSON.parse(raw);
        if (!Array.isArray(list) || list.length === 0) return _migrateLegacyData();
        return list;
    } catch (e) {
        return _migrateLegacyData();
    }
}
```
Caso a chave `kumongen_students` sofra corrupção parcial (ocorrência comum quando o usuário fecha a aba do navegador exatamente no instante em que `JSON.stringify` está sendo persistido, falha de bateria no tablet, ou manipulação de depuração no console), `JSON.parse(raw)` lança uma exceção `SyntaxError`. O fluxo é desviado imediatamente para o bloco `catch (e)`, que invoca `_migrateLegacyData()`.

Na linha 167 de `student-profiles.js`, a rotina de migração executa:
```javascript
SafeStorage.setItem(STORAGE_STUDENTS, JSON.stringify(initialList));
```
Onde `initialList` contém apenas um perfil genérico padrão (`std_default`). **Resultado**: Todo o histórico do aluno, dados de ofensiva diária, pontuação de gamificação e troféus de maestria acumulados ao longo de meses são sumariamente sobrescritos e destruídos sem qualquer tentativa de isolamento, aviso ao usuário ou backup de quarentena.

### 2.4 Manipulação de innerHTML e Inserção Dinâmica de Nós DOM
A auditoria identificou múltiplos pontos de concatenação direta de dados controlados pelo usuário em templates avaliados via propriedade `.innerHTML`:

1. **Lista de Perfis de Alunos (`student-profiles.js:750`)**:
   ```javascript
   <h4 style="font-size: 1.15rem; font-weight: 800; color: #1e293b; margin: 0 0 4px 0;">${s.name}</h4>
   ```
   Injetado no DOM via `modal.innerHTML = ...` (linha 783). O nome do aluno (`s.name`) é interpolado sem qualquer tratamento de escape.
2. **Formulário de Edição de Perfil (`student-profiles.js:969`)**:
   ```javascript
   <input type="text" id="inputStudentName" required maxlength="25" placeholder="Ex: Theo, Alice, Lucas..." value="${currentName}" ...>
   ```
   Injetado via `modal.innerHTML = ...` (linha 949). Caso `currentName` contenha aspas duplas, ocorre a quebra do atributo HTML, permitindo injeção de manipuladores de eventos em linha (ex: `" onfocus="alert(1)`).
3. **Modal de Celebração de Conclusão do Tablet (`tablet-player.js:2641`)**:
   ```javascript
   <h3 class="text-2xl font-black text-slate-900">Parabéns, ${Session.studentName}!</h3>
   ```
   Injetado no DOM via `modal.innerHTML = ...` (linha 2628) sempre que uma rodada de exercícios ou Gauntlet é finalizada.
4. **Modal de Troféus e Conquistas do Tablet (`tablet-player.js:2741`)**:
   ```javascript
   <p class="text-xs text-slate-500">Aluno(a): <strong>${Session.studentName}</strong></p>
   ```
   Injetado no DOM via `modal.innerHTML = ...` (linha 2732).
5. **Configurações Avançadas do Gerador (`matematica.js:279`)**:
   ```javascript
   <input type="text" id="qtyNumbers" value="${customParams.qtyNumbers.join(',')}">
   ```
   Valores recuperados do storage são inseridos sem sanitização em atributos de input.
6. **Assimetria de Defesas**: Em `gerador.js:23-27`, existe uma função sanitizadora:
   ```javascript
   function sanitizeText(text) {
       const div = document.createElement('div');
       div.textContent = String(text);
       return div.innerHTML;
   }
   ```
   Esta função é privada em `gerador.js` e **não foi adotada** em `student-profiles.js` nem em `tablet-player.js`.

### 2.5 Ingestão de Inputs e Falha Crítica no Backup
* **Entrada de Nomes**:
  - `student-profiles.js:239`: A criação de perfil apenas executa `const trimmedName = (name || '').trim();`. Não há filtro contra caracteres reservados HTML (`<`, `>`, `"`, `'`, `&`).
  - `tablet-player.js:1006`: `const newName = prompt('Qual é o nome do(a) aluno(a)?', Session.studentName);`. Recebe strings arbitrárias sem qualquer sanitização.
* **Mecanismo de Restauração de Backup (`student-profiles.js:890-908`)**:
  A interface fornece o botão "Restaurar Backup" acoplado a um leitor de arquivos (`#inputImportProfiles`). Ao selecionar um arquivo JSON, a linha 897 executa:
  ```javascript
  const res = self.importBackup(evt.target.result);
  ```
  **Vulnerabilidade / Defeito**: O método `importBackup` **não foi implementado** em `StudentProfileEngine`. A execução dispara imediatamente:
  ```
  Uncaught TypeError: self.importBackup is not a function
      at FileReader.reader.onload (student-profiles.js:897)
  ```
  Isso representa tanto um defeito funcional bloqueante quanto um risco de segurança futuro: quando implementado, caso aceite o arquivo sem validação de esquema (*Schema Validation*) e escape de strings, permitirá o carregamento de bases contendo payloads maliciosos de injeção XSS persistida.

### 2.6 Service Worker e Cache Storage (`sw.js`)
* **Identificador de Cache**: `CACHE_NAME = 'kumongen-v4.0.0'`.
* **Escopo de Controle**: `/` (Raiz do domínio).
* **Estratégia de Interceptação de CDNs (`sw.js:74-90`)**:
  O Service Worker aplica a estratégia *Stale-While-Revalidate (SWR)* para requisições direcionadas aos domínios de CDN (`cdn.tailwindcss.com`, `html2canvas.hertzen.com`, `cdnjs.cloudflare.com`, `unpkg.com`):
  ```javascript
  const fetchPromise = fetch(event.request).then(response => {
      if (response && response.ok) {
          cache.put(event.request, response.clone());
      }
      return response;
  }).catch(() => cached);
  return cached || fetchPromise;
  ```
* **Riscos Identificados**:
  1. **Persistência de Conteúdo Adulterado (*Cache Poisoning*)**: A estratégia prioriza o cache local (`return cached || fetchPromise`). Se uma biblioteca remota sofrer contaminação ou se um atacante interceptar uma requisição em rede não segura inserindo um script adulterado no cache, o arquivo malicioso será servido continuamente em todas as execuções posteriores da PWA, persistindo indefinidamente até a invalidação manual do cache.
  2. **Tratamento de Respostas Opacas**: Requisições de origens cruzadas sem configuração de cabeçalho CORS explícito retornam respostas opacas (`status = 0`, `ok = false`). O teste `if (response && response.ok)` falha para respostas opacas válidas, podendo impedir que certos ativos de CDN sejam armazenados corretamente no cache offline.

### 2.7 Dependências CDN Remotas e Ausência de Subresource Integrity (SRI)
As seguintes dependências externas são consumidas diretamente através de links de terceiros sem atributos de integridade criptográfica:
1. `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css`:
   - Referenciado em `tablet.html:9`, `index.html:11`, `ingles.html:8`, `matematica.html:8`, `portugues.html:8`.
   - **Riscos**: Ausência de atributo `integrity`. A versão `6.0.0-beta3` é uma versão preliminar defasada (lançada em 2021).
2. `https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js`:
   - Tag estática `<script>` em `tablet.html:331` sem `integrity` e sem `crossorigin`.
   - Carregamento dinâmico via função `loadScript()` em `gerador.js:724, 930` e `student-profiles.js:418`.
3. `https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js`:
   - Carregamento dinâmico via `loadScript()` em `gerador.js:723, 929`.
4. **Análise de `loadScript()` (`gerador.js:11-20`)**:
   ```javascript
   function loadScript(src) {
       return new Promise((resolve, reject) => {
           if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
           const s = document.createElement('script');
           s.src = src;
           s.onload = resolve;
           s.onerror = () => reject(new Error('Falha ao carregar: ' + src));
           document.head.appendChild(s);
       });
   }
   ```
   A injeção de script dinâmico não aceita nem configura `s.integrity` ou `s.crossOrigin = 'anonymous'`. Qualquer comprometimento de CDN ou adulteração man-in-the-middle em redes abertas permite a injeção remota de código no cliente.

### 2.8 Ausência de Cabeçalhos de Segurança HTTP e Content Security Policy (CSP)
* O repositório não dispõe de arquivo de configuração de borda (ex: `vercel.json`, `netlify.toml` ou `.htaccess`) para definir cabeçalhos de resposta HTTP.
* Nenhum dos documentos HTML possui a tag `<meta http-equiv="Content-Security-Policy">`.
* **Impacto**:
  - Scripts inline (`'unsafe-inline'`) são executados livremente pelo motor do navegador.
  - Não há restrições de origens para conexões externas via `fetch` ou `XMLHttpRequest`.
  - Ausência do cabeçalho `X-Frame-Options` ou diretiva `frame-ancestors`, permitindo ataques de sequestro de clique (*Clickjacking*).
  - Ausência de `X-Content-Type-Options: nosniff`.

---

## 3. Fase 2: Modelagem Formal de Ameaças STRIDE & Matriz DREAD

### 3.1 Classificação Estruturada STRIDE
A metodologia STRIDE decompõe as ameaças aos componentes e fronteiras de confiança do KumonGen:

```
+---------------------------------------------------------------------------------------------------+
| S - Spoofing (Falsificação de Identidade)                                                         |
+---------------------------------------------------------------------------------------------------+
| Ameaça S-01: Colisão ou falsificação de ID de Estudante                                           |
| Mecanismo: _generateId() utiliza 'std_' + Date.now().toString(36) + Math.random().toString(36).   |
| Vetor: Em ambientes de uso compartilhado, um usuário pode alterar a chave                        |
|        kumongen_active_student_id no console, assumindo a identidade e progresso de outro aluno.  |
| Impacto: Adulteração de perfil ativo e corrupção de sessões de estudo.                           |
+---------------------------------------------------------------------------------------------------+
| T - Tampering (Adulteração de Dados e Integridade)                                                |
+---------------------------------------------------------------------------------------------------+
| Ameaça T-01: Adulteração direta de Gamificação e Histórico no LocalStorage                       |
| Mecanismo: Gamification.save() e student-profiles.js persistem objetos JSON puros em texto claro.  |
| Vetor: O usuário manipula estrelas, ofensiva e medalhas diretamente pelo DevTools.               |
| Impacto: Fraude de pontuação pedagógica e desnaturação da avaliação de maestria.                 |
|                                                                                                   |
| Ameaça T-02: Manipulação de Scripts de Terceiros em Rota CDN                                     |
| Mecanismo: Dependências (jsPDF, html2canvas, FontAwesome) sem Subresource Integrity (SRI).        |
| Vetor: Atacante em rede pública ou CDN comprometida injeta código arbitrário no arquivo JS.      |
| Impacto: Execução de código arbitrário e comprometimento persistente via Service Worker.         |
+---------------------------------------------------------------------------------------------------+
| R - Repudiation (Repúdio de Ações e Falta de Rastreabilidade)                                    |
+---------------------------------------------------------------------------------------------------+
| Ameaça R-01: Exclusão arbitrária de perfis sem trilha de auditoria                                |
| Mecanismo: StudentProfileEngine.delete() remove o perfil imediatamente do array.                  |
| Vetor: Em um tablet compartilhado por irmãos ou escola, um aluno apaga o perfil de outro.         |
| Impacto: Perda irrecuperável de dados sem registro de quem ou quando a exclusão ocorreu.         |
+---------------------------------------------------------------------------------------------------+
| I - Information Disclosure (Divulgação de Informações Confidenciais)                             |
+---------------------------------------------------------------------------------------------------+
| Ameaça I-01: Exposição de Dados Pessoais de Crianças (PII) em Texto Claro                         |
| Mecanismo: Nomes de crianças, idades, rotinas e histórico de respostas gravados em texto puro no   |
|            localStorage compartilhado do navegador.                                              |
| Vetor: Qualquer script rodando na mesma origem, extensão de navegador maliciosa ou usuário        |
|        subsequente do dispositivo pode ler integralmente os dados pedagógicos infantis.           |
| Impacto: Violação dos princípios de proteção de dados infantis (LGPD Art. 14 / COPPA).           |
+---------------------------------------------------------------------------------------------------+
| D - Denial of Service (Negação de Serviço e Exaustão de Recursos)                                |
+---------------------------------------------------------------------------------------------------+
| Ameaça D-01: Wipeout Silencioso de Perfis por Corrupção de JSON                                  |
| Mecanismo: Falha de parsing em getAll() direciona para _migrateLegacyData(), sobrescrevendo     |
|            a base por um array inicial genérico.                                                  |
| Vetor: Gravação interrompida ou payload malformado.                                              |
| Impacto: Perda catastrófica de 100% dos dados dos alunos.                                         |
|                                                                                                   |
| Ameaça D-02: Travamento da UI por QuotaExceededError não Tratado                                  |
| Mecanismo: localStorage.setItem invocado diretamente sem bloco try...catch em gerador e tablet.   |
| Vetor: Esgotamento da cota de 5MB por acúmulo de histórico de tarefas ou cache de imagens.        |
| Impacto: Interrupção súbita da geração de cadernos e do treino no tablet.                         |
+---------------------------------------------------------------------------------------------------+
| E - Elevation of Privilege (Elevação de Privilégios e Injeção de Código)                         |
+---------------------------------------------------------------------------------------------------+
| Ameaça E-01: Execução de Script no Contexto do Origin (DOM-based XSS)                            |
| Mecanismo: Nomes de alunos concatenados diretamente em innerHTML nos modais de perfil e tablet.  |
| Vetor: Inserção de payload HTML/JS no campo de nome via formulário ou prompt.                     |
| Impacto: Controle total da aplicação, capacidade de roubar ou corromper todos os perfis e        |
|          desconfigurar o Service Worker.                                                          |
+---------------------------------------------------------------------------------------------------+
```

### 3.2 Matriz Quantitativa DREAD
O modelo DREAD quantifica o risco relativo através de cinco dimensões pontuadas de 1 a 10:
* **D**amage Potential (Potencial de Dano): gravidade dos danos causados pela exploração.
* **R**eproducibility (Reprodutibilidade): facilidade de replicar o ataque com sucesso.
* **E**xploitability (Facilidade de Exploração): nível de esforço e conhecimento técnico exigido.
* **A**ffected Users (Usuários Afetados): proporção da base de usuários impactada.
* **D**iscoverability (Facilidade de Descoberta): facilidade com que o vetor de ataque é identificado.

$$\text{DREAD Score} = \frac{D + R + E + A + D_{\text{disc}}}{5}$$

| ID Ameaça | Categoria STRIDE | Componente Afetado | D | R | E | A | D | DREAD Score | Classificação de Risco |
|---|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **THR-01** | Elevation of Privilege | Injeção XSS em Nomes de Alunos (`student-profiles.js:750`, `tablet-player.js:2641`) | 9 | 10 | 9 | 8 | 9 | **9.0 / 10** | **CRÍTICO** |
| **THR-02** | Denial of Service | Wipeout de Perfis por Corrupção de JSON (`student-profiles.js:201`) | 9 | 10 | 8 | 10 | 8 | **9.0 / 10** | **CRÍTICO** |
| **THR-03** | Denial of Service | Crash por `QuotaExceededError` (`gerador.js:1146`, `tablet-player.js:217`) | 7 | 8 | 7 | 8 | 7 | **7.4 / 10** | **ALTO** |
| **THR-04** | Tampering | Adulteração de Dependências em CDN sem SRI (`tablet.html:331`, `gerador.js:11`) | 9 | 5 | 5 | 9 | 7 | **7.0 / 10** | **ALTO** |
| **THR-05** | Denial of Service | Exceção `TypeError` no Backup (`student-profiles.js:897`) | 6 | 10 | 10 | 6 | 9 | **8.2 / 10** | **ALTO** |
| **THR-06** | Information Disclosure | Exposição de PII Infantil em Storage Claro (`student-profiles.js:167`) | 6 | 9 | 8 | 9 | 7 | **7.8 / 10** | **ALTO** |
| **THR-07** | Tampering | Manipulação de Pontuação e Gamificação (`tablet-player.js:217`) | 4 | 10 | 9 | 5 | 8 | **7.2 / 10** | **MÉDIO** |
| **THR-08** | Elevation of Privilege | Clickjacking por Ausência de CSP/X-Frame-Options | 5 | 8 | 6 | 6 | 8 | **6.6 / 10** | **MÉDIO** |

---

## 4. Fase 3: Modelagem PASTA (Process for Attack Simulation and Threat Analysis)

A metodologia PASTA alinha a segurança técnica aos objetivos fundamentais do negócio em 7 etapas sistemáticas:

### Estágio 1: Definição dos Objetivos de Negócio e Pedagógicos
* **Objetivo Primário**: Entregar uma ferramenta pedagógica confiável, imersiva e sem fricção para famílias e educadores desenvolverem a disciplina matemática e linguística em crianças.
* **Ativo Mais Valioso**: O histórico de esforço e evolução da criança (estrelas, fluência no cálculo, sequências de ofensiva diária e medalhas).
* **Impacto no Negócio de uma Falha de Segurança**:
  - A perda acidental de dados educacionais acarreta desmotivação profunda na criança e quebra de confiança dos pais no aplicativo.
  - A execução de scripts maliciosos ou o travamento repetido da interface em tablets escolares compromete a integridade institucional do KumonGen.

### Estágio 2: Definição do Escopo Técnico e Fronteiras
* **Arquivos e Recursos sob Escopo**:
  - `index.html`, `matematica.html`, `portugues.html`, `ingles.html`, `tablet.html`.
  - Scripts principais: `student-profiles.js`, `gerador.js`, `tablet-player.js`, `content-pool.js`.
  - Service Worker e Manifesto: `sw.js`, `manifest.json`.
  - Repositório de dados: Web Storage (`localStorage`).
  - Redes e CDNs: `cdnjs.cloudflare.com`.

### Estágio 3: Decomposição da Aplicação (Fluxos de Dados DFD)
* **Fluxo de Cadastro de Aluno**:
  Entrada do Nome (`<input id="inputStudentName">`) $\rightarrow$ `StudentProfileEngine.create()` $\rightarrow$ `SafeStorage.setItem()` $\rightarrow$ `localStorage.getItem('kumongen_students')`.
* **Fluxo de Apresentação de Perfis**:
  `SafeStorage.getItem()` $\rightarrow$ `JSON.parse()` $\rightarrow$ Concatenação de string no template $\rightarrow$ Atribuição direta a `modal.innerHTML` $\rightarrow$ Avaliação e renderização no DOM.
* **Fluxo de Gravação de Histórico de Tarefas**:
  Conclusão de caderno $\rightarrow$ `saveHistory()` em `gerador.js` $\rightarrow$ `JSON.parse(localStorage.getItem('kumongen_history'))` $\rightarrow$ Concatenação $\rightarrow$ `localStorage.setItem('kumongen_history')` (sem tratamento de erro).

### Estágio 4: Análise de Ameaças Contextualizadas
* **Ambiente Escolar / Tablets Compartilhados**: Alta probabilidade de múltiplos alunos interagirem sucessivamente com o mesmo dispositivo. A ausência de autenticação de responsáveis facilita que uma criança apague ou sobrescreva os dados de outra.
* **Redes Wi-Fi Abertas**: O carregamento de bibliotecas essenciais de CDNs sem validação de hash permite adulteração man-in-the-middle.

### Estágio 5: Análise de Vulnerabilidades Específicas
* Vulnerabilidades confirmadas no código:
  - Falta de sanitização de entidades HTML antes de injeções em `innerHTML`.
  - Falta de validação de esquema JSON ao ler do `localStorage`.
  - Chamadas a `localStorage.setItem` desprovidas de captura de `QuotaExceededError`.
  - Falta de atributos `integrity` nas tags de script e estilo.

### Estágio 6: Modelagem de Ataques (Attack Trees)

```
Árvore de Ataque 1: Execução de DOM-based Stored XSS
├── [Meta]: Obter execução arbitrária de código JS no contexto da aplicação
│   ├── [1. Vetor de Ingestão]: Inserir payload no nome do perfil
│   │   ├── 1.1 Inserir payload via formulário (+ Novo Perfil)
│   │   └── 1.2 Inserir payload via prompt() no Tablet Player
│   ├── [2. Persistência]: O sistema armazena o payload em texto puro no localStorage
│   └── [3. Acionamento]: Renderizar o componente vulnerável
│       ├── 3.1 Abrir seletor de alunos (student-profiles.js:750)
│       └── 3.2 Completar rodada de exercícios no tablet (tablet-player.js:2641)

Árvore de Ataque 2: Negação de Serviço por Destruição de Estado (Wipeout)
├── [Meta]: Destruir permanentemente o histórico e progresso dos alunos
│   ├── [1. Corrupção da Chave]: Induzir JSON sintaticamente inválido em kumongen_students
│   │   ├── 1.1 Fechamento súbito de aba durante escrita concorrente
│   │   └── 1.2 Importação de arquivo JSON truncado
│   ├── [2. Execução da Rotina Falha]: Invocar StudentProfileEngine.getAll()
│   ├── [3. Disparo do Bloco Catch]: JSON.parse() lança SyntaxError
│   └── [4. Sobrescrita Destrutiva]: _migrateLegacyData() grava [std_default], apagando os dados anteriores

Árvore de Ataque 3: Paralisação da Aplicação por Esgotamento de Recursos
├── [Meta]: Congelar a interface do usuário durante a geração de cadernos ou treino
│   ├── [1. Saturação do Storage]: Preencher a cota de 5MB com dados em outras abas ou histórico extenso
│   ├── [2. Operação de Escrita]: Geração de novo caderno ou alteração de volume de áudio
│   ├── [3. Exceção de Cota]: localStorage.setItem lança QuotaExceededError
│   └── [4. Falha não Tratada]: Thread principal de JS aborta a execução síncrona
```

### Estágio 7: Análise de Risco Residual e Mitigação Estratégica
* O impacto da exploração de XSS ou destruição de dados afeta diretamente a reputação e usabilidade do KumonGen. As contramedidas técnicas prescritas na Fase 6 neutralizam integralmente os nós de decisão das árvores de ataque identificadas.

---

## 5. Fase 4: Checklist Técnico OWASP Client-Side / PWA

Avaliação detalhada e fundamentada contra os riscos do **OWASP Top 10** adaptado para aplicações ricas *client-side* e PWAs:

```
+---------------------------------------------------------------------------------------------------+
| CHECKLIST TÉCNICO DE CONFORMIDADE OWASP CLIENT-SIDE                                               |
+---------------------------------------------------------------------------------------------------+
```

### A01: Broken Access Control (Controle de Acesso Quebrado)
* **Status**: ❌ **REPROVADO**
* **Constatação Técnica**: A aplicação não possui distinção de papéis (ex: "Educador/Responsável" vs "Criança"). Funções destrutivas como exclusão permanente de perfis (`StudentProfileEngine.delete()`) e redefinição de pontuações de gamificação podem ser executadas imediatamente pela criança sem qualquer barreira de confirmação protegida (ex: PIN parental ou desafio numérico simples).
* **Risco**: Exclusão acidental de histórico por manipulação errônea da criança no tablet.

### A02: Cryptographic Failures (Falhas Criptográficas e Armazenamento Seguro)
* **Status**: ❌ **REPROVADO**
* **Constatação Técnica**: Nomes de alunos, idades, preferências de mascotes, histórico de cadernos gerados e rotinas são persistidos em texto claro desprotegido em `localStorage`. Em dispositivos compartilhados ou laboratórios escolares, esses dados ficam acessíveis a qualquer usuário ou extensão com permissão de leitura de storage.
* **Risco**: Exposição de dados pedagógicos de menores sem confidencialidade local.

### A03: Injection (Injeção de Código / DOM-based XSS)
* **Status**: ❌ **REPROVADO**
* **Constatação Técnica**: Violação direta em `student-profiles.js:750`, `student-profiles.js:969`, `tablet-player.js:2641` e `tablet-player.js:2741`. Strings originadas em entradas de usuário são concatenadas diretamente em literais de template e injetadas no DOM através da atribuição a `.innerHTML`.
* **Risco**: Execução de scripts arbitrários no contexto de segurança da origem da PWA.

### A04: Insecure Design (Design Inseguro e Resiliência)
* **Status**: ❌ **REPROVADO**
* **Constatação Técnica**: Falha arquitetural na rotina de recuperação de falhas de `student-profiles.js`: sob qualquer erro de desserialização em `getAll()`, o sistema executa `_migrateLegacyData()`, que sobrescreve e destrói o banco local sem criar uma cópia de quarentena. Além disso, o botão de restauração de backup invoca um método inexistente (`self.importBackup`).
* **Risco**: Perda irreversível de dados pedagógicos e frustração do usuário.

### A05: Security Misconfiguration (Configuração Insegura)
* **Status**: ❌ **REPROVADO**
* **Constatação Técnica**: Ausência absoluta de Content Security Policy (CSP), seja por cabeçalhos HTTP na camada de distribuição ou por tags `<meta http-equiv="Content-Security-Policy">`. Ausência de cabeçalhos de defesa contra Clickjacking (`X-Frame-Options`) e de restrição de sniffing (`X-Content-Type-Options: nosniff`).
* **Risco**: Falta de contenção em profundidade; execução irrestrita de scripts inline e vulnerabilidade a incorporação em iframes hostis.

### A06: Vulnerable and Outdated Components (Componentes Vulneráveis e Desatualizados)
* **Status**: ❌ **REPROVADO**
* **Constatação Técnica**: A biblioteca `Font Awesome` é carregada na versão `6.0.0-beta3` (uma versão preliminar de 2021). As bibliotecas remotas `jsPDF 2.5.1` e `html2canvas 1.4.1` são consumidas sem validação criptográfica de integridade (*Subresource Integrity* - SRI).
* **Risco**: Suscetibilidade a comprometimento de supply chain através de CDNs públicas.

### A07: Identification and Authentication Failures (Falhas de Identificação)
* **Status**: ⚠️ **ATENÇÃO (Risco Moderado)**
* **Constatação Técnica**: Sendo uma aplicação *zero backend*, não existem credenciais de autenticação remota. Todavia, a gestão do perfil ativo apoia-se em uma chave simples (`kumongen_active_student_id`) que não possui verificação de integridade ou assinatura de estado.

### A08: Software and Data Integrity Failures (Falhas de Integridade de Software e Dados)
* **Status**: ❌ **REPROVADO**
* **Constatação Técnica**: A estratégia de cache *Stale-While-Revalidate* do Service Worker armazena recursos de CDN sem validar hashes. Tags `<script>` e carregadores dinâmicos (`loadScript`) não possuem hashes SRI. Arquivos de backup são importados sem validação de esquema estrutural.
* **Risco**: Adulteração de software em trânsito e contaminação permanente do cache offline.

### A09: Security Logging and Monitoring Failures (Falhas de Logging e Monitoramento)
* **Status**: ❌ **REPROVADO**
* **Constatação Técnica**: A quase totalidade dos blocos de captura de exceção utiliza `catch (e) {}` vazio ou `console.warn` genérico sem estrutura de telemetria local, impedindo que falhas de integridade ou tentativas de injeção sejam diagnosticadas.
* **Risco**: Incapacidade de auditar e diagnosticar corrupções de estado no cliente.

### A10: Server-Side Request Forgery (SSRF)
* **Status**: 🟢 **NÃO APLICÁVEL**
* **Justificativa Técnica**: A aplicação possui arquitetura 100% estática e opera exclusivamente no cliente sem qualquer servidor proxy ou chamadas de backend que possam ser induzidas a consultar serviços internos.

---

## 6. Fase 5: Simulação Red Team e Provas de Conceito (PoCs)

Para comprovar a viabilidade técnica e a gravidade dos achados, foram estruturados quatro cenários de exploração do Red Team:

### 6.1 PoC 1: Stored DOM-based XSS via Perfil de Aluno
* **Persona**: Usuário malicioso ou estudante em ambiente de laboratório com acesso físico ao tablet.
* **Componente Vulnerável**: `student-profiles.js:750` e `tablet-player.js:2641`.
* **Vetor de Injeção**: Campo "Nome da Criança" no formulário de criação de perfil ou via console.
* **Código do Payload**:
  ```html
  Lucas<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" onload="alert('XSS-EXECUTADO: Origem comprometida! Storage: ' + Object.keys(localStorage).join(', '));">
  ```
* **Mecanismo de Execução Passo a Passo**:
  1. O usuário acessa a modal de perfis e clica em "+ Novo Perfil".
  2. No campo de texto com id `#inputStudentName`, insere o payload acima.
  3. O código em `student-profiles.js:239` apenas remove espaços nas pontas (`trim()`) e grava o objeto no `localStorage`:
     ```json
     {"id":"std_poc1","name":"Lucas<img src=\"data:...\" onload=\"...\">","ageTier":"age_6_7","mascot":"jaguar"}
     ```
  4. Ao renderizar a lista de perfis (`renderCardsView`), a linha 750 executa:
     ```javascript
     html += `<h4 style="font-size: 1.15rem; font-weight: 800; color: #1e293b; margin: 0 0 4px 0;">${s.name}</h4>`;
     ```
  5. Na linha 783, o container recebe `modal.innerHTML = html`.
  6. O navegador faz o parsing do fragmento HTML, instancia o elemento `<img>` e dispara imediatamente o manipulador `onload`.
* **Impacto Comprovado**: Execução arbitrária de JavaScript no contexto da origem. O payload pode limpar todo o `localStorage`, roubar dados pedagógicos e alterar o comportamento do Service Worker.

### 6.2 PoC 2: Destruição Silenciosa de Perfis (Wipeout) por Corrupção de JSON
* **Persona**: Condição de borda acidental (desligamento do tablet durante escrita) ou intervenção hostil via console.
* **Componente Vulnerável**: `student-profiles.js:201-210` e `_migrateLegacyData()` (linha 167).
* **Mecanismo de Reprodução no Console**:
  ```javascript
  // Simula a corrupção parcial da chave kumongen_students (ex: corte no byte 32)
  localStorage.setItem('kumongen_students', '[{"id":"std_1","name":"Alice",');
  // Dispara a leitura através da API da aplicação
  const resultado = window.StudentProfileEngine.getAll();
  console.log('Perfis recuperados após falha:', resultado);
  console.log('Novo conteúdo no localStorage:', localStorage.getItem('kumongen_students'));
  ```
* **Comportamento Observado**:
  1. `JSON.parse` falha com `Uncaught SyntaxError: Unexpected end of JSON input`.
  2. O bloco `catch (e)` captura o erro e chama `_migrateLegacyData()`.
  3. `_migrateLegacyData()` não encontra estrutura válida legada e sobrescreve a chave `kumongen_students` com `JSON.stringify(initialList)` contendo apenas o perfil genérico `Theo`.
  4. Todos os perfis reais anteriores são sumariamente descartados e destruídos.
* **Impacto Comprovado**: Perda total irreversível de dados pedagógicos sem quarentena ou recuperação.

### 6.3 PoC 3: Travamento da Aplicação (DoS) por `QuotaExceededError` Não Tratado
* **Persona**: Usuário legítimo com dispositivo cujo armazenamento local foi preenchido por histórico cumulativo de cadernos ou outras aplicações na mesma origem.
* **Componentes Vulneráveis**: `gerador.js:1146, 1181`, `tablet-player.js:41, 217`.
* **Mecanismo de Reprodução no Console**:
  ```javascript
  // Preenche deliberadamente a cota do localStorage até o limite
  try {
      let data = 'X'.repeat(1024 * 512); // Blocos de 512KB
      let i = 0;
      while (true) {
          localStorage.setItem('filler_' + i++, data);
      }
  } catch (e) {
      console.log('Cota do localStorage saturada com sucesso.');
  }

  // Tenta salvar o histórico do gerador ou silenciar o áudio no tablet
  console.log('Invocando operação de escrita desprotegida...');
  // Simula a linha 41 de tablet-player.js:
  localStorage.setItem('kumongen_tablet_muted', 'true');
  ```
* **Comportamento Observado**:
  1. O método `setItem` lança `DOMException: QuotaExceededError: Failed to execute 'setItem' on 'Storage': Setting the value of 'kumongen_tablet_muted' exceeded the quota.`
  2. Como a linha 41 de `tablet-player.js` não possui bloco `try...catch`, a exceção propaga-se de forma não tratada pelo motor de eventos.
  3. A interface do Tablet Player trava e o evento de clique falha silenciosamente sem responder ao usuário.
* **Impacto Comprovado**: Negação de serviço da interface em situações de cota cheia.

### 6.4 PoC 4: Falha Funcional e Quebra de Fluxo na Restauração de Backup
* **Persona**: Pai ou educador tentando transferir o progresso do aluno para um novo tablet através de arquivo de backup JSON legítimo.
* **Componente Vulnerável**: `student-profiles.js:897`.
* **Mecanismo de Reprodução**:
  1. Abrir `index.html` ou `tablet.html`.
  2. Clicar no botão do perfil e selecionar "Gerenciar Perfis".
  3. Clicar em "Restaurar Backup" e selecionar um arquivo `.json` válido gerado pela exportação da aplicação.
* **Comportamento Observado**:
  1. O manipulador `inputImportProfiles.onchange` lê o arquivo como texto.
  2. Na linha 897, a aplicação executa:
     ```javascript
     const res = self.importBackup(evt.target.result);
     ```
  3. O console do navegador exibe imediatamente:
     ```
     Uncaught TypeError: self.importBackup is not a function
         at FileReader.reader.onload (student-profiles.js:897)
     ```
  4. A restauração não ocorre, nenhum feedback visual é exibido para o usuário e o modal permanece aberto sem atualizar o estado.
* **Impacto Comprovado**: Impossibilidade absoluta de recuperação de backups em novos dispositivos.

---

## 7. Fase 6: Plano de Hardening e Remediação Defensiva Blue Team

As mitigações técnicas detalhadas a seguir foram concebidas cirurgicamente para aplicação na sprint de implementação subsequente, respeitando integralmente a integridade dos contratos de código:

### 7.1 Unificação Global do SafeStorage com Quarentena Automática
**Ação**: Exportar `window.SafeStorage` e encapsular todas as operações com quarentena automática de JSONs corrompidos e suporte transparente a fallback em memória.

```javascript
// SOLUÇÃO PROPOSTA: Exportação de window.SafeStorage com Quarentena
(function(window) {
    'use strict';

    const SafeStorage = {
        _mem: {},

        getItem(key) {
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    return window.localStorage.getItem(key);
                }
            } catch (e) {
                console.warn('[SafeStorage] Leitura bloqueada pelo navegador, usando fallback em memória:', e);
            }
            return Object.prototype.hasOwnProperty.call(this._mem, key) ? this._mem[key] : null;
        },

        setItem(key, value) {
            const strVal = String(value);
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.setItem(key, strVal);
                    return true;
                }
            } catch (e) {
                console.warn('[SafeStorage] QuotaExceededError ou restrição de gravação. Fallback em memória ativado para:', key, e);
            }
            this._mem[key] = strVal;
            return false;
        },

        removeItem(key) {
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.removeItem(key);
                }
            } catch (e) {}
            delete this._mem[key];
        }
    };

    // Publicação Global Mandatória
    window.SafeStorage = SafeStorage;
})(typeof window !== 'undefined' ? window : this);
```

**Quarentena de Dados em `student-profiles.js` (`getAll`)**:
```javascript
// SOLUÇÃO PROPOSTA: Proteção contra Wipeout com Quarentena de Backup
getAll() {
    try {
        const raw = SafeStorage.getItem(STORAGE_STUDENTS);
        if (!raw) return _migrateLegacyData();
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) {
            return list;
        }
        return _migrateLegacyData();
    } catch (e) {
        console.error('[StudentProfileEngine] Falha de integridade em STORAGE_STUDENTS! Isolando em quarentena:', e);
        const corruptedPayload = SafeStorage.getItem(STORAGE_STUDENTS);
        if (corruptedPayload) {
            // Preserva o dado bruto em chave de quarentena com timestamp
            SafeStorage.setItem(`kumongen_students_corrupted_bak_${Date.now()}`, corruptedPayload);
        }
        return _migrateLegacyData();
    }
}
```

### 7.2 Sanitizador Central Canônico `sanitizeHTML` / `escapeHtml`
**Ação**: Criar e exportar função universal rápida de codificação de entidades HTML em `student-profiles.js` (ou utilitário compartilhado), substituindo todas as interpolações diretas de strings controladas por usuário:

```javascript
// SOLUÇÃO PROPOSTA: Sanitizador de Entidades HTML Universal
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
window.escapeHtml = escapeHtml;
```

**Substituições Cirúrgicas nos Pontos Vulneráveis**:
1. Em `student-profiles.js:750`:
   ```javascript
   // ANTES (Vulnerável):
   `<h4 style="...">${s.name}</h4>`
   // DEPOIS (Protegido):
   `<h4 style="...">${escapeHtml(s.name)}</h4>`
   ```
2. Em `student-profiles.js:969`:
   ```javascript
   // ANTES (Vulnerável):
   `<input type="text" id="inputStudentName" value="${currentName}" ...>`
   // DEPOIS (Protegido):
   `<input type="text" id="inputStudentName" value="${escapeHtml(currentName)}" ...>`
   ```
3. Em `tablet-player.js:2641`:
   ```javascript
   // ANTES (Vulnerável):
   `<h3 class="text-2xl font-black text-slate-900">Parabéns, ${Session.studentName}!</h3>`
   // DEPOIS (Protegido):
   `<h3 class="text-2xl font-black text-slate-900">Parabéns, ${escapeHtml(Session.studentName)}!</h3>`
   ```
4. Em `tablet-player.js:2741`:
   ```javascript
   // ANTES (Vulnerável):
   `<p class="text-xs text-slate-500">Aluno(a): <strong>${Session.studentName}</strong></p>`
   // DEPOIS (Protegido):
   `<p class="text-xs text-slate-500">Aluno(a): <strong>${escapeHtml(Session.studentName)}</strong></p>`
   ```

### 7.3 Implementação do Método Faltante `importBackup` com Validação de Schema
**Ação**: Implementar `StudentProfileEngine.importBackup(jsonString)` com validação rigorosa de campos e tipagens para impedir a ingestão de estruturas maliciosas ou malformadas:

```javascript
// SOLUÇÃO PROPOSTA: Implementação Segura de importBackup
importBackup(jsonString) {
    try {
        if (!jsonString || typeof jsonString !== 'string') {
            return { success: false, error: 'Arquivo inválido ou vazio.' };
        }
        const data = JSON.parse(jsonString);
        if (!data || typeof data !== 'object') {
            return { success: false, error: 'Estrutura JSON inválida.' };
        }
        if (!Array.isArray(data.students) || data.students.length === 0) {
            return { success: false, error: 'Nenhum estudante válido localizado no arquivo de backup.' };
        }

        // Validação, sanitização e normalização estrita de cada perfil
        const validatedStudents = data.students.map(s => {
            const cleanName = escapeHtml(String(s.name || 'Aluno').slice(0, 25).trim());
            return {
                id: (typeof s.id === 'string' && s.id.startsWith('std_')) ? s.id : _generateId(),
                name: cleanName || 'Aluno',
                ageTier: (s.ageTier in AGE_TIERS) ? s.ageTier : 'age_6_7',
                mascot: (s.mascot in MASCOT_PRESETS) ? s.mascot : 'jaguar',
                createdAt: typeof s.createdAt === 'string' ? s.createdAt : new Date().toISOString(),
                gamification: (s.gamification && typeof s.gamification === 'object') ? {
                    stars: Number.isInteger(s.gamification.stars) ? Math.max(0, s.gamification.stars) : 0,
                    streak: Number.isInteger(s.gamification.streak) ? Math.max(0, s.gamification.streak) : 0
                } : { stars: 0, streak: 0 },
                history: Array.isArray(s.history) ? s.history.slice(0, 50) : [],
                mastery: (s.mastery && typeof s.mastery === 'object') ? s.mastery : {}
            };
        });

        SafeStorage.setItem(STORAGE_STUDENTS, JSON.stringify(validatedStudents));
        if (data.activeStudentId && validatedStudents.some(s => s.id === data.activeStudentId)) {
            this.setActive(data.activeStudentId);
        } else {
            this.setActive(validatedStudents[0].id);
        }

        return { success: true, count: validatedStudents.length };
    } catch (err) {
        return { success: false, error: 'Erro no processamento do backup: ' + err.message };
    }
}
```

### 7.4 Subresource Integrity (SRI) para CDNs e Atualização de `loadScript`
**Ação**: Atualizar as referências estáticas nos arquivos HTML e parametrizar a função `loadScript`:

1. **Atualização das tags HTML em `tablet.html` e demais páginas**:
   ```html
   <!-- Font Awesome 6.5.1 com hash SRI -->
   <link rel="stylesheet" 
         href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" 
         integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" 
         crossorigin="anonymous" 
         referrerpolicy="no-referrer" />

   <!-- jsPDF 2.5.1 com hash SRI -->
   <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" 
           integrity="sha512-qZvrmS2ekKPF2mSznTQsxqPgnpkI4DNTlrdUmTzrDgektczlKNRRhy5X5AAOnx5S09ydFYWWNSfcEqDTTHgtNA==" 
           crossorigin="anonymous" 
           referrerpolicy="no-referrer"></script>
   ```

2. **Suporte a SRI na Injeção Dinâmica em `gerador.js:11-20`**:
   ```javascript
   function loadScript(src, integrity = null) {
       return new Promise((resolve, reject) => {
           if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
           const s = document.createElement('script');
           s.src = src;
           if (integrity) {
               s.integrity = integrity;
               s.crossOrigin = 'anonymous';
           }
           s.onload = resolve;
           s.onerror = () => reject(new Error('Falha ao carregar script protegido: ' + src));
           document.head.appendChild(s);
       });
   }
   ```

### 7.5 Content Security Policy (CSP) e Cabeçalhos HTTP de Defesa em Profundidade
**Ação**: Criar especificação para arquivo de implantação (ex: `vercel.json`) aplicando os cabeçalhos de segurança mínimos recomendados pelo framework 007:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; img-src 'self' data: blob: assets:; font-src 'self' https://cdnjs.cloudflare.com; connect-src 'self' https://cdnjs.cloudflare.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self';"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        }
      ]
    }
  ]
}
```

---

## 8. Diagnóstico Quantitativo e Scoring 0–100 por Domínio

Em conformidade com a sistemática matemática de avaliação formal do protocolo **007**, cada domínio de segurança foi analisado com rigor técnico, pontuado de 0 a 100 e ponderado de acordo com a arquitetura específica do sistema:

| Domínio de Segurança | Peso | Score (0-100) | Contribuição Ponderada | Justificativa Técnica Objetiva |
|---|:---:|:---:|:---:|---|
| **Armazenamento & Integridade de Estado** | 20% | **45** | 9.00 | `SafeStorage` fechado em closure privada; múltiplos módulos invocam `localStorage` diretamente sem captura de exceção; rotina de recuperação sobrescreve e destrói perfis em caso de JSON malformado sem quarentena. |
| **Sanitização & Proteção contra Injeção (XSS)** | 20% | **50** | 10.00 | Presença de injeções diretas em `.innerHTML` com variáveis controladas pelo usuário em `student-profiles.js` e `tablet-player.js`; sanitizador `sanitizeText` isolado em módulo de terceiros sem compartilhamento global. |
| **Integridade da Cadeia de Suprimentos & CDN** | 14% | **60** | 8.40 | Inexistência de hashes de integridade (*Subresource Integrity* - SRI) em tags de CDN e na função `loadScript`; versão do Font Awesome defasada (6.0.0-beta3 de 2021). |
| **Cabeçalhos HTTP, CSP & Defesa em Profundidade** | 12% | **40** | 4.80 | Ausência total de cabeçalho `Content-Security-Policy` e meta tags equivalentes; ausência de proteções contra Clickjacking (`X-Frame-Options`, `frame-ancestors`) e ausência de `X-Content-Type-Options: nosniff`. |
| **Resiliência a Exaustão de Recursos & DoS** | 19% | **75** | 14.25 | Algoritmos curriculares e montagem de cadernos são rápidos e eficientes; todavia, operações de escrita desprotegidas no storage causam interrupção súbita (`QuotaExceededError`) quando a cota local é atingida. |
| **Arquitetura Offline & Service Worker** | 15% | **87** | 13.05 | Excelente modelo PWA offline-first; separação adequada de estratégias (*Network-First* para navegação HTML, *Cache-First* para assets locais); pequena ressalva para tratamento de respostas opacas em CDNs no SWR. |
| **SCORE PONDERADO CONSOLIDADO** | **100%** | — | **59.50 / 100** | **Score Final: 59.50** |

$$\text{Score Final} = (45 \times 0.20) + (50 \times 0.20) + (60 \times 0.14) + (40 \times 0.12) + (75 \times 0.19) + (87 \times 0.15) = 59.50$$

---

## 9. Veredito Formal 007 e Recomendações Mandatórias

### 9.1 Veredito Oficial do Chief Security Architect AI
**Veredito**: **BLOQUEADO PARCIAL (Nível C — Requer correções de segurança antes de implantação em produção)**.

### 9.2 Justificativa Técnica do Veredito
O KumonGen demonstra méritos de engenharia consideráveis, notadamente na sua concepção orientada à privacidade (*Zero Backend*) e no funcionamento autônomo através do Service Worker. No entanto, o sistema **não atinge o índice de prontidão para produção de 70 pontos**, sendo reprovado nos testes de integridade de dados e proteção contra injeção de scripts no DOM:
1. **Risco Crítico de Perda de Dados Pedagógicos**: A corrupção sintática de uma única linha no storage local resulta no cancelamento e exclusão completa de todos os alunos cadastrados no dispositivo.
2. **Risco de Execução de Código Arbitrário**: A inserção de tags HTML em nomes de alunos viabiliza a execução de payloads maliciosos capazes de destruir o estado da aplicação.
3. **Falta de Defesa em Profundidade**: Sem CSP e sem SRI, o sistema confia incondicionalmente em canais de terceiros e na inocuidade dos inputs do usuário.

### 9.3 Condições Objetivas para Desbloqueio (Critérios de Aprovação > 85 Pontos)
Para que o sistema seja reavaliado e receba o veredito **APROVADO (Nível A)**, a sprint de implementação deve cumprir integralmente o seguinte plano de trabalho:
- [ ] **Exportação do `SafeStorage` Global**: Tornar `window.SafeStorage` público e migrar todas as chamadas `localStorage.setItem` em `gerador.js`, `matematica.js`, `portugues.js`, `ingles.js` e `tablet-player.js` para o wrapper seguro.
- [ ] **Mecanismo de Quarentena em `student-profiles.js`**: Isolar payloads corrompidos em `kumongen_students_corrupted_bak` antes de qualquer reinicialização de base.
- [ ] **Sanitização Canônica Universal**: Aplicar `escapeHtml()` em todas as interpolações de variáveis de usuário avaliadas por `.innerHTML`.
- [ ] **Implementação do Método `importBackup`**: Adicionar a rotina com validação estrita de schema de perfis.
- [ ] **Subresource Integrity (SRI)**: Configurar atributos `integrity` e `crossorigin="anonymous"` nas tags de estilo e script de CDNs, estendendo suporte a SRI na função `loadScript()`.
- [ ] **Configuração de CSP e Cabeçalhos de Segurança**: Adicionar arquivo `vercel.json` configurando Content Security Policy, X-Frame-Options e nosniff.

---
*Relatório de Auditoria Formal emitido pelo Worker M2 (Chief Security Architect AI 007) para a governança do ecossistema KumonGen.*
