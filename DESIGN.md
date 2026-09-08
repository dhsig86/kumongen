# DESIGN.md — KumonGen Landing Page Design System

> "Clareza pedagógica japonesa e elegância moderna: uma plataforma educacional escura, serena e focada na autonomia da criança."

---

## 1. Visual Theme & Atmosphere

**Style**: Dark Academic Tech (Sóbrio, Acolhedor e Focado)  
**Keywords**: Deep Slate, Radiant Indigo, Clean Spacing, Academic Precision, High Contrast, Tactile Elevation, Smooth Motion  
**Tone**: Confiável, Metódico, Premium e Encorajador — SEM poluição visual infantilizada, SEM excesso de gradientes berrantes, SEM distrações cognitivas.  
**Feel**: A sensação de abrir uma mesa de estudos noturna impecavelmente organizada, onde cada ferramenta tem seu lugar e o foco é total no aprendizado.  

**Interaction Tier**: L2 (Fluido, com microinterações táteis, hover elevations e transições suaves de escala).  
**Dependencies**: CSS nativo com Tailwind tokens, animações CSS otimizadas via GPU (`transform` e `opacity`).

---

## 2. Color Palette & Roles

```css
:root {
  /* Backgrounds */
  --bg-main: #0b0f19;                           /* Fundo principal ultra-profundo */
  --bg-gradient-end: #172033;                   /* Fim do gradiente atmosférico */
  --surface-card: rgba(30, 41, 59, 0.75);       /* Superfície de cards com blur suave */
  --surface-card-hover: rgba(51, 65, 85, 0.85); /* Superfície em hover */
  --surface-alt: #1e293b;                       /* Superfície sólida alternativa */

  /* Borders */
  --border-subtle: rgba(71, 85, 105, 0.45);    /* Borda neutra refinada */
  --border-glow: rgba(99, 102, 241, 0.4);       /* Borda com halo de foco */
  --border-highlight: rgba(245, 158, 11, 0.5);  /* Destaque dourado de aluno */

  /* Text Roles */
  --text-hero: #ffffff;                         /* Título principal e números */
  --text-primary: #f1f5f9;                      /* Textos primários */
  --text-secondary: #94a3b8;                    /* Subtítulos e instruções */
  --text-muted: #64748b;                        /* Rodapés e metadados */

  /* Accents & Brand Disciplines */
  --accent-indigo: #6366f1;                     /* Destaque primário KumonGen */
  --accent-indigo-hover: #4f46e5;
  --discipline-math: #2563eb;                   /* Azul real da Matemática */
  --discipline-math-hover: #1d4ed8;
  --discipline-port: #059669;                   /* Verde esmeralda de Português */
  --discipline-port-hover: #047857;
  --discipline-eng: #dc2626;                    /* Rubi elegante de Inglês */
  --discipline-eng-hover: #b91c1c;
  --badge-amber: #f59e0b;                       /* Dourado de conquistas e perfil */

  /* RGB variants for rgba() helpers */
  --bg-main-rgb: 11, 15, 25;
  --accent-indigo-rgb: 99, 102, 241;
  --discipline-math-rgb: 37, 99, 235;
  --discipline-port-rgb: 5, 150, 105;
}
```

**Color Rules:**
1. Fundo escuro com gradiente radial sutil para centralizar o foco no conteúdo.
2. Cada matéria possui uma cor de ancoragem psicológica inconfundível (Azul: Matemática, Verde: Português, Rubi: Inglês).
3. Modos interativos (Tablet/PWA) utilizam acento Indigo/Violeta para sinalizar tecnologia tátil.

---

## 3. Typography Rules

**Font Stack:**
```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

| Papel | Tamanho Mobile | Tamanho Desktop | Peso | Line Height | Tracking |
|-------|----------------|-----------------|------|-------------|----------|
| Hero H1 | 2.75rem (44px) | 4.25rem (68px) | 900 (Black) | 1.05 | -0.035em |
| Tagline | 1.0rem (16px) | 1.25rem (20px) | 400 (Regular) | 1.5 | -0.01em |
| Section H2 | 1.25rem (20px) | 1.5rem (24px) | 800 (ExtraBold) | 1.2 | -0.02em |
| Card Title | 1.35rem (22px) | 1.5rem (24px) | 800 (ExtraBold) | 1.2 | -0.015em |
| Body / Desc | 0.85rem (13.5px) | 0.95rem (15px) | 400 (Regular) | 1.55 | normal |
| Badges & Chips | 0.65rem (10.5px) | 0.75rem (12px) | 700 (Bold) | 1.0 | +0.04em |

**Regras Tipográficas:**
- O título principal `KumonGen` deve ter grande escala e impacto visual, com a terminação `Gen` em gradiente sutil Indigo $\rightarrow$ Violeta.
- Proibido o uso de fontes decorativas de baixa legibilidade.

---

## 4. Component Stylings

### Hero Title Block
- Título em grande escala com destaque tipográfico: `text-5xl sm:text-6xl md:text-7xl font-black tracking-tight`.
- Subtítulo com respiração confortável (máximo 640px de largura, centralizado).

### Modo Tablet (Banner Superior com Destaque Nobre)
- Posicionado **acima** dos 3 pilares e dos 3 botões de disciplinas.
- Gradiente escuro rico com borda sutilmente iluminada (`border-indigo-500/40`), micro-glow e badge tátil pulsante.
- Dois CTAs diretos: "Abrir Tablet" (botão hero elevado com ícone de play) e "Instalar App" (PWA install).

### Card do Aluno Ativo
- Card compacto e centralizado com avatar circular, contorno dourado, nome e indicador de estrelas/faixa etária.
- Botões de ação rápida: "Trocar Perfil" e "Novo Aluno".

### Três Pilares Kumon
- Grid de 3 colunas em desktop com padding suave, ícones coloridos discretos e textos explicativos diretos (Escolha Rápida, Exemplo Guiado, Rotina de 10 min).
- Funciona como respiro e contextualização entre o Modo Tablet e os Cadernos de Exercícios.

### Os Três Botões/Cards Principais (Matemática, Português, Inglês)
- Cards de grande impacto tátil com altura balanceada, gradiente imersivo de alta densidade, ícones representativos (`fas fa-calculator`, `fas fa-font`, `fas fa-language`).
- Badges explicativas de faixa etária e níveis Kumon (`3+ M1`, `5+ M2–M5`, `7+ M6–M10`).
- Botão "Acessar →" com animação de seta em hover e elevação de sombra.

---

## 5. Layout Principles & Spacing Scale

**Container**:
- Largura máxima: `max-w-5xl` (1024px) para enquadrar perfeitamente em tablets de 1024px e monitores desktop.
- Padding horizontal: `1.25rem` (mobile) a `2rem` (desktop).

**Hierarquia Espacial (Ordem Vertical)**:
1. `Badge do Guia dos Pais`: `mb-4`
2. `Hero (Título Grande + Tagline)`: `mb-6`
3. `Card do Aluno Ativo`: `mb-7`
4. `Modo Tablet (Hero Superior)`: `mb-8`
5. `Três Pilares Metodológicos`: `mb-8`
6. `Seção das 3 Disciplinas Principais`: `mb-10`
7. `Footer`: `mt-10`

---

## 6. Depth & Elevation

| Nível | Tratamento | Aplicação |
|-------|------------|-----------|
| Flat | Fundo escuro com gradiente suave | Página e seções de fundo |
| Subtle | `bg-slate-800/60 border border-slate-700/60` | Cards dos 3 pilares |
| Raised | `bg-slate-800/90 shadow-xl border border-slate-700` | Card do aluno ativo |
| High Accent | `shadow-2xl hover:scale-[1.03] transition-all` | Banner do Tablet e Cards das 3 matérias |

---

## 7. Animation & Interaction

**Motion Philosophy**: Sutil, ágil e tátil. Nenhuma animação deve bloquear a decisão do usuário.  
- Botões e cards: `transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1)` com `active:scale-95`.
- Hover dos cards principais: elevação suave com `hover:-translate-y-1` e `shadow-2xl`.
- Respeito integral a `prefers-reduced-motion: reduce`.

---

## 8. Do's and Don'ts

### Do
- Manter o título `KumonGen` em grande escala (`text-5xl` a `text-7xl`) como ponto focal inicial.
- Manter o banner do Modo Tablet no topo visual (acima dos pilares e dos botões das matérias).
- Garantir contraste AAA em todos os textos para legibilidade em telas com brilho reduzido.
- Preservar todos os IDs de sistema (`homeStudentCard`, `pwaInstallBtn`, etc.).

### Don't
- ❌ Não amontoar os blocos sem margem de respiro visual.
- ❌ Não usar cores neon agressivas que cansem a vista.
- ❌ Não esconder o acesso ao Modo Tablet abaixo da dobra.
- ❌ Não remover as badges de faixa etária que orientam pais e professores.
- ❌ Não quebrar compatibilidade mobile (`overflow-x: hidden`).

---

## 9. Responsive Behavior

| Dispositivo | Largura | Comportamento dos Cards |
|-------------|---------|-------------------------|
| Mobile | < 640px | 1 coluna com espaçamento vertical compacto |
| Tablet | 640px – 1024px | Grid de 3 colunas para as matérias; Modo Tablet horizontal |
| Desktop | > 1024px | Layout respirado com largura máxima de 1024px |
