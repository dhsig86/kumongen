// portugues.js - Lógica específica para Português com interface amigável
(function() {
    // ---------- BANCO DE DADOS ----------
    const LevelLibrary = {
        portugues: [
            {
                id: 'p1',
                title: 'P1 · Alfabeto (traçado)',
                type: 'trace',
                instruction: 'Selecione as letras para treinar.'
            },
            {
                id: 'p2',
                title: 'P2 · Sílabas simples',
                type: 'syllables',
                instruction: 'Escolha as famílias silábicas.'
            },
            {
                id: 'p3',
                title: 'P3 · Palavras curtas (2 sílabas)',
                type: 'wordbuilding',
                instruction: 'Adicione palavras e suas sílabas.'
            },
            {
                id: 'p4',
                title: 'P4 · Palavras com 3 ou 4 sílabas',
                type: 'wordbuilding',
                instruction: 'Adicione palavras mais longas.'
            },
            {
                id: 'p5',
                title: 'P5 · Sílabas complexas',
                type: 'syllables',
                instruction: 'Escolha as famílias de sílabas complexas.'
            },
            {
                id: 'p6',
                title: 'P6 · Dígrafos',
                type: 'syllables',
                instruction: 'Treine as sílabas com dígrafos.'
            },
            {
                id: 'p7',
                title: 'P7 · Rimas & Sons Finais',
                type: 'rhyme',
                instruction: 'Encontre a palavra que rima.'
            },
            {
                id: 'p8',
                title: 'P8 · Frases Curtas',
                type: 'sentence',
                instruction: 'Ordene as palavras para formar a frase.'
            }
        ]
    };

    // ---------- ESTADO LOCAL ----------
    let currentLevelId = 'p1';
    let itemsPerPage = 8;
    let currentZoom = 0.7;

    // Elementos DOM
    let pageLeft, pageRight, levelListDiv, paramPanel, zoomSpan, zoomContainer;

    // ---------- PARÂMETROS CUSTOMIZÁVEIS ----------
    let customParams = {
        // Para trace
        traceSelected: [],  // será preenchido com todas no init
        traceRepeat: 2,
        // Para syllables
        syllableFamilies: {
            'BA': true, 'BE': true, 'BI': true, 'BO': true, 'BU': true,
            'CA': true, 'CE': true, 'CI': true, 'CO': true, 'CU': true,
            'DA': true, 'DE': true, 'DI': true, 'DO': true, 'DU': true,
            'FA': true, 'FE': true, 'FI': true, 'FO': true, 'FU': true,
            'GA': true, 'GE': true, 'GI': true, 'GO': true, 'GU': true,
            'JA': true, 'JE': true, 'JI': true, 'JO': true, 'JU': true,
            'LA': true, 'LE': true, 'LI': true, 'LO': true, 'LU': true,
            'MA': true, 'ME': true, 'MI': true, 'MO': true, 'MU': true,
            'NA': true, 'NE': true, 'NI': true, 'NO': true, 'NU': true,
            'PA': true, 'PE': true, 'PI': true, 'PO': true, 'PU': true,
            'RA': true, 'RE': true, 'RI': true, 'RO': true, 'RU': true,
            'SA': true, 'SE': true, 'SI': true, 'SO': true, 'SU': true,
            'TA': true, 'TE': true, 'TI': true, 'TO': true, 'TU': true,
            'VA': true, 'VE': true, 'VI': true, 'VO': true, 'VU': true,
            'ZA': true, 'ZE': true, 'ZI': true, 'ZO': true, 'ZU': true
        },
        syllableRepeat: 2,
        syllableComplexFamilies: {
            'BRA': true, 'BRE': true, 'BRI': true, 'BRO': true, 'BRU': true,
            'CRA': true, 'CRE': true, 'CRI': true, 'CRO': true, 'CRU': true,
            'DRA': true, 'DRE': true, 'DRI': true, 'DRO': true, 'DRU': true,
            'FRA': true, 'FRE': true, 'FRI': true, 'FRO': true, 'FRU': true,
            'GRA': true, 'GRE': true, 'GRI': true, 'GRO': true, 'GRU': true,
            'PRA': true, 'PRE': true, 'PRI': true, 'PRO': true, 'PRU': true,
            'TRA': true, 'TRE': true, 'TRI': true, 'TRO': true, 'TRU': true,
            'BLA': true, 'BLE': true, 'BLI': true, 'BLO': true, 'BLU': true,
            'CLA': true, 'CLE': true, 'CLI': true, 'CLO': true, 'CLU': true,
            'FLA': true, 'FLE': true, 'FLI': true, 'FLO': true, 'FLU': true,
            'GLA': true, 'GLE': true, 'GLI': true, 'GLO': true, 'GLU': true,
            'PLA': true, 'PLE': true, 'PLI': true, 'PLO': true, 'PLU': true
        },
        syllableDigraphFamilies: {
            'CHA': true, 'CHE': true, 'CHI': true, 'CHO': true, 'CHU': true,
            'LHA': true, 'LHE': true, 'LHI': true, 'LHO': true, 'LHU': true,
            'NHA': true, 'NHE': true, 'NHI': true, 'NHO': true, 'NHU': true,
            'QUA': true, 'QUE': true, 'QUI': true, 'QUO': true,
            'GUA': true, 'GUE': true, 'GUI': true
        },
        // Para wordbuilding
        wordList: [
            { word: 'BOLA', parts: ['BO','LA'] },
            { word: 'CASA', parts: ['CA','SA'] },
            { word: 'DADO', parts: ['DA','DO'] },
            { word: 'FOCA', parts: ['FO','CA'] },
            { word: 'GATO', parts: ['GA','TO'] },
            { word: 'JACA', parts: ['JA','CA'] },
            { word: 'LIMA', parts: ['LI','MA'] },
            { word: 'MALA', parts: ['MA','LA'] },
            { word: 'NOVE', parts: ['NO','VE'] },
            { word: 'PATO', parts: ['PA','TO'] },
            { word: 'RATO', parts: ['RA','TO'] },
            { word: 'SAPO', parts: ['SA','PO'] },
            { word: 'TATU', parts: ['TA','TU'] },
            { word: 'VACA', parts: ['VA','CA'] },
            { word: 'BOLO', parts: ['BO','LO'] },
            { word: 'COPO', parts: ['CO','PO'] },
            { word: 'DOCE', parts: ['DO','CE'] },
            { word: 'LOBO', parts: ['LO','BO'] },
            { word: 'SUCO', parts: ['SU','CO'] },
            { word: 'VOTO', parts: ['VO','TO'] },
            { word: 'FOGO', parts: ['FO','GO'] },
            { word: 'LIXO', parts: ['LI','XO'] },
            { word: 'TETO', parts: ['TE','TO'] },
            { word: 'GELO', parts: ['GE','LO'] },
            { word: 'MURO', parts: ['MU','RO'] },
            { word: 'LAGO', parts: ['LA','GO'] },
            { word: 'SINO', parts: ['SI','NO'] },
            { word: 'RODA', parts: ['RO','DA'] },
            { word: 'PENA', parts: ['PE','NA'] },
            { word: 'LUVA', parts: ['LU','VA'] },
            { word: 'DEDO', parts: ['DE','DO'] },
            { word: 'NABO', parts: ['NA','BO'] },
            { word: 'FADA', parts: ['FA','DA'] },
            { word: 'JIPE', parts: ['JI','PE'] },
            { word: 'TUBO', parts: ['TU','BO'] },
            { word: 'REDE', parts: ['RE','DE'] },
            { word: 'MEDO', parts: ['ME','DO'] },
            { word: 'PIPA', parts: ['PI','PA'] },
            { word: 'SOPA', parts: ['SO','PA'] },
            { word: 'VIDA', parts: ['VI','DA'] }
        ],
        wordRepeat: 2
    };

    // ---------- PERSISTÊNCIA (LOCAL STORAGE) ----------
    function loadSavedState() {
        const savedLevelId = localStorage.getItem('kumongen_por_level');
        if (savedLevelId) {
            currentLevelId = savedLevelId;
        }

        const savedParams = localStorage.getItem('kumongen_por_params');
        if (savedParams) {
            try {
                const parsed = JSON.parse(savedParams);
                customParams = { ...customParams, ...parsed };
            } catch (e) {
                console.error("Erro ao ler parametros salvos de portugues", e);
            }
        }
    }

    function saveState() {
        localStorage.setItem('kumongen_por_level', currentLevelId);
        localStorage.setItem('kumongen_por_params', JSON.stringify(customParams));
    }

    const DEFAULT_WORDS_P3 = [
        { word: 'BOLA', parts: ['BO','LA'] },
        { word: 'CASA', parts: ['CA','SA'] },
        { word: 'DADO', parts: ['DA','DO'] },
        { word: 'FOCA', parts: ['FO','CA'] },
        { word: 'GATO', parts: ['GA','TO'] },
        { word: 'JACA', parts: ['JA','CA'] },
        { word: 'LIMA', parts: ['LI','MA'] },
        { word: 'MALA', parts: ['MA','LA'] },
        { word: 'NOVE', parts: ['NO','VE'] },
        { word: 'PATO', parts: ['PA','TO'] },
        { word: 'RATO', parts: ['RA','TO'] },
        { word: 'SAPO', parts: ['SA','PO'] },
        { word: 'TATU', parts: ['TA','TU'] },
        { word: 'VACA', parts: ['VA','CA'] },
        { word: 'BOLO', parts: ['BO','LO'] },
        { word: 'COPO', parts: ['CO','PO'] },
        { word: 'DOCE', parts: ['DO','CE'] },
        { word: 'LOBO', parts: ['LO','BO'] },
        { word: 'SUCO', parts: ['SU','CO'] },
        { word: 'VOTO', parts: ['VO','TO'] },
        { word: 'FOGO', parts: ['FO','GO'] },
        { word: 'LIXO', parts: ['LI','XO'] },
        { word: 'TETO', parts: ['TE','TO'] },
        { word: 'GELO', parts: ['GE','LO'] },
        { word: 'MURO', parts: ['MU','RO'] },
        { word: 'LAGO', parts: ['LA','GO'] },
        { word: 'SINO', parts: ['SI','NO'] },
        { word: 'RODA', parts: ['RO','DA'] },
        { word: 'PENA', parts: ['PE','NA'] },
        { word: 'LUVA', parts: ['LU','VA'] },
        { word: 'DEDO', parts: ['DE','DO'] },
        { word: 'NABO', parts: ['NA','BO'] },
        { word: 'FADA', parts: ['FA','DA'] },
        { word: 'JIPE', parts: ['JI','PE'] },
        { word: 'TUBO', parts: ['TU','BO'] },
        { word: 'REDE', parts: ['RE','DE'] },
        { word: 'MEDO', parts: ['ME','DO'] },
        { word: 'PIPA', parts: ['PI','PA'] },
        { word: 'SOPA', parts: ['SO','PA'] },
        { word: 'VIDA', parts: ['VI','DA'] }
    ];

    const DEFAULT_WORDS_P4 = [
        { word: 'BANANA', parts: ['BA','NA','NA'] },
        { word: 'PIPOCA', parts: ['PI','PO','CA'] },
        { word: 'PETECA', parts: ['PE','TE','CA'] },
        { word: 'SAPATO', parts: ['SA','PA','TO'] },
        { word: 'TOMATE', parts: ['TO','MA','TE'] },
        { word: 'SACOLA', parts: ['SA','CO','LA'] },
        { word: 'PANELA', parts: ['PA','NE','LA'] },
        { word: 'CABELO', parts: ['CA','BE','LO'] },
        { word: 'JANELA', parts: ['JA','NE','LA'] },
        { word: 'BONECO', parts: ['BO','NE','CO'] },
        { word: 'PIJAMA', parts: ['PI','JA','MA'] },
        { word: 'GELADO', parts: ['GE','LA','DO'] },
        { word: 'CAVALO', parts: ['CA','VA','LO'] },
        { word: 'MACACO', parts: ['MA','CA','CO'] },
        { word: 'RAPOSA', parts: ['RA','PO','SA'] },
        { word: 'COMIDA', parts: ['CO','MI','DA'] },
        { word: 'SALADA', parts: ['SA','LA','DA'] },
        { word: 'CANETA', parts: ['CA','NE','TA'] },
        { word: 'PATETA', parts: ['PA','TE','TA'] },
        { word: 'MENINO', parts: ['ME','NI','NO'] },
        { word: 'MENINA', parts: ['ME','NI','NA'] },
        { word: 'TUCANO', parts: ['TU','CA','NO'] },
        { word: 'GIRAFA', parts: ['GI','RA','FA'] },
        { word: 'BICICLETA', parts: ['BI','CI','CLE','TA'] },
        { word: 'GELADEIRA', parts: ['GE','LA','DEI','RA'] },
        { word: 'CHOCOLATE', parts: ['CHO','CO','LA','TE'] },
        { word: 'TELEFONE', parts: ['TE','LE','FO','NE'] },
        { word: 'ABACAXI', parts: ['A','BA','CA','XI'] },
        { word: 'BORBOLETA', parts: ['BOR','BO','LE','TA'] },
        { word: 'TARTARUGA', parts: ['TAR','TA','RU','GA'] }
    ];

    const DEFAULT_RHYMES_P7 = [
        { word: 'GATO', target: 'PATO', options: ['PATO', 'BOLO', 'MESA'], rhymeEnding: 'ATO' },
        { word: 'BOLA', target: 'MOLA', options: ['MOLA', 'DADO', 'GIRAFA'], rhymeEnding: 'OLA' },
        { word: 'MÃO', target: 'PÃO', options: ['PÃO', 'LUVA', 'TATU'], rhymeEnding: 'ÃO' },
        { word: 'COELHO', target: 'ESPELHO', options: ['ESPELHO', 'JANELA', 'RATO'], rhymeEnding: 'ELHO' },
        { word: 'PANELA', target: 'JANELA', options: ['JANELA', 'SAPATO', 'BONECO'], rhymeEnding: 'ELA' },
        { word: 'CORAÇÃO', target: 'BALÃO', options: ['BALÃO', 'CANETA', 'CACHORRO'], rhymeEnding: 'ÃO' },
        { word: 'CHUVA', target: 'UVA', options: ['UVA', 'BANANA', 'BODE'], rhymeEnding: 'UVA' },
        { word: 'SAPATO', target: 'RATO', options: ['RATO', 'CABELO', 'FOGO'], rhymeEnding: 'ATO' },
        { word: 'FLOR', target: 'AMOR', options: ['AMOR', 'PEIXE', 'DENTE'], rhymeEnding: 'OR' },
        { word: 'DADO', target: 'CADEADO', options: ['CADEADO', 'PIPOCA', 'LEÃO'], rhymeEnding: 'ADO' },
        { word: 'DENTE', target: 'PRESENTE', options: ['PRESENTE', 'GELADO', 'SUCO'], rhymeEnding: 'ENTE' },
        { word: 'LATA', target: 'BATA', options: ['BATA', 'COPO', 'SINO'], rhymeEnding: 'ATA' }
    ];

    const DEFAULT_SENTENCES_P8 = [
        { sentence: 'O GATO BEBE LEITE', parts: ['O GATO', 'BEBE', 'LEITE'] },
        { sentence: 'A BOLA É AZUL', parts: ['A BOLA', 'É', 'AZUL'] },
        { sentence: 'O CACHORRO LATIU ALTO', parts: ['O CACHORRO', 'LATIU', 'ALTO'] },
        { sentence: 'A MENINA COMEU MAÇÃ', parts: ['A MENINA', 'COMEU', 'MAÇÃ'] },
        { sentence: 'O SOL BRILHA NO CÉU', parts: ['O SOL', 'BRILHA', 'NO CÉU'] },
        { sentence: 'O SAPO PULA NA LAGOA', parts: ['O SAPO', 'PULA', 'NA LAGOA'] },
        { sentence: 'EU GOSTO DE DESENHAR', parts: ['EU GOSTO', 'DE', 'DESENHAR'] },
        { sentence: 'O PASSARINHO CANTA FELIZ', parts: ['O PASSARINHO', 'CANTA', 'FELIZ'] },
        { sentence: 'O PEIXE NADA NO RIO', parts: ['O PEIXE', 'NADA', 'NO RIO'] },
        { sentence: 'O LIVRO TEM HISTÓRIAS', parts: ['O LIVRO', 'TEM', 'HISTÓRIAS'] }
    ];

    // ---------- FUNÇÕES DE GERAÇÃO DE ITENS ----------
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

            case 'syllables': {
                const lvlId = (level && level.id) || currentLevelId;
                let sylMap = customParams.syllableFamilies;
                if (lvlId === 'p5') sylMap = customParams.syllableComplexFamilies;
                if (lvlId === 'p6') sylMap = customParams.syllableDigraphFamilies;
                const selectedSyllables = Object.keys(sylMap).filter(s => sylMap[s]);
                selectedSyllables.forEach(syllable => {
                    for (let i = 0; i < (customParams.syllableRepeat || 2); i++) {
                        baseItems.push({ type: 'syllable', syllable: syllable });
                    }
                });
                break;
            }

            case 'wordbuilding': {
                const lvlId = (level && level.id) || currentLevelId;
                let wordsToUse = customParams.wordList;
                if (lvlId === 'p4') {
                    wordsToUse = (currentLevelId === 'p4' && customParams.wordList && customParams.wordList.length > 0)
                        ? customParams.wordList
                        : DEFAULT_WORDS_P4;
                } else if (lvlId === 'p3') {
                    wordsToUse = (currentLevelId === 'p3' && customParams.wordList && customParams.wordList.length > 0)
                        ? customParams.wordList
                        : DEFAULT_WORDS_P3;
                }
                wordsToUse.forEach(wordObj => {
                    for (let i = 0; i < (customParams.wordRepeat || 1); i++) {
                        baseItems.push({ type: 'word', word: wordObj.word, parts: wordObj.parts });
                    }
                });
                break;
            }

            case 'rhyme': {
                DEFAULT_RHYMES_P7.forEach(rh => {
                    baseItems.push({
                        type: 'rhyme',
                        word: rh.word,
                        target: rh.target,
                        options: [...rh.options],
                        rhymeEnding: rh.rhymeEnding
                    });
                });
                break;
            }

            case 'sentence': {
                DEFAULT_SENTENCES_P8.forEach(st => {
                    baseItems.push({
                        type: 'sentence',
                        sentence: st.sentence,
                        parts: [...st.parts]
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
            if (item.type === 'syllable') return item.syllable;
            if (item.type === 'word') return item.word;
            if (item.type === 'rhyme') return item.word;
            if (item.type === 'sentence') return item.sentence;
            return '';
        };

        const declustered = KumonGen.shuffleAndDecluster(baseItems, keyFn);

        let result = [];
        for (let i = 0; i < target; i++) {
            result.push({ ...declustered[i % declustered.length] });
        }
        return result;
    }

    // ---------- PAINEL DE PARÂMETROS ----------
    function updateParamPanel() {
        const level = LevelLibrary.portugues.find(l => l.id === currentLevelId);
        if (!level || !paramPanel) return;

        let html = '';

        switch (level.type) {
            case 'trace':
                html = renderTracePanel();
                break;
            case 'syllables':
                html = renderSyllablesPanel();
                break;
            case 'wordbuilding':
                html = renderWordPanel();
                break;
            default:
                html = '<div class="text-slate-400">Sem parâmetros adicionais.</div>';
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
                    <label class="block text-xs font-bold mb-1">Letras para treinar:</label>
                    <div class="bg-white p-2 rounded max-h-40 overflow-y-auto border border-slate-200">
                        ${checkboxes}
                    </div>
                </div>
                <div class="param-row">
                    <label>Repetições:</label>
                    <input type="number" id="traceRepeat" value="${customParams.traceRepeat}" min="1" max="5">
                </div>
                <div class="button-group">
                    <button id="selectAllTrace">Selecionar todas</button>
                    <button id="clearAllTrace">Limpar</button>
                    <button id="randomTrace">Aleatório</button>
                </div>
            </div>
        `;
    }

    function getSyllableMapForCurrentLevel() {
        if (currentLevelId === 'p5') return customParams.syllableComplexFamilies;
        if (currentLevelId === 'p6') return customParams.syllableDigraphFamilies;
        return customParams.syllableFamilies;
    }

    function renderSyllablesPanel() {
        const sylMap = getSyllableMapForCurrentLevel();
        const families = {};
        Object.keys(sylMap).sort().forEach(s => {
            const first = s[0];
            if (!families[first]) families[first] = [];
            families[first].push(s);
        });

        let html = '<div class="param-control">';
        html += '<div class="mb-2"><label class="block text-xs font-bold mb-1">Famílias silábicas:</label>';
        html += '<div class="bg-white p-2 rounded max-h-60 overflow-y-auto border border-slate-200">';

        for (let letter in families) {
            html += `<div class="font-bold text-xs mt-1">${letter}</div>`;
            families[letter].forEach(syl => {
                const checked = sylMap[syl] ? 'checked' : '';
                html += `
                    <label class="inline-flex items-center gap-1 mr-3 mb-1">
                        <input type="checkbox" class="syllable-item" value="${syl}" ${checked}>
                        <span class="text-xs">${syl}</span>
                    </label>
                `;
            });
        }

        html += '</div></div>';
        html += `
            <div class="param-row">
                <label>Repetições:</label>
                <input type="number" id="syllableRepeat" value="${customParams.syllableRepeat}" min="1" max="5">
            </div>
            <div class="button-group">
                <button id="selectAllSyllables">Selecionar todas</button>
                <button id="clearAllSyllables">Limpar</button>
                <button id="randomSyllables">Aleatório</button>
            </div>
        </div>`;
        return html;
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
                    <label class="block text-xs font-bold mb-1">Palavras cadastradas:</label>
                    <div id="wordListContainer" class="bg-white p-2 rounded max-h-40 overflow-y-auto border border-slate-200">
                        ${wordItems || '<div class="text-slate-400 text-xs">Nenhuma palavra</div>'}
                    </div>
                </div>
                <div class="border-t border-slate-200 my-2 pt-2">
                    <label class="block text-xs font-bold mb-1">Adicionar nova palavra:</label>
                    <div class="flex-row-params">
                        <input type="text" id="newWord" placeholder="Palavra (ex: BOLA)" class="flex-1 text-xs border rounded px-2 py-1">
                        <input type="text" id="newParts" placeholder="Partes separadas por espaço (ex: BO LA)" class="flex-1 text-xs border rounded px-2 py-1">
                        <button id="addWordBtn" class="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-700 whitespace-nowrap">
                            <i class="fas fa-plus mr-1"></i>Adicionar
                        </button>
                    </div>
                </div>
                <div class="param-row">
                    <label>Repetições:</label>
                    <input type="number" id="wordRepeat" value="${customParams.wordRepeat}" min="1" max="5">
                </div>
            </div>
        `;
    }

    function attachParamEvents(type) {
        setTimeout(() => {
            if (type === 'trace') {
                // Checkboxes
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

            if (type === 'syllables') {
                const sylMap = getSyllableMapForCurrentLevel();

                document.querySelectorAll('.syllable-item').forEach(cb => {
                    cb.addEventListener('change', (e) => {
                        sylMap[e.target.value] = e.target.checked;
                        saveState();
                        refreshPreview();
                    });
                });

                document.getElementById('selectAllSyllables')?.addEventListener('click', () => {
                    document.querySelectorAll('.syllable-item').forEach(cb => {
                        cb.checked = true;
                        sylMap[cb.value] = true;
                    });
                    saveState();
                    refreshPreview();
                });

                document.getElementById('clearAllSyllables')?.addEventListener('click', () => {
                    document.querySelectorAll('.syllable-item').forEach(cb => {
                        cb.checked = false;
                        sylMap[cb.value] = false;
                    });
                    saveState();
                    refreshPreview();
                });

                document.getElementById('randomSyllables')?.addEventListener('click', () => {
                    document.querySelectorAll('.syllable-item').forEach(cb => {
                        const random = Math.random() > 0.5;
                        cb.checked = random;
                        sylMap[cb.value] = random;
                    });
                    saveState();
                    refreshPreview();
                });

                const repeat = document.getElementById('syllableRepeat');
                if (repeat) repeat.addEventListener('change', (e) => {
                    customParams.syllableRepeat = parseInt(e.target.value) || 2;
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
                        alert('Preencha a palavra e as partes!');
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
        const levels = LevelLibrary.portugues;
        let html = '';
        levels.forEach(lvl => {
            const active = (lvl.id === currentLevelId) ? 'border-green-500 bg-green-50' : 'border-slate-100 hover:border-green-200';
            html += `<button onclick="selectLevel('${lvl.id}')" class="w-full text-left p-3 rounded-xl border-2 transition-all ${active}">
                <div class="text-xs font-bold ${lvl.id === currentLevelId ? 'text-green-700' : 'text-slate-600'}">${lvl.title}</div>
            </button>`;
        });
        levelListDiv.innerHTML = html;
    }

    window.selectLevel = function(id) {
        const previousLevel = currentLevelId;
        currentLevelId = id;
        if (id === 'p1' && customParams.traceSelected.length === 0) {
            customParams.traceSelected = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        }

        // Abastecimento automático de palavras sugeridas por nível (só ao trocar de nível, preservando customizações)
        if (id === 'p3' && previousLevel !== 'p3') {
            customParams.wordList = [
                { word: 'BOLA', parts: ['BO','LA'] },
                { word: 'CASA', parts: ['CA','SA'] },
                { word: 'DADO', parts: ['DA','DO'] },
                { word: 'FOCA', parts: ['FO','CA'] },
                { word: 'GATO', parts: ['GA','TO'] },
                { word: 'JACA', parts: ['JA','CA'] },
                { word: 'LIMA', parts: ['LI','MA'] },
                { word: 'MALA', parts: ['MA','LA'] },
                { word: 'NOVE', parts: ['NO','VE'] },
                { word: 'PATO', parts: ['PA','TO'] },
                { word: 'RATO', parts: ['RA','TO'] },
                { word: 'SAPO', parts: ['SA','PO'] },
                { word: 'TATU', parts: ['TA','TU'] },
                { word: 'VACA', parts: ['VA','CA'] },
                { word: 'BOLO', parts: ['BO','LO'] },
                { word: 'COPO', parts: ['CO','PO'] },
                { word: 'DOCE', parts: ['DO','CE'] },
                { word: 'LOBO', parts: ['LO','BO'] },
                { word: 'SUCO', parts: ['SU','CO'] },
                { word: 'VOTO', parts: ['VO','TO'] },
                { word: 'FOGO', parts: ['FO','GO'] },
                { word: 'LIXO', parts: ['LI','XO'] },
                { word: 'TETO', parts: ['TE','TO'] },
                { word: 'GELO', parts: ['GE','LO'] },
                { word: 'MURO', parts: ['MU','RO'] },
                { word: 'LAGO', parts: ['LA','GO'] },
                { word: 'SINO', parts: ['SI','NO'] },
                { word: 'RODA', parts: ['RO','DA'] },
                { word: 'PENA', parts: ['PE','NA'] },
                { word: 'LUVA', parts: ['LU','VA'] },
                { word: 'DEDO', parts: ['DE','DO'] },
                { word: 'NABO', parts: ['NA','BO'] },
                { word: 'FADA', parts: ['FA','DA'] },
                { word: 'JIPE', parts: ['JI','PE'] },
                { word: 'TUBO', parts: ['TU','BO'] },
                { word: 'REDE', parts: ['RE','DE'] },
                { word: 'MEDO', parts: ['ME','DO'] },
                { word: 'PIPA', parts: ['PI','PA'] },
                { word: 'SOPA', parts: ['SO','PA'] },
                { word: 'VIDA', parts: ['VI','DA'] }
            ];
        } else if (id === 'p4' && previousLevel !== 'p4') {
            customParams.wordList = [
                { word: 'BANANA', parts: ['BA','NA','NA'] },
                { word: 'PIPOCA', parts: ['PI','PO','CA'] },
                { word: 'PETECA', parts: ['PE','TE','CA'] },
                { word: 'SAPATO', parts: ['SA','PA','TO'] },
                { word: 'TOMATE', parts: ['TO','MA','TE'] },
                { word: 'SACOLA', parts: ['SA','CO','LA'] },
                { word: 'PANELA', parts: ['PA','NE','LA'] },
                { word: 'CABELO', parts: ['CA','BE','LO'] },
                { word: 'JANELA', parts: ['JA','NE','LA'] },
                { word: 'BONECO', parts: ['BO','NE','CO'] },
                { word: 'PIJAMA', parts: ['PI','JA','MA'] },
                { word: 'GELADO', parts: ['GE','LA','DO'] },
                { word: 'CAVALO', parts: ['CA','VA','LO'] },
                { word: 'MACACO', parts: ['MA','CA','CO'] },
                { word: 'RAPOSA', parts: ['RA','PO','SA'] },
                { word: 'COMIDA', parts: ['CO','MI','DA'] },
                { word: 'SALADA', parts: ['SA','LA','DA'] },
                { word: 'CANETA', parts: ['CA','NE','TA'] },
                { word: 'PATETA', parts: ['PA','TE','TA'] },
                { word: 'MENINO', parts: ['ME','NI','NO'] },
                { word: 'MENINA', parts: ['ME','NI','NA'] },
                { word: 'TUCANO', parts: ['TU','CA','NO'] },
                { word: 'GIRAFA', parts: ['GI','RA','FA'] },
                { word: 'BICICLETA', parts: ['BI','CI','CLE','TA'] },
                { word: 'GELADEIRA', parts: ['GE','LA','DEI','RA'] },
                { word: 'CHOCOLATE', parts: ['CHO','CO','LA','TE'] },
                { word: 'TELEFONE', parts: ['TE','LE','FO','NE'] },
                { word: 'ABACAXI', parts: ['A','BA','CA','XI'] },
                { word: 'BORBOLETA', parts: ['BOR','BO','LE','TA'] },
                { word: 'TARTARUGA', parts: ['TAR','TA','RU','GA'] }
            ];
        }

        saveState();
        renderLevelList();
        updateParamPanel();
        refreshPreview();
    };

    function refreshPreview() {
        if (!pageLeft || !pageRight) return;
        const level = LevelLibrary.portugues.find(l => l.id === currentLevelId);
        if (!level) return;

        const allItems = generateItemsForLevel(level, itemsPerPage * 2);
        const leftItems = allItems.slice(0, itemsPerPage);
        const rightItems = allItems.slice(itemsPerPage, itemsPerPage * 2);

        KumonGen.buildPage(pageLeft, level, 1, leftItems);
        KumonGen.buildPage(pageRight, level, 2, rightItems);
    }

    // ===== CONTROLES DE ABAS & WIZARD (KUMON 3.0) =====
    function switchPorTab(tab) {
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

    function selectPorWizardAge(ageKey, btn) {
        document.querySelectorAll('.wizard-age-btn').forEach(b => {
            b.classList.remove('active', 'border-emerald-600', 'bg-emerald-50');
            b.classList.add('border-slate-200', 'bg-white');
        });
        if (btn) {
            btn.classList.add('active', 'border-emerald-600', 'bg-emerald-50');
            btn.classList.remove('border-slate-200', 'bg-white');
        }

        const map = {
            'age_4_5': 'p1',
            'age_6_7': 'p2',
            'age_8_9': 'p4',
            'age_10_plus': 'p6'
        };
        const targetLevel = map[ageKey] || 'p1';
        const targetCard = document.querySelector(`#panel-wizard .kumon-wizard-card[onclick*="'${targetLevel}'"]`);
        selectPorWizardGoal(targetLevel, targetCard);
    }

    function selectPorWizardGoal(levelId, el) {
        currentLevelId = levelId;
        document.querySelectorAll('#panel-wizard .kumon-wizard-card').forEach(card => card.classList.remove('active'));
        if (el) el.classList.add('active');

        saveState();
        renderLevelList();
        updateParamPanel();
        refreshPreview();
    }

    function selectPorWizardPace(pages, lines, btn) {
        document.querySelectorAll('.wizard-pace-btn').forEach(b => {
            b.classList.remove('active', 'border-emerald-600', 'bg-emerald-50', 'text-emerald-800');
            b.classList.add('border-slate-200', 'bg-white', 'text-slate-600');
        });
        if (btn) {
            btn.classList.add('active', 'border-emerald-600', 'bg-emerald-50', 'text-emerald-800');
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
    window.switchPorTab = switchPorTab;
    window.selectPorWizardAge = selectPorWizardAge;
    window.selectPorWizardGoal = selectPorWizardGoal;
    window.selectPorWizardPace = selectPorWizardPace;
    
    window.generatePDF = () => {
        const level = LevelLibrary.portugues.find(l => l.id === currentLevelId);
        if (!level) return;

        const pagesEl = document.getElementById('pagesPerBook');
        const totalPages = pagesEl ? parseInt(pagesEl.value) : 2;

        const allItems = generateItemsForLevel(level, totalPages * itemsPerPage);

        KumonGen.generatePDF('a4-sheet', 'Português', level.title, totalPages, allItems, level, itemsPerPage);
    };

    window.refreshPreview = refreshPreview;

    // Registra módulo para uso no tablet player (Fase 2)
    window.KumonSubjects = window.KumonSubjects || {};
    window.KumonSubjects.portugues = {
        title: 'Português',
        icon: 'fa-font',
        color: 'emerald',
        levels: LevelLibrary.portugues,
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
