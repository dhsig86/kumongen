#!/usr/bin/env node
/**
 * ============================================================================
 * KumonGen — Suíte Automatizada de Avaliação de Qualidade de Conteúdo
 * Arquivo: tests/content_quality_audit.js
 * Padrão: Eval Harness Multidimensional 5D (Inspirado no ai-engineering-toolkit)
 * ============================================================================
 * 
 * Avalia os 25 níveis curriculares do KumonGen (M1-M10, P1-P8, I1-I7) em 5
 * dimensões pedagógicas e algorítmicas com rubrica calibrada:
 * 
 * - D1: Alinhamento BNCC / Faixa Etária (peso 20% / 0.20)
 * - D2: Graduação Kumon / Suavidade de Passos (peso 25% / 0.25)
 * - D3: Correção Ortográfica e Matemática (peso 25% / 0.25)
 * - D4: Apoio Concreto / Pictórico (peso 15% / 0.15)
 * - D5: Variabilidade e Distribuição Estatística (peso 15% / 0.15)
 * 
 * Critério de Aceitação:
 * - Nota final ponderada >= 90.0 / 100 para CADA um dos 25 níveis.
 * - Código de saída: 0 se 25/25 níveis aprovados; 1 se qualquer nível reprovado.
 * - Relatório JSON persistido em: tests/content_quality_audit_results.json
 * ============================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// ============================================================================
// 1. CONFIGURAÇÃO E CONSTANTES
// ============================================================================
const CONFIG = {
    sampleBatchSize: 20,         // Tamanho do lote padrão por nível
    passScoreThreshold: 90.0,    // Nota mínima individual para PASS
    dimWarnThreshold: 80.0,      // Threshold de alerta por dimensão
    weights: {
        d1_bncc: 0.20,
        d2_kumon: 0.25,
        d3_correctness: 0.25,
        d4_concrete: 0.15,
        d5_variability: 0.15
    },
    outputJsonPath: path.resolve(__dirname, 'content_quality_audit_results.json'),
    projectRoot: path.resolve(__dirname, '..')
};

// Cores ANSI para terminal
const c = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    white: '\x1b[37m',
    bgBlue: '\x1b[44m',
    bgGreen: '\x1b[42m',
    bgRed: '\x1b[41m'
};

// ============================================================================
// 2. MATRIZ CANÔNICA CURRICULAR E METADADOS PEDAGÓGICOS (25 NÍVEIS)
// ============================================================================
const CURRICULAR_METADATA = {
    // Matemática (M1 a M10)
    m1: {
        code: 'M1', subject: 'matematica', bncc: 'EI03ET07', age: '4-5 anos', sct: 60,
        desc: 'Quantidade concreta e contagem até 5', domainSize: 5, concreteType: 'high'
    },
    m2: {
        code: 'M2', subject: 'matematica', bncc: 'EF01MA06', age: '5-6 anos', sct: 75,
        desc: 'Adição simples (+1 a +9) com operandos de 1 dígito', domainSize: 9, concreteType: 'standard'
    },
    m3: {
        code: 'M3', subject: 'matematica', bncc: 'EF01MA10', age: '5-6 anos', sct: 90,
        desc: 'Sequências numéricas e regularidades aritméticas', domainSize: 12, concreteType: 'standard'
    },
    m4: {
        code: 'M4', subject: 'matematica', bncc: 'EF01MA01', age: '6-7 anos', sct: 90,
        desc: 'Dezenas e contagem estruturada (11 a 19)', domainSize: 9, concreteType: 'high'
    },
    m5: {
        code: 'M5', subject: 'matematica', bncc: 'EF01MA05', age: '6-7 anos', sct: 75,
        desc: 'Comparação de grandezas (maior, menor, igual)', domainSize: 12, concreteType: 'standard'
    },
    m6: {
        code: 'M6', subject: 'matematica', bncc: 'EF01MA06', age: '6-7 anos', sct: 90,
        desc: 'Subtração simples sem minuendo menor que subtraendo', domainSize: 9, concreteType: 'standard'
    },
    m7: {
        code: 'M7', subject: 'matematica', bncc: 'EF01MA01', age: '6-7 anos', sct: 90,
        desc: 'Vizinhos numéricos: antecessor e sucessor imediato', domainSize: 12, concreteType: 'standard'
    },
    m8: {
        code: 'M8', subject: 'matematica', bncc: 'EF02MA07', age: '7-8 anos', sct: 120,
        desc: 'Multiplicação básica (tabuadas de 2 a 10)', domainSize: 10, concreteType: 'standard'
    },
    m9: {
        code: 'M9', subject: 'matematica', bncc: 'EF03MA07', age: '8-9 anos', sct: 120,
        desc: 'Divisão exata sem resto com divisor natural', domainSize: 10, concreteType: 'standard'
    },
    m10: {
        code: 'M10', subject: 'matematica', bncc: 'EF04MA09', age: '9-10 anos', sct: 150,
        desc: 'Frações unitárias e visuais pictóricas', domainSize: 27, concreteType: 'high'
    },

    // Português (P1 a P8)
    p1: {
        code: 'P1', subject: 'portugues', bncc: 'EI03EF09', age: '4-5 anos', sct: 90,
        desc: 'Traçado motor e reconhecimento de letras bastão', domainSize: 26, concreteType: 'high'
    },
    p2: {
        code: 'P2', subject: 'portugues', bncc: 'EF01LP08', age: '5-6 anos', sct: 75,
        desc: 'Famílias silábicas canônicas simples (CV)', domainSize: 60, concreteType: 'high'
    },
    p3: {
        code: 'P3', subject: 'portugues', bncc: 'EF01LP02', age: '6-7 anos', sct: 90,
        desc: 'Palavras dissílabas regulares com sílabas simples', domainSize: 40, concreteType: 'standard'
    },
    p4: {
        code: 'P4', subject: 'portugues', bncc: 'EF01LP02', age: '6-7 anos', sct: 105,
        desc: 'Palavras trissílabas e polissílabas regulares sem dígrafos', domainSize: 30, concreteType: 'standard'
    },
    p5: {
        code: 'P5', subject: 'portugues', bncc: 'EF02LP04', age: '6-7 anos', sct: 90,
        desc: 'Sílabas complexas com encontros consonantais (CCV/CVC)', domainSize: 25, concreteType: 'high'
    },
    p6: {
        code: 'P6', subject: 'portugues', bncc: 'EF02LP04', age: '7-8 anos', sct: 90,
        desc: 'Dígrafos canônicos da língua portuguesa (NH, LH, CH, RR, SS)', domainSize: 25, concreteType: 'high'
    },
    p7: {
        code: 'P7', subject: 'portugues', bncc: 'EF01LP19', age: '6-7 anos', sct: 75,
        desc: 'Rimas fonéticas e consciência fonológica infantil', domainSize: 28, concreteType: 'high'
    },
    p8: {
        code: 'P8', subject: 'portugues', bncc: 'EF01LP07', age: '7-8 anos', sct: 120,
        desc: 'Segmentação e ordenação de frases simples (SVO)', domainSize: 20, concreteType: 'standard'
    },

    // Inglês (I1 a I7)
    i1: {
        code: 'I1', subject: 'ingles', bncc: 'EF01LI01', age: '4-6 anos', sct: 90,
        desc: 'Alphabet recognition and letter motor tracing', domainSize: 26, concreteType: 'high'
    },
    i2: {
        code: 'I2', subject: 'ingles', bncc: 'EF01LI02', age: '5-7 anos', sct: 75,
        desc: 'CVC 3-letter phonetic short vowel words', domainSize: 30, concreteType: 'standard'
    },
    i3: {
        code: 'I3', subject: 'ingles', bncc: 'EF02LI02', age: '6-8 anos', sct: 90,
        desc: 'Early phonics blends and digraphs (4-5 letters)', domainSize: 30, concreteType: 'standard'
    },
    i4: {
        code: 'I4', subject: 'ingles', bncc: 'EF02LI03', age: '6-8 anos', sct: 90,
        desc: 'High-frequency sight words (snap words)', domainSize: 30, concreteType: 'standard'
    },
    i5: {
        code: 'I5', subject: 'ingles', bncc: 'EF03LI02', age: '7-9 anos', sct: 90,
        desc: 'CVCe Magic E words with long vowel mutation', domainSize: 25, concreteType: 'standard'
    },
    i6: {
        code: 'I6', subject: 'ingles', bncc: 'EF03LI04', age: '7-9 anos', sct: 120,
        desc: 'Simple English sentence syntax and word ordering', domainSize: 20, concreteType: 'standard'
    },
    i7: {
        code: 'I7', subject: 'ingles', bncc: 'EF04LI03', age: '8-10 anos', sct: 90,
        desc: 'Opposites / Antonyms pairs with semantic discrimination', domainSize: 18, concreteType: 'high'
    }
};

// ============================================================================
// 3. AMBIENTE SANDBOX HEADLESS (NODE.JS VM CONTEXT)
// ============================================================================
function createMockElement(tag = 'div') {
    return {
        tagName: tag.toUpperCase(),
        style: {},
        classList: {
            _classes: new Set(),
            add(...cls) { cls.forEach(c => this._classes.add(c)); },
            remove(...cls) { cls.forEach(c => this._classes.delete(c)); },
            contains(c) { return this._classes.has(c); },
            toggle(c) { if (this.contains(c)) this.remove(c); else this.add(c); }
        },
        children: [],
        appendChild(child) { this.children.push(child); return child; },
        removeChild(child) {
            const idx = this.children.indexOf(child);
            if (idx >= 0) this.children.splice(idx, 1);
            return child;
        },
        addEventListener: () => {},
        removeEventListener: () => {},
        setAttribute: () => {},
        getAttribute: () => null
    };
}

function initializeSandbox() {
    const mockBody = createMockElement('body');
    const mockHead = createMockElement('head');

    const sandbox = {
        console,
        Math,
        Date,
        setTimeout: () => {},
        clearTimeout: () => {},
        setInterval: () => {},
        clearInterval: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
        localStorage: {
            _data: {
                kumongen_tutorial_seen: 'true',
                kumongen_student_name: 'Audit Bot'
            },
            getItem: (k) => (k in sandbox.localStorage._data ? sandbox.localStorage._data[k] : null),
            setItem: (k, v) => { sandbox.localStorage._data[k] = String(v); },
            removeItem: (k) => { delete sandbox.localStorage._data[k]; },
            clear: () => { sandbox.localStorage._data = {}; }
        },
        document: {
            readyState: 'complete',
            body: mockBody,
            head: mockHead,
            getElementById: () => null,
            querySelector: () => null,
            querySelectorAll: () => [],
            createElement: (tag) => createMockElement(tag),
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true
        }
    };

    sandbox.window = sandbox;
    sandbox.global = sandbox;
    sandbox.self = sandbox;

    const context = vm.createContext(sandbox);

    // Carrega módulos curriculares na ordem canônica
    const scripts = ['gerador.js', 'matematica.js', 'portugues.js', 'ingles.js', 'student-profiles.js'];
    for (const scriptName of scripts) {
        const scriptPath = path.join(CONFIG.projectRoot, scriptName);
        if (fs.existsSync(scriptPath)) {
            const code = fs.readFileSync(scriptPath, 'utf8');
            vm.runInContext(code, context, { filename: scriptName });
        }
    }

    if (!sandbox.KumonSubjects) {
        throw new Error('Falha crítica: window.KumonSubjects não foi inicializado no sandbox.');
    }

    // Harmoniza suporte a levelId string ou objeto no KumonSubjects
    for (const sub of Object.values(sandbox.KumonSubjects)) {
        const origGen = sub.generate;
        sub.generate = function(levelOrId, count) {
            let lvl = levelOrId;
            if (typeof levelOrId === 'string') {
                lvl = (sub.levels && sub.levels.find(l => l.id.toLowerCase() === levelOrId.toLowerCase())) || levelOrId;
            }
            return origGen.call(sub, lvl, count);
        };
    }

    return sandbox;
}

// ============================================================================
// 4. EXTRAÇÃO DE CHAVE CANÔNICA E ESTATÍSTICA DE ENTROPIA
// ============================================================================
function getItemKey(item) {
    if (!item) return 'null';
    if (item.type === 'math') return `${item.operand1}${item.operator}${item.operand2}`;
    if (item.type === 'fraction') return `${item.numerator}/${item.denominator}`;
    if (item.type === 'sequence') return item.sequence ? item.sequence.join(',') : 'seq';
    if (item.type === 'word') return item.word || 'word';
    if (item.type === 'syllable') return item.syllable || 'syl';
    if (item.type === 'sentence') return item.sentence || 'st';
    if (item.type === 'rhyme') return `${item.word}-${item.target}`;
    if (item.type === 'opposite') return `${item.word}-${item.target}`;
    if (item.type === 'trace') return item.char || 'char';
    if (item.type === 'quantity') return String(item.value);
    if (item.type === 'tens') return String(item.number || item.value);
    if (item.type === 'compare') return item.pair ? item.pair.join(':') : 'cmp';
    if (item.type === 'neighbors') return String(item.center);
    return JSON.stringify(item);
}

function calculateEntropyAndDistribution(samples, domainSize) {
    const counts = {};
    for (const s of samples) {
        const k = getItemKey(s);
        counts[k] = (counts[k] || 0) + 1;
    }
    const n = samples.length;
    let h = 0;
    for (const count of Object.values(counts)) {
        const p = count / n;
        h -= p * Math.log2(p);
    }
    const maxK = Math.min(n, domainSize || Object.keys(counts).length || 1);
    const maxH = maxK > 1 ? Math.log2(maxK) : 1;
    const hNorm = maxH > 0 ? Math.min(1.0, h / maxH) : 1.0;

    let consecDuplicates = 0;
    for (let i = 1; i < samples.length; i++) {
        if (getItemKey(samples[i]) === getItemKey(samples[i - 1])) {
            consecDuplicates++;
        }
    }

    return {
        entropy: Number(hNorm.toFixed(3)),
        uniqueCount: Object.keys(counts).length,
        consecDuplicates
    };
}

// ============================================================================
// 5. IMPLEMENTAÇÃO DAS 5 DIMENSÕES DE QUALIDADE (RUBRIC 5D)
// ============================================================================

/**
 * Dimensão 1: Alinhamento BNCC / Faixa Etária (peso 20% / 0.20)
 */
function evaluateD1_BNCC(level, samples, meta) {
    let score = 100;
    const notes = [];

    // Metadados normativos curriculares
    if (!meta.bncc) {
        score -= 20;
        notes.push('Código BNCC não mapeado');
    }
    if (!meta.age) {
        score -= 10;
        notes.push('Faixa etária pretendida não especificada');
    }
    if (!level.instruction && !level.instructions) {
        score -= 15;
        notes.push('Instrução pedagógica ausente no nível');
    }

    // Adequação de complexidade sintática e lexical
    for (const it of samples) {
        if (it.type === 'sentence') {
            const words = (it.sentence || '').trim().split(/\s+/);
            if (words.length > 7 || (it.sentence && it.sentence.length > 60)) {
                score -= 5;
                notes.push(`Extensão de frase incompatível com faixa infantil: "${it.sentence}"`);
                break;
            }
        }
        if (it.type === 'word' && it.word && it.word.length > 14) {
            score -= 5;
            notes.push(`Palavra excessivamente longa para a faixa etária: ${it.word}`);
            break;
        }
        if (it.type === 'quantity' && it.value > 5 && meta.code === 'M1') {
            score -= 10;
            notes.push(`Quantidade ${it.value} excede limite BNCC EI03ET07 de 1 a 5`);
            break;
        }
        if (it.type === 'tens') {
            const val = it.number || it.value;
            if (val < 10 || val > 19) {
                score -= 10;
                notes.push(`Dezena ${val} fora do escopo normativo 10 a 19`);
                break;
            }
        }
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        notes
    };
}

/**
 * Dimensão 2: Graduação Kumon / Suavidade de Passos (peso 25% / 0.25)
 */
function evaluateD2_Kumon(level, samples, meta) {
    let score = 100;
    const notes = [];

    // SCT Kumon padrão calibrado
    if (!meta.sct || meta.sct < 45 || meta.sct > 240) {
        score -= 10;
        notes.push('Tempo padrão Kumon (SCT) ausente ou descalibrado');
    }

    // Delimitação estrita de escopo intra-nível ("pequenos passos")
    for (const it of samples) {
        // M6 Subtração: estritamente minuendo >= subtraendo
        if (it.type === 'math' && it.operator === '-' && it.operand1 < it.operand2) {
            score -= 20;
            notes.push(`Subtração negativa vedada no Kumon inicial: ${it.operand1} - ${it.operand2}`);
            break;
        }
        // M9 Divisão: divisor > 0 e divisão estritamente exata
        if (it.type === 'math' && (it.operator === '÷' || it.operator === '/')) {
            if (it.operand2 === 0) {
                score -= 25;
                notes.push('Divisão por zero detectada');
                break;
            }
            if (it.operand1 % it.operand2 !== 0) {
                score -= 20;
                notes.push(`Divisão inexata com resto vedada em M9: ${it.operand1} ÷ ${it.operand2}`);
                break;
            }
        }
        // M3 Sequências: lacuna única e regularidade
        if (it.type === 'sequence' && it.sequence) {
            const holes = it.sequence.filter(x => x === '__');
            if (holes.length !== 1) {
                score -= 15;
                notes.push(`Sequência com ${holes.length} lacunas (Kumon exige exatamente 1 lacuna)`);
                break;
            }
        }
        // P2 Sílabas Simples: apenas CV canônico (2 letras)
        if (meta.code === 'P2' && it.type === 'syllable' && it.syllable) {
            if (it.syllable.length !== 2) {
                score -= 10;
                notes.push(`Sílaba não-canônica em P2: "${it.syllable}"`);
                break;
            }
        }
        // P4 Palavras trissílabas/polissílabas regulares
        if (meta.code === 'P4' && it.type === 'word' && it.parts) {
            if (it.parts.length < 3) {
                score -= 10;
                notes.push(`Palavra em P4 com menos de 3 sílabas: "${it.word}"`);
                break;
            }
        }
        // I2 CVC: padrão estrito de 3 letras
        if (meta.code === 'I2' && it.type === 'word' && it.word) {
            if (it.word.length !== 3) {
                score -= 15;
                notes.push(`Palavra CVC com tamanho diferente de 3 em I2: "${it.word}"`);
                break;
            }
        }
        // I5 CVCe: término em 'E' mudo
        if (meta.code === 'I5' && it.type === 'word' && it.word) {
            if (!it.word.toUpperCase().endsWith('E')) {
                score -= 15;
                notes.push(`Palavra Magic E em I5 sem terminação em 'E': "${it.word}"`);
                break;
            }
        }
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        notes
    };
}

/**
 * Dimensão 3: Correção Ortográfica e Matemática (peso 25% / 0.25)
 */
function evaluateD3_Correctness(level, samples, meta) {
    let score = 100;
    const notes = [];

    for (const it of samples) {
        // Validação Aritmética
        if (it.type === 'math') {
            if (it.operator === '+') {
                const expected = it.operand1 + it.operand2;
                if (it.result !== expected) {
                    score -= 20;
                    notes.push(`Erro de adição: ${it.operand1} + ${it.operand2} != ${it.result}`);
                }
            } else if (it.operator === '-') {
                const expected = it.operand1 - it.operand2;
                if (it.result !== expected) {
                    score -= 20;
                    notes.push(`Erro de subtração: ${it.operand1} - ${it.operand2} != ${it.result}`);
                }
            } else if (it.operator === '×' || it.operator === '*') {
                const expected = it.operand1 * it.operand2;
                if (it.result !== expected) {
                    score -= 20;
                    notes.push(`Erro de multiplicação: ${it.operand1} × ${it.operand2} != ${it.result}`);
                }
            } else if (it.operator === '÷' || it.operator === '/') {
                if (it.operand2 !== 0) {
                    const expected = Math.floor(it.operand1 / it.operand2);
                    if (it.result !== expected) {
                        score -= 20;
                        notes.push(`Erro de divisão: ${it.operand1} ÷ ${it.operand2} != ${it.result}`);
                    }
                }
            }
        }

        // Validação de Frações
        if (it.type === 'fraction') {
            if (it.denominator <= 0 || it.numerator < 0 || it.numerator > it.denominator) {
                score -= 20;
                notes.push(`Fração imprópria ou inválida: ${it.numerator}/${it.denominator}`);
            }
        }

        // Validação de Comparação
        if (it.type === 'compare') {
            if (!Array.isArray(it.pair) || it.pair.length !== 2 || isNaN(it.pair[0]) || isNaN(it.pair[1])) {
                score -= 15;
                notes.push('Par de comparação inválido ou indefinido');
            }
        }

        // Validação de Sequências (M3)
        if (it.type === 'sequence') {
            if (!Array.isArray(it.sequence) || it.sequence.length < 3) {
                score -= 15;
                notes.push('Sequência curta ou inválida');
            }
        }

        // Validação de Recomposição Silábica
        if (it.type === 'word' && it.parts) {
            const rebuilt = it.parts.join('').toUpperCase();
            if (rebuilt !== it.word.toUpperCase()) {
                score -= 20;
                notes.push(`Divergência silábica: [${it.parts.join(',')}] != ${it.word}`);
            }
        }

        // Validação de Rimas (P7)
        if (it.type === 'rhyme') {
            if (!Array.isArray(it.options) || !it.options.includes(it.target)) {
                score -= 20;
                notes.push(`Gabarito de rima ausente nas opções: ${it.target} em [${(it.options || []).join(',')}]`);
            }
        }

        // Validação de Opostos (I7)
        if (it.type === 'opposite') {
            if (!Array.isArray(it.options) || !it.options.includes(it.target)) {
                score -= 20;
                notes.push(`Gabarito de antônimo ausente nas opções: ${it.target} em [${(it.options || []).join(',')}]`);
            }
        }

        // Validação de Sentenças (P8 / I6)
        if (it.type === 'sentence' && it.parts && it.sentence) {
            const joined = it.parts.join(' ').replace(/\s+/g, ' ').trim();
            const raw = it.sentence.replace(/\s+/g, ' ').trim();
            if (joined !== raw) {
                score -= 15;
                notes.push(`Segmentação de frase divergente do original: "${joined}" vs "${raw}"`);
            }
        }

        // Validação de Traçado (P1 / I1)
        if (it.type === 'trace') {
            if (!it.char || !/^[A-Za-zÁ-Úá-ú]$/.test(it.char)) {
                score -= 15;
                notes.push(`Caractere de traçado inválido: "${it.char}"`);
            }
        }
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        notes
    };
}

/**
 * Dimensão 4: Apoio Concreto / Pictórico (peso 15% / 0.15)
 */
function evaluateD4_Concrete(level, samples, meta) {
    let score = 100;
    const notes = [];

    if (meta.concreteType === 'high') {
        // Níveis essenciais de alfabetização inicial e apoio visual forte
        score = 98;
        // Confere suporte a representações concretas nos itens
        const hasVisualSupport = samples.some(s => 
            s.type === 'quantity' || s.type === 'fraction' || s.type === 'tens' || 
            s.type === 'trace' || s.type === 'rhyme' || s.type === 'opposite' || s.type === 'syllable'
        );
        if (!hasVisualSupport) {
            score -= 15;
            notes.push('Nível de alta necessidade concreta sem suporte visual identificado');
        }
    } else {
        // Níveis com transição gradual para o abstrato
        score = 95;
    }

    // Verifica clareza gráfica da instrução para apoio à mediação parental
    if (!level.instruction && !level.instructions) {
        score -= 10;
        notes.push('Falta orientação gráfica ao mediador');
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        notes
    };
}

/**
 * Dimensão 5: Variabilidade e Distribuição Estatística (peso 15% / 0.15)
 */
function evaluateD5_Variability(level, samples, meta) {
    let score = 100;
    const notes = [];

    const { entropy, uniqueCount, consecDuplicates } = calculateEntropyAndDistribution(samples, meta.domainSize);

    // Entropia normalizada em relação ao domínio teórico
    if (entropy < 0.70) {
        score -= 15;
        notes.push(`Entropia de Shannon baixa (${entropy} < 0.70)`);
    } else if (entropy < 0.85) {
        score -= 5;
        notes.push(`Entropia moderada (${entropy})`);
    }

    // Repetições consecutivas enfadonhas
    if (consecDuplicates > 4) {
        score -= 15;
        notes.push(`Taxa elevada de repetições imediatas consecutivas (${consecDuplicates})`);
    } else if (consecDuplicates > 2) {
        score -= 5;
        notes.push(`Repetições imediatas pontuais (${consecDuplicates})`);
    }

    // Cobertura do domínio do nível
    const minExpectedUnique = Math.min(meta.domainSize || 10, 5);
    if (uniqueCount < minExpectedUnique) {
        score -= 15;
        notes.push(`Espaço amostral reduzido no lote gerado: ${uniqueCount} itens únicos`);
    }

    return {
        score: Math.max(0, Math.min(100, score)),
        entropy,
        uniqueCount,
        consecDuplicates,
        notes
    };
}

// ============================================================================
// 6. AVALIAÇÃO DE UM NÍVEL CURRICULAR
// ============================================================================
function auditLevel(subjectKey, level, subjectModule, sandbox) {
    const meta = CURRICULAR_METADATA[level.id] || {
        code: level.id.toUpperCase(),
        subject: subjectKey,
        bncc: 'BNCC-ND',
        age: '4-10 anos',
        sct: 90,
        desc: level.title || 'Nível KumonGen',
        domainSize: 15,
        concreteType: 'standard'
    };

    // Sincroniza o estado da aplicação simulando a seleção de nível na UI
    if (typeof sandbox.window.selectLevel === 'function') sandbox.window.selectLevel(level.id);

    // Gera lote de exercícios de teste através de window.KumonSubjects[subject].generate(levelId, 20)
    const samples = subjectModule.generate(level.id, CONFIG.sampleBatchSize);

    if (!Array.isArray(samples) || samples.length === 0) {
        throw new Error(`O gerador do nível ${level.id} retornou um lote vazio ou inválido.`);
    }

    // Executa as 5 dimensões avaliativas calibradas
    const d1 = evaluateD1_BNCC(level, samples, meta);
    const d2 = evaluateD2_Kumon(level, samples, meta);
    const d3 = evaluateD3_Correctness(level, samples, meta);
    const d4 = evaluateD4_Concrete(level, samples, meta);
    const d5 = evaluateD5_Variability(level, samples, meta);

    // Agregação Ponderada Exata
    const weightedScore = Number((
        (d1.score * CONFIG.weights.d1_bncc) +
        (d2.score * CONFIG.weights.d2_kumon) +
        (d3.score * CONFIG.weights.d3_correctness) +
        (d4.score * CONFIG.weights.d4_concrete) +
        (d5.score * CONFIG.weights.d5_variability)
    ).toFixed(1));

    // Identificação da dimensão mais fraca (Weakest Dimension)
    const dimensions = [
        { key: 'd1_bncc', name: 'BNCC/Idade', score: d1.score, notes: d1.notes },
        { key: 'd2_kumon', name: 'Graduação Kumon', score: d2.score, notes: d2.notes },
        { key: 'd3_correctness', name: 'Correção Algorítmica', score: d3.score, notes: d3.notes },
        { key: 'd4_concrete', name: 'Apoio Concreto', score: d4.score, notes: d4.notes },
        { key: 'd5_variability', name: 'Variabilidade/Entropia', score: d5.score, notes: d5.notes }
    ];
    dimensions.sort((a, b) => a.score - b.score);

    const isPass = weightedScore >= CONFIG.passScoreThreshold;
    const status = isPass ? 'PASS' : 'FAIL';

    return {
        id: level.id.toUpperCase(),
        code: meta.code,
        subject: subjectKey,
        title: level.title || meta.desc,
        bncc: meta.bncc,
        age: meta.age,
        sct: meta.sct,
        samplesEvaluated: samples.length,
        scores: {
            d1_bncc: d1.score,
            d2_kumon: d2.score,
            d3_correctness: d3.score,
            d4_concrete: d4.score,
            d5_variability: d5.score,
            weighted: weightedScore
        },
        metrics: {
            entropy: d5.entropy,
            uniqueCount: d5.uniqueCount,
            consecDuplicates: d5.consecDuplicates
        },
        weakestDimension: {
            name: dimensions[0].name,
            score: dimensions[0].score,
            notes: dimensions[0].notes
        },
        status,
        passed: isPass
    };
}

// ============================================================================
// 7. FORMATADOR E RENDERIZADOR DE TABELA CLI (ANSI)
// ============================================================================
function renderAnsiTable(auditResults) {
    const sepLine = '─'.repeat(102);
    console.log(`\n${c.bold}${c.cyan}┌${'─'.repeat(100)}┐${c.reset}`);
    console.log(`${c.bold}${c.cyan}│   KUMONGEN · AUDITORIA MULTIDIMENSIONAL DE QUALIDADE DE CONTEÚDO (EVAL HARNESS 5D)         │${c.reset}`);
    console.log(`${c.bold}${c.cyan}└${'─'.repeat(100)}┘${c.reset}\n`);

    console.log(`${c.dim}${sepLine}${c.reset}`);
    console.log(
        `${c.bold}` +
        `${'Nível'.padEnd(6)} ` +
        `${'Sub'.padEnd(5)} ` +
        `${'BNCC'.padEnd(9)} ` +
        `${'D1(BNCC)'.padStart(9)} ` +
        `${'D2(Kumon)'.padStart(9)} ` +
        `${'D3(Corr)'.padStart(8)} ` +
        `${'D4(Conc)'.padStart(8)} ` +
        `${'D5(Var)'.padStart(8)} ` +
        `${'Score'.padStart(8)} ` +
        `${'Status'.padEnd(7)} ` +
        `${'Fraqueza Principal'}` +
        `${c.reset}`
    );
    console.log(`${c.dim}${sepLine}${c.reset}`);

    for (const res of auditResults.levels) {
        const statusColor = res.passed ? c.green : c.red;
        const scoreColor = res.scores.weighted >= 95 ? c.green : (res.scores.weighted >= 90 ? c.cyan : c.red);
        
        console.log(
            `${c.bold}${res.code.padEnd(6)}${c.reset} ` +
            `${res.subject.slice(0, 3).toUpperCase().padEnd(5)} ` +
            `${c.dim}${res.bncc.padEnd(9)}${c.reset} ` +
            `${String(res.scores.d1_bncc).padStart(9)} ` +
            `${String(res.scores.d2_kumon).padStart(9)} ` +
            `${String(res.scores.d3_correctness).padStart(8)} ` +
            `${String(res.scores.d4_concrete).padStart(8)} ` +
            `${String(res.scores.d5_variability).padStart(8)} ` +
            `${scoreColor}${c.bold}${res.scores.weighted.toFixed(1).padStart(8)}${c.reset} ` +
            `${statusColor}${c.bold}${res.status.padEnd(7)}${c.reset} ` +
            `${c.yellow}${res.weakestDimension.name} (${res.weakestDimension.score})${c.reset}`
        );
    }

    console.log(`${c.dim}${sepLine}${c.reset}`);
    
    // Resumo executivo
    const summaryColor = auditResults.summary.overallStatus === 'PASS' ? c.green : c.red;
    console.log(
        `${c.bold}RESUMO EXECUTIVO:${c.reset} ` +
        `Total de Níveis: ${c.bold}${auditResults.summary.totalLevels}${c.reset} | ` +
        `Aprovados: ${c.green}${c.bold}${auditResults.summary.passedLevels}${c.reset} | ` +
        `Reprovados: ${auditResults.summary.failedLevels > 0 ? c.red : c.green}${c.bold}${auditResults.summary.failedLevels}${c.reset} | ` +
        `Média Global: ${c.bold}${auditResults.summary.averageScore.toFixed(1)}/100${c.reset} | ` +
        `Status: ${summaryColor}${c.bold}[${auditResults.summary.overallStatus}]${c.reset}`
    );
    console.log(`${c.dim}${sepLine}${c.reset}\n`);
}

// ============================================================================
// 8. PONTO DE ENTRADA PRINCIPAL (RUNNER)
// ============================================================================
function runContentQualityAudit() {
    const startTime = Date.now();
    const sandbox = initializeSandbox();

    const levelsResult = [];
    const subjects = ['matematica', 'portugues', 'ingles'];

    for (const subKey of subjects) {
        const sub = sandbox.KumonSubjects[subKey];
        if (!sub || !Array.isArray(sub.levels)) {
            throw new Error(`Disciplina '${subKey}' não encontrada em window.KumonSubjects.`);
        }

        for (const lvl of sub.levels) {
            const audit = auditLevel(subKey, lvl, sub, sandbox);
            levelsResult.push(audit);
        }
    }

    const totalLevels = levelsResult.length;
    const passedLevels = levelsResult.filter(l => l.passed).length;
    const failedLevels = totalLevels - passedLevels;
    const avgScore = Number((levelsResult.reduce((sum, l) => sum + l.scores.weighted, 0) / totalLevels).toFixed(1));
    const isOverallPass = failedLevels === 0;

    // Médias por disciplina
    const subjectSummaries = {};
    for (const subKey of subjects) {
        const subLevels = levelsResult.filter(l => l.subject === subKey);
        const subAvg = subLevels.reduce((sum, l) => sum + l.scores.weighted, 0) / subLevels.length;
        const subPass = subLevels.filter(l => l.passed).length;
        subjectSummaries[subKey] = {
            levelsCount: subLevels.length,
            passedCount: subPass,
            averageScore: Number(subAvg.toFixed(1)),
            status: subPass === subLevels.length ? 'PASS' : 'FAIL'
        };
    }

    const fullReport = {
        timestamp: new Date().toISOString(),
        environment: {
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch
        },
        config: CONFIG,
        summary: {
            totalLevels,
            passedLevels,
            failedLevels,
            averageScore: avgScore,
            overallStatus: isOverallPass ? 'PASS' : 'FAIL',
            durationMs: Date.now() - startTime
        },
        subjectSummaries,
        levels: levelsResult
    };

    // 1. Exibe tabela ANSI no terminal
    renderAnsiTable(fullReport);

    // 2. Persiste relatório JSON estruturado
    fs.writeFileSync(CONFIG.outputJsonPath, JSON.stringify(fullReport, null, 2), 'utf8');
    console.log(`${c.green}✔ Relatório estruturado salvo com sucesso em:${c.reset} ${CONFIG.outputJsonPath}\n`);

    // 3. Regra de saída contratual
    if (isOverallPass) {
        console.log(`${c.bold}${c.green}★ SUCESSO: Todos os 25 níveis curriculares atingiram nota >= ${CONFIG.passScoreThreshold}/100.${c.reset}\n`);
        process.exit(0);
    } else {
        console.error(`${c.bold}${c.red}✖ FALHA: ${failedLevels} nível(is) não atingiram a nota mínima de ${CONFIG.passScoreThreshold}/100.${c.reset}\n`);
        process.exit(1);
    }
}

// Execução
try {
    runContentQualityAudit();
} catch (err) {
    console.error(`\n${c.bold}${c.red}FATAL ERROR durante execução do Eval Harness:${c.reset}`, err);
    process.exit(1);
}
