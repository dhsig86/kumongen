/**
 * KumonGen 3.0 — Tablet Player & Gamification Engine
 * (tablet-player.js)
 * 
 * Modo Interativo para Tablet / iPad / Mobile-first:
 * - Áudio sintetizado via Web Audio API (100% offline, zero MP3)
 * - Gamificação real (estrelas, streaks, badges, meta pedagógica)
 * - Teclado virtual touch otimizado (não sobe o teclado nativo do SO)
 * - Card de foco único com Worked Example dismissível
 * - Traçado interativo de letras em Canvas com touch/stylus
 * - Chips de sílabas interativas para Português e Inglês
 * - Emissão de Certificado de Conquista Oficial em PDF via jsPDF
 */

(function() {
    'use strict';

    // ============================================================
    // 1. MOTOR DE ÁUDIO SINTETIZADO (Web Audio API)
    // ============================================================
    class SoundEngine {
        constructor() {
            this.ctx = null;
            this.muted = localStorage.getItem('kumongen_tablet_muted') === 'true';
        }

        init() {
            if (!this.ctx) {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (AudioContextClass) {
                    this.ctx = new AudioContextClass();
                }
            }
            if (this.ctx && this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        toggleMute() {
            this.muted = !this.muted;
            localStorage.setItem('kumongen_tablet_muted', this.muted ? 'true' : 'false');
            return this.muted;
        }

        playTone(freq, duration, type = 'sine', gainVal = 0.2, delay = 0) {
            if (this.muted) return;
            this.init();
            if (!this.ctx) return;
            try {
                const now = this.ctx.currentTime + delay;
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = type;
                osc.frequency.setValueAtTime(freq, now);

                gain.gain.setValueAtTime(gainVal, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

                osc.connect(gain);
                gain.connect(this.ctx.destination);

                osc.start(now);
                osc.stop(now + duration);
            } catch (e) {
                console.warn('AudioContext tone error', e);
            }
        }

        // Acorde alegre de acerto (C5 - E5 - G5 - C6)
        playSuccess() {
            if (this.muted) return;
            this.playTone(523.25, 0.14, 'triangle', 0.22, 0);
            this.playTone(659.25, 0.14, 'triangle', 0.22, 0.08);
            this.playTone(783.99, 0.18, 'triangle', 0.25, 0.16);
            this.playTone(1046.50, 0.35, 'sine', 0.28, 0.24);
        }

        // Boop suave e acolhedor (não punitivo)
        playWrong() {
            if (this.muted) return;
            this.playTone(260, 0.14, 'sine', 0.15, 0);
            this.playTone(196, 0.22, 'sine', 0.18, 0.1);
        }

        // Fanfarra de comemoração de final de rodada
        playFanfare() {
            if (this.muted) return;
            const notes = [
                { f: 392.00, d: 0.15, t: 0 },
                { f: 523.25, d: 0.15, t: 0.12 },
                { f: 659.25, d: 0.15, t: 0.24 },
                { f: 783.99, d: 0.22, t: 0.36 },
                { f: 1046.50, d: 0.60, t: 0.52 }
            ];
            notes.forEach(n => this.playTone(n.f, n.d, 'triangle', 0.3, n.t));
        }

        // Clique tátil no teclado
        playClick() {
            if (this.muted) return;
            this.playTone(700, 0.03, 'sine', 0.06, 0);
        }
    }

    const sound = new SoundEngine();

    // Síntese de voz para fonética
    function speakWord(text, lang = 'pt-BR') {
        if (!('speechSynthesis' in window) || sound.muted) return;
        try {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            utterance.rate = 0.85; // fala um pouco mais pausada para crianças
            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.warn('SpeechSynthesis error', e);
        }
    }

    // ============================================================
    // 2. SISTEMA DE GAMIFICAÇÃO (localStorage 'kumongen_gamification_v3')
    // ============================================================
    const BADGE_DEFINITIONS = [
        { id: 'primeiro_passo', title: 'Primeiro Passo', desc: 'Completou sua primeira rodada no tablet!', icon: 'fa-seedling', color: 'text-emerald-400' },
        { id: 'fogo_5', title: 'Sequência de Fogo', desc: 'Acertou 5 exercícios seguidos sem errar!', icon: 'fa-fire', color: 'text-amber-500' },
        { id: 'mestre_10', title: 'Imparável', desc: 'Acertou 10 exercícios seguidos!', icon: 'fa-bolt', color: 'text-yellow-400' },
        { id: 'velocidade_kumon', title: 'Velocidade da Luz', desc: 'Terminou a rodada dentro da meta de tempo SCT!', icon: 'fa-stopwatch', color: 'text-blue-400' },
        { id: 'nota_10', title: 'Perfeição Kumon', desc: '100% de acertos de primeira na rodada!', icon: 'fa-crown', color: 'text-purple-400' },
        { id: 'dedicado_3', title: 'Super Dedicado', desc: 'Completou 3 rodadas de treino!', icon: 'fa-medal', color: 'text-indigo-400' },
        { id: 'campeao_10', title: 'Mestre Kumon', desc: 'Completou 10 rodadas de exercícios!', icon: 'fa-trophy', color: 'text-yellow-500' }
    ];

    const Gamification = {
        STORAGE_KEY: 'kumongen_gamification_v3',

        get() {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            if (!raw) {
                return {
                    stars: 0,
                    streak: 0,
                    bestStreak: 0,
                    totalRounds: 0,
                    totalCorrect: 0,
                    badges: [],
                    lastPlayed: null
                };
            }
            try {
                return JSON.parse(raw);
            } catch (e) {
                return { stars: 0, streak: 0, bestStreak: 0, totalRounds: 0, totalCorrect: 0, badges: [] };
            }
        },

        save(data) {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
        },

        addStars(count) {
            const data = this.get();
            data.stars = (data.stars || 0) + count;
            this.save(data);
            return data.stars;
        },

        registerCorrect() {
            const data = this.get();
            data.totalCorrect = (data.totalCorrect || 0) + 1;
            data.streak = (data.streak || 0) + 1;
            if (data.streak > (data.bestStreak || 0)) {
                data.bestStreak = data.streak;
            }
            this.save(data);
            return { streak: data.streak, bestStreak: data.bestStreak };
        },

        resetStreak() {
            const data = this.get();
            data.streak = 0;
            this.save(data);
        },

        registerRoundFinished(accuracy, timeSeconds, targetSctSeconds) {
            const data = this.get();
            data.totalRounds = (data.totalRounds || 0) + 1;
            data.lastPlayed = new Date().toISOString();

            const newlyUnlocked = [];

            // Checagem de badges
            if (!data.badges.includes('primeiro_passo')) {
                data.badges.push('primeiro_passo');
                newlyUnlocked.push('primeiro_passo');
            }
            if (data.bestStreak >= 5 && !data.badges.includes('fogo_5')) {
                data.badges.push('fogo_5');
                newlyUnlocked.push('fogo_5');
            }
            if (data.bestStreak >= 10 && !data.badges.includes('mestre_10')) {
                data.badges.push('mestre_10');
                newlyUnlocked.push('mestre_10');
            }
            if (accuracy >= 100 && !data.badges.includes('nota_10')) {
                data.badges.push('nota_10');
                newlyUnlocked.push('nota_10');
            }
            if (timeSeconds <= targetSctSeconds && !data.badges.includes('velocidade_kumon')) {
                data.badges.push('velocidade_kumon');
                newlyUnlocked.push('velocidade_kumon');
            }
            if (data.totalRounds >= 3 && !data.badges.includes('dedicado_3')) {
                data.badges.push('dedicado_3');
                newlyUnlocked.push('dedicado_3');
            }
            if (data.totalRounds >= 10 && !data.badges.includes('campeao_10')) {
                data.badges.push('campeao_10');
                newlyUnlocked.push('campeao_10');
            }

            this.save(data);
            return { totalRounds: data.totalRounds, newlyUnlocked };
        }
    };

    // ============================================================
    // 3. ESTADO DA SESSÃO TABLET
    // ============================================================
    const Session = {
        subjectKey: 'matematica',
        levelId: 'm2',
        studentName: localStorage.getItem('kumongen_student_name') || 'Super Aluno',
        items: [],
        currentIndex: 0,
        currentInput: '',
        currentAttempts: 0,
        roundCorrectFirstAttempt: 0,
        startTime: null,
        timerInterval: null,
        elapsedSeconds: 0,
        targetSctSeconds: 300, // 5 min padrão
        workedExampleDismissed: false,
        activeCanvas: null
    };

    // ============================================================
    // 4. CERTIFICADO OFICIAL EM PDF (jsPDF)
    // ============================================================
    async function generateCertificatePDF(certData) {
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
            alert('Não foi possível carregar o módulo de PDF no momento. Verifique sua conexão.');
            return;
        }

        const doc = new jsPDFClass({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = 297;
        const pageHeight = 210;

        // Fundo elegante off-white / marfim
        doc.setFillColor(254, 254, 250);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');

        // Borda dupla dourada e azul marinho
        doc.setDrawColor(212, 175, 55); // Dourado
        doc.setLineWidth(2.5);
        doc.rect(12, 12, pageWidth - 24, pageHeight - 24);

        doc.setDrawColor(15, 23, 42); // Slate-900
        doc.setLineWidth(0.8);
        doc.rect(15, 15, pageWidth - 30, pageHeight - 30);

        // Ornatos nos 4 cantos
        const corners = [
            [15, 15], [pageWidth - 15, 15],
            [15, pageHeight - 15], [pageWidth - 15, pageHeight - 15]
        ];
        doc.setFillColor(212, 175, 55);
        corners.forEach(([cx, cy]) => {
            doc.circle(cx, cy, 3, 'F');
        });

        // Cabeçalho Institucional
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 64, 175); // Blue-700
        doc.setFontSize(13);
        doc.text('KUMONGEN 3.0 · PROGRAMA DE AUTONOMIA & EXCELÊNCIA', pageWidth / 2, 28, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('RECONHECIMENTO DE DISCIPLINA, CONCENTRAÇÃO E PROGRESSO DIÁRIO', pageWidth / 2, 33, { align: 'center' });

        // Título Principal
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(26);
        doc.setTextColor(15, 23, 42);
        doc.text('CERTIFICADO DE CONQUISTA', pageWidth / 2, 48, { align: 'center' });

        // Linha divisória de ouro
        doc.setDrawColor(212, 175, 55);
        doc.setLineWidth(1.2);
        doc.line(pageWidth / 2 - 45, 52, pageWidth / 2 + 45, 52);

        // Texto do Certificado
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(13);
        doc.setTextColor(51, 65, 85);
        doc.text('Certificamos com muito orgulho e louvor que o(a) aluno(a)', pageWidth / 2, 66, { align: 'center' });

        // Nome do Aluno em Destaque
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(30, 58, 138); // Deep Navy
        const studentName = (certData.studentName || 'SUPER ALUNO').toUpperCase();
        doc.text(studentName, pageWidth / 2, 80, { align: 'center' });

        const nameWidth = doc.getTextWidth(studentName);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.6);
        doc.line(pageWidth / 2 - (nameWidth / 2) - 8, 83, pageWidth / 2 + (nameWidth / 2) + 8, 83);

        // Texto de Conclusão do Nível
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(51, 65, 85);
        doc.text('concluiu com êxito a bateria de desafios de fluência interativa no módulo:', pageWidth / 2, 95, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(17);
        doc.setTextColor(15, 23, 42);
        const levelText = `${certData.levelTitle} · ${certData.subjectTitle}`;
        doc.text(levelText, pageWidth / 2, 105, { align: 'center' });

        // Caixa de Métricas de Desempenho
        const boxW = 170;
        const boxH = 20;
        const boxX = (pageWidth - boxW) / 2;
        const boxY = 116;
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(boxX, boxY, boxW, boxH, 4, 4, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.5);
        doc.roundedRect(boxX, boxY, boxW, boxH, 4, 4, 'D');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(30, 64, 175);
        const metricsStr = `Acurácia: ${certData.accuracy}%    |    Tempo: ${certData.timeFormatted} (Meta: ${certData.targetFormatted})    |    Estrelas: +${certData.starsEarned} ★`;
        doc.text(metricsStr, pageWidth / 2, boxY + 12.5, { align: 'center' });

        // Selo Dourado de Honra
        const sealX = pageWidth / 2;
        const sealY = 154;
        doc.setFillColor(212, 175, 55);
        doc.circle(sealX, sealY, 13, 'F');
        doc.setFillColor(254, 240, 138);
        doc.circle(sealX, sealY, 11, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(133, 77, 14);
        doc.text('NOTA 10', sealX, sealY - 1, { align: 'center' });
        doc.setFontSize(6.5);
        doc.text('KUMONGEN', sealX, sealY + 4, { align: 'center' });

        // Assinaturas
        const sigY = 173;
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.5);

        // Assinatura Responsável
        doc.line(40, sigY, 110, sigY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Responsável / Orientador(a)', 75, sigY + 5, { align: 'center' });

        // Assinatura KumonGen
        doc.line(pageWidth - 110, sigY, pageWidth - 40, sigY);
        doc.text('KumonGen 3.0 · Validação Digital', pageWidth - 75, sigY + 5, { align: 'center' });

        // Rodapé com data e ID
        const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`Emitido com dedicação em ${today} · Registro de Conclusão: KM-${Date.now().toString(36).toUpperCase()}`, pageWidth / 2, pageHeight - 8, { align: 'center' });

        const safeName = (certData.studentName || 'Aluno').replace(/[^a-zA-Z0-9]/g, '_');
        doc.save(`Certificado_Kumon_${safeName}.pdf`);
    }

    // ============================================================
    // 5. EFEITO DE CONFETES EM CANVAS (Puro JS, sem biblioteca externa)
    // ============================================================
    function launchConfetti() {
        const canvas = document.getElementById('confettiCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        const colors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
        const particles = [];
        for (let i = 0; i < 90; i++) {
            particles.push({
                x: canvas.width / 2,
                y: canvas.height / 2 + 50,
                vx: (Math.random() - 0.5) * 16,
                vy: (Math.random() - 0.8) * 16,
                size: Math.random() * 8 + 5,
                color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360,
                rotSpeed: (Math.random() - 0.5) * 10
            });
        }

        let frames = 0;
        function update() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.35; // gravidade
                p.vx *= 0.98;
                p.rotation += p.rotSpeed;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate((p.rotation * Math.PI) / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
                ctx.restore();
            });

            frames++;
            if (frames < 100) {
                requestAnimationFrame(update);
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
        requestAnimationFrame(update);
    }

    // ============================================================
    // 6. MOTOR DO JOGO E CONTROLE DE TELAS
    // ============================================================
    const TabletPlayer = {
        init() {
            this.bindTopNav();
            this.bindKeypad();
            this.loadInitialState();
            this.updateGamificationHeader();
        },

        bindTopNav() {
            // Seletor de matéria
            const subSelect = document.getElementById('subjectSelect');
            if (subSelect) {
                subSelect.addEventListener('change', (e) => {
                    Session.subjectKey = e.target.value;
                    this.populateLevels();
                    this.startRound();
                });
            }

            // Seletor de nível
            const lvlSelect = document.getElementById('levelSelect');
            if (lvlSelect) {
                lvlSelect.addEventListener('change', (e) => {
                    Session.levelId = e.target.value;
                    this.startRound();
                });
            }

            // Edição do nome da criança
            const nameBtn = document.getElementById('studentNameBtn');
            if (nameBtn) {
                nameBtn.addEventListener('click', () => {
                    const newName = prompt('Qual é o nome do(a) aluno(a)?', Session.studentName);
                    if (newName && newName.trim()) {
                        Session.studentName = newName.trim();
                        localStorage.setItem('kumongen_student_name', Session.studentName);
                        document.getElementById('studentNameDisplay').innerText = Session.studentName;
                    }
                });
            }

            // Som mudo / desmutado
            const soundBtn = document.getElementById('soundToggleBtn');
            if (soundBtn) {
                this.updateSoundBtn();
                soundBtn.addEventListener('click', () => {
                    sound.toggleMute();
                    this.updateSoundBtn();
                });
            }

            // Modal de Conquistas / Troféus
            const trophyBtn = document.getElementById('trophyBtn');
            if (trophyBtn) {
                trophyBtn.addEventListener('click', () => this.showBadgesModal());
            }

            // Teclado físico do computador também funciona para conveniência
            window.addEventListener('keydown', (e) => {
                if (e.key >= '0' && e.key <= '9') {
                    this.handleKeypadPress(e.key);
                } else if (e.key === 'Backspace') {
                    this.handleKeypadPress('backspace');
                } else if (e.key === 'Enter') {
                    this.handleKeypadPress('enter');
                }
            });
        },

        updateSoundBtn() {
            const btn = document.getElementById('soundToggleBtn');
            if (!btn) return;
            if (sound.muted) {
                btn.innerHTML = '<i class="fas fa-volume-mute text-slate-400"></i>';
                btn.title = 'Som desativado (clique para ativar)';
            } else {
                btn.innerHTML = '<i class="fas fa-volume-up text-blue-500"></i>';
                btn.title = 'Som ativado';
            }
        },

        bindKeypad() {
            const keypad = document.getElementById('virtualKeypad');
            if (!keypad) return;

            keypad.querySelectorAll('button[data-key]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    sound.init();
                    sound.playClick();
                    const key = btn.getAttribute('data-key');
                    this.handleKeypadPress(key);
                });
            });
        },

        loadInitialState() {
            // Permite carregar matéria e nível via Query Params: tablet.html?subject=portugues&level=p3
            const urlParams = new URLSearchParams(window.location.search);
            const qSub = urlParams.get('subject');
            const qLvl = urlParams.get('level');

            if (qSub && window.KumonSubjects && window.KumonSubjects[qSub]) {
                Session.subjectKey = qSub;
            }
            if (qLvl) {
                Session.levelId = qLvl;
            }

            const nameEl = document.getElementById('studentNameDisplay');
            if (nameEl) nameEl.innerText = Session.studentName;

            this.populateSubjects();
            this.populateLevels();
            this.startRound();
        },

        populateSubjects() {
            const subSelect = document.getElementById('subjectSelect');
            if (!subSelect || !window.KumonSubjects) return;
            subSelect.innerHTML = '';

            Object.keys(window.KumonSubjects).forEach(key => {
                const sub = window.KumonSubjects[key];
                const opt = document.createElement('option');
                opt.value = key;
                opt.innerText = sub.title;
                if (key === Session.subjectKey) opt.selected = true;
                subSelect.appendChild(opt);
            });
        },

        populateLevels() {
            const lvlSelect = document.getElementById('levelSelect');
            if (!lvlSelect || !window.KumonSubjects) return;
            const sub = window.KumonSubjects[Session.subjectKey];
            if (!sub || !sub.levels) return;

            lvlSelect.innerHTML = '';
            let levelExists = false;

            sub.levels.forEach(lvl => {
                const opt = document.createElement('option');
                opt.value = lvl.id;
                opt.innerText = lvl.title;
                if (lvl.id === Session.levelId) {
                    opt.selected = true;
                    levelExists = true;
                }
                lvlSelect.appendChild(opt);
            });

            if (!levelExists && sub.levels.length > 0) {
                Session.levelId = sub.levels[0].id;
            }
        },

        startRound() {
            const sub = window.KumonSubjects[Session.subjectKey];
            if (!sub) return;
            const level = sub.levels.find(l => l.id === Session.levelId) || sub.levels[0];
            if (!level) return;

            // Gera 10 exercícios para uma rodada rápida e focada
            const generated = sub.generate(level, 10);
            Session.items = generated && generated.length ? generated : [{ type: 'math', operand1: 2, operator: '+', operand2: 1 }];
            Session.currentIndex = 0;
            Session.currentInput = '';
            Session.currentAttempts = 0;
            Session.roundCorrectFirstAttempt = 0;
            Session.workedExampleDismissed = false;

            // Configura meta de tempo SCT Kumon (baseada em 10 itens = aprox 4 a 6 min)
            const targetMin = Math.max(3, Math.round(Session.items.length * 0.5));
            Session.targetSctSeconds = targetMin * 60;

            // Inicia cronômetro
            this.startTimer();

            // Atualiza barra de progresso e exibe card
            this.renderCurrentQuestion();
        },

        startTimer() {
            if (Session.timerInterval) clearInterval(Session.timerInterval);
            Session.startTime = Date.now();
            Session.elapsedSeconds = 0;

            const timerEl = document.getElementById('sctTimerDisplay');
            const updateTime = () => {
                Session.elapsedSeconds = Math.floor((Date.now() - Session.startTime) / 1000);
                const m = String(Math.floor(Session.elapsedSeconds / 60)).padStart(2, '0');
                const s = String(Session.elapsedSeconds % 60).padStart(2, '0');
                const targetM = Math.floor(Session.targetSctSeconds / 60);

                if (timerEl) {
                    const isOvertime = Session.elapsedSeconds > Session.targetSctSeconds;
                    timerEl.innerHTML = `<span class="${isOvertime ? 'text-amber-400 font-bold' : 'text-slate-200'}">${m}:${s}</span> <span class="text-xs text-slate-400 font-normal">/ Meta: ${targetM} min</span>`;
                }
            };

            updateTime();
            Session.timerInterval = setInterval(updateTime, 1000);
        },

        updateGamificationHeader() {
            const data = Gamification.get();
            const starsEl = document.getElementById('headerStarsCount');
            const streakEl = document.getElementById('headerStreakCount');
            const totalStars = (window.KumonGen && window.KumonGen.getScore)
                ? window.KumonGen.getScore().stars
                : (data.stars || 0);
            if (starsEl) starsEl.innerText = totalStars;
            if (streakEl) streakEl.innerText = data.streak || 0;
        },

        // ============================================================
        // 7. RENDERIZAÇÃO DO CARD DE FOCO
        // ============================================================
        renderCurrentQuestion() {
            Session.currentInput = '';
            Session.currentAttempts = 0;

            const item = Session.items[Session.currentIndex];
            const total = Session.items.length;
            const sub = window.KumonSubjects[Session.subjectKey];
            const level = sub.levels.find(l => l.id === Session.levelId);

            // Barra de progresso superior
            const progressPercent = Math.round((Session.currentIndex / total) * 100);
            const progressBar = document.getElementById('roundProgressBar');
            const progressText = document.getElementById('roundProgressText');
            if (progressBar) progressBar.style.width = `${progressPercent}%`;
            if (progressText) progressText.innerText = `Questão ${Session.currentIndex + 1} de ${total}`;

            // Exemplo guiado (Worked Example) no exercício 1
            const exampleContainer = document.getElementById('workedExampleModal');
            if (Session.currentIndex === 0 && !Session.workedExampleDismissed && exampleContainer) {
                this.renderWorkedExample(item, level);
                return;
            } else if (exampleContainer) {
                exampleContainer.classList.add('hidden');
            }

            // Exibição da instrução
            const instrEl = document.getElementById('exerciseInstruction');
            if (instrEl) {
                instrEl.innerText = level ? level.instruction : 'Resolva a questão:';
            }

            const focusContainer = document.getElementById('focusCardContainer');
            const keypadWrapper = document.getElementById('keypadWrapper');
            if (!focusContainer) return;

            // Controle de visibilidade do teclado numérico touch
            const numericTypes = ['math', 'quantity', 'sequence', 'tens'];
            if (keypadWrapper) {
                if (numericTypes.includes(item.type)) {
                    keypadWrapper.classList.remove('hidden');
                } else {
                    keypadWrapper.classList.add('hidden');
                }
            }

            // Renderiza de acordo com o tipo de exercício
            switch (item.type) {
                case 'math':
                    this.renderMathCard(item, focusContainer);
                    break;
                case 'quantity':
                    this.renderQuantityCard(item, focusContainer);
                    break;
                case 'sequence':
                    this.renderSequenceCard(item, focusContainer);
                    break;
                case 'tens':
                    this.renderTensCard(item, focusContainer);
                    break;
                case 'compare':
                    this.renderCompareCard(item, focusContainer);
                    break;
                case 'neighbors':
                    this.renderNeighborsCard(item, focusContainer);
                    break;
                case 'trace':
                    this.renderTraceCard(item, focusContainer);
                    break;
                case 'word':
                    this.renderWordCard(item, focusContainer);
                    break;
                case 'syllable':
                    this.renderSyllableCard(item, focusContainer);
                    break;
                default:
                    focusContainer.innerHTML = `<div class="p-8 text-center text-slate-400">Exercício em preparação.</div>`;
            }
        },

        // Exemplo guiado Kumon antes de começar
        renderWorkedExample(item, level) {
            const modal = document.getElementById('workedExampleModal');
            if (!modal) return;

            let solved = '';
            if (window.KumonGen && window.KumonGen.solveItem) {
                solved = window.KumonGen.solveItem(item);
            }

            let exampleHtml = '';
            if (item.type === 'math') {
                exampleHtml = `
                    <div class="text-4xl md:text-5xl font-black text-slate-800 flex items-center justify-center gap-4 my-6">
                        <span>${item.operand1}</span>
                        <span class="text-blue-600">${item.operator}</span>
                        <span>${item.operand2}</span>
                        <span>=</span>
                        <span class="bg-blue-100 text-blue-700 px-4 py-2 rounded-2xl border-2 border-dashed border-blue-400 font-black animate-pulse">${solved}</span>
                    </div>
                `;
            } else {
                exampleHtml = `
                    <div class="text-2xl font-bold text-slate-700 my-6 text-center">
                        Veja com atenção o padrão antes de responder!
                    </div>
                `;
            }

            modal.innerHTML = `
                <div class="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl text-center border-4 border-blue-400 relative animate-bounce-subtle">
                    <div class="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto text-2xl mb-3 shadow-inner">
                        <i class="fas fa-lightbulb"></i>
                    </div>
                    <span class="inline-block bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-2">Exemplo Kumon Guiado</span>
                    <h3 class="text-xl font-black text-slate-900">Como Resolver:</h3>
                    <p class="text-xs text-slate-500 mt-1">${level ? level.instruction : 'Observe o modelo resolvido:'}</p>
                    
                    ${exampleHtml}

                    <button id="dismissExampleBtn" class="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-lg rounded-2xl shadow-lg transition-transform transform active:scale-95 flex items-center justify-center gap-2">
                        <i class="fas fa-play"></i> Entendi! Começar Desafio
                    </button>
                </div>
            `;

            modal.classList.remove('hidden');
            const btn = document.getElementById('dismissExampleBtn');
            if (btn) {
                btn.addEventListener('click', () => {
                    sound.init();
                    sound.playSuccess();
                    Session.workedExampleDismissed = true;
                    modal.classList.add('hidden');
                    this.renderCurrentQuestion();
                });
            }
        },

        // Renderizador: MATEMÁTICA
        renderMathCard(item, container) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-4">
                    <div class="text-5xl md:text-7xl font-black text-slate-800 flex items-center justify-center gap-4 select-none tracking-wider">
                        <span class="text-slate-900">${item.operand1}</span>
                        <span class="text-blue-600 font-bold">${item.operator}</span>
                        <span class="text-slate-900">${item.operand2}</span>
                        <span class="text-slate-400">=</span>
                        <div id="activeAnswerBox" class="w-24 md:w-32 h-20 md:h-24 bg-blue-50 border-4 border-blue-400 rounded-2xl flex items-center justify-center text-blue-700 font-black shadow-inner text-4xl md:text-5xl">
                            <span class="text-blue-300 font-light text-2xl">?</span>
                        </div>
                    </div>
                    <div id="cardFeedbackMsg" class="h-6 mt-4 text-xs font-bold text-slate-400">Digite a resposta no teclado abaixo</div>
                </div>
            `;
        },

        // Renderizador: QUANTIDADE
        renderQuantityCard(item, container) {
            let circlesHtml = '';
            for (let i = 0; i < item.value; i++) {
                circlesHtml += `
                    <div class="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 border-2 border-white shadow-md transform hover:scale-110 transition-transform"></div>
                `;
            }

            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-2">
                    <div class="text-sm font-bold text-slate-500 mb-3">Conte quantas bolinhas amarelas há no quadro:</div>
                    <div class="bg-amber-50/70 border-2 border-amber-200 rounded-2xl p-5 flex flex-wrap items-center justify-center gap-3 max-w-sm shadow-inner min-h-[120px]">
                        ${circlesHtml}
                    </div>
                    <div class="mt-4 flex items-center gap-3">
                        <span class="text-xl font-bold text-slate-600">Total:</span>
                        <div id="activeAnswerBox" class="w-20 h-16 bg-blue-50 border-4 border-blue-400 rounded-2xl flex items-center justify-center text-blue-700 font-black shadow-inner text-3xl">
                            <span class="text-blue-300 font-light text-xl">?</span>
                        </div>
                    </div>
                    <div id="cardFeedbackMsg" class="h-6 mt-2 text-xs font-bold text-slate-400">Digite o total no teclado</div>
                </div>
            `;
        },

        // Renderizador: SEQUÊNCIA
        renderSequenceCard(item, container) {
            let seqHtml = '';
            item.sequence.forEach((val, i) => {
                if (val === '__') {
                    seqHtml += `
                        <div id="activeAnswerBox" class="w-14 h-16 md:w-20 md:h-20 bg-blue-100 border-4 border-dashed border-blue-500 rounded-2xl flex items-center justify-center text-blue-700 font-black text-2xl md:text-4xl shadow-inner animate-pulse">
                            ?
                        </div>
                    `;
                } else {
                    seqHtml += `
                        <div class="w-14 h-16 md:w-20 md:h-20 bg-slate-100 border-2 border-slate-300 rounded-2xl flex items-center justify-center text-slate-800 font-bold text-xl md:text-3xl shadow-sm">
                            ${val}
                        </div>
                    `;
                }
            });

            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-4">
                    <div class="text-sm font-bold text-slate-500 mb-4">Descubra o número que falta na trilha:</div>
                    <div class="flex flex-wrap items-center justify-center gap-2 md:gap-3">
                        ${seqHtml}
                    </div>
                    <div id="cardFeedbackMsg" class="h-6 mt-4 text-xs font-bold text-slate-400">Digite o número faltante</div>
                </div>
            `;
        },

        // Renderizador: DEZENAS
        renderTensCard(item, container) {
            const dezenas = Math.floor(item.number / 10);
            const unidades = item.number % 10;

            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-3">
                    <div class="text-sm font-bold text-slate-500 mb-2">Composição do número:</div>
                    <div class="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-4 flex items-center gap-4 text-indigo-900">
                        <div class="text-center">
                            <span class="block text-3xl font-black text-indigo-600">${dezenas}</span>
                            <span class="text-[10px] uppercase font-bold text-indigo-400">Dezena(s)</span>
                        </div>
                        <span class="text-2xl font-black text-indigo-300">+</span>
                        <div class="text-center">
                            <span class="block text-3xl font-black text-indigo-600">${unidades}</span>
                            <span class="text-[10px] uppercase font-bold text-indigo-400">Unidade(s)</span>
                        </div>
                    </div>
                    <div class="mt-4 flex items-center gap-3">
                        <span class="text-xl font-bold text-slate-700">Qual é o número?</span>
                        <div id="activeAnswerBox" class="w-20 h-16 bg-blue-50 border-4 border-blue-400 rounded-2xl flex items-center justify-center text-blue-700 font-black shadow-inner text-3xl">
                            <span class="text-blue-300 font-light text-xl">?</span>
                        </div>
                    </div>
                    <div id="cardFeedbackMsg" class="h-6 mt-2 text-xs font-bold text-slate-400">Digite o número completo</div>
                </div>
            `;
        },

        // Renderizador: COMPARAÇÃO (> = <)
        renderCompareCard(item, container) {
            const [a, b] = item.pair;
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-4">
                    <div class="text-sm font-bold text-slate-500 mb-4">Qual sinal compara corretamente estes números?</div>
                    <div class="flex items-center justify-center gap-6 mb-8 select-none">
                        <div class="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center text-5xl font-black text-slate-800 shadow-md">
                            ${a}
                        </div>
                        <div id="activeAnswerBox" class="w-20 h-20 bg-blue-50 border-4 border-dashed border-blue-400 rounded-2xl flex items-center justify-center text-4xl font-black text-blue-600 shadow-inner">
                            ?
                        </div>
                        <div class="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center text-5xl font-black text-slate-800 shadow-md">
                            ${b}
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-4 w-full max-w-sm">
                        <button class="compare-btn py-5 bg-gradient-to-b from-blue-500 to-blue-600 text-white rounded-2xl text-3xl font-black shadow-lg active:scale-95 transition-transform" data-op=">">
                            &gt; <span class="block text-[10px] font-normal opacity-80">Maior</span>
                        </button>
                        <button class="compare-btn py-5 bg-gradient-to-b from-purple-500 to-purple-600 text-white rounded-2xl text-3xl font-black shadow-lg active:scale-95 transition-transform" data-op="=">
                            = <span class="block text-[10px] font-normal opacity-80">Igual</span>
                        </button>
                        <button class="compare-btn py-5 bg-gradient-to-b from-emerald-500 to-emerald-600 text-white rounded-2xl text-3xl font-black shadow-lg active:scale-95 transition-transform" data-op="<">
                            &lt; <span class="block text-[10px] font-normal opacity-80">Menor</span>
                        </button>
                    </div>
                    <div id="cardFeedbackMsg" class="h-6 mt-3 text-xs font-bold text-slate-400">Toque no sinal correto</div>
                </div>
            `;

            container.querySelectorAll('.compare-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const op = btn.getAttribute('data-op');
                    this.checkCompareAnswer(op, a, b);
                });
            });
        },

        // Renderizador: VIZINHOS (antes e depois)
        renderNeighborsCard(item, container) {
            const center = item.center;
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-4">
                    <div class="text-sm font-bold text-slate-500 mb-4">Quem é o vizinho que vem antes de ${center}?</div>
                    <div class="flex items-center justify-center gap-4 mb-4 select-none">
                        <div id="activeAnswerBox" class="w-20 h-20 bg-blue-50 border-4 border-dashed border-blue-400 rounded-2xl flex items-center justify-center text-3xl font-black text-blue-600 shadow-inner">
                            ?
                        </div>
                        <i class="fas fa-arrow-right text-slate-300"></i>
                        <div class="w-24 h-24 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-4xl font-black shadow-lg">
                            ${center}
                        </div>
                    </div>
                    <div id="cardFeedbackMsg" class="h-6 mt-2 text-xs font-bold text-slate-400">Digite o número anterior no teclado</div>
                </div>
            `;
        },

        // Renderizador: TRAÇADO TOUCH/STYLUS (Português/Inglês P1/I1)
        renderTraceCard(item, container) {
            const char = item.char || 'A';
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-2">
                    <div class="flex items-center gap-3 mb-2">
                        <span class="text-sm font-bold text-slate-600">Treine o traçado da letra ou número com o dedo ou caneta stylus:</span>
                        <button id="speakCharBtn" class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center hover:bg-blue-200 transition-colors" title="Ouvir som">
                            <i class="fas fa-volume-up text-xs"></i>
                        </button>
                    </div>

                    <div class="relative w-64 h-64 md:w-72 md:h-72 bg-white rounded-3xl border-4 border-slate-200 shadow-inner overflow-hidden cursor-crosshair">
                        <!-- Letra guia pontilhada ao fundo -->
                        <div class="absolute inset-0 flex items-center justify-center text-slate-200 font-serif font-bold text-[140px] md:text-[160px] select-none pointer-events-none opacity-40">
                            ${char}
                        </div>
                        <!-- Canvas interativo de desenho -->
                        <canvas id="traceCanvas" class="absolute inset-0 w-full h-full touch-none z-10"></canvas>
                    </div>

                    <div class="flex items-center gap-4 mt-4">
                        <button id="clearTraceBtn" class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors">
                            <i class="fas fa-eraser"></i> Limpar
                        </button>
                        <button id="confirmTraceBtn" class="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-black rounded-xl shadow-md flex items-center gap-2 transition-transform transform active:scale-95">
                            <i class="fas fa-check"></i> Traçado Concluído!
                        </button>
                    </div>
                </div>
            `;

            const speakBtn = document.getElementById('speakCharBtn');
            if (speakBtn) {
                speakBtn.addEventListener('click', () => {
                    const lang = Session.subjectKey === 'ingles' ? 'en-US' : 'pt-BR';
                    speakWord(char, lang);
                });
            }

            this.setupTraceCanvas();

            const clearBtn = document.getElementById('clearTraceBtn');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    if (Session.activeCanvas) {
                        const ctx = Session.activeCanvas.getContext('2d');
                        ctx.clearRect(0, 0, Session.activeCanvas.width, Session.activeCanvas.height);
                    }
                });
            }

            const confirmBtn = document.getElementById('confirmTraceBtn');
            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    this.registerSuccess();
                });
            }
        },

        setupTraceCanvas() {
            const canvas = document.getElementById('traceCanvas');
            if (!canvas) return;
            Session.activeCanvas = canvas;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = rect.height;

            const ctx = canvas.getContext('2d');
            ctx.strokeStyle = '#2563eb'; // azul vivo
            ctx.lineWidth = 14;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            let drawing = false;

            const startDraw = (e) => {
                e.preventDefault();
                drawing = true;
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                const cRect = canvas.getBoundingClientRect();
                ctx.beginPath();
                ctx.moveTo(clientX - cRect.left, clientY - cRect.top);
            };

            const moveDraw = (e) => {
                if (!drawing) return;
                e.preventDefault();
                const clientX = e.touches ? e.touches[0].clientX : e.clientX;
                const clientY = e.touches ? e.touches[0].clientY : e.clientY;
                const cRect = canvas.getBoundingClientRect();
                ctx.lineTo(clientX - cRect.left, clientY - cRect.top);
                ctx.stroke();
            };

            const endDraw = (e) => {
                e.preventDefault();
                drawing = false;
            };

            canvas.addEventListener('mousedown', startDraw);
            canvas.addEventListener('mousemove', moveDraw);
            window.addEventListener('mouseup', endDraw);

            canvas.addEventListener('touchstart', startDraw, { passive: false });
            canvas.addEventListener('touchmove', moveDraw, { passive: false });
            window.addEventListener('touchend', endDraw, { passive: false });
        },

        // Renderizador: MONTAGEM DE PALAVRAS COM CHIPS (Português P3/P4, Inglês I2/I3)
        renderWordCard(item, container) {
            const word = item.word;
            const parts = item.parts || [word];
            const lang = Session.subjectKey === 'ingles' ? 'en-US' : 'pt-BR';

            // Embaralha as sílabas e inclui 1 distrator leve
            const distractors = ['CA', 'ME', 'PO', 'TO', 'RE', 'SO', 'IN', 'UP'];
            const distractor = distractors.find(d => !parts.includes(d)) || 'PA';
            const allChips = [...parts, distractor].sort(() => Math.random() - 0.5);

            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-2">
                    <div class="flex items-center gap-3 mb-3">
                        <span class="text-sm font-bold text-slate-600">Toque nas sílabas na ordem para formar a palavra:</span>
                        <button id="speakWordBtn" class="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-200 transition-colors">
                            <i class="fas fa-volume-up"></i> Ouvir Palavra
                        </button>
                    </div>

                    <!-- Palavra sendo montada -->
                    <div id="wordTargetSlots" class="min-w-[200px] h-20 bg-slate-50 border-3 border-dashed border-emerald-400 rounded-2xl flex items-center justify-center gap-2 px-4 shadow-inner mb-6">
                        <span class="text-slate-400 text-sm font-medium">Toque nas sílabas abaixo...</span>
                    </div>

                    <!-- Sílabas disponíveis como botões táteis -->
                    <div id="syllableChipsWrapper" class="flex flex-wrap items-center justify-center gap-3 max-w-md">
                        ${allChips.map(chip => `
                            <button class="syllable-chip px-6 py-4 bg-white border-2 border-emerald-500 hover:bg-emerald-50 text-emerald-800 text-2xl font-black rounded-2xl shadow-md active:scale-95 transition-transform" data-syllable="${chip}">
                                ${chip}
                            </button>
                        `).join('')}
                    </div>

                    <div class="flex items-center gap-3 mt-4">
                        <button id="resetWordChipsBtn" class="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors">
                            <i class="fas fa-undo"></i> Recomeçar palavra
                        </button>
                    </div>
                </div>
            `;

            const speakBtn = document.getElementById('speakWordBtn');
            if (speakBtn) {
                speakBtn.addEventListener('click', () => speakWord(word, lang));
                // Pronúncia automática ao carregar o card
                setTimeout(() => speakWord(word, lang), 400);
            }

            let assembled = [];
            const slotsContainer = document.getElementById('wordTargetSlots');
            const chipsWrapper = document.getElementById('syllableChipsWrapper');

            const updateSlots = () => {
                if (assembled.length === 0) {
                    slotsContainer.innerHTML = '<span class="text-slate-400 text-sm font-medium">Toque nas sílabas abaixo...</span>';
                } else {
                    slotsContainer.innerHTML = assembled.map(s => `
                        <div class="px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-2xl shadow">
                            ${s}
                        </div>
                    `).join('');
                }
            };

            chipsWrapper.querySelectorAll('.syllable-chip').forEach(btn => {
                btn.addEventListener('click', () => {
                    sound.init();
                    sound.playClick();
                    const syl = btn.getAttribute('data-syllable');
                    assembled.push(syl);
                    btn.classList.add('opacity-30', 'pointer-events-none');
                    updateSlots();

                    // Se juntou as sílabas necessárias
                    if (assembled.length === parts.length) {
                        const built = assembled.join('');
                        if (built === word || built === parts.join('')) {
                            this.registerSuccess();
                        } else {
                            sound.playWrong();
                            this.shakeCard();
                            setTimeout(() => {
                                assembled = [];
                                updateSlots();
                                chipsWrapper.querySelectorAll('.syllable-chip').forEach(b => {
                                    b.classList.remove('opacity-30', 'pointer-events-none');
                                });
                            }, 700);
                        }
                    }
                });
            });

            const resetBtn = document.getElementById('resetWordChipsBtn');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    assembled = [];
                    updateSlots();
                    chipsWrapper.querySelectorAll('.syllable-chip').forEach(b => {
                        b.classList.remove('opacity-30', 'pointer-events-none');
                    });
                });
            }
        },

        // Renderizador: IDENTIFICAÇÃO DE SÍLABA
        renderSyllableCard(item, container) {
            const targetSyl = item.syllable;
            const distractors = ['BA','DA','FA','GA','LA','MA','PA','RA','SA','TA'].filter(s => s !== targetSyl).sort(() => Math.random() - 0.5).slice(0, 3);
            const options = [targetSyl, ...distractors].sort(() => Math.random() - 0.5);

            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-4">
                    <div class="flex items-center gap-3 mb-4">
                        <span class="text-base font-bold text-slate-700">Qual é a sílaba correta?</span>
                        <button id="speakSyllableBtn" class="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full font-bold text-xs flex items-center gap-1.5 hover:bg-blue-200 transition-colors">
                            <i class="fas fa-volume-up"></i> Ouvir Som
                        </button>
                    </div>

                    <div class="text-5xl font-black text-slate-800 bg-slate-100 px-8 py-6 rounded-3xl border-2 border-slate-300 shadow-inner mb-6">
                        ${targetSyl}
                    </div>

                    <div class="grid grid-cols-2 gap-4 w-full max-w-xs">
                        ${options.map(opt => `
                            <button class="syl-choice-btn py-4 bg-white border-2 border-blue-500 hover:bg-blue-50 text-blue-800 rounded-2xl text-3xl font-black shadow-md active:scale-95 transition-transform" data-syl="${opt}">
                                ${opt}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;

            const speakBtn = document.getElementById('speakSyllableBtn');
            if (speakBtn) {
                speakBtn.addEventListener('click', () => speakWord(targetSyl, 'pt-BR'));
                setTimeout(() => speakWord(targetSyl, 'pt-BR'), 300);
            }

            container.querySelectorAll('.syl-choice-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const chosen = btn.getAttribute('data-syl');
                    if (chosen === targetSyl) {
                        this.registerSuccess();
                    } else {
                        sound.playWrong();
                        this.shakeCard();
                    }
                });
            });
        },

        // ============================================================
        // 8. TECLADO VIRTUAL & VALIDAÇÃO DE RESPOSTAS
        // ============================================================
        handleKeypadPress(key) {
            const answerBox = document.getElementById('activeAnswerBox');
            if (!answerBox) return;

            if (key === 'backspace') {
                Session.currentInput = Session.currentInput.slice(0, -1);
            } else if (key === 'clear') {
                Session.currentInput = '';
            } else if (key === 'enter') {
                this.validateNumericAnswer();
                return;
            } else if (key >= '0' && key <= '9') {
                if (Session.currentInput.length < 4) {
                    Session.currentInput += key;
                }
            }

            if (Session.currentInput === '') {
                answerBox.innerHTML = '<span class="text-blue-300 font-light text-2xl">?</span>';
            } else {
                answerBox.innerHTML = `<span class="text-blue-700 font-black">${Session.currentInput}</span>`;
            }
        },

        validateNumericAnswer() {
            if (Session.currentInput.trim() === '') return;
            const item = Session.items[Session.currentIndex];
            const entered = parseInt(Session.currentInput, 10);

            let expected = null;
            if (item.type === 'math') {
                if (item.operator === '+') expected = item.operand1 + item.operand2;
                if (item.operator === '-') expected = item.operand1 - item.operand2;
                if (item.operator === '×' || item.operator === '*') expected = item.operand1 * item.operand2;
            } else if (item.type === 'quantity') {
                expected = item.value;
            } else if (item.type === 'sequence') {
                // Descobre o valor da lacuna
                expected = this.solveSequenceHole(item.sequence);
            } else if (item.type === 'tens') {
                expected = item.number;
            } else if (item.type === 'neighbors') {
                expected = item.center - 1;
            }

            if (entered === expected) {
                this.registerSuccess();
            } else {
                this.registerWrong();
            }
        },

        solveSequenceHole(seq) {
            if (!Array.isArray(seq)) return 0;
            const idx = seq.indexOf('__');
            if (idx === -1) return 0;
            if (idx > 1 && typeof seq[idx-1] === 'number' && typeof seq[idx-2] === 'number') {
                return seq[idx-1] + (seq[idx-1] - seq[idx-2]);
            } else if (idx > 0 && idx < seq.length - 1 && typeof seq[idx-1] === 'number' && typeof seq[idx+1] === 'number') {
                return Math.round(seq[idx-1] + (seq[idx+1] - seq[idx-1]) / 2);
            } else if (idx > 0 && typeof seq[idx-1] === 'number') {
                return seq[idx-1] + 1;
            } else if (idx < seq.length - 1 && typeof seq[idx+1] === 'number') {
                return seq[idx+1] - 1;
            }
            return 0;
        },

        checkCompareAnswer(op, a, b) {
            let correctOp = '=';
            if (a > b) correctOp = '>';
            else if (a < b) correctOp = '<';

            if (op === correctOp) {
                this.registerSuccess();
            } else {
                this.registerWrong();
            }
        },

        registerSuccess() {
            sound.playSuccess();
            this.pulseSuccessCard();

            if (Session.currentAttempts === 0) {
                Session.roundCorrectFirstAttempt++;
                Gamification.addStars(1);
                Gamification.registerCorrect();
            }

            this.updateGamificationHeader();

            setTimeout(() => {
                Session.currentIndex++;
                if (Session.currentIndex >= Session.items.length) {
                    this.finishRound();
                } else {
                    this.renderCurrentQuestion();
                }
            }, 650);
        },

        registerWrong() {
            sound.playWrong();
            Session.currentAttempts++;
            Gamification.resetStreak();
            this.updateGamificationHeader();
            this.shakeCard();

            const msg = document.getElementById('cardFeedbackMsg');
            if (msg) {
                msg.innerText = 'Quase lá! Tente mais uma vez.';
                msg.classList.remove('text-slate-400');
                msg.classList.add('text-amber-500');
            }

            Session.currentInput = '';
            const answerBox = document.getElementById('activeAnswerBox');
            if (answerBox) {
                answerBox.innerHTML = '<span class="text-blue-300 font-light text-2xl">?</span>';
            }
        },

        shakeCard() {
            const card = document.getElementById('focusCard');
            if (!card) return;
            card.classList.add('animate-shake');
            setTimeout(() => card.classList.remove('animate-shake'), 500);
        },

        pulseSuccessCard() {
            const card = document.getElementById('focusCard');
            if (!card) return;
            card.classList.add('border-emerald-400', 'bg-emerald-50/20');
            setTimeout(() => card.classList.remove('border-emerald-400', 'bg-emerald-50/20'), 600);
        },

        // ============================================================
        // 9. CONCLUSÃO DA RODADA & CELEBRAÇÃO
        // ============================================================
        finishRound() {
            if (Session.timerInterval) clearInterval(Session.timerInterval);
            sound.playFanfare();
            launchConfetti();

            const total = Session.items.length;
            const accuracy = Math.round((Session.roundCorrectFirstAttempt / total) * 100);
            const timeSec = Session.elapsedSeconds;
            const targetSec = Session.targetSctSeconds;

            // Bônus de estrelas se bateu a meta ou teve 100% de precisão
            let bonusStars = 0;
            if (accuracy === 100) bonusStars += 3;
            if (timeSec <= targetSec) bonusStars += 2;
            if (bonusStars > 0) {
                Gamification.addStars(bonusStars);
            }

            const { newlyUnlocked } = Gamification.registerRoundFinished(accuracy, timeSec, targetSec);
            
            // Registra no histórico geral do KumonGen (Scoreboard e Controle dos Pais)
            try {
                if (window.KumonGen && window.KumonGen.saveHistory) {
                    const sub = window.KumonSubjects[Session.subjectKey];
                    const level = sub && sub.levels ? sub.levels.find(l => l.id === Session.levelId) : null;
                    window.KumonGen.saveHistory(
                        sub ? sub.title : 'Matemática',
                        `${level ? level.title : 'Nível'} · Tablet`,
                        '10 exer.',
                        true
                    );
                }
            } catch (e) {
                console.warn('Erro ao integrar histórico com KumonGen', e);
            }

            this.updateGamificationHeader();

            this.showRoundSummaryModal({
                total,
                accuracy,
                timeSec,
                targetSec,
                bonusStars,
                newlyUnlocked
            });
        },

        showRoundSummaryModal(res) {
            const modal = document.getElementById('roundFinishedModal');
            if (!modal) return;

            const m = String(Math.floor(res.timeSec / 60)).padStart(2, '0');
            const s = String(res.timeSec % 60).padStart(2, '0');
            const timeFormatted = `${m}:${s}`;
            const targetFormatted = `${Math.floor(res.targetSec / 60)}:00 min`;

            const sub = window.KumonSubjects[Session.subjectKey];
            const level = sub.levels.find(l => l.id === Session.levelId);

            const beatSCT = res.timeSec <= res.targetSec;

            let badgesHtml = '';
            if (res.newlyUnlocked && res.newlyUnlocked.length > 0) {
                const unlockedDefs = BADGE_DEFINITIONS.filter(b => res.newlyUnlocked.includes(b.id));
                badgesHtml = `
                    <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 my-4 text-left">
                        <div class="text-xs font-black text-amber-800 uppercase tracking-wide flex items-center gap-1.5 mb-2">
                            <i class="fas fa-medal text-amber-500"></i> Novas Conquistas Desbloqueadas!
                        </div>
                        <div class="flex flex-col gap-2">
                            ${unlockedDefs.map(b => `
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center ${b.color}">
                                        <i class="fas ${b.icon}"></i>
                                    </div>
                                    <div>
                                        <div class="text-sm font-bold text-slate-800">${b.title}</div>
                                        <div class="text-[11px] text-slate-500">${b.desc}</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }

            modal.innerHTML = `
                <div class="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl text-center border-4 border-emerald-400 relative animate-bounce-subtle max-h-[90vh] overflow-y-auto">
                    <div class="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-4xl mb-3 shadow-inner">
                        <i class="fas fa-trophy text-amber-500"></i>
                    </div>
                    <span class="inline-block bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-1">Rodada Concluída!</span>
                    <h3 class="text-2xl font-black text-slate-900">Parabéns, ${Session.studentName}!</h3>
                    <p class="text-xs text-slate-500 mt-1">${level ? level.title : ''} · ${sub ? sub.title : ''}</p>

                    <!-- Painel de Métricas -->
                    <div class="grid grid-cols-3 gap-3 my-5">
                        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
                            <span class="text-2xl font-black text-blue-600">${res.accuracy}%</span>
                            <span class="block text-[10px] font-bold text-slate-400 uppercase mt-1">Precisão</span>
                        </div>
                        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
                            <span class="text-2xl font-black ${beatSCT ? 'text-emerald-600' : 'text-slate-700'}">${timeFormatted}</span>
                            <span class="block text-[10px] font-bold text-slate-400 uppercase mt-1">Tempo SCT</span>
                        </div>
                        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
                            <span class="text-2xl font-black text-amber-500">+${res.bonusStars + Session.roundCorrectFirstAttempt} ★</span>
                            <span class="block text-[10px] font-bold text-slate-400 uppercase mt-1">Estrelas</span>
                        </div>
                    </div>

                    ${beatSCT ? `
                        <div class="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700 flex items-center justify-center gap-2 mb-4">
                            <i class="fas fa-bolt text-emerald-500"></i> Superou o tempo padrão de fluência Kumon!
                        </div>
                    ` : ''}

                    ${badgesHtml}

                    <!-- Ações Principais -->
                    <div class="flex flex-col gap-3 mt-4">
                        <button id="downloadCertBtn" class="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-900 font-black text-base rounded-2xl shadow-lg transition-transform transform active:scale-95 flex items-center justify-center gap-2">
                            <i class="fas fa-certificate text-lg"></i> Baixar Certificado Oficial (PDF)
                        </button>

                        <div class="grid grid-cols-2 gap-3">
                            <button id="playAgainBtn" class="py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow transition-colors flex items-center justify-center gap-1.5">
                                <i class="fas fa-redo"></i> Jogar Novamente
                            </button>
                            <a href="index.html" class="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-1.5">
                                <i class="fas fa-home"></i> Sair do Modo
                            </a>
                        </div>
                    </div>
                </div>
            `;

            modal.classList.remove('hidden');

            const certBtn = document.getElementById('downloadCertBtn');
            if (certBtn) {
                certBtn.addEventListener('click', () => {
                    generateCertificatePDF({
                        studentName: Session.studentName,
                        subjectTitle: sub ? sub.title : 'Matemática',
                        levelTitle: level ? level.title : 'Nível',
                        levelId: Session.levelId,
                        accuracy: res.accuracy,
                        timeFormatted,
                        targetFormatted,
                        starsEarned: res.bonusStars + Session.roundCorrectFirstAttempt
                    });
                });
            }

            const playAgainBtn = document.getElementById('playAgainBtn');
            if (playAgainBtn) {
                playAgainBtn.addEventListener('click', () => {
                    modal.classList.add('hidden');
                    this.startRound();
                });
            }
        },

        // ============================================================
        // 10. MODAL DE CONQUISTAS E TROFÉUS (BADGES)
        // ============================================================
        showBadgesModal() {
            const modal = document.getElementById('badgesModal');
            if (!modal) return;

            const data = Gamification.get();
            const unlocked = data.badges || [];

            modal.innerHTML = `
                <div class="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-200 relative max-h-[85vh] overflow-y-auto">
                    <div class="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xl">
                                <i class="fas fa-trophy"></i>
                            </div>
                            <div>
                                <h3 class="font-black text-slate-900 text-lg">Suas Conquistas</h3>
                                <p class="text-xs text-slate-500">Aluno(a): <strong>${Session.studentName}</strong></p>
                            </div>
                        </div>
                        <button id="closeBadgesBtn" class="text-slate-400 hover:text-slate-600 text-lg p-2">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="grid grid-cols-3 gap-2 py-4 my-2 border-b border-slate-100 text-center">
                        <div class="p-2 bg-slate-50 rounded-xl">
                            <span class="block text-xl font-black text-amber-500">★ ${data.stars || 0}</span>
                            <span class="text-[9px] uppercase font-bold text-slate-400">Estrelas</span>
                        </div>
                        <div class="p-2 bg-slate-50 rounded-xl">
                            <span class="block text-xl font-black text-blue-600">${data.totalRounds || 0}</span>
                            <span class="text-[9px] uppercase font-bold text-slate-400">Rodadas</span>
                        </div>
                        <div class="p-2 bg-slate-50 rounded-xl">
                            <span class="block text-xl font-black text-purple-600">${data.bestStreak || 0}</span>
                            <span class="text-[9px] uppercase font-bold text-slate-400">Melhor Streak</span>
                        </div>
                    </div>

                    <div class="space-y-3 mt-3">
                        ${BADGE_DEFINITIONS.map(b => {
                            const isUnlocked = unlocked.includes(b.id);
                            return `
                                <div class="flex items-center gap-3 p-3 rounded-2xl border ${isUnlocked ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50/60 border-slate-200 opacity-50'}">
                                    <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${isUnlocked ? 'bg-amber-100 text-amber-600 shadow-sm' : 'bg-slate-200 text-slate-400'}">
                                        <i class="fas ${b.icon}"></i>
                                    </div>
                                    <div class="flex-1">
                                        <div class="text-xs font-black text-slate-800 flex items-center gap-2">
                                            ${b.title}
                                            ${isUnlocked ? '<span class="text-[9px] text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded font-bold">Conquistado</span>' : ''}
                                        </div>
                                        <div class="text-[11px] text-slate-500">${b.desc}</div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;

            modal.classList.remove('hidden');
            const closeBtn = document.getElementById('closeBadgesBtn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
            }
        }
    };

    // Exporta globalmente para uso na página
    window.TabletPlayer = TabletPlayer;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            TabletPlayer.init();
        });
    } else {
        TabletPlayer.init();
    }

})();
