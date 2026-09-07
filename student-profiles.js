// KumonGen — Motor Canônico de Múltiplos Perfis de Alunos (100% LocalStorage / Zero Backend)
// Resiliente a Tracking Prevention, InPrivate/Incognito, iframes e estilos inline à prova de corte de viewport
(function(window) {
    'use strict';

    const STORAGE_STUDENTS = 'kumongen_students';
    const STORAGE_ACTIVE_ID = 'kumongen_active_student_id';

    // Sanitizador universal rápido de entidades HTML (Defesa contra DOM XSS)
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    if (typeof window !== 'undefined') {
        window.escapeHtml = escapeHtml;
    }

    // SafeStorage: Fallback em memória transparente caso o navegador restrinja o localStorage ou lance QuotaExceededError
    const SafeStorage = {
        _mem: {},
        getItem(key) {
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    const val = window.localStorage.getItem(key);
                    if (val !== null) return val;
                } else if (typeof localStorage !== 'undefined') {
                    const val = localStorage.getItem(key);
                    if (val !== null) return val;
                }
            } catch (e) {
                console.warn('[SafeStorage] Leitura bloqueada pelo navegador, usando fallback em memória para:', key, e);
            }
            return Object.prototype.hasOwnProperty.call(this._mem, key) ? this._mem[key] : null;
        },
        setItem(key, value) {
            const strVal = String(value);
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.setItem(key, strVal);
                    return true;
                } else if (typeof localStorage !== 'undefined') {
                    localStorage.setItem(key, strVal);
                    return true;
                }
            } catch (e) {
                console.warn('[SafeStorage] QuotaExceededError ou restrição de gravação. Fallback em memória ativado para:', key, e);
            }
            this._mem[key] = strVal;
            return false;
        },
        removeItem(key) {
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.removeItem(key);
                } else if (typeof localStorage !== 'undefined') {
                    localStorage.removeItem(key);
                }
            } catch (e) {}
            delete this._mem[key];
        },
        clear() {
            try {
                if (typeof window !== 'undefined' && window.localStorage) {
                    window.localStorage.clear();
                } else if (typeof localStorage !== 'undefined') {
                    localStorage.clear();
                }
            } catch (e) {}
            this._mem = {};
        }
    };

    if (typeof window !== 'undefined') {
        window.SafeStorage = SafeStorage;
    }

    // Presets de mascotes disponíveis para a criança
    const MASCOT_PRESETS = {
        jaguar: { id: 'jaguar', name: 'Jade', title: 'Jaguatirica Ágil', avatar: 'assets/mascotes/jaguar_avatar.png', ring: 'from-amber-400 to-yellow-500' },
        capivara: { id: 'capivara', name: 'Capi', title: 'Capivara Calma', avatar: 'assets/mascotes/capivara_avatar.png', ring: 'from-orange-400 to-amber-600' },
        calango: { id: 'calango', name: 'Lango', title: 'Calango Esperto', avatar: 'assets/mascotes/calango_avatar.png', ring: 'from-emerald-400 to-teal-500' },
        golfinho: { id: 'golfinho', name: 'Finho', title: 'Golfinho Sábio', avatar: 'assets/mascotes/golfinho_avatar.png', ring: 'from-blue-400 to-cyan-500' }
    };

    // Faixas etárias para sincronização com o Wizard
    const AGE_TIERS = {
        'age_4_5': { id: 'age_4_5', label: '4-5 anos', sub: 'Ed. Infantil', emoji: '👶' },
        'age_6_7': { id: 'age_6_7', label: '6-7 anos', sub: '1º Ano', emoji: '🎒' },
        'age_8_9': { id: 'age_8_9', label: '8-9 anos', sub: '2º / 3º Ano', emoji: '📘' },
        'age_10_plus': { id: 'age_10_plus', label: '10+ anos', sub: 'Avançado', emoji: '🚀' }
    };

    // Matriz Canônica dos 25 Níveis Oficiais KumonGen (M1-M10, P1-P8, I1-I7)
    const CURRICULUM_25_LEVELS = {
        matematica: {
            title: 'Matemática',
            color: [37, 99, 235], // Blue-600
            levels: [
                { id: 'm1', code: 'M1', title: 'Quantidade (1 a 5)' },
                { id: 'm2', code: 'M2', title: 'Adição (+1 a +9)' },
                { id: 'm3', code: 'M3', title: 'Sequências Numéricas' },
                { id: 'm4', code: 'M4', title: 'Dezenas (11 a 19)' },
                { id: 'm5', code: 'M5', title: 'Comparação (> < =)' },
                { id: 'm6', code: 'M6', title: 'Subtração (-1 a -9)' },
                { id: 'm7', code: 'M7', title: 'Vizinhos (Antes/Depois)' },
                { id: 'm8', code: 'M8', title: 'Multiplicação (Tabuada)' },
                { id: 'm9', code: 'M9', title: 'Divisão Exata' },
                { id: 'm10', code: 'M10', title: 'Frações Visuais' }
            ]
        },
        portugues: {
            title: 'Português',
            color: [217, 119, 6], // Amber-600
            levels: [
                { id: 'p1', code: 'P1', title: 'Vogais & Sons' },
                { id: 'p2', code: 'P2', title: 'Sílabas Simples' },
                { id: 'p3', code: 'P3', title: 'Letras Faltantes' },
                { id: 'p4', code: 'P4', title: 'Ditado Visual' },
                { id: 'p5', code: 'P5', title: 'Separação Silábica' },
                { id: 'p6', code: 'P6', title: 'Rimas & Fonemas' },
                { id: 'p7', code: 'P7', title: 'Leitura de Frases' },
                { id: 'p8', code: 'P8', title: 'Pontuação Básica' }
            ]
        },
        ingles: {
            title: 'Inglês (ESL)',
            color: [5, 150, 105], // Emerald-600
            levels: [
                { id: 'i1', code: 'I1', title: 'Alphabet & Phonics' },
                { id: 'i2', code: 'I2', title: 'First Words & Colors' },
                { id: 'i3', code: 'I3', title: 'Numbers 1 to 20' },
                { id: 'i4', code: 'I4', title: 'Animals & Nature' },
                { id: 'i5', code: 'I5', title: 'Simple Sentences' },
                { id: 'i6', code: 'I6', title: 'Basic Questions' },
                { id: 'i7', code: 'I7', title: 'Opposites & Pairs' }
            ]
        }
    };

    function _generateId() {
        return 'std_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    }

    // Rotina de migração retrocompatível (executa automaticamente no 1º acesso)
    function _migrateLegacyData() {
        try {
            const existingRaw = SafeStorage.getItem(STORAGE_STUDENTS);
            if (existingRaw) {
                const list = JSON.parse(existingRaw);
                if (Array.isArray(list) && list.length > 0) return list;
            }
        } catch (e) {}

        // Coleta dados legados existentes de forma segura
        const legacyName = SafeStorage.getItem('kumongen_student_name') || 'Super Aluno';
        const legacyMascot = SafeStorage.getItem('kumongen_active_mascot') || 'jaguar';

        let legacyGamification = {
            stars: 0,
            streak: 0,
            bestStreak: 0,
            totalRounds: 0,
            totalCorrect: 0,
            badges: [],
            lastPlayed: null
        };
        try {
            const rawG = SafeStorage.getItem('kumongen_gamification_v3');
            if (rawG) {
                const parsedG = JSON.parse(rawG);
                legacyGamification = Object.assign(legacyGamification, parsedG);
            }
        } catch (e) {}

        let legacyHistory = [];
        try {
            const rawH = SafeStorage.getItem('kumongen_history');
            if (rawH) {
                const parsedH = JSON.parse(rawH);
                if (Array.isArray(parsedH)) legacyHistory = parsedH;
            }
        } catch (e) {}

        const defaultStudent = {
            id: 'std_default',
            name: legacyName,
            ageTier: 'age_6_7',
            mascot: legacyMascot in MASCOT_PRESETS ? legacyMascot : 'jaguar',
            createdAt: new Date().toISOString(),
            gamification: legacyGamification,
            history: legacyHistory,
            mastery: {}
        };

        const initialList = [defaultStudent];
        SafeStorage.setItem(STORAGE_STUDENTS, JSON.stringify(initialList));
        SafeStorage.setItem(STORAGE_ACTIVE_ID, defaultStudent.id);
        _mirrorLegacyKeys(defaultStudent);
        return initialList;
    }

    // Espelha o aluno ativo nas chaves legadas para NUNCA quebrar código antigo
    function _mirrorLegacyKeys(student) {
        if (!student) return;
        try {
            SafeStorage.setItem('kumongen_student_name', student.name);
            SafeStorage.setItem('kumongen_active_mascot', student.mascot || 'jaguar');
            if (student.gamification) {
                SafeStorage.setItem('kumongen_gamification_v3', JSON.stringify(student.gamification));
            }
            if (student.history) {
                SafeStorage.setItem('kumongen_history', JSON.stringify(student.history));
            }
        } catch (e) {
            console.warn('[StudentProfileEngine] Erro ao espelhar chaves legadas:', e);
        }
    }

    function _notifyChange(student) {
        _mirrorLegacyKeys(student);
        try {
            window.dispatchEvent(new CustomEvent('kumongen:student_changed', { detail: { student } }));
        } catch (e) {}
    }

    const StudentProfileEngine = {
        MASCOTS: MASCOT_PRESETS,
        AGE_TIERS: AGE_TIERS,

        getAll() {
            let raw = null;
            try {
                raw = SafeStorage.getItem(STORAGE_STUDENTS);
                if (!raw) return _migrateLegacyData();
                const list = JSON.parse(raw);
                if (!Array.isArray(list) || list.length === 0) return _migrateLegacyData();
                return list;
            } catch (e) {
                console.error('[StudentProfileEngine] Falha de integridade em STORAGE_STUDENTS! Isolando em quarentena:', e);
                try {
                    if (raw) {
                        SafeStorage.setItem(`kumongen_students_corrupted_bak_${Date.now()}`, raw);
                    }
                } catch (bakErr) {}
                return _migrateLegacyData();
            }
        },

        getById(id) {
            const list = this.getAll();
            return list.find(s => s.id === id) || null;
        },

        getActive() {
            const list = this.getAll();
            const activeId = SafeStorage.getItem(STORAGE_ACTIVE_ID);
            let student = list.find(s => s.id === activeId);
            if (!student && list.length > 0) {
                student = list[0];
                this.setActive(student.id);
            }
            return student;
        },

        setActive(id) {
            const list = this.getAll();
            const student = list.find(s => s.id === id);
            if (!student) return null;
            SafeStorage.setItem(STORAGE_ACTIVE_ID, student.id);
            _notifyChange(student);
            return student;
        },

        create({ name, ageTier = 'age_6_7', mascot = 'jaguar' }) {
            const trimmedName = (name || '').trim();
            if (!trimmedName) return null;

            const list = this.getAll();
            const newStudent = {
                id: _generateId(),
                name: trimmedName,
                ageTier: ageTier in AGE_TIERS ? ageTier : 'age_6_7',
                mascot: mascot in MASCOT_PRESETS ? mascot : 'jaguar',
                createdAt: new Date().toISOString(),
                gamification: {
                    stars: 0,
                    streak: 0,
                    bestStreak: 0,
                    totalRounds: 0,
                    totalCorrect: 0,
                    badges: [],
                    lastPlayed: null
                },
                history: []
            };

            list.push(newStudent);
            SafeStorage.setItem(STORAGE_STUDENTS, JSON.stringify(list));
            this.setActive(newStudent.id);
            return newStudent;
        },

        update(id, fields) {
            const list = this.getAll();
            const idx = list.findIndex(s => s.id === id);
            if (idx === -1) return null;

            const student = list[idx];
            if (fields.name) student.name = fields.name.trim();
            if (fields.ageTier && fields.ageTier in AGE_TIERS) student.ageTier = fields.ageTier;
            if (fields.mascot && fields.mascot in MASCOT_PRESETS) student.mascot = fields.mascot;

            list[idx] = student;
            SafeStorage.setItem(STORAGE_STUDENTS, JSON.stringify(list));

            const activeId = SafeStorage.getItem(STORAGE_ACTIVE_ID);
            if (activeId === id) {
                _notifyChange(student);
            }
            return student;
        },

        deleteStudent(id) {
            let list = this.getAll();
            if (list.length <= 1) {
                alert('É necessário manter pelo menos um perfil cadastrado.');
                return false;
            }

            list = list.filter(s => s.id !== id);
            SafeStorage.setItem(STORAGE_STUDENTS, JSON.stringify(list));

            const activeId = SafeStorage.getItem(STORAGE_ACTIVE_ID);
            if (activeId === id) {
                this.setActive(list[0].id);
            }
            return true;
        },

        // Atualiza a gamificação do aluno ativo
        updateActiveGamification(updaterFn) {
            const active = this.getActive();
            if (!active) return null;
            const updatedGamification = updaterFn(active.gamification || {});
            active.gamification = updatedGamification;

            const list = this.getAll();
            const idx = list.findIndex(s => s.id === active.id);
            if (idx !== -1) {
                list[idx] = active;
                SafeStorage.setItem(STORAGE_STUDENTS, JSON.stringify(list));
            }
            _mirrorLegacyKeys(active);
            return active.gamification;
        },

        // Adiciona registro ao histórico do aluno ativo
        addActiveHistoryItem(taskItem) {
            const active = this.getActive();
            if (!active) return;
            active.history = active.history || [];
            active.history.unshift(taskItem);
            active.history = active.history.slice(0, 50);

            const list = this.getAll();
            const idx = list.findIndex(s => s.id === active.id);
            if (idx !== -1) {
                list[idx] = active;
                SafeStorage.setItem(STORAGE_STUDENTS, JSON.stringify(list));
            }
            _mirrorLegacyKeys(active);
        },

        // Exportação de Backup JSON
        exportBackup() {
            const active = this.getActive();
            const data = {
                app: 'KumonGen',
                version: '4.4.0',
                exportedAt: new Date().toISOString(),
                activeStudentId: active ? active.id : SafeStorage.getItem(STORAGE_ACTIVE_ID),
                students: this.getAll()
            };

            const jsonStr = JSON.stringify(data, null, 2);
            if (typeof document !== 'undefined' && typeof Blob !== 'undefined' && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
                const blob = new Blob([jsonStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                const dateStr = new Date().toISOString().slice(0, 10);
                a.href = url;
                a.download = `kumongen_backup_${dateStr}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
            return data;
        },

        // Importação e Restauração Segura de Backup JSON com Validação Estrita de Schema
        importBackup(jsonInput) {
            try {
                if (!jsonInput) {
                    return { success: false, error: 'Arquivo inválido ou vazio.' };
                }
                let data = null;
                if (typeof jsonInput === 'string') {
                    data = JSON.parse(jsonInput);
                } else if (typeof jsonInput === 'object') {
                    data = jsonInput;
                } else {
                    return { success: false, error: 'Formato de backup inválido.' };
                }

                if (!data || typeof data !== 'object') {
                    return { success: false, error: 'Estrutura JSON inválida.' };
                }
                if (!Array.isArray(data.students) || data.students.length === 0) {
                    return { success: false, error: 'Nenhum estudante válido localizado no arquivo de backup.' };
                }

                // Validação, sanitização e normalização estrita de cada perfil
                const validatedStudents = data.students.map(s => {
                    const cleanName = escapeHtml(String(s.name || 'Aluno').slice(0, 25).trim());
                    return {
                        id: (typeof s.id === 'string' && s.id.startsWith('std_')) ? s.id : _generateId(),
                        name: cleanName || 'Aluno',
                        ageTier: (s.ageTier in AGE_TIERS) ? s.ageTier : 'age_6_7',
                        mascot: (s.mascot in MASCOT_PRESETS) ? s.mascot : 'jaguar',
                        createdAt: typeof s.createdAt === 'string' ? s.createdAt : new Date().toISOString(),
                        gamification: (s.gamification && typeof s.gamification === 'object') ? {
                            stars: Number.isInteger(s.gamification.stars) ? Math.max(0, s.gamification.stars) : 0,
                            streak: Number.isInteger(s.gamification.streak) ? Math.max(0, s.gamification.streak) : 0,
                            bestStreak: Number.isInteger(s.gamification.bestStreak) ? Math.max(0, s.gamification.bestStreak) : 0,
                            totalRounds: Number.isInteger(s.gamification.totalRounds) ? Math.max(0, s.gamification.totalRounds) : 0,
                            totalCorrect: Number.isInteger(s.gamification.totalCorrect) ? Math.max(0, s.gamification.totalCorrect) : 0,
                            badges: Array.isArray(s.gamification.badges) ? s.gamification.badges.slice(0, 50) : [],
                            lastPlayed: typeof s.gamification.lastPlayed === 'string' ? s.gamification.lastPlayed : null
                        } : { stars: 0, streak: 0, bestStreak: 0, totalRounds: 0, totalCorrect: 0, badges: [], lastPlayed: null },
                        history: Array.isArray(s.history) ? s.history.slice(0, 50) : [],
                        mastery: (s.mastery && typeof s.mastery === 'object') ? s.mastery : {}
                    };
                });

                SafeStorage.setItem(STORAGE_STUDENTS, JSON.stringify(validatedStudents));
                if (data.activeStudentId && validatedStudents.some(s => s.id === data.activeStudentId)) {
                    this.setActive(data.activeStudentId);
                } else {
                    this.setActive(validatedStudents[0].id);
                }

                return { success: true, count: validatedStudents.length };
            } catch (err) {
                return { success: false, error: 'Erro no processamento do backup: ' + err.message };
            }
        },

        // Registra maestria de um nível curricular (Gauntlet Kumon 100%)
        recordLevelMastery(subjectKey, levelId, stats = {}) {
            const active = this.getActive();
            if (!active) return null;
            active.mastery = active.mastery || {};
            active.mastery[subjectKey] = active.mastery[subjectKey] || {};

            const prev = active.mastery[subjectKey][levelId] || {};
            const bestTime = prev.bestTimeSec ? Math.min(prev.bestTimeSec, stats.timeSec || 9999) : (stats.timeSec || null);
            const timesCompleted = (prev.timesCompleted || 0) + 1;

            active.mastery[subjectKey][levelId] = {
                mastered: true,
                mastered100: true,
                lastMasteredAt: new Date().toISOString(),
                bestTimeSec: bestTime,
                targetSec: stats.targetSec || prev.targetSec || 300,
                bestAccuracy: Math.max(prev.bestAccuracy || 0, stats.accuracy || 100),
                timesCompleted: timesCompleted,
                lastGauntletCycles: stats.gauntletCycles || 0
            };

            const list = this.getAll();
            const idx = list.findIndex(s => s.id === active.id);
            if (idx !== -1) {
                list[idx] = active;
                SafeStorage.setItem(STORAGE_STUDENTS, JSON.stringify(list));
            }
            _mirrorLegacyKeys(active);
            return active.mastery;
        },

        // Conta quantos níveis o aluno já dominou (de 25 possíveis)
        getMasteryCount(student) {
            const s = student || this.getActive();
            if (!s || !s.mastery) return 0;
            let count = 0;
            for (const sub of Object.keys(s.mastery)) {
                for (const lvl of Object.keys(s.mastery[sub])) {
                    if (s.mastery[sub][lvl] && s.mastery[sub][lvl].mastered) {
                        count++;
                    }
                }
            }
            return count;
        },

        // Abre diretamente a visão do Boletim de Evolução & Histórico
        showEvolutionModal(studentId = null) {
            this.showProfileModal({
                initialView: 'evolution',
                studentId: studentId
            });
        },

        // Emite o Boletim Oficial Consolidado em PDF (A4 Paisagem com a matriz dos 25 Níveis)
        async generateMasteryReportPDF(studentId) {
            const student = studentId ? this.getById(studentId) : this.getActive();
            if (!student) {
                alert('Perfil de aluno não encontrado.');
                return;
            }

            let jsPDFClass = window.jspdf ? window.jspdf.jsPDF : null;
            if (!jsPDFClass && window.KumonGen && window.KumonGen.loadScript) {
                try {
                    await window.KumonGen.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
                    jsPDFClass = window.jspdf ? window.jspdf.jsPDF : null;
                } catch (e) {
                    console.error('Falha ao carregar jsPDF:', e);
                }
            }

            if (!jsPDFClass) {
                alert('Não foi possível carregar o módulo de PDF no momento. Verifique sua conexão com a internet.');
                return;
            }

            const doc = new jsPDFClass({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // 1. Fundo Nobre Marfim Suave
            doc.setFillColor(255, 255, 253);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');

            // 2. Borda Externa Dourada Nobre
            doc.setDrawColor(205, 162, 40); // Ouro clássico
            doc.setLineWidth(2.0);
            doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

            // 3. Moldura Interna Fina Azul Marinho
            doc.setDrawColor(30, 41, 59); // Slate-800
            doc.setLineWidth(0.5);
            doc.rect(12.5, 12.5, pageWidth - 25, pageHeight - 25);

            // 4. Cantoneiras Decorativas nos 4 Cantos
            const cOffset = 12.5;
            const cSize = 6;
            doc.setDrawColor(205, 162, 40);
            doc.setLineWidth(1.0);
            // Sup Esq
            doc.line(cOffset, cOffset + cSize, cOffset, cOffset);
            doc.line(cOffset, cOffset, cOffset + cSize, cOffset);
            // Sup Dir
            doc.line(pageWidth - cOffset, cOffset + cSize, pageWidth - cOffset, cOffset);
            doc.line(pageWidth - cOffset, cOffset, pageWidth - cOffset - cSize, cOffset);
            // Inf Esq
            doc.line(cOffset, pageHeight - cOffset - cSize, cOffset, pageHeight - cOffset);
            doc.line(cOffset, pageHeight - cOffset, cOffset + cSize, pageHeight - cOffset);
            // Inf Dir
            doc.line(pageWidth - cOffset, pageHeight - cOffset - cSize, pageWidth - cOffset, pageHeight - cOffset);
            doc.line(pageWidth - cOffset, pageHeight - cOffset, pageWidth - cOffset - cSize, pageHeight - cOffset);

            // Pontos Dourados de Enfeite
            doc.setFillColor(205, 162, 40);
            doc.circle(cOffset + 2, cOffset + 2, 0.9, 'F');
            doc.circle(pageWidth - cOffset - 2, cOffset + 2, 0.9, 'F');
            doc.circle(cOffset + 2, pageHeight - cOffset - 2, 0.9, 'F');
            doc.circle(pageWidth - cOffset - 2, pageHeight - cOffset - 2, 0.9, 'F');

            // 5. Cabeçalho Oficial
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(37, 99, 235);
            doc.setFontSize(13);
            doc.text('KUMONGEN 4.0 · BOLETIM OFICIAL DE MAESTRIA & PROGRESSÃO', pageWidth / 2, 19, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text('SISTEMA INTEGRADO DE AUTONOMIA & EXCELÊNCIA PEDAGÓGICA (MÉTODO AUTOINSTRUTIVO)', pageWidth / 2, 23, { align: 'center' });

            // 6. Dados do Aluno em Faixa Nobre
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.4);
            doc.roundedRect(15, 26, pageWidth - 30, 13, 2.5, 2.5, 'FD');

            const mascotInfo = MASCOT_PRESETS[student.mascot] || MASCOT_PRESETS.jaguar;
            const ageInfo = AGE_TIERS[student.ageTier] || AGE_TIERS.age_6_7;
            const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

            // Nome do Aluno
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text(`ALUNO(A): ${student.name.toUpperCase()}`, 20, 33);

            // Faixa Etária / Mascote / Emissão
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(71, 85, 105);
            doc.text(`Faixa: ${ageInfo.label} (${ageInfo.sub})   |   Mascote: ${mascotInfo.name} (${mascotInfo.title})   |   Data de Emissão: ${today}`, 20, 37);

            // 7. Cartões de Métricas Resumo
            const masteredCount = StudentProfileEngine.getMasteryCount(student);
            const percent = Math.round((masteredCount / 25) * 100);
            const stars = (student.gamification && student.gamification.stars) || 0;
            const streak = (student.gamification && student.gamification.streak) || 0;
            const rounds = (student.gamification && student.gamification.totalRounds) || 0;

            const historyList = Array.isArray(student.history) ? student.history : [];
            const tabletRounds = historyList.filter(h => h.accuracy !== undefined || h.type === 'tablet_round');
            const sctItems = tabletRounds.filter(h => h.timeSec && h.targetSec);
            const sctBeatenCount = sctItems.filter(h => h.timeSec <= h.targetSec).length;
            const sctRate = sctItems.length > 0 ? Math.round((sctBeatenCount / sctItems.length) * 100) : (rounds > 0 ? 100 : null);

            const metricCards = [
                { label: 'NÍVEIS CONQUISTADOS', val: `${masteredCount} de 25 (${percent}%)`, color: [16, 185, 129] },
                { label: 'RITMO FLUENTE SCT', val: sctRate !== null ? `${sctRate}% no tempo` : `${rounds} rodadas`, color: [59, 130, 246] },
                { label: 'OFENSIVA & ESTRELAS', val: `${streak}d seguidos · ★ ${stars}`, color: [245, 158, 11] },
                { label: 'STATUS PEDAGÓGICO', val: masteredCount >= 20 ? 'MESTRE PLENO' : (masteredCount >= 10 ? 'AVANÇADO' : 'EM PROGRESSO'), color: [147, 51, 234] }
            ];

            const cardY = 42;
            const cardH = 11;
            const totalCards = 4;
            const cardGap = 4;
            const cardW = (pageWidth - 30 - ((totalCards - 1) * cardGap)) / totalCards;

            metricCards.forEach((c, idx) => {
                const cX = 15 + idx * (cardW + cardGap);
                doc.setFillColor(255, 255, 255);
                doc.setDrawColor(226, 232, 240);
                doc.setLineWidth(0.3);
                doc.roundedRect(cX, cardY, cardW, cardH, 2, 2, 'FD');

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8.5);
                doc.setTextColor(c.color[0], c.color[1], c.color[2]);
                doc.text(c.val, cX + cardW / 2, cardY + 5, { align: 'center' });

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(5.8);
                doc.setTextColor(100, 116, 139);
                doc.text(c.label, cX + cardW / 2, cardY + 9, { align: 'center' });
            });

            // 8. Matriz dos 25 Níveis (3 Colunas Lado a Lado)
            const colY = 56;
            const colW = 86;
            const colGap = 4.5;
            const colStartX = 15;

            const subjectsKeys = ['matematica', 'portugues', 'ingles'];

            subjectsKeys.forEach((sKey, sIdx) => {
                const subData = CURRICULUM_25_LEVELS[sKey];
                const colX = colStartX + sIdx * (colW + colGap);

                const subMastery = (student.mastery && student.mastery[sKey]) || {};
                const subMasteredCount = subData.levels.filter(lvl => subMastery[lvl.id] && subMastery[lvl.id].mastered).length;

                // Cabeçalho da Coluna
                doc.setFillColor(subData.color[0], subData.color[1], subData.color[2]);
                doc.roundedRect(colX, colY, colW, 6.5, 1.5, 1.5, 'F');

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7.5);
                doc.setTextColor(255, 255, 255);
                doc.text(`${subData.title.toUpperCase()} (${subData.levels.length} Níveis)`, colX + 4, colY + 4.5);

                doc.setFontSize(6.8);
                doc.text(`${subMasteredCount}/${subData.levels.length} dominados`, colX + colW - 4, colY + 4.5, { align: 'right' });

                // Linhas de Níveis
                let rowY = colY + 8;
                const rowH = 9.8;
                const rowGap = 1.4;

                subData.levels.forEach((lvl) => {
                    const isDone = subMastery[lvl.id] && subMastery[lvl.id].mastered;
                    const stats = subMastery[lvl.id] || {};

                    if (isDone) {
                        doc.setFillColor(240, 253, 244); // emerald-50
                        doc.setDrawColor(187, 247, 208); // emerald-200
                    } else {
                        doc.setFillColor(248, 250, 252); // slate-50
                        doc.setDrawColor(226, 232, 240); // slate-200
                    }
                    doc.setLineWidth(0.3);
                    doc.roundedRect(colX, rowY, colW, rowH, 1.5, 1.5, 'FD');

                    // Badge do Código (M1, P1, etc.)
                    if (isDone) {
                        doc.setFillColor(16, 185, 129); // emerald-500
                        doc.setTextColor(255, 255, 255);
                    } else {
                        doc.setFillColor(203, 213, 225); // slate-300
                        doc.setTextColor(71, 85, 105);
                    }
                    doc.roundedRect(colX + 2, rowY + 1.8, 8.5, 6.2, 1, 1, 'F');
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(6.5);
                    doc.text(lvl.code, colX + 6.25, rowY + 6, { align: 'center' });

                    // Título do Nível
                    doc.setFont('helvetica', isDone ? 'bold' : 'normal');
                    doc.setFontSize(7);
                    doc.setTextColor(isDone ? 15 : 71, isDone ? 23 : 85, isDone ? 42 : 105);
                    doc.text(lvl.title, colX + 12, rowY + 6);

                    // Selo de Status à Direita
                    if (isDone) {
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(5.5);
                        doc.setTextColor(5, 150, 105); // emerald-600
                        let timeStr = '';
                        if (stats.bestTimeSec) {
                            const tm = Math.floor(stats.bestTimeSec / 60);
                            const ts = stats.bestTimeSec % 60;
                            timeStr = ` (${tm}:${String(ts).padStart(2, '0')})`;
                        }
                        doc.text(`DOMINADO 100%${timeStr}`, colX + colW - 3, rowY + 6, { align: 'right' });
                    } else {
                        doc.setFont('helvetica', 'normal');
                        doc.setFontSize(5.5);
                        doc.setTextColor(148, 163, 184); // slate-400
                        doc.text('EM TREINO', colX + colW - 3, rowY + 6, { align: 'right' });
                    }

                    rowY += rowH + rowGap;
                });
            });

            // 9. Linhas de Assinatura & Chancela no Rodapé
            const sigY = 186;
            const sigLineW = 60;
            const sigLeftX = 25;
            const sigRightX = pageWidth - 25 - sigLineW;

            doc.setDrawColor(148, 163, 184);
            doc.setLineWidth(0.4);

            // Linha Orientador
            doc.line(sigLeftX, sigY, sigLeftX + sigLineW, sigY);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text('Responsável / Orientador(a)', sigLeftX + sigLineW / 2, sigY + 3.5, { align: 'center' });

            // Selo Central Oficial
            const sealX = pageWidth / 2;
            const sealY = sigY - 2;
            doc.setFillColor(205, 162, 40);
            doc.circle(sealX, sealY, 9.5, 'F');
            doc.setFillColor(254, 249, 195);
            doc.circle(sealX, sealY, 8, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(5.5);
            doc.setTextColor(146, 64, 14);
            doc.text('CHANCELA', sealX, sealY - 0.8, { align: 'center' });
            doc.setFontSize(4);
            doc.setTextColor(180, 83, 9);
            doc.text('MAESTRIA', sealX, sealY + 2.5, { align: 'center' });

            // Linha KumonGen
            doc.line(sigRightX, sigY, sigRightX + sigLineW, sigY);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text('KumonGen 4.0 · Autenticação Pedagógica', sigRightX + sigLineW / 2, sigY + 3.5, { align: 'center' });

            // 10. Rodapé Fim
            doc.setFontSize(6.5);
            doc.setTextColor(148, 163, 184);
            doc.text(`Registro Oficial: KM-BOLETIM-${Date.now().toString(36).toUpperCase()} · Acompanhamento de Fluência e Domínio KumonGen.`, pageWidth / 2, pageHeight - 14, { align: 'center' });

            const safeName = (student.name || 'Aluno').replace(/[^a-zA-Z0-9]/g, '_');
            const fileName = `Boletim_Maestria_Kumon_${safeName}.pdf`;

            try {
                doc.save(fileName);
            } catch (saveErr) {
                console.warn('doc.save falhou, fallback para blob', saveErr);
                const blob = doc.output('blob');
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
            }

            return doc;
        },

        // Emite o Diploma Oficial de Honra ao Mérito / Maestria em PDF (A4 Paisagem)
        async generateMasteryCertificatePDF(studentId, options = {}) {
            let student = studentId ? this.getById(studentId) : this.getActive();
            if (!student && options.studentName) {
                student = {
                    name: options.studentName,
                    mascot: 'jaguar',
                    ageTier: 'age_6_7',
                    gamification: { stars: options.starsEarned || 0, streak: 1, totalRounds: 1 },
                    history: []
                };
            }
            if (!student) {
                alert('Perfil de aluno não encontrado.');
                return null;
            }

            let jsPDFClass = window.jspdf ? window.jspdf.jsPDF : null;
            if (!jsPDFClass && window.KumonGen && window.KumonGen.loadScript) {
                try {
                    await window.KumonGen.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
                    jsPDFClass = window.jspdf ? window.jspdf.jsPDF : null;
                } catch (e) {
                    console.error('Falha ao carregar jsPDF:', e);
                }
            }

            if (!jsPDFClass) {
                alert('Não foi possível carregar o módulo de PDF no momento. Verifique sua conexão com a internet.');
                return null;
            }

            const doc = new jsPDFClass({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // 1. Fundo Nobre Marfim Suave
            doc.setFillColor(255, 255, 253);
            doc.rect(0, 0, pageWidth, pageHeight, 'F');

            // 2. Borda Externa Dourada Nobre
            doc.setDrawColor(205, 162, 40); // Ouro clássico #CDA228
            doc.setLineWidth(2.2);
            doc.rect(13, 13, pageWidth - 26, pageHeight - 26);

            // 3. Moldura Interna Fina Azul Marinho
            doc.setDrawColor(30, 41, 59); // Slate-800
            doc.setLineWidth(0.6);
            doc.rect(16.5, 16.5, pageWidth - 33, pageHeight - 33);

            // 4. Cantoneiras e Detalhes Decorativos nos 4 Cantos
            const cOffset = 16.5;
            const cSize = 7;
            doc.setDrawColor(205, 162, 40);
            doc.setLineWidth(1.2);

            // Cantoneiras nos 4 cantos
            doc.line(cOffset, cOffset + cSize, cOffset, cOffset);
            doc.line(cOffset, cOffset, cOffset + cSize, cOffset);

            doc.line(pageWidth - cOffset, cOffset + cSize, pageWidth - cOffset, cOffset);
            doc.line(pageWidth - cOffset, cOffset, pageWidth - cOffset - cSize, cOffset);

            doc.line(cOffset, pageHeight - cOffset - cSize, cOffset, pageHeight - cOffset);
            doc.line(cOffset, pageHeight - cOffset, cOffset + cSize, pageHeight - cOffset);

            doc.line(pageWidth - cOffset, pageHeight - cOffset - cSize, pageWidth - cOffset, pageHeight - cOffset);
            doc.line(pageWidth - cOffset, pageHeight - cOffset, pageWidth - cOffset - cSize, pageHeight - cOffset);

            // Pontos Dourados de Enfeite nos Cantos
            doc.setFillColor(205, 162, 40);
            doc.circle(cOffset + 2.5, cOffset + 2.5, 1.2, 'F');
            doc.circle(pageWidth - cOffset - 2.5, cOffset + 2.5, 1.2, 'F');
            doc.circle(cOffset + 2.5, pageHeight - cOffset - 2.5, 1.2, 'F');
            doc.circle(pageWidth - cOffset - 2.5, pageHeight - cOffset - 2.5, 1.2, 'F');

            // 5. Cabeçalho Institucional
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(37, 99, 235); // Blue-600
            doc.setFontSize(11);
            doc.text('KUMONGEN · SISTEMA DE EXCELÊNCIA PEDAGÓGICA AUTOINSTRUTIVA', pageWidth / 2, 26, { align: 'center' });

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139); // Slate-500
            doc.text('MÉTODO DE ESTUDO DIÁRIO AUTOINSTRUTIVO · DESENVOLVIMENTO DE POTENCIAL MÁXIMO', pageWidth / 2, 31, { align: 'center' });

            // 6. Título Nobre do Diploma
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(26);
            doc.setTextColor(15, 23, 42); // Slate-900
            doc.text('DIPLOMA DE HONRA AO MÉRITO', pageWidth / 2, 45, { align: 'center' });

            // Linha dourada central sob o título com ornamento
            doc.setDrawColor(205, 162, 40);
            doc.setLineWidth(1.0);
            doc.line(pageWidth / 2 - 40, 49, pageWidth / 2 + 40, 49);
            doc.circle(pageWidth / 2, 49, 1.2, 'F');

            // Subtítulo Cerimonial
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(180, 83, 9); // Amber-700
            doc.text('CERTIFICADO DE MAESTRIA, AUTONOMIA & DEDICAÇÃO EXEMPLAR', pageWidth / 2, 54, { align: 'center' });

            // 7. Texto introdutório cerimonial
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(11);
            doc.setTextColor(71, 85, 105); // Slate-600
            doc.text('Certificamos com louvor e reconhecimento que o(a) aluno(a)', pageWidth / 2, 63, { align: 'center' });

            // 8. Nome do Aluno (com auto-redimensionamento dinâmico seguro)
            const studentRawName = options.studentName || student.name || 'SUPER ALUNO';
            const studentName = String(studentRawName).toUpperCase().trim();
            let nameFontSize = 24;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(nameFontSize);
            let nameW = doc.getTextWidth(studentName);
            while (nameW > 180 && nameFontSize > 13) {
                nameFontSize -= 1;
                doc.setFontSize(nameFontSize);
                nameW = doc.getTextWidth(studentName);
            }
            doc.setTextColor(30, 58, 138); // Deep Blue nobre
            doc.text(studentName, pageWidth / 2, 75, { align: 'center' });

            // Linha decorativa sob o nome do aluno
            const underlineW = Math.min(140, Math.max(70, nameW + 16));
            doc.setDrawColor(203, 213, 225); // Slate-300
            doc.setLineWidth(0.6);
            doc.line(pageWidth / 2 - underlineW / 2, 78, pageWidth / 2 + underlineW / 2, 78);

            // 9. Conquista / Domínio (Específico por Nível ou Consolidado Geral)
            const hasLevel = !!options.levelTitle;
            const masteredCount = StudentProfileEngine.getMasteryCount(student);
            const percent = Math.round((masteredCount / 25) * 100);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10.5);
            doc.setTextColor(71, 85, 105);

            let achievementText = '';
            if (hasLevel) {
                doc.text('concluiu com êxito os desafios de fluência e autonomia no módulo:', pageWidth / 2, 87, { align: 'center' });
                achievementText = `${options.levelTitle} · ${options.subjectTitle || 'KumonGen'}`;
            } else {
                doc.text('demonstrou autodisciplina e consistência no programa autoinstrutivo, conquistando:', pageWidth / 2, 87, { align: 'center' });
                achievementText = masteredCount > 0
                    ? `${masteredCount} Níveis Dominados (${percent}% do Currículo KumonGen)`
                    : 'Excelência e Dedicação na Jornada de Aprendizado Autoinstrutivo';
            }

            let achFontSize = 15;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(achFontSize);
            let achW = doc.getTextWidth(achievementText);
            while (achW > 190 && achFontSize > 11) {
                achFontSize -= 1;
                doc.setFontSize(achFontSize);
                achW = doc.getTextWidth(achievementText);
            }
            doc.setTextColor(15, 23, 42);
            doc.text(achievementText, pageWidth / 2, 95, { align: 'center' });

            // 10. Três Cartões de Métricas (Grid Modular Perfeito)
            const cardW = 60;
            const cardH = 19;
            const cardGap = 8;
            const totalGridW = (cardW * 3) + (cardGap * 2);
            const gridStartX = (pageWidth - totalGridW) / 2;
            const gridY = 103;

            let metricsData = [];
            if (hasLevel) {
                const isMastered = options.isGauntletMastered || options.accuracy === 100;
                metricsData = [
                    {
                        label: isMastered ? 'MAESTRIA KUMON' : 'PRECISÃO',
                        val: isMastered ? '100%' : `${options.accuracy || 100}%`,
                        sub: isMastered ? `1ª tent: ${options.accuracy || 100}%` : 'Acertos na 1ª tentativa',
                        color: [16, 185, 129]
                    },
                    {
                        label: 'TEMPO SCT',
                        val: options.timeFormatted || 'No Ritmo',
                        sub: options.targetFormatted ? `Meta: ${options.targetFormatted}` : 'Tempo ideal superado',
                        color: [59, 130, 246]
                    },
                    {
                        label: 'ESTRELAS',
                        val: `+${options.starsEarned || 10} ★`,
                        sub: 'Conquistadas na sessão',
                        color: [245, 158, 11]
                    }
                ];
            } else {
                const historyList = Array.isArray(student.history) ? student.history : [];
                const tabletRounds = historyList.filter(h => h.accuracy !== undefined || h.type === 'tablet_round');
                const sctItems = tabletRounds.filter(h => h.timeSec && h.targetSec);
                const sctBeatenCount = sctItems.filter(h => h.timeSec <= h.targetSec).length;
                const sctRate = sctItems.length > 0 ? Math.round((sctBeatenCount / sctItems.length) * 100) : (student.gamification?.totalRounds > 0 ? 100 : null);
                const streak = (student.gamification && student.gamification.streak) || 0;
                const stars = (student.gamification && student.gamification.stars) || 0;

                metricsData = [
                    {
                        label: 'MAESTRIA CURRICULAR',
                        val: `${masteredCount} de 25`,
                        sub: `${percent}% do programa dominado`,
                        color: [16, 185, 129]
                    },
                    {
                        label: 'RITMO FLUENTE SCT',
                        val: sctRate !== null ? `${sctRate}%` : '100%',
                        sub: `${sctBeatenCount} rodadas no tempo ideal`,
                        color: [59, 130, 246]
                    },
                    {
                        label: 'OFENSIVA & ESTRELAS',
                        val: `${streak} Dias`,
                        sub: `★ ${stars} estrelas acumuladas`,
                        color: [245, 158, 11]
                    }
                ];
            }

            metricsData.forEach((m, i) => {
                const cX = gridStartX + i * (cardW + cardGap);
                doc.setFillColor(248, 250, 252);
                doc.roundedRect(cX, gridY, cardW, cardH, 2.5, 2.5, 'F');
                doc.setDrawColor(226, 232, 240);
                doc.setLineWidth(0.4);
                doc.roundedRect(cX, gridY, cardW, cardH, 2.5, 2.5, 'D');

                // Valor
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12.5);
                doc.setTextColor(m.color[0], m.color[1], m.color[2]);
                doc.text(m.val, cX + cardW / 2, gridY + 7.5, { align: 'center' });

                // Rótulo
                doc.setFontSize(6.8);
                doc.setTextColor(30, 41, 59);
                doc.text(m.label, cX + cardW / 2, gridY + 12.2, { align: 'center' });

                // Subtítulo
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(6.2);
                doc.setTextColor(100, 116, 139);
                doc.text(m.sub, cX + cardW / 2, gridY + 16, { align: 'center' });
            });

            // 11. Selo de Honra com Fitas Cerimoniais
            const sealX = pageWidth / 2;
            const sealY = 138;

            // Fitas da medalha
            const isAmber = options.isGauntletMastered || !hasLevel;
            doc.setFillColor(isAmber ? 217 : 37, isAmber ? 119 : 99, isAmber ? 6 : 235);
            doc.triangle(sealX - 7, sealY + 7, sealX - 3, sealY + 18, sealX - 11, sealY + 20, 'F');
            doc.triangle(sealX + 7, sealY + 7, sealX + 3, sealY + 18, sealX + 11, sealY + 20, 'F');

            // Círculo Ouro Externo
            doc.setFillColor(205, 162, 40);
            doc.circle(sealX, sealY, 11.5, 'F');
            // Círculo Interno Marfim
            doc.setFillColor(254, 249, 195);
            doc.circle(sealX, sealY, 9.5, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.8);
            doc.setTextColor(146, 64, 14);
            const sealTitle = hasLevel ? (options.isGauntletMastered ? 'MAESTRIA' : 'EXCELÊNCIA') : 'HONRA';
            doc.text(sealTitle, sealX, sealY - 0.5, { align: 'center' });
            doc.setFontSize(4.5);
            doc.setTextColor(180, 83, 9);
            const sealSubtitle = hasLevel ? 'KUMONGEN' : 'AO MÉRITO';
            doc.text(sealSubtitle, sealX, sealY + 3.2, { align: 'center' });

            // Menção ao Mascote Companheiro
            const mascotInfo = (typeof MASCOT_PRESETS !== 'undefined' && MASCOT_PRESETS[student.mascot]) ? MASCOT_PRESETS[student.mascot] : { name: 'Jade', title: 'A Jaguatirica da Agilidade' };
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text(`Companheiro(a) de Jornada: ${mascotInfo.name} (${mascotInfo.title})`, pageWidth / 2, 157, { align: 'center' });

            // 12. Linhas de Assinatura
            const sigY = 171;
            const sigLineW = 62;
            const sigLeftX = 35;
            const sigRightX = pageWidth - 35 - sigLineW;

            doc.setDrawColor(148, 163, 184);
            doc.setLineWidth(0.45);

            // Assinatura Orientador
            doc.line(sigLeftX, sigY, sigLeftX + sigLineW, sigY);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text('Responsável / Orientador(a)', sigLeftX + sigLineW / 2, sigY + 4, { align: 'center' });

            // Assinatura KumonGen
            doc.line(sigRightX, sigY, sigRightX + sigLineW, sigY);
            doc.text('KumonGen 4.0 · Autenticação Pedagógica', sigRightX + sigLineW / 2, sigY + 4, { align: 'center' });

            // 13. Rodapé Oficial
            const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
            const certCode = 'KM-CERT-' + Date.now().toString(36).toUpperCase();
            doc.setFontSize(6.8);
            doc.setTextColor(148, 163, 184);
            doc.text(`Emitido em ${today} · Autenticação Digital: ${certCode} · Documento Oficial KumonGen`, pageWidth / 2, pageHeight - 20, { align: 'center' });

            const safeName = (student.name || options.studentName || 'Aluno').replace(/[^a-zA-Z0-9]/g, '_');
            const suffix = options.levelId ? `_${options.levelId}` : '_Geral';
            const pdfFileName = `Diploma_Kumon_${safeName}${suffix}.pdf`;

            try {
                doc.save(pdfFileName);
            } catch (saveErr) {
                console.warn('doc.save falhou, tentando fallback via Blob:', saveErr);
                const blob = doc.output('blob');
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = pdfFileName;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(blobUrl);
                }, 1000);
            }

            return doc;
        },

        // Modal Interativo: "Quem vai treinar hoje?"
        showProfileModal(options = {}) {
            const existing = document.getElementById('studentProfileManagerModal');
            if (existing) existing.remove();

            // Modal backdrop com overflow-y: auto para nunca cortar em telas pequenas
            const modal = document.createElement('div');
            modal.id = 'studentProfileManagerModal';
            modal.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,0.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);overflow-y:auto;touch-action:manipulation;box-sizing:border-box;';

            const closeModal = () => {
                document.removeEventListener('keydown', escListener);
                if (modal && modal.parentNode) {
                    modal.remove();
                }
            };

            const escListener = (e) => {
                if (e.key === 'Escape') closeModal();
            };
            document.addEventListener('keydown', escListener);

            // Clique no backdrop fecha o modal
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal();
            });

            const self = this;

            // ==========================================
            // VISTA 1: LISTA DE PERFIS (CARDS)
            // ==========================================
            const renderCardsView = () => {
                const students = self.getAll();
                const active = self.getActive();

                const studentListHtml = students.map(s => {
                    const isSelected = s.id === active.id;
                    const mascotInfo = MASCOT_PRESETS[s.mascot] || MASCOT_PRESETS.jaguar;
                    const ageInfo = AGE_TIERS[s.ageTier] || AGE_TIERS.age_6_7;
                    const stars = (s.gamification && s.gamification.stars) || 0;
                    const rounds = (s.gamification && s.gamification.totalRounds) || 0;

                    return `
                        <div style="padding:12px;border-radius:16px;border:2px solid ${isSelected ? '#f59e0b' : '#e2e8f0'};background:${isSelected ? '#fffbeb' : '#f8fafc'};display:flex;align-items:center;justify-content:space-between;gap:12px;transition:all 0.15s ease;">
                            <button type="button" class="btn-select-student" data-student-id="${s.id}" style="display:flex;align-items:center;gap:12px;flex:1;text-align:left;border:none;background:none;cursor:pointer;padding:0;">
                                <div style="width:46px;height:46px;border-radius:50%;padding:2px;background:linear-gradient(to top right, #f59e0b, #eab308);flex-shrink:0;">
                                    <img src="${mascotInfo.avatar}" alt="${mascotInfo.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;border:2px solid white;display:block;">
                                </div>
                                <div style="min-width:0;flex:1;">
                                    <div style="display:flex;align-items:center;gap:6px;">
                                        <h4 style="font-weight:900;font-size:14px;color:#0f172a;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(s.name)}</h4>
                                        ${isSelected ? '<span style="font-size:9px;font-weight:900;text-transform:uppercase;color:#b45309;background:#fef3c7;padding:2px 8px;border-radius:999px;">Ativo</span>' : ''}
                                    </div>
                                    <div style="font-size:10px;color:#64748b;font-weight:600;display:flex;align-items:center;gap:6px;margin-top:2px;">
                                        <span>${ageInfo.emoji} ${ageInfo.label}</span>
                                        <span>·</span>
                                        <span>${mascotInfo.name}</span>
                                    </div>
                                    <div style="font-size:10px;font-weight:bold;color:#d97706;display:flex;align-items:center;gap:4px;margin-top:2px;">
                                        <i class="fas fa-star" style="color:#f59e0b;"></i> ${stars} ★
                                        <span style="color:#94a3b8;">·</span>
                                        <span style="color:#64748b;font-weight:normal;">${rounds} rodadas</span>
                                    </div>
                                </div>
                            </button>

                            <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
                                <button type="button" class="btn-evolution-student" data-student-id="${s.id}" title="Ver Boletim e Gráficos de Evolução" style="padding:6px 9px;background:#eff6ff;border:1px solid #bfdbfe;color:#1d4ed8;font-weight:bold;font-size:10px;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:4px;">
                                    <i class="fas fa-chart-line"></i> Evolução
                                </button>
                                <button type="button" class="btn-mastery-report" data-student-id="${s.id}" title="Emitir Boletim Oficial de Maestria (PDF)" style="padding:6px 9px;background:#ecfdf5;border:1px solid #a7f3d0;color:#059669;font-weight:bold;font-size:10px;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:4px;">
                                    <i class="fas fa-file-pdf"></i> PDF
                                </button>
                                <button type="button" class="btn-edit-student" data-student-id="${s.id}" title="Editar Criança" style="padding:8px;border:none;background:none;color:#94a3b8;cursor:pointer;border-radius:8px;">
                                    <i class="fas fa-pen" style="font-size:12px;"></i>
                                </button>
                                ${students.length > 1 ? `
                                    <button type="button" class="btn-delete-student" data-student-id="${s.id}" title="Excluir Perfil" style="padding:8px;border:none;background:none;color:#ef4444;cursor:pointer;border-radius:8px;">
                                        <i class="fas fa-trash-alt" style="font-size:12px;"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('');

                modal.innerHTML = `
                    <div style="background:white;border-radius:24px;max-width:460px;width:100%;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);border:4px solid #f59e0b;overflow:hidden;margin:auto;box-sizing:border-box;" onclick="event.stopPropagation()">
                        <!-- Header Fixo -->
                        <div style="padding:14px 18px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:white;">
                            <div style="display:flex;align-items:center;gap:10px;">
                                <div style="width:36px;height:36px;border-radius:12px;background:#fef3c7;color:#d97706;display:flex;align-items:center;justify-content:center;font-size:16px;">
                                    <i class="fas fa-users"></i>
                                </div>
                                <div>
                                    <h3 style="font-weight:900;font-size:15px;color:#0f172a;margin:0;line-height:1.2;">Quem vai treinar?</h3>
                                    <span style="font-size:10px;color:#94a3b8;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;">Perfis KumonGen</span>
                                </div>
                            </div>
                            <div style="display:flex;align-items:center;gap:6px;">
                                <button type="button" id="btnHeaderAddStudent" style="padding:6px 12px;background:#f59e0b;color:white;font-weight:900;font-size:11px;border:none;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:4px;">
                                    <i class="fas fa-user-plus" style="font-size:10px;"></i> + Novo
                                </button>
                                <button type="button" id="btnCloseProfileModal" style="padding:8px;border:none;background:none;color:#94a3b8;font-size:15px;cursor:pointer;border-radius:8px;">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Corpo Rolar -->
                        <div style="padding:16px 18px;overflow-y:auto;flex:1;min-height:0;">
                            <!-- Botão Destacado Cadastrar Outra Criança -->
                            <button type="button" id="btnShowAddStudentForm" style="width:100%;padding:12px;background:linear-gradient(to right, #f59e0b, #ea580c);color:white;font-weight:900;font-size:12px;border:2px solid #fde68a;border-radius:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);margin-bottom:14px;">
                                <i class="fas fa-user-plus" style="font-size:14px;"></i> + Cadastrar Outro Perfil / Criança
                            </button>

                            <!-- Lista de Crianças -->
                            <div style="display:flex;flex-direction:column;gap:10px;">
                                ${studentListHtml}
                            </div>
                        </div>

                        <!-- Rodapé Fixo: Backup, Boletim Geral & Restauração -->
                        <div style="padding:12px 18px;border-top:1px solid #f1f5f9;background:#f8fafc;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;font-size:11px;color:#64748b;">
                            <button type="button" id="btnExportProfiles" style="border:none;background:none;color:#b45309;font-weight:bold;cursor:pointer;display:flex;align-items:center;gap:4px;padding:0;">
                                <i class="fas fa-download" style="color:#f59e0b;"></i> Backup
                            </button>
                            <button type="button" id="btnActiveEvolution" style="border:none;background:none;color:#2563eb;font-weight:bold;cursor:pointer;display:flex;align-items:center;gap:4px;padding:0;" title="Ver Gráficos e Desempenho do Aluno Ativo">
                                <i class="fas fa-chart-line" style="color:#3b82f6;"></i> Evolução
                            </button>
                            <button type="button" id="btnActiveMasteryReport" style="border:none;background:none;color:#059669;font-weight:bold;cursor:pointer;display:flex;align-items:center;gap:4px;padding:0;" title="Emitir Boletim Oficial (PDF)">
                                <i class="fas fa-graduation-cap" style="color:#10b981;"></i> PDF Oficial
                            </button>
                            <label style="color:#2563eb;font-weight:bold;cursor:pointer;display:flex;align-items:center;gap:4px;">
                                <i class="fas fa-upload" style="color:#3b82f6;"></i> Restaurar
                                <input type="file" id="inputImportProfiles" accept=".json" style="display:none;">
                            </label>
                        </div>
                    </div>
                `;

                // Event Listeners da Lista
                modal.querySelector('#btnCloseProfileModal').onclick = closeModal;
                const headerAddBtn = modal.querySelector('#btnHeaderAddStudent');
                if (headerAddBtn) headerAddBtn.onclick = () => renderFormView(null);

                modal.querySelectorAll('.btn-select-student').forEach(btn => {
                    btn.onclick = () => {
                        const sid = btn.getAttribute('data-student-id');
                        self.setActive(sid);
                        closeModal();
                        if (typeof options.onSelect === 'function') options.onSelect(self.getActive());
                    };
                });

                modal.querySelectorAll('.btn-evolution-student').forEach(btn => {
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        const sid = btn.getAttribute('data-student-id');
                        const target = self.getById(sid);
                        if (target) renderEvolutionView(target);
                    };
                });

                const activeEvoBtn = modal.querySelector('#btnActiveEvolution');
                if (activeEvoBtn) {
                    activeEvoBtn.onclick = () => {
                        const active = self.getActive();
                        if (active) renderEvolutionView(active);
                    };
                }

                modal.querySelectorAll('.btn-mastery-report').forEach(btn => {
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        const sid = btn.getAttribute('data-student-id');
                        self.generateMasteryReportPDF(sid);
                    };
                });

                const activeReportBtn = modal.querySelector('#btnActiveMasteryReport');
                if (activeReportBtn) {
                    activeReportBtn.onclick = () => {
                        const active = self.getActive();
                        if (active) self.generateMasteryReportPDF(active.id);
                    };
                }

                modal.querySelectorAll('.btn-edit-student').forEach(btn => {
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        const sid = btn.getAttribute('data-student-id');
                        const target = self.getById(sid);
                        if (target) renderFormView(target);
                    };
                });

                modal.querySelectorAll('.btn-delete-student').forEach(btn => {
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        const sid = btn.getAttribute('data-student-id');
                        const target = self.getById(sid);
                        if (!target) return;
                        if (confirm(`Deseja realmente remover o perfil de "${target.name}"? As estrelas e histórico deste perfil serão excluídos.`)) {
                            self.deleteStudent(sid);
                            renderCardsView();
                        }
                    };
                });

                modal.querySelector('#btnShowAddStudentForm').onclick = () => renderFormView(null);
                modal.querySelector('#btnExportProfiles').onclick = () => self.exportBackup();

                const importInput = modal.querySelector('#inputImportProfiles');
                if (importInput) {
                    importInput.onchange = (e) => {
                        const file = e.target.files && e.target.files[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                            const res = self.importBackup(evt.target.result);
                            if (res.success) {
                                alert(`Backup restaurado com sucesso! ${res.count} perfil(is) carregado(s).`);
                                closeModal();
                                if (typeof options.onSelect === 'function') options.onSelect(self.getActive());
                            } else {
                                alert('Falha ao restaurar backup: ' + res.error);
                            }
                        };
                        reader.readAsText(file);
                    };
                }
            };

            // ==========================================
            // VISTA 2: FORMULÁRIO DE CADASTRO / EDIÇÃO
            // ==========================================
            const renderFormView = (studentToEdit) => {
                const isEditing = !!studentToEdit;
                const currentName = isEditing ? studentToEdit.name : '';
                const currentAge = isEditing ? studentToEdit.ageTier : 'age_6_7';
                const currentMascot = isEditing ? studentToEdit.mascot : 'jaguar';

                const mascotOptionsHtml = Object.keys(MASCOT_PRESETS).map(key => {
                    const m = MASCOT_PRESETS[key];
                    const isMSelected = m.id === currentMascot;
                    const subtitle = m.title ? (m.title.split(' ')[1] || m.title) : '';
                    return `
                        <label class="form-mascot-label" style="display:flex;flex-direction:column;align-items:center;padding:8px 4px;border-radius:14px;border:2px solid ${isMSelected ? '#f59e0b' : '#e2e8f0'};background:${isMSelected ? '#fffbeb' : '#f8fafc'};cursor:pointer;transition:all 0.15s ease;text-align:center;box-sizing:border-box;">
                            <input type="radio" name="formMascot" value="${m.id}" style="position:absolute;opacity:0;pointer-events:none;" ${isMSelected ? 'checked' : ''}>
                            <img src="${m.avatar}" alt="${m.name}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;border:1px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.1);margin-bottom:4px;display:block;">
                            <span style="font-size:10px;font-weight:900;color:#0f172a;line-height:1.1;">${m.name}</span>
                            <span style="font-size:8px;color:#94a3b8;line-height:1.1;">${subtitle}</span>
                        </label>
                    `;
                }).join('');

                const ageOptionsHtml = Object.keys(AGE_TIERS).map(key => {
                    const a = AGE_TIERS[key];
                    const isASelected = a.id === currentAge;
                    return `
                        <label class="form-age-label" style="padding:8px 10px;border-radius:12px;border:2px solid ${isASelected ? '#f59e0b' : '#e2e8f0'};background:${isASelected ? '#fffbeb' : '#ffffff'};display:flex;align-items:center;gap:8px;cursor:pointer;transition:all 0.15s ease;box-sizing:border-box;">
                            <input type="radio" name="formAgeTier" value="${a.id}" style="position:absolute;opacity:0;pointer-events:none;" ${isASelected ? 'checked' : ''}>
                            <span style="font-size:18px;">${a.emoji}</span>
                            <div style="text-align:left;">
                                <div style="font-size:11px;font-weight:bold;color:#0f172a;line-height:1.2;">${a.label}</div>
                                <div style="font-size:9px;color:#94a3b8;line-height:1.2;">${a.sub}</div>
                            </div>
                        </label>
                    `;
                }).join('');

                modal.innerHTML = `
                    <div style="background:white;border-radius:24px;max-width:440px;width:100%;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);border:4px solid #f59e0b;overflow:hidden;margin:auto;box-sizing:border-box;" onclick="event.stopPropagation()">
                        <!-- Header Fixo -->
                        <div style="padding:14px 18px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:white;">
                            <div style="display:flex;align-items:center;gap:8px;">
                                <button type="button" id="btnBackToProfiles" title="Voltar à lista" style="padding:6px 10px;border:none;background:#f1f5f9;color:#475569;border-radius:10px;cursor:pointer;font-size:13px;font-weight:bold;">
                                    <i class="fas fa-arrow-left"></i>
                                </button>
                                <h3 style="font-weight:900;font-size:16px;color:#0f172a;margin:0;">${isEditing ? 'Editar Perfil' : 'Nova Criança'}</h3>
                            </div>
                            <button type="button" id="btnCloseFormModal" title="Fechar" style="padding:8px;border:none;background:none;color:#94a3b8;font-size:16px;cursor:pointer;border-radius:8px;">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>

                        <!-- Corpo Rolar com Campos -->
                        <div style="padding:16px 18px;overflow-y:auto;flex:1;min-height:0;">
                            <form id="studentProfileForm" style="display:flex;flex-direction:column;gap:14px;">
                                <div>
                                    <label style="font-size:10px;font-weight:900;color:#64748b;text-transform:uppercase;display:block;margin-bottom:4px;">Nome da Criança <span style="color:#ef4444;">*</span></label>
                                    <input type="text" id="inputStudentName" required maxlength="25" placeholder="Ex: Theo, Alice, Lucas..." value="${escapeHtml(currentName)}" style="width:100%;padding:10px 14px;font-size:15px;font-weight:bold;background:#f8fafc;border:2px solid #cbd5e1;border-radius:14px;outline:none;box-sizing:border-box;transition:all 0.2s;">
                                </div>

                                <div>
                                    <label style="font-size:10px;font-weight:900;color:#64748b;text-transform:uppercase;display:block;margin-bottom:6px;">Faixa Etária / Ano Escolar</label>
                                    <div id="ageOptionsGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                                        ${ageOptionsHtml}
                                    </div>
                                </div>

                                <div>
                                    <label style="font-size:10px;font-weight:900;color:#64748b;text-transform:uppercase;display:block;margin-bottom:6px;">Escolha o Mascote Companheiro</label>
                                    <div id="mascotOptionsGrid" style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px;">
                                        ${mascotOptionsHtml}
                                    </div>
                                </div>
                            </form>
                        </div>

                        <!-- Rodapé Fixo: Botões Salvar / Cancelar (SEMPRE VISÍVEL) -->
                        <div style="padding:12px 18px;border-top:1px solid #f1f5f9;background:#f8fafc;display:flex;gap:10px;flex-shrink:0;">
                            <button type="button" id="btnCancelForm" style="flex:1;padding:12px;border-radius:14px;border:none;background:#f1f5f9;color:#334155;font-weight:bold;font-size:13px;cursor:pointer;transition:background 0.15s;">
                                Cancelar
                            </button>
                            <button type="button" id="btnSubmitProfile" style="flex:1;padding:12px;border-radius:14px;border:none;background:linear-gradient(to right, #f59e0b, #ea580c);color:white;font-weight:900;font-size:13px;cursor:pointer;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);display:flex;align-items:center;justify-content:center;gap:6px;">
                                <i class="fas fa-check"></i> ${isEditing ? 'Salvar' : 'Concluir'}
                            </button>
                        </div>
                    </div>
                `;

                // Listeners do formulário
                modal.querySelector('#btnCloseFormModal').onclick = closeModal;
                modal.querySelector('#btnBackToProfiles').onclick = () => renderCardsView();
                modal.querySelector('#btnCancelForm').onclick = () => renderCardsView();

                // Destaque visual interativo dos rádios de Idade
                modal.querySelectorAll('input[name="formAgeTier"]').forEach(radio => {
                    radio.addEventListener('change', () => {
                        modal.querySelectorAll('#ageOptionsGrid .form-age-label').forEach(lbl => {
                            lbl.style.borderColor = '#e2e8f0';
                            lbl.style.background = '#ffffff';
                        });
                        const currentLbl = radio.closest('label');
                        if (currentLbl) {
                            currentLbl.style.borderColor = '#f59e0b';
                            currentLbl.style.background = '#fffbeb';
                        }
                    });
                });

                // Destaque visual interativo dos rádios de Mascote
                modal.querySelectorAll('input[name="formMascot"]').forEach(radio => {
                    radio.addEventListener('change', () => {
                        modal.querySelectorAll('#mascotOptionsGrid .form-mascot-label').forEach(lbl => {
                            lbl.style.borderColor = '#e2e8f0';
                            lbl.style.background = '#f8fafc';
                        });
                        const currentLbl = radio.closest('label');
                        if (currentLbl) {
                            currentLbl.style.borderColor = '#f59e0b';
                            currentLbl.style.background = '#fffbeb';
                        }
                    });
                });

                // Autofoco suave no input do nome
                setTimeout(() => {
                    const inputEl = modal.querySelector('#inputStudentName');
                    if (inputEl) inputEl.focus();
                }, 80);

                // Rotina centralizada de submissão
                const doSubmit = () => {
                    const inputName = modal.querySelector('#inputStudentName');
                    const name = (inputName ? inputName.value : '').trim();
                    if (!name) {
                        if (inputName) {
                            inputName.focus();
                            inputName.style.borderColor = '#ef4444';
                            inputName.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.2)';
                        }
                        return;
                    }

                    const ageRadio = modal.querySelector('input[name="formAgeTier"]:checked');
                    const ageTier = ageRadio ? ageRadio.value : 'age_6_7';
                    const mascotRadio = modal.querySelector('input[name="formMascot"]:checked');
                    const mascot = mascotRadio ? mascotRadio.value : 'jaguar';

                    try {
                        let saved;
                        if (isEditing) {
                            saved = self.update(studentToEdit.id, { name, ageTier, mascot });
                        } else {
                            saved = self.create({ name, ageTier, mascot });
                        }

                        closeModal();
                        if (typeof options.onSelect === 'function') {
                            options.onSelect(saved || self.getActive());
                        }
                    } catch (err) {
                        console.error('[StudentProfileEngine] Erro ao salvar:', err);
                        alert('Erro ao salvar o perfil. Por favor tente novamente.');
                    }
                };

                // Suporta tanto clique no botão quanto Enter no formulário
                const formEl = modal.querySelector('#studentProfileForm');
                if (formEl) {
                    formEl.onsubmit = (e) => {
                        e.preventDefault();
                        doSubmit();
                    };
                }

                const submitBtn = modal.querySelector('#btnSubmitProfile');
                if (submitBtn) {
                    submitBtn.onclick = (e) => {
                        e.preventDefault();
                        doSubmit();
                    };
                }
            };

            // ==========================================
            // VISTA 3: BOLETIM DE EVOLUÇÃO & HISTÓRICO
            // ==========================================
            const renderEvolutionView = (studentToInspect) => {
                const s = studentToInspect || self.getActive() || self.getAll()[0];
                if (!s) {
                    renderCardsView();
                    return;
                }

                const mascotInfo = MASCOT_PRESETS[s.mascot] || MASCOT_PRESETS.jaguar;
                const ageInfo = AGE_TIERS[s.ageTier] || AGE_TIERS.age_6_7;
                const stars = (s.gamification && s.gamification.stars) || 0;
                const streak = (s.gamification && s.gamification.streak) || 0;
                const bestStreak = (s.gamification && s.gamification.bestStreak) || 0;
                const totalRounds = (s.gamification && s.gamification.totalRounds) || 0;
                const masteredCount = self.getMasteryCount(s);
                const masteredPct = Math.round((masteredCount / 25) * 100);

                const historyList = Array.isArray(s.history) ? s.history : [];
                const tabletRounds = historyList.filter(h => h.accuracy !== undefined || h.type === 'tablet_round');

                // Cálculo das métricas SCT e precisão
                const sctItems = tabletRounds.filter(h => h.timeSec && h.targetSec);
                const sctBeatenCount = sctItems.filter(h => h.timeSec <= h.targetSec).length;
                const sctRate = sctItems.length > 0 ? Math.round((sctBeatenCount / sctItems.length) * 100) : (totalRounds > 0 ? 100 : null);
                const avgAccuracy = tabletRounds.length > 0
                    ? Math.round(tabletRounds.reduce((acc, cur) => acc + (cur.accuracy !== undefined ? cur.accuracy : 100), 0) / tabletRounds.length)
                    : (totalRounds > 0 ? 100 : null);
                const totalItemsSolved = tabletRounds.reduce((acc, cur) => acc + (cur.totalItems || 0), 0) || ((s.gamification && s.gamification.totalCorrect) || 0);

                // Geração do Gráfico SVG (Últimas 10 a 15 rodadas em ordem cronológica)
                let chartSvgHtml = '';
                const chartData = tabletRounds.slice(0, 15).reverse();

                if (chartData.length >= 2) {
                    const width = 500;
                    const height = 160;
                    const padLeft = 38;
                    const padRight = 18;
                    const padTop = 18;
                    const padBottom = 26;
                    const plotW = width - padLeft - padRight;
                    const plotH = height - padTop - padBottom;

                    const gridYMarks = [100, 75, 50, 25, 0];
                    const gridLines = gridYMarks.map(pct => {
                        const y = padTop + plotH - (pct / 100) * plotH;
                        return `
                            <line x1="${padLeft}" y1="${y}" x2="${width - padRight}" y2="${y}" stroke="#f1f5f9" stroke-width="1" stroke-dasharray="3,3" />
                            <text x="${padLeft - 6}" y="${y + 3}" fill="#94a3b8" font-size="9" font-weight="bold" text-anchor="end">${pct}%</text>
                        `;
                    }).join('');

                    const points = chartData.map((item, idx) => {
                        const acc = Math.max(0, Math.min(100, item.accuracy !== undefined ? item.accuracy : 100));
                        const x = padLeft + (idx / (chartData.length - 1)) * plotW;
                        const y = padTop + plotH - (acc / 100) * plotH;
                        return { x, y, acc, item, idx };
                    });

                    const pathD = 'M ' + points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ');
                    const areaD = `M ${points[0].x.toFixed(1)},${(padTop + plotH).toFixed(1)} ` +
                                  points.map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
                                  ` L ${points[points.length - 1].x.toFixed(1)},${(padTop + plotH).toFixed(1)} Z`;

                    const gradId = 'evoGrad_' + String(s.id).replace(/[^a-zA-Z0-9]/g, '_') + '_' + Date.now();
                    const pointCircles = points.map(p => {
                        const is100 = p.acc === 100;
                        const isMastered = p.item.isGauntletMastered;
                        const color = isMastered ? '#f59e0b' : (p.acc >= 80 ? '#10b981' : '#3b82f6');
                        const r = is100 ? 5.5 : 4;
                        const beatSct = p.item.timeSec && p.item.targetSec && p.item.timeSec <= p.item.targetSec;
                        const tooltip = `${p.item.date || ''} ${p.item.timeStr || ''} · ${p.item.levelTitle || p.item.levelId || 'Treino'} · Precisão: ${p.acc}% · Tempo: ${p.item.timeSec || 0}s (Meta: ${p.item.targetSec || 0}s)${beatSct ? ' ⚡ No Ritmo' : ''}`;

                        return `
                            <g class="chart-point-group" style="cursor:pointer;">
                                <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r}" fill="${color}" stroke="#ffffff" stroke-width="2">
                                    <title>${escapeHtml(tooltip)}</title>
                                </circle>
                                ${beatSct ? `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${r + 3}" fill="none" stroke="#fde68a" stroke-width="1.5" opacity="0.85"><title>${escapeHtml(tooltip)}</title></circle>` : ''}
                                <text x="${p.x.toFixed(1)}" y="${height - 8}" fill="#94a3b8" font-size="8.5" font-weight="600" text-anchor="middle">R${p.idx + 1}</text>
                            </g>
                        `;
                    }).join('');

                    chartSvgHtml = `
                        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;padding:14px;box-shadow:inset 0 1px 3px rgba(0,0,0,0.02);margin-bottom:12px;">
                            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                                <div style="display:flex;align-items:center;gap:6px;">
                                    <i class="fas fa-chart-area" style="color:#3b82f6;font-size:12px;"></i>
                                    <span style="font-weight:900;font-size:12px;color:#0f172a;">Curva de Acurácia & Fluência</span>
                                </div>
                                <span style="font-size:10px;color:#64748b;font-weight:bold;">Últimas ${chartData.length} sessões</span>
                            </div>
                            <div style="width:100%;overflow-x:auto;">
                                <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;display:block;overflow:visible;" preserveAspectRatio="xMidYMid meet">
                                    <defs>
                                        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.32" />
                                            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.01" />
                                        </linearGradient>
                                    </defs>
                                    ${gridLines}
                                    <path d="${areaD}" fill="url(#${gradId})" />
                                    <path d="${pathD}" fill="none" stroke="#2563eb" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" />
                                    ${pointCircles}
                                </svg>
                            </div>
                            <!-- Legenda do Gráfico -->
                            <div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:12px;margin-top:8px;font-size:10px;color:#64748b;font-weight:bold;border-top:1px solid #f8fafc;padding-top:8px;">
                                <div style="display:flex;align-items:center;gap:4px;">
                                    <span style="width:8px;height:8px;border-radius:50%;background:#f59e0b;display:inline-block;"></span>
                                    <span>100% Maestria / Gauntlet</span>
                                </div>
                                <div style="display:flex;align-items:center;gap:4px;">
                                    <span style="width:8px;height:8px;border-radius:50%;background:#10b981;display:inline-block;"></span>
                                    <span>≥ 80% Alta Precisão</span>
                                </div>
                                <div style="display:flex;align-items:center;gap:4px;">
                                    <span style="width:8px;height:8px;border-radius:50%;background:#3b82f6;display:inline-block;"></span>
                                    <span>Treino Concluído</span>
                                </div>
                                <div style="display:flex;align-items:center;gap:4px;">
                                    <i class="fas fa-bolt" style="color:#d97706;font-size:9px;"></i>
                                    <span>Ritmo SCT Alcançado</span>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    chartSvgHtml = `
                        <div style="background:#f8fafc;border:2px dashed #cbd5e1;border-radius:18px;padding:22px;text-align:center;margin-bottom:12px;">
                            <div style="width:48px;height:48px;border-radius:50%;background:#eff6ff;color:#3b82f6;display:flex;align-items:center;justify-content:center;margin:0 auto 10px;font-size:20px;">
                                <i class="fas fa-chart-line"></i>
                            </div>
                            <h4 style="font-weight:900;font-size:13px;color:#1e293b;margin:0 0 4px;">Curva de Fluência em Construção</h4>
                            <p style="font-size:11px;color:#64748b;margin:0 0 10px;line-height:1.4;">Complete pelo menos duas rodadas no modo Tablet para que o gráfico de acurácia e velocidade do aluno seja traçado automaticamente.</p>
                            <span style="font-size:10px;font-weight:bold;color:#2563eb;background:#dbeafe;padding:4px 10px;border-radius:999px;">Dica: Pratique 1 folha por dia</span>
                        </div>
                    `;
                }

                // Geração da Matriz dos 25 Níveis Curriculares
                const subjects = ['matematica', 'portugues', 'ingles'];
                const matrixHtml = subjects.map(sKey => {
                    const subData = CURRICULUM_25_LEVELS[sKey];
                    const subMastery = (s.mastery && s.mastery[sKey]) || {};
                    const masteredLvlCount = subData.levels.filter(lvl => subMastery[lvl.id] && subMastery[lvl.id].mastered).length;
                    const subPct = Math.round((masteredLvlCount / subData.levels.length) * 100);

                    const levelsListHtml = subData.levels.map(lvl => {
                        const mInfo = subMastery[lvl.id] || {};
                        const isDone = !!mInfo.mastered;
                        const inHistory = historyList.some(h => (h.levelId === lvl.id || (h.levelTitle && h.levelTitle.includes(lvl.code))));

                        let bg = '#f8fafc';
                        let border = '#e2e8f0';
                        let icon = '<i class="far fa-circle" style="color:#94a3b8;font-size:11px;"></i>';
                        let statusText = '<span style="color:#94a3b8;font-size:10px;font-weight:bold;">Pendente</span>';

                        if (isDone) {
                            bg = '#f0fdf4';
                            border = '#bbf7d0';
                            icon = `<button type="button" class="btn-cert-level" data-level-id="${lvl.id}" data-level-title="${escapeHtml(lvl.title)}" data-subject="${sKey}" title="Emitir Diploma deste Nível" style="border:none;background:none;cursor:pointer;padding:4px;color:#f59e0b;display:flex;align-items:center;justify-content:center;"><i class="fas fa-trophy" style="font-size:12px;"></i></button>`;
                            const bestTimeStr = mInfo.bestTimeSec ? `${Math.floor(mInfo.bestTimeSec / 60)}:${String(mInfo.bestTimeSec % 60).padStart(2, '0')}m` : '';
                            statusText = `<span style="color:#059669;font-size:10px;font-weight:900;">100% Maestria ${bestTimeStr ? '· ' + bestTimeStr : ''}</span>`;
                        } else if (inHistory) {
                            bg = '#fffbeb';
                            border = '#fde68a';
                            icon = '<i class="fas fa-hourglass-half" style="color:#d97706;font-size:11px;"></i>';
                            statusText = '<span style="color:#b45309;font-size:10px;font-weight:bold;">Em Treino</span>';
                        }

                        return `
                            <div style="background:${bg};border:1px solid ${border};border-radius:12px;padding:8px 10px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
                                <div style="display:flex;align-items:center;gap:8px;min-width:0;">
                                    <span style="font-weight:900;font-size:10px;color:white;background:${isDone ? '#10b981' : '#64748b'};padding:2px 6px;border-radius:6px;flex-shrink:0;">${lvl.code}</span>
                                    <div style="min-width:0;">
                                        <div style="font-weight:bold;font-size:11px;color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(lvl.title)}</div>
                                        <div>${statusText}</div>
                                    </div>
                                </div>
                                <div style="flex-shrink:0;">${icon}</div>
                            </div>
                        `;
                    }).join('');

                    return `
                        <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;padding:12px;margin-bottom:12px;">
                            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;border-bottom:1px solid #f1f5f9;padding-bottom:6px;">
                                <div style="display:flex;align-items:center;gap:6px;">
                                    <span style="font-weight:900;font-size:12px;color:#0f172a;">${escapeHtml(subData.title)}</span>
                                    <span style="font-size:10px;background:#f1f5f9;color:#475569;font-weight:bold;padding:1px 6px;border-radius:999px;">${subData.levels.length} Níveis</span>
                                </div>
                                <span style="font-size:10px;font-weight:900;color:${subPct === 100 ? '#059669' : '#d97706'};">${masteredLvlCount}/${subData.levels.length} (${subPct}%)</span>
                            </div>
                            <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(180px, 1fr));gap:6px;">
                                ${levelsListHtml}
                            </div>
                        </div>
                    `;
                }).join('');

                // Feed das Últimas Rodadas
                const recentHistoryHtml = historyList.length > 0 ? historyList.slice(0, 20).map(item => {
                    const isMastered = item.isGauntletMastered || item.accuracy === 100;
                    const beatSct = item.timeSec && item.targetSec && item.timeSec <= item.targetSec;
                    const timeFmt = item.timeSec ? `${Math.floor(item.timeSec / 60)}:${String(item.timeSec % 60).padStart(2, '0')}` : null;
                    const targetFmt = item.targetSec ? `${Math.floor(item.targetSec / 60)}:${String(item.targetSec % 60).padStart(2, '0')}` : null;

                    return `
                        <div style="padding:10px 12px;border-radius:12px;background:#ffffff;border:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;gap:10px;">
                            <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                                <div style="width:34px;height:34px;border-radius:10px;background:${isMastered ? '#ecfdf5' : '#eff6ff'};color:${isMastered ? '#059669' : '#2563eb'};display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">
                                    <i class="fas ${isMastered ? 'fa-award' : 'fa-check'}"></i>
                                </div>
                                <div style="min-width:0;">
                                    <div style="font-weight:900;font-size:12px;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(item.levelTitle || item.levelId || 'Treino')}</div>
                                    <div style="font-size:10px;color:#64748b;font-weight:600;display:flex;align-items:center;gap:6px;margin-top:2px;">
                                        <span>${escapeHtml(item.date || '')} ${escapeHtml(item.timeStr || '')}</span>
                                        <span>·</span>
                                        <span>${escapeHtml(item.subject || item.subjectTitle || 'KumonGen')}</span>
                                    </div>
                                </div>
                            </div>
                            <div style="text-align:right;flex-shrink:0;">
                                <div style="font-size:12px;font-weight:900;color:${isMastered ? '#059669' : '#2563eb'};">
                                    ${item.accuracy !== undefined ? `${item.accuracy}%` : (item.completed ? 'Concluído' : 'Treinado')}
                                </div>
                                <div style="font-size:9px;color:#64748b;margin-top:2px;display:flex;align-items:center;gap:4px;justify-content:flex-end;">
                                    ${timeFmt ? `<span>⏱ ${timeFmt}${targetFmt ? ' (meta ' + targetFmt + ')' : ''}</span>` : ''}
                                    ${beatSct ? '<span style="color:#059669;font-weight:bold;">⚡</span>' : ''}
                                    ${item.starsEarned ? `<span style="color:#d97706;font-weight:bold;">+${item.starsEarned}★</span>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('') : `
                    <div style="padding:24px;text-align:center;color:#94a3b8;font-size:12px;font-weight:bold;">
                        Nenhum registro de atividade salvo ainda para este aluno.
                    </div>
                `;

                modal.innerHTML = `
                    <div style="background:white;border-radius:24px;max-width:620px;width:100%;max-height:88vh;display:flex;flex-direction:column;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);border:4px solid #3b82f6;overflow:hidden;margin:auto;box-sizing:border-box;" onclick="event.stopPropagation()">
                        <!-- Header Fixo -->
                        <div style="padding:14px 18px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;background:white;">
                            <div style="display:flex;align-items:center;gap:10px;min-width:0;">
                                <div style="width:40px;height:40px;border-radius:50%;padding:2px;background:linear-gradient(to top right, #3b82f6, #60a5fa);flex-shrink:0;">
                                    <img src="${mascotInfo.avatar}" alt="${mascotInfo.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;border:2px solid white;display:block;">
                                </div>
                                <div style="min-width:0;">
                                    <div style="display:flex;align-items:center;gap:6px;">
                                        <h3 style="font-weight:900;font-size:15px;color:#0f172a;margin:0;line-height:1.2;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(s.name)}</h3>
                                        <span style="font-size:9px;font-weight:900;text-transform:uppercase;color:#1d4ed8;background:#dbeafe;padding:2px 8px;border-radius:999px;">${ageInfo.label}</span>
                                    </div>
                                    <div style="font-size:10px;color:#64748b;font-weight:600;display:flex;align-items:center;gap:6px;margin-top:2px;">
                                        <span>${mascotInfo.name}</span>
                                        <span>·</span>
                                        <span style="color:#d97706;font-weight:bold;"><i class="fas fa-star" style="color:#f59e0b;"></i> ${stars} ★</span>
                                        <span>·</span>
                                        <span style="color:#ea580c;font-weight:bold;"><i class="fas fa-fire" style="color:#f97316;"></i> ${streak}d</span>
                                    </div>
                                </div>
                            </div>
                            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
                                <button type="button" id="btnBackToProfilesFromEvolution" style="padding:6px 12px;background:#f1f5f9;color:#334155;font-weight:bold;font-size:11px;border:1px solid #cbd5e1;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:4px;">
                                    <i class="fas fa-arrow-left" style="font-size:10px;"></i> Perfis
                                </button>
                                <button type="button" id="btnCloseEvolutionModal" style="padding:8px;border:none;background:none;color:#94a3b8;font-size:15px;cursor:pointer;border-radius:8px;">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        </div>

                        <!-- Corpo Rolar -->
                        <div style="padding:16px 18px;overflow-y:auto;flex:1;min-height:0;background:#f8fafc;">
                            <!-- Cards de Métricas de Consistência -->
                            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(120px, 1fr));gap:8px;margin-bottom:12px;">
                                <div style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:10px 12px;text-align:center;">
                                    <div style="font-size:18px;font-weight:900;color:#059669;">${masteredCount} <span style="font-size:11px;color:#94a3b8;font-weight:normal;">/ 25</span></div>
                                    <div style="font-size:9px;color:#64748b;font-weight:bold;text-transform:uppercase;margin-top:1px;">Níveis Kumon (100%)</div>
                                    <div style="width:100%;height:4px;background:#e2e8f0;border-radius:999px;margin-top:6px;overflow:hidden;">
                                        <div style="width:${masteredPct}%;height:100%;background:#10b981;border-radius:999px;"></div>
                                    </div>
                                </div>

                                <div style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:10px 12px;text-align:center;">
                                    <div style="font-size:18px;font-weight:900;color:#2563eb;">${sctRate !== null ? `${sctRate}%` : '---'}</div>
                                    <div style="font-size:9px;color:#64748b;font-weight:bold;text-transform:uppercase;margin-top:1px;">Ritmo Fluente SCT</div>
                                    <div style="font-size:9px;color:#94a3b8;margin-top:4px;">${sctBeatenCount} no tempo ideal</div>
                                </div>

                                <div style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:10px 12px;text-align:center;">
                                    <div style="font-size:18px;font-weight:900;color:#d97706;">${streak} <span style="font-size:10px;font-weight:bold;color:#f59e0b;">dias</span></div>
                                    <div style="font-size:9px;color:#64748b;font-weight:bold;text-transform:uppercase;margin-top:1px;">Sequência Atual</div>
                                    <div style="font-size:9px;color:#94a3b8;margin-top:4px;">Recorde: ${bestStreak}d</div>
                                </div>

                                <div style="background:white;border:1px solid #e2e8f0;border-radius:14px;padding:10px 12px;text-align:center;">
                                    <div style="font-size:18px;font-weight:900;color:#7c3aed;">${avgAccuracy !== null ? `${avgAccuracy}%` : '---'}</div>
                                    <div style="font-size:9px;color:#64748b;font-weight:bold;text-transform:uppercase;margin-top:1px;">Precisão Média</div>
                                    <div style="font-size:9px;color:#94a3b8;margin-top:4px;">${totalItemsSolved} questões</div>
                                </div>
                            </div>

                            <!-- Navegação por Abas Internas -->
                            <div style="display:flex;align-items:center;gap:6px;padding:4px;background:#e2e8f0;border-radius:12px;margin-bottom:12px;">
                                <button type="button" id="tabBtnMetrics" style="flex:1;padding:7px 10px;border-radius:8px;border:none;background:white;color:#0f172a;font-weight:900;font-size:11px;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.05);transition:all 0.15s ease;">
                                    <i class="fas fa-chart-line" style="color:#2563eb;margin-right:4px;"></i> Gráficos
                                </button>
                                <button type="button" id="tabBtnMatrix" style="flex:1;padding:7px 10px;border-radius:8px;border:none;background:none;color:#64748b;font-weight:bold;font-size:11px;cursor:pointer;transition:all 0.15s ease;">
                                    <i class="fas fa-th" style="color:#d97706;margin-right:4px;"></i> 25 Níveis (${masteredCount}/25)
                                </button>
                                <button type="button" id="tabBtnHistory" style="flex:1;padding:7px 10px;border-radius:8px;border:none;background:none;color:#64748b;font-weight:bold;font-size:11px;cursor:pointer;transition:all 0.15s ease;">
                                    <i class="fas fa-history" style="color:#059669;margin-right:4px;"></i> Histórico (${historyList.length})
                                </button>
                            </div>

                            <!-- Painel 1: Gráficos & Fluência -->
                            <div id="panelEvolutionMetrics" style="display:block;">
                                ${chartSvgHtml}
                            </div>

                            <!-- Painel 2: Matriz dos 25 Níveis Curriculares -->
                            <div id="panelEvolutionMatrix" style="display:none;">
                                ${matrixHtml}
                            </div>

                            <!-- Painel 3: Histórico Detalhado Cronológico -->
                            <div id="panelEvolutionHistory" style="display:none;flex-direction:column;gap:8px;">
                                ${recentHistoryHtml}
                            </div>
                        </div>

                        <!-- Rodapé Fixo -->
                        <div style="padding:12px 18px;border-top:1px solid #f1f5f9;background:#f8fafc;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;flex-shrink:0;">
                            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                                <button type="button" id="btnDownloadPDFFromEvolution" style="padding:8px 14px;background:#ecfdf5;border:1px solid #a7f3d0;color:#059669;font-weight:900;font-size:11px;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:6px;">
                                    <i class="fas fa-file-pdf"></i> Emitir Boletim A4
                                </button>
                                <button type="button" id="btnDownloadCertFromEvolution" style="padding:8px 14px;background:#fffbeb;border:1px solid #fde68a;color:#b45309;font-weight:900;font-size:11px;border-radius:10px;cursor:pointer;display:flex;align-items:center;gap:6px;">
                                    <i class="fas fa-award"></i> Emitir Diploma de Mérito
                                </button>
                            </div>
                            <button type="button" id="btnFooterBackToProfiles" style="border:none;background:none;color:#64748b;font-weight:bold;font-size:11px;cursor:pointer;display:flex;align-items:center;gap:4px;">
                                <i class="fas fa-users"></i> Voltar aos Perfis
                            </button>
                        </div>
                    </div>
                `;

                // Event Listeners da Vista de Evolução
                modal.querySelector('#btnCloseEvolutionModal').onclick = closeModal;
                modal.querySelector('#btnBackToProfilesFromEvolution').onclick = () => renderCardsView();
                modal.querySelector('#btnFooterBackToProfiles').onclick = () => renderCardsView();

                const pdfBtn = modal.querySelector('#btnDownloadPDFFromEvolution');
                if (pdfBtn) {
                    pdfBtn.onclick = () => self.generateMasteryReportPDF(s.id);
                }

                const certBtn = modal.querySelector('#btnDownloadCertFromEvolution');
                if (certBtn) {
                    certBtn.onclick = () => self.generateMasteryCertificatePDF(s.id);
                }

                // Delegação de cliques para emissão de diploma por nível específico na matriz
                const matrixPanel = modal.querySelector('#panelEvolutionMatrix');
                if (matrixPanel) {
                    matrixPanel.addEventListener('click', (e) => {
                        const btn = e.target.closest('.btn-cert-level');
                        if (btn) {
                            const lvlId = btn.getAttribute('data-level-id');
                            const lvlTitle = btn.getAttribute('data-level-title');
                            const subKey = btn.getAttribute('data-subject');
                            const subTitle = (CURRICULUM_25_LEVELS[subKey] && CURRICULUM_25_LEVELS[subKey].title) || subKey;
                            self.generateMasteryCertificatePDF(s.id, {
                                levelId: lvlId,
                                levelTitle: lvlTitle,
                                subjectTitle: subTitle,
                                accuracy: 100,
                                isGauntletMastered: true
                            });
                        }
                    });
                }

                // Alternância das Abas Internas
                const tabMetrics = modal.querySelector('#tabBtnMetrics');
                const tabMatrix = modal.querySelector('#tabBtnMatrix');
                const tabHistory = modal.querySelector('#tabBtnHistory');
                const panelMetrics = modal.querySelector('#panelEvolutionMetrics');
                const panelMatrix = modal.querySelector('#panelEvolutionMatrix');
                const panelHistory = modal.querySelector('#panelEvolutionHistory');

                const switchSubTab = (activeTab) => {
                    [tabMetrics, tabMatrix, tabHistory].forEach(t => {
                        t.style.background = 'none';
                        t.style.color = '#64748b';
                        t.style.fontWeight = 'bold';
                        t.style.boxShadow = 'none';
                    });
                    panelMetrics.style.display = 'none';
                    panelMatrix.style.display = 'none';
                    panelHistory.style.display = 'none';

                    if (activeTab === 'metrics') {
                        tabMetrics.style.background = 'white';
                        tabMetrics.style.color = '#0f172a';
                        tabMetrics.style.fontWeight = '900';
                        tabMetrics.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                        panelMetrics.style.display = 'block';
                    } else if (activeTab === 'matrix') {
                        tabMatrix.style.background = 'white';
                        tabMatrix.style.color = '#0f172a';
                        tabMatrix.style.fontWeight = '900';
                        tabMatrix.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                        panelMatrix.style.display = 'block';
                    } else if (activeTab === 'history') {
                        tabHistory.style.background = 'white';
                        tabHistory.style.color = '#0f172a';
                        tabHistory.style.fontWeight = '900';
                        tabHistory.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                        panelHistory.style.display = 'flex';
                    }
                };

                tabMetrics.onclick = () => switchSubTab('metrics');
                tabMatrix.onclick = () => switchSubTab('matrix');
                tabHistory.onclick = () => switchSubTab('history');
            };

            // Anexa modal ao DOM antes da renderização para garantir binding de eventos e foco imediato
            document.body.appendChild(modal);

            if (options.initialView === 'form') {
                renderFormView(null);
            } else if (options.initialView === 'evolution') {
                const target = options.studentId ? self.getById(options.studentId) : self.getActive();
                renderEvolutionView(target || self.getActive());
            } else {
                renderCardsView();
            }
        }
    };

    // Publica globalmente primeiro para garantir disponibilidade imediata
    window.StudentProfileEngine = StudentProfileEngine;

    // Inicialização automática silenciosa e protegida
    try {
        _migrateLegacyData();
    } catch (e) {
        console.warn('[StudentProfileEngine] Falha silenciosa na inicialização:', e);
    }

})(typeof window !== 'undefined' ? window : this);
