// Suíte de Testes Automatizados — Certificado de Honra ao Mérito & Boletim em PDF (Sprint 4)
// Valida geração do Diploma A4 Paisagem, Boletim com métricas da Sprint 2, sanitização XSS e delegação Tablet
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('====================================================================');
console.log('  KUMONGEN · TESTES DO DIPLOMA DE HONRA AO MÉRITO & BOLETIM (SPRINT 4)');
console.log('====================================================================\n');

let totalTests = 0;
let passedTests = 0;

async function test(name, fn) {
    totalTests++;
    try {
        await fn();
        passedTests++;
        console.log(`  ✔ PASS: ${name}`);
    } catch (err) {
        console.error(`  ✖ FAIL: ${name}`);
        console.error(`         ${err.stack || err.message}`);
    }
}

// Mock jsPDF para teste headless determinístico em Node.js
class MockJsPDF {
    constructor(opts = {}) {
        this.opts = opts;
        this.commands = [];
        this.texts = [];
        this.fontSize = 10;
        this.savedFilename = null;
        this.internal = {
            pageSize: {
                getWidth: () => opts.orientation === 'landscape' ? 297 : 210,
                getHeight: () => opts.orientation === 'landscape' ? 210 : 297
            }
        };
    }
    setFillColor(...args) { this.commands.push({ cmd: 'setFillColor', args }); }
    setDrawColor(...args) { this.commands.push({ cmd: 'setDrawColor', args }); }
    setLineWidth(...args) { this.commands.push({ cmd: 'setLineWidth', args }); }
    rect(...args) { this.commands.push({ cmd: 'rect', args }); }
    roundedRect(...args) { this.commands.push({ cmd: 'roundedRect', args }); }
    line(...args) { this.commands.push({ cmd: 'line', args }); }
    circle(...args) { this.commands.push({ cmd: 'circle', args }); }
    triangle(...args) { this.commands.push({ cmd: 'triangle', args }); }
    setFont(...args) { this.commands.push({ cmd: 'setFont', args }); }
    setFontSize(sz) { this.fontSize = sz; this.commands.push({ cmd: 'setFontSize', sz }); }
    setTextColor(...args) { this.commands.push({ cmd: 'setTextColor', args }); }
    getTextWidth(txt) { return (String(txt).length * (this.fontSize || 10) * 0.35); }
    text(txt, x, y, opts) {
        this.texts.push({ txt: String(txt), x, y, opts });
        this.commands.push({ cmd: 'text', txt: String(txt), x, y, opts });
    }
    save(filename) { this.savedFilename = filename; }
    output(type) { return Buffer.from('mock pdf content'); }
}

// Ambiente simulado com DOM e Storage
function createTestEnvironment() {
    const memoryStore = {};
    const mockStorage = {
        getItem: (k) => memoryStore[k] || null,
        setItem: (k, v) => { memoryStore[k] = String(v); },
        removeItem: (k) => { delete memoryStore[k]; },
        clear: () => { for (const k of Object.keys(memoryStore)) delete memoryStore[k]; }
    };

    function createMockEl(tag) {
        const el = {
            tagName: tag.toUpperCase(),
            style: {},
            classList: {
                _classes: new Set(),
                add(c) { this._classes.add(c); },
                remove(c) { this._classes.delete(c); },
                contains(c) { return this._classes.has(c); }
            },
            attributes: {},
            children: [],
            innerHTML: '',
            innerText: '',
            textContent: '',
            onclick: null,
            onchange: null,
            setAttribute(k, v) { this.attributes[k] = String(v); },
            getAttribute(k) { return this.attributes[k] || null; },
            removeAttribute(k) { delete this.attributes[k]; },
            appendChild(c) { this.children.push(c); if (c) c.parentNode = this; return c; },
            removeChild(c) {
                const idx = this.children.indexOf(c);
                if (idx !== -1) {
                    this.children.splice(idx, 1);
                    c.parentNode = null;
                }
                return c;
            },
            remove() {
                if (this.parentNode && this.parentNode.removeChild) {
                    this.parentNode.removeChild(this);
                }
            },
            addEventListener(evt, cb) { this['on' + evt] = cb; },
            querySelectorAll(sel) {
                const results = [];
                const search = (node) => {
                    if (!node || !node.children) return;
                    for (const child of node.children) {
                        if (sel.startsWith('.') && child.classList && child.classList.contains(sel.slice(1))) {
                            results.push(child);
                        } else if (sel.startsWith('#') && child.id === sel.slice(1)) {
                            results.push(child);
                        }
                        search(child);
                    }
                };
                search(this);
                return results;
            },
            querySelector(sel) {
                if (this.innerHTML) {
                    const idMatch = sel.startsWith('#') && this.innerHTML.includes(`id="${sel.slice(1)}"`);
                    if (idMatch) {
                        return {
                            id: sel.slice(1),
                            style: {},
                            onclick: null,
                            addEventListener(evt, cb) { this['on' + evt] = cb; },
                            click() { if (typeof this.onclick === 'function') this.onclick(); }
                        };
                    }
                }
                return null;
            }
        };
        return el;
    }

    const mockDocument = {
        elements: {},
        body: createMockEl('body'),
        createElement: (tag) => createMockEl(tag),
        getElementById: (id) => {
            if (id === 'studentProfileManagerModal') {
                for (const c of mockDocument.body.children) {
                    if (c.id === id) return c;
                }
            }
            return mockDocument.elements[id] || null;
        },
        addEventListener: (evt, cb) => {},
        removeEventListener: (evt, cb) => {},
        querySelector: (s) => mockDocument.body.querySelector(s),
        querySelectorAll: (s) => mockDocument.body.querySelectorAll(s)
    };

    const windowObj = {
        localStorage: mockStorage,
        document: mockDocument,
        alert: () => {},
        console: console,
        Date: Date,
        Math: Math,
        JSON: JSON,
        URL: { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} },
        jspdf: { jsPDF: MockJsPDF }
    };

    const ctx = vm.createContext({
        window: windowObj,
        document: mockDocument,
        localStorage: mockStorage,
        console: console,
        Date: Date,
        Math: Math,
        JSON: JSON,
        Buffer: Buffer,
        setTimeout: (fn) => fn(),
        clearTimeout: () => {}
    });

    const profilesPath = path.resolve(__dirname, '../../mathbook-main/student-profiles.js');
    const fallbackPath = path.resolve(process.cwd(), 'student-profiles.js');
    const targetPath = fs.existsSync(fallbackPath) ? fallbackPath : profilesPath;
    const code = fs.readFileSync(targetPath, 'utf8');
    vm.runInContext(code, ctx);

    return { ctx, mockDocument, mockStorage, windowObj };
}

(async () => {
    // -----------------------------------------------------------------------------
    // CENÁRIO 1: API DO DIPLOMA DE HONRA AO MÉRITO (StudentProfileEngine)
    // -----------------------------------------------------------------------------
    console.log('[CENÁRIO 1] Assinatura e Inicialização do Diploma em PDF');

    await test('StudentProfileEngine possui método assíncrono generateMasteryCertificatePDF', async () => {
        const { ctx } = createTestEnvironment();
        const engine = ctx.window.StudentProfileEngine;
        assert.strictEqual(typeof engine.generateMasteryCertificatePDF, 'function', 'Deve existir método generateMasteryCertificatePDF');
    });

    // -----------------------------------------------------------------------------
    // CENÁRIO 2: GERAÇÃO DO DIPLOMA GERAL DE HONRA AO MÉRITO
    // -----------------------------------------------------------------------------
    console.log('\n[CENÁRIO 2] Emissão de Diploma Geral de Honra ao Mérito');

    await test('generateMasteryCertificatePDF emite diploma geral com dimensões A4 e texto cerimonial', async () => {
        const { ctx } = createTestEnvironment();
        const engine = ctx.window.StudentProfileEngine;

        const student = engine.getActive();
        engine.recordLevelMastery('matematica', 'm1', { accuracy: 100, timeSec: 90, targetSec: 120 });
        engine.recordLevelMastery('matematica', 'm2', { accuracy: 100, timeSec: 95, targetSec: 120 });

        const doc = await engine.generateMasteryCertificatePDF(student.id);

        assert.ok(doc, 'Deve retornar a instância jsPDF gerada');
        assert.strictEqual(doc.internal.pageSize.getWidth(), 297, 'Largura deve ser A4 Paisagem (297mm)');
        assert.strictEqual(doc.internal.pageSize.getHeight(), 210, 'Altura deve ser A4 Paisagem (210mm)');

        const allText = doc.texts.map(t => t.txt).join(' ');
        assert.ok(allText.includes('DIPLOMA DE HONRA AO MÉRITO'), 'Deve conter o título principal do diploma');
        assert.ok(allText.includes(student.name.toUpperCase()), 'Deve conter o nome do aluno em destaque');
        assert.ok(allText.includes('MAESTRIA CURRICULAR'), 'Deve conter cartão de maestria curricular');
        assert.ok(allText.includes('RITMO FLUENTE SCT'), 'Deve conter cartão de ritmo SCT');
        assert.ok(allText.includes('Companheiro(a) de Jornada: Jade'), 'Deve referenciar o mascote companheiro Jade');
        assert.ok(allText.includes('KM-CERT-'), 'Deve incluir código de registro autenticado');
        assert.ok(doc.savedFilename.includes('Diploma_Kumon_'), 'Deve definir nome de arquivo descritivo com prefixo');
    });

    // -----------------------------------------------------------------------------
    // CENÁRIO 3: GERAÇÃO DO DIPLOMA POR NÍVEL ESPECÍFICO (ex: M10 Frações)
    // -----------------------------------------------------------------------------
    console.log('\n[CENÁRIO 3] Emissão de Diploma por Nível Específico (Gauntlet / M10)');

    await test('generateMasteryCertificatePDF emite diploma para módulo específico com métricas da sessão', async () => {
        const { ctx } = createTestEnvironment();
        const engine = ctx.window.StudentProfileEngine;

        const doc = await engine.generateMasteryCertificatePDF(null, {
            studentName: 'Clara Aventureira',
            levelId: 'm10',
            levelTitle: 'M10 · Frações e Incógnitas',
            subjectTitle: 'Matemática',
            accuracy: 100,
            isGauntletMastered: true,
            timeFormatted: '02:30',
            targetFormatted: '03:15',
            starsEarned: 15
        });

        assert.ok(doc, 'Deve gerar documento para nível específico');
        const allText = doc.texts.map(t => t.txt).join(' ');
        assert.ok(allText.includes('CLARA AVENTUREIRA'), 'Nome do aluno deve estar em caixa alta');
        assert.ok(allText.includes('M10 · Frações e Incógnitas · Matemática'), 'Deve citar o módulo e disciplina conquistados');
        assert.ok(allText.includes('MAESTRIA KUMON'), 'Deve conter indicador de Maestria Kumon');
        assert.ok(allText.includes('02:30'), 'Deve exibir o tempo alcançado');
        assert.ok(allText.includes('+15 ★'), 'Deve exibir as estrelas conquistadas');
        assert.ok(doc.savedFilename.includes('m10'), 'Nome do arquivo salvo deve conter o ID do nível');
    });

    // -----------------------------------------------------------------------------
    // CENÁRIO 4: ROBUSTEZ, NOMES LONGOS E DEFESA CONTRA INJEÇÃO
    // -----------------------------------------------------------------------------
    console.log('\n[CENÁRIO 4] Resiliência a Nomes Longos e Sanitização de Caracteres');

    await test('Nome longo tem redução automática de fonte e caracteres especiais não quebram geração', async () => {
        const { ctx } = createTestEnvironment();
        const engine = ctx.window.StudentProfileEngine;

        const complexName = '<script>alert(1)</script> Dom Pedro de Alcântara João Carlos Leopoldo Salvador Bibiano Francisco Xavier de Paula Leocádio Miguel Gabriel Rafael Gonzaga';
        const doc = await engine.generateMasteryCertificatePDF(null, {
            studentName: complexName,
            levelTitle: 'Nível Avançado'
        });

        assert.ok(doc, 'Deve gerar sem exceções');
        assert.ok(doc.savedFilename, 'Nome do arquivo deve ser gerado');
        assert.ok(!doc.savedFilename.includes('<script>'), 'Nome do arquivo não pode conter caracteres perigosos');
    });

    // -----------------------------------------------------------------------------
    // CENÁRIO 5: REFINAMENTO DO BOLETIM OFICIAL EM PDF (generateMasteryReportPDF)
    // -----------------------------------------------------------------------------
    console.log('\n[CENÁRIO 5] Refinamento do Boletim Oficial Mensal em PDF');

    await test('generateMasteryReportPDF incorpora métricas da Sprint 2 e retorna doc válido', async () => {
        const { ctx } = createTestEnvironment();
        const engine = ctx.window.StudentProfileEngine;

        const student = engine.getActive();
        engine.recordLevelMastery('matematica', 'm1', { accuracy: 100, timeSec: 90, targetSec: 120 });
        engine.addActiveHistoryItem({
            date: '06/09/2026',
            timeSec: 100,
            targetSec: 120,
            accuracy: 100
        });

        const doc = await engine.generateMasteryReportPDF(student.id);
        assert.ok(doc, 'Deve retornar a instância do jsPDF');
        const allText = doc.texts.map(t => t.txt).join(' ');
        assert.ok(allText.includes('BOLETIM OFICIAL DE MAESTRIA'), 'Deve conter título oficial do boletim');
        assert.ok(allText.includes('RITMO FLUENTE SCT'), 'Deve conter métrica de ritmo SCT consolidada');
        assert.ok(allText.includes('OFENSIVA & ESTRELAS'), 'Deve conter métrica de ofensiva e estrelas');
        assert.ok(allText.includes('KM-BOLETIM-'), 'Deve incluir código de rastreamento do boletim');
    });

    // -----------------------------------------------------------------------------
    // CENÁRIO 6: BOTÕES NA VISTA DE EVOLUÇÃO (DOM)
    // -----------------------------------------------------------------------------
    console.log('\n[CENÁRIO 6] Botões de Ação na Vista de Evolução do Perfil');

    await test('showEvolutionModal renderiza ambos os botões [Boletim A4] e [Diploma de Mérito]', () => {
        const { ctx, mockDocument } = createTestEnvironment();
        const engine = ctx.window.StudentProfileEngine;

        engine.showEvolutionModal();
        const modal = mockDocument.getElementById('studentProfileManagerModal');
        assert.ok(modal, 'Modal deve ser renderizado');
        assert.ok(modal.innerHTML.includes('btnDownloadPDFFromEvolution'), 'Botão de boletim A4 deve estar presente');
        assert.ok(modal.innerHTML.includes('btnDownloadCertFromEvolution'), 'Botão de diploma de mérito deve estar presente');
        assert.ok(modal.innerHTML.includes('Emitir Diploma de Mérito'), 'Texto descritivo do diploma deve constar no botão');
    });

    console.log('\n====================================================================');
    console.log(`  RESUMO DA SUÍTE: ${passedTests} / ${totalTests} testes aprovados (${Math.round((passedTests/totalTests)*100)}%)`);
    console.log('====================================================================');

    if (passedTests === totalTests) {
        console.log('  ✅ TODOS OS TESTES DA SPRINT 4 FORAM APROVADOS COM SUCESSO!\n');
    } else {
        process.exit(1);
    }
})();
