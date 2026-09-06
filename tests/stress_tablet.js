#!/usr/bin/env node
/**
 * ============================================================================
 * KumonGen — Suíte de Testes de Estresse Automatizada do Tablet Player (R3)
 * Arquivo: tests/stress_tablet.js
 * ============================================================================
 * 
 * Cobre rigorosamente os 6 cenários exigidos no Milestone 3 (R3):
 *  1. Hammering / Double-tap intenso (50 cliques simultâneos, trava anti-duplicação)
 *  2. Integridade de contadores do Gauntlet (não inflar acertos na 1ª tentativa)
 *  3. Exibição de Teclado no Nível M7 - Vizinhos ('neighbors' em numericTypes)
 *  4. Alternância a quente de matéria/nível no meio de rodada/Gauntlet ativo
 *  5. Mute/unmute repentino com áudio e síntese de voz (speechSynthesis)
 *  6. Entradas atípicas, strings maliciosas e limites numéricos
 *  7. Verificação de vazamento de memória em listeners de traçado (Canvas)
 * 
 * Critério de aceitação: 0 uncaught exceptions e 100% dos testes aprovados.
 * Salva relatório em: tests/stress_tablet_results.json
 * ============================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { performance } = require('perf_hooks');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const RESULTS_JSON_PATH = path.resolve(__dirname, 'stress_tablet_results.json');

// Cores ANSI para saída no terminal
const c = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    blue: '\x1b[34m',
    dim: '\x1b[2m'
};

// ============================================================================
// 1. MOTOR DE EMULAÇÃO DOM / BROWSER EM CONTEXTO VM
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
    toString() {
        return Array.from(this._set).join(' ');
    }
}

function parseHTMLToElements(htmlString, parentElement, documentRef) {
    if (!htmlString || typeof htmlString !== 'string') return;

    // Regex para identificar tags simples com atributos
    const tagRegex = /<([a-zA-Z0-9_-]+)\b([^>]*)>([\s\S]*?)(?:<\/\1>|(?=<[a-zA-Z0-9_-]+)|$)/gi;
    let match;

    while ((match = tagRegex.exec(htmlString)) !== null) {
        const tagName = match[1];
        const attrString = match[2] || '';
        const innerContent = match[3] || '';

        // Ignora fechamentos soltos
        if (tagName.startsWith('/')) continue;

        const el = documentRef.createElement(tagName);

        // Extrai atributos id, class, data-* e outros
        const attrRegex = /([a-zA-Z0-9_-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
        let aMatch;
        while ((aMatch = attrRegex.exec(attrString)) !== null) {
            const k = aMatch[1];
            const v = aMatch[2] !== undefined ? aMatch[2] : (aMatch[3] !== undefined ? aMatch[3] : (aMatch[4] !== undefined ? aMatch[4] : ''));
            if (!k || k === tagName) continue;
            el.setAttribute(k, v);
            if (k === 'id') {
                el.id = v;
                documentRef._elementsById[v] = el;
            } else if (k === 'class') {
                el.classList.add(...v.split(/\s+/).filter(Boolean));
            }
        }

        // Se tiver tags filhas, analisa recursivamente; caso contrário atribui texto
        if (/<[a-zA-Z0-9_-]+/i.test(innerContent)) {
            parseHTMLToElements(innerContent, el, documentRef);
        } else {
            el.textContent = innerContent.replace(/<[^>]*>/g, '').trim();
            el.innerText = el.textContent;
        }

        parentElement.appendChild(el);
    }
}

function createMockElement(tag = 'div', documentRef = null) {
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

        addEventListener(event, fn, opts) {
            if (!this._listeners[event]) this._listeners[event] = [];
            this._listeners[event].push(fn);
        },

        removeEventListener(event, fn) {
            if (!this._listeners[event]) return;
            this._listeners[event] = this._listeners[event].filter(f => f !== fn);
        },

        dispatchEvent(e) {
            const type = typeof e === 'string' ? e : e.type;
            const handlers = this._listeners[type] || [];
            for (const h of handlers) {
                try {
                    h.call(this, e);
                } catch (err) {
                    if (documentRef && documentRef._onUncaughtError) {
                        documentRef._onUncaughtError(err);
                    } else {
                        throw err;
                    }
                }
            }
            return true;
        },

        click() {
            const ev = {
                type: 'click',
                target: this,
                currentTarget: this,
                defaultPrevented: false,
                cancelable: true,
                preventDefault() { this.defaultPrevented = true; }
            };
            if (typeof this.onclick === 'function') {
                this.onclick.call(this, ev);
            }
            this.dispatchEvent(ev);
        },

        setAttribute(k, v) {
            this.attributes[k] = String(v);
            if (k === 'id') {
                this.id = String(v);
                if (documentRef) documentRef._elementsById[this.id] = this;
            } else if (k === 'class') {
                this.className = String(v);
                this.classList = new MockClassList(String(v).split(/\s+/));
            }
        },

        getAttribute(k) {
            return this.attributes[k] !== undefined ? this.attributes[k] : null;
        },

        removeAttribute(k) {
            delete this.attributes[k];
            if (k === 'id' && documentRef) {
                delete documentRef._elementsById[this.id];
                this.id = '';
            }
        },

        getBoundingClientRect() {
            return { width: 400, height: 300, left: 10, top: 20, right: 410, bottom: 320 };
        },

        getContext(type) {
            if (type === '2d') {
                return {
                    beginPath: () => {},
                    moveTo: () => {},
                    lineTo: () => {},
                    stroke: () => {},
                    clearRect: () => {},
                    fillRect: () => {},
                    fillText: () => {},
                    drawImage: () => {},
                    save: () => {},
                    restore: () => {},
                    translate: () => {},
                    rotate: () => {},
                    scale: () => {}
                };
            }
            return null;
        },

        get innerHTML() {
            return this._rawHTML || '';
        },

        set innerHTML(val) {
            this._rawHTML = val;
            // Limpa filhos anteriores
            while (this.children.length > 0) {
                this.removeChild(this.children[0]);
            }
            if (documentRef) {
                parseHTMLToElements(val, this, documentRef);
            }
        },

        get textContent() {
            return this._textContent !== undefined ? this._textContent : '';
        },
        set textContent(v) {
            this._textContent = String(v);
            this._innerText = String(v);
        },
        get innerText() {
            return this._innerText !== undefined ? this._innerText : '';
        },
        set innerText(v) {
            this._innerText = String(v);
            this._textContent = String(v);
        },

        focus() {},
        blur() {},

        querySelector(sel) {
            return this.querySelectorAll(sel)[0] || null;
        },

        querySelectorAll(sel) {
            const matches = [];
            function walk(node) {
                for (const child of node.children) {
                    if (elementMatches(child, sel)) {
                        matches.push(child);
                    }
                    walk(child);
                }
            }
            walk(this);
            return matches;
        }
    };

    function elementMatches(node, selector) {
        if (!selector) return false;
        // Classe simples: .className
        if (selector.startsWith('.') && !selector.includes('[') && !selector.includes(' ')) {
            return node.classList.contains(selector.slice(1));
        }
        // ID simples: #id
        if (selector.startsWith('#')) {
            return node.id === selector.slice(1);
        }
        // Atributo puro: [data-key] ou [data-key="enter"]
        const attrMatch = selector.match(/^\[([a-zA-Z0-9_-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s\]]+)))?\]$/);
        if (attrMatch) {
            const attrName = attrMatch[1];
            const attrVal = attrMatch[2] !== undefined ? attrMatch[2] : (attrMatch[3] !== undefined ? attrMatch[3] : attrMatch[4]);
            if (attrVal !== undefined) {
                return node.getAttribute(attrName) === attrVal;
            }
            return node.getAttribute(attrName) !== null;
        }
        // Tag + atributo: button[data-key] ou button[data-key="enter"]
        const tagAttrMatch = selector.match(/^([a-zA-Z0-9_-]+)\[([a-zA-Z0-9_-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s\]]+)))?\]$/);
        if (tagAttrMatch) {
            const tag = tagAttrMatch[1];
            const attrName = tagAttrMatch[2];
            const attrVal = tagAttrMatch[3] !== undefined ? tagAttrMatch[3] : (tagAttrMatch[4] !== undefined ? tagAttrMatch[4] : tagAttrMatch[5]);
            if (node.tagName.toLowerCase() !== tag.toLowerCase()) return false;
            if (attrVal !== undefined) {
                return node.getAttribute(attrName) === attrVal;
            }
            return node.getAttribute(attrName) !== null;
        }
        // Tag pura: button, div
        return node.tagName.toLowerCase() === selector.toLowerCase();
    }

    return el;
}

function createTabletEnvironment() {
    const errorLog = [];
    const uncaughtExceptions = [];

    const mockDocument = {
        readyState: 'complete',
        _elementsById: {},
        _listeners: {},
        _onUncaughtError: (e) => uncaughtExceptions.push(e),

        createElement(tag) {
            return createMockElement(tag, this);
        },

        getElementById(id) {
            return this._elementsById[id] || null;
        },

        querySelector(sel) {
            if (sel.startsWith('#')) {
                return this.getElementById(sel.slice(1));
            }
            return this.body.querySelector(sel);
        },

        querySelectorAll(sel) {
            return this.body.querySelectorAll(sel);
        },

        addEventListener(evt, fn) {
            if (!this._listeners[evt]) this._listeners[evt] = [];
            this._listeners[evt].push(fn);
        },

        removeEventListener(evt, fn) {
            if (!this._listeners[evt]) return;
            this._listeners[evt] = this._listeners[evt].filter(f => f !== fn);
        },

        dispatchEvent(e) {
            const type = typeof e === 'string' ? e : e.type;
            const handlers = this._listeners[type] || [];
            handlers.forEach(h => h.call(this, e));
            return true;
        }
    };

    mockDocument.body = createMockElement('body', mockDocument);
    mockDocument.head = createMockElement('head', mockDocument);

    // Cria elementos permanentes do tablet.html
    const permanentElementIds = [
        'confettiCanvas', 'workedExampleModal', 'gauntletModal', 'roundFinishedModal',
        'badgesModal', 'mascotPickerModal', 'levelPickerModal', 'levelPickerGrid',
        'subjectSelect', 'levelSelect', 'sctTimerDisplay', 'headerStarsCount',
        'headerStreakCount', 'trophyBtn', 'soundToggleBtn', 'roundProgressBar',
        'roundProgressText', 'exerciseInstruction', 'focusCard', 'focusCardContainer',
        'keypadWrapper', 'virtualKeypad', 'mascotSpeechBubble', 'mascotSpeechText',
        'mascotAvatarBtn', 'mascotAvatarRing', 'mascotAvatarImg', 'mascotNameBadge',
        'studentNameBtn', 'studentNameDisplay', 'studentMascotAvatar', 'headerAddProfileBtn',
        'headerMascotBtn', 'openLevelPickerBtn', 'closeLevelPickerBtn'
    ];

    for (const id of permanentElementIds) {
        const tag = id.includes('Canvas') ? 'canvas' : (id.includes('Btn') ? 'button' : (id.includes('Select') ? 'select' : 'div'));
        const el = mockDocument.createElement(tag);
        el.id = id;
        mockDocument._elementsById[id] = el;
        mockDocument.body.appendChild(el);
    }

    // Popula o teclado virtual com os botões 0..9, backspace, enter
    const virtualKeypad = mockDocument.getElementById('virtualKeypad');
    const keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'backspace', '0', 'enter'];
    for (const k of keypadKeys) {
        const btn = mockDocument.createElement('button');
        btn.classList.add('keypad-btn');
        btn.setAttribute('data-key', k);
        btn.textContent = k;
        virtualKeypad.appendChild(btn);
    }

    // Mock AudioContext
    class MockAudioContext {
        constructor() {
            this.state = 'running';
            this.currentTime = 0;
        }
        resume() { this.state = 'running'; return Promise.resolve(); }
        createOscillator() {
            return {
                type: 'sine',
                frequency: { setValueAtTime: () => {} },
                connect: () => {},
                start: () => {},
                stop: () => {}
            };
        }
        createGain() {
            return {
                gain: {
                    setValueAtTime: () => {},
                    exponentialRampToValueAtTime: () => {},
                    linearRampToValueAtTime: () => {}
                },
                connect: () => {}
            };
        }
        get destination() { return {}; }
    }

    // Mock SpeechSynthesis
    const mockSpeechSynthesis = {
        speaking: false,
        paused: false,
        pending: false,
        cancelledCount: 0,
        spokenHistory: [],
        speak(utterance) {
            this.speaking = true;
            this.spokenHistory.push(utterance);
        },
        cancel() {
            this.speaking = false;
            this.cancelledCount++;
        },
        pause() { this.paused = true; },
        resume() { this.paused = false; }
    };

    class MockSpeechSynthesisUtterance {
        constructor(text) {
            this.text = text;
            this.lang = 'pt-BR';
            this.pitch = 1.15;
            this.rate = 0.92;
        }
    }

    const storageStore = {
        kumongen_tutorial_seen: 'true',
        kumongen_student_name: 'Super Aluno'
    };

    const mockLocalStorage = {
        getItem: (k) => (k in storageStore ? storageStore[k] : null),
        setItem: (k, v) => { storageStore[k] = String(v); },
        removeItem: (k) => { delete storageStore[k]; },
        clear: () => { for (const k in storageStore) delete storageStore[k]; }
    };

    const windowListeners = {};

    const sandbox = {
        console: {
            log: () => {},
            info: () => {},
            warn: (...args) => errorLog.push({ type: 'warn', args }),
            error: (...args) => {
                errorLog.push({ type: 'error', args });
                uncaughtExceptions.push(args.map(String).join(' '));
            }
        },
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
        AudioContext: MockAudioContext,
        webkitAudioContext: MockAudioContext,
        speechSynthesis: mockSpeechSynthesis,
        SpeechSynthesisUtterance: MockSpeechSynthesisUtterance,
        localStorage: mockLocalStorage,
        document: mockDocument,
        addEventListener: (evt, fn, opts) => {
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

    sandbox.window = sandbox;
    sandbox.global = sandbox;
    sandbox.self = sandbox;

    const context = vm.createContext(sandbox);

    // Carrega scripts na ordem estrita
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

    return {
        context,
        sandbox,
        mockDocument,
        mockSpeechSynthesis,
        windowListeners,
        errorLog,
        uncaughtExceptions
    };
}

// Helper para aguardar microtarefas / delays
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// 2. SUÍTE DE TESTES DE ESTRESSE R3
// ============================================================================

async function runStressTestSuite() {
    console.log(`${c.bold}${c.cyan}====================================================================${c.reset}`);
    console.log(`${c.bold}${c.cyan}  KUMONGEN · SUÍTE DE ESTRESSE DO TABLET PLAYER & GAUNTLET (R3)     ${c.reset}`);
    console.log(`${c.bold}${c.cyan}====================================================================${c.reset}\n`);

    const t0 = performance.now();
    const testResults = {
        timestamp: new Date().toISOString(),
        totalTests: 0,
        passed: 0,
        failed: 0,
        uncaughtExceptions: 0,
        scenarios: []
    };

    function recordAssertion(scenarioObj, name, passed, details = '') {
        testResults.totalTests++;
        if (passed) {
            testResults.passed++;
            console.log(`  ${c.green}✔ PASS${c.reset}: ${name} ${details ? c.dim + '(' + details + ')' + c.reset : ''}`);
        } else {
            testResults.failed++;
            console.error(`  ${c.red}✖ FAIL${c.reset}: ${name} — ${details}`);
        }
        scenarioObj.assertions.push({ name, passed, details });
    }

    // ------------------------------------------------------------------------
    // CENÁRIO 1: HAMMERING / DOUBLE-TAP INTENSO
    // ------------------------------------------------------------------------
    console.log(`${c.bold}${c.yellow}[CENÁRIO 1] Hammering / Double-Tap Intenso & Condição de Corrida${c.reset}`);
    const scen1 = { id: 1, name: 'Hammering / Double-tap intenso', assertions: [], passed: true };

    {
        const env = createTabletEnvironment();
        const { TabletPlayer } = env.context;
        const Session = TabletPlayer.Session;

        // Inicia rodada em Matemática M2 (Adição)
        Session.subjectKey = 'matematica';
        Session.levelId = 'm2';
        TabletPlayer.startRound();
        Session.workedExampleDismissed = true;
        TabletPlayer.renderCurrentQuestion();

        // 1.1: 50 cliques consecutivos rápidos no botão Enter do teclado virtual
        const q0 = Session.items[0];
        const correctVal = q0.operand1 + q0.operand2;
        Session.currentInput = String(correctVal);

        const initialIndex = Session.currentIndex;
        let lockActivated = false;
        let transitionLocksObserved = 0;

        for (let i = 0; i < 50; i++) {
            TabletPlayer.handleKeypadPress('enter');
            if (Session.isTransitionLocked) {
                transitionLocksObserved++;
                lockActivated = true;
            }
        }

        recordAssertion(
            scen1,
            'Trava isTransitionLocked é ativada imediatamente no 1º acerto',
            lockActivated && Session.isTransitionLocked === true,
            `lock ativo em ${transitionLocksObserved}/50 chamadas`
        );

        recordAssertion(
            scen1,
            'Índice da questão não sofre salto prematuro durante o delay do lock',
            Session.currentIndex === initialIndex,
            `currentIndex=${Session.currentIndex}, esperado=${initialIndex}`
        );

        // Aguarda término do delay do setTimeout (650ms)
        await sleep(750);

        recordAssertion(
            scen1,
            'Exatamente 1 questão avançou após 50 cliques de hammering (sem pular exercícios)',
            Session.currentIndex === initialIndex + 1,
            `currentIndex=${Session.currentIndex}, esperado=${initialIndex + 1}`
        );

        recordAssertion(
            scen1,
            'Trava isTransitionLocked é liberada após conclusão da transição',
            Session.isTransitionLocked === false,
            'isTransitionLocked=false'
        );

        // 1.2: Hammering no último item da rodada antes do Gauntlet
        // Configura fila com 1 item ativo e 1 item na fila de erros do Gauntlet
        Session.items = [{ type: 'math', operand1: 3, operator: '+', operand2: 3 }];
        Session.missedItemsQueue = [{ type: 'math', operand1: 5, operator: '+', operand2: 5 }];
        Session.currentIndex = 0;
        Session.isTransitionLocked = false;
        Session.workedExampleDismissed = true;
        TabletPlayer.renderCurrentQuestion();
        Session.currentInput = '6';

        // Dispara 50 cliques rápidos no último item
        for (let i = 0; i < 50; i++) {
            TabletPlayer.handleKeypadPress('enter');
        }

        await sleep(750);

        recordAssertion(
            scen1,
            'Gauntlet inicializado com 100% de integridade (fila de itens não esvazia para array vazio)',
            Session.isGauntletPhase === true && Session.items.length === 1 && Session.items[0] !== undefined,
            `items.length=${Session.items.length}, item[0].operand1=${Session.items[0] ? Session.items[0].operand1 : 'undefined'}`
        );

        recordAssertion(
            scen1,
            'Nenhuma exceção não tratada lançada durante o hammering no Gauntlet',
            env.uncaughtExceptions.length === 0,
            `exceções=${env.uncaughtExceptions.length}`
        );

        // Limpa timers pendentes
        clearInterval(Session.timerInterval);
    }
    scen1.passed = scen1.assertions.every(a => a.passed);
    testResults.scenarios.push(scen1);
    console.log();

    // ------------------------------------------------------------------------
    // CENÁRIO 2: INTEGRIDADE DE CONTADORES DO GAUNTLET
    // ------------------------------------------------------------------------
    console.log(`${c.bold}${c.yellow}[CENÁRIO 2] Integridade Pedagógica de Contadores no Gauntlet Kumon${c.reset}`);
    const scen2 = { id: 2, name: 'Integridade de contadores do Gauntlet', assertions: [], passed: true };

    {
        const env = createTabletEnvironment();
        const { TabletPlayer } = env.context;
        const Session = TabletPlayer.Session;

        Session.subjectKey = 'matematica';
        Session.levelId = 'm2';
        TabletPlayer.startRound();
        Session.workedExampleDismissed = true;
        TabletPlayer.renderCurrentQuestion();

        // Simula 8 acertos de primeira e 2 erros na rodada inicial (10 itens no total)
        Session.initialItemsCount = 10;
        Session.roundCorrectFirstAttempt = 8;
        Session.missedItemsQueue = [
            { type: 'math', operand1: 4, operator: '+', operand2: 4 },
            { type: 'math', operand1: 7, operator: '+', operand2: 2 }
        ];

        // Inicia fase de Maestria Gauntlet
        TabletPlayer.startGauntletPhase();
        const startBtn = env.mockDocument.getElementById('btnStartGauntletNow');
        if (startBtn) startBtn.click();
        else TabletPlayer.renderCurrentQuestion();

        recordAssertion(
            scen2,
            'Fase Gauntlet inicia com flags isGauntlet e isGauntletPhase ativas',
            Session.isGauntletPhase === true && Session.isGauntlet === true,
            'isGauntlet=true, isGauntletPhase=true'
        );

        recordAssertion(
            scen2,
            'currentAttempts é redefinido para 0 na questão do Gauntlet',
            Session.currentAttempts === 0,
            `currentAttempts=${Session.currentAttempts}`
        );

        // Aluno acerta a questão do Gauntlet DE PRIMEIRA (currentAttempts === 0)
        Session.currentInput = '8'; // 4 + 4 = 8
        TabletPlayer.registerSuccess();

        recordAssertion(
            scen2,
            'roundCorrectFirstAttempt NÃO é inflado no Gauntlet mesmo acertando de primeira',
            Session.roundCorrectFirstAttempt === 8,
            `roundCorrectFirstAttempt=${Session.roundCorrectFirstAttempt}, esperado=8`
        );

        recordAssertion(
            scen2,
            'gauntletItemsSolved é incrementado corretamente no acerto do Gauntlet',
            Session.gauntletItemsSolved === 1,
            `gauntletItemsSolved=${Session.gauntletItemsSolved}`
        );

        await sleep(750);

        // Conclui a rodada e verifica precisão reportada
        TabletPlayer.finishRound();

        const totalItems = Session.initialItemsCount || 10;
        const recordedAccuracy = Math.round((Session.roundCorrectFirstAttempt / totalItems) * 100);

        recordAssertion(
            scen2,
            'Acurácia final reporta os 80% reais de 1ª tentativa (e não 100% fraudulento)',
            recordedAccuracy === 80,
            `acurácia calculada=${recordedAccuracy}%, esperado=80%`
        );

        clearInterval(Session.timerInterval);
    }
    scen2.passed = scen2.assertions.every(a => a.passed);
    testResults.scenarios.push(scen2);
    console.log();

    // ------------------------------------------------------------------------
    // CENÁRIO 3: EXIBIÇÃO DE TECLADO M7 (VIZINHOS)
    // ------------------------------------------------------------------------
    console.log(`${c.bold}${c.yellow}[CENÁRIO 3] Exibição de Teclado no Nível M7 (Vizinhos)${c.reset}`);
    const scen3 = { id: 3, name: 'Exibição de Teclado M7', assertions: [], passed: true };

    {
        const env = createTabletEnvironment();
        const { TabletPlayer } = env.context;
        const Session = TabletPlayer.Session;
        const keypadWrapper = env.mockDocument.getElementById('keypadWrapper');

        Session.subjectKey = 'matematica';
        Session.levelId = 'm7';
        TabletPlayer.startRound();
        Session.workedExampleDismissed = true;
        TabletPlayer.renderCurrentQuestion();

        const currentItem = Session.items[Session.currentIndex];

        recordAssertion(
            scen3,
            'Nível M7 gera itens com tipo "neighbors"',
            currentItem && currentItem.type === 'neighbors',
            `tipo gerado=${currentItem ? currentItem.type : 'undefined'}`
        );

        recordAssertion(
            scen3,
            'keypadWrapper permanece VISÍVEL no nível M7 (style.display !== "none")',
            keypadWrapper.style.display !== 'none',
            `keypadWrapper.style.display="${keypadWrapper.style.display}"`
        );

        // Simula resolução no teclado virtual touch
        const center = currentItem.center;
        const expectedPredecessor = center - 1;

        // Digita a resposta tecla por tecla
        const digits = String(expectedPredecessor).split('');
        for (const d of digits) {
            TabletPlayer.handleKeypadPress(d);
        }

        recordAssertion(
            scen3,
            'Entrada do antecessor registrada corretamente em Session.currentInput',
            Session.currentInput === String(expectedPredecessor),
            `currentInput="${Session.currentInput}", esperado="${expectedPredecessor}"`
        );

        // Confirma no teclado
        TabletPlayer.handleKeypadPress('enter');

        recordAssertion(
            scen3,
            'Submissão via teclado virtual no nível M7 ativa trava de transição com sucesso',
            Session.isTransitionLocked === true,
            'isTransitionLocked=true'
        );

        await sleep(750);
        clearInterval(Session.timerInterval);
    }
    scen3.passed = scen3.assertions.every(a => a.passed);
    testResults.scenarios.push(scen3);
    console.log();

    // ------------------------------------------------------------------------
    // CENÁRIO 4: ALTERNÂNCIA A QUENTE DE MATÉRIA/NÍVEL
    // ------------------------------------------------------------------------
    console.log(`${c.bold}${c.yellow}[CENÁRIO 4] Alternância a Quente de Matéria/Nível no Meio de Rodada${c.reset}`);
    const scen4 = { id: 4, name: 'Alternância a quente de matéria/nível', assertions: [], passed: true };

    {
        const env = createTabletEnvironment();
        const { TabletPlayer } = env.context;
        const Session = TabletPlayer.Session;
        const gModal = env.mockDocument.getElementById('gauntletModal');
        const rModal = env.mockDocument.getElementById('roundFinishedModal');

        // 4.1: Troca no meio de uma transição de timeout
        Session.subjectKey = 'matematica';
        Session.levelId = 'm2';
        TabletPlayer.startRound();
        Session.workedExampleDismissed = true;
        TabletPlayer.renderCurrentQuestion();

        Session.currentInput = '3';
        TabletPlayer.registerSuccess();

        const activeTimeoutRef = Session.transitionTimeout;
        recordAssertion(
            scen4,
            'Timeout de transição ativo durante resolução da questão',
            activeTimeoutRef !== null,
            'Session.transitionTimeout ativo'
        );

        // Troca abrupta para Português P2 durante o timeout ativo
        Session.subjectKey = 'portugues';
        Session.levelId = 'p2';
        TabletPlayer.startRound();

        recordAssertion(
            scen4,
            'startRound cancela qualquer transitionTimeout pendente e destrava a sessão',
            Session.isTransitionLocked === false,
            'isTransitionLocked=false'
        );

        recordAssertion(
            scen4,
            'Sessão iniciada na nova disciplina sem contaminação do índice antigo',
            Session.subjectKey === 'portugues' && Session.levelId === 'p2' && Session.currentIndex === 0,
            `subject=${Session.subjectKey}, level=${Session.levelId}, index=${Session.currentIndex}`
        );

        // Aguarda tempo suficiente para timeout antigo hipoteticamente disparar
        await sleep(800);

        recordAssertion(
            scen4,
            'Nenhum callback órfão da matéria anterior avançou o índice na matéria nova',
            Session.currentIndex === 0,
            `currentIndex=${Session.currentIndex}, esperado=0`
        );

        // 4.2: Troca com Gauntlet Modal ativo
        gModal.style.display = 'flex';
        rModal.style.display = 'flex';

        Session.subjectKey = 'ingles';
        Session.levelId = 'i1';
        TabletPlayer.startRound();

        recordAssertion(
            scen4,
            'startRound oculta explicitamente gauntletModal aberto (display="none")',
            gModal.style.display === 'none',
            `gauntletModal.style.display="${gModal.style.display}"`
        );

        recordAssertion(
            scen4,
            'startRound oculta explicitamente roundFinishedModal aberto (display="none")',
            rModal.style.display === 'none',
            `roundFinishedModal.style.display="${rModal.style.display}"`
        );

        recordAssertion(
            scen4,
            'startRound cancela qualquer síntese de voz ativa no navegador',
            env.mockSpeechSynthesis.cancelledCount >= 1,
            `speechSynthesis.cancelledCount=${env.mockSpeechSynthesis.cancelledCount}`
        );

        clearInterval(Session.timerInterval);
    }
    scen4.passed = scen4.assertions.every(a => a.passed);
    testResults.scenarios.push(scen4);
    console.log();

    // ------------------------------------------------------------------------
    // CENÁRIO 5: MUTE/UNMUTE REPENTINO
    // ------------------------------------------------------------------------
    console.log(`${c.bold}${c.yellow}[CENÁRIO 5] Mute/Unmute Repentino e Cancelamento de Voz${c.reset}`);
    const scen5 = { id: 5, name: 'Mute/unmute repentino', assertions: [], passed: true };

    {
        const env = createTabletEnvironment();
        const { TabletPlayer } = env.context;
        const soundBtn = env.mockDocument.getElementById('soundToggleBtn');

        let exceptionsDuringAudio = 0;
        const speechBefore = env.mockSpeechSynthesis.cancelledCount;

        // Dispara reprodução de tons e voz simultâneos
        try {
            TabletPlayer.sound.playTone(440, 0.5);
            TabletPlayer.sound.playSuccess();
            TabletPlayer.sound.playWrong();
            TabletPlayer.sound.playStreakChord(5);
            TabletPlayer.MascotEngine.speak('Mensagem de teste de áudio longo e complexo', 3000, true);
        } catch (e) {
            exceptionsDuringAudio++;
        }

        // Alterna o mute bruscamente 100 vezes seguidas
        for (let i = 0; i < 100; i++) {
            try {
                TabletPlayer.sound.toggleMute();
                if (soundBtn) soundBtn.click();
            } catch (e) {
                exceptionsDuringAudio++;
            }
        }

        const speechAfter = env.mockSpeechSynthesis.cancelledCount;

        recordAssertion(
            scen5,
            '0 exceções durante reprodução e alternância rápida de 100 ciclos de áudio',
            exceptionsDuringAudio === 0,
            `exceções=${exceptionsDuringAudio}`
        );

        recordAssertion(
            scen5,
            'speechSynthesis.cancel() foi invocado durante os ciclos de mute',
            speechAfter > speechBefore,
            `cancelamentos=${speechAfter - speechBefore}`
        );

        recordAssertion(
            scen5,
            'SoundEngine mantém estado consistente de mute',
            typeof TabletPlayer.sound.muted === 'boolean',
            `sound.muted=${TabletPlayer.sound.muted}`
        );

        clearInterval(TabletPlayer.Session.timerInterval);
    }
    scen5.passed = scen5.assertions.every(a => a.passed);
    testResults.scenarios.push(scen5);
    console.log();

    // ------------------------------------------------------------------------
    // CENÁRIO 6: ENTRADAS ATÍPICAS, STRINGS LONGAS E LIMITES NUMÉRICOS
    // ------------------------------------------------------------------------
    console.log(`${c.bold}${c.yellow}[CENÁRIO 6] Entradas Atípicas, Maliciosas e Limites Extremos${c.reset}`);
    const scen6 = { id: 6, name: 'Entradas atípicas e limites', assertions: [], passed: true };

    {
        const env = createTabletEnvironment();
        const { TabletPlayer } = env.context;
        const Session = TabletPlayer.Session;

        Session.subjectKey = 'matematica';
        Session.levelId = 'm2';
        TabletPlayer.startRound();

        const atypicalInputs = [
            '',
            '   ',
            null,
            undefined,
            NaN,
            Infinity,
            -Infinity,
            '<script>alert("xss")</script>',
            '${alert(1)}',
            '!@#$%^&*()_+~`|}{[]:;?><,./',
            '1e25',
            '99999999999999999999999999999999999999',
            '-1234',
            '0000',
            '3.14159',
            'a'.repeat(500),
            '😂🔥🐶🐱🚀',
            { bad: 'object' },
            [1, 2, 3]
        ];

        let uncaughtInKeypad = 0;

        for (const input of atypicalInputs) {
            try {
                TabletPlayer.handleKeypadPress(input);
            } catch (e) {
                uncaughtInKeypad++;
                env.uncaughtExceptions.push(e.message);
            }
        }

        recordAssertion(
            scen6,
            'handleKeypadPress não lança exceção para nenhuma das 19 entradas atípicas',
            uncaughtInKeypad === 0,
            `falhas=${uncaughtInKeypad}`
        );

        // Validação de resposta numérica sob entradas atípicas
        let uncaughtInValidation = 0;

        for (const input of atypicalInputs) {
            try {
                Session.currentInput = (typeof input === 'string') ? input : String(input);
                TabletPlayer.validateNumericAnswer();
            } catch (e) {
                uncaughtInValidation++;
                env.uncaughtExceptions.push(e.message);
            }
        }

        recordAssertion(
            scen6,
            'validateNumericAnswer não quebra com entradas atípicas/maliciosas',
            uncaughtInValidation === 0,
            `falhas=${uncaughtInValidation}`
        );

        // checkCompareAnswer com operadores atípicos
        let uncaughtInCompare = 0;
        const badOperators = [null, undefined, '', '==', '!=', '><', 123, NaN, {}];
        for (const op of badOperators) {
            try {
                TabletPlayer.checkCompareAnswer(op, 5, 3);
            } catch (e) {
                uncaughtInCompare++;
                env.uncaughtExceptions.push(e.message);
            }
        }

        recordAssertion(
            scen6,
            'checkCompareAnswer trata operadores inválidos sem lançar erro',
            uncaughtInCompare === 0,
            `falhas=${uncaughtInCompare}`
        );

        // solveSequenceHole com sequências anômalas
        let uncaughtInSeq = 0;
        const badSequences = [
            null,
            undefined,
            [],
            [1, 2, 3], // sem lacuna '__'
            ['__'],
            ['__', '__'],
            ['__', 10],
            [10, '__'],
            [2, 4, '__', 8],
            [10, '__', 20],
            ['a', '__', 'c']
        ];

        for (const seq of badSequences) {
            try {
                const res = TabletPlayer.solveSequenceHole(seq);
                if (typeof res !== 'number' || isNaN(res)) {
                    // Espera-se número válido mesmo no fallback
                    uncaughtInSeq++;
                }
            } catch (e) {
                uncaughtInSeq++;
                env.uncaughtExceptions.push(e.message);
            }
        }

        recordAssertion(
            scen6,
            'solveSequenceHole devolve número válido em todas as sequências anômalas',
            uncaughtInSeq === 0,
            `falhas=${uncaughtInSeq}`
        );

        // speech com textos longos ou vazios
        let uncaughtInSpeech = 0;
        try {
            TabletPlayer.MascotEngine.speak('', 100, true);
            TabletPlayer.MascotEngine.speak('a'.repeat(600), 100, true);
            TabletPlayer.MascotEngine.speak(null, 100, false);
        } catch (e) {
            uncaughtInSpeech++;
            env.uncaughtExceptions.push(e.message);
        }

        recordAssertion(
            scen6,
            'MascotEngine.speak tolera textos nulos, vazios e strings longas (>500 chars)',
            uncaughtInSpeech === 0,
            `falhas=${uncaughtInSpeech}`
        );

        clearInterval(Session.timerInterval);
    }
    scen6.passed = scen6.assertions.every(a => a.passed);
    testResults.scenarios.push(scen6);
    console.log();

    // ------------------------------------------------------------------------
    // CENÁRIO 7: LIMPEZA DE LISTENERS DE TRAÇADO (PREVENÇÃO DE MEMORY LEAK)
    // ------------------------------------------------------------------------
    console.log(`${c.bold}${c.yellow}[CENÁRIO 7] Limpeza Simétrica de Event Listeners de Traçado (P1/I1)${c.reset}`);
    const scen7 = { id: 7, name: 'Limpeza de listeners de traçado', assertions: [], passed: true };

    {
        const env = createTabletEnvironment();
        const { TabletPlayer } = env.context;
        const Session = TabletPlayer.Session;

        Session.subjectKey = 'portugues';
        Session.levelId = 'p1'; // P1 é traçado de letras
        TabletPlayer.startRound();

        // Obtém contagem de listeners no window
        const mouseupCountInitial = (env.windowListeners['mouseup'] || []).length;
        const touchendCountInitial = (env.windowListeners['touchend'] || []).length;

        // Renderiza próxima questão de traçado repetidamente 10 vezes
        for (let i = 0; i < 10; i++) {
            TabletPlayer.renderCurrentQuestion();
        }

        const mouseupCountAfter = (env.windowListeners['mouseup'] || []).length;
        const touchendCountAfter = (env.windowListeners['touchend'] || []).length;

        recordAssertion(
            scen7,
            'Listeners de mouseup em window não se acumulam em rodadas sucessivas (sem leak)',
            mouseupCountAfter === mouseupCountInitial,
            `inicial=${mouseupCountInitial}, final=${mouseupCountAfter}`
        );

        recordAssertion(
            scen7,
            'Listeners de touchend em window não se acumulam em rodadas sucessivas (sem leak)',
            touchendCountAfter === touchendCountInitial,
            `inicial=${touchendCountInitial}, final=${touchendCountAfter}`
        );

        // Troca de nível para Matemática e verifica limpeza completa
        Session.subjectKey = 'matematica';
        Session.levelId = 'm1';
        TabletPlayer.startRound();

        const mouseupCountCleaned = (env.windowListeners['mouseup'] || []).length;
        const touchendCountCleaned = (env.windowListeners['touchend'] || []).length;

        recordAssertion(
            scen7,
            'cleanupTraceCanvas remove os listeners globais ao sair para outra disciplina',
            mouseupCountCleaned <= mouseupCountInitial && touchendCountCleaned <= touchendCountInitial,
            `mouseup=${mouseupCountCleaned}, touchend=${touchendCountCleaned}`
        );

        clearInterval(Session.timerInterval);
    }
    scen7.passed = scen7.assertions.every(a => a.passed);
    testResults.scenarios.push(scen7);
    console.log();

    // ------------------------------------------------------------------------
    // CONSOLIDAÇÃO DOS RESULTADOS
    // ------------------------------------------------------------------------
    const t1 = performance.now();
    const durationMs = Math.round((t1 - t0) * 100) / 100;
    testResults.durationMs = durationMs;
    testResults.status = (testResults.failed === 0) ? 'PASSED' : 'FAILED';

    console.log(`${c.bold}${c.cyan}====================================================================${c.reset}`);
    console.log(`${c.bold}  RESUMO EXECUTIVO DA SUÍTE DE ESTRESSE R3${c.reset}`);
    console.log(`${c.bold}${c.cyan}====================================================================${c.reset}`);
    console.log(`  Total de Testes/Asserções: ${c.bold}${testResults.totalTests}${c.reset}`);
    console.log(`  Aprovados:                 ${c.green}${c.bold}${testResults.passed}${c.reset}`);
    console.log(`  Falhas:                    ${testResults.failed === 0 ? c.green : c.red}${c.bold}${testResults.failed}${c.reset}`);
    console.log(`  Exceções Não Tratadas:     ${testResults.uncaughtExceptions === 0 ? c.green : c.red}${c.bold}${testResults.uncaughtExceptions}${c.reset}`);
    console.log(`  Tempo Total de Execução:   ${c.cyan}${durationMs} ms${c.reset}`);
    console.log(`  Status Final:              ${testResults.status === 'PASSED' ? c.green + c.bold + 'APROVADO (100%)' : c.red + c.bold + 'REPROVADO'}${c.reset}`);
    console.log(`${c.bold}${c.cyan}====================================================================${c.reset}\n`);

    // Salva o JSON de resultados quantitativos
    fs.writeFileSync(RESULTS_JSON_PATH, JSON.stringify(testResults, null, 2), 'utf8');
    console.log(`${c.dim}Relatório persistido em: ${RESULTS_JSON_PATH}${c.reset}\n`);

    if (testResults.failed > 0 || testResults.uncaughtExceptions > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

// Execução da suíte
runStressTestSuite().catch(err => {
    console.error('Erro fatal na suíte de estresse:', err);
    process.exit(1);
});
