// vocabulary-engine.js — Motor Canônico de Vocabulário Graduado (4 Degraus + Temas), Auto-Separador & Editor Vertical (KumonGen 4.6)
(function(global) {
    'use strict';

    const STORAGE_PREFIX = 'kumongen_custom_vocab_v1_';
    const SHARED_SCOPE_KEY = STORAGE_PREFIX + 'shared';
    const MIGRATION_FLAG_PREFIX = 'kumongen_vocab_migrated_v1_';

    function _esc(str) {
        if (typeof global !== 'undefined' && typeof global.escapeHtml === 'function') {
            return global.escapeHtml(str);
        }
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function _getStorage() {
        if (typeof global !== 'undefined' && global.SafeStorage) return global.SafeStorage;
        if (typeof localStorage !== 'undefined') return localStorage;
        return null;
    }

    function _getActiveStudent() {
        try {
            if (typeof global !== 'undefined' && global.StudentProfileEngine && typeof global.StudentProfileEngine.getActive === 'function') {
                return global.StudentProfileEngine.getActive();
            }
        } catch (e) {}
        return null;
    }

    function _getActiveStudentId(explicitId) {
        if (explicitId) return String(explicitId);
        const st = _getActiveStudent();
        return (st && st.id) ? String(st.id) : 'default';
    }

    // ============================================================
    // 1. TAGS TEMÁTICAS CANÔNICAS
    // ============================================================
    const THEMES = [
        { id: 'all',       label: 'Todos',     emoji: '✨' },
        { id: 'animais',   label: 'Animais',   emoji: '🐾' },
        { id: 'casa',      label: 'Casa',      emoji: '🏠' },
        { id: 'escola',    label: 'Escola',    emoji: '🎒' },
        { id: 'comida',    label: 'Comida',    emoji: '🍎' },
        { id: 'natureza',  label: 'Natureza',  emoji: '🌿' },
        { id: 'cotidiano', label: 'Ações',     emoji: '⚡' }
    ];

    const THEME_MAP = {};
    THEMES.forEach(t => { THEME_MAP[t.id] = t; });

    function _w(word, parts, stage, theme) {
        return { type: 'word', word, parts, stage, theme: theme || 'cotidiano' };
    }
    function _s(sentence, parts, stage, theme) {
        return { type: 'sentence', sentence, parts, stage, theme: theme || 'cotidiano' };
    }
    function _o(word, target, options, icon, stage, theme) {
        return { type: 'opposite', word, target, options, icon, stage, theme: theme || 'cotidiano' };
    }
    function _r(word, target, options, rhymeEnding, stage, theme) {
        return { type: 'rhyme', word, target, options, rhymeEnding, stage, theme: theme || 'cotidiano' };
    }

    // ============================================================
    // 2. CATÁLOGOS GRADUADOS EM 4 DEGRAUS (INGLÊS I2–I7 & PORTUGUÊS P3/P4/P7/P8)
    // ============================================================
    const CATALOG = {
        ingles: {
            // I2: CVC Words (64 palavras únicas — 16 por degrau)
            i2: [
                // Degrau 1: Vogais Curtas A / O
                _w('CAT', ['C','A','T'], 1, 'animais'),
                _w('HAT', ['H','A','T'], 1, 'casa'),
                _w('BAT', ['B','A','T'], 1, 'animais'),
                _w('MAP', ['M','A','P'], 1, 'escola'),
                _w('BAG', ['B','A','G'], 1, 'escola'),
                _w('FAN', ['F','A','N'], 1, 'casa'),
                _w('DAD', ['D','A','D'], 1, 'casa'),
                _w('JAM', ['J','A','M'], 1, 'comida'),
                _w('DOG', ['D','O','G'], 1, 'animais'),
                _w('FOG', ['F','O','G'], 1, 'natureza'),
                _w('BOX', ['B','O','X'], 1, 'casa'),
                _w('POT', ['P','O','T'], 1, 'comida'),
                _w('LOG', ['L','O','G'], 1, 'natureza'),
                _w('TOP', ['T','O','P'], 1, 'cotidiano'),
                _w('MOM', ['M','O','M'], 1, 'casa'),
                _w('HOP', ['H','O','P'], 1, 'cotidiano'),

                // Degrau 2: Vogais Curtas I / E
                _w('PIG', ['P','I','G'], 2, 'animais'),
                _w('BIG', ['B','I','G'], 2, 'cotidiano'),
                _w('DIG', ['D','I','G'], 2, 'cotidiano'),
                _w('WIG', ['W','I','G'], 2, 'casa'),
                _w('KID', ['K','I','D'], 2, 'escola'),
                _w('LID', ['L','I','D'], 2, 'casa'),
                _w('ZIP', ['Z','I','P'], 2, 'cotidiano'),
                _w('TIN', ['T','I','N'], 2, 'casa'),
                _w('BED', ['B','E','D'], 2, 'casa'),
                _w('RED', ['R','E','D'], 2, 'escola'),
                _w('PEN', ['P','E','N'], 2, 'escola'),
                _w('HEN', ['H','E','N'], 2, 'animais'),
                _w('NET', ['N','E','T'], 2, 'natureza'),
                _w('WET', ['W','E','T'], 2, 'natureza'),
                _w('LEG', ['L','E','G'], 2, 'cotidiano'),
                _w('JET', ['J','E','T'], 2, 'cotidiano'),

                // Degrau 3: Vogal Curta U & Mistas
                _w('SUN', ['S','U','N'], 3, 'natureza'),
                _w('BUS', ['B','U','S'], 3, 'escola'),
                _w('CUP', ['C','U','P'], 3, 'comida'),
                _w('MUG', ['M','U','G'], 3, 'casa'),
                _w('RUG', ['R','U','G'], 3, 'casa'),
                _w('BUG', ['B','U','G'], 3, 'animais'),
                _w('HUG', ['H','U','G'], 3, 'cotidiano'),
                _w('NUT', ['N','U','T'], 3, 'comida'),
                _w('GUM', ['G','U','M'], 3, 'comida'),
                _w('TUG', ['T','U','G'], 3, 'cotidiano'),
                _w('TUB', ['T','U','B'], 3, 'casa'),
                _w('MUD', ['M','U','D'], 3, 'natureza'),
                _w('FOX', ['F','O','X'], 3, 'animais'),
                _w('VAN', ['V','A','N'], 3, 'cotidiano'),
                _w('RUN', ['R','U','N'], 3, 'cotidiano'),
                _w('SIT', ['S','I','T'], 3, 'escola'),

                // Degrau 4: Desafio CVC Expandido
                _w('CAB', ['C','A','B'], 4, 'cotidiano'),
                _w('MAT', ['M','A','T'], 4, 'casa'),
                _w('PAN', ['P','A','N'], 4, 'comida'),
                _w('RAT', ['R','A','T'], 4, 'animais'),
                _w('WEB', ['W','E','B'], 4, 'natureza'),
                _w('PET', ['P','E','T'], 4, 'animais'),
                _w('VET', ['V','E','T'], 4, 'animais'),
                _w('FIN', ['F','I','N'], 4, 'animais'),
                _w('PIN', ['P','I','N'], 4, 'escola'),
                _w('WIN', ['W','I','N'], 4, 'cotidiano'),
                _w('COB', ['C','O','B'], 4, 'comida'),
                _w('MOP', ['M','O','P'], 4, 'casa'),
                _w('CUB', ['C','U','B'], 4, 'animais'),
                _w('SUB', ['S','U','B'], 4, 'comida'),
                _w('JUG', ['J','U','G'], 4, 'casa'),
                _w('YAM', ['Y','A','M'], 4, 'comida')
            ],

            // I3: Easy Words 4–5 Letters, Blends & Digraphs (64 palavras únicas — 16 por degrau)
            i3: [
                // Degrau 1: Blends Iniciais (L / R / S)
                _w('FROG', ['F','R','O','G'], 1, 'animais'),
                _w('CRAB', ['C','R','A','B'], 1, 'animais'),
                _w('DRUM', ['D','R','U','M'], 1, 'escola'),
                _w('TREE', ['T','R','EE'], 1, 'natureza'),
                _w('CLAP', ['C','L','A','P'], 1, 'cotidiano'),
                _w('FLAG', ['F','L','A','G'], 1, 'escola'),
                _w('PLUG', ['P','L','U','G'], 1, 'casa'),
                _w('SLED', ['S','L','E','D'], 1, 'natureza'),
                _w('GRAB', ['G','R','A','B'], 1, 'cotidiano'),
                _w('TRIP', ['T','R','I','P'], 1, 'cotidiano'),
                _w('STAR', ['S','T','AR'], 1, 'natureza'),
                _w('STOP', ['S','T','O','P'], 1, 'cotidiano'),
                _w('SPOT', ['S','P','O','T'], 1, 'animais'),
                _w('SWIM', ['S','W','I','M'], 1, 'cotidiano'),
                _w('PLAN', ['P','L','A','N'], 1, 'escola'),
                _w('SLUG', ['S','L','U','G'], 1, 'animais'),

                // Degrau 2: Dígrafos SH / CH / TH / WH
                _w('FISH', ['F','I','SH'], 2, 'animais'),
                _w('SHIP', ['SH','I','P'], 2, 'natureza'),
                _w('WISH', ['W','I','SH'], 2, 'cotidiano'),
                _w('CASH', ['C','A','SH'], 2, 'cotidiano'),
                _w('RUSH', ['R','U','SH'], 2, 'cotidiano'),
                _w('DISH', ['D','I','SH'], 2, 'comida'),
                _w('CHIN', ['CH','I','N'], 2, 'cotidiano'),
                _w('RICH', ['R','I','CH'], 2, 'cotidiano'),
                _w('MUCH', ['M','U','CH'], 2, 'escola'),
                _w('CHIP', ['CH','I','P'], 2, 'comida'),
                _w('CHAT', ['CH','A','T'], 2, 'escola'),
                _w('BATH', ['B','A','TH'], 2, 'casa'),
                _w('MATH', ['M','A','TH'], 2, 'escola'),
                _w('THIN', ['TH','I','N'], 2, 'cotidiano'),
                _w('PATH', ['P','A','TH'], 2, 'natureza'),
                _w('WHIP', ['WH','I','P'], 2, 'comida'),

                // Degrau 3: Finais CK / NG / LL / ND / MP
                _w('DUCK', ['D','U','CK'], 3, 'animais'),
                _w('SOCK', ['S','O','CK'], 3, 'casa'),
                _w('LOCK', ['L','O','CK'], 3, 'casa'),
                _w('KICK', ['K','I','CK'], 3, 'cotidiano'),
                _w('ROCK', ['R','O','CK'], 3, 'natureza'),
                _w('RING', ['R','I','NG'], 3, 'casa'),
                _w('KING', ['K','I','NG'], 3, 'escola'),
                _w('SONG', ['S','O','NG'], 3, 'escola'),
                _w('SING', ['S','I','NG'], 3, 'cotidiano'),
                _w('WING', ['W','I','NG'], 3, 'animais'),
                _w('BELL', ['B','E','LL'], 3, 'escola'),
                _w('HILL', ['H','I','LL'], 3, 'natureza'),
                _w('WELL', ['W','E','LL'], 3, 'natureza'),
                _w('HAND', ['H','A','N','D'], 3, 'cotidiano'),
                _w('LAMP', ['L','A','M','P'], 3, 'casa'),
                _w('JUMP', ['J','U','M','P'], 3, 'cotidiano'),

                // Degrau 4: Vogais Longas & 5 Letras
                _w('BIRD', ['B','IR','D'], 4, 'animais'),
                _w('BOOK', ['B','OO','K'], 4, 'escola'),
                _w('BOAT', ['B','OA','T'], 4, 'natureza'),
                _w('MOON', ['M','OO','N'], 4, 'natureza'),
                _w('RAIN', ['R','AI','N'], 4, 'natureza'),
                _w('SNAIL', ['S','N','AI','L'], 4, 'animais'),
                _w('PLANT', ['P','L','A','N','T'], 4, 'natureza'),
                _w('CLOUD', ['C','L','OU','D'], 4, 'natureza'),
                _w('TRAIN', ['T','R','AI','N'], 4, 'cotidiano'),
                _w('CHAIR', ['CH','AI','R'], 4, 'casa'),
                _w('BREAD', ['B','R','EA','D'], 4, 'comida'),
                _w('BRUSH', ['B','R','U','SH'], 4, 'casa'),
                _w('CLOCK', ['C','L','O','CK'], 4, 'escola'),
                _w('BENCH', ['B','E','N','CH'], 4, 'escola'),
                _w('GREEN', ['G','R','EE','N'], 4, 'natureza'),
                _w('SLEEP', ['S','L','EE','P'], 4, 'casa')
            ],

            // I4: Snap Words / Sight Words Dolch & Fry (64 palavras únicas — 16 por degrau)
            i4: [
                // Degrau 1: Pre-Primer Base
                _w('THE', ['TH','E'], 1, 'escola'),
                _w('AND', ['A','N','D'], 1, 'escola'),
                _w('IS', ['I','S'], 1, 'escola'),
                _w('IN', ['I','N'], 1, 'casa'),
                _w('IT', ['I','T'], 1, 'cotidiano'),
                _w('TO', ['T','O'], 1, 'cotidiano'),
                _w('HE', ['H','E'], 1, 'casa'),
                _w('SHE', ['SH','E'], 1, 'casa'),
                _w('WE', ['W','E'], 1, 'escola'),
                _w('YOU', ['Y','OU'], 1, 'escola'),
                _w('MY', ['M','Y'], 1, 'casa'),
                _w('GO', ['G','O'], 1, 'cotidiano'),
                _w('SEE', ['S','EE'], 1, 'cotidiano'),
                _w('CAN', ['C','A','N'], 1, 'cotidiano'),
                _w('FOR', ['F','OR'], 1, 'escola'),
                _w('ON', ['O','N'], 1, 'casa'),

                // Degrau 2: Primer Essenciais
                _w('ARE', ['A','RE'], 2, 'escola'),
                _w('WAS', ['W','A','S'], 2, 'escola'),
                _w('HAD', ['H','A','D'], 2, 'cotidiano'),
                _w('HAS', ['H','A','S'], 2, 'cotidiano'),
                _w('HIS', ['H','I','S'], 2, 'casa'),
                _w('HER', ['H','ER'], 2, 'casa'),
                _w('NOT', ['N','O','T'], 2, 'escola'),
                _w('BUT', ['B','U','T'], 2, 'escola'),
                _w('ALL', ['A','LL'], 2, 'cotidiano'),
                _w('LIKE', ['L','I','KE'], 2, 'comida'),
                _w('COME', ['C','O','ME'], 2, 'cotidiano'),
                _w('LOOK', ['L','OO','K'], 2, 'escola'),
                _w('PLAY', ['P','L','AY'], 2, 'cotidiano'),
                _w('SAID', ['S','AI','D'], 2, 'escola'),
                _w('GOOD', ['G','OO','D'], 2, 'comida'),
                _w('INTO', ['IN','TO'], 2, 'casa'),

                // Degrau 3: TH / WH & Conectivos
                _w('THIS', ['TH','I','S'], 3, 'escola'),
                _w('THAT', ['TH','A','T'], 3, 'escola'),
                _w('THEY', ['TH','EY'], 3, 'escola'),
                _w('THEM', ['TH','E','M'], 3, 'cotidiano'),
                _w('THEN', ['TH','E','N'], 3, 'cotidiano'),
                _w('WITH', ['W','I','TH'], 3, 'casa'),
                _w('WHEN', ['WH','E','N'], 3, 'escola'),
                _w('WHAT', ['WH','A','T'], 3, 'escola'),
                _w('WHERE', ['WH','E','RE'], 3, 'natureza'),
                _w('WHO', ['WH','O'], 3, 'casa'),
                _w('WILL', ['W','I','LL'], 3, 'cotidiano'),
                _w('FROM', ['F','R','O','M'], 3, 'casa'),
                _w('HAVE', ['H','A','VE'], 3, 'cotidiano'),
                _w('BEEN', ['B','EE','N'], 3, 'escola'),
                _w('SOME', ['S','O','ME'], 3, 'comida'),
                _w('DOWN', ['D','OW','N'], 3, 'natureza'),

                // Degrau 4: Fluência 1º–2º Ano
                _w('EACH', ['EA','CH'], 4, 'escola'),
                _w('JUST', ['J','U','S','T'], 4, 'cotidiano'),
                _w('VERY', ['V','ER','Y'], 4, 'cotidiano'),
                _w('OVER', ['O','V','ER'], 4, 'natureza'),
                _w('AFTER', ['A','F','T','ER'], 4, 'escola'),
                _w('AGAIN', ['A','G','AI','N'], 4, 'escola'),
                _w('COULD', ['C','OU','L','D'], 4, 'cotidiano'),
                _w('WOULD', ['W','OU','L','D'], 4, 'cotidiano'),
                _w('EVERY', ['E','V','ER','Y'], 4, 'escola'),
                _w('FIRST', ['F','IR','S','T'], 4, 'escola'),
                _w('FOUND', ['F','OU','N','D'], 4, 'natureza'),
                _w('GREAT', ['G','R','EA','T'], 4, 'cotidiano'),
                _w('LITTLE', ['L','I','T','T','LE'], 4, 'animais'),
                _w('NEVER', ['N','E','V','ER'], 4, 'cotidiano'),
                _w('UNDER', ['U','N','D','ER'], 4, 'casa'),
                _w('WATER', ['W','A','T','ER'], 4, 'natureza')
            ],

            // I5: CVCe / Magic E (60 palavras únicas — 15 por degrau)
            i5: [
                // Degrau 1: Magic E A_E
                _w('CAKE', ['C','A','KE'], 1, 'comida'),
                _w('GATE', ['G','A','TE'], 1, 'casa'),
                _w('LAKE', ['L','A','KE'], 1, 'natureza'),
                _w('WAVE', ['W','A','VE'], 1, 'natureza'),
                _w('RACE', ['R','A','CE'], 1, 'cotidiano'),
                _w('FACE', ['F','A','CE'], 1, 'cotidiano'),
                _w('MADE', ['M','A','DE'], 1, 'cotidiano'),
                _w('BAKE', ['B','A','KE'], 1, 'comida'),
                _w('CAPE', ['C','A','PE'], 1, 'casa'),
                _w('GAME', ['G','A','ME'], 1, 'escola'),
                _w('NAME', ['N','A','ME'], 1, 'escola'),
                _w('SAFE', ['S','A','FE'], 1, 'casa'),
                _w('TAPE', ['T','A','PE'], 1, 'escola'),
                _w('CAVE', ['C','A','VE'], 1, 'natureza'),
                _w('DATE', ['D','A','TE'], 1, 'escola'),

                // Degrau 2: Magic E I_E
                _w('BIKE', ['B','I','KE'], 2, 'cotidiano'),
                _w('KITE', ['K','I','TE'], 2, 'natureza'),
                _w('PINE', ['P','I','NE'], 2, 'natureza'),
                _w('LINE', ['L','I','NE'], 2, 'escola'),
                _w('MICE', ['M','I','CE'], 2, 'animais'),
                _w('FIRE', ['F','I','RE'], 2, 'natureza'),
                _w('DIME', ['D','I','ME'], 2, 'casa'),
                _w('DIVE', ['D','I','VE'], 2, 'cotidiano'),
                _w('FIVE', ['F','I','VE'], 2, 'escola'),
                _w('HIDE', ['H','I','DE'], 2, 'cotidiano'),
                _w('LIFE', ['L','I','FE'], 2, 'natureza'),
                _w('NINE', ['N','I','NE'], 2, 'escola'),
                _w('SIDE', ['S','I','DE'], 2, 'cotidiano'),
                _w('TIME', ['T','I','ME'], 2, 'escola'),
                _w('VINE', ['V','I','NE'], 2, 'natureza'),

                // Degrau 3: Magic E O_E / U_E
                _w('HOME', ['H','O','ME'], 3, 'casa'),
                _w('BONE', ['B','O','NE'], 3, 'animais'),
                _w('NOSE', ['N','O','SE'], 3, 'cotidiano'),
                _w('ROPE', ['R','O','PE'], 3, 'cotidiano'),
                _w('POLE', ['P','O','LE'], 3, 'natureza'),
                _w('NOTE', ['N','O','TE'], 3, 'escola'),
                _w('HOPE', ['H','O','PE'], 3, 'cotidiano'),
                _w('JOKE', ['J','O','KE'], 3, 'escola'),
                _w('CONE', ['C','O','NE'], 3, 'comida'),
                _w('ROSE', ['R','O','SE'], 3, 'natureza'),
                _w('TUBE', ['T','U','BE'], 3, 'escola'),
                _w('CUTE', ['C','U','TE'], 3, 'animais'),
                _w('MULE', ['M','U','LE'], 3, 'animais'),
                _w('TUNE', ['T','U','NE'], 3, 'escola'),
                _w('HUGE', ['H','U','GE'], 3, 'animais'),

                // Degrau 4: Magic E com Blends (5 letras)
                _w('GLOBE', ['G','LO','BE'], 4, 'escola'),
                _w('GRADE', ['G','RA','DE'], 4, 'escola'),
                _w('PRIZE', ['P','RI','ZE'], 4, 'escola'),
                _w('SNAKE', ['S','NA','KE'], 4, 'animais'),
                _w('STONE', ['S','TO','NE'], 4, 'natureza'),
                _w('PLANE', ['P','LA','NE'], 4, 'cotidiano'),
                _w('PLATE', ['P','LA','TE'], 4, 'comida'),
                _w('SMILE', ['S','MI','LE'], 4, 'cotidiano'),
                _w('SLIDE', ['S','LI','DE'], 4, 'cotidiano'),
                _w('FRAME', ['F','RA','ME'], 4, 'casa'),
                _w('BRAVE', ['B','RA','VE'], 4, 'cotidiano'),
                _w('CRANE', ['C','RA','NE'], 4, 'animais'),
                _w('FLUTE', ['F','LU','TE'], 4, 'escola'),
                _w('GRAPE', ['G','RA','PE'], 4, 'comida'),
                _w('WHALE', ['WH','A','LE'], 4, 'animais')
            ],

            // I6: Simple Sentences (48 frases únicas — 12 por degrau)
            i6: [
                // Degrau 1: 3 Blocos Base
                _s('I SEE A CAT', ['I', 'SEE', 'A CAT'], 1, 'animais'),
                _s('THE DOG IS BIG', ['THE DOG', 'IS', 'BIG'], 1, 'animais'),
                _s('THE SUN IS HOT', ['THE SUN', 'IS', 'HOT'], 1, 'natureza'),
                _s('SHE HAS A DOLL', ['SHE', 'HAS', 'A DOLL'], 1, 'casa'),
                _s('THIS IS MY BOOK', ['THIS', 'IS', 'MY BOOK'], 1, 'escola'),
                _s('THE SKY IS BLUE', ['THE SKY', 'IS', 'BLUE'], 1, 'natureza'),
                _s('I LOVE MY MOM', ['I LOVE', 'MY', 'MOM'], 1, 'casa'),
                _s('IT IS A PIG', ['IT', 'IS', 'A PIG'], 1, 'animais'),
                _s('MY HAT IS RED', ['MY HAT', 'IS', 'RED'], 1, 'casa'),
                _s('THE BUS IS BIG', ['THE BUS', 'IS', 'BIG'], 1, 'escola'),
                _s('I EAT A CAKE', ['I EAT', 'A', 'CAKE'], 1, 'comida'),
                _s('LOOK AT THE DOG', ['LOOK AT', 'THE', 'DOG'], 1, 'animais'),

                // Degrau 2: Ações com CAN & Verbos
                _s('HE CAN RUN FAST', ['HE CAN', 'RUN', 'FAST'], 2, 'cotidiano'),
                _s('THE BIRD CAN FLY', ['THE BIRD', 'CAN', 'FLY'], 2, 'animais'),
                _s('THE FISH CAN SWIM', ['THE FISH', 'CAN', 'SWIM'], 2, 'animais'),
                _s('I CAN JUMP HIGH', ['I CAN', 'JUMP', 'HIGH'], 2, 'cotidiano'),
                _s('THE FROG JUMPS HIGH', ['THE FROG', 'JUMPS', 'HIGH'], 2, 'animais'),
                _s('WE CAN SING WELL', ['WE CAN', 'SING', 'WELL'], 2, 'escola'),
                _s('SHE CAN RIDE A BIKE', ['SHE CAN', 'RIDE', 'A BIKE'], 2, 'cotidiano'),
                _s('I LIKE RED APPLES', ['I LIKE', 'RED', 'APPLES'], 2, 'comida'),
                _s('HE DRINKS COLD MILK', ['HE', 'DRINKS', 'COLD MILK'], 2, 'comida'),
                _s('WE EAT SWEET FRUIT', ['WE EAT', 'SWEET', 'FRUIT'], 2, 'comida'),
                _s('I HAVE TWO HANDS', ['I', 'HAVE', 'TWO HANDS'], 2, 'cotidiano'),
                _s('OPEN THE BIG DOOR', ['OPEN', 'THE BIG', 'DOOR'], 2, 'casa'),

                // Degrau 3: Escola, Casa & Natureza
                _s('WE PLAY IN THE PARK', ['WE PLAY', 'IN THE', 'PARK'], 3, 'natureza'),
                _s('LOOK AT THE MOON', ['LOOK AT', 'THE', 'MOON'], 3, 'natureza'),
                _s('I LOVE MY FAMILY', ['I', 'LOVE', 'MY FAMILY'], 3, 'casa'),
                _s('SHE READS A GOOD BOOK', ['SHE READS', 'A GOOD', 'BOOK'], 3, 'escola'),
                _s('THE CAR IS VERY FAST', ['THE CAR', 'IS VERY', 'FAST'], 3, 'cotidiano'),
                _s('THE FLOWERS ARE PRETTY', ['THE FLOWERS', 'ARE', 'PRETTY'], 3, 'natureza'),
                _s('THE RABBIT IS WHITE', ['THE RABBIT', 'IS', 'WHITE'], 3, 'animais'),
                _s('THE STARS SHINE AT NIGHT', ['THE STARS', 'SHINE', 'AT NIGHT'], 3, 'natureza'),
                _s('MY PEN IS ON THE DESK', ['MY PEN', 'IS ON', 'THE DESK'], 3, 'escola'),
                _s('THE CAT SLEEPS ON THE BED', ['THE CAT', 'SLEEPS ON', 'THE BED'], 3, 'casa'),
                _s('WE WRITE IN OUR NOTEBOOK', ['WE WRITE', 'IN OUR', 'NOTEBOOK'], 3, 'escola'),
                _s('RAIN FALLS ON THE GREEN TREE', ['RAIN FALLS', 'ON THE', 'GREEN TREE'], 3, 'natureza'),

                // Degrau 4: Rotina & Descrições Completas
                _s('THE LITTLE DUCK SWIMS IN THE POND', ['THE LITTLE DUCK', 'SWIMS', 'IN THE POND'], 4, 'animais'),
                _s('WE STUDY MATH EVERY MORNING', ['WE STUDY', 'MATH', 'EVERY MORNING'], 4, 'escola'),
                _s('MY FRIEND SHARES SWEET GRAPES', ['MY FRIEND', 'SHARES', 'SWEET GRAPES'], 4, 'comida'),
                _s('THE TRAIN MOVES OVER THE HILL', ['THE TRAIN', 'MOVES OVER', 'THE HILL'], 4, 'natureza'),
                _s('SHE PAINTS A BRIGHT YELLOW STAR', ['SHE PAINTS', 'A BRIGHT', 'YELLOW STAR'], 4, 'escola'),
                _s('THE WHALE SWIMS UNDER THE WATER', ['THE WHALE', 'SWIMS UNDER', 'THE WATER'], 4, 'animais'),
                _s('AFTER SCHOOL WE PLAY FUN GAMES', ['AFTER SCHOOL', 'WE PLAY', 'FUN GAMES'], 4, 'escola'),
                _s('MY DAD BAKES FRESH WARM BREAD', ['MY DAD', 'BAKES FRESH', 'WARM BREAD'], 4, 'comida'),
                _s('THE CLOCK STANDS NEAR THE WINDOW', ['THE CLOCK', 'STANDS NEAR', 'THE WINDOW'], 4, 'casa'),
                _s('A BRAVE KID CLIMBS THE BIG ROCK', ['A BRAVE KID', 'CLIMBS', 'THE BIG ROCK'], 4, 'natureza'),
                _s('WE BRUSH OUR TEETH EVERY NIGHT', ['WE BRUSH', 'OUR TEETH', 'EVERY NIGHT'], 4, 'casa'),
                _s('THE HAPPY DOG CATCHES THE BALL', ['THE HAPPY DOG', 'CATCHES', 'THE BALL'], 4, 'animais')
            ],

            // I7: Opposites / Antonyms (40 pares únicos — 10 por degrau)
            i7: [
                // Degrau 1: Básicos Visuais
                _o('BIG', 'SMALL', ['SMALL', 'HOT', 'SLOW'], '🐘 / 🐭', 1, 'animais'),
                _o('HOT', 'COLD', ['COLD', 'FAST', 'BIG'], '🔥 / ❄️', 1, 'natureza'),
                _o('HAPPY', 'SAD', ['SAD', 'COLD', 'FAST'], '😊 / 😢', 1, 'cotidiano'),
                _o('UP', 'DOWN', ['DOWN', 'IN', 'OUT'], '⬆️ / ⬇️', 1, 'cotidiano'),
                _o('DAY', 'NIGHT', ['NIGHT', 'SLOW', 'COLD'], '☀️ / 🌙', 1, 'natureza'),
                _o('FAST', 'SLOW', ['SLOW', 'COLD', 'BIG'], '🏎️ / 🐢', 1, 'animais'),
                _o('OPEN', 'CLOSED', ['CLOSED', 'COLD', 'FAST'], '📖 / 📕', 1, 'escola'),
                _o('IN', 'OUT', ['OUT', 'ON', 'UP'], '📥 / 📤', 1, 'casa'),
                _o('GOOD', 'BAD', ['BAD', 'FAST', 'COLD'], '👍 / 👎', 1, 'escola'),
                _o('YES', 'NO', ['NO', 'UP', 'BIG'], '✅ / ❌', 1, 'escola'),

                // Degrau 2: Sensoriais & Físicos
                _o('HARD', 'SOFT', ['SOFT', 'FAST', 'COLD'], '🪨 / 🧸', 2, 'casa'),
                _o('TALL', 'SHORT', ['SHORT', 'HOT', 'SLOW'], '🦒 / 🦔', 2, 'animais'),
                _o('HEAVY', 'LIGHT', ['LIGHT', 'FAST', 'BIG'], '🐘 / 🪶', 2, 'natureza'),
                _o('WET', 'DRY', ['DRY', 'SLOW', 'COLD'], '🌧️ / 🌵', 2, 'natureza'),
                _o('CLEAN', 'DIRTY', ['DIRTY', 'FAST', 'COLD'], '✨ / 🧼', 2, 'casa'),
                _o('FULL', 'EMPTY', ['EMPTY', 'HOT', 'SLOW'], '🥛 / 🫙', 2, 'comida'),
                _o('SWEET', 'SOUR', ['SOUR', 'DARK', 'HARD'], '🍭 / 🍋', 2, 'comida'),
                _o('QUIET', 'LOUD', ['LOUD', 'COLD', 'SLOW'], '🤫 / 📢', 2, 'escola'),
                _o('DARK', 'BRIGHT', ['BRIGHT', 'SLOW', 'WET'], '🌑 / 💡', 2, 'casa'),
                _o('THICK', 'THIN', ['THIN', 'HOT', 'LOUD'], '📕 / 📄', 2, 'escola'),

                // Degrau 3: Tempo, Espaço & Direção
                _o('NEAR', 'FAR', ['FAR', 'HOT', 'BIG'], '📍 / 🔭', 3, 'natureza'),
                _o('EARLY', 'LATE', ['LATE', 'SLOW', 'COLD'], '⏰ / 🌙', 3, 'escola'),
                _o('FRONT', 'BACK', ['BACK', 'SLOW', 'FAST'], '🚪 / 🔙', 3, 'casa'),
                _o('LEFT', 'RIGHT', ['RIGHT', 'UP', 'NEAR'], '⬅️ / ➡️', 3, 'cotidiano'),
                _o('FIRST', 'LAST', ['LAST', 'FAST', 'NEW'], '🥇 / 🏁', 3, 'escola'),
                _o('START', 'FINISH', ['FINISH', 'OPEN', 'COLD'], '🚦 / 🏆', 3, 'cotidiano'),
                _o('HIGH', 'LOW', ['LOW', 'WET', 'OLD'], '🏔️ / 🕳️', 3, 'natureza'),
                _o('WIDE', 'NARROW', ['NARROW', 'SOFT', 'TALL'], '🛣️ / 🥾', 3, 'natureza'),
                _o('ALWAYS', 'NEVER', ['NEVER', 'SOON', 'LATE'], '♾️ / 🚫', 3, 'escola'),
                _o('BEFORE', 'AFTER', ['AFTER', 'UNDER', 'OVER'], '⏪ / ⏩', 3, 'escola'),

                // Degrau 4: Qualidades & Cotidiano
                _o('STRONG', 'WEAK', ['WEAK', 'COLD', 'FAST'], '💪 / 🍃', 4, 'cotidiano'),
                _o('OLD', 'YOUNG', ['YOUNG', 'COLD', 'FAST'], '👴 / 👶', 4, 'casa'),
                _o('RICH', 'POOR', ['POOR', 'FAST', 'COLD'], '💎 / 🪙', 4, 'cotidiano'),
                _o('NEW', 'ANCIENT', ['ANCIENT', 'SMALL', 'SOFT'], '🆕 / 🏛️', 4, 'escola'),
                _o('EASY', 'DIFFICULT', ['DIFFICULT', 'SHORT', 'DRY'], '🧩 / 🧠', 4, 'escola'),
                _o('BRAVE', 'SHY', ['SHY', 'LOUD', 'WET'], '🦁 / 🐢', 4, 'animais'),
                _o('SAFE', 'DANGEROUS', ['DANGEROUS', 'CLEAN', 'WARM'], '🛡️ / ⚠️', 4, 'cotidiano'),
                _o('WIN', 'LOSE', ['LOSE', 'RUN', 'EAT'], '🏆 / 🎲', 4, 'cotidiano'),
                _o('PUSH', 'PULL', ['PULL', 'JUMP', 'SIT'], '👐 / 🪢', 4, 'cotidiano'),
                _o('LAUGH', 'CRY', ['CRY', 'SLEEP', 'WALK'], '😂 / 😭', 4, 'cotidiano')
            ]
        },

        portugues: {
            // P3: Dissílabas (64 palavras únicas — 16 por degrau)
            p3: [
                // Degrau 1: CV Puras com A / O
                _w('BOLA', ['BO','LA'], 1, 'cotidiano'),
                _w('CASA', ['CA','SA'], 1, 'casa'),
                _w('DADO', ['DA','DO'], 1, 'escola'),
                _w('FOCA', ['FO','CA'], 1, 'animais'),
                _w('GATO', ['GA','TO'], 1, 'animais'),
                _w('JACA', ['JA','CA'], 1, 'comida'),
                _w('MALA', ['MA','LA'], 1, 'casa'),
                _w('PATO', ['PA','TO'], 1, 'animais'),
                _w('RATO', ['RA','TO'], 1, 'animais'),
                _w('SAPO', ['SA','PO'], 1, 'animais'),
                _w('VACA', ['VA','CA'], 1, 'animais'),
                _w('BOLO', ['BO','LO'], 1, 'comida'),
                _w('COPO', ['CO','PO'], 1, 'casa'),
                _w('LOBO', ['LO','BO'], 1, 'animais'),
                _w('RODA', ['RO','DA'], 1, 'cotidiano'),
                _w('FADA', ['FA','DA'], 1, 'escola'),

                // Degrau 2: CV Puras com E / I / U
                _w('LIMA', ['LI','MA'], 2, 'comida'),
                _w('NOVE', ['NO','VE'], 2, 'escola'),
                _w('TATU', ['TA','TU'], 2, 'animais'),
                _w('DOCE', ['DO','CE'], 2, 'comida'),
                _w('SUCO', ['SU','CO'], 2, 'comida'),
                _w('VOTO', ['VO','TO'], 2, 'escola'),
                _w('FOGO', ['FO','GO'], 2, 'natureza'),
                _w('LIXO', ['LI','XO'], 2, 'casa'),
                _w('TETO', ['TE','TO'], 2, 'casa'),
                _w('GELO', ['GE','LO'], 2, 'natureza'),
                _w('MURO', ['MU','RO'], 2, 'casa'),
                _w('LAGO', ['LA','GO'], 2, 'natureza'),
                _w('SINO', ['SI','NO'], 2, 'escola'),
                _w('PENA', ['PE','NA'], 2, 'animais'),
                _w('LUVA', ['LU','VA'], 2, 'casa'),
                _w('DEDO', ['DE','DO'], 2, 'cotidiano'),

                // Degrau 3: Cotidiano Ampliado
                _w('NABO', ['NA','BO'], 3, 'comida'),
                _w('JIPE', ['JI','PE'], 3, 'cotidiano'),
                _w('TUBO', ['TU','BO'], 3, 'escola'),
                _w('REDE', ['RE','DE'], 3, 'casa'),
                _w('MEDO', ['ME','DO'], 3, 'cotidiano'),
                _w('PIPA', ['PI','PA'], 3, 'cotidiano'),
                _w('SOPA', ['SO','PA'], 3, 'comida'),
                _w('VIDA', ['VI','DA'], 3, 'natureza'),
                _w('GALO', ['GA','LO'], 3, 'animais'),
                _w('PERU', ['PE','RU'], 3, 'animais'),
                _w('PUMA', ['PU','MA'], 3, 'animais'),
                _w('MESA', ['ME','SA'], 3, 'casa'),
                _w('CAMA', ['CA','MA'], 3, 'casa'),
                _w('REMO', ['RE','MO'], 3, 'natureza'),
                _w('VELA', ['VE','LA'], 3, 'casa'),
                _w('MAPA', ['MA','PA'], 3, 'escola'),

                // Degrau 4: Ditongos, Acentos & Travadas
                _w('URSO', ['UR','SO'], 4, 'animais'),
                _w('LEÃO', ['LE','ÃO'], 4, 'animais'),
                _w('CAJU', ['CA','JU'], 4, 'comida'),
                _w('ROSA', ['RO','SA'], 4, 'natureza'),
                _w('GOTA', ['GO','TA'], 4, 'natureza'),
                _w('NUVEM', ['NU','VEM'], 4, 'natureza'),
                _w('NEVE', ['NE','VE'], 4, 'natureza'),
                _w('BIFE', ['BI','FE'], 4, 'comida'),
                _w('RISO', ['RI','SO'], 4, 'cotidiano'),
                _w('PULO', ['PU','LO'], 4, 'cotidiano'),
                _w('BEIJO', ['BEI','JO'], 4, 'casa'),
                _w('CAFÉ', ['CA','FÉ'], 4, 'comida'),
                _w('BALA', ['BA','LA'], 4, 'comida'),
                _w('BOTE', ['BO','TE'], 4, 'natureza'),
                _w('POÇO', ['PO','ÇO'], 4, 'natureza'),
                _w('NOITE', ['NOI','TE'], 4, 'natureza')
            ],

            // P4: Trissílabas & Polissílabas (64 palavras únicas — 16 por degrau)
            p4: [
                // Degrau 1: Trissílabas CV Base
                _w('BANANA', ['BA','NA','NA'], 1, 'comida'),
                _w('PIPOCA', ['PI','PO','CA'], 1, 'comida'),
                _w('PETECA', ['PE','TE','CA'], 1, 'cotidiano'),
                _w('SAPATO', ['SA','PA','TO'], 1, 'casa'),
                _w('TOMATE', ['TO','MA','TE'], 1, 'comida'),
                _w('SACOLA', ['SA','CO','LA'], 1, 'casa'),
                _w('PANELA', ['PA','NE','LA'], 1, 'casa'),
                _w('CABELO', ['CA','BE','LO'], 1, 'cotidiano'),
                _w('JANELA', ['JA','NE','LA'], 1, 'casa'),
                _w('BONECO', ['BO','NE','CO'], 1, 'cotidiano'),
                _w('BONECA', ['BO','NE','CA'], 1, 'cotidiano'),
                _w('PIJAMA', ['PI','JA','MA'], 1, 'casa'),
                _w('GELADO', ['GE','LA','DO'], 1, 'comida'),
                _w('CAVALO', ['CA','VA','LO'], 1, 'animais'),
                _w('MACACO', ['MA','CA','CO'], 1, 'animais'),
                _w('SALADA', ['SA','LA','DA'], 1, 'comida'),

                // Degrau 2: Trissílabas Variadas & Acentos
                _w('RAPOSA', ['RA','PO','SA'], 2, 'animais'),
                _w('COMIDA', ['CO','MI','DA'], 2, 'comida'),
                _w('CANETA', ['CA','NE','TA'], 2, 'escola'),
                _w('MENINO', ['ME','NI','NO'], 2, 'escola'),
                _w('MENINA', ['ME','NI','NA'], 2, 'escola'),
                _w('TUCANO', ['TU','CA','NO'], 2, 'animais'),
                _w('GIRAFA', ['GI','RA','FA'], 2, 'animais'),
                _w('BATATA', ['BA','TA','TA'], 2, 'comida'),
                _w('CEBOLA', ['CE','BO','LA'], 2, 'comida'),
                _w('JACARÉ', ['JA','CA','RÉ'], 2, 'animais'),
                _w('PICOLÉ', ['PI','CO','LÉ'], 2, 'comida'),
                _w('CORUJA', ['CO','RU','JA'], 2, 'animais'),
                _w('APITO', ['A','PI','TO'], 2, 'escola'),
                _w('TAPETE', ['TA','PE','TE'], 2, 'casa'),
                _w('AMIGO', ['A','MI','GO'], 2, 'escola'),
                _w('PIRATA', ['PI','RA','TA'], 2, 'cotidiano'),

                // Degrau 3: Trissílabas com Dígrafos & Encontros
                _w('GALINHA', ['GA','LI','NHA'], 3, 'animais'),
                _w('COELHO', ['CO','E','LHO'], 3, 'animais'),
                _w('ABELHA', ['A','BE','LHA'], 3, 'animais'),
                _w('OVELHA', ['O','VE','LHA'], 3, 'animais'),
                _w('FORMIGA', ['FOR','MI','GA'], 3, 'animais'),
                _w('LAGARTO', ['LA','GAR','TO'], 3, 'animais'),
                _w('CENOURA', ['CE','NOU','RA'], 3, 'comida'),
                _w('CADEIRA', ['CA','DEI','RA'], 3, 'escola'),
                _w('MOCHILA', ['MO','CHI','LA'], 3, 'escola'),
                _w('TESOURA', ['TE','SOU','RA'], 3, 'escola'),
                _w('DESENHO', ['DE','SE','NHO'], 3, 'escola'),
                _w('COZINHA', ['CO','ZI','NHA'], 3, 'casa'),
                _w('FAZENDA', ['FA','ZEN','DA'], 3, 'natureza'),
                _w('FLORESTA', ['FLO','RES','TA'], 3, 'natureza'),
                _w('MONTANHA', ['MON','TA','NHA'], 3, 'natureza'),
                _w('ESCOLA', ['ES','CO','LA'], 3, 'escola'),

                // Degrau 4: Polissílabas 4–5 Sílabas
                _w('TELEFONE', ['TE','LE','FO','NE'], 4, 'casa'),
                _w('ABACAXI', ['A','BA','CA','XI'], 4, 'comida'),
                _w('LIMONADA', ['LI','MO','NA','DA'], 4, 'comida'),
                _w('SABONETE', ['SA','BO','NE','TE'], 4, 'casa'),
                _w('CAPACETE', ['CA','PA','CE','TE'], 4, 'cotidiano'),
                _w('MARACUJÁ', ['MA','RA','CU','JÁ'], 4, 'comida'),
                _w('BICICLETA', ['BI','CI','CLE','TA'], 4, 'cotidiano'),
                _w('GELADEIRA', ['GE','LA','DEI','RA'], 4, 'casa'),
                _w('CHOCOLATE', ['CHO','CO','LA','TE'], 4, 'comida'),
                _w('BORBOLETA', ['BOR','BO','LE','TA'], 4, 'animais'),
                _w('DINOSSAURO', ['DI','NOS','SAU','RO'], 4, 'animais'),
                _w('ELEFANTE', ['E','LE','FAN','TE'], 4, 'animais'),
                _w('COMPUTADOR', ['COM','PU','TA','DOR'], 4, 'escola'),
                _w('VENTILADOR', ['VEN','TI','LA','DOR'], 4, 'casa'),
                _w('TELEVISÃO', ['TE','LE','VI','SÃO'], 4, 'casa'),
                _w('TARTARUGA', ['TAR','TA','RU','GA'], 4, 'animais')
            ],

            // P7: Rimas & Sons Finais (40 pares únicos — 10 por degrau)
            p7: [
                // Degrau 1: Rimas Diretas (-ATO, -OLA, -ÃO, -ASA)
                _r('GATO', 'PATO', ['PATO', 'BOLO', 'MESA'], 'ATO', 1, 'animais'),
                _r('BOLA', 'MOLA', ['MOLA', 'DADO', 'GIRAFA'], 'OLA', 1, 'cotidiano'),
                _r('MÃO', 'PÃO', ['PÃO', 'LUVA', 'TATU'], 'ÃO', 1, 'comida'),
                _r('CASA', 'ASA', ['ASA', 'PORTA', 'CHAVE'], 'ASA', 1, 'casa'),
                _r('MALA', 'SALA', ['SALA', 'ROUPA', 'VIAGEM'], 'ALA', 1, 'casa'),
                _r('SAPO', 'PAPO', ['PAPO', 'LAGOA', 'PEDRA'], 'APO', 1, 'animais'),
                _r('RUA', 'LUA', ['LUA', 'CARRO', 'CASA'], 'UA', 1, 'natureza'),
                _r('LATA', 'BATA', ['BATA', 'COPO', 'SINO'], 'ATA', 1, 'casa'),
                _r('BICO', 'RICO', ['RICO', 'PENA', 'VOO'], 'ICO', 1, 'animais'),
                _r('FACA', 'VACA', ['VACA', 'MESA', 'COPO'], 'ACA', 1, 'animais'),

                // Degrau 2: Rimas Cotidianas (-ELA, -UVA, -OR, -ÃO)
                _r('PANELA', 'JANELA', ['JANELA', 'SAPATO', 'BONECO'], 'ELA', 2, 'casa'),
                _r('CHUVA', 'UVA', ['UVA', 'BANANA', 'BODE'], 'UVA', 2, 'natureza'),
                _r('FLOR', 'AMOR', ['AMOR', 'PEIXE', 'DENTE'], 'OR', 2, 'natureza'),
                _r('LEÃO', 'AVIÃO', ['AVIÃO', 'ZEBRA', 'FLORESTA'], 'ÃO', 2, 'animais'),
                _r('BONECA', 'PETECA', ['PETECA', 'MALA', 'CAMA'], 'ECA', 2, 'cotidiano'),
                _r('CÃO', 'BOTÃO', ['BOTÃO', 'GATO', 'OSSO'], 'ÃO', 2, 'animais'),
                _r('CAFÉ', 'BONÉ', ['BONÉ', 'LEITE', 'MESA'], 'É', 2, 'comida'),
                _r('SAPATO', 'RATO', ['RATO', 'CABELO', 'FOGO'], 'ATO', 2, 'animais'),
                _r('PENTE', 'DENTE', ['DENTE', 'BOLA', 'SAPO'], 'ENTE', 2, 'casa'),
                _r('ANEL', 'PAPEL', ['PAPEL', 'NUVEM', 'RIO'], 'EL', 2, 'escola'),

                // Degrau 3: Rimas com Trissílabas (-ADO, -IM, -OL, -OLO)
                _r('DADO', 'CADEADO', ['CADEADO', 'PIPOCA', 'LEÃO'], 'ADO', 3, 'casa'),
                _r('DENTE', 'PRESENTE', ['PRESENTE', 'GELADO', 'SUCO'], 'ENTE', 3, 'cotidiano'),
                _r('JARDIM', 'PUDIM', ['PUDIM', 'FLOR', 'ÁRVORE'], 'IM', 3, 'comida'),
                _r('BOLO', 'TIJOLO', ['TIJOLO', 'SUCO', 'CAMA'], 'OLO', 3, 'comida'),
                _r('PIPOCA', 'MINHOCA', ['MINHOCA', 'PANELA', 'DADO'], 'OCA', 3, 'animais'),
                _r('CORAÇÃO', 'BALÃO', ['BALÃO', 'CANETA', 'CACHORRO'], 'ÃO', 3, 'cotidiano'),
                _r('SOL', 'CARACOL', ['CARACOL', 'NUVEM', 'LIVRO'], 'OL', 3, 'animais'),
                _r('BANANA', 'CABANA', ['CABANA', 'TOMATE', 'SUCO'], 'ANA', 3, 'comida'),
                _r('CANETA', 'PLANETA', ['PLANETA', 'LÁPIS', 'MESA'], 'ETA', 3, 'escola'),
                _r('MACACO', 'CASACO', ['CASACO', 'BANANA', 'GATO'], 'ACO', 3, 'animais'),

                // Degrau 4: Rimas Complexas (-ELHO, -EIXE, -ELO, -ENTO)
                _r('COELHO', 'ESPELHO', ['ESPELHO', 'JANELA', 'RATO'], 'ELHO', 4, 'animais'),
                _r('PEIXE', 'FEIXE', ['FEIXE', 'BARCO', 'PEDRA'], 'EIXE', 4, 'animais'),
                _r('CASTELO', 'AMARELO', ['AMARELO', 'REI', 'TORRE'], 'ELO', 4, 'escola'),
                _r('VENTO', 'TALENTO', ['TALENTO', 'BRISA', 'FOLHA'], 'ENTO', 4, 'natureza'),
                _r('ESTRELA', 'AQUARELA', ['AQUARELA', 'NOITE', 'LUA'], 'ELA', 4, 'escola'),
                _r('TARTARUGA', 'VERRUGA', ['VERRUGA', 'CASCO', 'LAGO'], 'UGA', 4, 'animais'),
                _r('CAMINHO', 'PASSARINHO', ['PASSARINHO', 'ÁRVORE', 'PEDRA'], 'INHO', 4, 'natureza'),
                _r('TESOURA', 'CENOURA', ['CENOURA', 'PAPEL', 'COLA'], 'OURA', 4, 'escola'),
                _r('CHOCOLATE', 'ABACATE', ['ABACATE', 'DOCE', 'LEITE'], 'ATE', 4, 'comida'),
                _r('MONTANHA', 'ARANHA', ['ARANHA', 'NUVEM', 'SOL'], 'ANHA', 4, 'natureza')
            ],

            // P8: Frases Curtas (40 frases únicas — 10 por degrau)
            p8: [
                // Degrau 1: 3 Blocos Base
                _s('O GATO BEBE LEITE', ['O GATO', 'BEBE', 'LEITE'], 1, 'animais'),
                _s('A BOLA É AZUL', ['A BOLA', 'É', 'AZUL'], 1, 'cotidiano'),
                _s('A MENINA COMEU MAÇÃ', ['A MENINA', 'COMEU', 'MAÇÃ'], 1, 'comida'),
                _s('O MENINO CHUTA A BOLA', ['O MENINO', 'CHUTA', 'A BOLA'], 1, 'cotidiano'),
                _s('EU GOSTO DE DESENHAR', ['EU', 'GOSTO DE', 'DESENHAR'], 1, 'escola'),
                _s('A CASA TEM JARDIM', ['A CASA', 'TEM', 'JARDIM'], 1, 'casa'),
                _s('O PATO VIVE NO LAGO', ['O PATO', 'VIVE', 'NO LAGO'], 1, 'animais'),
                _s('A VACA DÁ LEITE', ['A VACA', 'DÁ', 'LEITE'], 1, 'animais'),
                _s('O BOLO ESTÁ QUENTE', ['O BOLO', 'ESTÁ', 'QUENTE'], 1, 'comida'),
                _s('O LIVRO É LEGAL', ['O LIVRO', 'É', 'LEGAL'], 1, 'escola'),

                // Degrau 2: Animais & Ações
                _s('O CACHORRO LATIU ALTO', ['O CACHORRO', 'LATIU', 'ALTO'], 2, 'animais'),
                _s('O SAPO PULA NA LAGOA', ['O SAPO', 'PULA', 'NA LAGOA'], 2, 'animais'),
                _s('O PASSARINHO CANTA FELIZ', ['O PASSARINHO', 'CANTA', 'FELIZ'], 2, 'animais'),
                _s('O PEIXE NADA NO RIO', ['O PEIXE', 'NADA', 'NO RIO'], 2, 'animais'),
                _s('A CORUJA DORME DE DIA', ['A CORUJA', 'DORME', 'DE DIA'], 2, 'animais'),
                _s('O COELHO COME CENOURA', ['O COELHO', 'COME', 'CENOURA'], 2, 'animais'),
                _s('O PATO NADA NA LAGOA', ['O PATO', 'NADA', 'NA LAGOA'], 2, 'animais'),
                _s('O MACACO GOSTA DE BANANA', ['O MACACO', 'GOSTA DE', 'BANANA'], 2, 'animais'),
                _s('A ABELHA PRODUZ MEL DOCE', ['A ABELHA', 'PRODUZ', 'MEL DOCE'], 2, 'animais'),
                _s('A TARTARUGA ANDA DEVAGAR', ['A TARTARUGA', 'ANDA', 'DEVAGAR'], 2, 'animais'),

                // Degrau 3: Natureza & Escola
                _s('O SOL BRILHA NO CÉU', ['O SOL', 'BRILHA', 'NO CÉU'], 3, 'natureza'),
                _s('O LIVRO TEM HISTÓRIAS', ['O LIVRO', 'TEM', 'HISTÓRIAS'], 3, 'escola'),
                _s('O BARCO NAVEGA NO MAR', ['O BARCO', 'NAVEGA', 'NO MAR'], 3, 'natureza'),
                _s('A BORBOLETA VOA NO JARDIM', ['A BORBOLETA', 'VOA', 'NO JARDIM'], 3, 'natureza'),
                _s('A MAÇÃ É MUITO DOCE', ['A MAÇÃ', 'É', 'MUITO DOCE'], 3, 'comida'),
                _s('A ESTRELA BRILHA NA NOITE', ['A ESTRELA', 'BRILHA', 'NA NOITE'], 3, 'natureza'),
                _s('O VENTO SOPRA AS FOLHAS', ['O VENTO', 'SOPRA', 'AS FOLHAS'], 3, 'natureza'),
                _s('A FLOR CRESCE NO VASO', ['A FLOR', 'CRESCE', 'NO VASO'], 3, 'natureza'),
                _s('O TREM ANDA NOS TRILHOS', ['O TREM', 'ANDA', 'NOS TRILHOS'], 3, 'cotidiano'),
                _s('A CHUVA MOLHA A PLANTA', ['A CHUVA', 'MOLHA', 'A PLANTA'], 3, 'natureza'),

                // Degrau 4: Frases Descritivas & Rotina
                _s('A CRIANÇA LÊ UM LIVRO NOVO', ['A CRIANÇA', 'LÊ UM', 'LIVRO NOVO'], 4, 'escola'),
                _s('NÓS ESTUDAMOS COM ALEGRIA', ['NÓS', 'ESTUDAMOS', 'COM ALEGRIA'], 4, 'escola'),
                _s('A MOCHILA FICA NA CADEIRA', ['A MOCHILA', 'FICA', 'NA CADEIRA'], 4, 'escola'),
                _s('O SOL AQUECE A FLORESTA VERDE', ['O SOL', 'AQUECE A', 'FLORESTA VERDE'], 4, 'natureza'),
                _s('EU PINTO UM DESENHO COLORIDO', ['EU PINTO', 'UM DESENHO', 'COLORIDO'], 4, 'escola'),
                _s('A FAMÍLIA JANTA NA COZINHA', ['A FAMÍLIA', 'JANTA', 'NA COZINHA'], 4, 'casa'),
                _s('O ELEFANTE BEBE ÁGUA FRESCA', ['O ELEFANTE', 'BEBE', 'ÁGUA FRESCA'], 4, 'animais'),
                _s('A BICICLETA CORRE NA PRAÇA', ['A BICICLETA', 'CORRE', 'NA PRAÇA'], 4, 'cotidiano'),
                _s('O BOLO DE CHOCOLATE É ÓTIMO', ['O BOLO DE', 'CHOCOLATE', 'É ÓTIMO'], 4, 'comida'),
                _s('A PROFESSORA ENSINA NOVAS PALAVRAS', ['A PROFESSORA', 'ENSINA', 'NOVAS PALAVRAS'], 4, 'escola')
            ]
        }
    };

    // ============================================================
    // 3. AUTO-SEPARADOR INTELIGENTE (EN FONÉTICO & PT-BR SILÁBICO)
    // ============================================================
    const EN_DIGRAPHS = ['SH', 'CH', 'TH', 'WH', 'PH', 'QU', 'CK', 'NG', 'LL', 'EE', 'OO', 'AI', 'AY', 'OA', 'OU', 'OW', 'EA', 'AR', 'ER', 'IR', 'OR', 'UR'];
    const PT_VOWELS = 'AEIOUÁÉÍÓÚÂÊÔÃÕÜ';
    const PT_INSEP_PAIRS = new Set(['CH', 'LH', 'NH', 'QU', 'GU', 'BR', 'CR', 'DR', 'FR', 'GR', 'PR', 'TR', 'VR', 'BL', 'CL', 'FL', 'GL', 'PL', 'TL']);
    const PT_DIPHTHONGS = new Set(['AI', 'EI', 'OI', 'UI', 'AU', 'EU', 'OU', 'ÃO', 'ÕE', 'ÃE', 'ÁI', 'ÉI', 'ÓI', 'ÉU', 'ÓU', 'IU']);

    function _isPtVowel(ch) {
        return ch && PT_VOWELS.includes(ch);
    }

    function _splitPtWord(word) {
        const w = String(word || '').trim().toUpperCase();
        if (w.length <= 2) return [w];

        // Segmenta em tokens atômicos preservando dígrafos indivisíveis (CH, LH, NH, QU, GU)
        const vowelsIdx = [];
        for (let i = 0; i < w.length; i++) {
            if (_isPtVowel(w[i])) {
                // Em QU/GU seguido de vogal, o U é semivogal/dígrafo junto à vogal seguinte
                if ((w[i] === 'U') && i > 0 && (w[i - 1] === 'Q' || w[i - 1] === 'G') && i + 1 < w.length && _isPtVowel(w[i + 1])) {
                    continue;
                }
                vowelsIdx.push(i);
            }
        }
        if (vowelsIdx.length <= 1) return [w];

        // Agrupa ditongos canônicos como único núcleo vocálico
        const nuclei = [];
        for (let i = 0; i < vowelsIdx.length; i++) {
            const pos = vowelsIdx[i];
            if (nuclei.length > 0) {
                const prev = nuclei[nuclei.length - 1];
                if (pos === prev.end + 1) {
                    const pair = w[prev.end] + w[pos];
                    if (PT_DIPHTHONGS.has(pair)) {
                        prev.end = pos;
                        continue;
                    }
                }
            }
            nuclei.push({ start: pos, end: pos });
        }
        if (nuclei.length <= 1) return [w];

        const cuts = [];
        for (let n = 0; n < nuclei.length - 1; n++) {
            const cStart = nuclei[n].end + 1;
            const cEnd = nuclei[n + 1].start;
            const cons = w.slice(cStart, cEnd);

            // Se a vogal do próximo núcleo veio depois de QU/GU, puxa o Q/G junto ao ataque
            if (cons.length === 0) {
                cuts.push(cEnd);
            } else if (cons.length === 1) {
                cuts.push(cStart);
            } else if (cons.length === 2) {
                if (PT_INSEP_PAIRS.has(cons)) {
                    cuts.push(cStart);
                } else {
                    cuts.push(cStart + 1);
                }
            } else {
                const lastTwo = cons.slice(-2);
                if (PT_INSEP_PAIRS.has(lastTwo)) {
                    cuts.push(cEnd - 2);
                } else {
                    cuts.push(cStart + 1);
                }
            }
        }

        const syllables = [];
        let prevCut = 0;
        cuts.forEach(cut => {
            if (cut > prevCut && cut < w.length) {
                syllables.push(w.slice(prevCut, cut));
                prevCut = cut;
            }
        });
        if (prevCut < w.length) syllables.push(w.slice(prevCut));
        return syllables.length > 0 ? syllables : [w];
    }

    function _splitEnWord(word, levelId) {
        const w = String(word || '').trim().toUpperCase();
        if (!w) return [];
        if (levelId === 'i2' && w.length === 3) {
            return w.split('');
        }
        // Magic E (I5): agrupa consoante + E final (ex.: CAKE -> C A KE, SNAKE -> S NA KE)
        if (levelId === 'i5' && w.length >= 4 && w.endsWith('E')) {
            const tail = w.slice(-2); // ex: KE, ME, TE, BE
            const head = w.slice(0, -2);
            if (head.length === 2) {
                return [head[0], head[1], tail];
            }
            if (head.length === 3) {
                if (EN_DIGRAPHS.includes(head.slice(0, 2))) {
                    return [head.slice(0, 2), head[2], tail];
                }
                return [head[0], head.slice(1), tail];
            }
        }
        // Padrão fonético EN: agrupa dígrafos conhecidos (SH, CH, TH, WH, CK, NG, LL, EE, OO...)
        const parts = [];
        let i = 0;
        while (i < w.length) {
            const two = w.slice(i, i + 2);
            if (two.length === 2 && EN_DIGRAPHS.includes(two)) {
                parts.push(two);
                i += 2;
            } else if (i === w.length - 2 && w[i + 1] === 'E' && w.length >= 4 && !'AEIOU'.includes(w[i])) {
                parts.push(two);
                i += 2;
            } else {
                parts.push(w[i]);
                i += 1;
            }
        }
        return parts;
    }

    function autoSplitParts(rawText, subjectKey = 'ingles', levelId = 'i2') {
        const clean = String(rawText || '').trim().toUpperCase().replace(/\s+/g, ' ');
        if (!clean) return [];

        // Frases (I6 / P8): divide em 3 blocos pedagógicos equilibrados
        if (levelId === 'i6' || levelId === 'p8' || clean.includes(' ')) {
            const words = clean.split(' ').filter(Boolean);
            if (words.length <= 3) return words;
            if (words.length === 4) return [words[0] + ' ' + words[1], words[2], words[3]];
            const third = Math.ceil(words.length / 3);
            return [
                words.slice(0, third).join(' '),
                words.slice(third, third * 2).join(' '),
                words.slice(third * 2).join(' ')
            ].filter(Boolean);
        }

        if (subjectKey === 'portugues') {
            return _splitPtWord(clean);
        }
        return _splitEnWord(clean, levelId);
    }

    // ============================================================
    // 4. ARMAZENAMENTO DE "MINHAS EXTRAS" ISOLADO POR ALUNO + TURMA
    // ============================================================
    function _readBucket(key) {
        const storage = _getStorage();
        if (!storage) return [];
        try {
            const raw = storage.getItem(key);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    function _writeBucket(key, list) {
        const storage = _getStorage();
        if (!storage) return;
        try {
            storage.setItem(key, JSON.stringify((list || []).slice(0, 300)));
        } catch (e) {}
    }

    function _sanitizeEntry(entry, scope) {
        if (!entry || typeof entry !== 'object') return null;
        const subjectKey = entry.subjectKey === 'portugues' ? 'portugues' : 'ingles';
        const levelId = String(entry.levelId || '').toLowerCase();
        if (!levelId) return null;

        const base = {
            id: String(entry.id || ('cv_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6))),
            subjectKey,
            levelId,
            type: entry.type || (levelId === 'i6' || levelId === 'p8' ? 'sentence' : (levelId === 'i7' ? 'opposite' : (levelId === 'p7' ? 'rhyme' : 'word'))),
            theme: THEME_MAP[entry.theme] ? entry.theme : 'escola',
            scope: scope === 'shared' ? 'shared' : 'student',
            isCustom: true,
            createdAt: entry.createdAt || new Date().toISOString()
        };

        if (base.type === 'sentence') {
            const sent = String(entry.sentence || entry.word || '').trim().toUpperCase().slice(0, 60);
            if (!sent) return null;
            const parts = Array.isArray(entry.parts) && entry.parts.length > 0
                ? entry.parts.map(p => String(p).trim().toUpperCase()).filter(Boolean)
                : autoSplitParts(sent, subjectKey, levelId);
            return Object.assign(base, { sentence: sent, parts });
        }

        if (base.type === 'opposite' || base.type === 'rhyme') {
            const word = String(entry.word || '').trim().toUpperCase().slice(0, 24);
            const target = String(entry.target || '').trim().toUpperCase().slice(0, 24);
            if (!word || !target) return null;
            const distractors = Array.isArray(entry.options) && entry.options.length >= 2
                ? entry.options.map(o => String(o).trim().toUpperCase()).filter(Boolean)
                : [target, subjectKey === 'portugues' ? 'MESA' : 'FAST', subjectKey === 'portugues' ? 'BOLA' : 'COLD'];
            if (!distractors.includes(target)) distractors.unshift(target);
            const uniqOpts = Array.from(new Set(distractors)).slice(0, 3);
            if (base.type === 'opposite') {
                return Object.assign(base, { word, target, options: uniqOpts, icon: entry.icon || '🔄' });
            }
            return Object.assign(base, { word, target, options: uniqOpts, rhymeEnding: entry.rhymeEnding || target.slice(-3) });
        }

        const word = String(entry.word || '').trim().toUpperCase().slice(0, 24);
        if (!word) return null;
        let parts = Array.isArray(entry.parts) && entry.parts.length > 0
            ? entry.parts.map(p => String(p).trim().toUpperCase()).filter(Boolean)
            : autoSplitParts(word, subjectKey, levelId);
        // Garante recomposição exata (se o usuário editou para algo que diverge, mantém o texto unido como fallback)
        if (parts.join('') !== word.replace(/\s+/g, '')) {
            parts = autoSplitParts(word, subjectKey, levelId);
        }
        return Object.assign(base, { word, parts });
    }

    function getCustomItems(subjectKey, levelId, studentId = null) {
        const sid = _getActiveStudentId(studentId);
        const studentList = _readBucket(STORAGE_PREFIX + sid)
            .filter(it => it && it.subjectKey === subjectKey && it.levelId === levelId)
            .map(it => Object.assign({}, it, { scope: 'student', isCustom: true }));
        const sharedList = _readBucket(SHARED_SCOPE_KEY)
            .filter(it => it && it.subjectKey === subjectKey && it.levelId === levelId)
            .map(it => Object.assign({}, it, { scope: 'shared', isCustom: true }));

        const seen = new Set();
        const combined = [];
        [...studentList, ...sharedList].forEach(it => {
            const k = (it.word || it.sentence || '') + '|' + (it.target || '');
            if (!seen.has(k)) {
                seen.add(k);
                combined.push(it);
            }
        });
        return combined;
    }

    function addCustomItem(subjectKey, levelId, rawEntry, scope = 'student', studentId = null) {
        const clean = _sanitizeEntry(Object.assign({}, rawEntry, { subjectKey, levelId }), scope);
        if (!clean) return { success: false, error: 'Preencha um item válido.' };

        const targetKey = (scope === 'shared') ? SHARED_SCOPE_KEY : (STORAGE_PREFIX + _getActiveStudentId(studentId));
        const list = _readBucket(targetKey);
        const dupKey = (it) => `${it.subjectKey}|${it.levelId}|${it.word || it.sentence || ''}`;
        const newKey = dupKey(clean);
        const existingIdx = list.findIndex(it => dupKey(it) === newKey);
        if (existingIdx >= 0) {
            list[existingIdx] = Object.assign({}, list[existingIdx], clean, { id: list[existingIdx].id });
        } else {
            list.unshift(clean);
        }
        _writeBucket(targetKey, list);
        try {
            if (typeof global !== 'undefined' && typeof global.dispatchEvent === 'function') {
                global.dispatchEvent(new CustomEvent('kumongen:vocab_changed', { detail: { subjectKey, levelId } }));
            }
        } catch (e) {}
        return { success: true, item: clean };
    }

    function addBatchItems(subjectKey, levelId, rawText, theme = 'escola', scope = 'student', studentId = null) {
        const lines = String(rawText || '')
            .split(/[\r\n,;]+/)
            .map(s => s.trim())
            .filter(Boolean);
        let added = 0;
        lines.forEach(line => {
            if (levelId === 'i7' || levelId === 'p7') {
                const pair = line.split(/[-–=>:/]+/).map(s => s.trim()).filter(Boolean);
                if (pair.length >= 2) {
                    const r = addCustomItem(subjectKey, levelId, { word: pair[0], target: pair[1], theme }, scope, studentId);
                    if (r.success) added++;
                }
            } else if (levelId === 'i6' || levelId === 'p8') {
                const r = addCustomItem(subjectKey, levelId, { sentence: line, parts: autoSplitParts(line, subjectKey, levelId), theme }, scope, studentId);
                if (r.success) added++;
            } else {
                const wordClean = line.replace(/[^a-zA-ZÀ-ÿ]/g, '').toUpperCase();
                if (wordClean.length >= 2) {
                    const r = addCustomItem(subjectKey, levelId, { word: wordClean, parts: autoSplitParts(wordClean, subjectKey, levelId), theme }, scope, studentId);
                    if (r.success) added++;
                }
            }
        });
        return { added, totalLines: lines.length };
    }

    function removeCustomItem(itemId, scope = 'student', studentId = null) {
        const targetKey = (scope === 'shared') ? SHARED_SCOPE_KEY : (STORAGE_PREFIX + _getActiveStudentId(studentId));
        const list = _readBucket(targetKey).filter(it => it && it.id !== itemId);
        _writeBucket(targetKey, list);
        try {
            if (typeof global !== 'undefined' && typeof global.dispatchEvent === 'function') {
                global.dispatchEvent(new CustomEvent('kumongen:vocab_changed', { detail: { itemId } }));
            }
        } catch (e) {}
        return true;
    }

    function clearCustomItemsForLevel(subjectKey, levelId, studentId = null) {
        const sid = _getActiveStudentId(studentId);
        const sKey = STORAGE_PREFIX + sid;
        _writeBucket(sKey, _readBucket(sKey).filter(it => !(it && it.subjectKey === subjectKey && it.levelId === levelId)));
        _writeBucket(SHARED_SCOPE_KEY, _readBucket(SHARED_SCOPE_KEY).filter(it => !(it && it.subjectKey === subjectKey && it.levelId === levelId)));
    }

    // Exportação / Importação para Backup JSON (StudentProfileEngine)
    function exportAllCustomVocab(studentIds = []) {
        const byStudent = {};
        const ids = Array.isArray(studentIds) ? studentIds : [];
        ids.forEach(sid => {
            const list = _readBucket(STORAGE_PREFIX + sid);
            if (list.length > 0) byStudent[sid] = list;
        });
        const shared = _readBucket(SHARED_SCOPE_KEY);
        return { byStudent, shared };
    }

    function importAllCustomVocab(payload, idRemap = {}) {
        if (!payload || typeof payload !== 'object') return false;
        if (Array.isArray(payload.shared)) {
            const cleanShared = payload.shared.map(it => _sanitizeEntry(it, 'shared')).filter(Boolean);
            _writeBucket(SHARED_SCOPE_KEY, cleanShared);
        }
        if (payload.byStudent && typeof payload.byStudent === 'object') {
            Object.keys(payload.byStudent).forEach(origId => {
                const targetId = (idRemap && idRemap[origId]) || origId;
                const rawList = payload.byStudent[origId];
                if (Array.isArray(rawList)) {
                    const cleanList = rawList.map(it => _sanitizeEntry(it, 'student')).filter(Boolean);
                    _writeBucket(STORAGE_PREFIX + targetId, cleanList);
                }
            });
        }
        return true;
    }

    // Migração silenciosa única: resgata palavras genuinamente novas de params antigos e limpa vazamento I2->I4
    function migrateLegacyCustomWords(subjectKey, legacyWordList, currentLevelId) {
        const storage = _getStorage();
        if (!storage) return 0;
        const flagKey = MIGRATION_FLAG_PREFIX + subjectKey;
        if (storage.getItem(flagKey) === 'done') return 0;

        let migrated = 0;
        try {
            if (Array.isArray(legacyWordList) && legacyWordList.length > 0) {
                const knownWords = new Set();
                const subCat = CATALOG[subjectKey] || {};
                Object.values(subCat).forEach(arr => {
                    if (Array.isArray(arr)) arr.forEach(it => { if (it && it.word) knownWords.add(it.word.toUpperCase()); });
                });
                const validTargetLevel = (subjectKey === 'ingles')
                    ? (['i2', 'i3', 'i4', 'i5'].includes(currentLevelId) ? currentLevelId : 'i2')
                    : (['p3', 'p4'].includes(currentLevelId) ? currentLevelId : 'p3');

                legacyWordList.forEach(w => {
                    const wordUp = w && w.word ? String(w.word).trim().toUpperCase() : '';
                    if (wordUp && !knownWords.has(wordUp)) {
                        const res = addCustomItem(subjectKey, validTargetLevel, { word: wordUp, parts: w.parts, theme: 'escola' }, 'student');
                        if (res.success) migrated++;
                    }
                });
            }
            storage.setItem(flagKey, 'done');
        } catch (e) {}
        return migrated;
    }

    // ============================================================
    // 5. MOTOR DE COMPOSIÇÃO GRADUADA 80/20 + TEMAS + PRIORIDADE DE EXTRAS
    // ============================================================
    function getCatalogForLevel(subjectKey, levelId) {
        const sub = CATALOG[subjectKey];
        if (!sub || !Array.isArray(sub[levelId])) return [];
        return sub[levelId];
    }

    function getStageItems(subjectKey, levelId, stage = 1, theme = 'all') {
        const all = getCatalogForLevel(subjectKey, levelId);
        const s = Math.max(1, Math.min(4, parseInt(stage, 10) || 1));
        const inStage = all.filter(it => it.stage === s);
        if (theme && theme !== 'all') {
            const themed = inStage.filter(it => it.theme === theme);
            if (themed.length > 0) return themed;
            // Se o degrau específico tiver poucos itens desse tema, busca o tema no módulo inteiro antes de cair no degrau
            const themedModule = all.filter(it => it.theme === theme);
            if (themedModule.length > 0) return themedModule;
        }
        return inStage.length > 0 ? inStage : all;
    }

    function _shuffle(arr) {
        const copy = arr.slice();
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = copy[i];
            copy[i] = copy[j];
            copy[j] = tmp;
        }
        return copy;
    }

    function _cloneItem(it) {
        const c = Object.assign({}, it);
        if (Array.isArray(it.parts)) c.parts = it.parts.slice();
        if (Array.isArray(it.options)) c.options = it.options.slice();
        return c;
    }

    function _itemKey(it) {
        if (!it) return '';
        if (it.type === 'sentence') return 's:' + (it.sentence || '');
        if (it.type === 'opposite') return 'o:' + (it.word || '');
        if (it.type === 'rhyme') return 'r:' + (it.word || '');
        return 'w:' + (it.word || '');
    }

    function composeGraduatedPool(options) {
        const opts = options || {};
        const subjectKey = opts.subjectKey || 'ingles';
        const levelId = opts.levelId || 'i2';
        const stage = Math.max(1, Math.min(4, parseInt(opts.stage, 10) || 1));
        const count = Math.max(1, parseInt(opts.count, 10) || 16);
        const theme = opts.theme || 'all';
        const studentId = opts.studentId || null;

        const allCatalog = getCatalogForLevel(subjectKey, levelId);
        if (allCatalog.length === 0) return [];

        const hasThemeFilter = !!(theme && theme !== 'all');
        const themedAllCatalog = hasThemeFilter ? allCatalog.filter(it => it.theme === theme) : [];

        const stagePool = getStageItems(subjectKey, levelId, stage, theme);
        const prevPool = stage > 1 ? getStageItems(subjectKey, levelId, stage - 1, theme) : [];
        let customPool = getCustomItems(subjectKey, levelId, studentId);
        if (hasThemeFilter) {
            customPool = customPool.filter(it => it.theme === theme);
        }

        const picked = [];
        const usedKeys = new Set();

        const pushUniqueFrom = (sourceArr, quota) => {
            if (!Array.isArray(sourceArr) || sourceArr.length === 0 || quota <= 0) return;
            const shuffled = _shuffle(sourceArr);
            let added = 0;
            for (let i = 0; i < shuffled.length && added < quota; i++) {
                const k = _itemKey(shuffled[i]);
                if (!usedKeys.has(k)) {
                    usedKeys.add(k);
                    picked.push(_cloneItem(shuffled[i]));
                    added++;
                }
            }
        };

        // 1. Prioridade garantida para "Minhas Extras" (até 50% do lote para nunca sumirem no degrau 1!)
        const customQuota = customPool.length > 0 ? Math.min(customPool.length, Math.max(1, Math.ceil(count * 0.5))) : 0;
        pushUniqueFrom(customPool, customQuota);

        // 2. Composição 80% Degrau Atual + 20% Revisão Leve do Degrau Anterior (quando stage >= 2)
        const remaining = Math.max(0, count - picked.length);
        const reviewQuota = (stage > 1 && prevPool.length > 0 && remaining >= 4)
            ? Math.max(1, Math.round(remaining * 0.2))
            : 0;
        const primaryQuota = Math.max(0, remaining - reviewQuota);

        pushUniqueFrom(stagePool, primaryQuota);
        pushUniqueFrom(prevPool, reviewQuota);

        // 2.5 Quando há filtro temático ativo e o degrau teve menos itens que o lote, busca mais itens ÚNICOS do mesmo tema no módulo
        if (hasThemeFilter && picked.length < count && themedAllCatalog.length > 0) {
            pushUniqueFrom(themedAllCatalog, count - picked.length);
        }

        // 3. Completa se o caderno pedido for maior que o conjunto único disponível (mantendo fidelidade de tema e evitando repetições consecutivas)
        const fallbackPool = (hasThemeFilter && themedAllCatalog.length > 0)
            ? [..._shuffle(stagePool), ..._shuffle(customPool), ..._shuffle(themedAllCatalog)]
            : [..._shuffle(stagePool), ..._shuffle(customPool), ..._shuffle(prevPool), ..._shuffle(allCatalog)];
        let cursor = 0;
        while (picked.length < count && fallbackPool.length > 0 && cursor < count * 4) {
            const cand = fallbackPool[cursor % fallbackPool.length];
            cursor++;
            if (picked.length > 0 && _itemKey(picked[picked.length - 1]) === _itemKey(cand) && fallbackPool.length > 1) {
                continue;
            }
            picked.push(_cloneItem(cand));
        }

        // Embaralha e desagrupa consecutivos
        if (typeof global !== 'undefined' && global.KumonGen && typeof global.KumonGen.shuffleAndDecluster === 'function') {
            return global.KumonGen.shuffleAndDecluster(picked, _itemKey).slice(0, count);
        }
        return _shuffle(picked).slice(0, count);
    }

    // ============================================================
    // 6. GERENCIADOR VERTICAL RESPONSIVO NA SIDEBAR & MODAL AMPLIADO
    // ============================================================
    const _uiState = {
        activeTab: 'stage',   // 'stage' | 'custom'
        addMode: 'single',    // 'single' | 'batch'
        searchQuery: '',
        addScope: 'student',  // 'student' | 'shared'
        addTheme: 'escola',
        lastAutoSplitVal: ''
    };

    function _formatItemRow(it, subjectKey, levelId) {
        const themeObj = THEME_MAP[it.theme] || THEME_MAP.cotidiano;
        const themePill = `<span class="vocab-theme-dot" title="${_esc(themeObj.label)}">${themeObj.emoji}</span>`;
        if (it.type === 'sentence') {
            return {
                main: it.sentence,
                sub: (it.parts || []).join(' · '),
                themePill
            };
        }
        if (it.type === 'opposite' || it.type === 'rhyme') {
            return {
                main: `${it.word} → ${it.target}`,
                sub: it.type === 'opposite' ? (it.icon || 'oposto') : `rima -${it.rhymeEnding || ''}`,
                themePill
            };
        }
        return {
            main: it.word,
            sub: `[${(it.parts || []).join(' ')}]`,
            themePill
        };
    }

    function renderSidebarManager(config) {
        const cfg = config || {};
        const container = cfg.container || document.getElementById('paramPanel');
        if (!container) return;

        const subjectKey = cfg.subjectKey || 'ingles';
        const levelId = cfg.levelId || 'i2';
        const stage = Math.max(1, Math.min(4, parseInt(cfg.stage, 10) || 1));
        const selectedTheme = cfg.selectedTheme || 'all';
        const accentHex = cfg.accentHex || (subjectKey === 'portugues' ? '#059669' : '#dc2626');
        const onThemeChange = cfg.onThemeChange;
        const onVocabMutated = cfg.onVocabMutated;
        const repeatVal = cfg.repeatVal || 2;
        const onRepeatChange = cfg.onRepeatChange;

        const activeStudent = _getActiveStudent();
        const studentName = (activeStudent && activeStudent.name) ? activeStudent.name.split(' ')[0] : 'Aluno';

        const stageSpec = (typeof global !== 'undefined' && global.KumonProgression)
            ? global.KumonProgression.getStageSpec(subjectKey, levelId, stage)
            : { stage, shortLabel: `Degrau ${stage}`, label: `Degrau ${stage}/4` };

        const stageItems = getStageItems(subjectKey, levelId, stage, selectedTheme);
        const customItems = getCustomItems(subjectKey, levelId);
        const totalInModule = getCatalogForLevel(subjectKey, levelId).length;
        const q = (_uiState.searchQuery || '').trim().toUpperCase();

        const visibleStageItems = q
            ? stageItems.filter(it => (it.word || it.sentence || '').toUpperCase().includes(q) || (it.target || '').toUpperCase().includes(q))
            : stageItems;
        const visibleCustomItems = q
            ? customItems.filter(it => (it.word || it.sentence || '').toUpperCase().includes(q) || (it.target || '').toUpperCase().includes(q))
            : customItems;

        const isPairLevel = (levelId === 'i7' || levelId === 'p7');
        const isSentenceLevel = (levelId === 'i6' || levelId === 'p8');
        const isPt = subjectKey === 'portugues';

        const themeChipsHtml = THEMES.map(t => {
            const isAct = selectedTheme === t.id;
            return `<button type="button" class="vocab-theme-chip ${isAct ? 'active' : ''}" data-vocab-theme="${t.id}" style="${isAct ? `background:${accentHex};border-color:${accentHex};color:#fff;` : ''}">${t.emoji} ${t.label}</button>`;
        }).join('');

        let listHtml = '';
        if (_uiState.activeTab === 'stage') {
            if (visibleStageItems.length === 0) {
                listHtml = `<div class="text-slate-400 text-[11px] text-center py-3">Nenhum item encontrado com este filtro.</div>`;
            } else {
                listHtml = visibleStageItems.map(it => {
                    const row = _formatItemRow(it, subjectKey, levelId);
                    return `
                        <div class="vocab-list-row">
                            <div class="vocab-list-row-main">
                                ${row.themePill}
                                <span class="vocab-word-text">${_esc(row.main)}</span>
                            </div>
                            <span class="vocab-parts-text">${_esc(row.sub)}</span>
                        </div>
                    `;
                }).join('');
            }
        } else {
            if (visibleCustomItems.length === 0) {
                listHtml = `<div class="text-slate-400 text-[11px] text-center py-3 leading-relaxed">Nenhuma palavra extra ainda.<br>Use o formulário abaixo para adicionar palavras da escola!</div>`;
            } else {
                listHtml = visibleCustomItems.map(it => {
                    const row = _formatItemRow(it, subjectKey, levelId);
                    const scopeBadge = it.scope === 'shared'
                        ? `<span class="vocab-scope-badge shared" title="Compartilhada com todos os perfis">👥</span>`
                        : `<span class="vocab-scope-badge student" title="Exclusiva de ${_esc(studentName)}">👤</span>`;
                    return `
                        <div class="vocab-list-row custom-row">
                            <div class="vocab-list-row-main">
                                ${scopeBadge}
                                ${row.themePill}
                                <span class="vocab-word-text">${_esc(row.main)}</span>
                            </div>
                            <div class="vocab-row-actions">
                                <span class="vocab-parts-text">${_esc(row.sub)}</span>
                                <button type="button" class="remove-word vocab-del-btn" data-custom-id="${_esc(it.id)}" data-custom-scope="${_esc(it.scope)}" title="Remover palavra extra" aria-label="Remover">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        const singlePlaceholderWord = isSentenceLevel
            ? (isPt ? 'Ex: O GATO PULA ALTO' : 'Ex: THE CAT IS HAPPY')
            : (isPairLevel
                ? (isPt ? 'Palavra (ex: ESTRELA)' : 'Word (ex: FAST)')
                : (isPt ? 'Palavra (ex: BORBOLETA)' : 'Word (ex: THIS)'));

        const singlePlaceholderParts = isSentenceLevel
            ? (isPt ? 'Blocos automáticos (editável)' : 'Auto blocks (editable)')
            : (isPairLevel
                ? (isPt ? 'Rima correta (ex: AQUARELA)' : 'Opposite (ex: SLOW)')
                : (isPt ? 'Sílabas automáticas (ex: BOR BO LE TA)' : 'Auto parts (ex: TH I S)'));

        const batchPlaceholder = isPairLevel
            ? (isPt ? 'Uma por linha:\nGATO - PATO\nESTRELA - AQUARELA' : 'One per line:\nBIG - SMALL\nFAST - SLOW')
            : (isSentenceLevel
                ? (isPt ? 'Uma frase por linha:\nO SOL BRILHA\nA BOLA É AZUL' : 'One sentence per line:\nI SEE A DOG\nTHE SUN IS HOT')
                : (isPt ? 'Cole palavras (linha ou vírgula):\nBORBOLETA, ESCOLA, CADERNO' : 'Paste words (line or comma):\nTHIS, THAT, TREE, SNAKE'));

        const themeSelectOptions = THEMES.filter(t => t.id !== 'all')
            .map(t => `<option value="${t.id}" ${_uiState.addTheme === t.id ? 'selected' : ''}>${t.emoji} ${t.label}</option>`)
            .join('');

        container.innerHTML = `
            <div class="param-control vocab-manager-root" id="vocabManagerRoot">
                <!-- Cabeçalho do Set Ativo -->
                <div class="vocab-stage-banner">
                    <div class="min-w-0">
                        <div class="text-[10px] font-black uppercase tracking-wide text-slate-500">Degrau ${stage}/4 · ${totalInModule} itens no módulo</div>
                        <div class="text-xs font-black text-slate-800 truncate">${_esc(stageSpec.label || stageSpec.shortLabel)}</div>
                    </div>
                    <button type="button" id="vocabExpandModalBtn" class="vocab-expand-btn" title="Abrir editor ampliado de vocabulário" aria-label="Expandir editor de vocabulário">
                        <i class="fas fa-expand-alt"></i>
                    </button>
                </div>

                <!-- Chips de Tema (Flex Wrap, Zero Overflow) -->
                <div>
                    <div class="text-[10px] font-bold uppercase text-slate-500 mb-1">Filtrar por tema:</div>
                    <div class="vocab-theme-chips-wrap" id="vocabThemeChips">
                        ${themeChipsHtml}
                    </div>
                </div>

                <!-- Abas Set do Degrau vs Minhas Extras -->
                <div class="vocab-tabs-row">
                    <button type="button" id="vocabTabStage" class="vocab-tab-btn ${_uiState.activeTab === 'stage' ? 'active' : ''}">
                        Degrau ${stage} (${stageItems.length})
                    </button>
                    <button type="button" id="vocabTabCustom" class="vocab-tab-btn ${_uiState.activeTab === 'custom' ? 'active' : ''}">
                        Extras (${customItems.length})
                    </button>
                </div>

                <!-- Busca Compacta + Lista Vertical -->
                <div class="vocab-search-wrap">
                    <i class="fas fa-search vocab-search-ico"></i>
                    <input type="text" id="vocabSearchInput" value="${_esc(_uiState.searchQuery)}" placeholder="${isPt ? 'Filtrar lista...' : 'Filter words...'}" class="vocab-input vocab-search-input">
                </div>

                <div id="wordListContainer" class="vocab-list-box">
                    ${listHtml}
                </div>

                <!-- Formulário Vertical (Zero Scroll Horizontal) -->
                <div class="vocab-add-card">
                    <div class="vocab-add-header">
                        <span class="text-[11px] font-black text-slate-800"><i class="fas fa-plus-circle" style="color:${accentHex}"></i> ${isPt ? 'Adicionar Extra' : 'Add Custom'}</span>
                        <div class="vocab-mode-pills">
                            <button type="button" id="vocabAddModeSingle" class="vocab-mini-pill ${_uiState.addMode === 'single' ? 'active' : ''}">1 item</button>
                            <button type="button" id="vocabAddModeBatch" class="vocab-mini-pill ${_uiState.addMode === 'batch' ? 'active' : ''}">Lista</button>
                        </div>
                    </div>

                    ${_uiState.addMode === 'single' ? `
                        <div class="vocab-vertical-stack">
                            <input type="text" id="newWord" placeholder="${singlePlaceholderWord}" class="vocab-input" autocomplete="off">
                            <div class="vocab-auto-parts-wrap">
                                <input type="text" id="newParts" placeholder="${singlePlaceholderParts}" class="vocab-input" autocomplete="off">
                                ${!isPairLevel ? '<span class="vocab-auto-badge" title="Separação sugerida automaticamente (você pode editar)">✨ Auto</span>' : ''}
                            </div>
                        </div>
                    ` : `
                        <div class="vocab-vertical-stack">
                            <textarea id="vocabBatchInput" rows="3" placeholder="${batchPlaceholder}" class="vocab-input vocab-textarea"></textarea>
                            <div class="text-[10px] text-slate-500">✨ Separação fonética/silábica gerada automaticamente.</div>
                        </div>
                    `}

                    <div class="vocab-meta-grid">
                        <select id="vocabAddThemeSelect" class="vocab-input vocab-select" aria-label="Tema da palavra">
                            ${themeSelectOptions}
                        </select>
                        <select id="vocabAddScopeSelect" class="vocab-input vocab-select" aria-label="Escopo da palavra">
                            <option value="student" ${_uiState.addScope === 'student' ? 'selected' : ''}>👤 Só ${_esc(studentName)}</option>
                            <option value="shared" ${_uiState.addScope === 'shared' ? 'selected' : ''}>👥 Toda Turma</option>
                        </select>
                    </div>

                    <div id="vocabAddFeedback" class="text-[10px] font-bold min-h-[14px] text-emerald-700"></div>

                    <button type="button" id="addWordBtn" class="vocab-submit-btn" style="background:${accentHex};">
                        <i class="fas fa-plus mr-1"></i>${_uiState.addMode === 'single' ? (isPt ? 'Adicionar Palavra' : 'Add to Module') : (isPt ? 'Adicionar Lista' : 'Add All Words')}
                    </button>
                </div>

                ${(!isSentenceLevel && !isPairLevel) ? `
                    <div class="vocab-repeat-row">
                        <label for="wordRepeat" class="text-xs font-semibold text-slate-600">${isPt ? 'Repetições:' : 'Repetitions:'}</label>
                        <input type="number" id="wordRepeat" value="${repeatVal}" min="1" max="5" class="vocab-input vocab-num-input">
                    </div>
                ` : ''}
            </div>
        `;

        // Bindings síncronos (sem setTimeout frágil!)
        container.querySelectorAll('.vocab-theme-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                const nextTheme = btn.getAttribute('data-vocab-theme') || 'all';
                if (typeof onThemeChange === 'function') onThemeChange(nextTheme);
            });
        });

        const tabStageBtn = container.querySelector('#vocabTabStage');
        const tabCustomBtn = container.querySelector('#vocabTabCustom');
        if (tabStageBtn) tabStageBtn.addEventListener('click', () => { _uiState.activeTab = 'stage'; renderSidebarManager(cfg); });
        if (tabCustomBtn) tabCustomBtn.addEventListener('click', () => { _uiState.activeTab = 'custom'; renderSidebarManager(cfg); });

        const modeSingleBtn = container.querySelector('#vocabAddModeSingle');
        const modeBatchBtn = container.querySelector('#vocabAddModeBatch');
        if (modeSingleBtn) modeSingleBtn.addEventListener('click', () => { _uiState.addMode = 'single'; renderSidebarManager(cfg); });
        if (modeBatchBtn) modeBatchBtn.addEventListener('click', () => { _uiState.addMode = 'batch'; renderSidebarManager(cfg); });

        const searchInp = container.querySelector('#vocabSearchInput');
        if (searchInp) {
            searchInp.addEventListener('input', (e) => {
                _uiState.searchQuery = e.target.value || '';
                const curPos = e.target.selectionStart || _uiState.searchQuery.length;
                renderSidebarManager(cfg);
                const freshInp = document.getElementById('vocabSearchInput');
                if (freshInp) { freshInp.focus(); freshInp.setSelectionRange(curPos, curPos); }
            });
        }

        const themeSel = container.querySelector('#vocabAddThemeSelect');
        if (themeSel) themeSel.addEventListener('change', (e) => { _uiState.addTheme = e.target.value; });
        const scopeSel = container.querySelector('#vocabAddScopeSelect');
        if (scopeSel) scopeSel.addEventListener('change', (e) => { _uiState.addScope = e.target.value; });

        // Auto-preenchimento ao vivo da separação silábica/fonética
        const newWordInp = container.querySelector('#newWord');
        const newPartsInp = container.querySelector('#newParts');
        if (newWordInp && newPartsInp && !isPairLevel) {
            newWordInp.addEventListener('input', () => {
                const val = newWordInp.value.trim();
                const suggested = autoSplitParts(val, subjectKey, levelId).join(' ');
                // Atualiza automaticamente se usuário não sobrescreveu manualmente ou campo estava sincronizado
                if (!newPartsInp.value.trim() || newPartsInp.value === _uiState.lastAutoSplitVal) {
                    newPartsInp.value = suggested;
                    _uiState.lastAutoSplitVal = suggested;
                }
            });
        }

        const submitAction = () => {
            const fb = container.querySelector('#vocabAddFeedback');
            if (_uiState.addMode === 'batch') {
                const ta = container.querySelector('#vocabBatchInput');
                const res = addBatchItems(subjectKey, levelId, ta ? ta.value : '', _uiState.addTheme, _uiState.addScope);
                if (res.added > 0) {
                    _uiState.activeTab = 'custom';
                    if (typeof onVocabMutated === 'function') onVocabMutated();
                    renderSidebarManager(cfg);
                    const fb2 = document.getElementById('vocabAddFeedback');
                    if (fb2) fb2.textContent = `✔ ${res.added} item(ns) adicionado(s) e sincronizado(s)!`;
                } else if (fb) {
                    fb.style.color = '#dc2626';
                    fb.textContent = 'Digite ao menos uma palavra válida.';
                }
            } else {
                const wVal = newWordInp ? newWordInp.value.trim() : '';
                const pVal = newPartsInp ? newPartsInp.value.trim() : '';
                if (!wVal) {
                    if (fb) { fb.style.color = '#dc2626'; fb.textContent = isPt ? 'Digite a palavra primeiro.' : 'Please type a word first.'; }
                    return;
                }
                let payload;
                if (isPairLevel) {
                    if (!pVal) {
                        if (fb) { fb.style.color = '#dc2626'; fb.textContent = isPt ? 'Informe a rima correspondente.' : 'Please enter the opposite word.'; }
                        return;
                    }
                    payload = { word: wVal, target: pVal, theme: _uiState.addTheme };
                } else if (isSentenceLevel) {
                    const parts = pVal ? pVal.split(/\s*\|\s*|\s{2,}/).filter(Boolean) : autoSplitParts(wVal, subjectKey, levelId);
                    payload = { sentence: wVal, parts, theme: _uiState.addTheme };
                } else {
                    const parts = pVal ? pVal.split(/\s+/).filter(Boolean) : autoSplitParts(wVal, subjectKey, levelId);
                    payload = { word: wVal, parts, theme: _uiState.addTheme };
                }
                const res = addCustomItem(subjectKey, levelId, payload, _uiState.addScope);
                if (res.success) {
                    _uiState.lastAutoSplitVal = '';
                    _uiState.activeTab = 'custom';
                    if (typeof onVocabMutated === 'function') onVocabMutated();
                    renderSidebarManager(cfg);
                    const fb2 = document.getElementById('vocabAddFeedback');
                    if (fb2) fb2.textContent = '✔ Adicionada ao módulo (Papel + Tablet)!';
                } else if (fb) {
                    fb.style.color = '#dc2626';
                    fb.textContent = res.error || 'Erro ao adicionar.';
                }
            }
        };

        const addBtn = container.querySelector('#addWordBtn');
        if (addBtn) addBtn.addEventListener('click', submitAction);
        if (newWordInp) {
            newWordInp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); submitAction(); }
            });
        }

        const listBox = container.querySelector('#wordListContainer');
        if (listBox) {
            listBox.addEventListener('click', (e) => {
                const btn = e.target.closest('.remove-word');
                if (!btn) return;
                const cid = btn.getAttribute('data-custom-id');
                const cscope = btn.getAttribute('data-custom-scope') || 'student';
                if (cid) {
                    removeCustomItem(cid, cscope);
                    if (typeof onVocabMutated === 'function') onVocabMutated();
                    renderSidebarManager(cfg);
                }
            });
        }

        const repeatEl = container.querySelector('#wordRepeat');
        if (repeatEl && typeof onRepeatChange === 'function') {
            repeatEl.addEventListener('change', (e) => onRepeatChange(parseInt(e.target.value, 10) || 2));
        }

        const expandBtn = container.querySelector('#vocabExpandModalBtn');
        if (expandBtn) {
            expandBtn.addEventListener('click', () => openExpandedModal(cfg));
        }
    }

    function openExpandedModal(cfg) {
        if (typeof document === 'undefined' || !document.body) return;
        const old = document.getElementById('kumonVocabModal');
        if (old) old.remove();

        const subjectKey = (cfg && cfg.subjectKey) || 'ingles';
        const levelId = (cfg && cfg.levelId) || 'i2';
        const accentHex = (cfg && cfg.accentHex) || (subjectKey === 'portugues' ? '#059669' : '#dc2626');
        const activeStudent = _getActiveStudent();
        const studentName = (activeStudent && activeStudent.name) ? activeStudent.name.split(' ')[0] : 'Aluno';

        const modal = document.createElement('div');
        modal.id = 'kumonVocabModal';
        modal.className = 'kumon-vocab-modal-overlay';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');

        let modalTheme = (cfg && cfg.selectedTheme) || 'all';
        let modalScope = _uiState.addScope || 'student';
        let modalAddTheme = _uiState.addTheme || 'escola';

        const closeModal = () => {
            document.removeEventListener('keydown', onEsc);
            if (modal && modal.parentNode) modal.remove();
        };
        const onEsc = (e) => { if (e.key === 'Escape') closeModal(); };
        document.addEventListener('keydown', onEsc);

        const renderBody = () => {
            const customItems = getCustomItems(subjectKey, levelId);
            const stageCols = [1, 2, 3, 4].map(stg => {
                const items = getStageItems(subjectKey, levelId, stg, modalTheme);
                const spec = (typeof global !== 'undefined' && global.KumonProgression)
                    ? global.KumonProgression.getStageSpec(subjectKey, levelId, stg)
                    : { shortLabel: `Degrau ${stg}`, label: `Degrau ${stg}` };
                const pills = items.map(it => {
                    const row = _formatItemRow(it, subjectKey, levelId);
                    return `<span class="vocab-modal-chip" title="${_esc(row.sub)}">${row.themePill} <strong>${_esc(row.main)}</strong></span>`;
                }).join('');
                return `
                    <div class="vocab-modal-stage-card">
                        <div class="flex items-center justify-between gap-2 mb-2">
                            <span class="text-xs font-black text-slate-900">Degrau ${stg} · ${_esc(spec.shortLabel)}</span>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">${items.length}</span>
                        </div>
                        <div class="flex flex-wrap gap-1.5">${pills || '<span class="text-xs text-slate-400">Sem itens</span>'}</div>
                    </div>
                `;
            }).join('');

            const customChips = customItems.length > 0
                ? customItems.map(it => {
                    const row = _formatItemRow(it, subjectKey, levelId);
                    return `
                        <span class="vocab-modal-chip custom">
                            ${it.scope === 'shared' ? '👥' : '👤'} ${row.themePill} <strong>${_esc(row.main)}</strong> <small class="text-slate-500">${_esc(row.sub)}</small>
                            <button type="button" class="modal-del-custom ml-1 text-red-500 font-black cursor-pointer" data-cid="${_esc(it.id)}" data-cscope="${_esc(it.scope)}" title="Remover">×</button>
                        </span>
                    `;
                }).join('')
                : '<span class="text-xs text-slate-400">Nenhuma palavra extra cadastrada para este módulo ainda.</span>';

            const themeOpts = THEMES.map(t => `<button type="button" class="vocab-theme-chip ${modalTheme === t.id ? 'active' : ''}" data-mtheme="${t.id}" style="${modalTheme === t.id ? `background:${accentHex};border-color:${accentHex};color:#fff;` : ''}">${t.emoji} ${t.label}</button>`).join('');

            modal.innerHTML = `
                <div class="kumon-vocab-modal-card" onclick="event.stopPropagation()">
                    <div class="flex items-center justify-between gap-3 p-4 border-b border-slate-200 bg-slate-50 rounded-t-2xl">
                        <div class="min-w-0">
                            <h3 class="text-sm md:text-base font-black text-slate-900 truncate">📚 Banco de Vocabulário — ${levelId.toUpperCase()} (${subjectKey === 'portugues' ? 'Português' : 'Inglês'})</h3>
                            <p class="text-[11px] text-slate-500">4 degraus graduados (80% novo + 20% revisão) · Sincronizado com Papel A4 & Tablet</p>
                        </div>
                        <button type="button" id="closeVocabModalBtn" class="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 font-black cursor-pointer flex-shrink-0" aria-label="Fechar">✕</button>
                    </div>

                    <div class="p-4 overflow-y-auto space-y-4 flex-1 min-h-0">
                        <div class="flex flex-wrap items-center gap-1.5">${themeOpts}</div>

                        <!-- Minhas Extras + Importação em Lote -->
                        <div class="bg-blue-50/70 border border-blue-200 rounded-xl p-3 space-y-2.5">
                            <div class="flex items-center justify-between flex-wrap gap-2">
                                <span class="text-xs font-black text-blue-950">✨ Minhas Palavras Extras (${customItems.length}) — Prioridade garantida</span>
                                <div class="flex items-center gap-2">
                                    <select id="modalAddThemeSel" class="vocab-input vocab-select" style="width:auto;">
                                        ${THEMES.filter(t => t.id !== 'all').map(t => `<option value="${t.id}" ${modalAddTheme === t.id ? 'selected' : ''}>${t.emoji} ${t.label}</option>`).join('')}
                                    </select>
                                    <select id="modalAddScopeSel" class="vocab-input vocab-select" style="width:auto;">
                                        <option value="student" ${modalScope === 'student' ? 'selected' : ''}>👤 Só ${_esc(studentName)}</option>
                                        <option value="shared" ${modalScope === 'shared' ? 'selected' : ''}>👥 Toda Turma</option>
                                    </select>
                                </div>
                            </div>
                            <div class="flex flex-wrap gap-1.5">${customChips}</div>
                            <div class="flex flex-col sm:flex-row gap-2 pt-1">
                                <textarea id="modalBatchTextarea" rows="2" placeholder="Cole 1 ou várias palavras da escola separadas por vírgula ou quebra de linha..." class="vocab-input flex-1"></textarea>
                                <button type="button" id="modalBatchAddBtn" class="px-4 py-2 rounded-xl text-white font-black text-xs cursor-pointer flex-shrink-0" style="background:${accentHex};">
                                    <i class="fas fa-plus mr-1"></i>Adicionar
                                </button>
                            </div>
                        </div>

                        <!-- Grid dos 4 Degraus -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            ${stageCols}
                        </div>
                    </div>
                </div>
            `;

            modal.querySelector('#closeVocabModalBtn')?.addEventListener('click', closeModal);
            modal.querySelectorAll('[data-mtheme]').forEach(b => {
                b.addEventListener('click', () => {
                    modalTheme = b.getAttribute('data-mtheme') || 'all';
                    if (cfg && typeof cfg.onThemeChange === 'function') cfg.onThemeChange(modalTheme);
                    renderBody();
                });
            });
            modal.querySelector('#modalAddThemeSel')?.addEventListener('change', (e) => { modalAddTheme = e.target.value; _uiState.addTheme = modalAddTheme; });
            modal.querySelector('#modalAddScopeSel')?.addEventListener('change', (e) => { modalScope = e.target.value; _uiState.addScope = modalScope; });
            modal.querySelector('#modalBatchAddBtn')?.addEventListener('click', () => {
                const ta = modal.querySelector('#modalBatchTextarea');
                const res = addBatchItems(subjectKey, levelId, ta ? ta.value : '', modalAddTheme, modalScope);
                if (res.added > 0) {
                    if (cfg && typeof cfg.onVocabMutated === 'function') cfg.onVocabMutated();
                    renderSidebarManager(cfg);
                    renderBody();
                }
            });
            modal.querySelectorAll('.modal-del-custom').forEach(btn => {
                btn.addEventListener('click', () => {
                    removeCustomItem(btn.getAttribute('data-cid'), btn.getAttribute('data-cscope') || 'student');
                    if (cfg && typeof cfg.onVocabMutated === 'function') cfg.onVocabMutated();
                    renderSidebarManager(cfg);
                    renderBody();
                });
            });
        };

        modal.addEventListener('click', closeModal);
        document.body.appendChild(modal);
        renderBody();
    }

    const KumonVocabulary = {
        THEMES,
        CATALOG,
        autoSplitParts,
        getCatalogForLevel,
        getStageItems,
        getCustomItems,
        addCustomItem,
        addBatchItems,
        removeCustomItem,
        clearCustomItemsForLevel,
        exportAllCustomVocab,
        importAllCustomVocab,
        migrateLegacyCustomWords,
        composeGraduatedPool,
        renderSidebarManager,
        openExpandedModal
    };

    if (typeof global !== 'undefined') {
        global.KumonVocabulary = KumonVocabulary;
    }
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = KumonVocabulary;
    }
})(typeof window !== 'undefined' ? window : globalThis);
