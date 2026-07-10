// matematica.js - Lógica específica para Matemática
(function() {
    // ---------- BANCO DE DADOS ----------
    const LevelLibrary = {
        matematica: [
            { id: 'm1', title: 'M1 · Quantidade', type: 'quantity', numbers: [1,2,3,4,5], instruction: 'Pinte a quantidade de círculos.' },
            { id: 'm2', title: 'M2 · Adição', type: 'math', operator: '+', operand: 1, range: [1,9], instruction: 'Resolva as adições.' },
            { id: 'm3', title: 'M3 · Sequências', type: 'sequence', sequences: [[1,2,'__',4,5],[5,6,7,'__',9],[8,'__',10]], instruction: 'Complete a sequência.' },
            { id: 'm4', title: 'M4 · Dezenas', type: 'tens', numbers: [11,12,13,14,15,16,17,18,19], instruction: 'Pinte os grupos de 10 e unidades.' },
            { id: 'm5', title: 'M5 · Comparação', type: 'compare', pairs: [[3,5],[7,2],[4,4],[6,9]], instruction: 'Circule o maior (ou igual).' },
            { id: 'm6', title: 'M6 · Subtração', type: 'math', operator: '-', operand: 1, range: [2,10], instruction: 'Resolva as subtrações.' },
            { id: 'm7', title: 'M7 · Vizinhos', type: 'neighbors', centers: [5,10,15,18], instruction: 'Escreva o antes e depois.' }
        ]
    };

    // ---------- ESTADO LOCAL ----------
    let currentLevelId = 'm2';
    let itemsPerPage = 8;
    let currentZoom = 0.7;

    // Elementos DOM
    let pageLeft, pageRight, levelListDiv, paramPanel, zoomSpan, zoomContainer;

    // Parâmetros customizáveis
    let customParams = {
        qtyNumbers: [1,2,3,4,5],
        qtyRepeat: 2,
        operator: '+',
        operand: 1,
        min: 1,
        max: 9,
        allowNegative: false,
        seqFixed: true,
        seqStep: 1,
        seqLength: 5,
        seqCount: 4,
        seqHoles: 1, // novo: número de lacunas
        tensDezena: 1, // novo: dezena (ex: 1 para 10-19)
        tensSequencial: true, // novo: se true, ordem crescente; se false, aleatório
        compPairs: [[3,5],[7,2],[4,4],[6,9]],
        compRandom: false,
        compMin: 1,
        compMax: 10,
        compCount: 4,
        neighborCenters: [5,10,15,18]
    };

    // ---------- PERSISTÊNCIA (LOCAL STORAGE) ----------
    function loadSavedState() {
        const savedLevelId = localStorage.getItem('kumongen_mat_level');
        if (savedLevelId) {
            currentLevelId = savedLevelId;
        }

        const savedParams = localStorage.getItem('kumongen_mat_params');
        if (savedParams) {
            try {
                const parsed = JSON.parse(savedParams);
                customParams = { ...customParams, ...parsed };
            } catch (e) {
                console.error("Erro ao ler parametros salvos de matematica", e);
            }
        }
    }

    function saveState() {
        localStorage.setItem('kumongen_mat_level', currentLevelId);
        localStorage.setItem('kumongen_mat_params', JSON.stringify(customParams));
    }

    // ---------- FUNÇÕES DE GERAÇÃO DE ITENS ----------
    function generateItemsForLevel(level, count) {
        if (!level) return [];
        const target = count || (itemsPerPage * 2);

        let baseItems = [];

        switch (level.type) {
            case 'quantity':
                customParams.qtyNumbers.forEach(n => {
                    for (let i = 0; i < customParams.qtyRepeat; i++) {
                        baseItems.push({ type: 'quantity', value: n });
                    }
                });
                break;

            case 'math':
                for (let i = 0; i < target; i++) {
                    let a = Math.floor(Math.random() * (customParams.max - customParams.min + 1)) + customParams.min;
                    if (customParams.operator === '-' && !customParams.allowNegative) {
                        a = Math.max(a, customParams.operand);
                    }
                    baseItems.push({
                        type: 'math',
                        operand1: a,
                        operator: customParams.operator,
                        operand2: customParams.operand
                    });
                }
                return baseItems;

            case 'sequence':
                if (customParams.seqFixed) {
                    baseItems = level.sequences.map(seq => ({ type: 'sequence', sequence: seq }));
                } else {
                    const numSequences = Math.max(customParams.seqCount, target);
                    for (let s = 0; s < numSequences; s++) {
                        let start = Math.floor(Math.random() * 10) + 1;
                        let seq = [];
                        for (let j = 0; j < customParams.seqLength; j++) {
                            seq.push(start + j * customParams.seqStep);
                        }
                        let holePositions = [];
                        while (holePositions.length < Math.min(customParams.seqHoles, customParams.seqLength)) {
                            let pos = Math.floor(Math.random() * customParams.seqLength);
                            if (!holePositions.includes(pos)) {
                                holePositions.push(pos);
                            }
                        }
                        holePositions.forEach(pos => {
                            seq[pos] = '__';
                        });
                        baseItems.push({ type: 'sequence', sequence: seq });
                    }
                }
                break;

            case 'tens':
                let dezena = customParams.tensDezena;
                let minNum = dezena * 10;
                let maxNum = dezena * 10 + 9;
                let allNumbers = [];
                for (let n = minNum; n <= maxNum; n++) {
                    allNumbers.push(n);
                }
                if (!customParams.tensSequencial) {
                    allNumbers = shuffleArray(allNumbers);
                }
                allNumbers.forEach(n => {
                    baseItems.push({ type: 'tens', number: n });
                });
                break;

            case 'compare':
                if (customParams.compRandom) {
                    const compCount = Math.max(customParams.compCount, target);
                    for (let i = 0; i < compCount; i++) {
                        let a = Math.floor(Math.random() * (customParams.compMax - customParams.compMin + 1)) + customParams.compMin;
                        let b = Math.floor(Math.random() * (customParams.compMax - customParams.compMin + 1)) + customParams.compMin;
                        baseItems.push({ type: 'compare', pair: [a, b] });
                    }
                } else {
                    customParams.compPairs.forEach(p => {
                        baseItems.push({ type: 'compare', pair: p });
                    });
                }
                break;

            case 'neighbors':
                customParams.neighborCenters.forEach(c => {
                    baseItems.push({ type: 'neighbors', center: c });
                    baseItems.push({ type: 'neighbors', center: c });
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

    function shuffleArray(arr) {
        const copy = [...arr];
        for (let i = copy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copy[i], copy[j]] = [copy[j], copy[i]];
        }
        return copy;
    }

    // ---------- PAINEL DE PARÂMETROS ----------
    function updateParamPanel() {
        const level = LevelLibrary.matematica.find(l => l.id === currentLevelId);
        if (!level || !paramPanel) return;

        let html = '';

        switch (level.type) {
            case 'quantity': html = renderQuantityPanel(); break;
            case 'math': html = renderMathPanel(); break;
            case 'sequence': html = renderSequencePanel(); break;
            case 'tens': html = renderTensPanel(); break;
            case 'compare': html = renderComparePanel(); break;
            case 'neighbors': html = renderNeighborsPanel(); break;
            default: html = '<div class="text-slate-400">Sem parâmetros adicionais.</div>';
        }

        paramPanel.innerHTML = html;
        attachParamEvents(level.type);
    }

    function renderQuantityPanel() {
        return `
            <div class="param-control">
                <div class="param-row"><label>Números (vírgula):</label><input type="text" id="qtyNumbers" value="${customParams.qtyNumbers.join(',')}"></div>
                <div class="param-row"><label>Repetições:</label><input type="number" id="qtyRepeat" value="${customParams.qtyRepeat}" min="1" max="5"></div>
            </div>
        `;
    }

    function renderMathPanel() {
        return `
            <div class="param-control">
                <div class="param-row"><label>Operador:</label><select id="mathOperator"><option value="+" ${customParams.operator === '+' ? 'selected' : ''}>+</option><option value="-" ${customParams.operator === '-' ? 'selected' : ''}>-</option></select></div>
                <div class="param-row"><label>Valor:</label><input type="number" id="mathOperand" value="${customParams.operand}" min="1" max="20"></div>
                <div class="param-row"><label>Mínimo:</label><input type="number" id="mathMin" value="${customParams.min}" min="1" max="50"></div>
                <div class="param-row"><label>Máximo:</label><input type="number" id="mathMax" value="${customParams.max}" min="1" max="50"></div>
                <div class="param-row checkbox-row"><label>Permitir negativo?</label><input type="checkbox" id="mathAllowNegative" ${customParams.allowNegative ? 'checked' : ''}></div>
            </div>
        `;
    }

    function renderSequencePanel() {
        return `
            <div class="param-control">
                <div class="param-row checkbox-row"><label>Sequências fixas</label><input type="checkbox" id="seqFixed" ${customParams.seqFixed ? 'checked' : ''}></div>
                <div class="param-row"><label>Passo:</label><input type="number" id="seqStep" value="${customParams.seqStep}" min="1" max="5"></div>
                <div class="param-row"><label>Comprimento:</label><input type="number" id="seqLength" value="${customParams.seqLength}" min="3" max="7"></div>
                <div class="param-row"><label>Lacunas:</label><input type="number" id="seqHoles" value="${customParams.seqHoles}" min="1" max="3"></div>
                <div class="param-row"><label>Qtd aleatória:</label><input type="number" id="seqCount" value="${customParams.seqCount}" min="2" max="8"></div>
            </div>
        `;
    }

    function renderTensPanel() {
        return `
            <div class="param-control">
                <div class="param-row"><label>Dezena (1-9):</label><input type="number" id="tensDezena" value="${customParams.tensDezena}" min="1" max="9"></div>
                <div class="param-row checkbox-row"><label>Sequencial</label><input type="checkbox" id="tensSequencial" ${customParams.tensSequencial ? 'checked' : ''}></div>
            </div>
        `;
    }

    function renderComparePanel() {
        return `
            <div class="param-control">
                <div class="param-row checkbox-row"><label>Gerar aleatório</label><input type="checkbox" id="compRandom" ${customParams.compRandom ? 'checked' : ''}></div>
                <div class="param-row"><label>Pares (ex: 3,5;7,2):</label><input type="text" id="compPairs" value="${customParams.compPairs.map(p => p.join(',')).join(';')}"></div>
                <div class="param-row"><label>Mín:</label><input type="number" id="compMin" value="${customParams.compMin}" min="1" max="20"></div>
                <div class="param-row"><label>Máx:</label><input type="number" id="compMax" value="${customParams.compMax}" min="1" max="20"></div>
                <div class="param-row"><label>Qtd:</label><input type="number" id="compCount" value="${customParams.compCount}" min="2" max="10"></div>
            </div>
        `;
    }

    function renderNeighborsPanel() {
        return `<div class="param-control"><div class="param-row"><label>Centros:</label><input type="text" id="neighborCenters" value="${customParams.neighborCenters.join(',')}"></div></div>`;
    }

    function attachParamEvents(type) {
        setTimeout(() => {
            if (type === 'quantity') {
                const inpNumbers = document.getElementById('qtyNumbers');
                const inpRepeat = document.getElementById('qtyRepeat');
                if (inpNumbers) inpNumbers.addEventListener('change', (e) => {
                    customParams.qtyNumbers = e.target.value.split(',').map(Number).filter(n => !isNaN(n));
                    saveState();
                    refreshPreview();
                });
                if (inpRepeat) inpRepeat.addEventListener('change', (e) => {
                    customParams.qtyRepeat = parseInt(e.target.value) || 2;
                    saveState();
                    refreshPreview();
                });
            }
            if (type === 'math') {
                const op = document.getElementById('mathOperator');
                const operand = document.getElementById('mathOperand');
                const min = document.getElementById('mathMin');
                const max = document.getElementById('mathMax');
                const allowNeg = document.getElementById('mathAllowNegative');
                if (op) op.addEventListener('change', (e) => { customParams.operator = e.target.value; saveState(); refreshPreview(); });
                if (operand) operand.addEventListener('change', (e) => { customParams.operand = parseInt(e.target.value) || 1; saveState(); refreshPreview(); });
                if (min) min.addEventListener('change', (e) => { customParams.min = parseInt(e.target.value) || 1; saveState(); refreshPreview(); });
                if (max) max.addEventListener('change', (e) => { customParams.max = parseInt(e.target.value) || 1; saveState(); refreshPreview(); });
                if (allowNeg) allowNeg.addEventListener('change', (e) => { customParams.allowNegative = e.target.checked; saveState(); refreshPreview(); });
            }
            if (type === 'sequence') {
                const fixed = document.getElementById('seqFixed');
                const step = document.getElementById('seqStep');
                const len = document.getElementById('seqLength');
                const holes = document.getElementById('seqHoles');
                const cnt = document.getElementById('seqCount');
                if (fixed) fixed.addEventListener('change', (e) => { customParams.seqFixed = e.target.checked; saveState(); refreshPreview(); });
                if (step) step.addEventListener('change', (e) => { customParams.seqStep = parseInt(e.target.value) || 1; saveState(); refreshPreview(); });
                if (len) len.addEventListener('change', (e) => { customParams.seqLength = parseInt(e.target.value) || 5; saveState(); refreshPreview(); });
                if (holes) holes.addEventListener('change', (e) => { customParams.seqHoles = parseInt(e.target.value) || 1; saveState(); refreshPreview(); });
                if (cnt) cnt.addEventListener('change', (e) => { customParams.seqCount = parseInt(e.target.value) || 4; saveState(); refreshPreview(); });
            }
            if (type === 'tens') {
                const dezena = document.getElementById('tensDezena');
                const sequencial = document.getElementById('tensSequencial');
                if (dezena) dezena.addEventListener('change', (e) => {
                    customParams.tensDezena = parseInt(e.target.value) || 1;
                    saveState();
                    refreshPreview();
                });
                if (sequencial) sequencial.addEventListener('change', (e) => {
                    customParams.tensSequencial = e.target.checked;
                    saveState();
                    refreshPreview();
                });
            }
            if (type === 'compare') {
                const random = document.getElementById('compRandom');
                const pairs = document.getElementById('compPairs');
                const min = document.getElementById('compMin');
                const max = document.getElementById('compMax');
                const cnt = document.getElementById('compCount');
                if (random) random.addEventListener('change', (e) => { customParams.compRandom = e.target.checked; saveState(); refreshPreview(); });
                if (pairs) pairs.addEventListener('change', (e) => {
                    customParams.compPairs = e.target.value.split(';').map(part => part.split(',').map(Number)).filter(p => p.length === 2);
                    saveState();
                    refreshPreview();
                });
                if (min) min.addEventListener('change', (e) => { customParams.compMin = parseInt(e.target.value) || 1; saveState(); refreshPreview(); });
                if (max) max.addEventListener('change', (e) => { customParams.compMax = parseInt(e.target.value) || 1; saveState(); refreshPreview(); });
                if (cnt) cnt.addEventListener('change', (e) => { customParams.compCount = parseInt(e.target.value) || 4; saveState(); refreshPreview(); });
            }
            if (type === 'neighbors') {
                const centers = document.getElementById('neighborCenters');
                if (centers) centers.addEventListener('change', (e) => {
                    customParams.neighborCenters = e.target.value.split(',').map(Number).filter(n => !isNaN(n));
                    saveState();
                    refreshPreview();
                });
            }
        }, 50);
    }

    function renderLevelList() {
        if (!levelListDiv) return;
        const levels = LevelLibrary.matematica;
        let html = '';
        levels.forEach(lvl => {
            const active = (lvl.id === currentLevelId) ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-blue-200';
            html += `<button onclick="selectLevel('${lvl.id}')" class="w-full text-left p-3 rounded-xl border-2 transition-all ${active}">
                <div class="text-xs font-bold ${lvl.id === currentLevelId ? 'text-blue-700' : 'text-slate-600'}">${lvl.title}</div>
            </button>`;
        });
        levelListDiv.innerHTML = html;
    }

    window.selectLevel = function(id) {
        currentLevelId = id;
        saveState();
        renderLevelList();
        updateParamPanel();
        refreshPreview();
    };

    function refreshPreview() {
        const level = LevelLibrary.matematica.find(l => l.id === currentLevelId);
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
        const level = LevelLibrary.matematica.find(l => l.id === currentLevelId);
        if (!level) return;

        const pagesEl = document.getElementById('pagesPerBook');
        const totalPages = pagesEl ? parseInt(pagesEl.value) : 2;

        const allItems = generateItemsForLevel(level, totalPages * itemsPerPage);

        KumonGen.generatePDF('a4-sheet', 'Matemática', level.title, totalPages, allItems, level, itemsPerPage);
    };

    window.refreshPreview = refreshPreview;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
