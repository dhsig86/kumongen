// KumonGen — Motor Canônico de Múltiplos Perfis de Alunos (100% LocalStorage / Zero Backend)
(function(window) {
    'use strict';

    const STORAGE_STUDENTS = 'kumongen_students';
    const STORAGE_ACTIVE_ID = 'kumongen_active_student_id';

    // Presets de mascotes disponíveis para a criança
    const MASCOT_PRESETS = {
        jaguar: { id: 'jaguar', name: 'Juju', title: 'Jaguatirica Ágil', avatar: 'assets/mascotes/jaguar_avatar.png', ring: 'from-amber-400 to-yellow-500' },
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

    function _generateId() {
        return 'std_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    }

    // Rotina de migração retrocompatível (executa automaticamente no 1º acesso)
    function _migrateLegacyData() {
        try {
            const existingRaw = localStorage.getItem(STORAGE_STUDENTS);
            if (existingRaw) {
                const list = JSON.parse(existingRaw);
                if (Array.isArray(list) && list.length > 0) return list;
            }
        } catch (e) {}

        // Coleta dados legados existentes
        const legacyName = localStorage.getItem('kumongen_student_name') || 'Super Aluno';
        const legacyMascot = localStorage.getItem('kumongen_active_mascot') || 'jaguar';

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
            const rawG = localStorage.getItem('kumongen_gamification_v3');
            if (rawG) {
                const parsedG = JSON.parse(rawG);
                legacyGamification = Object.assign(legacyGamification, parsedG);
            }
        } catch (e) {}

        let legacyHistory = [];
        try {
            const rawH = localStorage.getItem('kumongen_history');
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
            history: legacyHistory
        };

        const initialList = [defaultStudent];
        localStorage.setItem(STORAGE_STUDENTS, JSON.stringify(initialList));
        localStorage.setItem(STORAGE_ACTIVE_ID, defaultStudent.id);
        _mirrorLegacyKeys(defaultStudent);
        return initialList;
    }

    // Espelha o aluno ativo nas chaves legadas para NUNCA quebrar código antigo
    function _mirrorLegacyKeys(student) {
        if (!student) return;
        try {
            localStorage.setItem('kumongen_student_name', student.name);
            localStorage.setItem('kumongen_active_mascot', student.mascot || 'jaguar');
            if (student.gamification) {
                localStorage.setItem('kumongen_gamification_v3', JSON.stringify(student.gamification));
            }
            if (student.history) {
                localStorage.setItem('kumongen_history', JSON.stringify(student.history));
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
            try {
                const raw = localStorage.getItem(STORAGE_STUDENTS);
                if (!raw) return _migrateLegacyData();
                const list = JSON.parse(raw);
                if (!Array.isArray(list) || list.length === 0) return _migrateLegacyData();
                return list;
            } catch (e) {
                return _migrateLegacyData();
            }
        },

        getById(id) {
            const list = this.getAll();
            return list.find(s => s.id === id) || null;
        },

        getActive() {
            const list = this.getAll();
            const activeId = localStorage.getItem(STORAGE_ACTIVE_ID);
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
            localStorage.setItem(STORAGE_ACTIVE_ID, student.id);
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
            localStorage.setItem(STORAGE_STUDENTS, JSON.stringify(list));
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
            localStorage.setItem(STORAGE_STUDENTS, JSON.stringify(list));

            const activeId = localStorage.getItem(STORAGE_ACTIVE_ID);
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
            localStorage.setItem(STORAGE_STUDENTS, JSON.stringify(list));

            const activeId = localStorage.getItem(STORAGE_ACTIVE_ID);
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
                localStorage.setItem(STORAGE_STUDENTS, JSON.stringify(list));
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
            active.history = active.history.slice(0, 50); // guarda os últimos 50

            const list = this.getAll();
            const idx = list.findIndex(s => s.id === active.id);
            if (idx !== -1) {
                list[idx] = active;
                localStorage.setItem(STORAGE_STUDENTS, JSON.stringify(list));
            }
            _mirrorLegacyKeys(active);
        },

        // Exportação de Backup JSON
        exportBackup() {
            const data = {
                app: 'KumonGen',
                version: '3.8',
                exportedAt: new Date().toISOString(),
                activeStudentId: localStorage.getItem(STORAGE_ACTIVE_ID),
                students: this.getAll()
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const dateStr = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `kumongen_backup_${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        // Importação de Backup JSON
        importBackup(jsonString) {
            try {
                const parsed = JSON.parse(jsonString);
                if (!parsed || !Array.isArray(parsed.students) || parsed.students.length === 0) {
                    throw new Error('Formato de backup inválido.');
                }

                localStorage.setItem(STORAGE_STUDENTS, JSON.stringify(parsed.students));
                const targetId = parsed.activeStudentId || parsed.students[0].id;
                this.setActive(targetId);
                return { success: true, count: parsed.students.length };
            } catch (e) {
                return { success: false, error: e.message };
            }
        },

        // Modal Interativo: "Quem vai treinar hoje?"
        showProfileModal(options = {}) {
            const existing = document.getElementById('studentProfileManagerModal');
            if (existing) existing.remove();

            const modal = document.createElement('div');
            modal.id = 'studentProfileManagerModal';
            modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn';
            modal.style.touchAction = 'manipulation';

            const self = this;

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
                        <div class="relative group p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${isSelected ? 'border-amber-400 bg-amber-50/90 shadow-md ring-2 ring-amber-300' : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'}">
                            <button type="button" class="btn-select-student flex items-center gap-3 flex-1 text-left cursor-pointer" data-student-id="${s.id}">
                                <div class="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr ${mascotInfo.ring} shadow-md flex-shrink-0">
                                    <img src="${mascotInfo.avatar}" alt="${mascotInfo.name}" class="w-full h-full rounded-full object-cover border-2 border-white">
                                </div>
                                <div class="min-w-0 flex-1">
                                    <div class="flex items-center gap-1.5">
                                        <h4 class="font-black text-sm text-slate-800 truncate">${s.name}</h4>
                                        ${isSelected ? '<span class="text-[9px] font-black uppercase text-amber-700 bg-amber-200 px-2 py-0.5 rounded-full">Ativo</span>' : ''}
                                    </div>
                                    <div class="text-[10px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                                        <span>${ageInfo.emoji} ${ageInfo.label}</span>
                                        <span>·</span>
                                        <span>${mascotInfo.name}</span>
                                    </div>
                                    <div class="text-[10px] font-bold text-amber-600 flex items-center gap-1 mt-1">
                                        <i class="fas fa-star text-amber-500"></i> ${stars} ★
                                        <span class="text-slate-400">·</span>
                                        <span class="text-slate-500 font-normal">${rounds} rodadas</span>
                                    </div>
                                </div>
                            </button>

                            <div class="flex items-center gap-1 flex-shrink-0">
                                <button type="button" class="btn-edit-student p-2 text-slate-400 hover:text-blue-600 rounded-xl hover:bg-slate-100 transition-colors" data-student-id="${s.id}" title="Editar Criança">
                                    <i class="fas fa-pen text-xs"></i>
                                </button>
                                ${students.length > 1 ? `
                                    <button type="button" class="btn-delete-student p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition-colors" data-student-id="${s.id}" title="Excluir Perfil">
                                        <i class="fas fa-trash-alt text-xs"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('');

                modal.innerHTML = `
                    <div class="bg-white rounded-3xl p-5 md:p-6 max-w-md w-full shadow-2xl border-4 border-amber-400 max-h-[90vh] overflow-y-auto text-slate-800">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <div class="flex items-center gap-2.5">
                                <div class="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-lg shadow-inner">
                                    <i class="fas fa-users"></i>
                                </div>
                                <div>
                                    <h3 class="font-black text-base text-slate-900 leading-tight">Quem vai treinar hoje?</h3>
                                    <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Múltiplos Perfis KumonGen</span>
                                </div>
                            </div>
                            <button id="btnCloseProfileModal" class="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer transition-colors">
                                <i class="fas fa-times text-base"></i>
                            </button>
                        </div>

                        <!-- Lista de Crianças -->
                        <div class="space-y-2.5 mb-4">
                            ${studentListHtml}
                        </div>

                        <!-- Botão Adicionar Criança -->
                        <button type="button" id="btnShowAddStudentForm" class="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer mb-3">
                            <i class="fas fa-plus-circle text-sm"></i> Cadastrar Nova Criança
                        </button>

                        <!-- Rodapé: Backup & Restauração -->
                        <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                            <button type="button" id="btnExportProfiles" class="hover:text-amber-700 font-bold flex items-center gap-1 cursor-pointer">
                                <i class="fas fa-download text-amber-500"></i> Fazer Backup
                            </button>
                            <label class="hover:text-blue-700 font-bold flex items-center gap-1 cursor-pointer">
                                <i class="fas fa-upload text-blue-500"></i> Restaurar
                                <input type="file" id="inputImportProfiles" accept=".json" class="hidden">
                            </label>
                        </div>
                    </div>
                `;

                // Event Listeners da Lista
                modal.querySelector('#btnCloseProfileModal').onclick = () => modal.remove();

                modal.querySelectorAll('.btn-select-student').forEach(btn => {
                    btn.onclick = () => {
                        const sid = btn.getAttribute('data-student-id');
                        self.setActive(sid);
                        modal.remove();
                        if (typeof options.onSelect === 'function') options.onSelect(self.getActive());
                    };
                });

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
                                modal.remove();
                                if (typeof options.onSelect === 'function') options.onSelect(self.getActive());
                            } else {
                                alert('Falha ao restaurar backup: ' + res.error);
                            }
                        };
                        reader.readAsText(file);
                    };
                }
            };

            const renderFormView = (studentToEdit) => {
                const isEditing = !!studentToEdit;
                const currentName = isEditing ? studentToEdit.name : '';
                const currentAge = isEditing ? studentToEdit.ageTier : 'age_6_7';
                const currentMascot = isEditing ? studentToEdit.mascot : 'jaguar';

                const mascotOptionsHtml = Object.keys(MASCOT_PRESETS).map(key => {
                    const m = MASCOT_PRESETS[key];
                    const isMSelected = m.id === currentMascot;
                    return `
                        <label class="relative flex flex-col items-center p-2 rounded-2xl border-2 cursor-pointer transition-all ${isMSelected ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-300' : 'border-slate-200 bg-slate-50 hover:bg-white'}">
                            <input type="radio" name="formMascot" value="${m.id}" class="sr-only" ${isMSelected ? 'checked' : ''}>
                            <img src="${m.avatar}" alt="${m.name}" class="w-10 h-10 rounded-full object-cover border border-white shadow mb-1">
                            <span class="text-[10px] font-black text-slate-800">${m.name}</span>
                            <span class="text-[8px] text-slate-400 leading-tight">${m.title.split(' ')[1] || ''}</span>
                        </label>
                    `;
                }).join('');

                const ageOptionsHtml = Object.keys(AGE_TIERS).map(key => {
                    const a = AGE_TIERS[key];
                    const isASelected = a.id === currentAge;
                    return `
                        <label class="p-2 rounded-xl border-2 flex items-center gap-2 cursor-pointer transition-all ${isASelected ? 'border-amber-500 bg-amber-50 font-black text-amber-900' : 'border-slate-200 bg-white text-slate-600'}">
                            <input type="radio" name="formAgeTier" value="${a.id}" class="sr-only" ${isASelected ? 'checked' : ''}>
                            <span class="text-base">${a.emoji}</span>
                            <div class="text-left">
                                <div class="text-[11px] font-bold leading-tight">${a.label}</div>
                                <div class="text-[9px] text-slate-400 leading-tight">${a.sub}</div>
                            </div>
                        </label>
                    `;
                }).join('');

                modal.innerHTML = `
                    <div class="bg-white rounded-3xl p-5 md:p-6 max-w-md w-full shadow-2xl border-4 border-amber-400 max-h-[90vh] overflow-y-auto text-slate-800 animate-fadeIn">
                        <div class="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                            <div class="flex items-center gap-2">
                                <button type="button" id="btnBackToProfiles" class="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer">
                                    <i class="fas fa-arrow-left"></i>
                                </button>
                                <h3 class="font-black text-base text-slate-900">${isEditing ? 'Editar Perfil' : 'Nova Criança'}</h3>
                            </div>
                            <button id="btnCloseFormModal" class="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 cursor-pointer">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>

                        <form id="studentProfileForm" class="space-y-4">
                            <div>
                                <label class="text-[10px] font-black text-slate-500 uppercase block mb-1">Nome da Criança</label>
                                <input type="text" id="inputStudentName" required maxlength="25" placeholder="Ex: Theo, Alice..." value="${currentName}" class="w-full text-base font-bold bg-slate-50 border-2 border-slate-200 rounded-2xl p-3 focus:outline-none focus:border-amber-500 focus:bg-white transition-all">
                            </div>

                            <div>
                                <label class="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Faixa Etária / Ano Escolar</label>
                                <div class="grid grid-cols-2 gap-1.5" id="ageOptionsGrid">
                                    ${ageOptionsHtml}
                                </div>
                            </div>

                            <div>
                                <label class="text-[10px] font-black text-slate-500 uppercase block mb-1.5">Escolha o Mascote Companheiro</label>
                                <div class="grid grid-cols-4 gap-1.5" id="mascotOptionsGrid">
                                    ${mascotOptionsHtml}
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-2 pt-2">
                                <button type="button" id="btnCancelForm" class="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer">
                                    Cancelar
                                </button>
                                <button type="submit" class="py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer">
                                    <i class="fas fa-check"></i> ${isEditing ? 'Salvar' : 'Concluir'}
                                </button>
                            </div>
                        </form>
                    </div>
                `;

                // Listeners do formulário
                modal.querySelector('#btnCloseFormModal').onclick = () => modal.remove();
                modal.querySelector('#btnBackToProfiles').onclick = () => renderCardsView();
                modal.querySelector('#btnCancelForm').onclick = () => renderCardsView();

                // Destaque visual dos radios
                modal.querySelectorAll('input[name="formAgeTier"]').forEach(radio => {
                    radio.addEventListener('change', () => {
                        modal.querySelectorAll('#ageOptionsGrid label').forEach(lbl => {
                            lbl.className = 'p-2 rounded-xl border-2 flex items-center gap-2 cursor-pointer transition-all border-slate-200 bg-white text-slate-600';
                        });
                        radio.closest('label').className = 'p-2 rounded-xl border-2 flex items-center gap-2 cursor-pointer transition-all border-amber-500 bg-amber-50 font-black text-amber-900';
                    });
                });

                modal.querySelectorAll('input[name="formMascot"]').forEach(radio => {
                    radio.addEventListener('change', () => {
                        modal.querySelectorAll('#mascotOptionsGrid label').forEach(lbl => {
                            lbl.className = 'relative flex flex-col items-center p-2 rounded-2xl border-2 cursor-pointer transition-all border-slate-200 bg-slate-50 hover:bg-white';
                        });
                        radio.closest('label').className = 'relative flex flex-col items-center p-2 rounded-2xl border-2 cursor-pointer transition-all border-amber-500 bg-amber-50 ring-2 ring-amber-300';
                    });
                });

                modal.querySelector('#studentProfileForm').onsubmit = (e) => {
                    e.preventDefault();
                    const name = modal.querySelector('#inputStudentName').value.trim();
                    const ageTier = modal.querySelector('input[name="formAgeTier"]:checked')?.value || 'age_6_7';
                    const mascot = modal.querySelector('input[name="formMascot"]:checked')?.value || 'jaguar';

                    if (!name) return;

                    if (isEditing) {
                        self.update(studentToEdit.id, { name, ageTier, mascot });
                    } else {
                        self.create({ name, ageTier, mascot });
                    }

                    modal.remove();
                    if (typeof options.onSelect === 'function') options.onSelect(self.getActive());
                };
            };

            renderCardsView();
            document.body.appendChild(modal);
        }
    };

    // Inicialização automática silenciosa
    _migrateLegacyData();

    window.StudentProfileEngine = StudentProfileEngine;

})(window);
