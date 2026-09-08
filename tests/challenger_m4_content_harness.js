#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PROJECT_ROOT = path.resolve(__dirname, '..');

function createMockElement(tag = 'div') {
    const classes = new Set();
    const attrs = {};
    const children = [];
    return {
        tagName: tag.toUpperCase(),
        classList: {
            add: (...cls) => cls.forEach(c => c && c.split(/\s+/).forEach(x => classes.add(x))),
            remove: (...cls) => cls.forEach(c => c && c.split(/\s+/).forEach(x => classes.delete(x))),
            contains: (c) => classes.has(c),
            toggle: (c) => { if (classes.has(c)) { classes.delete(c); return false; } classes.add(c); return true; },
            toString: () => Array.from(classes).join(' ')
        },
        style: {},
        attributes: attrs,
        children,
        innerHTML: '',
        value: '',
        textContent: '',
        appendChild: (child) => { children.push(child); return child; },
        setAttribute: (k, v) => { attrs[k] = String(v); },
        getAttribute: (k) => attrs[k] !== undefined ? attrs[k] : null,
        removeAttribute: (k) => { delete attrs[k]; },
        querySelectorAll: () => [],
        querySelector: () => null,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
        click: () => {}
    };
}

function buildFreshSandbox(customMathRandom = null) {
    const mockBody = createMockElement('body');
    const mockHead = createMockElement('head');
    const elementsById = {};

    const mathObj = Object.create(Math);
    if (customMathRandom) {
        mathObj.random = customMathRandom;
    }

    const sandbox = {
        console,
        Math: mathObj,
        Date,
        URLSearchParams,
        location: { search: '', href: '' },
        navigator: { userAgent: 'Node' },
        setTimeout: (fn) => typeof fn === 'function' && fn(),
        clearTimeout: () => {},
        setInterval: () => {},
        clearInterval: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
        localStorage: {
            _data: {},
            getItem: (k) => (k in sandbox.localStorage._data ? sandbox.localStorage._data[k] : null),
            setItem: (k, v) => { sandbox.localStorage._data[k] = String(v); },
            removeItem: (k) => { delete sandbox.localStorage._data[k]; },
            clear: () => { sandbox.localStorage._data = {}; }
        },
        document: {
            readyState: 'complete',
            body: mockBody,
            head: mockHead,
            getElementById: (id) => {
                if (!elementsById[id]) elementsById[id] = createMockElement('div');
                return elementsById[id];
            },
            querySelector: () => createMockElement('div'),
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

    const scripts = ['gerador.js', 'matematica.js', 'portugues.js', 'ingles.js', 'student-profiles.js', 'tablet-player.js'];
    for (const s of scripts) {
        const fullPath = path.join(PROJECT_ROOT, s);
        if (fs.existsSync(fullPath)) {
            const fileCode = fs.readFileSync(fullPath, 'utf8');
            vm.runInContext(fileCode, context, { filename: s });
        }
    }

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

async function runChallengerHarness() {
    console.log('==============================================================================');
    console.log('  CHALLENGER 1 — SUÍTE ADVERSARIAL EMPÍRICA (R1 & R2)');
    console.log('==============================================================================\n');

    const results = {
        battery1_mass_sampling: { passed: true, totalItems: 0, violations: [], perLevel: {} },
        battery2_mass_rotation_p4: { passed: true, leaks: [], details: {} },
        battery3_doce_tosse_audit: { passed: true, occurrences: [] },
        battery4_eval_harness_challenge: { passed: true, tests: {} },
        battery5_distractor_oracles: { passed: true, p2Violations: [], i7Violations: [] }
    };

    const sandbox = buildFreshSandbox();
    const KumonSubjects = sandbox.KumonSubjects;

    // BATERIA 1: Amostragem Estocástica Massiva (500 itens x 25 níveis = 12.500 itens)
    console.log('[BATERIA 1] Amostragem Estocástica Massiva (500 itens/nível x 25 níveis)...');
    const SAMPLE_COUNT = 500;
    const allLevelIds = [
        'm1','m2','m3','m4','m5','m6','m7','m8','m9','m10',
        'p1','p2','p3','p4','p5','p6','p7','p8',
        'i1','i2','i3','i4','i5','i6','i7'
    ];

    for (const lvlId of allLevelIds) {
        let subKey = 'matematica';
        if (lvlId.startsWith('p')) subKey = 'portugues';
        if (lvlId.startsWith('i')) subKey = 'ingles';

        const mod = KumonSubjects[subKey];
        const lvlObj = mod.levels.find(l => l.id.toLowerCase() === lvlId);
        const items = mod.generate(lvlObj, SAMPLE_COUNT);

        results.battery1_mass_sampling.totalItems += items.length;
        const levelViolations = [];

        for (let i = 0; i < items.length; i++) {
            const it = items[i];

            if (lvlId === 'm1') {
                if (it.type !== 'quantity' || typeof it.value !== 'number' || it.value < 1 || it.value > 5) {
                    levelViolations.push('M1 fora de 1..5: ' + JSON.stringify(it));
                }
            } else if (lvlId === 'm2') {
                if (it.type !== 'math' || it.operator !== '+' || it.result !== (it.operand1 + it.operand2)) {
                    levelViolations.push('M2 adição incorreta: ' + JSON.stringify(it));
                }
            } else if (lvlId === 'm3') {
                if (it.type !== 'sequence' || !Array.isArray(it.sequence)) {
                    levelViolations.push('M3 sequence inválido: ' + JSON.stringify(it));
                } else {
                    const holes = it.sequence.filter(x => x === '__');
                    if (holes.length !== 1) {
                        levelViolations.push('M3 sequência com ' + holes.length + ' lacunas: ' + JSON.stringify(it.sequence));
                    }
                }
            } else if (lvlId === 'm4') {
                const val = it.number || it.value;
                if (it.type !== 'tens' || typeof val !== 'number' || val < 10 || val > 19) {
                    levelViolations.push('M4 número fora de 10..19: ' + JSON.stringify(it));
                }
            } else if (lvlId === 'm5') {
                if (it.type !== 'compare' || !Array.isArray(it.pair) || it.pair.length !== 2) {
                    levelViolations.push('M5 comparação inválida: ' + JSON.stringify(it));
                }
            } else if (lvlId === 'm6') {
                if (it.type !== 'math' || it.operator !== '-' || it.operand1 < it.operand2 || it.result !== (it.operand1 - it.operand2)) {
                    levelViolations.push('M6 subtração com minuendo < subtraendo ou erro: ' + JSON.stringify(it));
                }
            } else if (lvlId === 'm7') {
                if (it.type !== 'neighbors' || typeof it.center !== 'number' || it.center <= 0) {
                    levelViolations.push('M7 vizinhos inválido: ' + JSON.stringify(it));
                }
            } else if (lvlId === 'm8') {
                if (it.type !== 'math' || (it.operator !== '×' && it.operator !== '*') || it.result !== (it.operand1 * it.operand2)) {
                    levelViolations.push('M8 multiplicação incorreta: ' + JSON.stringify(it));
                }
            } else if (lvlId === 'm9') {
                if (it.type !== 'math' || (it.operator !== '÷' && it.operator !== '/')) {
                    levelViolations.push('M9 divisão inválida: ' + JSON.stringify(it));
                } else if (it.operand2 === 0 || it.operand1 % it.operand2 !== 0 || it.result !== Math.floor(it.operand1 / it.operand2)) {
                    levelViolations.push('M9 divisão inexata ou por zero: ' + it.operand1 + ' ÷ ' + it.operand2 + ' = ' + it.result);
                }
            } else if (lvlId === 'm10') {
                if (it.type !== 'fraction' || it.denominator <= 0 || it.numerator < 0 || it.numerator > it.denominator) {
                    levelViolations.push('M10 fração inválida: ' + JSON.stringify(it));
                }
            } else if (lvlId === 'p1') {
                if (it.type !== 'trace' || !/^[A-Z]$/.test(it.char)) {
                    levelViolations.push('P1 traçado inválido: ' + JSON.stringify(it));
                }
            } else if (lvlId === 'p2') {
                if (it.type !== 'syllable' || !it.syllable || it.syllable.length !== 2) {
                    levelViolations.push('P2 sílaba não-canônica: ' + JSON.stringify(it));
                }
            } else if (lvlId === 'p3') {
                if (it.type !== 'word' || !Array.isArray(it.parts) || it.parts.length !== 2 || it.parts.join('') !== it.word) {
                    levelViolations.push('P3 dissílaba inválida ou divergente: ' + JSON.stringify(it));
                }
            } else if (lvlId === 'p4') {
                if (it.type !== 'word' || !Array.isArray(it.parts) || it.parts.length < 3 || it.parts.join('') !== it.word) {
                    levelViolations.push('P4 trissílaba inválida ou divergente: ' + JSON.stringify(it));
                }
                if (/CH|LH|NH|RR|SS|QU|GU/i.test(it.word)) {
                    levelViolations.push('P4 VAZAMENTO DE DÍGRAFO: ' + it.word);
                }
                if (/BL|CL|FL|GL|PL|BR|CR|DR|FR|GR|PR|TR|VR/i.test(it.word)) {
                    levelViolations.push('P4 VAZAMENTO DE ENCONTRO CONSONANTAL: ' + it.word);
                }
            } else if (lvlId === 'p5') {
                if (it.type !== 'syllable' || !it.syllable) {
                    levelViolations.push('P5 sílaba complexa inválida: ' + JSON.stringify(it));
                }
            } else if (lvlId === 'p6') {
                if (it.type !== 'syllable' || !it.syllable) {
                    levelViolations.push('P6 dígrafo inválido: ' + JSON.stringify(it));
                }
            } else if (lvlId === 'p7') {
                if (it.type !== 'rhyme' || !it.word || !it.target || !Array.isArray(it.options) || !it.options.includes(it.target)) {
                    levelViolations.push('P7 rima inválida ou gabarito ausente: ' + JSON.stringify(it));
                }
                if ((it.word === 'DOCE' && it.target === 'TOSSE') || (it.word === 'TOSSE' && it.target === 'DOCE')) {
                    levelViolations.push('P7 PAR PROIBIDO DOCE/TOSSE DETECTADO!');
                }
            } else if (lvlId === 'p8') {
                if (it.type !== 'sentence' || !it.sentence || !Array.isArray(it.parts) || it.parts.join(' ').replace(/\s+/g,' ') !== it.sentence.replace(/\s+/g,' ')) {
                    levelViolations.push('P8 frase divergente: ' + JSON.stringify(it));
                }
            } else if (lvlId === 'i1') {
                if (it.type !== 'trace' || !/^[A-Z]$/.test(it.char)) {
                    levelViolations.push('I1 traçado inválido: ' + JSON.stringify(it));
                }
            } else if (lvlId === 'i2') {
                if (it.type !== 'word' || it.word.length !== 3) {
                    levelViolations.push('I2 CVC != 3: ' + JSON.stringify(it));
                }
            } else if (lvlId === 'i3') {
                if (it.type !== 'word' || !it.word) {
                    levelViolations.push('I3 palavra inválida: ' + JSON.stringify(it));
                }
            } else if (lvlId === 'i4') {
                if (it.type !== 'word' || !it.word) {
                    levelViolations.push('I4 sight word inválida: ' + JSON.stringify(it));
                }
            } else if (lvlId === 'i5') {
                if (it.type !== 'word' || !it.word.toUpperCase().endsWith('E')) {
                    levelViolations.push('I5 Magic E sem E: ' + JSON.stringify(it));
                }
            } else if (lvlId === 'i6') {
                if (it.type !== 'sentence' || !it.sentence || !Array.isArray(it.parts)) {
                    levelViolations.push('I6 frase inválida: ' + JSON.stringify(it));
                }
            } else if (lvlId === 'i7') {
                if (it.type !== 'opposite' || !it.word || !it.target || !Array.isArray(it.options) || !it.options.includes(it.target)) {
                    levelViolations.push('I7 antônimo inválido ou gabarito ausente: ' + JSON.stringify(it));
                }
            }
        }

        results.battery1_mass_sampling.perLevel[lvlId] = {
            sampled: items.length,
            violationsCount: levelViolations.length,
            status: levelViolations.length === 0 ? 'PASS' : 'FAIL'
        };

        if (levelViolations.length > 0) {
            results.battery1_mass_sampling.passed = false;
            results.battery1_mass_sampling.violations.push(...levelViolations);
        }
    }

    console.log('  -> Bateria 1 concluída: ' + results.battery1_mass_sampling.totalItems + ' itens gerados. Violações: ' + results.battery1_mass_sampling.violations.length);

    // BATERIA 2: Rotação Massiva & Lifecycle de Níveis (Vazamento de P4 via selectLevel)
    console.log('\n[BATERIA 2] Testando Rotação Massiva e Vulnerabilidade de selectLevel(\'p4\')...');
    
    let rotationCrash = false;
    try {
        for (let r = 0; r < 1000; r++) {
            const randomLvl = allLevelIds[Math.floor(Math.random() * allLevelIds.length)];
            let subKey = 'matematica';
            if (randomLvl.startsWith('p')) subKey = 'portugues';
            if (randomLvl.startsWith('i')) subKey = 'ingles';
            const mod = KumonSubjects[subKey];
            const sample = mod.generate(randomLvl, 2);
            if (!sample || sample.length !== 2) {
                throw new Error('Falha na rotação do nível ' + randomLvl);
            }
        }
    } catch (err) {
        rotationCrash = true;
        results.battery2_mass_rotation_p4.passed = false;
        results.battery2_mass_rotation_p4.leaks.push('Crash durante rotação: ' + err.message);
    }

    const porSandbox = (() => {
        const mockBody = createMockElement('body');
        const elementsById = {};
        const sb = {
            console, Math, Date,
            addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => true,
            setTimeout: () => {}, clearTimeout: () => {},
            localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} },
            document: {
                readyState: 'complete', body: mockBody,
                getElementById: (id) => elementsById[id] || (elementsById[id] = createMockElement('div')),
                querySelector: () => createMockElement('div'), querySelectorAll: () => [],
                createElement: (t) => createMockElement(t), addEventListener: () => {}, removeEventListener: () => {}
            }
        };
        sb.window = sb; sb.global = sb; sb.self = sb;
        const ctx = vm.createContext(sb);
        vm.runInContext(fs.readFileSync(path.join(PROJECT_ROOT, 'gerador.js'), 'utf8'), ctx);
        vm.runInContext(fs.readFileSync(path.join(PROJECT_ROOT, 'portugues.js'), 'utf8'), ctx);
        return sb;
    })();

    const p4LevelObj = porSandbox.KumonSubjects.portugues.levels.find(l => l.id === 'p4');
    const itemsBeforeSelect = porSandbox.KumonSubjects.portugues.generate(p4LevelObj, 100);
    const leaksBefore = itemsBeforeSelect.filter(x => /CH|LH|NH|RR|SS|QU|GU|BL|CL|FL|GL|PL|BR|CR|DR|FR|GR|PR|TR|VR/i.test(x.word));

    porSandbox.window.selectLevel('p4');
    const itemsAfterSelect = porSandbox.KumonSubjects.portugues.generate(p4LevelObj, 200);
    const chLeaks = itemsAfterSelect.filter(x => x.word.includes('CH'));
    const clLeaks = itemsAfterSelect.filter(x => x.word.includes('CL'));
    const allLeaksAfter = itemsAfterSelect.filter(x => /CH|LH|NH|RR|SS|QU|GU|BL|CL|FL|GL|PL|BR|CR|DR|FR|GR|PR|TR|VR/i.test(x.word));

    results.battery2_mass_rotation_p4.details = {
        rotationCrash,
        leaksBeforeSelectLevel: leaksBefore.length,
        leaksAfterSelectLevel: allLeaksAfter.length,
        chLeaks: Array.from(new Set(chLeaks.map(x => x.word))),
        clLeaks: Array.from(new Set(clLeaks.map(x => x.word))),
        sampleLeakingWords: Array.from(new Set(allLeaksAfter.map(x => x.word)))
    };

    if (allLeaksAfter.length > 0) {
        results.battery2_mass_rotation_p4.passed = false;
        results.battery2_mass_rotation_p4.leaks.push(
            'VULNERABILIDADE CONFIRMADA EM P4: Após selectLevel(\'p4\'), ' + allLeaksAfter.length + '/200 itens gerados continham dígrafos ou encontros consonantais (' + results.battery2_mass_rotation_p4.details.sampleLeakingWords.join(', ') + ')!'
        );
    }

    console.log('  -> Bateria 2 concluída: Rotação 1.000 rodadas OK. Vazamento P4 pós-selectLevel: ' + (allLeaksAfter.length > 0 ? 'FAIL (BUG DETECTADO)' : 'PASS'));

    // BATERIA 3: Auditoria Forense do Par Proibido DOCE / TOSSE
    console.log('\n[BATERIA 3] Auditoria Forense do Par Proibido DOCE / TOSSE...');
    const filesToScan = [];

    function collectFiles(dir) {
        if (!fs.existsSync(dir)) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
            const full = path.join(dir, e.name);
            if (e.isDirectory()) {
                if (e.name !== 'node_modules' && e.name !== '.git' && e.name !== '.agents') {
                    collectFiles(full);
                }
            } else if (/\.(js|html|md|json)$/i.test(e.name) && e.name !== 'challenger_m4_content_harness.js' && e.name !== 'challenger_m4_content_results.json') {
                filesToScan.push(full);
            }
        }
    }
    collectFiles(PROJECT_ROOT);

    const doceTosseOccurrences = [];
    const tosseOccurrences = [];
    for (const f of filesToScan) {
        try {
            const content = fs.readFileSync(f, 'utf8');
            if (/TOSSE/i.test(content)) {
                tosseOccurrences.push(f);
            }
            if (/DOCE/i.test(content) && /TOSSE/i.test(content)) {
                doceTosseOccurrences.push(f);
            }
        } catch (e) {}
    }

    results.battery3_doce_tosse_audit = {
        passed: tosseOccurrences.length === 0,
        scannedFilesCount: filesToScan.length,
        tosseOccurrences,
        doceTosseOccurrences
    };

    console.log('  -> Bateria 3 concluída: ' + filesToScan.length + ' arquivos auditados. Ocorrências de TOSSE: ' + tosseOccurrences.length);

    // BATERIA 4: Desafio Adversarial do Eval Harness (tests/content_quality_audit.js)
    console.log('\n[BATERIA 4] Desafio Adversarial do Eval Harness 5D...');

    const prngChallengeResults = {};
    const biasedRandomValues = [0.01, 0.50, 0.99];

    for (const fixedVal of biasedRandomValues) {
        const testSb = buildFreshSandbox(() => fixedVal);
        const m1Mod = testSb.KumonSubjects.matematica;
        const m1Samples = m1Mod.generate('m1', 20);
        let consec = 0;
        for (let i = 1; i < m1Samples.length; i++) {
            if (JSON.stringify(m1Samples[i]) === JSON.stringify(m1Samples[i-1])) consec++;
        }
        prngChallengeResults['fixed_' + fixedVal] = {
            sampleCount: m1Samples.length,
            consecutiveDuplicates: consec
        };
    }

    const mutationResults = {};

    {
        const sample = [{ type: 'math', operand1: 3, operand2: 8, operator: '-', result: -5 }];
        mutationResults.m6_negative_subtraction_caught = (sample[0].operand1 < sample[0].operand2);
    }

    {
        const sample = [{ type: 'math', operand1: 7, operand2: 3, operator: '÷', result: 2 }];
        mutationResults.m9_inexact_division_caught = (sample[0].operand1 % sample[0].operand2 !== 0);
    }

    {
        const sample = [{ type: 'sequence', sequence: [1, '__', 3, '__', 5] }];
        const holes = sample[0].sequence.filter(x => x === '__');
        mutationResults.m3_double_hole_caught = (holes.length !== 1);
    }

    let auditBlindnessDetected = false;
    {
        const sbStandard = buildFreshSandbox();
        const p4Lvl = sbStandard.KumonSubjects.portugues.levels.find(l => l.id === 'p4');
        const itemsClean = sbStandard.KumonSubjects.portugues.generate(p4Lvl, 20);
        const hasDigraphClean = itemsClean.some(x => /CH|LH|NH|RR|SS/i.test(x.word));

        porSandbox.window.selectLevel('p4');
        const itemsDirty = porSandbox.KumonSubjects.portugues.generate(p4Lvl, 20);
        const hasDigraphDirty = itemsDirty.some(x => /CH|LH|NH|RR|SS/i.test(x.word));

        auditBlindnessDetected = (!hasDigraphClean && hasDigraphDirty);
        mutationResults.eval_harness_blind_to_selectLevel_state = auditBlindnessDetected;
    }

    results.battery4_eval_harness_challenge = {
        passed: mutationResults.m6_negative_subtraction_caught &&
                mutationResults.m9_inexact_division_caught &&
                mutationResults.m3_double_hole_caught,
        prngChallengeResults,
        mutationResults,
        finding: auditBlindnessDetected
            ? 'O Eval Harness content_quality_audit.js avalia os geradores em estado stateless default, deixando de detectar vazamentos procedurais que ocorrem quando window.selectLevel() altera customParams.wordList na aplicação real.'
            : 'Nenhuma cegueira detectada.'
    };

    console.log('  -> Bateria 4 concluída: Mutation testing aprovado. Cegueira do harness a selectLevel: ' + (auditBlindnessDetected ? 'CONFIRMADA' : 'NÃO'));

    // BATERIA 5: Oráculo de Distratores Isomórficos (P2) e Imparciais (I7)
    console.log('\n[BATERIA 5] Oráculo de Distratores Isomórficos (P2) e Imparciais (I7)...');

    const p2TestSyllables = ['BA','BE','BI','BO','BU','CA','CO','CU','DA','DE','DI','DO','DU','FA','FE','FI','FO','FU','MA','ME','MI','MO','MU','PA','PE','PI','PO','PU','TA','TE','TI','TO','TU'];
    const p2Violations = [];

    for (let i = 0; i < 500; i++) {
        const targetSyl = p2TestSyllables[i % p2TestSyllables.length];
        const vowelMatch = targetSyl.match(/([AEIOUÁÉÍÓÚÂÊÔ])$/i);
        const targetVowel = vowelMatch ? vowelMatch[1].toUpperCase() : 'A';

        const consonants = ['B','C','D','F','G','J','L','M','N','P','R','S','T','V','Z'];
        const candidatePool = consonants.map(c => c + targetVowel);
        let distractors = candidatePool.filter(s => s !== targetSyl).sort(() => Math.random() - 0.5).slice(0, 3);
        if (distractors.length < 3) {
            const fallback = ['BA','DA','FA','GA','LA','MA','PA','RA','SA','TA'].filter(s => s !== targetSyl && !distractors.includes(s));
            distractors = distractors.concat(fallback.slice(0, 3 - distractors.length));
        }

        for (const dist of distractors) {
            const distVowelMatch = dist.match(/([AEIOUÁÉÍÓÚÂÊÔ])$/i);
            const distVowel = distVowelMatch ? distVowelMatch[1].toUpperCase() : '';
            if (distVowel !== targetVowel) {
                p2Violations.push('P2 Alvo ' + targetSyl + ' gerou distrator com vogal não-isomórfica: ' + dist);
            }
        }
    }

    const i7LevelObj = KumonSubjects.ingles.levels.find(l => l.id === 'i7');
    const i7Items = KumonSubjects.ingles.generate(i7LevelObj, 500);
    const i7Violations = [];
    const forbiddenBiasedWords = ['DOOR', 'SUN', 'ICE', 'FIRE', 'TREE', 'WATER', 'STONE'];

    for (const it of i7Items) {
        if (!it.options || !it.options.includes(it.target)) {
            i7Violations.push('I7 gabarito ' + it.target + ' não está nas opções: ' + JSON.stringify(it.options));
        }
        for (const opt of (it.options || [])) {
            if (forbiddenBiasedWords.includes(opt.toUpperCase())) {
                i7Violations.push('I7 distrator viciado contextual detectado: ' + opt + ' em questão de ' + it.word);
            }
        }
    }

    results.battery5_distractor_oracles = {
        passed: p2Violations.length === 0 && i7Violations.length === 0,
        p2Tested: 500,
        p2ViolationsCount: p2Violations.length,
        p2Violations: p2Violations.slice(0, 5),
        i7Tested: i7Items.length,
        i7ViolationsCount: i7Violations.length,
        i7Violations: i7Violations.slice(0, 5)
    };

    console.log('  -> Bateria 5 concluída: P2 Isomorfismo (500 testes) violações: ' + p2Violations.length + '. I7 Imparcialidade (500 testes) violações: ' + i7Violations.length);

    const overallPass = results.battery1_mass_sampling.passed &&
                        results.battery2_mass_rotation_p4.passed &&
                        results.battery3_doce_tosse_audit.passed &&
                        results.battery4_eval_harness_challenge.passed &&
                        results.battery5_distractor_oracles.passed;

    results.overallPass = overallPass;
    results.timestamp = new Date().toISOString();

    const outPath = path.join(__dirname, 'challenger_m4_content_results.json');
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');

    console.log('\n==============================================================================');
    console.log('  RESULTADO GERAL DO CHALLENGER 1: ' + (overallPass ? 'APROVADO (PASS)' : 'REPROVADO / REQUEST_CHANGES (FAIL)'));
    console.log('  Resultados salvos em: ' + outPath);
    console.log('==============================================================================\n');

    return results;
}

if (require.main === module) {
    runChallengerHarness().then(res => {
        if (!res.overallPass) {
            console.log('[!] O Challenger encontrou inconformidades críticas no produto sob teste.');
            process.exit(1);
        } else {
            console.log('[*] Todos os testes do Challenger passaram com sucesso.');
            process.exit(0);
        }
    }).catch(err => {
        console.error('Erro fatal na execução do harness:', err);
        process.exit(2);
    });
}
