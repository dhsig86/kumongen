// progression-engine.js — Motor Canônico de Trilhas Progressivas, Adaptação Bidirecional, Ligas & Ranking Pessoal (KumonGen 4.5)
(function(global) {
    'use strict';

    const LEAGUES = [
        { id: 'seed', name: 'Semente', short: 'Semente', icon: '🌱', minXp: 0, color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' },
        { id: 'bronze', name: 'Explorador Bronze', short: 'Bronze', icon: '🥉', minXp: 150, color: '#b45309', bg: '#fef3c7', border: '#fcd34d' },
        { id: 'silver', name: 'Guardião Prata', short: 'Prata', icon: '🥈', minXp: 450, color: '#475569', bg: '#f1f5f9', border: '#cbd5e1' },
        { id: 'gold', name: 'Mestre Ouro', short: 'Ouro', icon: '🥇', minXp: 900, color: '#a16207', bg: '#fef9c3', border: '#fde047' },
        { id: 'diamond', name: 'Ás Diamante', short: 'Diamante', icon: '💎', minXp: 1600, color: '#0369a1', bg: '#e0f2fe', border: '#7dd3fc' },
        { id: 'galactic', name: 'Estrela Galáctica', short: 'Galáctica', icon: '🚀', minXp: 2600, color: '#6d28d9', bg: '#f3e8ff', border: '#c4b5fd' },
        { id: 'legend', name: 'Lenda Kumon', short: 'Lenda', icon: '👑', minXp: 4000, color: '#be123c', bg: '#ffe4e6', border: '#fda4af' }
    ];

    const RIVAL_MASCOTS = [
        { id: 'rival_finho', name: 'Finho Aprendiz', avatar: 'assets/mascotes/golfinho_avatar.png', xp: 180, isRival: true },
        { id: 'rival_lango', name: 'Lango Veloz', avatar: 'assets/mascotes/calango_avatar.png', xp: 600, isRival: true },
        { id: 'rival_capi', name: 'Capi Constante', avatar: 'assets/mascotes/capivara_avatar.png', xp: 1250, isRival: true },
        { id: 'rival_jade', name: 'Jade Mestre', avatar: 'assets/mascotes/jaguar_avatar.png', xp: 2400, isRival: true }
    ];

    const SUBJECT_CURRICULUM_ORDER = {
        matematica: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10'],
        portugues: ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'],
        ingles: ['i1', 'i2', 'i3', 'i4', 'i5', 'i6', 'i7']
    };

    const SKILL_LABELS = {
        'math:qty': 'Contagem e Quantidades',
        'math:seq': 'Sequências Numéricas',
        'math:tens': 'Dezenas e Unidades',
        'math:compare': 'Comparação (<, >, =)',
        'math:neighbors': 'Antecessor e Sucessor',
        'math:fraction': 'Frações Visuais',
        'math:missing': 'Incógnita Kumon (__)',
        'math:+:over10': 'Adição com Soma > 10',
        'math:-:over10': 'Subtração Ampliada (até 20)',
        'por:p1': 'Traçado e Alfabeto',
        'por:p2': 'Famílias Silábicas Simples',
        'por:p3': 'Palavras Dissílabas',
        'por:p4': 'Palavras Trissílabas/Polissílabas',
        'por:p5': 'Encontros Consonantais (BR/CR/BL...)',
        'por:p6': 'Dígrafos (CH/LH/NH/QU/GU)',
        'por:p7': 'Rimas e Consciência Fonológica',
        'por:p8': 'Formação de Frases',
        'eng:i1': 'English Alphabet Tracing',
        'eng:i2': 'CVC Phonics (3 letras)',
        'eng:i3': 'Palavras 4-5 Letras / Dígrafos',
        'eng:i4': 'Sight Words (Snap Words)',
        'eng:i5': 'Magic E (Vogal Longa CVCe)',
        'eng:i6': 'Montagem de Frases em Inglês',
        'eng:i7': 'Opostos (Antonyms)'
    };

    function _roundMult(val) {
        return Math.round(val * 100) / 100;
    }

    function _buildMathOpTrack(op, verbName, startFactor, maxFactor) {
        const opCode = op === '+' ? 'add' : (op === '-' ? 'sub' : (op === '×' ? 'mul' : 'div'));
        const stages = [];
        let stageNum = 1;
        for (let f = startFactor; f <= maxFactor; f++) {
            const diffTag = f <= 3 ? 'Iniciante' : (f <= 6 ? 'Intermediário' : 'Firme');
            stages.push({
                stage: stageNum++,
                shortLabel: `${op}${f}`,
                label: `${verbName} fixa ${op}${f}`,
                badge: diffTag,
                xpMultiplier: _roundMult(1.0 + (stageNum - 2) * 0.05),
                expectedSec: f <= 3 ? 6 : (f <= 6 ? 7 : 9),
                skillTag: `math:${op}:${opCode}_f${f}`,
                handicap: { mode: 'focus', value: f },
                min: (op === '-' && f === 1) ? 2 : 1,
                max: (op === '×' || op === '÷') ? 10 : 9,
                mathMissingHole: false
            });
        }

        const basicTop = 5;
        stages.push({
            stage: stageNum++,
            shortLabel: `${op}${startFactor}..${basicTop}`,
            label: `${verbName} mista (${startFactor} a ${basicTop})`,
            badge: 'Misto Suave',
            xpMultiplier: 1.5,
            expectedSec: 8,
            skillTag: `math:${op}:${opCode}_mix_basic`,
            handicap: { mode: 'mixed_basic' },
            min: 1,
            max: 9,
            mathMissingHole: false
        });

        stages.push({
            stage: stageNum++,
            shortLabel: `Master ${startFactor}..${maxFactor}`,
            label: `${verbName} completa (${startFactor} a ${maxFactor})`,
            badge: 'Master',
            xpMultiplier: 1.65,
            expectedSec: 9,
            skillTag: `math:${op}:${opCode}_mix_full`,
            handicap: { mode: 'mixed_full' },
            min: (op === '+' || op === '-') ? 2 : 1,
            max: 10,
            mathMissingHole: false
        });

        if (op === '+' || op === '-') {
            stages.push({
                stage: stageNum++,
                shortLabel: `${op} até 20`,
                label: `${verbName} ampliada (até 20+)`,
                badge: 'Avançado',
                xpMultiplier: 1.85,
                expectedSec: 11,
                skillTag: op === '+' ? 'math:+:over10' : 'math:-:over10',
                handicap: { mode: 'mixed_full' },
                min: op === '+' ? 6 : 11,
                max: op === '+' ? 14 : 19,
                minSum: op === '+' ? 11 : undefined,
                mathMissingHole: false
            });
        }

        stages.push({
            stage: stageNum++,
            shortLabel: `Incógnita __`,
            label: `Desafio Kumon (__ ${op} b = c)`,
            badge: 'Desafio Ninja',
            xpMultiplier: 2.1,
            expectedSec: 12,
            skillTag: 'math:missing',
            handicap: { mode: 'mixed_full' },
            min: (op === '+' || op === '-') ? 2 : 1,
            max: (op === '+' || op === '-') ? 12 : 10,
            mathMissingHole: true
        });

        return stages;
    }

    function _buildAlphaTraceTrack(subPrefix = 'por:p1') {
        return [
            { stage: 1, shortLabel: 'Vogais', label: 'Vogais (A, E, I, O, U)', badge: 'Base', xpMultiplier: 1.0, expectedSec: 10, skillTag: subPrefix, traceSubset: ['A', 'E', 'I', 'O', 'U'] },
            { stage: 2, shortLabel: 'A até M', label: 'Primeira metade (A–M)', badge: 'Progresso', xpMultiplier: 1.2, expectedSec: 11, skillTag: subPrefix, traceSubset: 'ABCDEFGHIJKLM'.split('') },
            { stage: 3, shortLabel: 'N até Z', label: 'Segunda metade (N–Z)', badge: 'Expansão', xpMultiplier: 1.35, expectedSec: 11, skillTag: subPrefix, traceSubset: 'NOPQRSTUVWXYZ'.split('') },
            { stage: 4, shortLabel: 'A–Z Tudo', label: 'Alfabeto completo (A–Z)', badge: 'Maestria', xpMultiplier: 1.6, expectedSec: 12, skillTag: subPrefix, traceSubset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('') }
        ];
    }

    function _buildVocabStageTrack(labels, skillTag = null, baseExpected = 9) {
        const mults = [1.0, 1.25, 1.55, 1.85];
        const badges = ['Base', 'Progresso', 'Avançado', 'Maestria'];
        return labels.map((lbl, idx) => ({
            stage: idx + 1,
            vocabStage: idx + 1,
            shortLabel: lbl.short,
            label: lbl.full,
            badge: badges[idx] || 'Maestria',
            xpMultiplier: mults[idx] || 1.6,
            expectedSec: Math.round(baseExpected + idx * 1.5),
            skillTag: skillTag || lbl.skillTag || null
        }));
    }

    const CUSTOM_STAGE_TRACKS = {
        matematica: {
            m1: [
                { stage: 1, shortLabel: '1 a 5', label: 'Quantidades iniciais (1 a 5)', badge: 'Base', xpMultiplier: 1.0, expectedSec: 6, skillTag: 'math:qty', qtyNumbers: [1, 2, 3, 4, 5] },
                { stage: 2, shortLabel: '1 a 7', label: 'Contagem expandida (1 a 7)', badge: 'Progresso', xpMultiplier: 1.2, expectedSec: 7, skillTag: 'math:qty', qtyNumbers: [1, 2, 3, 4, 5, 6, 7] },
                { stage: 3, shortLabel: '1 a 10', label: 'Dezena inicial (1 a 10)', badge: 'Master', xpMultiplier: 1.45, expectedSec: 8, skillTag: 'math:qty', qtyNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
                { stage: 4, shortLabel: '6 a 12', label: 'Agrupamentos maiores (6 a 12)', badge: 'Avançado', xpMultiplier: 1.7, expectedSec: 10, skillTag: 'math:qty', qtyNumbers: [6, 7, 8, 9, 10, 11, 12] }
            ],
            m2: _buildMathOpTrack('+', 'Adição', 1, 9),
            m3: [
                { stage: 1, shortLabel: 'Passo +1', label: 'Trilhas curtas (passo +1)', badge: 'Base', xpMultiplier: 1.0, expectedSec: 8, skillTag: 'math:seq', seqFixed: true, seqStep: 1, seqHoles: 1 },
                { stage: 2, shortLabel: 'Até 20', label: 'Sequências livres até 20', badge: 'Progresso', xpMultiplier: 1.25, expectedSec: 9, skillTag: 'math:seq', seqFixed: false, seqStep: 1, seqHoles: 1, seqMinStart: 5, seqMaxStart: 15 },
                { stage: 3, shortLabel: '+2 e +5', label: 'Saltos de +2 e +5', badge: 'Avançado', xpMultiplier: 1.5, expectedSec: 11, skillTag: 'math:seq', seqFixed: false, seqStep: 2, seqSteps: [2, 5], seqHoles: 1, seqMinStart: 2, seqMaxStart: 20 },
                { stage: 4, shortLabel: '+3 / Inversa', label: 'Sequências de +3 e inversas', badge: 'Master', xpMultiplier: 1.8, expectedSec: 12, skillTag: 'math:seq', seqFixed: false, seqStep: 3, seqSteps: [3, -1, -2], seqAllowReverse: true, seqHoles: 1, seqMinStart: 10, seqMaxStart: 30 }
            ],
            m4: [
                { stage: 1, shortLabel: '10–19 Ord.', label: 'Dezena 10–19 sequencial', badge: 'Base', xpMultiplier: 1.0, expectedSec: 7, skillTag: 'math:tens', tensDezena: 1, tensSequencial: true },
                { stage: 2, shortLabel: '10–19 Misto', label: 'Dezena 10–19 misturada', badge: 'Progresso', xpMultiplier: 1.25, expectedSec: 8, skillTag: 'math:tens', tensDezena: 1, tensSequencial: false },
                { stage: 3, shortLabel: '20–49', label: 'Dezenas médias (20 a 49)', badge: 'Avançado', xpMultiplier: 1.5, expectedSec: 10, skillTag: 'math:tens', tensDezena: 3, tensDezenas: [2, 3, 4], tensSequencial: false },
                { stage: 4, shortLabel: '50–99', label: 'Dezenas altas (50 a 99)', badge: 'Master', xpMultiplier: 1.75, expectedSec: 11, skillTag: 'math:tens', tensDezena: 7, tensDezenas: [5, 6, 7, 8, 9], tensSequencial: false }
            ],
            m5: [
                { stage: 1, shortLabel: '1 a 10', label: 'Comparação básica (1 a 10)', badge: 'Base', xpMultiplier: 1.0, expectedSec: 6, skillTag: 'math:compare', compRandom: false, compMin: 1, compMax: 10 },
                { stage: 2, shortLabel: '1 a 20', label: 'Comparação média (1 a 20)', badge: 'Progresso', xpMultiplier: 1.25, expectedSec: 7, skillTag: 'math:compare', compRandom: true, compMin: 1, compMax: 20 },
                { stage: 3, shortLabel: '10 a 50', label: 'Comparação até 50', badge: 'Avançado', xpMultiplier: 1.55, expectedSec: 8, skillTag: 'math:compare', compRandom: true, compMin: 10, compMax: 50 },
                { stage: 4, shortLabel: '10 a 99', label: 'Comparação de dezenas (10–99)', badge: 'Master', xpMultiplier: 1.8, expectedSec: 9, skillTag: 'math:compare', compRandom: true, compMin: 10, compMax: 99 }
            ],
            m6: _buildMathOpTrack('-', 'Subtração', 1, 9),
            m7: [
                { stage: 1, shortLabel: '2 a 15', label: 'Vizinhos iniciais (2 a 15)', badge: 'Base', xpMultiplier: 1.0, expectedSec: 8, skillTag: 'math:neighbors', neighborCenters: [3, 5, 7, 9, 11, 13, 15] },
                { stage: 2, shortLabel: '10 a 30', label: 'Vizinhos até 30', badge: 'Progresso', xpMultiplier: 1.25, expectedSec: 9, skillTag: 'math:neighbors', neighborCenters: [10, 12, 15, 18, 20, 25, 29, 30] },
                { stage: 3, shortLabel: '25 a 70', label: 'Vizinhos médios (25 a 70)', badge: 'Avançado', xpMultiplier: 1.55, expectedSec: 11, skillTag: 'math:neighbors', neighborCenters: [26, 30, 39, 42, 50, 59, 65, 70] },
                { stage: 4, shortLabel: '50 a 120', label: 'Vizinhos com centena (50–120)', badge: 'Master', xpMultiplier: 1.85, expectedSec: 12, skillTag: 'math:neighbors', neighborCenters: [51, 69, 80, 99, 100, 105, 119] }
            ],
            m8: _buildMathOpTrack('×', 'Tabuada', 2, 9),
            m9: _buildMathOpTrack('÷', 'Divisão', 2, 9),
            m10: [
                { stage: 1, shortLabel: '1/2 a 1/4', label: 'Metades, terços e quartos', badge: 'Base', xpMultiplier: 1.0, expectedSec: 9, skillTag: 'math:fraction', fractionSlice: [0, 6] },
                { stage: 2, shortLabel: 'Até Sextos', label: 'Metades até quintos e sextos', badge: 'Progresso', xpMultiplier: 1.3, expectedSec: 10, skillTag: 'math:fraction', fractionSlice: [0, 15] },
                { stage: 3, shortLabel: 'Quintos/Décimos', label: 'Quintos, oitavos e décimos', badge: 'Avançado', xpMultiplier: 1.6, expectedSec: 12, skillTag: 'math:fraction', fractionSlice: [6, 27] },
                { stage: 4, shortLabel: 'Todas', label: 'Todas as frações mistas', badge: 'Master', xpMultiplier: 1.85, expectedSec: 13, skillTag: 'math:fraction', fractionSlice: [0, 27] }
            ]
        },
        portugues: {
            p1: _buildAlphaTraceTrack('por:p1'),
            p2: _buildVocabStageTrack([
                { short: 'Famílias B–F', full: 'Sílabas iniciais (BA a FU)' },
                { short: 'Famílias G–L', full: 'Sílabas intermediárias (GA a LU)' },
                { short: 'Famílias M–R', full: 'Sílabas médias (MA a RU)' },
                { short: 'S–Z & Completo', full: 'Famílias S–Z e revisão geral' }
            ], 'por:p2', 8),
            p3: _buildVocabStageTrack([
                { short: 'CV com A / O', full: 'Dissílabas puras com A e O (BOLA, CASA, GATO...)' },
                { short: 'CV com E / I / U', full: 'Dissílabas com E, I e U (LIMA, DOCE, FOGO...)' },
                { short: 'Cotidiano +', full: 'Vocabulário ampliado (MESA, PIPA, SOPA, MAPA...)' },
                { short: 'Ditongos/Acentos', full: 'Ditongos, acentos e travadas (LEÃO, CAFÉ, NUVEM...)' }
            ], 'por:p3', 9),
            p4: _buildVocabStageTrack([
                { short: 'Trissíl. Base', full: 'Trissílabas regulares CV (BANANA, PIPOCA, SAPATO...)' },
                { short: 'Acentos & Sons', full: 'Trissílabas variadas (JACARÉ, PICOLÉ, GIRAFA...)' },
                { short: 'Dígrafos/Encontr.', full: 'Palavras com NH, LH, CH e encontros (GALINHA, ESCOLA...)' },
                { short: 'Polissílabas 4–5', full: 'Palavras longas (BICICLETA, BORBOLETA, DINOSSAURO...)' }
            ], 'por:p4', 11),
            p5: _buildVocabStageTrack([
                { short: 'BR / CR / DR', full: 'Encontros iniciais (BRA a DRU)' },
                { short: 'FR / GR / PR / TR', full: 'Encontros com R (FRA a TRU)' },
                { short: 'BL / CL / FL / GL / PL', full: 'Encontros com L (BLA a PLU)' },
                { short: 'Todos Mistos', full: 'Revisão completa de sílabas complexas' }
            ], 'por:p5', 10),
            p6: _buildVocabStageTrack([
                { short: 'Dígrafo CH', full: 'Família silábica CH (CHA a CHU)' },
                { short: 'Dígrafo LH', full: 'Família silábica LH (LHA a LHU)' },
                { short: 'Dígrafo NH', full: 'Família silábica NH (NHA a NHU)' },
                { short: 'QU / GU & Tudo', full: 'QU, GU e revisão completa dos dígrafos' }
            ], 'por:p6', 10),
            p7: _buildVocabStageTrack([
                { short: 'Rimas Diretas', full: 'Terminações -ATO, -OLA, -ÃO, -ASA' },
                { short: 'Rimas Cotidianas', full: 'Terminações -ELA, -UVA, -OR, -ECA' },
                { short: 'Rimas Trissíl.', full: 'Rimas médias (-ADO, -ENTE, -IM, -OCA)' },
                { short: 'Rimas Complexas', full: 'Terminações -ELHO, -EIXE, -ENTO, -OURA' }
            ], 'por:p7', 9),
            p8: _buildVocabStageTrack([
                { short: '3 Blocos Base', full: 'Frases curtas diretas (O GATO BEBE LEITE...)' },
                { short: 'Animais & Ações', full: 'Frases de ações cotidianas e animais' },
                { short: 'Natureza/Escola', full: 'Frases de escola, natureza e clima' },
                { short: 'Frases Completas', full: 'Frases descritivas com adjetivos e rotina' }
            ], 'por:p8', 13)
        },
        ingles: {
            i1: _buildAlphaTraceTrack('eng:i1'),
            i2: _buildVocabStageTrack([
                { short: 'Vogais A / O', full: 'Short A & O CVC (CAT, HAT, MAP, DOG, BOX...)' },
                { short: 'Vogais I / E', full: 'Short I & E CVC (PIG, KID, BED, PEN, HEN...)' },
                { short: 'Vogal U & Misto', full: 'Short U & mixed CVC (SUN, BUS, CUP, FOX, RUN...)' },
                { short: 'Desafio CVC', full: 'Expanded CVC mastery (CAB, WEB, PET, CUB, JUG...)' }
            ], 'eng:i2', 9),
            i3: _buildVocabStageTrack([
                { short: 'Blends L / R / S', full: 'Initial blends (FROG, CRAB, TREE, STAR, SWIM...)' },
                { short: 'Dígrafos SH/CH/TH', full: 'Digraphs SH, CH, TH, WH (FISH, SHIP, MATH, CHAT...)' },
                { short: 'Finais CK/NG/LL', full: 'Endings CK, NG, LL, ND, MP (DUCK, KING, BELL, JUMP...)' },
                { short: 'Vogais Longas 5L', full: '5-letter & vowel teams (SNAIL, CLOUD, TRAIN, CHAIR...)' }
            ], 'eng:i3', 10),
            i4: _buildVocabStageTrack([
                { short: 'Core Pre-Primer', full: 'Essential base words (THE, AND, IS, YOU, CAN, SEE...)' },
                { short: 'Primer Essenciais', full: 'High-frequency verbs & helpers (ARE, WAS, LIKE, PLAY...)' },
                { short: 'TH / WH & Links', full: 'Question & TH words (THIS, THAT, THEY, WHEN, WHAT...)' },
                { short: 'Fluência 1º–2º', full: 'Grade 1-2 Snap Words (AFTER, COULD, EVERY, WATER...)' }
            ], 'eng:i4', 9),
            i5: _buildVocabStageTrack([
                { short: 'Magic E · A_E', full: 'Long A with silent E (CAKE, GATE, LAKE, NAME...)' },
                { short: 'Magic E · I_E', full: 'Long I with silent E (BIKE, KITE, FIVE, TIME...)' },
                { short: 'Magic E · O_E/U_E', full: 'Long O & U with silent E (HOME, BONE, CUTE, TUBE...)' },
                { short: 'Blends + Magic E', full: '5-letter Magic E blends (GLOBE, SNAKE, PLANE, WHALE...)' }
            ], 'eng:i5', 10),
            i6: _buildVocabStageTrack([
                { short: '3 Blocos Base', full: 'Starter sentences (I SEE A CAT, THE DOG IS BIG...)' },
                { short: 'Ações com CAN', full: 'Action verbs & CAN (THE BIRD CAN FLY, HE CAN RUN...)' },
                { short: 'Escola & Natureza', full: 'School & nature sentences (SHE READS A GOOD BOOK...)' },
                { short: 'Rotina & Detalhes', full: 'Full descriptive sentences (WE STUDY MATH EVERY MORNING...)' }
            ], 'eng:i6', 13),
            i7: _buildVocabStageTrack([
                { short: 'Básicos Visuais', full: 'Core opposites (BIG/SMALL, HOT/COLD, UP/DOWN...)' },
                { short: 'Sensoriais', full: 'Physical & sensory pairs (HARD/SOFT, WET/DRY, SWEET/SOUR...)' },
                { short: 'Tempo & Espaço', full: 'Time & direction pairs (NEAR/FAR, EARLY/LATE, LEFT/RIGHT...)' },
                { short: 'Qualidades/Ações', full: 'Abstract & action pairs (STRONG/WEAK, EASY/DIFFICULT, PUSH/PULL...)' }
            ], 'eng:i7', 9)
        }
    };

    function getStagesForLevel(subjectKey, levelId) {
        const subMap = CUSTOM_STAGE_TRACKS[subjectKey] || CUSTOM_STAGE_TRACKS.matematica;
        if (subMap && Array.isArray(subMap[levelId])) {
            return subMap[levelId];
        }
        return [
            { stage: 1, shortLabel: 'Iniciante', label: 'Nível Base', badge: 'Base', xpMultiplier: 1.0, expectedSec: 9 },
            { stage: 2, shortLabel: 'Intermediário', label: 'Treino Intermediário', badge: 'Progresso', xpMultiplier: 1.25, expectedSec: 10 },
            { stage: 3, shortLabel: 'Master', label: 'Desafio Completo', badge: 'Master', xpMultiplier: 1.5, expectedSec: 11 }
        ];
    }

    function clampStage(subjectKey, levelId, stageIndex) {
        const stages = getStagesForLevel(subjectKey, levelId);
        const maxStage = stages.length;
        const parsed = parseInt(stageIndex, 10);
        if (!Number.isFinite(parsed) || parsed < 1) return 1;
        return Math.min(maxStage, parsed);
    }

    function getStageSpec(subjectKey, levelId, stageIndex) {
        const stages = getStagesForLevel(subjectKey, levelId);
        const clamped = clampStage(subjectKey, levelId, stageIndex);
        return stages[clamped - 1] || stages[0];
    }

    function stageToGeneratorOptions(subjectKey, levelId, stageIndex) {
        const spec = getStageSpec(subjectKey, levelId, stageIndex);
        const opts = { stage: spec.stage };
        if (spec.handicap) opts.handicap = { ...spec.handicap };
        if (spec.min !== undefined) opts.min = spec.min;
        if (spec.max !== undefined) opts.max = spec.max;
        if (spec.minSum !== undefined) opts.minSum = spec.minSum;
        if (spec.mathMissingHole !== undefined) opts.mathMissingHole = !!spec.mathMissingHole;
        if (spec.qtyNumbers) opts.qtyNumbers = spec.qtyNumbers;
        if (spec.seqFixed !== undefined) opts.seqFixed = spec.seqFixed;
        if (spec.seqStep !== undefined) opts.seqStep = spec.seqStep;
        if (spec.seqSteps) opts.seqSteps = spec.seqSteps;
        if (spec.seqAllowReverse !== undefined) opts.seqAllowReverse = !!spec.seqAllowReverse;
        if (spec.seqHoles !== undefined) opts.seqHoles = spec.seqHoles;
        if (spec.seqMinStart !== undefined) opts.seqMinStart = spec.seqMinStart;
        if (spec.seqMaxStart !== undefined) opts.seqMaxStart = spec.seqMaxStart;
        if (spec.tensDezena !== undefined) opts.tensDezena = spec.tensDezena;
        if (spec.tensDezenas) opts.tensDezenas = spec.tensDezenas;
        if (spec.tensSequencial !== undefined) opts.tensSequencial = spec.tensSequencial;
        if (spec.compRandom !== undefined) opts.compRandom = spec.compRandom;
        if (spec.compMin !== undefined) opts.compMin = spec.compMin;
        if (spec.compMax !== undefined) opts.compMax = spec.compMax;
        if (spec.neighborCenters) opts.neighborCenters = spec.neighborCenters;
        if (spec.fractionSlice) opts.fractionSlice = spec.fractionSlice;
        if (spec.traceSubset) opts.traceSubset = spec.traceSubset;
        if (spec.vocabStage !== undefined) opts.vocabStage = spec.vocabStage;
        if (spec.poolRatio !== undefined) opts.poolRatio = spec.poolRatio;
        return opts;
    }

    function findStageFromHandicap(subjectKey, levelId, handicap) {
        const stages = getStagesForLevel(subjectKey, levelId);
        if (!handicap || typeof handicap !== 'object') return 1;
        if (handicap.mode === 'focus') {
            const match = stages.find(s => s.handicap && s.handicap.mode === 'focus' && Number(s.handicap.value) === Number(handicap.value));
            if (match) return match.stage;
        }
        if (handicap.mode === 'mixed_basic') {
            const match = stages.find(s => s.handicap && s.handicap.mode === 'mixed_basic');
            if (match) return match.stage;
        }
        if (handicap.mode === 'mixed_full') {
            const match = stages.find(s => s.handicap && s.handicap.mode === 'mixed_full' && !s.mathMissingHole);
            if (match) return match.stage;
        }
        return 1;
    }

    // Classifica qualquer questão num padrão pedagógico legível (para Radar de Fraquezas & Mistura Adaptativa)
    function getItemSkillTag(item, subjectKey = 'matematica', levelId = 'm2') {
        const sKey = (item && item._reviewSubjectKey) || subjectKey || 'matematica';
        const lId = (item && item._reviewLevelId) || levelId || 'm2';
        if (!item || typeof item !== 'object') {
            const lbl = SKILL_LABELS[`${sKey === 'portugues' ? 'por' : (sKey === 'ingles' ? 'eng' : 'math')}:${lId}`] || `${sKey} (${lId})`;
            return { tag: `${sKey}:${lId}`, label: lbl, subjectKey: sKey, levelId: lId };
        }

        if (item.type === 'math') {
            const op = item.operator || '+';
            const opWord = op === '+' ? 'Adição' : (op === '-' ? 'Subtração' : (op === '×' || op === '*' ? 'Tabuada' : 'Divisão'));
            const opCode = op === '+' ? 'add' : (op === '-' ? 'sub' : (op === '×' || op === '*' ? 'mul' : 'div'));
            if (item.missingPos) {
                return { tag: 'math:missing', label: `Incógnita (${opWord} __)`, subjectKey: 'matematica', levelId: lId };
            }
            const o1 = Number(item.operand1) || 0;
            const o2 = Number(item.operand2) || 0;
            const isExtendedAdd = (op === '+' && (o1 >= 10 || o2 >= 10));
            const isExtendedSub = (op === '-' && (o2 >= 10 || (o1 > 10 && (o1 - o2) > 9)));
            if (isExtendedAdd || isExtendedSub) {
                return {
                    tag: op === '+' ? 'math:+:over10' : 'math:-:over10',
                    label: op === '+' ? 'Adição ampliada (parcela ≥ 10)' : 'Subtração ampliada (> 10)',
                    subjectKey: 'matematica',
                    levelId: lId
                };
            }
            const keyFactor = Math.max(1, Math.min(12, o2 || o1));
            return {
                tag: `math:${op}:${opCode}_f${keyFactor}`,
                label: `${opWord} com ${op}${keyFactor}`,
                subjectKey: 'matematica',
                levelId: lId
            };
        }

        const typeToTag = {
            quantity: 'math:qty',
            sequence: 'math:seq',
            tens: 'math:tens',
            compare: 'math:compare',
            neighbors: 'math:neighbors',
            fraction: 'math:fraction'
        };
        if (typeToTag[item.type]) {
            const tag = typeToTag[item.type];
            return { tag, label: SKILL_LABELS[tag] || tag, subjectKey: 'matematica', levelId: lId };
        }

        const pref = sKey === 'ingles' ? 'eng' : (sKey === 'portugues' ? 'por' : 'math');
        const fullTag = `${pref}:${lId}`;
        return {
            tag: fullTag,
            label: SKILL_LABELS[fullTag] || `${sKey.toUpperCase()} · ${lId.toUpperCase()}`,
            subjectKey: sKey,
            levelId: lId
        };
    }

    function getExpectedItemSec(subjectKey = 'matematica', levelId = 'm2', stageIndex = 1, item = null) {
        const spec = getStageSpec(subjectKey, levelId, stageIndex);
        let base = (spec && spec.expectedSec) ? spec.expectedSec : 9;
        if (item && item.missingPos) base = Math.max(base, 12);
        if (item && item.type === 'sentence') base = Math.max(base, 14);
        return base;
    }

    function getLeagueForXp(xp) {
        const numericXp = Math.max(0, Math.floor(Number(xp) || 0));
        let current = LEAGUES[0];
        let nextLeague = LEAGUES[1] || null;
        for (let i = 0; i < LEAGUES.length; i++) {
            if (numericXp >= LEAGUES[i].minXp) {
                current = LEAGUES[i];
                nextLeague = LEAGUES[i + 1] || null;
            }
        }
        const floorXp = current.minXp;
        const ceilXp = nextLeague ? nextLeague.minXp : current.minXp;
        const span = Math.max(1, ceilXp - floorXp);
        const progressPct = nextLeague ? Math.min(100, Math.round(((numericXp - floorXp) / span) * 100)) : 100;
        const xpToNext = nextLeague ? Math.max(0, nextLeague.minXp - numericXp) : 0;

        return {
            current,
            next: nextLeague,
            xp: numericXp,
            progressPct,
            xpToNext
        };
    }

    function computeFallbackXpFromGamification(gamif) {
        if (!gamif || typeof gamif !== 'object') return 0;
        if (typeof gamif.xp === 'number' && Number.isFinite(gamif.xp)) {
            return Math.max(0, Math.floor(gamif.xp));
        }
        const stars = Number(gamif.stars) || 0;
        const rounds = Number(gamif.totalRounds) || 0;
        return Math.max(0, stars * 15 + rounds * 25);
    }

    function getRecordKey(subjectKey, levelId, stageIndex) {
        return `${subjectKey}_${levelId}_s${clampStage(subjectKey, levelId, stageIndex)}`;
    }

    function getNextLevelInCurriculum(subjectKey, levelId) {
        const order = SUBJECT_CURRICULUM_ORDER[subjectKey] || [];
        const idx = order.indexOf(levelId);
        if (idx === -1) return order[0] || levelId;
        if (idx + 1 < order.length) return order[idx + 1];
        return null;
    }

    function evaluateRoundProgression(student, params) {
        const subjectKey = (params && params.subjectKey) || 'matematica';
        const levelId = (params && params.levelId) || 'm2';
        const stages = getStagesForLevel(subjectKey, levelId);
        const maxStage = stages.length;
        const currentStage = clampStage(subjectKey, levelId, (params && params.currentStage) || 1);
        const stageSpec = getStageSpec(subjectKey, levelId, currentStage);
        const accuracy = Math.max(0, Math.min(100, Number(params && params.accuracy) || 0));
        const correctFirst = Math.max(0, Number(params && params.correctFirst) || 0);
        const timeSec = Math.max(1, Number(params && params.timeSec) || 1);
        const targetSec = Math.max(60, Number(params && params.targetSec) || 300);

        const parentCtrl = (student && student.parentControls && typeof student.parentControls === 'object')
            ? student.parentControls
            : ((params && params.parentControls) || {});
        const trackKey = `${subjectKey}_${levelId}`;
        const limits = (parentCtrl.trackLimits && parentCtrl.trackLimits[trackKey]) || {};
        const effectiveMinStage = clampStage(subjectKey, levelId, limits.minStage || 1);
        const effectiveMaxStage = Math.max(effectiveMinStage, clampStage(subjectKey, levelId, limits.maxStage || maxStage));

        const promoteThreshold = Math.max(60, Math.min(100, Number(parentCtrl.promoteThreshold) || 80));
        const autoAdvanceEnabled = !(params && params.autoAdvance === false) && (parentCtrl.autoAdvance !== false);
        const autoProtectDownEnabled = !(params && params.autoProtectDown === false) && (parentCtrl.autoProtectDown !== false);

        // Analisa telemetria por item (erros repetidos no mesmo padrão e lentidão/hesitação)
        const itemMetrics = Array.isArray(params && params.itemMetrics) ? params.itemMetrics : [];
        const skillErrorCounts = {};
        let slowCount = 0;
        let totalLatencyMs = 0;
        let maxSameSkillErrors = 0;
        let weakestSkillTag = null;
        itemMetrics.forEach((m) => {
            if (!m) return;
            if (typeof m.latencyMs === 'number' && m.latencyMs > 0) totalLatencyMs += m.latencyMs;
            if (m.slow) slowCount++;
            if (m.wrongCount > 0 || m.slow) {
                const tag = m.skillTag || `${subjectKey}:${levelId}`;
                const weight = (m.wrongCount > 0 ? m.wrongCount : 0) + (m.slow ? 0.5 : 0);
                skillErrorCounts[tag] = (skillErrorCounts[tag] || 0) + weight;
                if (skillErrorCounts[tag] > maxSameSkillErrors) {
                    maxSameSkillErrors = skillErrorCounts[tag];
                    weakestSkillTag = tag;
                }
            }
        });
        const avgResponseSec = itemMetrics.length > 0 ? Math.round((totalLatencyMs / itemMetrics.length) / 100) / 10 : 0;

        const g = (student && student.gamification) || {};
        const prevXp = computeFallbackXpFromGamification(g);
        const prevLeagueInfo = getLeagueForXp(prevXp);
        const records = (g.personalRecords && typeof g.personalRecords === 'object') ? g.personalRecords : {};
        const recKey = getRecordKey(subjectKey, levelId, currentStage);
        const prevRecord = records[recKey] || null;

        const beatSCT = timeSec <= targetSec;
        const baseXp = (correctFirst * 10) + (accuracy >= 100 ? 35 : (accuracy >= 80 ? 20 : 10)) + (beatSCT ? 25 : 0);
        const xpEarned = Math.max(10, Math.round(baseXp * (stageSpec.xpMultiplier || 1.0)));
        const newXp = prevXp + xpEarned;
        const newLeagueInfo = getLeagueForXp(newXp);
        const leagueUp = newLeagueInfo.current.id !== prevLeagueInfo.current.id;

        const isQualifiedForRecord = accuracy >= 80;
        let isNewTimeRecord = false;
        let deltaSec = 0;
        const prevBestTimeSec = prevRecord && prevRecord.bestTimeSec ? prevRecord.bestTimeSec : null;
        if (isQualifiedForRecord && (!prevBestTimeSec || timeSec < prevBestTimeSec)) {
            isNewTimeRecord = true;
            deltaSec = prevBestTimeSec ? (prevBestTimeSec - timeSec) : 0;
        }

        let promoted = false;
        let protectedStepDown = false;
        let reachedParentCap = false;
        let direction = 'hold';
        let nextStage = currentStage;
        let levelMasteredComplete = false;
        let nextLevelId = levelId;
        let supportMessage = '';

        if (autoAdvanceEnabled && accuracy >= promoteThreshold) {
            if (currentStage < effectiveMaxStage) {
                promoted = true;
                direction = 'up';
                nextStage = currentStage + 1;
            } else if (effectiveMaxStage < maxStage) {
                reachedParentCap = true;
                direction = 'cap_hold';
                supportMessage = 'Você dominou até o limite configurado pelos pais!';
            } else {
                direction = 'level_complete';
                levelMasteredComplete = true;
                const candNextLvl = getNextLevelInCurriculum(subjectKey, levelId);
                if (candNextLvl) {
                    nextLevelId = candNextLvl;
                }
            }
        } else if (accuracy < 50 || maxSameSkillErrors >= 4) {
            if (autoProtectDownEnabled && currentStage > effectiveMinStage) {
                protectedStepDown = true;
                direction = 'protect_down';
                nextStage = currentStage - 1;
                supportMessage = 'Vamos fortalecer este passo com calma para ganhar confiança antes do próximo desafio!';
            } else {
                direction = 'reinforce';
                supportMessage = 'Separamos seus pontos de atenção para praticar sem pressa na próxima rodada!';
            }
        } else {
            direction = 'hold';
            supportMessage = accuracy >= 70
                ? 'Muito bom! Mais uma rodada firme aqui consolida sua velocidade.'
                : 'Ótimo esforço! Os itens mais difíceis voltarão em doses suaves para você dominar.';
        }

        const bonusDifficultyStars = (accuracy >= 80 && stageSpec.xpMultiplier >= 1.45) ? 1 : 0;

        return {
            subjectKey,
            levelId,
            currentStage,
            maxStage,
            effectiveMinStage,
            effectiveMaxStage,
            promoteThreshold,
            stageSpec,
            nextStageSpec: getStageSpec(subjectKey, levelId, nextStage),
            promoted,
            protectedStepDown,
            reachedParentCap,
            direction,
            needsReinforcement: !promoted && !levelMasteredComplete,
            supportMessage,
            weakestSkillTag,
            slowCount,
            avgResponseSec,
            nextStage,
            levelMasteredComplete,
            nextLevelId,
            xpEarned,
            xpMultiplier: stageSpec.xpMultiplier || 1.0,
            prevXp,
            newXp,
            prevLeague: prevLeagueInfo.current,
            newLeague: newLeagueInfo.current,
            leagueUp,
            leagueInfo: newLeagueInfo,
            recKey,
            isNewTimeRecord,
            prevBestTimeSec,
            deltaSec,
            bestTimeAfter: (isQualifiedForRecord && (!prevBestTimeSec || timeSec < prevBestTimeSec)) ? timeSec : (prevBestTimeSec || timeSec),
            bestAccuracyAfter: Math.max(prevRecord && prevRecord.bestAccuracy ? prevRecord.bestAccuracy : 0, accuracy),
            bonusDifficultyStars,
            beatSCT
        };
    }

    // Monta lote híbrido (ex.: 70-80% degrau atual + 20-30% erros/hesitações Leitner intercalados)
    function buildAdaptiveSessionItems(options) {
        const opts = options || {};
        const subjectKey = opts.subjectKey || 'matematica';
        const level = opts.level;
        const stage = opts.stage || 1;
        const totalCount = Math.max(1, Number(opts.totalCount) || 10);
        const generatorFn = opts.generatorFn;
        const reviewPool = Array.isArray(opts.reviewItems) ? opts.reviewItems : [];
        const currentRoundNumber = Number(opts.currentRoundNumber) || 0;
        const forceWeaknessMode = !!opts.forceWeaknessMode;
        const rawRatio = (opts.mixRatio !== undefined && opts.mixRatio !== null) ? Number(opts.mixRatio) : 0.25;
        const mixRatio = Math.max(0, Math.min(0.8, Number.isFinite(rawRatio) ? rawRatio : 0.25));

        const cleanClone = (entry) => {
            if (!entry || !entry.item) return null;
            try {
                const clone = JSON.parse(JSON.stringify(entry.item));
                clone._isAdaptiveReview = true;
                clone._reviewId = entry.id || null;
                clone._reviewBox = typeof entry.box === 'number' ? entry.box : 0;
                clone._reviewReason = entry.lastReason || 'error';
                clone._reviewSubjectKey = entry.subjectKey || subjectKey;
                clone._reviewLevelId = entry.levelId || (level && level.id) || 'm2';
                return clone;
            } catch (e) {
                return null;
            }
        };

        // Filtra candidatos válidos da matéria (priorizando mesmo nível e caixas Leitner mais baixas/devidas)
        const sameSubjectDue = reviewPool
            .filter(entry => entry && entry.item && (entry.subjectKey || subjectKey) === subjectKey)
            .filter(entry => {
                if (forceWeaknessMode) return true;
                const dueRound = typeof entry.dueRound === 'number' ? entry.dueRound : 0;
                return dueRound <= currentRoundNumber;
            });

        sameSubjectDue.sort((a, b) => {
            const aSameLvl = (a.levelId === (level && level.id)) ? 0 : 1;
            const bSameLvl = (b.levelId === (level && level.id)) ? 0 : 1;
            if (aSameLvl !== bSameLvl) return aSameLvl - bSameLvl;
            const boxA = typeof a.box === 'number' ? a.box : 0;
            const boxB = typeof b.box === 'number' ? b.box : 0;
            if (boxA !== boxB) return boxA - boxB;
            return (b.attempts || 1) - (a.attempts || 1);
        });

        let targetReviewCount = 0;
        if (sameSubjectDue.length > 0 && (forceWeaknessMode || mixRatio > 0)) {
            if (forceWeaknessMode) {
                targetReviewCount = Math.min(sameSubjectDue.length, Math.max(1, Math.round(totalCount * 0.7)));
            } else {
                const computed = Math.max(1, Math.round(totalCount * mixRatio));
                const maxAllowed = Math.max(1, Math.round(totalCount * Math.min(0.6, Math.max(0.3, mixRatio))));
                targetReviewCount = Math.min(sameSubjectDue.length, computed, maxAllowed);
            }
        }

        const pickedReviews = [];
        const seenIds = new Set();
        for (let i = 0; i < sameSubjectDue.length && pickedReviews.length < targetReviewCount; i++) {
            const ent = sameSubjectDue[i];
            if (ent.id && seenIds.has(ent.id)) continue;
            const cloned = cleanClone(ent);
            if (cloned) {
                pickedReviews.push(cloned);
                if (ent.id) seenIds.add(ent.id);
            }
        }

        const freshNeeded = Math.max(0, totalCount - pickedReviews.length);
        let freshItems = [];
        if (typeof generatorFn === 'function' && level && freshNeeded > 0) {
            freshItems = generatorFn(level, freshNeeded, Object.assign({ stage }, opts.generatorOptions || {})) || [];
        }

        // Sanduíche pedagógico: intercala itens de revisão sem colocar logo no nº 1 nem acumular em bloco
        if (pickedReviews.length === 0) {
            return { items: freshItems, injectedReviewCount: 0, reviewIds: [] };
        }
        if (freshItems.length === 0) {
            return { items: pickedReviews.slice(0, totalCount), injectedReviewCount: pickedReviews.length, reviewIds: pickedReviews.map(it => it._reviewId) };
        }

        const merged = [];
        const step = Math.max(2, Math.floor(totalCount / (pickedReviews.length + 1)));
        let rIdx = 0;
        let fIdx = 0;
        for (let slot = 0; slot < totalCount; slot++) {
            const shouldPlaceReview = rIdx < pickedReviews.length && slot > 0 && (slot % step === step - 1 || fIdx >= freshItems.length);
            if (shouldPlaceReview) {
                merged.push(pickedReviews[rIdx++]);
            } else if (fIdx < freshItems.length) {
                merged.push(freshItems[fIdx++]);
            } else if (rIdx < pickedReviews.length) {
                merged.push(pickedReviews[rIdx++]);
            }
        }

        return {
            items: merged,
            injectedReviewCount: pickedReviews.length,
            reviewIds: pickedReviews.map(it => it._reviewId).filter(Boolean)
        };
    }

    // Serializador compacto UTF-8 -> Base64 URL-safe para compartilhar Missões entre colegas sem servidor
    function encodeShareMission(payload) {
        try {
            const json = JSON.stringify(payload || {});
            let base64 = '';
            if (typeof TextEncoder !== 'undefined' && typeof btoa === 'function') {
                const bytes = new TextEncoder().encode(json);
                let bin = '';
                for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
                base64 = btoa(bin);
            } else if (typeof Buffer !== 'undefined') {
                base64 = Buffer.from(json, 'utf8').toString('base64');
            }
            return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        } catch (e) {
            return '';
        }
    }

    function decodeShareMission(encoded) {
        if (!encoded || typeof encoded !== 'string') return null;
        try {
            let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
            while (b64.length % 4) b64 += '=';
            let json = '';
            if (typeof atob === 'function' && typeof TextDecoder !== 'undefined') {
                const bin = atob(b64);
                const bytes = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
                json = new TextDecoder().decode(bytes);
            } else if (typeof Buffer !== 'undefined') {
                json = Buffer.from(b64, 'base64').toString('utf8');
            }
            const parsed = JSON.parse(json);
            if (!parsed || typeof parsed !== 'object') return null;
            return parsed;
        } catch (e) {
            return null;
        }
    }

    function getRankingBoard(activeStudent, allStudents) {
        const list = Array.isArray(allStudents) && allStudents.length > 0
            ? allStudents
            : (activeStudent ? [activeStudent] : []);

        const entries = [];
        list.forEach(st => {
            const xp = computeFallbackXpFromGamification(st.gamification);
            const league = getLeagueForXp(xp).current;
            const isActive = activeStudent && st.id === activeStudent.id;
            entries.push({
                id: st.id,
                name: st.name || 'Super Aluno',
                mascot: st.mascot || 'jaguar',
                xp,
                stars: (st.gamification && st.gamification.stars) || 0,
                league,
                isRival: false,
                isActive
            });
        });

        RIVAL_MASCOTS.forEach(rv => {
            entries.push({
                id: rv.id,
                name: rv.name,
                avatar: rv.avatar,
                xp: rv.xp,
                stars: Math.floor(rv.xp / 18),
                league: getLeagueForXp(rv.xp).current,
                isRival: true,
                isActive: false
            });
        });

        entries.sort((a, b) => {
            if (b.xp !== a.xp) return b.xp - a.xp;
            if (a.isActive && !b.isActive) return -1;
            if (!a.isActive && b.isActive) return 1;
            return String(a.name).localeCompare(String(b.name));
        });

        let activeRank = 1;
        let nextTarget = null;
        entries.forEach((ent, idx) => {
            ent.rank = idx + 1;
            if (ent.isActive) {
                activeRank = ent.rank;
                if (idx > 0) {
                    const above = entries[idx - 1];
                    nextTarget = {
                        name: above.name,
                        xpGap: Math.max(1, (above.xp - ent.xp) + 1),
                        rank: above.rank
                    };
                }
            }
        });

        return {
            entries,
            activeRank,
            totalEntries: entries.length,
            nextTarget
        };
    }

    const KumonProgression = {
        LEAGUES,
        RIVAL_MASCOTS,
        SUBJECT_CURRICULUM_ORDER,
        SKILL_LABELS,
        getStagesForLevel,
        clampStage,
        getStageSpec,
        stageToGeneratorOptions,
        findStageFromHandicap,
        getItemSkillTag,
        getExpectedItemSec,
        getLeagueForXp,
        computeFallbackXpFromGamification,
        getRecordKey,
        getNextLevelInCurriculum,
        evaluateRoundProgression,
        buildAdaptiveSessionItems,
        encodeShareMission,
        decodeShareMission,
        getRankingBoard
    };

    if (typeof global !== 'undefined') {
        global.KumonProgression = KumonProgression;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = KumonProgression;
    }
})(typeof window !== 'undefined' ? window : globalThis);
