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

    let customParams = {
        traceSelected: [],
        traceRepeat: 2,
        wordList: [
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
            { word: 'BIRD', parts: ['B','IR','D'] },
            { word: 'FISH', parts: ['F','I','SH'] },
            { word: 'TREE', parts: ['T','R','EE'] },
            { word: 'BOOK', parts: ['B','OO','K'] },
            { word: 'HOUSE', parts: ['H','OU','SE'] },
            { word: 'CLOCK', parts: ['C','LO','CK'] },
            { word: 'SNAKE', parts: ['S','NA','KE'] },
            { word: 'FLOWER', parts: ['F','LO','WER'] },
            { word: 'TRAIN', parts: ['T','R','AI','N'] },
            { word: 'PLANE', parts: ['P','L','A','NE'] }
        ],
        wordRepeat: 2
    };

    function generateItemsForLevel(level, count) {
        if (!level) return [];
        const target = count || (itemsPerPage * 2);

        let baseItems = [];

        switch (level.type) {
            case 'trace':
                customParams.traceSelected.forEach(letter => {
                    for (let i = 0; i < customParams.traceRepeat; i++) {
                        baseItems.push({ type: 'trace', char: letter });
                    }
                });
                break;

            case 'wordbuilding':
                customParams.wordList.forEach(wordObj => {
                    for (let i = 0; i < customParams.wordRepeat; i++) {
                        baseItems.push({ type: 'word', word: wordObj.word, parts: wordObj.parts });
                    }
                });
                break;

            default:
                return Array(target).fill({ type: 'unknown' });
        }

        if (baseItems.length === 0) return Array(target).fill({ type: 'unknown' });
        let result = [];
        for (let i = 0; i < target; i++) {
            result.push({ ...baseItems[i % baseItems.length] });
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
        currentLevelId = id;
        if (id === 'i1' && customParams.traceSelected.length === 0) {
            customParams.traceSelected = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        }
        saveState();
        renderLevelList();
        updateParamPanel();
        refreshPreview();
    };

    function refreshPreview() {
        const level = LevelLibrary.ingles.find(l => l.id === currentLevelId);
        if (!level) return;

        const allItems = generateItemsForLevel(level, itemsPerPage * 2);
        const leftItems = allItems.slice(0, itemsPerPage);
        const rightItems = allItems.slice(itemsPerPage, itemsPerPage * 2);

        KumonGen.buildPage(pageLeft, level, 1, leftItems);
        KumonGen.buildPage(pageRight, level, 2, rightItems);
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

        window.addEventListener('storage', () => {
            KumonGen.initRefs();
        });
    }

    window.adjustZoom = KumonGen.adjustZoom;
    
    window.generatePDF = () => {
        const level = LevelLibrary.ingles.find(l => l.id === currentLevelId);
        if (!level) return;

        const pagesEl = document.getElementById('pagesPerBook');
        const totalPages = pagesEl ? parseInt(pagesEl.value) : 2;

        const allItems = generateItemsForLevel(level, totalPages * itemsPerPage);

        KumonGen.generatePDF('a4-sheet', 'Inglês', level.title, totalPages, allItems, level, itemsPerPage);
    };

    window.refreshPreview = refreshPreview;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
