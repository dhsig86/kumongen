// gerador.js - Funções comuns para todas as páginas (sem variáveis globais)
const KumonGen = (function() {
    let zoomContainer = null;
    let zoomSpan = null;
    let currentZoom = 0.7;

    // Inicializa referências (deve ser chamado após o carregamento da página)
    function initRefs() {
        zoomContainer = document.getElementById('zoomContainer');
        zoomSpan = document.getElementById('zoomValue');
        adjustPreviewScale();
        renderScoreboardWidget();
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
    function adjustPreviewScale() {
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

    // Constrói uma página (esquerda ou direita)
    function buildPage(container, level, pageNum, items) {
        container.innerHTML = '';

        // Cabeçalho
        const header = document.createElement('div');
        header.className = 'page-header';
        header.innerHTML = `
            <div>
                <h3>${level?.title || ''}</h3>
                <p>${level?.instruction || ''}</p>
            </div>
            <div class="text-right">
                <div class="text-[0.5rem] font-bold text-slate-400">DATA: ___/___/___ TEMPO: ___ min</div>
                <div class="border border-slate-900 px-2 py-0.5 mt-1 min-w-[120px]">
                    <span class="text-[0.5rem] font-bold">NOME:</span>
                    <span class="ml-2 text-[0.5rem]">____________________</span>
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
        footer.innerHTML = `<span>PÁG ${pageNum}</span>`;
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

            switch (item.type) {
                case 'quantity':
                    let circles = '';
                    for (let i = 0; i < item.value; i++) circles += '<span class="circle-placeholder"></span>';
                    content.innerHTML = `<span class="text-2xl font-black w-6">${item.value}</span> ${circles} <span class="answer-line"></span>`;
                    break;
                case 'math':
                    content.innerHTML = `<span class="text-base font-light italic">${item.operand1} ${item.operator} ${item.operand2} =</span> <span class="answer-line"></span>`;
                    break;
                case 'sequence':
                    const seq = item.sequence.map(v => v === '__' ? '___' : v).join(' · ');
                    content.innerHTML = `<span class="text-sm bg-slate-50 px-1">${seq}</span> <span class="answer-line"></span>`;
                    break;
                case 'tens':
                    const numVal = item.number;
                    const tens = Math.floor(numVal / 10);
                    const units = numVal % 10;
                    let blocks = `<span class="text-sm font-bold mr-1">${numVal} =</span>`;
                    for (let i = 0; i < tens; i++) blocks += '<span class="tens-block blue"></span>';
                    if (tens > 0 && units > 0) blocks += '<span class="mx-0.5">+</span>';
                    for (let i = 0; i < units; i++) blocks += '<span class="tens-block yellow"></span>';
                    content.innerHTML = blocks + '<span class="answer-line ml-1"></span>';
                    break;
                case 'compare':
                    content.innerHTML = `<span class="text-sm bg-slate-50 px-1">${item.pair[0]} _ ${item.pair[1]}</span> <span class="answer-line"></span>`;
                    break;
                case 'neighbors':
                    content.innerHTML = `<span class="text-sm">____ , ${item.center} , ____</span> <span class="answer-line"></span>`;
                    break;
                case 'trace':
                    content.innerHTML = `<span class="text-3xl font-black text-slate-300 border-2 border-dashed border-slate-300 px-1">${item.char}</span> <span class="flex-1 border-b-2 border-dotted border-slate-300 mx-1"></span> <span class="trace-cell"></span>`;
                    break;
                case 'syllable':
                    content.innerHTML = `<span class="text-xl font-bold text-slate-500 border-r pr-1 mr-1">${item.syllable}</span> <span class="answer-line w-6"></span> <span class="answer-line w-6"></span>`;
                    break;
                case 'word':
                    const partsHtml = item.parts.map(p => `<span class="bg-slate-100 border px-1 text-sm">${p}</span>`).join('<span class="mx-0.5">+</span>');
                    content.innerHTML = `<div class="flex items-center gap-0.5">${partsHtml}</div> <span class="w-16 border-b-4 border-double border-slate-400 ml-2"></span>`;
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
        const element = document.getElementById(elementId);
        if (!element) return;

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

                const canvas = await html2canvas(element, {
                    scale: 3, // Otimizado para não estourar memória em celulares
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

            pdf.save(`kumon_${subjectTitle.toLowerCase()}_${new Date().toISOString().slice(0,10)}.pdf`);

            // Salva no histórico local
            saveHistory(subjectTitle, levelTitle, numPages);

            // Exibe dica amigável de impressão
            showPrintTip(numPages);

        } catch (error) {
            console.error(error);
            alert('Erro ao gerar PDF: ' + error.message);
        } finally {
            document.body.removeChild(loader);
            if (zoomContainer) zoomContainer.style.transform = originalTransform;
            
            // Restaura preview original de volta para as páginas 1 e 2
            if (window.refreshPreview) {
                window.refreshPreview();
            }
        }
    }

    // ---------- SISTEMA DE LOCAL STORAGE, SCOREBOARD E HISTÓRICO ----------
    function saveHistory(subject, levelTitle, pages) {
        const history = JSON.parse(localStorage.getItem('kumongen_history') || '[]');
        const entry = {
            id: Date.now().toString(),
            date: new Date().toLocaleDateString('pt-BR'),
            subject: subject,
            levelTitle: levelTitle,
            pages: pages,
            completed: false
        };
        history.unshift(entry);
        localStorage.setItem('kumongen_history', JSON.stringify(history.slice(0, 30))); // guarda os últimos 30

        // Atualiza widget
        renderScoreboardWidget();
    }

    function getHistory() {
        return JSON.parse(localStorage.getItem('kumongen_history') || '[]');
    }

    function toggleTaskCompletion(id) {
        const history = JSON.parse(localStorage.getItem('kumongen_history') || '[]');
        const task = history.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            localStorage.setItem('kumongen_history', JSON.stringify(history));
            renderScoreboardWidget();
            // Dispara evento para atualizar a index.html se estiver aberta
            window.dispatchEvent(new Event('storage'));
            return task.completed;
        }
        return false;
    }

    function getScore() {
        const history = JSON.parse(localStorage.getItem('kumongen_history') || '[]');
        const createdCount = history.length;
        const completedCount = history.filter(t => t.completed).length;

        // Cada tarefa gerada = 10 pts. Concluída = +50 pts adicionais e +1 estrela
        const points = (createdCount * 10) + (completedCount * 50);
        const stars = completedCount;

        return {
            points,
            stars,
            completions: completedCount,
            total: createdCount
        };
    }

    function renderScoreboardWidget() {
        const container = document.getElementById('scoreboardWidget');
        if (!container) return;

        const score = getScore();
        const history = getHistory().slice(0, 3); // mostra as 3 últimas

        let historyHtml = '';
        if (history.length === 0) {
            historyHtml = `<div class="text-[10px] text-slate-400 italic">Nenhum caderno gerado ainda.</div>`;
        } else {
            history.forEach(task => {
                const checkedClass = task.completed ? 'text-green-500' : 'text-slate-300 hover:text-green-400';
                const checkIcon = task.completed ? 'fa-check-circle' : 'fa-circle';
                const decoration = task.completed ? 'line-through text-slate-400' : 'text-slate-700 font-medium';
                historyHtml += `
                    <div class="flex items-center justify-between bg-white px-2 py-1.5 rounded border border-slate-100 text-[10px] mb-1">
                        <div class="truncate mr-2 text-left flex-1">
                            <span class="${decoration}">${task.levelTitle}</span>
                            <span class="text-[8px] text-slate-400 block">${task.date} · ${task.pages} pág.</span>
                        </div>
                        <button onclick="KumonGen.toggleTaskCompletion('${task.id}')" class="transition-colors ${checkedClass}">
                            <i class="far ${checkIcon} text-sm"></i>
                        </button>
                    </div>
                `;
            });
        }

        container.innerHTML = `
            <div class="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-3 mb-4 text-slate-800">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-[10px] font-black text-amber-800 uppercase tracking-wider">Meu Progresso</span>
                    <span class="text-xs font-bold text-amber-600 flex items-center gap-0.5">
                        <i class="fas fa-star text-yellow-500"></i> ${score.stars}
                    </span>
                </div>
                <div class="grid grid-cols-2 gap-2 text-center mb-3">
                    <div class="bg-white/80 rounded p-1 border border-yellow-100">
                        <div class="text-[8px] text-slate-400 uppercase font-bold">Pontos</div>
                        <div class="text-sm font-black text-amber-700">${score.points}</div>
                    </div>
                    <div class="bg-white/80 rounded p-1 border border-yellow-100">
                        <div class="text-[8px] text-slate-400 uppercase font-bold">Cadernos</div>
                        <div class="text-sm font-black text-amber-700">${score.completions}/${score.total}</div>
                    </div>
                </div>
                <div class="border-t border-yellow-100 pt-2">
                    <div class="text-[8px] font-bold text-slate-400 uppercase mb-1.5 text-left">Cadernos Recentes:</div>
                    ${historyHtml}
                </div>
            </div>
        `;
    }

    // Modal de tutorial interativo integrado na interface
    function showTutorialModal() {
        const existing = document.getElementById('tutorial-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'tutorial-modal';
        modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm';
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
                        Bem-vindo ao **KumonGen**! Este gerador auxilia na criação de materiais impressos estruturados para o aprendizado das crianças.
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
                            Crie um incentivo extra! Gerar cada PDF dá <strong>+10 pontos</strong>. Quando a criança terminar a tarefa no papel, clique na bolinha <i class="far fa-circle text-slate-400"></i> no histórico para marcar como **Concluído**. Isso adiciona <strong>+50 pontos</strong> adicionais e <strong>+1 estrela</strong> ao Quadro de Conquistas!
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
    }

    // Expõe a função pública globalmente para que os botões do widget possam acessá-la
    window.KumonGen_toggleTaskCompletion = toggleTaskCompletion;
    window.KumonGen_showTutorialModal = showTutorialModal;

    return {
        initRefs,
        adjustZoom,
        buildPage,
        generatePDF,
        adjustPreviewScale,
        getHistory,
        getScore,
        showTutorialModal,
        toggleTaskCompletion: (id) => {
            const res = toggleTaskCompletion(id);
            renderScoreboardWidget();
            return res;
        }
    };
})();

