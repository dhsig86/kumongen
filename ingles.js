// ingles.js - Lógica específica para Inglês com interface amigável
(function() {
    const LevelLibrary = {
        ingles: [
            {
                id: 'i1',
                title: 'I1 · Alphabet (trace)',
                type: 'trace',
                instruction: 'Select the letters to trace.'
            },
            {
                id: 'i2',
                title: 'I2 · CVC Words (3 letters)',
                type: 'wordbuilding',
                instruction: 'Build CVC words (consonant-vowel-consonant).'
            },
            {
                id: 'i3',
                title: 'I3 · Easy words (4-5 letters)',
                type: 'wordbuilding',
                instruction: 'Build simple words.'
            },
            {
                id: 'i4',
                title: 'I4 · Snap Words',
                type: 'wordbuilding',
                instruction: 'Treine as palavras mais comuns do inglês.'
            },
            {
                id: 'i5',
                title: 'I5 · CVCe (Magic E)',
                type: 'wordbuilding',
                instruction: 'Palavras com E mudo que muda a vogal.'
            },
            {
                id: 'i6',
                title: 'I6 · Simple Sentences',
                type: 'sentence',
                instruction: 'Put the words in order to form the sentence.'
            },
            {
                id: 'i7',
                title: 'I7 · Opposites',
                type: 'opposite',
                instruction: 'Find the opposite word.'
            }
        ]
    };

    let currentLevelId = 'i1';
    let itemsPerPage = 8;
    let currentZoom = 0.7;

    let pageLeft, pageRight, levelListDiv, paramPanel, zoomSpan, zoomContainer;

    // ---------- PERSISTÊNCIA (LOCAL STORAGE) ----------
    function loadSavedState() {
        const savedLevelId = localStorage.getItem('kumongen_eng_level');
        if (savedLevelId) {
            currentLevelId = savedLevelId;
        }

        const savedParams = localStorage.getItem('kumongen_eng_params');
        if (savedParams) {
            try {
                const parsed = JSON.parse(savedParams);
                customParams = { ...customParams, ...parsed };
            } catch (e) {
                console.error("Erro ao ler parametros salvos de ingles", e);
            }
        }
    }

    function saveState() {
        localStorage.setItem('kumongen_eng_level', currentLevelId);
        localStorage.setItem('kumongen_eng_params', JSON.stringify(customParams));
    }

    const DEFAULT_WORDS_I2 = [
        { word: 'CAT', parts: ['C','A','T'] },
        { word: 'DOG', parts: ['D','O','G'] },
        { word: 'SUN', parts: ['S','U','N'] },
        { word: 'CAR', parts: ['C','A','R'] },
        { word: 'BED', parts: ['B','E','D'] },
        { word: 'HAT', parts: ['H','A','T'] },
        { word: 'FOG', parts: ['F','O','G'] },
        { word: 'LEG', parts: ['L','E','G'] },
        { word: 'PIG', parts: ['P','I','G'] },
        { word: 'BUS', parts: ['B','U','S'] },
        { word: 'MAP', parts: ['M','A','P'] },
        { word: 'PEN', parts: ['P','E','N'] },
        { word: 'FOX', parts: ['F','O','X'] },
        { word: 'BAT', parts: ['B','A','T'] },
        { word: 'CUP', parts: ['C','U','P'] },
        { word: 'MUG', parts: ['M','U','G'] },
        { word: 'BOX', parts: ['B','O','X'] },
        { word: 'RUG', parts: ['R','U','G'] },
        { word: 'JAM', parts: ['J','A','M'] },
        { word: 'HEN', parts: ['H','E','N'] },
        { word: 'WET', parts: ['W','E','T'] },
        { word: 'DIG', parts: ['D','I','G'] },
        { word: 'HOP', parts: ['H','O','P'] },
        { word: 'RUN', parts: ['R','U','N'] },
        { word: 'NET', parts: ['N','E','T'] },
        { word: 'JOG', parts: ['J','O','G'] },
        { word: 'FAN', parts: ['F','A','N'] },
        { word: 'BIG', parts: ['B','I','G'] },
        { word: 'TOP', parts: ['T','O','P'] },
        { word: 'GUM', parts: ['G','U','M'] },
        { word: 'TIN', parts: ['T','I','N'] },
        { word: 'POT', parts: ['P','O','T'] },
        { word: 'BUG', parts: ['B','U','G'] },
        { word: 'VAN', parts: ['V','A','N'] },
        { word: 'ZIP', parts: ['Z','I','P'] }
    ];

    const DEFAULT_WORDS_I3 = [
        { word: 'BIRD', parts: ['B','IR','D'] },
        { word: 'FISH', parts: ['F','I','SH'] },
        { word: 'TREE', parts: ['T','R','EE'] },
        { word: 'BOOK', parts: ['B','OO','K'] },
        { word: 'FROG', parts: ['F','R','O','G'] },
        { word: 'DUCK', parts: ['D','U','CK'] },
        { word: 'STAR', parts: ['S','T','A','R'] },
        { word: 'BOAT', parts: ['B','OA','T'] },
        { word: 'MILK', parts: ['M','I','L','K'] },
        { word: 'HAND', parts: ['H','A','N','D'] },
        { word: 'JUMP', parts: ['J','U','M','P'] },
        { word: 'LAMP', parts: ['L','A','M','P'] },
        { word: 'DRUM', parts: ['D','R','U','M'] },
        { word: 'RING', parts: ['R','I','NG'] },
        { word: 'KING', parts: ['K','I','NG'] },
        { word: 'SWIM', parts: ['S','W','I','M'] },
        { word: 'SHIP', parts: ['SH','I','P'] },
        { word: 'CHIN', parts: ['CH','I','N'] },
        { word: 'THIN', parts: ['TH','I','N'] },
        { word: 'SOCK', parts: ['S','O','CK'] },
        { word: 'BELL', parts: ['B','E','LL'] },
        { word: 'HILL', parts: ['H','I','LL'] },
        { word: 'WOLF', parts: ['W','O','L','F'] },
        { word: 'NEST', parts: ['N','E','S','T'] },
        { word: 'GIFT', parts: ['G','I','F','T'] },
        { word: 'POND', parts: ['P','O','N','D'] },
        { word: 'CRAB', parts: ['C','R','A','B'] },
        { word: 'SNAIL', parts: ['S','N','AI','L'] },
        { word: 'PLANT', parts: ['P','L','A','N','T'] },
        { word: 'CLOUD', parts: ['C','L','OU','D'] }
    ];

    const DEFAULT_WORDS_I4 = [
        { word: 'THE', parts: ['TH','E'] },
        { word: 'AND', parts: ['A','N','D'] },
        { word: 'IS', parts: ['I','S'] },
        { word: 'IN', parts: ['I','N'] },
        { word: 'IT', parts: ['I','T'] },
        { word: 'TO', parts: ['T','O'] },
        { word: 'HE', parts: ['H','E'] },
        { word: 'SHE', parts: ['SH','E'] },
        { word: 'WE', parts: ['W','E'] },
        { word: 'YOU', parts: ['Y','OU'] },
        { word: 'ARE', parts: ['A','RE'] },
        { word: 'WAS', parts: ['W','A','S'] },
        { word: 'FOR', parts: ['F','OR'] },
        { word: 'ON', parts: ['O','N'] },
        { word: 'CAN', parts: ['C','A','N'] },
        { word: 'HAD', parts: ['H','A','D'] },
        { word: 'HAS', parts: ['H','A','S'] },
        { word: 'HIS', parts: ['H','I','S'] },
        { word: 'HER', parts: ['H','ER'] },
        { word: 'NOT', parts: ['N','O','T'] },
        { word: 'BUT', parts: ['B','U','T'] },
        { word: 'ALL', parts: ['A','LL'] },
        { word: 'MY', parts: ['M','Y'] },
        { word: 'GO', parts: ['G','O'] },
        { word: 'SEE', parts: ['S','EE'] },
        { word: 'LIKE', parts: ['L','I','KE'] },
        { word: 'COME', parts: ['C','O','ME'] },
        { word: 'LOOK', parts: ['L','OO','K'] },
        { word: 'SAID', parts: ['S','AI','D'] },
        { word: 'PLAY', parts: ['P','L','AY'] }
    ];

    const DEFAULT_WORDS_I5 = [
        { word: 'CAKE', parts: ['C','A','KE'] },
        { word: 'BIKE', parts: ['B','I','KE'] },
        { word: 'HOME', parts: ['H','O','ME'] },
        { word: 'TUBE', parts: ['T','U','BE'] },
        { word: 'GATE', parts: ['G','A','TE'] },
        { word: 'KITE', parts: ['K','I','TE'] },
        { word: 'BONE', parts: ['B','O','NE'] },
        { word: 'CUTE', parts: ['C','U','TE'] },
        { word: 'LAKE', parts: ['L','A','KE'] },
        { word: 'PINE', parts: ['P','I','NE'] },
        { word: 'NOSE', parts: ['N','O','SE'] },
        { word: 'MULE', parts: ['M','U','LE'] },
        { word: 'WAVE', parts: ['W','A','VE'] },
        { word: 'LINE', parts: ['L','I','NE'] },
        { word: 'ROPE', parts: ['R','O','PE'] },
        { word: 'TUNE', parts: ['T','U','NE'] },
        { word: 'RACE', parts: ['R','A','CE'] },
        { word: 'MICE', parts: ['M','I','CE'] },
        { word: 'POLE', parts: ['P','O','LE'] },
        { word: 'HUGE', parts: ['H','U','GE'] },
        { word: 'FACE', parts: ['F','A','CE'] },
        { word: 'FIRE', parts: ['F','I','RE'] },
        { word: 'NOTE', parts: ['N','O','TE'] },
        { word: 'CUBE', parts: ['C','U','BE'] },
        { word: 'MADE', parts: ['M','A','DE'] }
    ];

    const DEFAULT_SENTENCES_I6 = [
        { sentence: 'I SEE A CAT', parts: ['I SEE', 'A CAT'] },
        { sentence: 'THE DOG IS BIG', parts: ['THE DOG', 'IS', 'BIG'] },
        { sentence: 'I LIKE RED APPLES', parts: ['I LIKE', 'RED', 'APPLES'] },
        { sentence: 'THE SUN IS HOT', parts: ['THE SUN', 'IS', 'HOT'] },
        { sentence: 'SHE HAS A DOLL', parts: ['SHE HAS', 'A', 'DOLL'] },
        { sentence: 'WE PLAY IN THE PARK', parts: ['WE PLAY', 'IN THE', 'PARK'] },
        { sentence: 'HE CAN RUN FAST', parts: ['HE CAN', 'RUN', 'FAST'] },
        { sentence: 'THE BIRD CAN FLY', parts: ['THE BIRD', 'CAN', 'FLY'] },
        { sentence: 'LOOK AT THE MOON', parts: ['LOOK AT', 'THE', 'MOON'] },
        { sentence: 'THIS IS MY BOOK', parts: ['THIS IS', 'MY', 'BOOK'] }
    ];

    const DEFAULT_OPPOSITES_I7 = [
        { word: 'BIG', target: 'SMALL', options: ['SMALL', 'HOT', 'RED'], icon: '🐘 / 🐭' },
        { word: 'HOT', target: 'COLD', options: ['COLD', 'FAST', 'SUN'], icon: '🔥 / ❄️' },
        { word: 'HAPPY', target: 'SAD', options: ['SAD', 'BIG', 'BLUE'], icon: '😊 / 😢' },
        { word: 'UP', target: 'DOWN', options: ['DOWN', 'IN', 'OUT'], icon: '⬆️ / ⬇️' },
        { word: 'DAY', target: 'NIGHT', options: ['NIGHT', 'RAIN', 'MOON'], icon: '☀️ / 🌙' },
        { word: 'FAST', target: 'SLOW', options: ['SLOW', 'COLD', 'RUN'], icon: '🏎️ / 🐢' },
        { word: 'OPEN', target: 'CLOSED', options: ['CLOSED', 'BOX', 'DOOR'], icon: '📖 / 📕' },
        { word: 'IN', target: 'OUT', options: ['OUT', 'ON', 'OFF'], icon: '📥 / 📤' },
        { word: 'HARD', target: 'SOFT', options: ['SOFT', 'ROCK', 'TALL'], icon: '🪨 / 🧸' },
        { word: 'TALL', target: 'SHORT', options: ['SHORT', 'LITTLE', 'TREE'], icon: '🦒 / 🦔' }
    ];

    let customParams = {
        traceSelected: [],
        traceRepeat: 2,
        wordList: [...DEFAULT_WORDS_I2],
        wordRepeat: 2
    };

    function generateItemsForLevel(level, count) {
        if (!level) return [];
        const target = count || (itemsPerPage * 2);

        let baseItems = [];

        switch (level.type) {
            case 'trace': {
                const letters = (customParams.traceSelected && customParams.traceSelected.length > 0)
                    ? customParams.traceSelected
                    : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
                letters.forEach(letter => {
                    for (let i = 0; i < (customParams.traceRepeat || 2); i++) {
                        baseItems.push({ type: 'trace', char: letter });
                    }
                });
                break;
            }

            case 'wordbuilding': {
                const lvlId = (level && level.id) || currentLevelId;
                let wordsToUse = customParams.wordList;
                if (lvlId === 'i2') {
                    wordsToUse = (currentLevelId === 'i2' && customParams.wordList && customParams.wordList.length > 0)
                        ? customParams.wordList
                        : DEFAULT_WORDS_I2;
                } else if (lvlId === 'i3') {
                    wordsToUse = (currentLevelId === 'i3' && customParams.wordList && customParams.wordList.length > 0)
                        ? customParams.wordList
                        : DEFAULT_WORDS_I3;
                } else if (lvlId === 'i4') {
                    wordsToUse = (currentLevelId === 'i4' && customParams.wordList && customParams.wordList.length > 0)
                        ? customParams.wordList
                        : DEFAULT_WORDS_I4;
                } else if (lvlId === 'i5') {
                    wordsToUse = (currentLevelId === 'i5' && customParams.wordList && customParams.wordList.length > 0)
                        ? customParams.wordList
                        : DEFAULT_WORDS_I5;
                }
                wordsToUse.forEach(wordObj => {
                    for (let i = 0; i < (customParams.wordRepeat || 1); i++) {
                        baseItems.push({ type: 'word', word: wordObj.word, parts: wordObj.parts });
                    }
                });
                break;
            }

            case 'sentence': {
                DEFAULT_SENTENCES_I6.forEach(st => {
                    baseItems.push({
                        type: 'sentence',
                        sentence: st.sentence,
                        parts: [...st.parts]
                    });
                });
                break;
            }

            case 'opposite': {
                DEFAULT_OPPOSITES_I7.forEach(op => {
                    baseItems.push({
                        type: 'opposite',
                        word: op.word,
                        target: op.target,
                        options: [...op.options],
                        icon: op.icon
                    });
                });
                break;
            }

            default:
                return Array(target).fill({ type: 'unknown' });
        }

        if (baseItems.length === 0) return Array(target).fill({ type: 'unknown' });
        
        const keyFn = (item) => {
            if (item.type === 'trace') return item.char;
            if (item.type === 'word') return item.word;
            if (item.type === 'sentence') return item.sentence;
            if (item.type === 'opposite') return item.word;
            return '';
        };

        const declustered = KumonGen.shuffleAndDecluster(baseItems, keyFn);

        let result = [];
        for (let i = 0; i < target; i++) {
            result.push({ ...declustered[i % declustered.length] });
        }
        return result;
    }

    function updateParamPanel() {
        const level = LevelLibrary.ingles.find(l => l.id === currentLevelId);
        if (!level || !paramPanel) return;

        let html = '';

        switch (level.type) {
            case 'trace':
                html = renderTracePanel();
                break;
            case 'wordbuilding':
                html = renderWordPanel();
                break;
            default:
                html = '<div class="text-slate-400">No additional parameters.</div>';
        }

        paramPanel.innerHTML = html;
        attachParamEvents(level.type);
    }

    function renderTracePanel() {
        const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        let checkboxes = '';
        allLetters.forEach(letter => {
            const checked = customParams.traceSelected.includes(letter) ? 'checked' : '';
            checkboxes += `
                <label class="inline-flex items-center gap-1 mr-2 mb-1">
                    <input type="checkbox" class="trace-letter" value="${letter}" ${checked}>
                    <span class="text-xs">${letter}</span>
                </label>
            `;
        });

        return `
            <div class="param-control">
                <div class="mb-2">
                    <label class="block text-xs font-bold mb-1">Letters to trace:</label>
                    <div class="bg-white p-2 rounded max-h-40 overflow-y-auto border border-slate-200">
                        ${checkboxes}
                    </div>
                </div>
                <div class="param-row">
                    <label>Repetitions:</label>
                    <input type="number" id="traceRepeat" value="${customParams.traceRepeat}" min="1" max="5">
                </div>
                <div class="button-group">
                    <button id="selectAllTrace">Select all</button>
                    <button id="clearAllTrace">Clear</button>
                    <button id="randomTrace">Random</button>
                </div>
            </div>
        `;
    }

    function renderWordPanel() {
        let wordItems = '';
        customParams.wordList.forEach((w, index) => {
            wordItems += `
                <div class="flex items-center justify-between bg-slate-100 p-1 mb-1 rounded">
                    <span class="text-xs font-bold">${w.word}</span>
                    <span class="text-xs text-slate-600">[${w.parts.join(' ')}]</span>
                    <button class="remove-word text-red-500 hover:text-red-700" data-index="${index}">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });

        return `
            <div class="param-control">
                <div class="mb-2">
                    <label class="block text-xs font-bold mb-1">Word list:</label>
                    <div id="wordListContainer" class="bg-white p-2 rounded max-h-40 overflow-y-auto border border-slate-200">
                        ${wordItems || '<div class="text-slate-400 text-xs">No words</div>'}
                    </div>
                </div>
                <div class="border-t border-slate-200 my-2 pt-2">
                    <label class="block text-xs font-bold mb-1">Add new word:</label>
                    <div class="flex-row-params">
                        <input type="text" id="newWord" placeholder="Word (e.g., CAT)" class="flex-1 text-xs border rounded px-2 py-1">
                        <input type="text" id="newParts" placeholder="Parts separated by space (e.g., C A T)" class="flex-1 text-xs border rounded px-2 py-1">
                        <button id="addWordBtn" class="bg-red-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-red-700 whitespace-nowrap">
                            <i class="fas fa-plus mr-1"></i>Add
                        </button>
                    </div>
                </div>
                <div class="param-row">
                    <label>Repetitions:</label>
                    <input type="number" id="wordRepeat" value="${customParams.wordRepeat}" min="1" max="5">
                </div>
            </div>
        `;
    }

    function attachParamEvents(type) {
        setTimeout(() => {
            if (type === 'trace') {
                document.querySelectorAll('.trace-letter').forEach(cb => {
                    cb.addEventListener('change', (e) => {
                        const letter = e.target.value;
                        if (e.target.checked) {
                            if (!customParams.traceSelected.includes(letter)) {
                                customParams.traceSelected.push(letter);
                            }
                        } else {
                            customParams.traceSelected = customParams.traceSelected.filter(l => l !== letter);
                        }
                        saveState();
                        refreshPreview();
                    });
                });

                document.getElementById('selectAllTrace')?.addEventListener('click', () => {
                    document.querySelectorAll('.trace-letter').forEach(cb => {
                        cb.checked = true;
                        const letter = cb.value;
                        if (!customParams.traceSelected.includes(letter)) {
                            customParams.traceSelected.push(letter);
                        }
                    });
                    saveState();
                    refreshPreview();
                });

                document.getElementById('clearAllTrace')?.addEventListener('click', () => {
                    document.querySelectorAll('.trace-letter').forEach(cb => {
                        cb.checked = false;
                    });
                    customParams.traceSelected = [];
                    saveState();
                    refreshPreview();
                });

                document.getElementById('randomTrace')?.addEventListener('click', () => {
                    const selected = [];
                    document.querySelectorAll('.trace-letter').forEach(cb => {
                        const random = Math.random() > 0.5;
                        cb.checked = random;
                        if (random) selected.push(cb.value);
                    });
                    customParams.traceSelected = selected;
                    saveState();
                    refreshPreview();
                });

                const repeat = document.getElementById('traceRepeat');
                if (repeat) repeat.addEventListener('change', (e) => {
                    customParams.traceRepeat = parseInt(e.target.value) || 2;
                    saveState();
                    refreshPreview();
                });
            }

            if (type === 'wordbuilding') {
                document.getElementById('addWordBtn')?.addEventListener('click', () => {
                    const wordInput = document.getElementById('newWord');
                    const partsInput = document.getElementById('newParts');
                    if (wordInput.value.trim() && partsInput.value.trim()) {
                        const newWord = {
                            word: wordInput.value.trim().toUpperCase(),
                            parts: partsInput.value.trim().split(/\s+/).map(p => p.toUpperCase())
                        };
                        customParams.wordList.push(newWord);
                        wordInput.value = '';
                        partsInput.value = '';
                        saveState();
                        updateParamPanel();
                        refreshPreview();
                    } else {
                        alert('Please fill both word and parts!');
                    }
                });

                const container = document.getElementById('wordListContainer');
                if (container) {
                    container.addEventListener('click', (e) => {
                        if (e.target.closest('.remove-word')) {
                            const btn = e.target.closest('.remove-word');
                            const index = btn.getAttribute('data-index');
                            if (index !== null) {
                                customParams.wordList.splice(parseInt(index), 1);
                                saveState();
                                updateParamPanel();
                                refreshPreview();
                            }
                        }
                    });
                }

                const repeat = document.getElementById('wordRepeat');
                if (repeat) repeat.addEventListener('change', (e) => {
                    customParams.wordRepeat = parseInt(e.target.value) || 2;
                    saveState();
                    refreshPreview();
                });
            }
        }, 50);
    }

    function renderLevelList() {
        if (!levelListDiv) return;
        const levels = LevelLibrary.ingles;
        let html = '';
        levels.forEach(lvl => {
            const active = (lvl.id === currentLevelId) ? 'border-red-500 bg-red-50' : 'border-slate-100 hover:border-red-200';
            html += `<button onclick="selectLevel('${lvl.id}')" class="w-full text-left p-3 rounded-xl border-2 transition-all ${active}">
                <div class="text-xs font-bold ${lvl.id === currentLevelId ? 'text-red-700' : 'text-slate-600'}">${lvl.title}</div>
            </button>`;
        });
        levelListDiv.innerHTML = html;
    }

    window.selectLevel = function(id) {
        const previousLevel = currentLevelId;
        currentLevelId = id;
        if (id === 'i1' && customParams.traceSelected.length === 0) {
            customParams.traceSelected = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        }

        // Abastecimento automático de palavras em inglês (só ao trocar de nível, preservando customizações)
        if (id === 'i2' && previousLevel !== 'i2') {
            customParams.wordList = [
                { word: 'CAT', parts: ['C','A','T'] },
                { word: 'DOG', parts: ['D','O','G'] },
                { word: 'SUN', parts: ['S','U','N'] },
                { word: 'CAR', parts: ['C','A','R'] },
                { word: 'BED', parts: ['B','E','D'] },
                { word: 'HAT', parts: ['H','A','T'] },
                { word: 'FOG', parts: ['F','O','G'] },
                { word: 'LEG', parts: ['L','E','G'] },
                { word: 'PIG', parts: ['P','I','G'] },
                { word: 'BUS', parts: ['B','U','S'] },
                { word: 'MAP', parts: ['M','A','P'] },
                { word: 'PEN', parts: ['P','E','N'] },
                { word: 'FOX', parts: ['F','O','X'] },
                { word: 'BAT', parts: ['B','A','T'] },
                { word: 'CUP', parts: ['C','U','P'] },
                { word: 'MUG', parts: ['M','U','G'] },
                { word: 'BOX', parts: ['B','O','X'] },
                { word: 'RUG', parts: ['R','U','G'] },
                { word: 'JAM', parts: ['J','A','M'] },
                { word: 'HEN', parts: ['H','E','N'] },
                { word: 'WET', parts: ['W','E','T'] },
                { word: 'DIG', parts: ['D','I','G'] },
                { word: 'HOP', parts: ['H','O','P'] },
                { word: 'RUN', parts: ['R','U','N'] },
                { word: 'NET', parts: ['N','E','T'] },
                { word: 'JOG', parts: ['J','O','G'] },
                { word: 'FAN', parts: ['F','A','N'] },
                { word: 'BIG', parts: ['B','I','G'] },
                { word: 'TOP', parts: ['T','O','P'] },
                { word: 'GUM', parts: ['G','U','M'] },
                { word: 'TIN', parts: ['T','I','N'] },
                { word: 'POT', parts: ['P','O','T'] },
                { word: 'BUG', parts: ['B','U','G'] },
                { word: 'VAN', parts: ['V','A','N'] },
                { word: 'ZIP', parts: ['Z','I','P'] }
            ];
        } else if (id === 'i3' && previousLevel !== 'i3') {
            customParams.wordList = [
                { word: 'BIRD', parts: ['B','IR','D'] },
                { word: 'FISH', parts: ['F','I','SH'] },
                { word: 'TREE', parts: ['T','R','EE'] },
                { word: 'BOOK', parts: ['B','OO','K'] },
                { word: 'FROG', parts: ['F','R','O','G'] },
                { word: 'DUCK', parts: ['D','U','CK'] },
                { word: 'STAR', parts: ['S','T','A','R'] },
                { word: 'BOAT', parts: ['B','OA','T'] },
                { word: 'MILK', parts: ['M','I','L','K'] },
                { word: 'HAND', parts: ['H','A','N','D'] },
                { word: 'JUMP', parts: ['J','U','M','P'] },
                { word: 'LAMP', parts: ['L','A','M','P'] },
                { word: 'DRUM', parts: ['D','R','U','M'] },
                { word: 'RING', parts: ['R','I','NG'] },
                { word: 'KING', parts: ['K','I','NG'] },
                { word: 'SWIM', parts: ['S','W','I','M'] },
                { word: 'SHIP', parts: ['SH','I','P'] },
                { word: 'CHIN', parts: ['CH','I','N'] },
                { word: 'THIN', parts: ['TH','I','N'] },
                { word: 'SOCK', parts: ['S','O','CK'] },
                { word: 'BELL', parts: ['B','E','LL'] },
                { word: 'HILL', parts: ['H','I','LL'] },
                { word: 'WOLF', parts: ['W','O','L','F'] },
                { word: 'NEST', parts: ['N','E','S','T'] },
                { word: 'GIFT', parts: ['G','I','F','T'] },
                { word: 'POND', parts: ['P','O','N','D'] },
                { word: 'CRAB', parts: ['C','R','A','B'] },
                { word: 'SNAIL', parts: ['S','N','AI','L'] },
                { word: 'PLANT', parts: ['P','L','A','N','T'] },
                { word: 'CLOUD', parts: ['C','L','OU','D'] }
            ];
        } else if (id === 'i4' && previousLevel !== 'i4') {
            customParams.wordList = [
                { word: 'THE', parts: ['TH','E'] },
                { word: 'AND', parts: ['A','N','D'] },
                { word: 'IS', parts: ['I','S'] },
                { word: 'IN', parts: ['I','N'] },
                { word: 'IT', parts: ['I','T'] },
                { word: 'TO', parts: ['T','O'] },
                { word: 'HE', parts: ['H','E'] },
                { word: 'SHE', parts: ['SH','E'] },
                { word: 'WE', parts: ['W','E'] },
                { word: 'YOU', parts: ['Y','OU'] },
                { word: 'ARE', parts: ['A','RE'] },
                { word: 'WAS', parts: ['W','A','S'] },
                { word: 'FOR', parts: ['F','OR'] },
                { word: 'ON', parts: ['O','N'] },
                { word: 'CAN', parts: ['C','A','N'] },
                { word: 'HAD', parts: ['H','A','D'] },
                { word: 'HAS', parts: ['H','A','S'] },
                { word: 'HIS', parts: ['H','I','S'] },
                { word: 'HER', parts: ['H','ER'] },
                { word: 'NOT', parts: ['N','O','T'] },
                { word: 'BUT', parts: ['B','U','T'] },
                { word: 'ALL', parts: ['A','LL'] },
                { word: 'MY', parts: ['M','Y'] },
                { word: 'GO', parts: ['G','O'] },
                { word: 'SEE', parts: ['S','EE'] },
                { word: 'LIKE', parts: ['L','I','KE'] },
                { word: 'COME', parts: ['C','O','ME'] },
                { word: 'LOOK', parts: ['L','OO','K'] },
                { word: 'SAID', parts: ['S','AI','D'] },
                { word: 'PLAY', parts: ['P','L','AY'] }
            ];
        } else if (id === 'i5' && previousLevel !== 'i5') {
            customParams.wordList = [
                { word: 'CAKE', parts: ['C','A','KE'] },
                { word: 'BIKE', parts: ['B','I','KE'] },
                { word: 'HOME', parts: ['H','O','ME'] },
                { word: 'TUBE', parts: ['T','U','BE'] },
                { word: 'GATE', parts: ['G','A','TE'] },
                { word: 'KITE', parts: ['K','I','TE'] },
                { word: 'BONE', parts: ['B','O','NE'] },
                { word: 'CUTE', parts: ['C','U','TE'] },
                { word: 'LAKE', parts: ['L','A','KE'] },
                { word: 'PINE', parts: ['P','I','NE'] },
                { word: 'NOSE', parts: ['N','O','SE'] },
                { word: 'MULE', parts: ['M','U','LE'] },
                { word: 'WAVE', parts: ['W','A','VE'] },
                { word: 'LINE', parts: ['L','I','NE'] },
                { word: 'ROPE', parts: ['R','O','PE'] },
                { word: 'TUNE', parts: ['T','U','NE'] },
                { word: 'RACE', parts: ['R','A','CE'] },
                { word: 'MICE', parts: ['M','I','CE'] },
                { word: 'POLE', parts: ['P','O','LE'] },
                { word: 'HUGE', parts: ['H','U','GE'] },
                { word: 'FACE', parts: ['F','A','CE'] },
                { word: 'FIRE', parts: ['F','I','RE'] },
                { word: 'NOTE', parts: ['N','O','TE'] },
                { word: 'CUBE', parts: ['C','U','BE'] },
                { word: 'MADE', parts: ['M','A','DE'] }
            ];
        }

        saveState();
        renderLevelList();
        updateParamPanel();
        refreshPreview();
    };

    function refreshPreview() {
        if (!pageLeft || !pageRight) return;
        const level = LevelLibrary.ingles.find(l => l.id === currentLevelId);
        if (!level) return;

        const allItems = generateItemsForLevel(level, itemsPerPage * 2);
        const leftItems = allItems.slice(0, itemsPerPage);
        const rightItems = allItems.slice(itemsPerPage, itemsPerPage * 2);

        KumonGen.buildPage(pageLeft, level, 1, leftItems);
        KumonGen.buildPage(pageRight, level, 2, rightItems);
    }

    // ===== CONTROLES DE ABAS & WIZARD (KUMON 3.0) =====
    function switchEngTab(tab) {
        const panels = {
            wizard: document.getElementById('panel-wizard'),
            personalizar: document.getElementById('panel-personalizar'),
            pedagogia: document.getElementById('panel-pedagogia')
        };
        const buttons = {
            wizard: document.getElementById('tab-btn-wizard'),
            personalizar: document.getElementById('tab-btn-personalizar'),
            pedagogia: document.getElementById('tab-btn-pedagogia')
        };

        Object.keys(panels).forEach(key => {
            if (panels[key]) {
                if (key === tab) {
                    panels[key].classList.remove('hidden');
                } else {
                    panels[key].classList.add('hidden');
                }
            }
            if (buttons[key]) {
                if (key === tab) {
                    buttons[key].classList.add('active');
                } else {
                    buttons[key].classList.remove('active');
                }
            }
        });

        if (tab === 'pedagogia') {
            KumonGen.renderPedagogicalPanel('pedagogicalPanelContainer');
        }
    }

    function selectEngWizardAge(ageKey, btn) {
        document.querySelectorAll('.wizard-age-btn').forEach(b => {
            b.classList.remove('active', 'border-red-600', 'bg-red-50');
            b.classList.add('border-slate-200', 'bg-white');
        });
        if (btn) {
            btn.classList.add('active', 'border-red-600', 'bg-red-50');
            btn.classList.remove('border-slate-200', 'bg-white');
        }

        const map = {
            'age_4_5': 'i1',
            'age_6_7': 'i2',
            'age_8_9': 'i3',
            'age_10_plus': 'i5'
        };
        const targetLevel = map[ageKey] || 'i1';
        const targetCard = document.querySelector(`#panel-wizard .kumon-wizard-card[onclick*="'${targetLevel}'"]`);
        selectEngWizardGoal(targetLevel, targetCard);
    }

    function selectEngWizardGoal(levelId, el) {
        currentLevelId = levelId;
        document.querySelectorAll('#panel-wizard .kumon-wizard-card').forEach(card => card.classList.remove('active'));
        if (el) el.classList.add('active');

        saveState();
        renderLevelList();
        updateParamPanel();
        refreshPreview();
    }

    function selectEngWizardPace(pages, lines, btn) {
        document.querySelectorAll('.wizard-pace-btn').forEach(b => {
            b.classList.remove('active', 'border-red-600', 'bg-red-50', 'text-red-800');
            b.classList.add('border-slate-200', 'bg-white', 'text-slate-600');
        });
        if (btn) {
            btn.classList.add('active', 'border-red-600', 'bg-red-50', 'text-red-800');
            btn.classList.remove('border-slate-200', 'bg-white', 'text-slate-600');
        }

        const pagesSelect = document.getElementById('pagesPerBook');
        const linesSelect = document.getElementById('linesPerPage');
        if (pagesSelect) pagesSelect.value = String(pages);
        if (linesSelect) {
            linesSelect.value = String(lines);
            itemsPerPage = lines;
        }
        refreshPreview();
    }

    function init() {
        pageLeft = document.getElementById('pageLeft');
        pageRight = document.getElementById('pageRight');
        levelListDiv = document.getElementById('levelList');
        paramPanel = document.getElementById('paramPanel');
        zoomSpan = document.getElementById('zoomValue');
        zoomContainer = document.getElementById('zoomContainer');

        loadSavedState();

        KumonGen.initRefs();

        if (customParams.traceSelected.length === 0) {
            customParams.traceSelected = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        }

        renderLevelList();
        updateParamPanel();
        refreshPreview();

        const linesSelect = document.getElementById('linesPerPage');
        if (linesSelect) {
            linesSelect.addEventListener('change', (e) => {
                itemsPerPage = parseInt(e.target.value);
                refreshPreview();
            });
        }

        if (zoomSpan) zoomSpan.innerText = Math.round(currentZoom * 100) + '%';
        if (zoomContainer) zoomContainer.style.transform = `scale(${currentZoom})`;

        // Inicializa painel pedagógico na aba correspondente
        KumonGen.renderPedagogicalPanel('pedagogicalPanelContainer');

        window.addEventListener('storage', () => {
            KumonGen.initRefs();
        });
    }

    window.adjustZoom = KumonGen.adjustZoom;
    window.switchEngTab = switchEngTab;
    window.selectEngWizardAge = selectEngWizardAge;
    window.selectEngWizardGoal = selectEngWizardGoal;
    window.selectEngWizardPace = selectEngWizardPace;
    
    window.generatePDF = () => {
        const level = LevelLibrary.ingles.find(l => l.id === currentLevelId);
        if (!level) return;

        const pagesEl = document.getElementById('pagesPerBook');
        const totalPages = pagesEl ? parseInt(pagesEl.value) : 2;

        const allItems = generateItemsForLevel(level, totalPages * itemsPerPage);

        KumonGen.generatePDF('a4-sheet', 'Inglês', level.title, totalPages, allItems, level, itemsPerPage);
    };

    window.refreshPreview = refreshPreview;

    // Registra módulo para uso no tablet player (Fase 2)
    window.KumonSubjects = window.KumonSubjects || {};
    window.KumonSubjects.ingles = {
        title: 'Inglês',
        icon: 'fa-language',
        color: 'red',
        levels: LevelLibrary.ingles,
        generate: generateItemsForLevel
    };

    // No tablet.html, pula init() — só o registro em KumonSubjects importa
    const _isTabletPage = !!document.getElementById('focusCardContainer');
    if (!_isTabletPage) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }
})();
