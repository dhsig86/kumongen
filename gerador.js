// gerador.js - Funções comuns para todas as páginas (sem variáveis globais)
const KumonGen = (function() {
    let zoomContainer = null;
    let zoomSpan = null;
    let currentZoom = 0.7;
    let isGeneratingPDF = false;
    let refreshTimer = null;
    let resizeTimer = null;

    // Dicionário canônico de hashes SRI para scripts externos
    const SRI_HASHES = {
        'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js': 'sha512-qZvrmS2ekKPF2mSznTQsxqPgnpkI4DNTlrdUmTzrDgektczlKNRRhy5X5AAOnx5S09ydFYWWNSfcEqDTTHgtNA==',
        'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js': 'sha512-BNaRQnYJYiPSqHHDb58B0yaPfCu+Wgds8Gp/gU33kqBtgNS4tSPHuGibyoeqMV/TJlSKda6FXzoEyYGjTe+vXA=='
    };

    // Lazy-load de scripts externos (html2canvas, jsPDF) com suporte a SRI
    function loadScript(src, integrity = null) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
            const s = document.createElement('script');
            s.src = src;
            const hash = integrity || SRI_HASHES[src];
            if (hash) {
                s.integrity = hash;
                s.crossOrigin = 'anonymous';
            }
            s.onload = resolve;
            s.onerror = () => reject(new Error('Falha ao carregar script protegido: ' + src));
            document.head.appendChild(s);
        });
    }

    // Sanitiza texto para uso seguro em innerHTML
    function sanitizeText(text) {
        if (typeof window !== 'undefined' && typeof window.escapeHtml === 'function') {
            return window.escapeHtml(text);
        }
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    // ===== CONFIGURAÇÃO PEDAGÓGICA KUMON 3.0 =====
    let pedagogicalConfig = {
        workedExample: true,   // Exemplo resolvido na questão 1 (Worked Example Effect)
        sctEnabled: true,      // Tempo alvo sugerido no cabeçalho (Standard Completion Time)
        answerKey: false       // Gerar folha de gabarito no PDF
    };

    function loadPedagogicalConfig() {
        try {
            const storage = window.SafeStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
            if (!storage) return;
            const saved = storage.getItem('kumongen_pedagogical_config');
            if (saved) {
                pedagogicalConfig = { ...pedagogicalConfig, ...JSON.parse(saved) };
            }
        } catch(e) {}
    }

    function savePedagogicalConfig() {
        try {
            const storage = window.SafeStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
            if (!storage) return;
            storage.setItem('kumongen_pedagogical_config', JSON.stringify(pedagogicalConfig));
        } catch(e) {}
    }

    loadPedagogicalConfig();

    // Calcula a resposta correta de um item (para gabarito e worked example)
    function solveItem(item) {
        if (!item) return '';
        switch (item.type) {
            case 'math':
                if (item.operator === '+') return item.operand1 + item.operand2;
                if (item.operator === '-') return item.operand1 - item.operand2;
                if (item.operator === '×' || item.operator === '*') return item.operand1 * item.operand2;
                if (item.operator === '÷' || item.operator === '/') return item.operand2 !== 0 ? Math.floor(item.operand1 / item.operand2) : 0;
                return '';
            case 'fraction':
                return `${item.numerator}/${item.denominator}`;
            case 'rhyme':
                return item.target || item.rhyme || '';
            case 'sentence':
                return item.sentence || (item.parts ? item.parts.join(' ') : '');
            case 'opposite':
                return item.target || item.opposite || '';
            case 'quantity':
                return item.value;
            case 'sequence':
                if (Array.isArray(item.sequence)) {
                    const holes = [];
                    for (let i = 0; i < item.sequence.length; i++) {
                        if (item.sequence[i] === '__') {
                            let val = null;
                            if (i > 0 && typeof item.sequence[i-1] === 'number') {
                                let step = 1;
                                if (i > 1 && typeof item.sequence[i-2] === 'number') {
                                    step = item.sequence[i-1] - item.sequence[i-2];
                                } else if (i < item.sequence.length - 1 && typeof item.sequence[i+1] === 'number') {
                                    step = (item.sequence[i+1] - item.sequence[i-1]) / 2;
                                }
                                val = item.sequence[i-1] + step;
                            } else if (i < item.sequence.length - 1 && typeof item.sequence[i+1] === 'number') {
                                val = item.sequence[i+1] - 1;
                            }
                            holes.push(val !== null ? Math.round(val) : '?');
                        }
                    }
                    return holes.join(', ');
                }
                return '';
            case 'tens':
                return item.number;
            case 'compare':
                if (Array.isArray(item.pair)) {
                    const [a, b] = item.pair;
                    if (a > b) return `${a} > ${b}`;
                    if (a < b) return `${a} < ${b}`;
                    return `${a} = ${b}`;
                }
                return '';
            case 'neighbors':
                return `${item.center - 1} e ${item.center + 1}`;
            case 'trace':
                return item.char;
            case 'syllable':
                return item.syllable;
            case 'word':
                return item.word || (item.parts ? item.parts.join('') : '');
            default:
                return '';
        }
    }

    // Edição inline amigável para pais (WYSIWYG ao clicar na folha)
    // Edição inline visual e moderna para pais (WYSIWYG ao clicar no exercício na folha A4)
    function promptInlineEdit(item, idx, pageNum, level) {
        if (!item) return;

        // Remove modal anterior se aberto
        const oldModal = document.getElementById('kumonInlineEditModal');
        if (oldModal) oldModal.remove();

        const modal = document.createElement('div');
        modal.id = 'kumonInlineEditModal';
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;background:rgba(2,6,23,0.75);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:1rem';

        // Prepara campos conforme tipo do exercício
        let fieldsHtml = '';
        if (item.type === 'math') {
            fieldsHtml = `
                <div class="flex items-center justify-center gap-2.5 my-4">
                    <input type="number" id="editOp1" value="${item.operand1}" class="w-20 text-center text-3xl font-black bg-slate-100 border-2 border-slate-300 rounded-2xl p-2.5 focus:outline-none focus:border-blue-500">
                    <select id="editOperator" class="text-2xl font-black bg-slate-100 border-2 border-slate-300 rounded-2xl p-2.5 focus:outline-none focus:border-blue-500 cursor-pointer">
                        <option value="+" ${item.operator === '+' ? 'selected' : ''}>+</option>
                        <option value="-" ${item.operator === '-' ? 'selected' : ''}>−</option>
                        <option value="×" ${item.operator === '×' || item.operator === '*' ? 'selected' : ''}>×</option>
                        <option value="÷" ${item.operator === '÷' || item.operator === '/' ? 'selected' : ''}>÷</option>
                    </select>
                    <input type="number" id="editOp2" value="${item.operand2}" class="w-20 text-center text-3xl font-black bg-slate-100 border-2 border-slate-300 rounded-2xl p-2.5 focus:outline-none focus:border-blue-500">
                </div>
            `;
        } else if (item.type === 'quantity') {
            fieldsHtml = `
                <div class="flex flex-col items-center my-4">
                    <label class="text-xs font-bold text-slate-500 mb-2">Total de bolinhas para contar:</label>
                    <div class="flex items-center gap-3">
                        <button type="button" id="btnDecQty" class="w-11 h-11 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-black text-2xl active:scale-95 transition-all cursor-pointer">-</button>
                        <input type="number" id="editQuantity" value="${item.value}" min="1" max="30" class="w-24 text-center text-3xl font-black bg-slate-100 border-2 border-slate-300 rounded-2xl p-2 focus:outline-none focus:border-blue-500">
                        <button type="button" id="btnIncQty" class="w-11 h-11 rounded-2xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-black text-2xl active:scale-95 transition-all cursor-pointer">+</button>
                    </div>
                </div>
            `;
        } else if (item.type === 'sequence') {
            fieldsHtml = `
                <div class="flex flex-col my-4">
                    <label class="text-xs font-bold text-slate-500 mb-1.5">Sequência (use '__' onde o aluno deve preencher):</label>
                    <input type="text" id="editSequence" value="${item.sequence.join(' ')}" class="w-full text-center text-xl font-mono font-black bg-slate-100 border-2 border-slate-300 rounded-2xl p-3 focus:outline-none focus:border-blue-500">
                    <span class="text-[11px] text-slate-400 text-center mt-1">Exemplo: 2 4 6 __ 10</span>
                </div>
            `;
        } else if (item.type === 'compare') {
            fieldsHtml = `
                <div class="flex items-center justify-center gap-4 my-4">
                    <input type="number" id="editCompareA" value="${item.pair[0]}" class="w-20 text-center text-3xl font-black bg-slate-100 border-2 border-slate-300 rounded-2xl p-2.5">
                    <span class="text-slate-400 font-bold text-lg">vs</span>
                    <input type="number" id="editCompareB" value="${item.pair[1]}" class="w-20 text-center text-3xl font-black bg-slate-100 border-2 border-slate-300 rounded-2xl p-2.5">
                </div>
            `;
        } else if (item.type === 'neighbors') {
            fieldsHtml = `
                <div class="flex flex-col items-center my-4">
                    <label class="text-xs font-bold text-slate-500 mb-2">Número Central (vizinhos):</label>
                    <input type="number" id="editCenter" value="${item.center}" class="w-24 text-center text-3xl font-black bg-slate-100 border-2 border-slate-300 rounded-2xl p-2.5">
                </div>
            `;
        } else if (item.type === 'word') {
            const curVal = item.parts ? item.parts.join('-') : (item.word || '');
            fieldsHtml = `
                <div class="flex flex-col my-4">
                    <label class="text-xs font-bold text-slate-500 mb-1.5">Palavra (hífen separa sílabas, ex: BO-LA):</label>
                    <input type="text" id="editWord" value="${curVal}" class="w-full text-center text-2xl font-black uppercase bg-slate-100 border-2 border-slate-300 rounded-2xl p-3">
                </div>
            `;
        } else if (item.type === 'trace') {
            fieldsHtml = `
                <div class="flex flex-col items-center my-4">
                    <label class="text-xs font-bold text-slate-500 mb-1.5">Letra do traçado pontilhado:</label>
                    <input type="text" id="editChar" maxlength="1" value="${item.char}" class="w-20 text-center text-4xl font-black uppercase bg-slate-100 border-2 border-slate-300 rounded-2xl p-2">
                </div>
            `;
        } else if (item.type === 'syllable') {
            fieldsHtml = `
                <div class="flex flex-col items-center my-4">
                    <label class="text-xs font-bold text-slate-500 mb-1.5">Sílaba para treino:</label>
                    <input type="text" id="editSyllable" maxlength="4" value="${item.syllable}" class="w-28 text-center text-3xl font-black uppercase bg-slate-100 border-2 border-slate-300 rounded-2xl p-2">
                </div>
            `;
        } else if (item.type === 'fraction') {
            fieldsHtml = `
                <div class="flex flex-col items-center my-4">
                    <label class="text-xs font-bold text-slate-500 mb-2">Fração (Numerador / Denominador):</label>
                    <div class="flex items-center gap-3">
                        <input type="number" id="editFractionNum" min="1" max="10" value="${item.numerator}" class="w-20 text-center text-2xl font-black bg-slate-100 border-2 border-slate-300 rounded-2xl p-2">
                        <span class="text-2xl font-black text-slate-400">/</span>
                        <input type="number" id="editFractionDen" min="2" max="12" value="${item.denominator}" class="w-20 text-center text-2xl font-black bg-slate-100 border-2 border-slate-300 rounded-2xl p-2">
                    </div>
                </div>
            `;
        } else if (item.type === 'rhyme') {
            fieldsHtml = `
                <div class="flex flex-col my-4">
                    <label class="text-xs font-bold text-slate-500 mb-1">Palavra base:</label>
                    <input type="text" id="editRhymeWord" value="${item.word || ''}" class="w-full text-center text-xl font-black uppercase bg-slate-100 border-2 border-slate-300 rounded-xl p-2 mb-2">
                    <label class="text-xs font-bold text-slate-500 mb-1">Rima correta:</label>
                    <input type="text" id="editRhymeTarget" value="${item.target || ''}" class="w-full text-center text-xl font-black uppercase bg-slate-100 border-2 border-slate-300 rounded-xl p-2">
                </div>
            `;
        } else if (item.type === 'sentence') {
            fieldsHtml = `
                <div class="flex flex-col my-4">
                    <label class="text-xs font-bold text-slate-500 mb-1">Frase:</label>
                    <input type="text" id="editSentence" value="${item.sentence || ''}" class="w-full text-center text-base font-bold uppercase bg-slate-100 border-2 border-slate-300 rounded-xl p-3">
                </div>
            `;
        } else if (item.type === 'opposite') {
            fieldsHtml = `
                <div class="flex flex-col my-4">
                    <label class="text-xs font-bold text-slate-500 mb-1">Palavra:</label>
                    <input type="text" id="editOppositeWord" value="${item.word || ''}" class="w-full text-center text-xl font-black uppercase bg-slate-100 border-2 border-slate-300 rounded-xl p-2 mb-2">
                    <label class="text-xs font-bold text-slate-500 mb-1">Oposto correto:</label>
                    <input type="text" id="editOppositeTarget" value="${item.target || ''}" class="w-full text-center text-xl font-black uppercase bg-slate-100 border-2 border-slate-300 rounded-xl p-2">
                </div>
            `;
        } else {
            fieldsHtml = `<div class="text-sm text-slate-500 my-4 text-center">Tipo de exercício: ${item.type}</div>`;
        }

        modal.innerHTML = `
            <div class="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border-4 border-blue-500 text-slate-800">
                <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
                    <div class="flex items-center gap-2.5">
                        <div class="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-base shadow-inner">
                            <i class="fas fa-pen"></i>
                        </div>
                        <div>
                            <h4 class="font-black text-sm text-slate-900">Editar Exercício #${idx + 1}</h4>
                            <span class="text-[10px] text-slate-400 font-bold">Folha · Página ${pageNum}</span>
                        </div>
                    </div>
                    <button id="closeEditModalBtn" class="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                ${fieldsHtml}

                <div class="flex flex-col gap-2 mt-4">
                    <button type="button" id="btnRerollItem" class="w-full py-2.5 bg-amber-50 hover:bg-amber-100 border-2 border-amber-300 text-amber-900 font-black text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 cursor-pointer">
                        <i class="fas fa-dice text-amber-600 text-sm"></i> 🎲 Sortear Nova Questão Deste Nível
                    </button>

                    <div class="grid grid-cols-2 gap-2 mt-1">
                        <button type="button" id="btnCancelEdit" class="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer">
                            Cancelar
                        </button>
                        <button type="button" id="btnSaveEdit" class="py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl transition-colors shadow flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer">
                            <i class="fas fa-check"></i> Salvar
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Stepper para quantidade
        const btnDec = modal.querySelector('#btnDecQty');
        const btnInc = modal.querySelector('#btnIncQty');
        const inputQty = modal.querySelector('#editQuantity');
        if (btnDec && inputQty) {
            btnDec.onclick = () => { inputQty.value = Math.max(1, parseInt(inputQty.value || 1, 10) - 1); };
        }
        if (btnInc && inputQty) {
            btnInc.onclick = () => { inputQty.value = Math.min(30, parseInt(inputQty.value || 1, 10) + 1); };
        }

        // Fechar modal
        const closeBtn = modal.querySelector('#closeEditModalBtn');
        const cancelBtn = modal.querySelector('#btnCancelEdit');
        if (closeBtn) closeBtn.onclick = () => modal.remove();
        if (cancelBtn) cancelBtn.onclick = () => modal.remove();

        // Sortear nova questão
        const rerollBtn = modal.querySelector('#btnRerollItem');
        if (rerollBtn) {
            rerollBtn.onclick = () => {
                let generated = null;
                if (window.KumonSubjects && level) {
                    for (const key of Object.keys(window.KumonSubjects)) {
                        const sub = window.KumonSubjects[key];
                        if (sub && sub.levels && sub.levels.some(l => l.id === level.id)) {
                            const newItems = sub.generate(level, 1);
                            if (newItems && newItems.length) {
                                generated = newItems[0];
                                break;
                            }
                        }
                    }
                }

                if (generated) {
                    Object.assign(item, generated);
                    modal.remove();
                    if (window.refreshPreview) window.refreshPreview();
                    promptInlineEdit(item, idx, pageNum, level);
                } else {
                    alert('Não foi possível sortear automaticamente para este nível.');
                }
            };
        }

        // Salvar alterações
        const saveBtn = modal.querySelector('#btnSaveEdit');
        if (saveBtn) {
            saveBtn.onclick = () => {
                if (item.type === 'math') {
                    const op1 = parseInt(modal.querySelector('#editOp1').value, 10);
                    const op = modal.querySelector('#editOperator').value;
                    const op2 = parseInt(modal.querySelector('#editOp2').value, 10);
                    if (!isNaN(op1) && !isNaN(op2)) {
                        item.operand1 = op1;
                        item.operator = op;
                        item.operand2 = op2;
                    }
                } else if (item.type === 'quantity') {
                    const q = parseInt(modal.querySelector('#editQuantity').value, 10);
                    if (!isNaN(q)) item.value = Math.max(1, Math.min(30, q));
                } else if (item.type === 'sequence') {
                    const s = modal.querySelector('#editSequence').value.trim();
                    if (s) {
                        item.sequence = s.split(/\s+/).map(v => v === '__' ? '__' : (isNaN(Number(v)) ? v : Number(v)));
                    }
                } else if (item.type === 'compare') {
                    const a = parseInt(modal.querySelector('#editCompareA').value, 10);
                    const b = parseInt(modal.querySelector('#editCompareB').value, 10);
                    if (!isNaN(a) && !isNaN(b)) item.pair = [a, b];
                } else if (item.type === 'neighbors') {
                    const c = parseInt(modal.querySelector('#editCenter').value, 10);
                    if (!isNaN(c)) item.center = c;
                } else if (item.type === 'word') {
                    const w = modal.querySelector('#editWord').value.trim().toUpperCase();
                    if (w) {
                        if (w.includes('-')) {
                            item.parts = w.split('-');
                            item.word = item.parts.join('');
                        } else {
                            item.word = w;
                            item.parts = [w];
                        }
                    }
                } else if (item.type === 'trace') {
                    const ch = modal.querySelector('#editChar').value.trim().toUpperCase();
                    if (ch) item.char = ch[0];
                } else if (item.type === 'syllable') {
                    const syl = modal.querySelector('#editSyllable').value.trim().toUpperCase();
                    if (syl) item.syllable = syl;
                } else if (item.type === 'fraction') {
                    const n = parseInt(modal.querySelector('#editFractionNum').value, 10);
                    const d = parseInt(modal.querySelector('#editFractionDen').value, 10);
                    if (!isNaN(n) && !isNaN(d) && d > 0) {
                        item.numerator = Math.min(n, d);
                        item.denominator = d;
                    }
                } else if (item.type === 'rhyme') {
                    const w = modal.querySelector('#editRhymeWord').value.trim().toUpperCase();
                    const t = modal.querySelector('#editRhymeTarget').value.trim().toUpperCase();
                    if (w && t) {
                        item.word = w;
                        item.target = t;
                    }
                } else if (item.type === 'sentence') {
                    const s = modal.querySelector('#editSentence').value.trim().toUpperCase();
                    if (s) {
                        item.sentence = s;
                        item.parts = s.split(' ');
                    }
                } else if (item.type === 'opposite') {
                    const w = modal.querySelector('#editOppositeWord').value.trim().toUpperCase();
                    const t = modal.querySelector('#editOppositeTarget').value.trim().toUpperCase();
                    if (w && t) {
                        item.word = w;
                        item.target = t;
                    }
                }

                modal.remove();
                if (window.refreshPreview) window.refreshPreview();
            };
        }
    }

    // Inicializa referências (deve ser chamado após o carregamento da página)
    function initRefs() {
        zoomContainer = document.getElementById('zoomContainer');
        zoomSpan = document.getElementById('zoomValue');
        adjustPreviewScale();
        renderStudentSelectorWidget();
        renderScoreboardWidget();

        // Abre tutorial automaticamente na primeira visita
        const storage = window.SafeStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
        if (storage && !storage.getItem('kumongen_tutorial_seen')) {
            setTimeout(() => {
                showTutorialModal();
                try { storage.setItem('kumongen_tutorial_seen', 'true'); } catch (e) {}
            }, 500);
        }
    }

    // Ajusta zoom da pré-visualização (telas grandes)
    function adjustZoom(delta) {
        currentZoom = Math.min(1.2, Math.max(0.4, currentZoom + delta));
        if (zoomContainer) {
            zoomContainer.style.transform = `scale(${currentZoom})`;
            zoomContainer.style.transformOrigin = 'top center';
        }
        if (zoomSpan) zoomSpan.innerText = Math.round(currentZoom * 100) + '%';
    }

    // Escala responsiva automática (universal)
    function _doAdjustPreviewScale() {
        const container = document.getElementById('previewContainer');
        const zoomContainer = document.getElementById('zoomContainer');
        const sheet = document.getElementById('a4-sheet');
        if (!container || !zoomContainer || !sheet) return;

        const containerWidth = container.clientWidth;
        const sheetWidth = 1123;

        if (window.innerWidth <= 768) {
            // Em telas pequenas (celular), escala para caber na largura disponível
            const scale = Math.min((containerWidth - 16) / sheetWidth, 1);
            zoomContainer.style.transform = `scale(${scale})`;
            zoomContainer.style.transformOrigin = 'top center';
            if (zoomSpan) zoomSpan.innerText = Math.round(scale * 100) + '%';
        } else {
            // Em telas maiores, usa o zoom atual
            zoomContainer.style.transform = `scale(${currentZoom})`;
            zoomContainer.style.transformOrigin = 'top center';
            if (zoomSpan) zoomSpan.innerText = Math.round(currentZoom * 100) + '%';
        }
    }

    // Wrapper com debounce para evitar reflows excessivos durante resize
    function adjustPreviewScale() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(_doAdjustPreviewScale, 150);
    }

    // Constrói uma página (esquerda ou direita)
    function buildPage(container, level, pageNum, items, options = {}) {
        if (!container) return;
        container.innerHTML = '';

        // Calcula tempo alvo (SCT - Standard Completion Time)
        const totalRows = (items && items.length) ? items.length : 8;
        const minSct = Math.max(2, Math.round(totalRows * 0.4));
        const maxSct = Math.round(totalRows * 0.75);
        const sctText = pedagogicalConfig.sctEnabled
            ? `<span class="text-blue-600 font-bold">META: ${minSct}–${maxSct} min</span> · `
            : '';

        // Cabeçalho
        const activeStudent = window.StudentProfileEngine ? window.StudentProfileEngine.getActive() : null;
        const studentNameDisplay = (activeStudent && activeStudent.name && activeStudent.name !== 'Super Aluno')
            ? sanitizeText(activeStudent.name)
            : '____________________';

        const dayBadge = options.dayLabel
            ? `<span class="ml-2 inline-block bg-amber-100 text-amber-900 border border-amber-300 text-[0.5rem] font-black px-1.5 py-0.5 rounded">${options.dayLabel}</span>`
            : '';

        const header = document.createElement('div');
        header.className = 'page-header';
        header.innerHTML = `
            <div>
                <h3 class="flex items-center flex-wrap">${level?.title || ''}${dayBadge}</h3>
                <p>${level?.instruction || ''}</p>
            </div>
            <div class="text-right">
                <div class="text-[0.55rem] font-bold text-slate-500">${sctText}DATA: ___/___/___ TEMPO: ___ min</div>
                <div class="border border-slate-900 px-2 py-0.5 mt-1 min-w-[120px]">
                    <span class="text-[0.5rem] font-bold">NOME:</span>
                    <span class="ml-2 text-[0.5rem] font-bold">${studentNameDisplay}</span>
                </div>
            </div>
        `;
        container.appendChild(header);

        // Grid de exercícios
        const grid = document.createElement('div');
        grid.className = 'exercise-grid';
        container.appendChild(grid);

        // Rodapé
        const footer = document.createElement('div');
        footer.className = 'page-footer';
        footer.innerHTML = `<span>${options.dayLabel ? options.dayLabel + ' · ' : ''}PÁG ${pageNum}</span>`;
        container.appendChild(footer);

        // Preenche linhas
        items.forEach((item, idx) => {
            const row = document.createElement('div');
            row.className = 'exercise-row';

            const num = document.createElement('span');
            num.className = 'exercise-number';
            num.innerText = (idx + 1);
            row.appendChild(num);

            const content = document.createElement('div');
            content.className = 'exercise-content';

            // Verifica se é o exercício modelo (Worked Example na 1ª questão da 1ª folha)
            const isWorkedExample = (pageNum === 1 && idx === 0 && pedagogicalConfig.workedExample);
            if (isWorkedExample) {
                row.classList.add('exercise-example');
            } else {
                content.classList.add('exercise-editable');
                content.title = 'Clique para editar este item diretamente no caderno';
                content.addEventListener('click', () => promptInlineEdit(item, idx, pageNum, level));
            }

            switch (item.type) {
                case 'quantity':
                    let circles = '';
                    for (let i = 0; i < item.value; i++) circles += '<span class="circle-placeholder"></span>';
                    if (isWorkedExample) {
                        content.innerHTML = `<span class="example-badge">EXEMPLO</span> <span class="text-2xl font-black w-6">${item.value}</span> ${circles} <span class="example-answer">${item.value}</span>`;
                    } else {
                        content.innerHTML = `<span class="text-2xl font-black w-6">${item.value}</span> ${circles} <span class="answer-line"></span>`;
                    }
                    break;
                case 'math':
                    if (isWorkedExample) {
                        const solved = solveItem(item);
                        content.innerHTML = `<span class="example-badge">EXEMPLO</span> <span class="text-base font-light italic">${item.operand1} ${item.operator} ${item.operand2} =</span> <span class="example-answer">${solved}</span>`;
                    } else {
                        content.innerHTML = `<span class="text-base font-light italic">${item.operand1} ${item.operator} ${item.operand2} =</span> <span class="answer-line"></span>`;
                    }
                    break;
                case 'sequence':
                    if (isWorkedExample) {
                        const solvedHole = solveItem(item);
                        const seqEx = item.sequence.map(v => v === '__' ? `<span class="example-answer">${solvedHole}</span>` : v).join(' · ');
                        content.innerHTML = `<span class="example-badge">EXEMPLO</span> <span class="text-sm bg-slate-50 px-1">${seqEx}</span>`;
                    } else {
                        const seq = item.sequence.map(v => v === '__' ? '___' : v).join(' · ');
                        content.innerHTML = `<span class="text-sm bg-slate-50 px-1">${seq}</span> <span class="answer-line"></span>`;
                    }
                    break;
                case 'tens':
                    const numVal = item.number;
                    const tens = Math.floor(numVal / 10);
                    const units = numVal % 10;
                    let blocks = `<span class="text-sm font-bold mr-1">${numVal} =</span>`;
                    for (let i = 0; i < tens; i++) blocks += '<span class="tens-block blue"></span>';
                    if (tens > 0 && units > 0) blocks += '<span class="mx-0.5">+</span>';
                    for (let i = 0; i < units; i++) blocks += '<span class="tens-block yellow"></span>';
                    if (isWorkedExample) {
                        content.innerHTML = `<span class="example-badge">EXEMPLO</span> ${blocks} <span class="example-answer ml-1">${numVal}</span>`;
                    } else {
                        content.innerHTML = blocks + '<span class="answer-line ml-1"></span>';
                    }
                    break;
                case 'compare':
                    if (isWorkedExample) {
                        const solvedCmp = solveItem(item);
                        const symbol = solvedCmp.includes('>') ? '>' : solvedCmp.includes('<') ? '<' : '=';
                        content.innerHTML = `<span class="example-badge">EXEMPLO</span> <span class="text-sm bg-slate-50 px-1">${item.pair[0]} <span class="example-answer font-bold text-blue-600">${symbol}</span> ${item.pair[1]}</span>`;
                    } else {
                        content.innerHTML = `<span class="text-sm bg-slate-50 px-1">${item.pair[0]} _ ${item.pair[1]}</span> <span class="answer-line"></span>`;
                    }
                    break;
                case 'neighbors':
                    if (isWorkedExample) {
                        content.innerHTML = `<span class="example-badge">EXEMPLO</span> <span class="text-sm"><span class="example-answer">${item.center - 1}</span> , ${item.center} , <span class="example-answer">${item.center + 1}</span></span>`;
                    } else {
                        content.innerHTML = `<span class="text-sm">____ , ${item.center} , ____</span> <span class="answer-line"></span>`;
                    }
                    break;
                case 'trace':
                    if (isWorkedExample) {
                        content.innerHTML = `<span class="example-badge">EXEMPLO</span> <span class="text-3xl font-black text-slate-400 border-2 border-dashed border-slate-300 px-1">${item.char}</span> <span class="flex-1 border-b-2 border-dotted border-slate-300 mx-1"></span> <span class="trace-cell flex items-center justify-center font-black text-slate-600 text-sm">${item.char}</span>`;
                    } else {
                        content.innerHTML = `<span class="text-3xl font-black text-slate-300 border-2 border-dashed border-slate-300 px-1">${item.char}</span> <span class="flex-1 border-b-2 border-dotted border-slate-300 mx-1"></span> <span class="trace-cell"></span>`;
                    }
                    break;
                case 'syllable':
                    if (isWorkedExample) {
                        content.innerHTML = `<span class="example-badge">EXEMPLO</span> <span class="text-xl font-bold text-slate-600 border-r pr-1 mr-1">${item.syllable}</span> <span class="example-answer">${item.syllable}</span>`;
                    } else {
                        content.innerHTML = `<span class="text-xl font-bold text-slate-500 border-r pr-1 mr-1">${item.syllable}</span> <span class="answer-line w-6"></span> <span class="answer-line w-6"></span>`;
                    }
                    break;
                case 'word':
                    const partsHtml = item.parts.map(p => `<span class="bg-slate-100 border px-1 text-sm">${p}</span>`).join('<span class="mx-0.5">+</span>');
                    if (isWorkedExample) {
                        const wordAns = item.word || (item.parts ? item.parts.join('') : '');
                        content.innerHTML = `<span class="example-badge">EXEMPLO</span> <div class="flex items-center gap-0.5">${partsHtml}</div> <span class="example-answer ml-2">${wordAns}</span>`;
                    } else {
                        content.innerHTML = `<div class="flex items-center gap-0.5">${partsHtml}</div> <span class="w-16 border-b-4 border-double border-slate-400 ml-2"></span>`;
                    }
                    break;
                case 'fraction':
                    if (isWorkedExample) {
                        content.innerHTML = `<span class="example-badge">EXEMPLO</span> <span class="inline-flex flex-col items-center justify-center font-black text-sm leading-tight border border-slate-300 rounded px-1.5 py-0.5 bg-slate-50"><span class="border-b border-slate-700 w-full text-center">${item.numerator}</span><span>${item.denominator}</span></span> <span class="text-xs text-slate-500 font-medium ml-1">(${item.numerator} de ${item.denominator})</span> <span class="example-answer ml-auto">${item.numerator}/${item.denominator}</span>`;
                    } else {
                        content.innerHTML = `<span class="inline-flex flex-col items-center justify-center font-black text-sm leading-tight border border-slate-300 rounded px-1.5 py-0.5 bg-slate-50"><span class="border-b border-slate-700 w-full text-center">${item.numerator}</span><span>${item.denominator}</span></span> <span class="text-[11px] text-slate-400 ml-1">pinte / represente</span> <span class="answer-line ml-auto w-14"></span>`;
                    }
                    break;
                case 'rhyme':
                    if (isWorkedExample) {
                        content.innerHTML = `<span class="example-badge">EXEMPLO</span> <span class="text-xs text-slate-500">Rima com</span> <span class="font-black text-indigo-700 bg-indigo-50 px-1 border rounded text-xs">${item.word}</span> <span class="text-xs text-slate-400">→</span> <span class="example-answer font-bold text-xs">${item.target}</span>`;
                    } else {
                        const opts = Array.isArray(item.options) ? item.options.join(' · ') : '';
                        content.innerHTML = `<span class="text-xs text-slate-500">Rima com</span> <span class="font-bold text-slate-800 bg-slate-100 px-1 border rounded text-xs">${item.word}</span> <span class="text-[10px] text-slate-400">(${opts})</span> <span class="answer-line ml-auto w-14"></span>`;
                    }
                    break;
                case 'sentence':
                    if (isWorkedExample) {
                        content.innerHTML = `<span class="example-badge">EXEMPLO</span> <span class="text-xs font-black text-slate-700 tracking-wide">${item.sentence}</span> <span class="example-answer ml-auto text-[11px]">${item.sentence}</span>`;
                    } else {
                        content.innerHTML = `<div class="flex flex-col w-full gap-0.5"><span class="text-xs font-bold text-slate-800 tracking-wide">${item.sentence}</span><span class="w-full border-b border-dotted border-slate-300 h-3"></span></div>`;
                    }
                    break;
                case 'opposite':
                    if (isWorkedExample) {
                        content.innerHTML = `<span class="example-badge">EXEMPLO</span> <span class="text-xs text-slate-500">Opposite of</span> <span class="font-black text-purple-700 bg-purple-50 px-1 border rounded text-xs">${item.word}</span> <span class="text-xs text-slate-400">→</span> <span class="example-answer font-bold text-xs">${item.target}</span>`;
                    } else {
                        const opts = Array.isArray(item.options) ? item.options.join(' · ') : '';
                        content.innerHTML = `<span class="text-xs text-slate-500">Opposite:</span> <span class="font-bold text-slate-800 bg-slate-100 px-1 border rounded text-xs">${item.word}</span> <span class="text-[10px] text-slate-400">(${opts})</span> <span class="answer-line ml-auto w-14"></span>`;
                    }
                    break;
                default:
                    content.innerHTML = `<span class="text-slate-300">?</span>`;
            }

            row.appendChild(content);
            grid.appendChild(row);
        });
    }

    // Dica visual de impressão adaptada ao tamanho do caderno
    function showPrintTip(totalPages) {
        const existing = document.getElementById('print-tip-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'print-tip-toast';
        toast.className = 'fixed bottom-5 right-5 z-50 max-w-sm bg-slate-900 border border-slate-700 text-white rounded-2xl p-4 shadow-2xl flex flex-col gap-3 animate-bounce-subtle text-xs md:text-sm';
        
        let tipText = '';
        if (totalPages === 2) {
            tipText = `
                <div class="flex gap-2">
                    <div class="bg-indigo-600/20 text-indigo-400 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm">
                        <i class="fas fa-print"></i>
                    </div>
                    <div>
                        <strong class="text-white block mb-0.5 text-xs uppercase tracking-wider">Dica de Impressão</strong>
                        <p class="text-slate-300 text-[11px] leading-relaxed">Este caderno tem 2 tarefas e cabe em <strong>1 única folha A4</strong> (paisagem). Basta imprimir no modo padrão!</p>
                    </div>
                </div>
            `;
        } else {
            const sheets = totalPages / 2;
            tipText = `
                <div class="flex gap-2">
                    <div class="bg-indigo-600/20 text-indigo-400 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm">
                        <i class="fas fa-copy"></i>
                    </div>
                    <div>
                        <strong class="text-white block mb-0.5 text-xs uppercase tracking-wider">Dica Frente e Verso</strong>
                        <p class="text-slate-300 text-[11px] leading-relaxed">Este caderno usará <strong>${sheets} folhas A4</strong>. Para economizar papel e imprimir frente-e-verso:</p>
                        <ol class="list-decimal pl-4 mt-1.5 space-y-0.5 text-slate-400 text-[10px] leading-normal">
                            <li>Imprima primeiro apenas as <strong>páginas ímpares</strong> (Folha 1, 3, etc.).</li>
                            <li>Recoloque as folhas na bandeja viradas e imprima as <strong>páginas pares</strong> no verso.</li>
                        </ol>
                    </div>
                </div>
            `;
        }

        toast.innerHTML = `
            ${tipText}
            <div class="flex justify-end mt-1 border-t border-slate-800 pt-2">
                <button onclick="document.getElementById('print-tip-toast').remove()" class="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold py-1 px-3 rounded-lg transition-colors">
                    Entendi!
                </button>
            </div>
        `;
        document.body.appendChild(toast);

        // Remove automaticamente após 12 segundos
        setTimeout(() => {
            const el = document.getElementById('print-tip-toast');
            if (el) el.remove();
        }, 12000);
    }

    // GERAÇÃO DE PDF MULTIPÁGINA
    async function generatePDF(elementId = 'a4-sheet', subjectTitle, levelTitle, totalPages = 2, allItems, level, linesPerPage) {
        if (isGeneratingPDF) return;
        isGeneratingPDF = true;

        // Carrega libs sob demanda
        try {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        } catch (loadErr) {
            isGeneratingPDF = false;
            alert('Erro ao carregar bibliotecas. Verifique sua conexão.');
            return;
        }

        const element = document.getElementById(elementId);
        if (!element) { isGeneratingPDF = false; return; }

        // Salva transform original do zoomContainer
        const originalTransform = zoomContainer ? zoomContainer.style.transform : '';
        if (zoomContainer) {
            zoomContainer.style.transform = 'scale(1)';
            zoomContainer.style.transformOrigin = 'top center';
        }

        // Garante que é par
        const numPages = Math.max(2, Math.ceil(totalPages / 2) * 2);
        const numSheets = numPages / 2;

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // Overlay de loading simples
        const loader = document.createElement('div');
        loader.className = 'fixed inset-0 bg-slate-900/80 z-50 flex flex-col items-center justify-center text-white';
        loader.innerHTML = `
            <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mb-4"></div>
            <div class="font-bold text-lg">Gerando PDF do Caderno...</div>
            <div class="text-xs text-slate-400 mt-2" id="pdf-progress">Página 1 de ${numSheets}</div>
        `;
        document.body.appendChild(loader);

        try {
            const pageLeftEl = document.getElementById('pageLeft');
            const pageRightEl = document.getElementById('pageRight');

            for (let sheetIdx = 0; sheetIdx < numSheets; sheetIdx++) {
                document.getElementById('pdf-progress').innerText = `Processando folha ${sheetIdx + 1} de ${numSheets}...`;

                const pageNumLeft = sheetIdx * 2 + 1;
                const pageNumRight = sheetIdx * 2 + 2;

                const leftItems = allItems.slice(sheetIdx * 2 * linesPerPage, (sheetIdx * 2 + 1) * linesPerPage);
                const rightItems = allItems.slice((sheetIdx * 2 + 1) * linesPerPage, (sheetIdx * 2 + 2) * linesPerPage);

                // Renderiza no DOM temporariamente para tirar a foto
                buildPage(pageLeftEl, level, pageNumLeft, leftItems);
                buildPage(pageRightEl, level, pageNumRight, rightItems);

                // Pequena pausa para garantir renderização do DOM
                await new Promise(resolve => setTimeout(resolve, 200));

                const pdfScale = window.innerWidth <= 768 ? 2 : 3; // scale 2 no mobile (menos memória), 3 no desktop (máxima nitidez)
                const canvas = await html2canvas(element, {
                    scale: pdfScale,
                    backgroundColor: '#ffffff',
                    logging: false,
                    allowTaint: false,
                    useCORS: true,
                    windowWidth: 1123,
                    windowHeight: 794,
                    onclone: (clonedDoc) => {
                        const sheet = clonedDoc.getElementById(elementId);
                        if (sheet) sheet.style.boxShadow = 'none';
                    }
                });

                const imgData = canvas.toDataURL('image/png');
                if (sheetIdx > 0) {
                    pdf.addPage();
                }
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            }

            // Se o gabarito estiver ativado, anexa folha de respostas ao final do PDF
            if (pedagogicalConfig.answerKey) {
                document.getElementById('pdf-progress').innerText = 'Gerando folha de gabarito para os pais...';

                const akSheet = document.createElement('div');
                akSheet.id = 'temp-answer-key-sheet';
                akSheet.className = 'answer-key-sheet';
                akSheet.style.position = 'fixed';
                akSheet.style.left = '-9999px';
                akSheet.style.top = '0';
                akSheet.style.width = '1123px';
                akSheet.style.height = '794px';
                akSheet.style.background = '#ffffff';
                akSheet.style.boxSizing = 'border-box';
                akSheet.style.padding = '32px';

                let cardsHtml = '';
                const cols = Math.min(4, Math.max(2, numPages));
                for (let p = 0; p < numPages; p++) {
                    const pageItems = allItems.slice(p * linesPerPage, (p + 1) * linesPerPage);
                    let itemsListHtml = '';
                    pageItems.forEach((it, idx) => {
                        const ans = solveItem(it);
                        itemsListHtml += `
                            <div style="display:flex; justify-content:space-between; border-bottom:1px dotted #e2e8f0; padding:2px 0; font-size:11px;">
                                <span style="font-weight:bold; color:#64748b;">${idx + 1}.</span>
                                <span style="font-weight:900; color:#0f172a;">${sanitizeText(ans)}</span>
                            </div>
                        `;
                    });
                    cardsHtml += `
                        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px; display:flex; flex-direction:column;">
                            <div style="font-weight:900; font-size:12px; color:#2563eb; border-bottom:1px solid #cbd5e1; padding-bottom:4px; margin-bottom:6px;">
                                PÁGINA ${p + 1}
                            </div>
                            <div style="display:flex; flex-direction:column; gap:2px;">${itemsListHtml}</div>
                        </div>
                    `;
                }

                akSheet.innerHTML = `
                    <div style="border-bottom:2px solid #0f172a; padding-bottom:8px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h2 style="font-size:18px; font-weight:900; text-transform:uppercase; color:#0f172a; margin:0;">
                                GABARITO DE RESPOSTAS · ${sanitizeText(subjectTitle.toUpperCase())}
                            </h2>
                            <p style="font-size:11px; color:#64748b; margin:2px 0 0 0; font-weight:600;">
                                Nível: ${sanitizeText(levelTitle)} · Conferência rápida para os pais (1 minuto)
                            </p>
                        </div>
                        <div style="text-align:right; font-size:11px; color:#64748b;">
                            <strong>${numPages} PÁGINAS</strong> | DATA: ___/___/___
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(${cols}, 1fr); gap:14px; flex:1;">
                        ${cardsHtml}
                    </div>
                `;

                document.body.appendChild(akSheet);
                await new Promise(res => setTimeout(res, 200));

                const pdfScale = window.innerWidth <= 768 ? 2 : 3;
                const akCanvas = await html2canvas(akSheet, {
                    scale: pdfScale,
                    backgroundColor: '#ffffff',
                    logging: false,
                    useCORS: true,
                    windowWidth: 1123,
                    windowHeight: 794
                });

                pdf.addPage();
                const akImgData = akCanvas.toDataURL('image/png');
                pdf.addImage(akImgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
                document.body.removeChild(akSheet);
            }

            pdf.save(`kumon_${subjectTitle.toLowerCase()}_${new Date().toISOString().slice(0,10)}.pdf`);

            // Toast de sucesso
            const successToast = document.createElement('div');
            successToast.id = 'pdf-success-toast';
            successToast.className = 'fixed bottom-5 right-5 z-50 max-w-sm bg-emerald-700 border border-emerald-500 text-white rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-bounce-subtle text-xs md:text-sm';
            successToast.innerHTML = `
                <div class="bg-emerald-500/30 text-emerald-200 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm">
                    <i class="fas fa-check-circle"></i>
                </div>
                <span class="font-bold">PDF salvo com sucesso! Agora é só imprimir 🖨️</span>
            `;
            document.body.appendChild(successToast);
            setTimeout(() => {
                const el = document.getElementById('pdf-success-toast');
                if (el) el.remove();
            }, 4000);

            // Salva no histórico local
            saveHistory(subjectTitle, levelTitle, numPages);

            // Exibe dica amigável de impressão
            showPrintTip(numPages);

        } catch (error) {
            console.error(error);
            alert('Erro ao gerar PDF: ' + error.message);
        } finally {
            isGeneratingPDF = false;
            document.body.removeChild(loader);
            if (zoomContainer) zoomContainer.style.transform = originalTransform;
            
            // Restaura preview original de volta para as páginas 1 e 2
            if (window.refreshPreview) {
                window.refreshPreview();
            }
        }
    }

    // GERAÇÃO DE PACOTE SEMANAL COMPLETO (5 DIAS = 10 PÁGINAS EM 1 CLIQUE)
    async function generateWeeklyPackagePDF(elementId = 'a4-sheet', subjectTitle, levelTitle, allItems, level, linesPerPage) {
        if (isGeneratingPDF) return;
        isGeneratingPDF = true;

        try {
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        } catch (loadErr) {
            isGeneratingPDF = false;
            alert('Erro ao carregar bibliotecas. Verifique sua conexão.');
            return;
        }

        const element = document.getElementById(elementId);
        if (!element) { isGeneratingPDF = false; return; }

        const originalTransform = zoomContainer ? zoomContainer.style.transform : '';
        if (zoomContainer) {
            zoomContainer.style.transform = 'scale(1)';
            zoomContainer.style.transformOrigin = 'top center';
        }

        const numSheets = 5; // 5 dias (Segunda a Sexta)
        const numPages = 10; // 2 páginas por dia
        const dayNames = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const loader = document.createElement('div');
        loader.className = 'fixed inset-0 bg-slate-900/80 z-50 flex flex-col items-center justify-center text-white';
        loader.innerHTML = `
            <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-amber-500 mb-4"></div>
            <div class="font-bold text-lg">Gerando Pacote Semanal Kumon (5 Dias)...</div>
            <div class="text-xs text-slate-400 mt-2" id="pdf-weekly-progress">Processando Dia 1 de 5...</div>
        `;
        document.body.appendChild(loader);

        try {
            const pageLeftEl = document.getElementById('pageLeft');
            const pageRightEl = document.getElementById('pageRight');

            for (let sheetIdx = 0; sheetIdx < numSheets; sheetIdx++) {
                const dayNum = sheetIdx + 1;
                const dayLabel = `Dia ${dayNum} de 5 (${dayNames[sheetIdx]})`;
                const progressEl = document.getElementById('pdf-weekly-progress');
                if (progressEl) progressEl.innerText = `Processando ${dayLabel}...`;

                const pageNumLeft = sheetIdx * 2 + 1;
                const pageNumRight = sheetIdx * 2 + 2;

                const leftItems = allItems.slice(sheetIdx * 2 * linesPerPage, (sheetIdx * 2 + 1) * linesPerPage);
                const rightItems = allItems.slice((sheetIdx * 2 + 1) * linesPerPage, (sheetIdx * 2 + 2) * linesPerPage);

                buildPage(pageLeftEl, level, pageNumLeft, leftItems, { dayLabel });
                buildPage(pageRightEl, level, pageNumRight, rightItems, { dayLabel });

                await new Promise(resolve => setTimeout(resolve, 200));

                const pdfScale = window.innerWidth <= 768 ? 2 : 3;
                const canvas = await html2canvas(element, {
                    scale: pdfScale,
                    backgroundColor: '#ffffff',
                    logging: false,
                    allowTaint: false,
                    useCORS: true,
                    windowWidth: 1123,
                    windowHeight: 794,
                    onclone: (clonedDoc) => {
                        const sheet = clonedDoc.getElementById(elementId);
                        if (sheet) sheet.style.boxShadow = 'none';
                    }
                });

                const imgData = canvas.toDataURL('image/png');
                if (sheetIdx > 0) {
                    pdf.addPage();
                }
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            }

            // Gabarito Semanal consolidado de 5 dias
            if (pedagogicalConfig.answerKey) {
                const progressEl = document.getElementById('pdf-weekly-progress');
                if (progressEl) progressEl.innerText = 'Gerando folha de gabarito semanal para os pais...';

                const akSheet = document.createElement('div');
                akSheet.id = 'temp-answer-key-sheet';
                akSheet.className = 'answer-key-sheet';
                akSheet.style.position = 'fixed';
                akSheet.style.left = '-9999px';
                akSheet.style.top = '0';
                akSheet.style.width = '1123px';
                akSheet.style.height = '794px';
                akSheet.style.background = '#ffffff';
                akSheet.style.boxSizing = 'border-box';
                akSheet.style.padding = '26px';

                let cardsHtml = '';
                for (let d = 0; d < 5; d++) {
                    const dayNum = d + 1;
                    const dayName = dayNames[d];
                    const pLeft = d * 2;
                    const pRight = d * 2 + 1;

                    const leftItems = allItems.slice(pLeft * linesPerPage, (pLeft + 1) * linesPerPage);
                    const rightItems = allItems.slice(pRight * linesPerPage, (pRight + 1) * linesPerPage);

                    let leftListHtml = '';
                    leftItems.forEach((it, idx) => {
                        leftListHtml += `<div style="display:flex;justify-content:space-between;padding:1px 0;font-size:9.5px;"><span style="color:#64748b;">${idx + 1}.</span> <span style="font-weight:900;color:#0f172a;">${sanitizeText(solveItem(it))}</span></div>`;
                    });

                    let rightListHtml = '';
                    rightItems.forEach((it, idx) => {
                        rightListHtml += `<div style="display:flex;justify-content:space-between;padding:1px 0;font-size:9.5px;"><span style="color:#64748b;">${idx + 1}.</span> <span style="font-weight:900;color:#0f172a;">${sanitizeText(solveItem(it))}</span></div>`;
                    });

                    cardsHtml += `
                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:8px;display:flex;flex-direction:column;">
                            <div style="font-weight:900;font-size:11px;color:#d97706;border-bottom:1px solid #cbd5e1;padding-bottom:3px;margin-bottom:4px;text-transform:uppercase;">
                                DIA ${dayNum} · ${dayName.slice(0, 3).toUpperCase()}
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                                <div><div style="font-size:8px;font-weight:bold;color:#94a3b8;margin-bottom:2px;">PÁG ${pLeft + 1}</div>${leftListHtml}</div>
                                <div><div style="font-size:8px;font-weight:bold;color:#94a3b8;margin-bottom:2px;">PÁG ${pRight + 1}</div>${rightListHtml}</div>
                            </div>
                        </div>
                    `;
                }

                akSheet.innerHTML = `
                    <div style="border-bottom:2px solid #0f172a;padding-bottom:6px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
                        <div>
                            <h2 style="font-size:16px;font-weight:900;text-transform:uppercase;color:#0f172a;margin:0;">
                                GABARITO SEMANAL OFICIAL (5 DIAS) · ${sanitizeText(subjectTitle.toUpperCase())}
                            </h2>
                            <p style="font-size:10px;color:#64748b;margin:2px 0 0 0;font-weight:600;">
                                Nível: ${sanitizeText(levelTitle)} · Conferência diária dos pais (menos de 1 minuto por dia)
                            </p>
                        </div>
                        <div style="text-align:right;font-size:10px;color:#64748b;">
                            <strong>5 DIAS · 10 PÁGINAS</strong> | DATA: ___/___/___
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:8px;flex:1;">
                        ${cardsHtml}
                    </div>
                `;

                document.body.appendChild(akSheet);
                await new Promise(resolve => setTimeout(resolve, 300));

                const akCanvas = await html2canvas(akSheet, {
                    scale: window.innerWidth <= 768 ? 2 : 3,
                    backgroundColor: '#ffffff',
                    logging: false,
                    allowTaint: false,
                    useCORS: true,
                    windowWidth: 1123,
                    windowHeight: 794
                });

                document.body.removeChild(akSheet);
                pdf.addPage();
                pdf.addImage(akCanvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            }

            const cleanSubject = (subjectTitle || 'Kumon').replace(/[^a-zA-Z0-9]/g, '_');
            const cleanLevel = (levelTitle || 'Nivel').replace(/[^a-zA-Z0-9]/g, '_');
            pdf.save(`Semana_Kumon_${cleanSubject}_${cleanLevel}_5Dias.pdf`);

            // Toast de sucesso
            const successToast = document.createElement('div');
            successToast.id = 'pdf-weekly-toast';
            successToast.className = 'fixed bottom-5 right-5 z-50 max-w-sm bg-amber-600 border border-amber-400 text-white rounded-2xl p-4 shadow-2xl flex items-center gap-3 animate-bounce-subtle text-xs md:text-sm';
            successToast.innerHTML = `
                <div class="bg-amber-400/30 text-amber-100 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm">
                    <i class="fas fa-calendar-check"></i>
                </div>
                <span class="font-bold">Pacote Semanal pronto! 5 dias de estudo em 1 único arquivo 📅</span>
            `;
            document.body.appendChild(successToast);
            setTimeout(() => {
                const el = document.getElementById('pdf-weekly-toast');
                if (el) el.remove();
            }, 4500);

            // Salva no histórico
            saveHistory(subjectTitle, `${levelTitle} · Semana Completa`, '5 Dias (10 pág)');
            showPrintTip(10);
        } catch (err) {
            console.error('Erro ao gerar Pacote Semanal em PDF:', err);
            alert('Ocorreu um erro ao gerar o Pacote Semanal em PDF: ' + err.message);
        } finally {
            isGeneratingPDF = false;
            if (loader && loader.parentNode) loader.parentNode.removeChild(loader);
            if (zoomContainer) zoomContainer.style.transform = originalTransform;
            if (window.refreshPreview) window.refreshPreview();
        }
    }

    // ---------- SISTEMA DE LOCAL STORAGE, SCOREBOARD E HISTÓRICO ----------
    function saveHistory(subject, levelTitle, pages, completed = false) {
        const storage = window.SafeStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
        let history;
        try { history = JSON.parse((storage ? storage.getItem('kumongen_history') : null) || '[]'); }
        catch (e) { history = []; }
        const entry = {
            id: Date.now().toString(),
            date: new Date().toLocaleDateString('pt-BR'),
            subject: subject,
            levelTitle: levelTitle,
            pages: pages,
            completed: !!completed
        };
        history.unshift(entry);
        if (storage) {
            try { storage.setItem('kumongen_history', JSON.stringify(history.slice(0, 30))); } catch (e) {}
        }

        if (window.StudentProfileEngine) {
            window.StudentProfileEngine.addActiveHistoryItem(entry);
        }

        // Atualiza widgets
        renderStudentSelectorWidget();
        renderScoreboardWidget();
        window.dispatchEvent(new Event('storage'));
        return entry;
    }

    function getHistory() {
        if (window.StudentProfileEngine) {
            const act = window.StudentProfileEngine.getActive();
            if (act && Array.isArray(act.history)) return act.history;
        }
        const storage = window.SafeStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
        try { return JSON.parse((storage ? storage.getItem('kumongen_history') : null) || '[]'); }
        catch (e) { return []; }
    }

    function toggleTaskCompletion(id) {
        let history;
        if (window.StudentProfileEngine) {
            const act = window.StudentProfileEngine.getActive();
            history = (act && Array.isArray(act.history)) ? act.history : [];
        } else {
            const storage = window.SafeStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
            try { history = JSON.parse((storage ? storage.getItem('kumongen_history') : null) || '[]'); }
            catch (e) { history = []; }
        }

        const task = history.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            const storage = window.SafeStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
            if (storage) {
                try { storage.setItem('kumongen_history', JSON.stringify(history)); } catch (e) {}
            }
            if (window.StudentProfileEngine) {
                const act = window.StudentProfileEngine.getActive();
                if (act) {
                    act.history = history;
                    window.StudentProfileEngine.update(act.id, { history });
                }
            }
            renderScoreboardWidget();
            window.dispatchEvent(new Event('storage'));
            return task.completed;
        }
        return false;
    }

    function getScore() {
        const history = getHistory();
        const createdCount = history.length;
        const completedCount = history.filter(t => t.completed).length;

        // Unifica com estrelas e pontos conquistados no Modo Tablet
        let tabletStars = 0;
        if (window.StudentProfileEngine) {
            const act = window.StudentProfileEngine.getActive();
            if (act && act.gamification) {
                tabletStars = act.gamification.stars || 0;
            }
        } else {
            const storage = window.SafeStorage || (typeof localStorage !== 'undefined' ? localStorage : null);
            try {
                const tabData = JSON.parse((storage ? storage.getItem('kumongen_gamification_v3') : null) || '{}');
                tabletStars = tabData.stars || 0;
            } catch (e) {}
        }

        // Cada tarefa gerada = 10 pts. Concluída = +50 pts adicionais e +1 estrela
        // Cada estrela conquistada no tablet = +10 pts
        const points = (createdCount * 10) + (completedCount * 50) + (tabletStars * 10);
        const stars = completedCount + tabletStars;

        return {
            points,
            stars,
            tabletStars,
            completions: completedCount,
            total: createdCount
        };
    }

    function onStudentSelected() {
        renderStudentSelectorWidget();
        renderScoreboardWidget();
        if (window.refreshPreview) window.refreshPreview();

        // Auto-ativa a faixa etária do aluno no Wizard
        const active = window.StudentProfileEngine ? window.StudentProfileEngine.getActive() : null;
        if (active && active.ageTier) {
            if (typeof window.selectWizardAge === 'function') {
                const btn = document.querySelector(`.wizard-age-btn[onclick*="'${active.ageTier}'"]`);
                window.selectWizardAge(active.ageTier, btn);
            } else if (typeof window.selectPorWizardAge === 'function') {
                const btn = document.querySelector(`.wizard-age-btn[onclick*="'${active.ageTier}'"]`);
                window.selectPorWizardAge(active.ageTier, btn);
            } else if (typeof window.selectEngWizardAge === 'function') {
                const btn = document.querySelector(`.wizard-age-btn[onclick*="'${active.ageTier}'"]`);
                window.selectEngWizardAge(active.ageTier, btn);
            }
        }
    }

    function renderStudentSelectorWidget() {
        const container = document.getElementById('studentSelectorWidget');
        if (!container || !window.StudentProfileEngine) return;

        const active = window.StudentProfileEngine.getActive();
        if (!active) return;

        const mascotInfo = window.StudentProfileEngine.MASCOTS[active.mascot] || window.StudentProfileEngine.MASCOTS.jaguar;
        const ageInfo = window.StudentProfileEngine.AGE_TIERS[active.ageTier] || window.StudentProfileEngine.AGE_TIERS.age_6_7;

        container.innerHTML = `
            <div class="flex items-center gap-1.5 mb-2">
                <button type="button" onclick="window.StudentProfileEngine.showProfileModal({ onSelect: () => window.KumonGen.onStudentSelected() })" class="flex-1 min-w-0 flex items-center justify-between bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-2 text-slate-800 transition-all font-bold text-xs shadow-sm hover:shadow group cursor-pointer" title="Trocar ou selecionar perfil de aluno">
                    <div class="flex items-center gap-2 min-w-0">
                        <div class="w-7 h-7 rounded-full p-0.5 bg-gradient-to-tr ${mascotInfo.ring} shadow flex-shrink-0">
                            <img src="${mascotInfo.avatar}" alt="${mascotInfo.name}" class="w-full h-full rounded-full object-cover">
                        </div>
                        <div class="text-left min-w-0">
                            <div class="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">Aluno Ativo</div>
                            <div class="font-black text-xs text-slate-900 truncate leading-tight">${sanitizeText(active.name)} <span class="text-[10px] font-normal text-slate-500">(${ageInfo.label})</span></div>
                        </div>
                    </div>
                    <div class="text-slate-400 group-hover:text-slate-600 flex items-center gap-1 text-[10px] font-bold flex-shrink-0 ml-1">
                        <span>Trocar</span>
                        <i class="fas fa-chevron-right text-[8px]"></i>
                    </div>
                </button>
                <button type="button" onclick="window.StudentProfileEngine.showProfileModal({ initialView: 'form', onSelect: () => window.KumonGen.onStudentSelected() })" class="px-2.5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs shadow-sm hover:shadow flex items-center gap-1 cursor-pointer flex-shrink-0 transition-all active:scale-95" title="Cadastrar nova criança / outro perfil">
                    <i class="fas fa-user-plus text-xs"></i>
                    <span class="hidden xl:inline text-[11px]">+ Novo</span>
                </button>
            </div>
        `;
    }

    function renderScoreboardWidget() {
        const container = document.getElementById('scoreboardWidget');
        if (!container) return;

        const score = getScore();

        container.innerHTML = `
            <button onclick="KumonGen_showParentalControlModal()" class="w-full flex items-center justify-between bg-gradient-to-r from-yellow-50 to-orange-50 hover:from-yellow-100 hover:to-orange-100 border border-yellow-200 rounded-xl p-2.5 text-slate-700 transition-all font-bold text-xs shadow-sm hover:shadow">
                <span class="flex items-center gap-1.5 text-amber-800">
                    <i class="fas fa-chart-line text-[10px]"></i> Controle dos Pais / Progresso
                </span>
                <span class="text-[9px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    <i class="fas fa-star text-[8px]"></i> ${sanitizeText(score.stars)}
                </span>
            </button>
        `;
    }

    // Modal de Controle Parental e Estatísticas detalhadas de progresso
    function showParentalControlModal() {
        const existing = document.getElementById('parental-modal');
        if (existing) existing.remove();

        const score = getScore();
        const history = getHistory();

        let historyHtml = '';
        if (history.length === 0) {
            historyHtml = `
                <div class="text-center py-8 text-slate-400 text-xs">
                    <i class="fas fa-folder-open text-3xl mb-2 block opacity-30"></i>
                    Nenhum caderno gerado ainda.
                </div>
            `;
        } else {
            history.forEach(task => {
                const checkedClass = task.completed 
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                    : 'bg-slate-100 border-slate-300 text-slate-400 hover:border-emerald-500 hover:text-emerald-400';
                
                const checkIcon = task.completed ? 'fa-check' : 'fa-plus';
                const decoration = task.completed ? 'line-through text-slate-400 font-normal' : 'text-slate-700 font-bold';
                const isTablet = task.pages && String(task.pages).includes('exer');
                const badgeColor = isTablet
                    ? 'bg-purple-100 text-purple-700'
                    : (task.subject && task.subject.includes('Matemática') 
                        ? 'bg-blue-50 text-blue-600' 
                        : (task.subject && task.subject.includes('Português')) ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600');
                
                historyHtml += `
                    <div class="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 text-xs mb-2">
                        <div class="truncate mr-2 text-left flex-1 min-w-0">
                            <div class="flex items-center gap-1.5 mb-0.5">
                                <span class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${badgeColor}">${isTablet ? '📱 ' : ''}${sanitizeText(task.subject)}</span>
                                <span class="${decoration} text-xs truncate block">${sanitizeText(task.levelTitle)}</span>
                            </div>
                            <span class="text-[10px] text-slate-400 block">${sanitizeText(task.date)} · ${isTablet ? 'Treino Tablet' : sanitizeText(task.pages) + ' pág.'}</span>
                        </div>
                        <button onclick="KumonGen_toggleTaskCompletionParental('${task.id}')" class="w-8 h-8 border-2 rounded-lg flex items-center justify-center transition-all ${checkedClass}">
                            <i class="fas ${checkIcon} text-[10px]"></i>
                        </button>
                    </div>
                `;
            });
        }

        // Estatística simples de controle parental (o que já foi treinado)
        const subjectsCount = {};
        history.forEach(h => {
            subjectsCount[h.subject] = (subjectsCount[h.subject] || 0) + 1;
        });
        const statsHtml = Object.entries(subjectsCount).map(([sub, count]) => {
            const pct = Math.round((count / history.length) * 100);
            const barColor = sub === 'Matemática' ? 'bg-blue-500' : sub === 'Português' ? 'bg-green-500' : 'bg-red-500';
            return `
                <div class="mb-3">
                    <div class="flex justify-between text-[11px] font-bold text-slate-600 mb-1">
                        <span>${sanitizeText(sub)}</span>
                        <span>${sanitizeText(count)} cadernos (${sanitizeText(pct)}%)</span>
                    </div>
                    <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div class="${barColor} h-full rounded-full transition-all" style="width: ${pct}%"></div>
                    </div>
                </div>
            `;
        }).join('') || '<p class="text-xs text-slate-400 italic">Gere cadernos para ver estatísticas de estudo.</p>';

        const modal = document.createElement('div');
        modal.id = 'parental-modal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', 'Controle Parental');
        modal.setAttribute('tabindex', '-1');
        modal.innerHTML = `
            <div class="bg-white rounded-3xl max-w-md w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col text-slate-800 transition-all transform scale-100">
                <!-- Header -->
                <div class="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-yellow-50 to-orange-50 rounded-t-3xl">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-chart-pie text-amber-600 text-xl"></i>
                        <h2 class="text-sm font-black text-slate-900 uppercase tracking-wider">Controle dos Pais & Progresso</h2>
                    </div>
                    <button onclick="document.getElementById('parental-modal').remove()" class="text-slate-400 hover:text-slate-600 transition-colors">
                        <i class="fas fa-times text-lg"></i>
                    </button>
                </div>
                <!-- Body -->
                <div class="p-5 space-y-5">
                    <!-- Resumo Geral -->
                    <div class="grid grid-cols-3 gap-3 text-center">
                        <div class="bg-slate-50 rounded-2xl p-2 border border-slate-100">
                            <div class="text-[9px] text-slate-400 uppercase font-black">Pontos</div>
                            <div class="text-base font-black text-slate-700">${sanitizeText(score.points)}</div>
                        </div>
                        <div class="bg-slate-50 rounded-2xl p-2 border border-slate-100">
                            <div class="text-[9px] text-slate-400 uppercase font-black">Estrelas</div>
                            <div class="text-base font-black text-amber-500 flex items-center justify-center gap-0.5"><i class="fas fa-star text-xs"></i> ${sanitizeText(score.stars)}</div>
                        </div>
                        <div class="bg-slate-50 rounded-2xl p-2 border border-slate-100">
                            <div class="text-[9px] text-slate-400 uppercase font-black">Cadernos</div>
                            <div class="text-base font-black text-emerald-600">${sanitizeText(score.completions)}/${sanitizeText(score.total)}</div>
                        </div>
                    </div>

                    <!-- Frequência de Estudos -->
                    <div class="border-t border-slate-100 pt-4">
                        <h4 class="text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5">Matérias mais Treinadas</h4>
                        ${statsHtml}
                    </div>

                    <!-- Histórico de Exercícios -->
                    <div class="border-t border-slate-100 pt-4">
                        <div class="flex items-center justify-between mb-3">
                            <h4 class="text-xs font-black text-slate-400 uppercase tracking-wider">Histórico de Atividades</h4>
                            <span class="text-[10px] text-slate-400">Marque o que a criança concluiu</span>
                        </div>
                        <div class="max-h-52 overflow-y-auto pr-1">
                            ${historyHtml}
                        </div>
                    </div>
                </div>
                <!-- Footer -->
                <div class="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-3xl">
                    <div class="flex items-center gap-3 text-[11px] font-bold text-slate-500">
                        <button type="button" onclick="if(window.StudentProfileEngine) window.StudentProfileEngine.exportBackup()" class="hover:text-amber-700 flex items-center gap-1 cursor-pointer">
                            <i class="fas fa-download text-amber-500"></i> Backup
                        </button>
                        <button type="button" onclick="document.getElementById('parental-modal').remove(); if(window.StudentProfileEngine) window.StudentProfileEngine.showProfileModal({ onSelect: () => window.KumonGen.onStudentSelected() });" class="hover:text-blue-700 flex items-center gap-1 cursor-pointer">
                            <i class="fas fa-users text-blue-500"></i> Perfis
                        </button>
                        <button type="button" onclick="document.getElementById('parental-modal').remove(); if(window.StudentProfileEngine) window.StudentProfileEngine.showProfileModal({ initialView: 'form', onSelect: () => window.KumonGen.onStudentSelected() });" class="hover:text-emerald-700 font-bold flex items-center gap-1 cursor-pointer" title="Cadastrar nova criança">
                            <i class="fas fa-user-plus text-emerald-500"></i> + Novo Aluno
                        </button>
                    </div>
                    <button onclick="document.getElementById('parental-modal').remove()" class="bg-slate-800 hover:bg-slate-900 text-white font-bold py-2 px-5 rounded-xl transition-all text-xs cursor-pointer">
                        Fechar Painel
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // ESC para fechar
        const escHandler = (e) => { if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', escHandler); } };
        document.addEventListener('keydown', escHandler);

        // Cleanup do ESC handler nos botões de fechar existentes
        modal.querySelectorAll('button').forEach(btn => {
            const originalOnclick = btn.getAttribute('onclick');
            if (originalOnclick && originalOnclick.includes('remove')) {
                btn.removeAttribute('onclick');
                btn.addEventListener('click', () => { modal.remove(); document.removeEventListener('keydown', escHandler); });
            }
        });

        // Focus trap: move foco para dentro do modal
        modal.focus();
    }

    // Função de trigger de conclusão que redesenha o modal de controle parental
    window.KumonGen_toggleTaskCompletionParental = (id) => {
        toggleTaskCompletion(id);
        showParentalControlModal();
    };

    window.KumonGen_showParentalControlModal = showParentalControlModal;

    // Modal de tutorial interativo integrado na interface
    function showTutorialModal() {
        const existing = document.getElementById('tutorial-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'tutorial-modal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', 'Tutorial');
        modal.setAttribute('tabindex', '-1');
        modal.innerHTML = `
            <div class="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col text-slate-800 transition-all transform scale-100">
                <!-- Header -->
                <div class="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-3xl">
                    <div class="flex items-center gap-2">
                        <i class="fas fa-graduation-cap text-blue-600 text-2xl animate-bounce-subtle"></i>
                        <h2 class="text-sm font-black text-slate-900 uppercase tracking-wider">Tutorial KumonGen</h2>
                    </div>
                    <button onclick="document.getElementById('tutorial-modal').remove()" class="text-slate-400 hover:text-slate-600 transition-colors">
                        <i class="fas fa-times text-lg"></i>
                    </button>
                </div>
                <!-- Body -->
                <div class="p-6 space-y-4 text-xs md:text-sm">
                    <p class="text-slate-600 leading-relaxed">
                        Bem-vindo ao <strong>KumonGen</strong>! Este gerador auxilia na criação de materiais impressos estruturados para o aprendizado das crianças.
                    </p>
                    
                    <div class="space-y-3">
                        <div class="flex gap-3 text-left">
                            <div class="w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center flex-shrink-0">1</div>
                            <p class="text-slate-700 flex-1"><strong>Escolha o Nível</strong>: Na barra lateral esquerda, selecione o nível desejado (ex: quantidade, adição simples, traçado de alfabeto ou formação de palavras).</p>
                        </div>
                        <div class="flex gap-3 text-left">
                            <div class="w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center flex-shrink-0">2</div>
                            <p class="text-slate-700 flex-1"><strong>Ajuste os Parâmetros</strong>: Altere os valores de repetições, operadores, intervalos ou adicione novas palavras na lista para personalizar os exercícios.</p>
                        </div>
                        <div class="flex gap-3 text-left">
                            <div class="w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center flex-shrink-0">3</div>
                            <p class="text-slate-700 flex-1"><strong>Folhas e Zoom</strong>: Defina a quantidade de páginas do caderno (2, 4, 6 ou 8 páginas) e quantas linhas por folha. O preview A4 se atualiza e se ajusta automaticamente para celulares e tablets.</p>
                        </div>
                        <div class="flex gap-3 text-left">
                            <div class="w-6 h-6 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center flex-shrink-0">4</div>
                            <p class="text-slate-700 flex-1"><strong>Gere o PDF</strong>: Clique em <strong>GERAR PDF</strong> para baixar um arquivo pronto para impressão (folha A4 paisagem, com duas páginas A5 lado a lado por folha).</p>
                        </div>
                    </div>

                    <div class="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-4 mt-2 text-left">
                        <h4 class="font-black text-amber-900 flex items-center gap-1.5 mb-1 text-xs md:text-sm">
                            <i class="fas fa-trophy text-amber-600"></i> Sistema de Conquistas (Scoreboard)
                        </h4>
                        <p class="text-amber-800 text-[11px] md:text-xs leading-relaxed">
                            Crie um incentivo extra! Gerar cada PDF dá <strong>+10 pontos</strong>. Quando a criança terminar a tarefa no papel, clique na bolinha <i class="far fa-circle text-slate-400"></i> no histórico para marcar como <strong>Concluído</strong>. Isso adiciona <strong>+50 pontos</strong> adicionais e <strong>+1 estrela</strong> ao Quadro de Conquistas!
                        </p>
                    </div>
                </div>
                <!-- Footer -->
                <div class="p-5 border-t border-slate-100 bg-slate-50 flex justify-end rounded-b-3xl">
                    <button onclick="document.getElementById('tutorial-modal').remove()" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md shadow-blue-600/10 text-xs md:text-sm">
                        Entendi, vamos treinar!
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // ESC para fechar
        const escHandler = (e) => { if (e.key === 'Escape') { modal.remove(); document.removeEventListener('keydown', escHandler); } };
        document.addEventListener('keydown', escHandler);

        // Cleanup do ESC handler nos botões de fechar existentes
        modal.querySelectorAll('button').forEach(btn => {
            const originalOnclick = btn.getAttribute('onclick');
            if (originalOnclick && originalOnclick.includes('remove')) {
                btn.removeAttribute('onclick');
                btn.addEventListener('click', () => { modal.remove(); document.removeEventListener('keydown', escHandler); });
            }
        });

        // Focus trap: move foco para dentro do modal
        modal.focus();
    }

    function shuffleAndDecluster(arr, keyFn) {
        if (!arr || arr.length <= 1) return arr;
        
        let shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        for (let i = 0; i < shuffled.length - 1; i++) {
            if (keyFn(shuffled[i]) === keyFn(shuffled[i + 1])) {
                for (let j = i + 2; j < shuffled.length; j++) {
                    if (keyFn(shuffled[i]) !== keyFn(shuffled[j])) {
                        let temp = shuffled[i + 1];
                        shuffled[i + 1] = shuffled[j];
                        shuffled[j] = temp;
                        break;
                    }
                }
            }
        }
        return shuffled;
    }

    // Painel de controles pedagógicos rápidos para pais (Aba de Pedagogia)
    function renderPedagogicalPanel(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="space-y-3 text-xs">
                <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                    <div>
                        <div class="font-bold text-slate-800 text-xs">Exemplo Guiado (#1)</div>
                        <div class="text-[10px] text-slate-500 leading-tight">Questão 1 resolvida em traço pontilhado para servir de modelo autodidata (Kumon Model).</div>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input type="checkbox" id="toggle-worked-example" ${pedagogicalConfig.workedExample ? 'checked' : ''} class="sr-only peer">
                        <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                    <div>
                        <div class="font-bold text-slate-800 text-xs">Tempo Alvo (SCT)</div>
                        <div class="text-[10px] text-slate-500 leading-tight">Meta de minutos no cabeçalho. Repetir o nível se passar de 1,5x o tempo sugerido.</div>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input type="checkbox" id="toggle-sct" ${pedagogicalConfig.sctEnabled ? 'checked' : ''} class="sr-only peer">
                        <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                    <div>
                        <div class="font-bold text-slate-800 text-xs">Folha de Gabarito</div>
                        <div class="text-[10px] text-slate-500 leading-tight">Gera folha final com respostas compactas para os pais conferirem tudo em 1 minuto.</div>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer flex-shrink-0">
                        <input type="checkbox" id="toggle-answer-key" ${pedagogicalConfig.answerKey ? 'checked' : ''} class="sr-only peer">
                        <div class="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>

                <div class="p-2.5 bg-blue-50/60 border border-blue-100 rounded-xl text-[10px] text-blue-800 leading-relaxed">
                    <strong class="block mb-0.5"><i class="fas fa-lightbulb"></i> Dica Pedagógica Kumon:</strong>
                    A rotina ideal é de <strong>1 folha por dia (10 a 15 min)</strong> todos os dias. O erro deve ser corrigido no mesmo dia para não consolidar dúvidas.
                </div>
            </div>
        `;

        document.getElementById('toggle-worked-example')?.addEventListener('change', (e) => {
            pedagogicalConfig.workedExample = e.target.checked;
            savePedagogicalConfig();
            if (window.refreshPreview) window.refreshPreview();
        });

        document.getElementById('toggle-sct')?.addEventListener('change', (e) => {
            pedagogicalConfig.sctEnabled = e.target.checked;
            savePedagogicalConfig();
            if (window.refreshPreview) window.refreshPreview();
        });

        document.getElementById('toggle-answer-key')?.addEventListener('change', (e) => {
            pedagogicalConfig.answerKey = e.target.checked;
            savePedagogicalConfig();
        });
    }

    // Expõe a função pública globalmente para que os botões do widget possam acessá-la
    window.KumonGen_toggleTaskCompletion = toggleTaskCompletion;
    window.KumonGen_toggleTaskCompletionParental = (id) => {
        toggleTaskCompletion(id);
        showParentalControlModal();
    };
    window.KumonGen_showTutorialModal = showTutorialModal;
    window.KumonGen_showParentalControlModal = showParentalControlModal;

    window.addEventListener('kumongen:student_changed', () => {
        onStudentSelected();
    });

    return {
        initRefs,
        adjustZoom,
        buildPage,
        generatePDF,
        generateWeeklyPackagePDF,
        adjustPreviewScale,
        getHistory,
        saveHistory,
        renderScoreboardWidget,
        renderStudentSelectorWidget,
        onStudentSelected,
        showParentalControlModal,
        getScore,
        showTutorialModal,
        shuffleAndDecluster,
        toggleTaskCompletion,
        solveItem,
        promptInlineEdit,
        renderPedagogicalPanel,
        getPedagogicalConfig: () => ({ ...pedagogicalConfig }),
        scheduleRefresh: function() {
            clearTimeout(refreshTimer);
            refreshTimer = setTimeout(() => {
                if (window.refreshPreview) window.refreshPreview();
            }, 300);
        }
    };
})();

window.KumonGen = KumonGen;

