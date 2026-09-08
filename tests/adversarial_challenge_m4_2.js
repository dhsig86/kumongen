#!/usr/bin/env node
/**
 * ============================================================================
 * KumonGen — Suíte de Testes Adversariais Empíricos (Challenger M4-2)
 * Arquivo: tests/adversarial_challenge_m4_2.js
 * ============================================================================
 * 
 * Desafios Adversariais:
 *  1. Hammering em Erro (Submissão rápida repetida sem travar digitação)
 *  2. Disparos Acelerados de Streak Sparks (Cancelamento de rAF concorrentes & Limpeza de Canvas)
 *  3. Dica Progressiva Determinística (1º erro sem dica, 2º erro ativa .hint-glow-pulse, 3º erro idempotente no DOM, limpeza no acerto)
 * ============================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { performance } = require('perf_hooks');

const PROJECT_ROOT = path.resolve(__dirname, '..');

// Utilitários de terminal
const c = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m'
};

// ============================================================================
// EMULAÇÃO DO DOM PARA AMBIENTE NODE.JS
// ============================================================================

class MockClassList {
    constructor(classes = []) {
        this._set = new Set(classes.filter(Boolean));
    }
    add(...cls) {
        for (const c of cls) {
            if (c) {
                c.split(/\s+/).forEach(x => { if (x) this._set.add(x); });
            }
        }
    }
    remove(...cls) {
        for (const c of cls) {
            if (c) {
                c.split(/\s+/).forEach(x => { if (x) this._set.delete(x); });
            }
        }
    }
    contains(c) {
        return this._set.has(c);
    }
    toggle(c) {
        if (this.contains(c)) { this.remove(c); return false; }
        this.add(c); return true;
    }
    get length() {
        return this._set.size;
    }
    toString() {
        return Array.from(this._set).join(' ');
    }
}

class MockElement {
    constructor(tagName, id = '') {
        this.tagName = tagName.toUpperCase();
        this.id = id;
        this.classList = new MockClassList();
        this.style = {};
        this.children = [];
        this.parentElement = null;
        this._innerText = '';
        this._innerHTML = '';
        this.attributes = {};
    }

    get innerText() {
        return this._innerText;
    }
    set innerText(val) {
        this._innerText = String(val);
        this._innerHTML = String(val);
    }

    get innerHTML() {
        return this._innerHTML;
    }
    set innerHTML(html) {
        this._innerHTML = String(html);
        this.children = [];
    }

    appendChild(child) {
        child.parentElement = this;
        this.children.push(child);
        return child;
    }

    removeChild(child) {
        const idx = this.children.indexOf(child);
        if (idx !== -1) {
            this.children.splice(idx, 1);
            child.parentElement = null;
        }
        return child;
    }

    querySelector(sel) {
        const queue = [...this.children];
        while (queue.length > 0) {
            const el = queue.shift();
            if (matchesSimple(el, sel)) return el;
            queue.push(...el.children);
        }
        return null;
    }

    querySelectorAll(sel) {
        const matches = [];
        const queue = [...this.children];
        while (queue.length > 0) {
            const el = queue.shift();
            if (matchesSimple(el, sel)) matches.push(el);
            queue.push(...el.children);
        }
        return matches;
    }

    getBoundingClientRect() {
        return { top: 100, left: 100, width: 400, height: 300, right: 500, bottom: 400 };
    }

    getAttribute(name) {
        return this.attributes[name] !== undefined ? this.attributes[name] : null;
    }

    setAttribute(name, val) {
        this.attributes[name] = String(val);
    }

    removeAttribute(name) {
        delete this.attributes[name];
    }

    addEventListener(evt, fn) {
        if (!this._listeners) this._listeners = {};
        if (!this._listeners[evt]) this._listeners[evt] = [];
        this._listeners[evt].push(fn);
    }

    removeEventListener(evt, fn) {
        if (!this._listeners || !this._listeners[evt]) return;
        this._listeners[evt] = this._listeners[evt].filter(f => f !== fn);
    }
}

function matchesSimple(el, sel) {
    if (!sel || !el) return false;
    if (sel.startsWith('#')) return el.id === sel.slice(1);
    if (sel.startsWith('.')) {
        const parts = sel.split('.').filter(Boolean);
        return parts.every(p => el.classList.contains(p));
    }
    return el.tagName.toLowerCase() === sel.toLowerCase();
}

class MockDocument {
    constructor() {
        this._elementsById = new Map();
        this.body = new MockElement('body', 'body');
    }

    createElement(tag) {
        return new MockElement(tag);
    }

    getElementById(id) {
        return this._elementsById.get(id) || null;
    }

    registerElement(el) {
        if (el.id) {
            this._elementsById.set(el.id, el);
        }
        return el;
    }

    querySelector(sel) {
        if (sel.startsWith('#')) {
            return this.getElementById(sel.slice(1));
        }
        return this.body.querySelector(sel);
    }

    querySelectorAll(sel) {
        return this.body.querySelectorAll(sel);
    }

    addEventListener(evt, fn) {
        if (!this._listeners) this._listeners = {};
        if (!this._listeners[evt]) this._listeners[evt] = [];
        this._listeners[evt].push(fn);
    }

    removeEventListener(evt, fn) {
        if (!this._listeners || !this._listeners[evt]) return;
        this._listeners[evt] = this._listeners[evt].filter(f => f !== fn);
    }
}

class MockCanvasContext2D {
    constructor(canvas) {
        this.canvas = canvas;
        this.clearRectCalls = [];
        this.drawStarCalls = 0;
        this.arcCalls = 0;
        this.fillCalls = 0;
        this.saveCalls = 0;
        this.restoreCalls = 0;
    }
    clearRect(x, y, w, h) {
        this.clearRectCalls.push({ x, y, w, h, timestamp: performance.now() });
    }
    beginPath() {}
    moveTo() {}
    lineTo() {}
    closePath() {}
    arc() { this.arcCalls++; }
    fill() { this.fillCalls++; }
    save() { this.saveCalls++; }
    restore() { this.restoreCalls++; }
}

function buildTestEnvironment() {
    const doc = new MockDocument();

    const requiredIds = [
        'activeAnswerBox',
        'focusCard',
        'focusCardContainer',
        'exerciseArea',
        'cardFeedbackMsg',
        'confettiCanvas',
        'concreteMathPanel',
        'toggleConcreteAidBtn',
        'concreteQuantityGrid',
        'keypadWrapper',
        'numericKeypad',
        'roundProgressBar',
        'roundProgressText',
        'gauntletModal',
        'roundFinishedModal',
        'mascotCompanion',
        'mascotSpeech',
        'studentProfileManagerModal'
    ];

    requiredIds.forEach(id => {
        const tag = (id === 'confettiCanvas') ? 'canvas' : (id.includes('Btn') ? 'button' : 'div');
        const el = new MockElement(tag, id);
        doc.registerElement(el);
        doc.body.appendChild(el);
    });

    const canvas = doc.getElementById('confettiCanvas');
    const mockCtx = new MockCanvasContext2D(canvas);
    canvas.getContext = (type) => (type === '2d' ? mockCtx : null);

    let nextRafId = 1;
    const activeRafs = new Map();
    const cancelledRafs = [];

    const mockRequestAnimationFrame = (cb) => {
        const id = nextRafId++;
        activeRafs.set(id, cb);
        return id;
    };

    const mockCancelAnimationFrame = (id) => {
        if (activeRafs.has(id)) {
            cancelledRafs.push(id);
            activeRafs.delete(id);
        }
    };

    const windowMock = {
        document: doc,
        innerWidth: 1024,
        innerHeight: 768,
        requestAnimationFrame: mockRequestAnimationFrame,
        cancelAnimationFrame: mockCancelAnimationFrame,
        speechSynthesis: {
            cancel: () => {},
            speak: () => {}
        },
        AudioContext: function() {
            return {
                createGain: () => ({ connect: () => {}, gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } }),
                createOscillator: () => ({ connect: () => {}, start: () => {}, stop: () => {}, type: 'sine', frequency: { setValueAtTime: () => {} } }),
                currentTime: 0,
                destination: {}
            };
        },
        localStorage: {
            _store: {},
            getItem(k) { return this._store[k] || null; },
            setItem(k, v) { this._store[k] = String(v); },
            removeItem(k) { delete this._store[k]; },
            clear() { this._store = {}; }
        }
    };

    return {
        document: doc,
        window: windowMock,
        activeRafs,
        cancelledRafs,
        mockCtx
    };
}

function createSandbox(env) {
    const sandbox = {
        window: env.window,
        document: env.document,
        console,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        requestAnimationFrame: env.window.requestAnimationFrame,
        cancelAnimationFrame: env.window.cancelAnimationFrame,
        performance,
        localStorage: env.window.localStorage,
        speechSynthesis: env.window.speechSynthesis,
        URLSearchParams,
        parseInt,
        parseFloat,
        isNaN,
        isFinite,
        JSON,
        Array,
        Object,
        String,
        Number,
        Set,
        Map,
        location: { search: '', href: 'tablet.html', pathname: '/tablet.html' },
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true
    };
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    return sandbox;
}

// Execução da suíte
async function runAdversarialChallenges() {
    console.log(`${c.bold}${c.cyan}====================================================================${c.reset}`);
    console.log(`${c.bold}  KUMONGEN · DESAFIOS ADVERSARIAIS EMPÍRICOS (CHALLENGER M4-2)     ${c.reset}`);
    console.log(`${c.bold}${c.cyan}====================================================================${c.reset}\n`);

    const results = {
        total: 0,
        passed: 0,
        failed: 0,
        challenges: []
    };

    function assert(challenge, description, condition, detail = '') {
        results.total++;
        const p = Boolean(condition);
        if (p) results.passed++;
        else results.failed++;

        challenge.assertions.push({ description, passed: p, detail });
        console.log(`  ${p ? c.green + '✔ PASS' : c.red + '✖ FAIL'}${c.reset}: ${description} ${detail ? c.dim + '(' + detail + ')' + c.reset : ''}`);
        return p;
    }

    // Carrega código do tablet-player.js
    const tabletCode = fs.readFileSync(path.join(PROJECT_ROOT, 'tablet-player.js'), 'utf8');

    // ------------------------------------------------------------------------
    // DESAFIO 1: Hammering em Erro (Submissão rápida repetida sem bloquear digitação)
    // ------------------------------------------------------------------------
    console.log(`${c.bold}[DESAFIO 1] Hammering Intenso em Erro (Zero Trava na Digitação)${c.reset}`);
    const c1 = { name: 'Hammering em Erro', assertions: [] };

    {
        const env = buildTestEnvironment();
        const sandbox = createSandbox(env);

        // Define mock KumonSubjects
        sandbox.KumonSubjects = {
            matematica: {
                levels: [{ id: 'm1', name: 'Nível M1' }],
                generate: () => [
                    { type: 'math', operand1: 2, operator: '+', operand2: 3, expected: 5, options: [3, 4, 5, 6] },
                    { type: 'math', operand1: 4, operator: '+', operand2: 1, expected: 5, options: [2, 3, 5, 7] }
                ]
            }
        };
        sandbox.window.KumonSubjects = sandbox.KumonSubjects;

        vm.runInContext(tabletCode, sandbox);

        const TabletPlayer = sandbox.TabletPlayer;
        const Session = TabletPlayer.Session;

        // Inicia rodada
        Session.subjectKey = 'matematica';
        Session.levelId = 'm1';
        TabletPlayer.startRound();

        assert(c1, 'Sessão inicializada na questão 0', Session.currentIndex === 0);
        assert(c1, 'Session.isTransitionLocked inicia false', Session.isTransitionLocked === false);

        // Dispara 60 erros consecutivos em hammering ultra-rápido
        let lockedCount = 0;
        let uncaughtErrors = 0;
        const hammerRuns = 60;

        for (let i = 0; i < hammerRuns; i++) {
            try {
                // Digita uma resposta errada '9'
                Session.currentInput = '9';
                // Chama registerWrong
                TabletPlayer.registerWrong(null);

                if (Session.isTransitionLocked) {
                    lockedCount++;
                }

                // Digitação imediata pós-erro sem aguardar timer
                TabletPlayer.handleKeypadPress('4');
                // Verifica se currentInput registrou '4'
                if (Session.currentInput !== '4') {
                    uncaughtErrors++;
                }
            } catch (err) {
                uncaughtErrors++;
            }
        }

        assert(c1, 'Session.isTransitionLocked permaneceu FALSE em 100% dos 60 erros em hammering', lockedCount === 0, `travas detectadas=${lockedCount}`);
        assert(c1, 'Digitação subsequente imediata funcionou em todos os ciclos (Session.currentInput aceitou dígitos)', uncaughtErrors === 0, `erros=${uncaughtErrors}`);
        assert(c1, 'Índice da questão permaneceu 0 (não pulou questão com erros repetidos)', Session.currentIndex === 0, `currentIndex=${Session.currentIndex}`);
        assert(c1, 'currentAttempts contabilizou as tentativas de erro', Session.currentAttempts === hammerRuns, `currentAttempts=${Session.currentAttempts}`);
        
        // Agora faz um acerto correto para verificar que o lock só ativa no acerto
        TabletPlayer.registerSuccess(null);
        assert(c1, 'Após registerSuccess, isTransitionLocked torna-se TRUE', Session.isTransitionLocked === true);

        // Hammering enquanto travado no acerto NÃO deve registrar novos inputs
        const inputDuringLock = Session.currentInput;
        TabletPlayer.handleKeypadPress('8');
        assert(c1, 'Enquanto travado na transição de acerto, novas digitações são ignoradas', Session.currentInput === inputDuringLock, `currentInput=${Session.currentInput}, esperado=${inputDuringLock}`);

        clearInterval(Session.timerInterval);
    }
    results.challenges.push(c1);
    console.log();

    // ------------------------------------------------------------------------
    // DESAFIO 2: Streak Sparks Acelerado (Cancelamento de rAF Concorrentes & Sem Leak)
    // ------------------------------------------------------------------------
    console.log(`${c.bold}[DESAFIO 2] Streak Sparks em Múltiplos de 3 (Cancelamento de rAF & Canvas Limpo)${c.reset}`);
    const c2 = { name: 'Streak Sparks Concorrência & Canvas', assertions: [] };

    {
        const env = buildTestEnvironment();
        const sandbox = createSandbox(env);

        sandbox.KumonSubjects = {
            matematica: {
                levels: [{ id: 'm1', name: 'Nível M1' }],
                generate: () => [
                    { type: 'math', operand1: 1, operator: '+', operand2: 1, expected: 2 },
                    { type: 'math', operand1: 2, operator: '+', operand2: 2, expected: 4 },
                    { type: 'math', operand1: 3, operator: '+', operand2: 3, expected: 6 },
                    { type: 'math', operand1: 4, operator: '+', operand2: 4, expected: 8 }
                ]
            }
        };
        sandbox.window.KumonSubjects = sandbox.KumonSubjects;

        vm.runInContext(tabletCode, sandbox);

        const TabletPlayer = sandbox.TabletPlayer;
        const canvas = env.document.getElementById('confettiCanvas');
        const ctx = canvas.getContext('2d');

        // Teste de disparo direto de launchStreakSparks em rajada
        const burstCount = 15;
        for (let s = 3; s <= 3 + burstCount * 3; s += 3) {
            TabletPlayer.launchStreakSparks(s);
        }

        assert(c2, 'cancelAnimationFrame foi chamado para anular animações concorrentes', env.cancelledRafs.length >= burstCount - 1, `cancelamentos=${env.cancelledRafs.length}`);
        assert(c2, 'Apenas 1 frame de rAF ativo após a rajada de chamadas', env.activeRafs.size === 1, `frames ativos=${env.activeRafs.size}`);
        assert(c2, 'clearRect foi chamado para limpar o canvas entre invocações', ctx.clearRectCalls.length >= burstCount, `clearRect chamadas=${ctx.clearRectCalls.length}`);

        // Simula execução dos frames até a conclusão da animação atual
        let steps = 0;
        const maxSteps = 100;
        let simTime = performance.now();

        while (env.activeRafs.size > 0 && steps < maxSteps) {
            steps++;
            simTime += 20; // 50fps
            const entries = Array.from(env.activeRafs.entries());
            // Limpa antes de chamar cb para emular o browser
            for (const [id, cb] of entries) {
                env.activeRafs.delete(id);
                cb(simTime);
            }
        }

        assert(c2, 'Animação de faíscas conclui naturalmente em < 1s sem loop infinito', steps < maxSteps, `passos executados=${steps}`);
        assert(c2, 'Ao final da animação, activeRafs é 0 (sem rAF órfão)', env.activeRafs.size === 0, `ativos=${env.activeRafs.size}`);
        assert(c2, '_streakSparkRafId é resetado para null', TabletPlayer._streakSparkRafId === null, `_streakSparkRafId=${TabletPlayer._streakSparkRafId}`);
        assert(c2, 'Canvas é completamente limpo no término', ctx.clearRectCalls.length > 0);
    }
    results.challenges.push(c2);
    console.log();

    // ------------------------------------------------------------------------
    // DESAFIO 3: Dica Progressiva Determinística (1º erro, 2º erro, 3º erro idempotente)
    // ------------------------------------------------------------------------
    console.log(`${c.bold}[DESAFIO 3] Dica Progressiva: 2º Erro Ativação, 3º Erro Idempotência & Reset no Acerto${c.reset}`);
    const c3 = { name: 'Dica Progressiva Determinística', assertions: [] };

    {
        const env = buildTestEnvironment();
        const sandbox = createSandbox(env);

        sandbox.KumonSubjects = {
            matematica: {
                levels: [{ id: 'm1', name: 'Nível M1' }],
                generate: () => [
                    { type: 'math', operand1: 3, operator: '+', operand2: 2, expected: 5 },
                    { type: 'math', operand1: 4, operator: '+', operand2: 3, expected: 7 }
                ]
            }
        };
        sandbox.window.KumonSubjects = sandbox.KumonSubjects;

        vm.runInContext(tabletCode, sandbox);

        const TabletPlayer = sandbox.TabletPlayer;
        const Session = TabletPlayer.Session;
        const answerBox = env.document.getElementById('activeAnswerBox');
        const feedbackMsg = env.document.getElementById('cardFeedbackMsg');
        const concreteMathPanel = env.document.getElementById('concreteMathPanel');

        // Configura concreteMathPanel como oculto inicialmente
        concreteMathPanel.classList.add('hidden');

        Session.subjectKey = 'matematica';
        Session.levelId = 'm1';
        TabletPlayer.startRound();

        // 1º Erro: NÃO deve aplicar a dica progressiva
        TabletPlayer.registerWrong(null);
        assert(c3, '1º Erro: Session.currentAttempts é 1', Session.currentAttempts === 1);
        assert(c3, '1º Erro: answerBox NÃO possui hint-glow-pulse', !answerBox.classList.contains('hint-glow-pulse'));
        assert(c3, '1º Erro: feedbackMsg contém mensagem de incentivo (não a dica)', feedbackMsg.innerText.includes('Quase lá'));

        // 2º Erro Consecutivo na MESMA questão: DEVE ativar dica progressiva
        TabletPlayer.registerWrong(null);
        assert(c3, '2º Erro: Session.currentAttempts é 2', Session.currentAttempts === 2);
        assert(c3, '2º Erro: answerBox DEVE ter a classe .hint-glow-pulse', answerBox.classList.contains('hint-glow-pulse'));
        assert(c3, '2º Erro: feedbackMsg DEVE exibir texto de dica (💡 Dica:)', feedbackMsg.innerText.includes('💡 Dica:'));
        assert(c3, '2º Erro: concreteMathPanel teve a classe hidden removida e virou flex', !concreteMathPanel.classList.contains('hidden') && concreteMathPanel.classList.contains('flex'));
        assert(c3, '2º Erro: concreteMathPanel recebeu o anel âmbar (ring-amber-300)', concreteMathPanel.classList.contains('ring-amber-300'));

        // 3º Erro Consecutivo na MESMA questão: IDEMPOTÊNCIA (não pode quebrar DOM nem duplicar)
        const initialClassesCount = answerBox.classList.length;
        TabletPlayer.registerWrong(null);
        assert(c3, '3º Erro: Session.currentAttempts é 3', Session.currentAttempts === 3);
        assert(c3, '3º Erro: answerBox mantém .hint-glow-pulse', answerBox.classList.contains('hint-glow-pulse'));
        assert(c3, '3º Erro: classList do answerBox é idempotente (sem classes duplicadas)', answerBox.classList.length === initialClassesCount, `tamanho=${answerBox.classList.length}`);
        assert(c3, '3º Erro: feedbackMsg mantém dica ativa', feedbackMsg.innerText.includes('💡 Dica:'));

        // Acerto subsequente: DEVE limpar .hint-glow-pulse
        TabletPlayer.registerSuccess(null);
        assert(c3, 'Acerto pós-dica: remove hint-glow-pulse de answerBox', !answerBox.classList.contains('hint-glow-pulse'));

        // Avanço para a próxima questão: currentAttempts zera e hint-glow-pulse permanece ausente
        Session.currentIndex = 1;
        TabletPlayer.renderCurrentQuestion();
        assert(c3, 'Nova questão: Session.currentAttempts reiniciado para 0', Session.currentAttempts === 0);
        assert(c3, 'Nova questão: answerBox sem hint-glow-pulse', !answerBox.classList.contains('hint-glow-pulse'));

        clearInterval(Session.timerInterval);
    }
    results.challenges.push(c3);
    console.log();

    // ------------------------------------------------------------------------
    // CONSOLIDAÇÃO FINAL
    // ------------------------------------------------------------------------
    console.log(`${c.bold}${c.cyan}====================================================================${c.reset}`);
    console.log(`${c.bold}  RESUMO DOS TESTES ADVERSARIAIS (CHALLENGER M4-2)${c.reset}`);
    console.log(`${c.bold}${c.cyan}====================================================================${c.reset}`);
    console.log(`  Total de Asserções Adversariais: ${c.bold}${results.total}${c.reset}`);
    console.log(`  Aprovados:                      ${c.green}${c.bold}${results.passed}${c.reset}`);
    console.log(`  Falhas:                         ${results.failed === 0 ? c.green : c.red}${c.bold}${results.failed}${c.reset}`);
    console.log(`  Status Final:                   ${results.failed === 0 ? c.green + c.bold + 'APROVADO (100%)' : c.red + c.bold + 'REPROVADO'}${c.reset}`);
    console.log(`${c.bold}${c.cyan}====================================================================${c.reset}\n`);

    if (results.failed > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runAdversarialChallenges().catch(err => {
    console.error('Erro fatal nos testes adversariais:', err);
    process.exit(1);
});
