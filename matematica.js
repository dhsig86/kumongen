// matematica.js - Lógica específica para Matemática
(function() {
    // ---------- BANCO DE DADOS ----------
    const LevelLibrary = {
        matematica: [
            { id: 'm1', title: 'M1 · Quantidade', type: 'quantity', numbers: [1,2,3,4,5], instruction: 'Pinte a quantidade de círculos.' },
            { id: 'm2', title: 'M2 · Adição', type: 'math', operator: '+', operand: 1, range: [1,9], instruction: 'Resolva as adições.' },
            { id: 'm3', title: 'M3 · Sequências', type: 'sequence', sequences: [[1,2,'__',4,5],[5,6,7,'__',9],[8,'__',10,11,12],['__',3,4,5,6],[2,4,'__',8,10],[10,20,'__',40,50],[5,10,15,'__',25],[3,6,'__',12,15],[1,2,3,'__',5],[7,8,9,'__',11],[15,'__',17,18,19],[20,19,'__',17,16]], instruction: 'Complete a sequência.' },
            { id: 'm4', title: 'M4 · Dezenas', type: 'tens', numbers: [11,12,13,14,15,16,17,18,19], instruction: 'Pinte os grupos de 10 e unidades.' },
            { id: 'm5', title: 'M5 · Comparação', type: 'compare', pairs: [[3,5],[7,2],[4,4],[6,9],[1,8],[5,5],[10,3],[2,7],[8,6],[9,1],[3,3],[6,4]], instruction: 'Circule o maior (ou igual).' },
            { id: 'm6', title: 'M6 · Subtração', type: 'math', operator: '-', operand: 1, range: [2,10], instruction: 'Resolva as subtrações.' },
            { id: 'm7', title: 'M7 · Vizinhos', type: 'neighbors', centers: [3,5,7,10,12,15,18,20,25,30,42,50], instruction: 'Escreva o antes e depois.' },
            { id: 'm8', title: 'M8 · Multiplicação', type: 'math', operator: '×', operand: 2, range: [1,10], instruction: 'Resolva as multiplicações.' },
            { id: 'm9', title: 'M9 · Divisão', type: 'math', operator: '÷', operand: 2, range: [2,20], instruction: 'Resolva as divisões exatas.' },
            { id: 'm10', title: 'M10 · Frações', type: 'fraction', fractions: [[1,2],[1,3],[2,3],[1,4],[2,4],[3,4],[1,5],[2,5],[3,5],[4,5],[1,6],[2,6],[3,6],[4,6],[5,6],[1,8],[2,8],[3,8],[4,8],[5,8],[6,8],[7,8],[1,10],[3,10],[5,10],[7,10],[9,10]], instruction: 'Identifique a fração correspondente.' }
        ]
    };

    // ---------- ESTADO LOCAL ----------
    let currentLevelId = 'm2';
    let currentStage = 1;
    let useStagePreset = true;
    let itemsPerPage = 8;
    let previewSheetIdx = 0;
    let lastGeneratedItems = [];
    let currentZoom = 0.7;

    // Elementos DOM
    let pageLeft, pageRight, levelListDiv, paramPanel, zoomSpan, zoomContainer;

    // Parâmetros customizáveis
    let customParams = {
        qtyNumbers: [1,2,3,4,5],
        qtyRepeat: 2,
        operator: '+',
        operand: 1,
        mathCustomOperands: [], // Lista personalizada para misturar fatos específicos (ex: [6,7,8])
        min: 1,
        max: 9,
        allowNegative: false,
        mathMissingHole: false, // Kumon: se true, esconde um dos operandos (__ + b = c ou a + __ = c)
        mathMixedTables: false, // M8/M9: se true, alterna tabuadas mistas entre 2 e 9
        seqFixed: true,
        seqStep: 1,
        seqLength: 5,
        seqCount: 4,
        seqHoles: 1, // número de lacunas
        tensDezena: 1, // dezena (ex: 1 para 10-19)
        tensSequencial: true, // ordem crescente ou aleatório
        compPairs: [[3,5],[7,2],[4,4],[6,9],[1,8],[5,5],[10,3],[2,7],[8,6],[9,1],[3,3],[6,4]],
        compRandom: false,
        compMin: 1,
        compMax: 10,
        compCount: 4,
        neighborCenters: [3,5,7,10,12,15,18,20,25,30,42,50],
        handicap: null
    };

    // ---------- PERSISTÊNCIA (LOCAL STORAGE) ----------
    function loadSavedState() {
        const storage = window.SafeStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
        if (!storage) return;
        const savedLevelId = storage.getItem('kumongen_mat_level');
        if (savedLevelId) {
            currentLevelId = savedLevelId;
        }

        const savedParams = storage.getItem('kumongen_mat_params');
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
        const storage = window.SafeStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
        if (!storage) return;
        try {
            storage.setItem('kumongen_mat_level', currentLevelId);
            storage.setItem('kumongen_mat_params', JSON.stringify(customParams));
        } catch (e) {}
    }

    // ---------- FUNÇÕES DE GERAÇÃO DE ITENS ----------
    function generateItemsForLevel(level, count, options = {}) {
        if (!level) return [];
        const target = count || (itemsPerPage * 2);

        let effOpts = options && typeof options === 'object' ? { ...options } : {};
        if (effOpts.stage !== undefined && typeof window !== 'undefined' && window.KumonProgression) {
            const stageOpts = window.KumonProgression.stageToGeneratorOptions('matematica', level.id, effOpts.stage);
            effOpts = Object.assign({}, stageOpts, effOpts);
        }

        let baseItems = [];

        switch (level.type) {
            case 'quantity': {
                const qtyPool = Array.isArray(effOpts.qtyNumbers) && effOpts.qtyNumbers.length > 0
                    ? effOpts.qtyNumbers
                    : customParams.qtyNumbers;
                qtyPool.forEach(n => {
                    for (let i = 0; i < customParams.qtyRepeat; i++) {
                        baseItems.push({ type: 'quantity', value: n });
                    }
                });
                break;
            }

            case 'math': {
                const isLevelActive = (currentLevelId === level.id);
                const optHandicap = effOpts.handicap || null;
                let handicapMode = null;
                let handicapVal = null;
                if (optHandicap) {
                    if (typeof optHandicap === 'object') {
                        handicapMode = optHandicap.mode || 'focus';
                        if (optHandicap.value !== undefined && optHandicap.value !== null) {
                            handicapVal = Number(optHandicap.value);
                        }
                    } else if (typeof optHandicap === 'number' || (!isNaN(Number(optHandicap)) && optHandicap !== '')) {
                        handicapMode = 'focus';
                        handicapVal = Number(optHandicap);
                    }
                }

                const op = (effOpts && effOpts.operator) || ((isLevelActive && customParams.operator && effOpts.stage === undefined) ? customParams.operator : (level.operator || '+'));
                const defaultOp2 = (isLevelActive && customParams.operand !== undefined && effOpts.stage === undefined) ? customParams.operand : ((level.operand !== undefined) ? level.operand : 1);
                const baseOp2 = (handicapMode === 'focus' && handicapVal !== null) ? handicapVal : defaultOp2;

                const minVal = (effOpts && effOpts.min !== undefined) ? effOpts.min : ((isLevelActive && customParams.min !== undefined && effOpts.stage === undefined) ? customParams.min : ((level.range && level.range[0] !== undefined) ? level.range[0] : 1));
                const maxVal = (effOpts && effOpts.max !== undefined) ? effOpts.max : ((isLevelActive && customParams.max !== undefined && effOpts.stage === undefined) ? customParams.max : ((level.range && level.range[1] !== undefined) ? level.range[1] : 10));
                const isMissingHole = (effOpts && effOpts.mathMissingHole !== undefined) ? effOpts.mathMissingHole : !!(isLevelActive && customParams.mathMissingHole);
                const isMixed = (handicapMode === 'mixed_basic' || handicapMode === 'mixed_full') || !!(isLevelActive && customParams.mathMixedTables);

                if (op === '÷' || op === '/') {
                    for (let i = 0; i < target; i++) {
                        let effectiveDivisor;
                        if (isLevelActive && effOpts.stage === undefined && Array.isArray(customParams.mathCustomOperands) && customParams.mathCustomOperands.length > 0) {
                            const pool = customParams.mathCustomOperands;
                            effectiveDivisor = Math.max(1, pool[Math.floor(Math.random() * pool.length)]);
                        } else if (handicapMode === 'focus' && handicapVal !== null) {
                            effectiveDivisor = Math.max(1, handicapVal);
                        } else if (handicapMode === 'mixed_basic') {
                            effectiveDivisor = Math.floor(Math.random() * 4) + 2; // 2 a 5
                        } else if (handicapMode === 'mixed_full' || isMixed) {
                            effectiveDivisor = Math.floor(Math.random() * 8) + 2; // 2 a 9
                        } else {
                            effectiveDivisor = Math.max(1, baseOp2 || 2);
                        }
                        const quotient = Math.floor(Math.random() * 10) + 1;
                        const dividend = effectiveDivisor * quotient;
                        const itemObj = {
                            type: 'math',
                            operand1: dividend,
                            operator: '÷',
                            operand2: effectiveDivisor,
                            result: quotient
                        };
                        if (isMissingHole) {
                            itemObj.missingPos = Math.random() < 0.5 ? 'op1' : 'op2';
                        }
                        baseItems.push(itemObj);
                    }
                    return baseItems;
                }

                let lastA = null;
                for (let i = 0; i < target; i++) {
                    let a;
                    let attempts = 0;
                    const rangeSize = Math.max(1, maxVal - minVal + 1);
                    do {
                        a = Math.floor(Math.random() * rangeSize) + minVal;
                        attempts++;
                    } while (a === lastA && attempts < 10 && rangeSize > 1);
                    
                    lastA = a;
                    let displayA = a;
                    let effectiveOp2;
                    if (isLevelActive && effOpts.stage === undefined && Array.isArray(customParams.mathCustomOperands) && customParams.mathCustomOperands.length > 0) {
                        const pool = customParams.mathCustomOperands;
                        effectiveOp2 = pool[Math.floor(Math.random() * pool.length)];
                    } else if (handicapMode === 'focus' && handicapVal !== null) {
                        effectiveOp2 = handicapVal;
                    } else if (handicapMode === 'mixed_basic') {
                        if (op === '×' || op === '*') {
                            effectiveOp2 = Math.floor(Math.random() * 4) + 2; // 2 a 5
                        } else {
                            effectiveOp2 = Math.floor(Math.random() * 5) + 1; // 1 a 5
                        }
                    } else if (handicapMode === 'mixed_full') {
                        if (op === '×' || op === '*') {
                            effectiveOp2 = Math.floor(Math.random() * 8) + 2; // 2 a 9
                        } else {
                            effectiveOp2 = Math.floor(Math.random() * 9) + 1; // 1 a 9
                        }
                    } else if (isMixed && (op === '×' || op === '*')) {
                        effectiveOp2 = Math.floor(Math.random() * 8) + 2;
                    } else {
                        effectiveOp2 = baseOp2;
                    }

                    if (op === '+' && effOpts.minSum !== undefined && (displayA + effectiveOp2) < effOpts.minSum) {
                        const neededA = effOpts.minSum - effectiveOp2;
                        displayA = Math.min(maxVal, Math.max(neededA, displayA));
                        if ((displayA + effectiveOp2) < effOpts.minSum) {
                            effectiveOp2 = Math.max(effectiveOp2, effOpts.minSum - displayA);
                        }
                    }

                    if (op === '-' && !customParams.allowNegative) {
                        if (displayA < effectiveOp2) {
                            displayA = effectiveOp2 + Math.floor(Math.random() * Math.max(1, maxVal - minVal + 1));
                        } else {
                            displayA = Math.max(a, effectiveOp2);
                        }
                    }

                    let resVal = 0;
                    if (op === '+') resVal = displayA + effectiveOp2;
                    else if (op === '-') resVal = displayA - effectiveOp2;
                    else if (op === '×' || op === '*') resVal = displayA * effectiveOp2;

                    const itemObj = {
                        type: 'math',
                        operand1: displayA,
                        operator: op,
                        operand2: effectiveOp2,
                        result: resVal
                    };
                    if (isMissingHole) {
                        itemObj.missingPos = Math.random() < 0.5 ? 'op1' : 'op2';
                    }
                    baseItems.push(itemObj);
                }
                return baseItems;
            }

            case 'fraction': {
                const rawPool = (level && level.fractions && level.fractions.length > 0)
                    ? level.fractions
                    : [[1,2],[1,3],[2,3],[1,4],[2,4],[3,4],[1,5],[2,5],[3,5],[4,5],[1,6],[2,6],[3,6],[4,6],[5,6],[1,8],[2,8],[3,8],[4,8],[5,8],[6,8],[7,8],[1,10],[3,10],[5,10],[7,10],[9,10]];
                const fractionPool = (Array.isArray(effOpts.fractionSlice) && effOpts.fractionSlice.length === 2)
                    ? rawPool.slice(effOpts.fractionSlice[0], effOpts.fractionSlice[1])
                    : rawPool;
                
                const poolShuffled = [...fractionPool].sort(() => Math.random() - 0.5);
                while (baseItems.length < target) {
                    for (let i = 0; i < poolShuffled.length && baseItems.length < target; i++) {
                        baseItems.push({
                            type: 'fraction',
                            numerator: poolShuffled[i][0],
                            denominator: poolShuffled[i][1]
                        });
                    }
                }
                return baseItems;
            }

            case 'sequence': {
                const useFixed = (effOpts.seqFixed !== undefined) ? effOpts.seqFixed : customParams.seqFixed;
                const stepVal = effOpts.seqStep || customParams.seqStep || 1;
                const stepPool = (Array.isArray(effOpts.seqSteps) && effOpts.seqSteps.length > 0) ? effOpts.seqSteps : [stepVal];
                const holeCount = effOpts.seqHoles || customParams.seqHoles || 1;
                const minStart = effOpts.seqMinStart || 1;
                const maxStart = effOpts.seqMaxStart || 10;

                if (useFixed) {
                    baseItems = level.sequences.map(seq => ({ type: 'sequence', sequence: seq }));
                } else {
                    const numSequences = Math.max(customParams.seqCount, target);
                    for (let s = 0; s < numSequences; s++) {
                        const chosenStep = stepPool[s % stepPool.length];
                        const safeMinStart = chosenStep < 0
                            ? Math.max(minStart, Math.abs(chosenStep) * (customParams.seqLength - 1) + 2)
                            : minStart;
                        const safeMaxStart = Math.max(safeMinStart + 2, maxStart);
                        let start = Math.floor(Math.random() * Math.max(1, safeMaxStart - safeMinStart + 1)) + safeMinStart;
                        let seq = [];
                        for (let j = 0; j < customParams.seqLength; j++) {
                            seq.push(start + j * chosenStep);
                        }
                        let holePositions = [];
                        while (holePositions.length < Math.min(holeCount, customParams.seqLength)) {
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
            }

            case 'tens': {
                const dezenasPool = (Array.isArray(effOpts.tensDezenas) && effOpts.tensDezenas.length > 0)
                    ? effOpts.tensDezenas
                    : [effOpts.tensDezena !== undefined ? effOpts.tensDezena : customParams.tensDezena];
                const isSeq = effOpts.tensSequencial !== undefined ? effOpts.tensSequencial : customParams.tensSequencial;
                let allNumbers = [];
                dezenasPool.forEach((dez) => {
                    const minNum = dez * 10;
                    const maxNum = dez * 10 + 9;
                    for (let n = minNum; n <= maxNum; n++) {
                        allNumbers.push(n);
                    }
                });
                if (!isSeq) {
                    allNumbers = shuffleArray(allNumbers);
                }
                allNumbers.forEach(n => {
                    baseItems.push({ type: 'tens', number: n });
                });
                break;
            }

            case 'compare': {
                const useRand = effOpts.compRandom !== undefined ? effOpts.compRandom : customParams.compRandom;
                const cMin = effOpts.compMin !== undefined ? effOpts.compMin : customParams.compMin;
                const cMax = effOpts.compMax !== undefined ? effOpts.compMax : customParams.compMax;
                if (useRand) {
                    const compCount = Math.max(customParams.compCount, target);
                    let lastPairStr = null;
                    for (let i = 0; i < compCount; i++) {
                        let a, b, pairStr;
                        let attempts = 0;
                        do {
                            a = Math.floor(Math.random() * (cMax - cMin + 1)) + cMin;
                            b = Math.floor(Math.random() * (cMax - cMin + 1)) + cMin;
                            pairStr = `${a},${b}`;
                            attempts++;
                        } while (pairStr === lastPairStr && attempts < 10);
                        
                        lastPairStr = pairStr;
                        baseItems.push({ type: 'compare', pair: [a, b] });
                    }
                } else {
                    customParams.compPairs.forEach(p => {
                        baseItems.push({ type: 'compare', pair: p });
                    });
                }
                break;
            }

            case 'neighbors': {
                const centersPool = Array.isArray(effOpts.neighborCenters) && effOpts.neighborCenters.length > 0
                    ? effOpts.neighborCenters
                    : customParams.neighborCenters;
                centersPool.forEach(c => {
                    baseItems.push({ type: 'neighbors', center: c });
                    baseItems.push({ type: 'neighbors', center: c });
                });
                break;
            }

            default:
                return Array(target).fill({ type: 'unknown' });
        }

        if (baseItems.length === 0) return Array(target).fill({ type: 'unknown' });
        
        const keyFn = (item) => {
            if (item.type === 'quantity') return item.value;
            if (item.type === 'sequence') return item.sequence.join(',');
            if (item.type === 'tens') return item.number;
            if (item.type === 'compare') return item.pair.join(',');
            if (item.type === 'neighbors') return item.center;
            if (item.type === 'fraction') return `${item.numerator}/${item.denominator}`;
            return '';
        };

        const declustered = KumonGen.shuffleAndDecluster(baseItems, keyFn);
        
        let result = [];
        for (let i = 0; i < target; i++) {
            result.push({ ...declustered[i % declustered.length] });
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
        const customOpsStr = Array.isArray(customParams.mathCustomOperands) ? customParams.mathCustomOperands.join(',') : '';
        return `
            <div class="param-control">
                <div class="param-row"><label>Operador:</label><select id="mathOperator"><option value="+" ${customParams.operator === '+' ? 'selected' : ''}>+</option><option value="-" ${customParams.operator === '-' ? 'selected' : ''}>-</option><option value="×" ${customParams.operator === '×' ? 'selected' : ''}>×</option><option value="÷" ${customParams.operator === '÷' ? 'selected' : ''}>÷</option></select></div>
                <div class="param-row"><label>Valor:</label><input type="number" id="mathOperand" value="${customParams.operand}" min="1" max="20"></div>
                <div class="param-row"><label title="Ex: 6,7,8 para misturar apenas essas tabuadas ou somas">Fatos múltiplos:</label><input type="text" id="mathCustomOperands" placeholder="ex: 6,7,8" value="${customOpsStr}"></div>
                <div class="param-row"><label>Mínimo:</label><input type="number" id="mathMin" value="${customParams.min}" min="1" max="50"></div>
                <div class="param-row"><label>Máximo:</label><input type="number" id="mathMax" value="${customParams.max}" min="1" max="50"></div>
                <div class="param-row checkbox-row"><label>Permitir negativo?</label><input type="checkbox" id="mathAllowNegative" ${customParams.allowNegative ? 'checked' : ''}></div>
                <div class="param-row checkbox-row"><label>Incógnita Kumon (__ + b = c)</label><input type="checkbox" id="mathMissingHole" ${customParams.mathMissingHole ? 'checked' : ''}></div>
                <div class="param-row checkbox-row"><label>Tabuadas mistas (2 a 9)</label><input type="checkbox" id="mathMixedTables" ${customParams.mathMixedTables ? 'checked' : ''}></div>
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
                const customOps = document.getElementById('mathCustomOperands');
                const min = document.getElementById('mathMin');
                const max = document.getElementById('mathMax');
                const allowNeg = document.getElementById('mathAllowNegative');
                const missingHole = document.getElementById('mathMissingHole');
                const mixedTabs = document.getElementById('mathMixedTables');
                if (op) op.addEventListener('change', (e) => { useStagePreset = false; customParams.operator = e.target.value; saveState(); refreshPreview(); });
                if (operand) operand.addEventListener('change', (e) => { useStagePreset = false; customParams.operand = parseInt(e.target.value) || 1; saveState(); refreshPreview(); });
                if (customOps) customOps.addEventListener('change', (e) => {
                    useStagePreset = false;
                    customParams.mathCustomOperands = e.target.value.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n) && n > 0 && n <= 25);
                    saveState();
                    refreshPreview();
                });
                if (min) min.addEventListener('change', (e) => { useStagePreset = false; customParams.min = parseInt(e.target.value) || 1; saveState(); refreshPreview(); });
                if (max) max.addEventListener('change', (e) => { useStagePreset = false; customParams.max = parseInt(e.target.value) || 1; saveState(); refreshPreview(); });
                if (allowNeg) allowNeg.addEventListener('change', (e) => { useStagePreset = false; customParams.allowNegative = e.target.checked; saveState(); refreshPreview(); });
                if (missingHole) missingHole.addEventListener('change', (e) => { useStagePreset = false; customParams.mathMissingHole = e.target.checked; saveState(); refreshPreview(); });
                if (mixedTabs) mixedTabs.addEventListener('change', (e) => { useStagePreset = false; customParams.mathMixedTables = e.target.checked; saveState(); refreshPreview(); });
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

    function updateTabletLink() {
        if (window.KumonGen && typeof window.KumonGen.syncTabletPracticeLink === 'function') {
            window.KumonGen.syncTabletPracticeLink('matPracticeTabletBtn', 'matematica', currentLevelId, currentStage);
            return;
        }
        const btn = document.getElementById('matPracticeTabletBtn');
        if (btn) {
            btn.href = `tablet.html?subject=matematica&level=${currentLevelId}&stage=${currentStage}&autostart=true`;
        }
    }

    function syncStageToParamsAndUI(stage) {
        currentStage = stage || 1;
        useStagePreset = true;
        if (typeof window !== 'undefined' && window.KumonProgression) {
            const spec = window.KumonProgression.getStageSpec('matematica', currentLevelId, currentStage);
            if (spec) {
                if (spec.handicap && spec.handicap.mode === 'focus' && spec.handicap.value !== undefined) {
                    customParams.operand = spec.handicap.value;
                    customParams.mathMixedTables = false;
                } else if (spec.handicap && (spec.handicap.mode === 'mixed_basic' || spec.handicap.mode === 'mixed_full')) {
                    customParams.mathMixedTables = true;
                }
                if (spec.min !== undefined) customParams.min = spec.min;
                if (spec.max !== undefined) customParams.max = spec.max;
                if (spec.mathMissingHole !== undefined) customParams.mathMissingHole = !!spec.mathMissingHole;
            }
        }
        updateParamPanel();
        updateTabletLink();
        refreshPreview();
    }

    function refreshDifficultySlider() {
        if (window.KumonGen && typeof window.KumonGen.renderPcDifficultySlider === 'function') {
            currentStage = window.KumonGen.renderPcDifficultySlider({
                containerId: 'pcDifficultySliderContainer',
                subjectKey: 'matematica',
                levelId: currentLevelId,
                tabletBtnId: 'matPracticeTabletBtn',
                accentColor: '#2563eb',
                onStageApplied: (nextStage) => {
                    syncStageToParamsAndUI(nextStage);
                }
            });
        } else {
            updateTabletLink();
        }
    }

    window.selectLevel = function(id) {
        currentLevelId = id;
        useStagePreset = true;
        const lvlObj = LevelLibrary.matematica.find(l => l.id === id);
        if (lvlObj && lvlObj.operator) {
            customParams.operator = lvlObj.operator;
        }
        saveState();
        renderLevelList();
        refreshDifficultySlider();
        updateParamPanel();
        updateTabletLink();
        refreshPreview();
    };

    function renderCurrentSheetOnly() {
        const level = LevelLibrary.matematica.find(l => l.id === currentLevelId);
        if (!level || !pageLeft || !pageRight) return;
        previewSheetIdx = KumonGen.renderPreviewPagerSlice({
            subjectKey: 'matematica',
            level,
            allItems: lastGeneratedItems,
            pageLeft,
            pageRight,
            linesPerPage: itemsPerPage,
            sheetIdx: previewSheetIdx,
            onSheetChange: (nextIdx) => {
                previewSheetIdx = nextIdx;
                renderCurrentSheetOnly();
            },
            refreshFn: refreshPreview
        });
    }

    function refreshPreview() {
        if (!pageLeft || !pageRight) return;
        const level = LevelLibrary.matematica.find(l => l.id === currentLevelId);
        if (!level) return;

        const totalPages = KumonGen.getTotalPagesRequested ? KumonGen.getTotalPagesRequested() : 2;
        const genOpts = useStagePreset ? { stage: currentStage } : {};
        lastGeneratedItems = (typeof KumonGen.composeWorksheetItems === 'function')
            ? KumonGen.composeWorksheetItems({ subjectKey: 'matematica', level, totalCount: totalPages * itemsPerPage, generatorFn: generateItemsForLevel, genOpts })
            : generateItemsForLevel(level, totalPages * itemsPerPage, genOpts);
        renderCurrentSheetOnly();
    }

    // ===== CONTROLES DE ABAS & WIZARD (KUMON 3.0) =====
    function switchMatTab(tab) {
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

    function selectWizardAge(ageKey, btn) {
        document.querySelectorAll('.wizard-age-btn').forEach(b => {
            b.classList.remove('active', 'border-blue-600', 'bg-blue-50');
            b.classList.add('border-slate-200', 'bg-white');
        });
        if (btn) {
            btn.classList.add('active', 'border-blue-600', 'bg-blue-50');
            btn.classList.remove('border-slate-200', 'bg-white');
        }

        const map = {
            'age_4_5': 'm1',
            'age_6_7': 'm2',
            'age_8_9': 'm6',
            'age_10_plus': 'm8'
        };
        const targetLevel = map[ageKey] || 'm2';
        const targetCard = document.querySelector(`#panel-wizard .kumon-wizard-card[onclick*="'${targetLevel}'"]`);
        selectWizardGoal(targetLevel, targetCard);
    }

    function selectWizardGoal(levelId, el) {
        currentLevelId = levelId;
        const lvlObj = LevelLibrary.matematica.find(l => l.id === levelId);
        if (lvlObj && lvlObj.operator) {
            customParams.operator = lvlObj.operator;
        }
        document.querySelectorAll('#panel-wizard .kumon-wizard-card').forEach(card => card.classList.remove('active'));
        if (el) el.classList.add('active');

        saveState();
        renderLevelList();
        refreshDifficultySlider();
        updateParamPanel();
        refreshPreview();
    }

    function selectWizardPace(pages, lines, btn) {
        document.querySelectorAll('.wizard-pace-btn').forEach(b => {
            b.classList.remove('active', 'border-blue-600', 'bg-blue-50', 'text-blue-800');
            b.classList.add('border-slate-200', 'bg-white', 'text-slate-600');
        });
        if (btn) {
            btn.classList.add('active', 'border-blue-600', 'bg-blue-50', 'text-blue-800');
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

        try {
            const urlP = new URLSearchParams(window.location.search);
            const qLvl = urlP.get('level');
            if (qLvl && LevelLibrary.matematica.some(l => l.id === qLvl)) {
                currentLevelId = qLvl;
            }
            if (urlP.get('mode') === 'weakness') {
                if (typeof KumonGen !== 'undefined' && typeof KumonGen.setPedagogicalConfig === 'function') {
                    KumonGen.setPedagogicalConfig({ sheetSourceMode: 'weakness_only' }, { persist: false });
                }
                const acc = document.getElementById('paperAssemblerAccordion');
                if (acc) acc.open = true;
            }
        } catch (e) {}

        KumonGen.initRefs();

        refreshDifficultySlider();
        renderLevelList();
        updateParamPanel();
        updateTabletLink();
        refreshPreview();

        window.addEventListener('kumongen:student_changed', () => {
            refreshDifficultySlider();
            refreshPreview();
        });
        window.addEventListener('kumongen:stage_changed', (e) => {
            if (e && e.detail && e.detail.subjectKey === 'matematica') {
                refreshDifficultySlider();
                refreshPreview();
            }
        });

        const linesSelect = document.getElementById('linesPerPage');
        if (linesSelect) {
            linesSelect.addEventListener('change', (e) => {
                itemsPerPage = parseInt(e.target.value);
                previewSheetIdx = 0;
                refreshPreview();
            });
        }
        const pagesSelect = document.getElementById('pagesPerBook');
        if (pagesSelect) {
            pagesSelect.addEventListener('change', () => {
                previewSheetIdx = 0;
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
    window.switchMatTab = switchMatTab;
    window.selectWizardAge = selectWizardAge;
    window.selectWizardGoal = selectWizardGoal;
    window.selectWizardPace = selectWizardPace;
    
    window.printSheet = () => {
        const level = LevelLibrary.matematica.find(l => l.id === currentLevelId);
        const totalPages = KumonGen.getTotalPagesRequested ? KumonGen.getTotalPagesRequested() : 2;
        const genOpts = useStagePreset ? { stage: currentStage } : {};
        const makeBatch = (cnt) => (typeof KumonGen.composeWorksheetItems === 'function')
            ? KumonGen.composeWorksheetItems({ subjectKey: 'matematica', level, totalCount: cnt, generatorFn: generateItemsForLevel, genOpts })
            : generateItemsForLevel(level, cnt, genOpts);
        const allItems = (lastGeneratedItems && lastGeneratedItems.length >= totalPages * itemsPerPage)
            ? lastGeneratedItems.slice(0, totalPages * itemsPerPage)
            : makeBatch(totalPages * itemsPerPage);
        KumonGen.printSheet('Matemática', level ? level.title : '', {
            allItems,
            level,
            totalPages,
            linesPerPage: itemsPerPage,
            makeVariationFn: makeBatch
        });
    };

    window.generatePDF = () => {
        const level = LevelLibrary.matematica.find(l => l.id === currentLevelId);
        if (!level) return;

        const pagesEl = document.getElementById('pagesPerBook');
        const totalPages = pagesEl ? parseInt(pagesEl.value) : 2;
        const genOpts = useStagePreset ? { stage: currentStage } : {};
        const makeBatch = (cnt) => (typeof KumonGen.composeWorksheetItems === 'function')
            ? KumonGen.composeWorksheetItems({ subjectKey: 'matematica', level, totalCount: cnt, generatorFn: generateItemsForLevel, genOpts })
            : generateItemsForLevel(level, cnt, genOpts);
        const allItems = (lastGeneratedItems && lastGeneratedItems.length >= totalPages * itemsPerPage)
            ? lastGeneratedItems.slice(0, totalPages * itemsPerPage)
            : makeBatch(totalPages * itemsPerPage);

        KumonGen.generatePDF('a4-sheet', 'Matemática', level.title, totalPages, allItems, level, itemsPerPage, { makeVariationFn: makeBatch });
    };

    window.generateWeeklyPackagePDF = () => {
        const level = LevelLibrary.matematica.find(l => l.id === currentLevelId);
        if (!level) return;

        const totalPages = 10; // 5 dias x 2 páginas por dia
        const genOpts = useStagePreset ? { stage: currentStage } : {};
        const allItems = (typeof KumonGen.composeWorksheetItems === 'function')
            ? KumonGen.composeWorksheetItems({ subjectKey: 'matematica', level, totalCount: totalPages * itemsPerPage, generatorFn: generateItemsForLevel, genOpts })
            : generateItemsForLevel(level, totalPages * itemsPerPage, genOpts);

        KumonGen.generateWeeklyPackagePDF('a4-sheet', 'Matemática', level.title, allItems, level, itemsPerPage);
    };

    window.refreshPreview = refreshPreview;

    // Registra módulo para uso no tablet player (Fase 2)
    window.KumonSubjects = window.KumonSubjects || {};
    window.KumonSubjects.matematica = {
        title: 'Matemática',
        icon: 'fa-calculator',
        color: 'blue',
        levels: LevelLibrary.matematica,
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
