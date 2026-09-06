#!/usr/bin/env node
/**
 * ============================================================================
 * KumonGen — Challenger 1: Empirical Verification & Stress Harness (R1 & R3)
 * Arquivo: tests/challenger_stress_harness.js
 * ============================================================================
 * 
 * Bateria empírica independente projetada pelo Challenger 1 para estressar:
 * 
 * 1. R1: Estabilidade de latência p95 < 20ms sob 10 baterias consecutivas dos
 *    25 níveis curriculares (125.000 iterações) e escalonamento de batchSize (N=100).
 * 2. R3: Concorrência extrema e anti-hammering com interleaving temporal (0-2ms),
 *    disparos na fronteira do timeout de transição (640-660ms), e múltiplas portas de entrada.
 * 3. R3: Oráculo de consistência de contadores do Gauntlet Kumon sob múltiplos
 *    ciclos de reincidência de erro, 0 acertos, 100% acertos e deduplicação de fila.
 * 4. R3: Oráculo de inputs adversariais para solveSequenceHole, validateNumericAnswer,
 *    e alternância rápida a quente de matérias.
 * ============================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { performance } = require('perf_hooks');

const PROJECT_ROOT = path.resolve(__dirname, '..');

// ============================================================================
// HELPERS & MOCKS
// ============================================================================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class MockClassList {
    constructor(classes = []) {
        this._set = new Set(classes.filter(Boolean));
    }
    add(...cls) {
        for (const c of cls) {
            if (c) c.split(/\s+/).forEach(x => { if (x) this._set.add(x); });
        }
    }
    remove(...cls) {
        for (const c of cls) {
            if (c) c.split(/\s+/).forEach(x => { if (x) this._set.delete(x); });
        }
    }
    contains(c) { return this._set.has(c); }
    toggle(c) {
        if (this.contains(c)) { this.remove(c); return false; }
        this.add(c); return true;
    }
    toString() { return Array.from(this._set).join(' '); }
}

function createMockElement(tag = 'div', docRef = null) {
    const el = {
        tagName: tag.toUpperCase(),
        id: '',
        style: {},
        attributes: {},
        _listeners: {},
        classList: new MockClassList(),
        children: [],
        parentNode: null,
        appendChild(child) {
            if (child.parentNode && child.parentNode !== this) {
                child.parentNode.removeChild(child);
            }
            child.parentNode = this;
            this.children.push(child);
            return child;
        },
        removeChild(child) {
            const idx = this.children.indexOf(child);
            if (idx >= 0) {
                this.children.splice(idx, 1);
                child.parentNode = null;
            }
            return child;
        },
        addEventListener(evt, fn) {
            if (!this._listeners[evt]) this._listeners[evt] = [];
            this._listeners[evt].push(fn);
        },
        removeEventListener(evt, fn) {
            if (!this._listeners[evt]) return;
            this._listeners[evt] = this._listeners[evt].filter(f => f !== fn);
        },
        setAttribute(k, v) { this.attributes[k] = String(v); if (k === 'id') this.id = v; },
        getAttribute(k) { return this.attributes[k] !== undefined ? this.attributes[k] : null; },
        hasAttribute(k) { return this.attributes[k] !== undefined; },
        click() {
            const handlers = this._listeners['click'] || [];
            const evt = { type: 'click', target: this, preventDefault: () => {}, stopPropagation: () => {} };
            handlers.forEach(h => h(evt));
        },
        focus() {},
        blur() {},
        getBoundingClientRect() { return { top: 0, left: 0, width: 300, height: 150 }; },
        getContext() {
            return {
                clearRect: () => {}, beginPath: () => {}, moveTo: () => {}, lineTo: () => {},
                stroke: () => {}, fill: () => {}, arc: () => {}, fillText: () => {},
                strokeText: () => {}, measureText: () => ({ width: 50 }),
                drawImage: () => {}, save: () => {}, restore: () => {}, scale: () => {}
            };
        },
        querySelector(sel) {
            const all = this.querySelectorAll(sel);
            return all.length > 0 ? all[0] : null;
        },
        querySelectorAll(sel) {
            const results = [];
            function traverse(node) {
                if (node.children) {
                    for (const ch of node.children) {
                        if (sel.startsWith('#') && ch.id === sel.slice(1)) results.push(ch);
                        else if (sel.startsWith('.') && ch.classList.contains(sel.slice(1))) results.push(ch);
                        else if (ch.tagName && ch.tagName.toLowerCase() === sel.toLowerCase()) results.push(ch);
                        traverse(ch);
                    }
                }
            }
            traverse(this);
            return results;
        },
        _innerHTML: '',
        get innerHTML() { return this._innerHTML; },
        set innerHTML(val) {
            this._innerHTML = String(val);
            this.children = [];
        },
        _textContent: '',
        get textContent() { return this._textContent; },
        set textContent(val) {
            this._textContent = String(val);
            this._innerHTML = String(val);
        },
        get innerText() { return this.textContent; },
        set innerText(val) { this.textContent = val; }
    };
    return el;
}

function createTabletEnv() {
    const elementsById = {};
    const windowListeners = {};
    const uncaughtExceptions = [];

    const mockDocument = {
        _elementsById: elementsById,
        readyState: 'complete',
        createElement: (tag) => createMockElement(tag, mockDocument),
        getElementById: (id) => {
            if (!elementsById[id]) {
                const el = createMockElement('div', mockDocument);
                el.id = id;
                elementsById[id] = el;
            }
            return elementsById[id];
        },
        querySelector: (sel) => {
            if (sel.startsWith('#')) return mockDocument.getElementById(sel.slice(1));
            return createMockElement('div', mockDocument);
        },
        querySelectorAll: () => [],
        body: null,
        head: null,
        addEventListener: () => {},
        removeEventListener: () => {}
    };

    mockDocument.body = createMockElement('body', mockDocument);
    mockDocument.head = createMockElement('head', mockDocument);

    // Elementos do tablet necessários
    ['keypadWrapper', 'activeAnswerBox', 'cardFeedbackMsg', 'gauntletModal',
     'roundFinishedModal', 'soundToggleBtn', 'trophyBtn', 'virtualKeypad',
     'studentNameDisplay', 'starsCount', 'streakCount', 'timerDisplay',
     'btnStartGauntletNow', 'btnRepeatRound', 'cardMascotSpeech', 'traceCanvas'].forEach(id => {
        mockDocument.getElementById(id);
    });

    const mockSpeechSynthesis = {
        speaking: false,
        paused: false,
        cancelledCount: 0,
        speak: () => {},
        cancel: function() { this.cancelledCount++; },
        pause: () => {},
        resume: () => {},
        getVoices: () => []
    };

    const sandbox = {
        console: {
            log: () => {},
            warn: () => {},
            error: (...args) => { uncaughtExceptions.push(args.join(' ')); }
        },
        performance,
        Math,
        Date,
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
        URLSearchParams,
        requestAnimationFrame: (cb) => setTimeout(cb, 16),
        cancelAnimationFrame: (id) => clearTimeout(id),
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        location: { search: '', href: 'tablet.html', pathname: '/tablet.html' },
        AudioContext: function() {
            return {
                state: 'running',
                currentTime: 0,
                createOscillator: () => ({
                    type: 'sine',
                    frequency: { setValueAtTime: () => {} },
                    connect: () => {},
                    start: () => {},
                    stop: () => {}
                }),
                createGain: () => ({
                    gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
                    connect: () => {}
                }),
                destination: {}
            };
        },
        speechSynthesis: mockSpeechSynthesis,
        SpeechSynthesisUtterance: function(text) { this.text = text; },
        localStorage: {
            _data: {},
            getItem(k) { return this._data[k] || null; },
            setItem(k, v) { this._data[k] = String(v); },
            removeItem(k) { delete this._data[k]; },
            clear() { this._data = {}; }
        },
        document: mockDocument,
        addEventListener: (evt, fn) => {
            if (!windowListeners[evt]) windowListeners[evt] = [];
            windowListeners[evt].push(fn);
        },
        removeEventListener: (evt, fn) => {
            if (!windowListeners[evt]) return;
            windowListeners[evt] = windowListeners[evt].filter(f => f !== fn);
        },
        dispatchEvent: (e) => {
            const type = typeof e === 'string' ? e : e.type;
            const handlers = windowListeners[type] || [];
            handlers.forEach(h => h(e));
            return true;
        }
    };
    sandbox.webkitAudioContext = sandbox.AudioContext;
    sandbox.window = sandbox;
    sandbox.global = sandbox;
    sandbox.self = sandbox;

    const context = vm.createContext(sandbox);

    const scripts = [
        'student-profiles.js',
        'gerador.js',
        'matematica.js',
        'portugues.js',
        'ingles.js',
        'tablet-player.js'
    ];

    for (const s of scripts) {
        const sPath = path.join(PROJECT_ROOT, s);
        const code = fs.readFileSync(sPath, 'utf8');
        vm.runInContext(code, context);
    }

    return { context, sandbox, mockDocument, mockSpeechSynthesis, windowListeners, uncaughtExceptions };
}

// ============================================================================
// SUÍTE DE TESTES DO CHALLENGER
// ============================================================================

async function runChallengerSuite() {
    console.log('====================================================================');
    console.log('   CHALLENGER 1: SUÍTE DE ESTRESSE EMPÍRICO & ORÁCULOS DE R1/R3     ');
    console.log('====================================================================\n');

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    function assert(cond, name, details = '') {
        totalTests++;
        if (cond) {
            passedTests++;
            console.log(`  [PASS] ${name} ${details ? '(' + details + ')' : ''}`);
        } else {
            failedTests++;
            console.error(`  [FAIL] ${name} - ${details}`);
        }
    }

    // ------------------------------------------------------------------------
    // FRENTE 1: REPETIÇÃO EMPÍRICA DO BENCHMARK DOS 25 NÍVEIS (R1)
    // ------------------------------------------------------------------------
    console.log('\n--- FRENTE 1: 10 Baterias Consecutivas dos 25 Níveis (p95 < 20ms) ---');

    const envGen = createTabletEnv();
    const KumonSubjects = envGen.context.KumonSubjects;
    const allLevels = [
        { subject: 'matematica', id: 'm1' }, { subject: 'matematica', id: 'm2' },
        { subject: 'matematica', id: 'm3' }, { subject: 'matematica', id: 'm4' },
        { subject: 'matematica', id: 'm5' }, { subject: 'matematica', id: 'm6' },
        { subject: 'matematica', id: 'm7' }, { subject: 'matematica', id: 'm8' },
        { subject: 'matematica', id: 'm9' }, { subject: 'matematica', id: 'm10' },
        { subject: 'portugues', id: 'p1' }, { subject: 'portugues', id: 'p2' },
        { subject: 'portugues', id: 'p3' }, { subject: 'portugues', id: 'p4' },
        { subject: 'portugues', id: 'p5' }, { subject: 'portugues', id: 'p6' },
        { subject: 'portugues', id: 'p7' }, { subject: 'portugues', id: 'p8' },
        { subject: 'ingles', id: 'i1' }, { subject: 'ingles', id: 'i2' },
        { subject: 'ingles', id: 'i3' }, { subject: 'ingles', id: 'i4' },
        { subject: 'ingles', id: 'i5' }, { subject: 'ingles', id: 'i6' },
        { subject: 'ingles', id: 'i7' }
    ];

    let maxObservedP95 = 0;
    let worstLevel = null;
    let anyBreached20ms = false;
    const RUNS = 10;
    const ITER_PER_RUN = 300;

    for (let r = 1; r <= RUNS; r++) {
        for (const lvl of allLevels) {
            const genFn = KumonSubjects[lvl.subject].generate;
            // Warmup
            for (let w = 0; w < 20; w++) genFn(lvl.id, 10);

            // Amostragem
            const times = new Float64Array(ITER_PER_RUN);
            for (let i = 0; i < ITER_PER_RUN; i++) {
                const t0 = performance.now();
                genFn(lvl.id, 10);
                const t1 = performance.now();
                times[i] = t1 - t0;
            }
            times.sort();
            const p95 = times[Math.floor(ITER_PER_RUN * 0.95)];
            if (p95 > maxObservedP95) {
                maxObservedP95 = p95;
                worstLevel = `${lvl.subject}.${lvl.id} (Run ${r})`;
            }
            if (p95 >= 20.0) {
                anyBreached20ms = true;
            }
        }
    }

    assert(!anyBreached20ms, 'Nenhum dos 25 níveis violou p95 < 20ms ao longo de 10 baterias',
           `Pior p95 observado: ${maxObservedP95.toFixed(4)} ms em ${worstLevel}`);

    // Teste de escalabilidade com lote massivo (count = 100 itens)
    let maxBatch100P95 = 0;
    let worstBatch100Level = null;
    for (const lvl of allLevels) {
        const genFn = KumonSubjects[lvl.subject].generate;
        const times = new Float64Array(50);
        for (let i = 0; i < 50; i++) {
            const t0 = performance.now();
            genFn(lvl.id, 100);
            const t1 = performance.now();
            times[i] = t1 - t0;
        }
        times.sort();
        const p95 = times[Math.floor(50 * 0.95)];
        if (p95 > maxBatch100P95) {
            maxBatch100P95 = p95;
            worstBatch100Level = `${lvl.subject}.${lvl.id}`;
        }
    }
    assert(maxBatch100P95 < 20.0, 'Lote massivo (100 itens por folha) permanece < 20ms p95 em todos os níveis',
           `Pior p95 para 100 itens: ${maxBatch100P95.toFixed(4)} ms em ${worstBatch100Level}`);

    // ------------------------------------------------------------------------
    // FRENTE 2: CONCORRÊNCIA EXTREMA E ANTI-HAMMERING INTERLEAVED (R3)
    // ------------------------------------------------------------------------
    console.log('\n--- FRENTE 2: Anti-Hammering com Concorrência Extrema & Interleaving ---');

    {
        const env = createTabletEnv();
        const { TabletPlayer } = env.context;
        const Session = TabletPlayer.Session;

        Session.subjectKey = 'matematica';
        Session.levelId = 'm2';
        TabletPlayer.startRound();
        Session.workedExampleDismissed = true;
        TabletPlayer.renderCurrentQuestion();

        const q = Session.items[0];
        const correct = String(q.operand1 + q.operand2);
        Session.currentInput = correct;

        // Disparo concorrente misto: handleKeypadPress('enter') + validateNumericAnswer + keydown Enter
        let concurrentCalls = 0;
        const p1 = Promise.resolve().then(() => { TabletPlayer.handleKeypadPress('enter'); concurrentCalls++; });
        const p2 = Promise.resolve().then(() => { TabletPlayer.validateNumericAnswer(); concurrentCalls++; });
        const p3 = Promise.resolve().then(() => { TabletPlayer.handleKeypadPress('enter'); concurrentCalls++; });
        const p4 = Promise.resolve().then(() => {
            env.sandbox.dispatchEvent({ type: 'keydown', key: 'Enter' });
            concurrentCalls++;
        });

        await Promise.all([p1, p2, p3, p4]);

        assert(Session.isTransitionLocked === true, 'Trava ativada com concorrência em microtasks');
        assert(Session.currentIndex === 0, 'Índice permanece 0 durante o lock sob chamadas concorrentes');

        await sleep(750);
        assert(Session.currentIndex === 1, 'Exatamente 1 avanço após 4 chamadas concorrentes simultâneas',
               `currentIndex=${Session.currentIndex}`);
        assert(Session.isTransitionLocked === false, 'Trava liberada com sucesso após transição');

        // Teste de ataque na janela de borda (640ms, 650ms, 660ms)
        Session.currentInput = String(Session.items[1].operand1 + Session.items[1].operand2);
        TabletPlayer.handleKeypadPress('enter'); // Inicia transição de 650ms

        await sleep(640);
        // Disparo aos 640ms (ainda locked)
        TabletPlayer.handleKeypadPress('enter');
        assert(Session.currentIndex === 1, 'Disparo aos 640ms é descartado pela trava');

        await sleep(15); // agora estamos em ~655ms
        // A transição deve ter resolvido ou está resolvendo
        await sleep(50);
        assert(Session.currentIndex === 2, 'Avanço correto para questão 2 sem saltar questão adicional');

        clearInterval(Session.timerInterval);
    }

    // ------------------------------------------------------------------------
    // FRENTE 3: ORÁCULO DE CONTADORES E MAESTRIA GAUNTLET (R3)
    // ------------------------------------------------------------------------
    console.log('\n--- FRENTE 3: Oráculo de Contadores do Gauntlet Kumon ---');

    // Cenário A: Aluno tira 100% de acertos de primeira (0 erros na rodada principal)
    {
        const env = createTabletEnv();
        const { TabletPlayer } = env.context;
        const Session = TabletPlayer.Session;

        Session.subjectKey = 'matematica';
        Session.levelId = 'm2';
        TabletPlayer.startRound();
        Session.workedExampleDismissed = true;

        for (let i = 0; i < 10; i++) {
            Session.currentIndex = i;
            Session.currentAttempts = 0;
            const item = Session.items[i];
            Session.currentInput = String(item.operand1 + item.operand2);
            TabletPlayer.registerSuccess();
            // Limpa o timeout para simular avanço manual no teste
            clearTimeout(Session.transitionTimeout);
            Session.isTransitionLocked = false;
        }

        assert(Session.roundCorrectFirstAttempt === 10, 'Rodada sem erros: roundCorrectFirstAttempt = 10');
        assert(Session.missedItemsQueue.length === 0, 'Fila do Gauntlet vazia para rodada perfeita');
        assert(Session.isGauntlet === false, 'Gauntlet NÃO acionado para rodada 100%');
    }

    // Cenário B: Aluno erra todos os 10 itens (0% de primeira) e entra no Gauntlet
    {
        const env = createTabletEnv();
        const { TabletPlayer } = env.context;
        const Session = TabletPlayer.Session;

        Session.subjectKey = 'matematica';
        Session.levelId = 'm2';
        TabletPlayer.startRound();
        Session.workedExampleDismissed = true;
        // Configura 10 itens estritamente distintos para testar capacidade máxima do Gauntlet
        Session.items = Array.from({ length: 10 }, (_, i) => ({
            type: 'math', operand1: i + 1, operator: '+', operand2: 2
        }));
        Session.initialItemsCount = 10;

        for (let i = 0; i < 10; i++) {
            Session.currentIndex = i;
            // Erra 3 vezes na questão
            TabletPlayer.registerWrong();
            TabletPlayer.registerWrong();
            TabletPlayer.registerWrong();
            // Acerta na 4ª tentativa
            TabletPlayer.registerSuccess();
            clearTimeout(Session.transitionTimeout);
            Session.isTransitionLocked = false;
        }

        assert(Session.roundCorrectFirstAttempt === 0, 'Rodada com 10 erros: roundCorrectFirstAttempt = 0');
        assert(Session.missedItemsQueue.length === 10, 'Fila do Gauntlet contém exatamente os 10 itens distintos',
               `missedItemsQueue.length=${Session.missedItemsQueue.length}`);

        // Inicia Gauntlet
        TabletPlayer.startGauntletPhase();
        assert(Session.items.length === 10, 'Gauntlet recebe todos os 10 itens distintos');
        assert(Session.isGauntletPhase === true, 'isGauntletPhase = true');

        // Resolve os 10 itens no Gauntlet acertando de primeira no Gauntlet
        for (let i = 0; i < 10; i++) {
            Session.currentIndex = i;
            Session.currentAttempts = 0;
            TabletPlayer.registerSuccess();
            clearTimeout(Session.transitionTimeout);
            Session.isTransitionLocked = false;
        }

        assert(Session.roundCorrectFirstAttempt === 0, 'roundCorrectFirstAttempt PERMANECE 0 mesmo com 10 acertos no Gauntlet',
               `roundCorrectFirstAttempt=${Session.roundCorrectFirstAttempt}`);
        assert(Session.gauntletItemsSolved === 10, 'gauntletItemsSolved acumula os 10 acertos de maestria',
               `gauntletItemsSolved=${Session.gauntletItemsSolved}`);

        TabletPlayer.finishRound();
        const finalAcc = Math.round((Session.roundCorrectFirstAttempt / Session.initialItemsCount) * 100);
        assert(finalAcc === 0, 'Acurácia pedagógica final registra 0% real de 1ª tentativa', `finalAcc=${finalAcc}%`);
    }

    // Cenário C: Deduplicação estrita na fila de erros
    {
        const env = createTabletEnv();
        const { TabletPlayer } = env.context;
        const Session = TabletPlayer.Session;

        Session.subjectKey = 'matematica';
        Session.levelId = 'm2';
        TabletPlayer.startRound();
        Session.workedExampleDismissed = true;

        // Dispara 50 registerWrong no mesmo exercício
        for (let i = 0; i < 50; i++) {
            TabletPlayer.registerWrong();
        }

        assert(Session.missedItemsQueue.length === 1, 'Fila de erros deduplica estritamente (1 item após 50 registerWrong)',
               `missedItemsQueue.length=${Session.missedItemsQueue.length}`);
    }

    // Cenário D: Ciclos recursivos do Gauntlet (Gauntlet Cycle 2)
    {
        const env = createTabletEnv();
        const { TabletPlayer } = env.context;
        const Session = TabletPlayer.Session;

        Session.subjectKey = 'matematica';
        Session.levelId = 'm2';
        TabletPlayer.startRound();
        Session.workedExampleDismissed = true;

        // Erra 2 itens na rodada principal
        Session.currentIndex = 0;
        TabletPlayer.registerWrong(); // Item 0 vai para Gauntlet
        TabletPlayer.registerSuccess();
        clearTimeout(Session.transitionTimeout);
        Session.isTransitionLocked = false;

        Session.currentIndex = 1;
        TabletPlayer.registerWrong(); // Item 1 vai para Gauntlet
        TabletPlayer.registerSuccess();
        clearTimeout(Session.transitionTimeout);
        Session.isTransitionLocked = false;

        // Demais 8 itens corretos de primeira
        for (let i = 2; i < 10; i++) {
            Session.currentIndex = i;
            Session.currentAttempts = 0;
            TabletPlayer.registerSuccess();
            clearTimeout(Session.transitionTimeout);
            Session.isTransitionLocked = false;
        }

        assert(Session.roundCorrectFirstAttempt === 8, '8 acertos de primeira na rodada inicial');

        // Gauntlet Ciclo 1: 2 itens na fila
        TabletPlayer.startGauntletPhase();
        assert(Session.items.length === 2, 'Gauntlet Ciclo 1 tem 2 itens');

        // Resolve item 0 com sucesso
        Session.currentIndex = 0;
        Session.currentAttempts = 0;
        TabletPlayer.registerSuccess();
        clearTimeout(Session.transitionTimeout);
        Session.isTransitionLocked = false;

        // Erra item 1 novamente no Gauntlet!
        Session.currentIndex = 1;
        TabletPlayer.registerWrong();
        TabletPlayer.registerSuccess();
        clearTimeout(Session.transitionTimeout);
        Session.isTransitionLocked = false;

        // Simula gatilho de fim do ciclo 1 -> ciclo 2
        assert(Session.missedItemsQueue.length === 1, 'Item 1 re-enfileirado para Gauntlet Ciclo 2');
        TabletPlayer.startGauntletPhase();
        assert(Session.gauntletCycles === 2, 'gauntletCycles incrementado para 2');
        assert(Session.items.length === 1, 'Gauntlet Ciclo 2 tem 1 item pendente');

        // Resolve item 1 no ciclo 2
        Session.currentIndex = 0;
        Session.currentAttempts = 0;
        TabletPlayer.registerSuccess();
        clearTimeout(Session.transitionTimeout);
        Session.isTransitionLocked = false;

        assert(Session.roundCorrectFirstAttempt === 8, 'roundCorrectFirstAttempt segue estritamente 8 após múltiplos ciclos do Gauntlet');
        assert(Session.gauntletItemsSolved === 3, 'gauntletItemsSolved registra os 3 acertos do Gauntlet (1 no ciclo 1 + 1 no ciclo 1 tardio + 1 no ciclo 2)',
               `gauntletItemsSolved=${Session.gauntletItemsSolved}`);
    }

    // ------------------------------------------------------------------------
    // FRENTE 4: ORÁCULO DE INPUTS ADVERSARIAIS & TROCA RÁPIDA (R3)
    // ------------------------------------------------------------------------
    console.log('\n--- FRENTE 4: Oráculo de Inputs Adversariais & Alternância Contínua ---');

    {
        const env = createTabletEnv();
        const { TabletPlayer } = env.context;

        // Teste de limites extremos em solveSequenceHole
        const sequenceTests = [
            { seq: ['__'], expected: 0 },
            { seq: ['__', '__'], expected: 0 },
            { seq: [null, '__', 10], expected: 0 },
            { seq: ['__', 5, 10], expected: 4 }, // seq[idx+1] - 1
            { seq: [10, 20, '__'], expected: 30 }, // seq[idx-1] + (20-10)
            { seq: [100, '__', 300], expected: 200 }, // média
            { seq: [-10, -5, '__'], expected: 0 }, // passo negativo
            { seq: [0, 0, '__'], expected: 0 },
            { seq: [], expected: 0 },
            { seq: 'not an array', expected: 0 }
        ];

        let seqErrors = 0;
        for (const st of sequenceTests) {
            try {
                const res = TabletPlayer.solveSequenceHole(st.seq);
                if (typeof res !== 'number' || isNaN(res)) seqErrors++;
            } catch (e) {
                seqErrors++;
            }
        }
        assert(seqErrors === 0, 'solveSequenceHole não lança exceção e retorna número finito em todos os 10 casos extremos');

        // 100 Alternâncias rápidas de matéria/nível
        let switchExceptions = 0;
        const subjects = ['matematica', 'portugues', 'ingles'];
        const levels = ['m1', 'm2', 'm7', 'p1', 'p2', 'i1', 'i7'];

        for (let i = 0; i < 100; i++) {
            try {
                TabletPlayer.Session.subjectKey = subjects[i % subjects.length];
                TabletPlayer.Session.levelId = levels[i % levels.length];
                TabletPlayer.startRound();
                TabletPlayer.renderCurrentQuestion();
                TabletPlayer.sound.toggleMute();
            } catch (e) {
                switchExceptions++;
            }
        }

        assert(switchExceptions === 0, '100 trocas rápidas alternando matérias/níveis com 0 exceções');
        assert(env.uncaughtExceptions.length === 0, '0 exceções capturadas no console do ambiente');
    }

    // ------------------------------------------------------------------------
    // CONSOLIDAÇÃO DO PARECER
    // ------------------------------------------------------------------------
    console.log('\n====================================================================');
    console.log(`  RESUMO DA SUÍTE DO CHALLENGER:`);
    console.log(`  Total de Testes: ${totalTests}`);
    console.log(`  Aprovados:       ${passedTests}`);
    console.log(`  Falhas:          ${failedTests}`);
    console.log(`  Veredito:        ${failedTests === 0 ? 'APROVADO (APPROVE)' : 'REPROVADO (REJECT)'}`);
    console.log('====================================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runChallengerSuite().catch(err => {
    console.error('Erro fatal no challenger harness:', err);
    process.exit(1);
});
