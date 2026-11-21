// avatar-wardrobe.js — Sistema de Recompensas & Customização de Avatar ("Camarim do Mascote" — KumonGen 3.0)
// 100% Offline, Vetorial (SVG Inline), Retrocompatível com StudentProfileEngine & SafeStorage.

(function(global) {
    'use strict';

    const SLOTS = {
        hat:     { id: 'hat',     label: 'Chapéus', icon: 'fa-hat-wizard', emoji: '🎩' },
        glasses: { id: 'glasses', label: 'Óculos',  icon: 'fa-glasses',    emoji: '🕶️' },
        outfit:  { id: 'outfit',  label: 'Roupas',  icon: 'fa-vest',       emoji: '🦸' },
        aura:    { id: 'aura',    label: 'Auras',   icon: 'fa-sparkles',   emoji: '✨' }
    };

    // Catálogo Vetorial (ViewBox 0 0 100 100 alinhado ao círculo do avatar 20..80)
    const CATALOG = [
        // ================= CHAPÉUS (HAT) =================
        {
            id: 'hat_crown_starter',
            slot: 'hat',
            name: 'Coroa de Estrela',
            cost: 0,
            badge: 'Grátis Inicial',
            previewEmoji: '👑',
            svg: `<svg viewBox="0 0 100 100" class="avatar-layer-svg avatar-layer-hat" aria-hidden="true">
                <polygon points="28,26 35,8 50,20 65,8 72,26" fill="#fbbf24" stroke="#b45309" stroke-width="2.5" stroke-linejoin="round"/>
                <rect x="28" y="24" width="44" height="5" rx="2" fill="#f59e0b" stroke="#b45309" stroke-width="1.8"/>
                <circle cx="50" cy="18" r="3.2" fill="#ef4444" stroke="#ffffff" stroke-width="1"/>
                <circle cx="35" cy="8" r="2.5" fill="#fef08a"/>
                <circle cx="65" cy="8" r="2.5" fill="#fef08a"/>
            </svg>`
        },
        {
            id: 'hat_cap_kumon',
            slot: 'hat',
            name: 'Boné Super Kumon',
            cost: 10,
            badge: 'Esportivo',
            previewEmoji: '🧢',
            svg: `<svg viewBox="0 0 100 100" class="avatar-layer-svg avatar-layer-hat" aria-hidden="true">
                <path d="M26,28 C26,10 72,10 72,28 Z" fill="#2563eb" stroke="#1e3a8a" stroke-width="2.5"/>
                <path d="M48,24 L84,29 C84,33 65,33 46,29 Z" fill="#38bdf8" stroke="#1e3a8a" stroke-width="2"/>
                <circle cx="49" cy="20" r="4" fill="#fbbf24"/>
            </svg>`
        },
        {
            id: 'hat_wizard_math',
            slot: 'hat',
            name: 'Mago dos Números',
            cost: 20,
            badge: 'Místico',
            previewEmoji: '🧙',
            svg: `<svg viewBox="0 0 100 100" class="avatar-layer-svg avatar-layer-hat" aria-hidden="true">
                <ellipse cx="50" cy="26" rx="28" ry="6" fill="#4f46e5" stroke="#312e81" stroke-width="2.2"/>
                <path d="M32,25 L52,2 L68,25 Z" fill="#6366f1" stroke="#312e81" stroke-width="2.2" stroke-linejoin="round"/>
                <path d="M34,23 Q50,26 66,23" stroke="#fbbf24" stroke-width="3.5" fill="none"/>
                <circle cx="49" cy="14" r="2.5" fill="#fef08a"/>
                <circle cx="55" cy="19" r="1.8" fill="#fef08a"/>
            </svg>`
        },
        {
            id: 'hat_astro_helmet',
            slot: 'hat',
            name: 'Antena Espacial',
            cost: 35,
            badge: 'Galáctico',
            previewEmoji: '🚀',
            svg: `<svg viewBox="0 0 100 100" class="avatar-layer-svg avatar-layer-hat" aria-hidden="true">
                <line x1="50" y1="18" x2="50" y2="5" stroke="#38bdf8" stroke-width="3" stroke-linecap="round"/>
                <circle cx="50" cy="5" r="4.5" fill="#f43f5e" stroke="#ffffff" stroke-width="1.5"/>
                <path d="M22,34 A30,30 0 0,1 78,34" fill="none" stroke="#e2e8f0" stroke-width="4" stroke-linecap="round"/>
                <path d="M26,30 A26,26 0 0,1 74,30" fill="none" stroke="#38bdf8" stroke-width="2" stroke-dasharray="4,3"/>
            </svg>`
        },

        // ================= ÓCULOS (GLASSES) =================
        {
            id: 'glasses_smart',
            slot: 'glasses',
            name: 'Óculos Genial',
            cost: 10,
            badge: 'Cientista',
            previewEmoji: '🤓',
            svg: `<svg viewBox="0 0 100 100" class="avatar-layer-svg avatar-layer-glasses" aria-hidden="true">
                <circle cx="38" cy="46" r="10" fill="rgba(224,242,254,0.35)" stroke="#0f172a" stroke-width="3"/>
                <circle cx="62" cy="46" r="10" fill="rgba(224,242,254,0.35)" stroke="#0f172a" stroke-width="3"/>
                <line x1="48" y1="46" x2="52" y2="46" stroke="#fbbf24" stroke-width="3"/>
                <line x1="34" y1="42" x2="38" y2="40" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
                <line x1="58" y1="42" x2="62" y2="40" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
            </svg>`
        },
        {
            id: 'glasses_star',
            slot: 'glasses',
            name: 'Óculos Estrela Pop',
            cost: 15,
            badge: 'Brilhante',
            previewEmoji: '🤩',
            svg: `<svg viewBox="0 0 100 100" class="avatar-layer-svg avatar-layer-glasses" aria-hidden="true">
                <polygon points="38,35 41,42 48,42 42,47 44,54 38,50 32,54 34,47 28,42 35,42" fill="rgba(244,63,94,0.45)" stroke="#fbbf24" stroke-width="2.2"/>
                <polygon points="62,35 65,42 72,42 66,47 68,54 62,50 56,54 58,47 52,42 59,42" fill="rgba(244,63,94,0.45)" stroke="#fbbf24" stroke-width="2.2"/>
                <line x1="46" y1="44" x2="54" y2="44" stroke="#fbbf24" stroke-width="2.5"/>
            </svg>`
        },
        {
            id: 'glasses_cyber',
            slot: 'glasses',
            name: 'Visor Cyber-Leitor',
            cost: 25,
            badge: 'Futurista',
            previewEmoji: '🥽',
            svg: `<svg viewBox="0 0 100 100" class="avatar-layer-svg avatar-layer-glasses" aria-hidden="true">
                <rect x="24" y="39" width="52" height="13" rx="6.5" fill="rgba(6,182,212,0.55)" stroke="#22d3ee" stroke-width="2.5"/>
                <line x1="30" y1="43" x2="50" y2="43" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
                <circle cx="68" cy="45.5" r="2" fill="#fde047"/>
            </svg>`
        },

        // ================= ROUPAS / COLARINHOS (OUTFIT) =================
        {
            id: 'outfit_bowtie',
            slot: 'outfit',
            name: 'Gravata Borboleta',
            cost: 5,
            badge: 'Elegante',
            previewEmoji: '🎀',
            svg: `<svg viewBox="0 0 100 100" class="avatar-layer-svg avatar-layer-outfit" aria-hidden="true">
                <polygon points="34,74 48,80 34,86" fill="#ef4444" stroke="#991b1b" stroke-width="2" stroke-linejoin="round"/>
                <polygon points="66,74 52,80 66,86" fill="#ef4444" stroke="#991b1b" stroke-width="2" stroke-linejoin="round"/>
                <circle cx="50" cy="80" r="4" fill="#fbbf24" stroke="#991b1b" stroke-width="1.8"/>
            </svg>`
        },
        {
            id: 'outfit_medal',
            slot: 'outfit',
            name: 'Medalhão Mestre',
            cost: 15,
            badge: 'Campeão',
            previewEmoji: '🏅',
            svg: `<svg viewBox="0 0 100 100" class="avatar-layer-svg avatar-layer-outfit" aria-hidden="true">
                <path d="M34,72 L50,83 L66,72" fill="none" stroke="#2563eb" stroke-width="4" stroke-linecap="round"/>
                <circle cx="50" cy="84" r="7.5" fill="#fbbf24" stroke="#b45309" stroke-width="2"/>
                <circle cx="50" cy="84" r="3.5" fill="#fef08a"/>
            </svg>`
        },
        {
            id: 'outfit_cape',
            slot: 'outfit',
            name: 'Capa Super-Herói',
            cost: 30,
            badge: 'Épico',
            previewEmoji: '🦸',
            svg: `<svg viewBox="0 0 100 100" class="avatar-layer-svg avatar-layer-outfit" aria-hidden="true">
                <path d="M18,68 Q12,86 28,92 L38,78 Z" fill="#dc2626" stroke="#991b1b" stroke-width="2"/>
                <path d="M82,68 Q88,86 72,92 L62,78 Z" fill="#dc2626" stroke="#991b1b" stroke-width="2"/>
                <path d="M30,74 Q50,84 70,74" fill="none" stroke="#fbbf24" stroke-width="3.5" stroke-linecap="round"/>
                <circle cx="50" cy="79" r="4.5" fill="#fbbf24" stroke="#991b1b" stroke-width="1.8"/>
            </svg>`
        },

        // ================= AURAS (AURA) =================
        {
            id: 'aura_sparkles',
            slot: 'aura',
            name: 'Chuva de Estrelas',
            cost: 15,
            badge: 'Cintilante',
            previewEmoji: '✨',
            svg: `<svg viewBox="0 0 100 100" class="avatar-layer-svg avatar-layer-aura" aria-hidden="true">
                <circle cx="50" cy="50" r="39" fill="none" stroke="#fbbf24" stroke-width="2" stroke-dasharray="5,5"/>
                <circle cx="14" cy="30" r="3.5" fill="#fbbf24"/>
                <circle cx="86" cy="28" r="3" fill="#fde047"/>
                <circle cx="16" cy="72" r="2.8" fill="#fde047"/>
                <circle cx="85" cy="70" r="3.5" fill="#fbbf24"/>
            </svg>`
        },
        {
            id: 'aura_rainbow',
            slot: 'aura',
            name: 'Aura Arco-Íris 100%',
            cost: 40,
            badge: 'Lendário',
            previewEmoji: '🌈',
            svg: `<svg viewBox="0 0 100 100" class="avatar-layer-svg avatar-layer-aura" aria-hidden="true">
                <defs>
                    <linearGradient id="kumonRainbowAura" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stop-color="#f43f5e"/>
                        <stop offset="33%" stop-color="#fbbf24"/>
                        <stop offset="66%" stop-color="#10b981"/>
                        <stop offset="100%" stop-color="#6366f1"/>
                    </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="40" fill="none" stroke="url(#kumonRainbowAura)" stroke-width="4"/>
                <circle cx="12" cy="50" r="3.5" fill="#f43f5e"/>
                <circle cx="88" cy="50" r="3.5" fill="#6366f1"/>
                <circle cx="50" cy="10" r="3.5" fill="#fbbf24"/>
            </svg>`
        }
    ];

    function getItemById(itemId) {
        return CATALOG.find(it => it.id === itemId) || null;
    }

    function ensureWardrobe(student) {
        if (!student || typeof student !== 'object') {
            return {
                unlocked: ['hat_crown_starter'],
                equipped: { hat: 'hat_crown_starter', glasses: null, outfit: null, aura: null },
                starsSpent: 0
            };
        }
        if (!student.wardrobe || typeof student.wardrobe !== 'object') {
            student.wardrobe = {
                unlocked: ['hat_crown_starter'],
                equipped: { hat: 'hat_crown_starter', glasses: null, outfit: null, aura: null },
                starsSpent: 0
            };
        } else {
            if (!Array.isArray(student.wardrobe.unlocked)) {
                student.wardrobe.unlocked = ['hat_crown_starter'];
            } else if (!student.wardrobe.unlocked.includes('hat_crown_starter')) {
                student.wardrobe.unlocked.push('hat_crown_starter');
            }
            student.wardrobe.equipped = Object.assign(
                { hat: null, glasses: null, outfit: null, aura: null },
                student.wardrobe.equipped || {}
            );
            if (typeof student.wardrobe.starsSpent !== 'number' || isNaN(student.wardrobe.starsSpent)) {
                student.wardrobe.starsSpent = 0;
            }
        }
        return student.wardrobe;
    }

    function getTotalStars(student) {
        const s = student || (global.StudentProfileEngine && global.StudentProfileEngine.getActive());
        if (!s || !s.gamification) return 0;
        return Math.max(0, Number(s.gamification.stars) || 0);
    }

    function getSpendableStars(student) {
        const s = student || (global.StudentProfileEngine && global.StudentProfileEngine.getActive());
        if (!s) return 0;
        const w = ensureWardrobe(s);
        const total = getTotalStars(s);
        return Math.max(0, total - (w.starsSpent || 0));
    }

    function saveStudentWardrobe(student) {
        if (!student || !global.StudentProfileEngine) return;
        const w = ensureWardrobe(student);
        global.StudentProfileEngine.update(student.id, { wardrobe: w });
        try {
            if (typeof window !== 'undefined' && typeof CustomEvent === 'function') {
                window.dispatchEvent(new CustomEvent('kumongen:wardrobe_changed', { detail: { student } }));
            }
        } catch (e) {}
    }

    function unlockItem(itemId, studentId) {
        if (!global.StudentProfileEngine) return { success: false, reason: 'no_engine' };
        const student = studentId
            ? global.StudentProfileEngine.getById(studentId)
            : global.StudentProfileEngine.getActive();
        if (!student) return { success: false, reason: 'no_student' };

        const item = getItemById(itemId);
        if (!item) return { success: false, reason: 'invalid_item' };

        const w = ensureWardrobe(student);
        if (w.unlocked.includes(item.id)) {
            w.equipped[item.slot] = item.id;
            saveStudentWardrobe(student);
            return { success: true, alreadyUnlocked: true, item, wardrobe: w };
        }

        const available = getSpendableStars(student);
        if (available < item.cost) {
            return {
                success: false,
                reason: 'insufficient_stars',
                needed: item.cost - available,
                available
            };
        }

        w.starsSpent = (w.starsSpent || 0) + item.cost;
        w.unlocked.push(item.id);
        w.equipped[item.slot] = item.id;
        saveStudentWardrobe(student);

        return {
            success: true,
            item,
            wardrobe: w,
            spendableStars: getSpendableStars(student)
        };
    }

    function toggleEquip(itemId, studentId) {
        if (!global.StudentProfileEngine) return { success: false, reason: 'no_engine' };
        const student = studentId
            ? global.StudentProfileEngine.getById(studentId)
            : global.StudentProfileEngine.getActive();
        if (!student) return { success: false, reason: 'no_student' };

        const item = getItemById(itemId);
        if (!item) return { success: false, reason: 'invalid_item' };

        const w = ensureWardrobe(student);
        if (!w.unlocked.includes(item.id)) {
            return unlockItem(itemId, student.id);
        }

        const isCurrentlyEquipped = w.equipped[item.slot] === item.id;
        w.equipped[item.slot] = isCurrentlyEquipped ? null : item.id;
        saveStudentWardrobe(student);

        return {
            success: true,
            equipped: !isCurrentlyEquipped,
            item,
            wardrobe: w
        };
    }

    function renderAvatarHtml(student, imgExtraClass = '', imgId = '') {
        const s = student || (global.StudentProfileEngine && global.StudentProfileEngine.getActive());
        const presets = (global.StudentProfileEngine && global.StudentProfileEngine.MASCOTS) || {};
        const mascot = (s && presets[s.mascot]) || presets.jaguar || {
            id: 'jaguar',
            name: 'Jade',
            avatar: 'assets/mascotes/jaguar_avatar.png'
        };
        const w = ensureWardrobe(s);
        const eq = w.equipped || {};

        const layersOrder = ['aura', 'outfit', 'glasses', 'hat'];
        const svgLayers = layersOrder.map(slotKey => {
            const itemId = eq[slotKey];
            if (!itemId) return '';
            const item = getItemById(itemId);
            return item ? item.svg : '';
        }).join('');

        const idAttr = imgId ? ` id="${imgId}"` : '';
        return `<div class="kumon-avatar-composed" data-mascot="${mascot.id || 'jaguar'}"><img${idAttr} src="${mascot.avatar}" alt="${mascot.name}" class="avatar-base-img ${imgExtraClass}">${svgLayers}</div>`;
    }

    // Som alegre sintetizado ao equipar/desbloquear roupa (zero dependência externa)
    function playWardrobeChime(isUnlock) {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const notes = isUnlock ? [523.25, 659.25, 783.99, 1046.5] : [587.33, 880];
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.value = freq;
                gain.gain.setValueAtTime(0.14, ctx.currentTime + i * 0.07);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.22);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + i * 0.07);
                osc.stop(ctx.currentTime + i * 0.07 + 0.24);
            });
        } catch (e) {}
    }

    // Modal Interativo: "Camarim do Mascote"
    function openModal(studentId = null, options = {}) {
        if (!global.StudentProfileEngine) return;
        const existing = document.getElementById('avatarWardrobeModal');
        if (existing) existing.remove();

        let activeSlot = 'hat';
        let feedbackBanner = '';

        const modal = document.createElement('div');
        modal.id = 'avatarWardrobeModal';
        modal.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:14px;background:rgba(15,23,42,0.65);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);overflow-y:auto;touch-action:manipulation;box-sizing:border-box;';

        const closeModal = () => {
            document.removeEventListener('keydown', escHandler);
            if (modal && modal.parentNode) modal.remove();
            if (typeof options.onClose === 'function') options.onClose();
        };

        const escHandler = (e) => {
            if (e.key === 'Escape') closeModal();
        };
        document.addEventListener('keydown', escHandler);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        const renderContent = () => {
            const student = studentId
                ? global.StudentProfileEngine.getById(studentId)
                : global.StudentProfileEngine.getActive();
            if (!student) {
                closeModal();
                return;
            }

            const w = ensureWardrobe(student);
            const spendable = getSpendableStars(student);
            const totalStars = getTotalStars(student);
            const mascot = global.StudentProfileEngine.MASCOTS[student.mascot] || global.StudentProfileEngine.MASCOTS.jaguar;

            const tabsHtml = Object.keys(SLOTS).map(slotKey => {
                const sl = SLOTS[slotKey];
                const isSelected = slotKey === activeSlot;
                const equippedInSlot = w.equipped[slotKey] ? '●' : '';
                return `
                    <button type="button" class="wardrobe-slot-tab" data-slot="${slotKey}" style="flex:1;min-height:44px;padding:6px 4px;border-radius:14px;border:2px solid ${isSelected ? '#f59e0b' : '#e2e8f0'};background:${isSelected ? '#fffbeb' : '#ffffff'};color:${isSelected ? '#b45309' : '#475569'};font-weight:900;font-size:11px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;transition:all 0.15s ease;">
                        <span style="font-size:15px;line-height:1;">${sl.emoji}</span>
                        <span style="line-height:1.1;">${sl.label} ${equippedInSlot ? `<span style="color:#10b981;">${equippedInSlot}</span>` : ''}</span>
                    </button>
                `;
            }).join('');

            const slotItems = CATALOG.filter(it => it.slot === activeSlot);
            const cardsHtml = slotItems.map(item => {
                const isUnlocked = w.unlocked.includes(item.id);
                const isEquipped = w.equipped[item.slot] === item.id;
                const canAfford = spendable >= item.cost;

                let btnStyle = '';
                let btnLabel = '';
                if (isEquipped) {
                    btnStyle = 'background:#10b981;color:#ffffff;border:none;';
                    btnLabel = '<i class="fas fa-check"></i> Equipado (Tirar)';
                } else if (isUnlocked) {
                    btnStyle = 'background:#eff6ff;color:#1d4ed8;border:1.5px solid #93c5fd;';
                    btnLabel = '<i class="fas fa-tshirt"></i> Vestir Agora';
                } else if (canAfford) {
                    btnStyle = 'background:linear-gradient(to right, #f59e0b, #ea580c);color:#ffffff;border:none;';
                    btnLabel = `<i class="fas fa-unlock"></i> Trocar por ${item.cost} ★`;
                } else {
                    btnStyle = 'background:#f1f5f9;color:#94a3b8;border:1px solid #cbd5e1;';
                    btnLabel = `<i class="fas fa-lock"></i> Falta ${item.cost - spendable} ★ (${item.cost} ★)`;
                }

                return `
                    <div class="wardrobe-item-card" data-item-id="${item.id}" style="padding:12px;border-radius:18px;border:2px solid ${isEquipped ? '#10b981' : (isUnlocked ? '#bfdbfe' : '#e2e8f0')};background:${isEquipped ? '#f0fdf4' : '#ffffff'};display:flex;flex-direction:column;align-items:center;justify-content:space-between;text-align:center;gap:8px;box-shadow:0 2px 6px rgba(0,0,0,0.03);">
                        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;font-size:9px;font-weight:800;color:#64748b;">
                            <span style="background:#f1f5f9;padding:2px 6px;border-radius:999px;">${item.badge}</span>
                            <span style="color:${isUnlocked ? '#059669' : '#d97706'};font-weight:900;">${isUnlocked ? 'Desbloqueado' : `${item.cost} ★`}</span>
                        </div>
                        <div style="width:52px;height:52px;border-radius:16px;background:#f8fafc;border:1px dashed #cbd5e1;display:flex;align-items:center;justify-content:center;font-size:28px;">
                            ${item.previewEmoji}
                        </div>
                        <div style="font-weight:900;font-size:12px;color:#0f172a;line-height:1.2;">${item.name}</div>
                        <button type="button" class="wardrobe-action-btn" data-item-id="${item.id}" style="width:100%;min-height:40px;padding:7px 10px;border-radius:12px;font-weight:900;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;transition:transform 0.12s ease;${btnStyle}">
                            ${btnLabel}
                        </button>
                    </div>
                `;
            }).join('');

            modal.innerHTML = `
                <div style="background:#ffffff;border-radius:26px;max-width:460px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 25px 50px -12px rgba(0,0,0,0.45);border:4px solid #f59e0b;overflow:hidden;margin:auto;box-sizing:border-box;" onclick="event.stopPropagation()">
                    <!-- Header -->
                    <div style="padding:12px 16px;background:linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);border-bottom:1px solid #fde68a;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            <div style="width:36px;height:36px;border-radius:12px;background:#f59e0b;color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 6px rgba(245,158,11,0.3);">
                                <i class="fas fa-hat-wizard"></i>
                            </div>
                            <div>
                                <h3 style="margin:0;font-weight:900;font-size:15px;color:#0f172a;line-height:1.1;">Camarim de ${mascot.name}</h3>
                                <span style="font-size:10px;font-weight:800;color:#b45309;">Troque suas estrelas por roupas!</span>
                            </div>
                        </div>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <div id="wardrobeStarsBadge" style="background:#ffffff;border:2px solid #f59e0b;border-radius:999px;padding:4px 10px;display:flex;align-items:center;gap:4px;font-weight:900;font-size:12px;color:#d97706;box-shadow:0 1px 3px rgba(0,0,0,0.06);" title="Total histórico conquistado: ${totalStars} estrelas">
                                <i class="fas fa-star" style="color:#f59e0b;"></i>
                                <span id="wardrobeSpendableCount">${spendable}</span>
                            </div>
                            <button type="button" id="closeWardrobeModalBtn" style="width:36px;height:36px;border-radius:10px;border:none;background:rgba(255,255,255,0.8);color:#64748b;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;" aria-label="Fechar Camarim">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Palco do Mascote (Live Preview) -->
                    <div style="padding:16px;background:radial-gradient(circle at center, #eff6ff 0%, #f8fafc 100%);border-bottom:1px solid #e2e8f0;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;">
                        <div id="wardrobeStageMascot" style="width:96px;height:96px;border-radius:9999px;padding:4px;background:linear-gradient(135deg, #fbbf24, #f97316);box-shadow:0 10px 25px -5px rgba(245,158,11,0.35);">
                            ${renderAvatarHtml(student)}
                        </div>
                        <div id="wardrobeSpeechMsg" style="margin-top:10px;padding:5px 12px;border-radius:999px;background:#ffffff;border:1px solid #cbd5e1;font-size:11px;font-weight:800;color:#334155;box-shadow:0 1px 2px rgba(0,0,0,0.04);">
                            ${feedbackBanner || `✨ "${mascot.name} está pronto(a) para brilhar nos estudos!"`}
                        </div>
                    </div>

                    <!-- Abas de Categorias -->
                    <div style="padding:10px 14px 4px 14px;background:#f8fafc;display:flex;gap:6px;flex-shrink:0;">
                        ${tabsHtml}
                    </div>

                    <!-- Grade de Acessórios -->
                    <div style="padding:10px 14px 14px 14px;background:#f8fafc;overflow-y:auto;flex:1;min-height:0;">
                        <div style="display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:10px;">
                            ${cardsHtml}
                        </div>
                    </div>

                    <!-- Rodapé -->
                    <div style="padding:10px 16px;background:#ffffff;border-top:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;font-size:11px;color:#64748b;">
                        <span><i class="fas fa-trophy" style="color:#f59e0b;"></i> Total ganho: <strong>${totalStars} ★</strong></span>
                        <button type="button" id="btnDoneWardrobe" style="padding:8px 18px;border-radius:12px;border:none;background:#0f172a;color:#ffffff;font-weight:900;font-size:12px;cursor:pointer;">
                            Pronto!
                        </button>
                    </div>
                </div>
            `;

            modal.querySelector('#closeWardrobeModalBtn').onclick = closeModal;
            modal.querySelector('#btnDoneWardrobe').onclick = closeModal;

            modal.querySelectorAll('.wardrobe-slot-tab').forEach(tabBtn => {
                tabBtn.onclick = () => {
                    activeSlot = tabBtn.getAttribute('data-slot') || 'hat';
                    feedbackBanner = '';
                    renderContent();
                };
            });

            modal.querySelectorAll('.wardrobe-action-btn').forEach(actBtn => {
                actBtn.onclick = () => {
                    const itemId = actBtn.getAttribute('data-item-id');
                    const item = getItemById(itemId);
                    if (!item) return;

                    const wasUnlocked = w.unlocked.includes(itemId);
                    const res = toggleEquip(itemId, student.id);

                    if (!res.success && res.reason === 'insufficient_stars') {
                        feedbackBanner = `🔒 Complete mais folhas para ganhar +${res.needed} ★ e liberar "${item.name}"!`;
                        renderContent();
                        return;
                    }

                    playWardrobeChime(!wasUnlocked);
                    if (!wasUnlocked) {
                        feedbackBanner = `🎉 UAU! Você desbloqueou "${item.name}"!`;
                    } else if (res.equipped) {
                        feedbackBanner = `😎 "${item.name}" equipado com sucesso!`;
                    } else {
                        feedbackBanner = `👌 "${item.name}" guardado no armário.`;
                    }

                    renderContent();

                    // Animação elástica com Anime.js no mascote se disponível
                    const stageEl = modal.querySelector('#wardrobeStageMascot');
                    if (stageEl && typeof global.anime === 'function') {
                        global.anime.remove(stageEl);
                        global.anime({
                            targets: stageEl,
                            scale: [0.82, 1.12, 1.0],
                            rotate: [-6, 6, 0],
                            duration: 650,
                            easing: 'easeOutElastic(1, .5)'
                        });
                    }
                };
            });
        };

        document.body.appendChild(modal);
        renderContent();
    }

    const AvatarWardrobe = {
        SLOTS,
        CATALOG,
        getItemById,
        ensureWardrobe,
        getTotalStars,
        getTotalEarnedStars: getTotalStars,
        getSpendableStars,
        unlockItem,
        toggleEquip,
        renderAvatarHtml,
        openModal
    };

    global.AvatarWardrobe = AvatarWardrobe;

})(typeof window !== 'undefined' ? window : this);
