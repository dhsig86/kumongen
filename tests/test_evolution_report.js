// Suíte de Testes Automatizados — Boletim e Histórico de Evolução do Aluno (Sprint 2)
// Valida persistência analítica, cálculo de métricas SCT, renderização SVG e matriz dos 25 níveis
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('====================================================================');
console.log('  KUMONGEN · TESTES DO BOLETIM DE EVOLUÇÃO & HISTÓRICO (SPRINT 2)');
console.log('====================================================================\n');

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
    totalTests++;
    try {
        fn();
        passedTests++;
        console.log(`  ✔ PASS: ${name}`);
    } catch (err) {
        console.error(`  ✖ FAIL: ${name}`);
        console.error(`         ${err.message}`);
    }
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
            },
            addEventListener(evt, cb) {
                this['on' + evt] = cb;
            },
            removeEventListener(evt, cb) {}
        };
        return el;
    }

    const mockDocument = {
        body: createMockEl('body'),
        createElement(t) { return createMockEl(t); },
        getElementById(id) {
            if (this.body) {
                for (const c of this.body.children) {
                    if (c.id === id) return c;
                }
            }
            return null;
        },
        addEventListener() {},
        removeEventListener() {}
    };

    const ctx = {
        console: { log() {}, warn() {}, error() {} },
        Date, Math, JSON, String, Number, Array, Object,
        document: mockDocument,
        localStorage: mockStorage,
        window: null
    };
    ctx.window = ctx;

    const filePath = path.resolve(__dirname, '../student-profiles.js');
    const code = fs.readFileSync(filePath, 'utf8');
    vm.runInNewContext(code, ctx);

    return { ctx, mockDocument, mockStorage };
}

// -----------------------------------------------------------------------------
// CENÁRIO 1: API DO STUDENT PROFILE ENGINE & HISTÓRICO ENRIQUECIDO
// -----------------------------------------------------------------------------
console.log('\n[CENÁRIO 1] API do Motor de Perfis e Gravação Analítica de Histórico');

test('StudentProfileEngine possui método público showEvolutionModal', () => {
    const { ctx } = createTestEnvironment();
    assert.strictEqual(typeof ctx.window.StudentProfileEngine.showEvolutionModal, 'function');
});

test('addActiveHistoryItem persiste atributos analíticos completos (acurácia, tempos SCT, estrelas)', () => {
    const { ctx } = createTestEnvironment();
    const engine = ctx.window.StudentProfileEngine;
    const active = engine.getActive();
    assert.ok(active, 'Deve haver aluno ativo inicial');

    const sampleSession = {
        id: 'hist_test_1',
        timestamp: new Date().toISOString(),
        date: '06/09/2026',
        timeStr: '18:30',
        type: 'tablet_round',
        subject: 'matematica',
        levelId: 'm2',
        levelTitle: 'M2 · Adição (+1 a +9)',
        accuracy: 90,
        timeSec: 110,
        targetSec: 180,
        totalItems: 10,
        firstAttemptCorrect: 9,
        isGauntletMastered: true,
        starsEarned: 12,
        completed: true
    };

    engine.addActiveHistoryItem(sampleSession);
    const updated = engine.getActive();
    assert.ok(updated.history.length > 0, 'Histórico deve conter itens');
    const saved = updated.history[0];
    assert.strictEqual(saved.accuracy, 90);
    assert.strictEqual(saved.timeSec, 110);
    assert.strictEqual(saved.targetSec, 180);
    assert.strictEqual(saved.isGauntletMastered, true);
    assert.strictEqual(saved.starsEarned, 12);
});

// -----------------------------------------------------------------------------
// CENÁRIO 2: MATRIZ DE MAESTRIA DOS 25 NÍVEIS CURRICULARES
// -----------------------------------------------------------------------------
console.log('\n[CENÁRIO 2] Matriz de Maestria e Contadores dos 25 Níveis');

test('recordLevelMastery registra maestria de nível com tempo recorde e precisão', () => {
    const { ctx } = createTestEnvironment();
    const engine = ctx.window.StudentProfileEngine;

    engine.recordLevelMastery('matematica', 'm1', { accuracy: 100, timeSec: 95, targetSec: 120 });
    engine.recordLevelMastery('matematica', 'm10', { accuracy: 100, timeSec: 140, targetSec: 180 });
    engine.recordLevelMastery('portugues', 'p1', { accuracy: 100, timeSec: 80, targetSec: 120 });
    engine.recordLevelMastery('ingles', 'i1', { accuracy: 100, timeSec: 75, targetSec: 120 });

    const count = engine.getMasteryCount();
    assert.strictEqual(count, 4, 'Deve contabilizar 4 níveis dominados');

    const active = engine.getActive();
    assert.strictEqual(active.mastery.matematica.m1.bestTimeSec, 95);
    assert.strictEqual(active.mastery.matematica.m10.mastered, true);
});

// -----------------------------------------------------------------------------
// CENÁRIO 3: RENDERIZAÇÃO DO BOLETIM DE EVOLUÇÃO (DOM & SVG)
// -----------------------------------------------------------------------------
console.log('\n[CENÁRIO 3] Renderização do Modal de Evolução e Gráfico SVG');

test('showEvolutionModal renderiza painel com métricas de consistência e matriz curricular', () => {
    const { ctx, mockDocument } = createTestEnvironment();
    const engine = ctx.window.StudentProfileEngine;

    // Popula aluno com histórico e maestria
    engine.recordLevelMastery('matematica', 'm2', { accuracy: 100, timeSec: 100, targetSec: 150 });
    for (let i = 1; i <= 5; i++) {
        engine.addActiveHistoryItem({
            id: 'hist_' + i,
            date: '06/09/2026',
            timeStr: `18:0${i}`,
            subject: 'matematica',
            levelId: 'm2',
            levelTitle: 'M2 · Adição',
            accuracy: 80 + i * 4,
            timeSec: 120 - i * 5,
            targetSec: 150,
            totalItems: 10,
            starsEarned: 10
        });
    }

    // Invoca o boletim
    engine.showEvolutionModal();

    const modal = mockDocument.getElementById('studentProfileManagerModal');
    assert.ok(modal, 'Modal deve ser anexado ao DOM');
    assert.ok(modal.innerHTML.includes('Curva de Acurácia &amp; Fluência') || modal.innerHTML.includes('Curva de Acurácia & Fluência'), 'Deve conter título do gráfico de fluência');
    assert.ok(modal.innerHTML.includes('<svg'), 'Deve conter elemento SVG para visualização gráfica');
    assert.ok(modal.innerHTML.includes('Níveis Kumon (100%)'), 'Deve conter card de níveis dominados');
    assert.ok(modal.innerHTML.includes('Ritmo Fluente SCT'), 'Deve conter card de ritmo SCT');
    assert.ok(modal.innerHTML.includes('tabBtnMetrics'), 'Deve conter abas interativas de navegação');
});

test('showEvolutionModal com histórico vazio exibe empty state acolhedor sem lançar erros', () => {
    const { ctx, mockDocument } = createTestEnvironment();
    const engine = ctx.window.StudentProfileEngine;

    // Garante histórico limpo
    const active = engine.getActive();
    active.history = [];

    // Não deve lançar exceção
    engine.showEvolutionModal();
    const modal = mockDocument.getElementById('studentProfileManagerModal');
    assert.ok(modal, 'Modal deve abrir mesmo sem histórico');
    assert.ok(modal.innerHTML.includes('Curva de Fluência em Construção'), 'Deve exibir mensagem motivadora');
});

// -----------------------------------------------------------------------------
// CENÁRIO 4: SEGURANÇA E SANITIZAÇÃO XSS NO BOLETIM
// -----------------------------------------------------------------------------
console.log('\n[CENÁRIO 4] Sanitização XSS e Blindagem contra Injeção');

test('Nome de aluno com tags maliciosas é sanitizado com escapeHtml no boletim', () => {
    const { ctx, mockDocument } = createTestEnvironment();
    const engine = ctx.window.StudentProfileEngine;

    const xssPayload = '<script>alert("hacked")</script>João & Maria';
    const s = engine.create({ name: xssPayload, ageTier: 'age_6_7', mascot: 'jaguar' });
    engine.setActive(s.id);

    engine.showEvolutionModal();
    const modal = mockDocument.getElementById('studentProfileManagerModal');
    assert.ok(modal, 'Modal deve renderizar');
    assert.ok(!modal.innerHTML.includes('<script>alert'), 'Nenhum script raw pode estar no DOM');
    assert.ok(modal.innerHTML.includes('&lt;script&gt;'), 'Tags script devem estar devidamente escapadas');
});

console.log('\n====================================================================');
console.log(`  RESUMO DA SUÍTE: ${passedTests} / ${totalTests} testes aprovados (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('====================================================================');

if (passedTests === totalTests) {
    console.log('  ✅ TODOS OS TESTES DO BOLETIM DE EVOLUÇÃO FORAM APROVADOS COM SUCESSO!\n');
} else {
    process.exit(1);
}
