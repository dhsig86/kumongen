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
    // 1. MOTOR HÁPTICO NATIVO (Vibration API)
    // ============================================================
    class HapticEngine {
        constructor() {
            this.enabled = true;
        }

        isSupported() {
            return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
        }

        vibrate(pattern) {
            if (!this.enabled || !this.isSupported()) return false;
            try {
                return navigator.vibrate(pattern);
            } catch (e) {
                return false;
            }
        }

        // Toque tátil sutil de 12ms no teclado virtual e opções
        lightClick() {
            return this.vibrate(12);
        }

        // Duplo pulso suave de validação positiva [15ms vibra, 35ms pausa, 25ms vibra]
        success() {
            return this.vibrate([15, 35, 25]);
        }

        // Feedback de progresso conforme streak aumenta
        streak(count = 1) {
            if (count >= 10) return this.vibrate([25, 30, 25, 30, 35, 30, 45]);
            if (count >= 5) return this.vibrate([20, 35, 25, 35, 35]);
            return this.vibrate([18, 30, 25]);
        }

        // Pulso duplo suave para erro (não punitivo) [35ms, 30ms pausa, 35ms]
        wrong() {
            return this.vibrate([35, 30, 35]);
        }

        // Fanfarra comemorativa de conclusão de rodada / maestria
        fanfare() {
            return this.vibrate([30, 50, 40, 50, 60, 60, 80]);
        }
    }

    const haptic = new HapticEngine();

    // ============================================================
    // 1.1 MOTOR DE CONTROLE DE TELA (Screen Wake Lock API)
    // ============================================================
    class WakeLockEngine {
        constructor() {
            this.sentinel = null;
            this.isActive = false;
            this.isRoundRunning = false;
            this.boundVisibilityHandler = null;
        }

        isSupported() {
            return typeof navigator !== 'undefined' && 'wakeLock' in navigator && typeof navigator.wakeLock.request === 'function';
        }

        async request() {
            this.isRoundRunning = true;
            if (!this.isSupported()) return false;
            try {
                if (!this.sentinel) {
                    this.sentinel = await navigator.wakeLock.request('screen');
                    this.isActive = true;
                    this.sentinel.addEventListener('release', () => {
                        this.isActive = false;
                        this.sentinel = null;
                    });
                }
                return true;
            } catch (e) {
                this.isActive = false;
                this.sentinel = null;
                return false;
            }
        }

        async release() {
            this.isRoundRunning = false;
            if (this.sentinel) {
                try {
                    await this.sentinel.release();
                } catch (e) {}
                this.sentinel = null;
                this.isActive = false;
            }
        }

        init() {
            if (typeof document !== 'undefined' && !this.boundVisibilityHandler) {
                this.boundVisibilityHandler = async () => {
                    if (document.visibilityState === 'visible' && this.isRoundRunning) {
                        await this.request();
                    }
                };
                document.addEventListener('visibilitychange', this.boundVisibilityHandler);
            }
            if (typeof window !== 'undefined') {
                window.addEventListener('beforeunload', () => {
                    this.release();
                });
            }
        }
    }

    const wakeLock = new WakeLockEngine();

    // ============================================================
    // 1.2 MOTOR DE ÁUDIO SINTETIZADO (Web Audio API)
    // ============================================================
    class SoundEngine {
        constructor() {
            this.ctx = null;
            this.muted = (window.SafeStorage ? window.SafeStorage.getItem('kumongen_tablet_muted') : (typeof localStorage !== 'undefined' ? localStorage.getItem('kumongen_tablet_muted') : null)) === 'true';
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
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                try {
                    window.speechSynthesis.cancel();
                } catch (e) {}
            }
            try {
                (window.SafeStorage || localStorage).setItem('kumongen_tablet_muted', this.muted ? 'true' : 'false');
            } catch (e) {}
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
            haptic.success();
            if (this.muted) return;
            this.playTone(523.25, 0.14, 'triangle', 0.22, 0);
            this.playTone(659.25, 0.14, 'triangle', 0.22, 0.08);
            this.playTone(783.99, 0.18, 'triangle', 0.25, 0.16);
            this.playTone(1046.50, 0.35, 'sine', 0.28, 0.24);
        }

        // Arpeggios progressivos por sequência (Streak)
        playStreakChord(streakCount) {
            haptic.streak(streakCount);
            if (this.muted) return;
            if (streakCount >= 10) {
                // Fanfarra triunfal completa (6 notas ascendentes)
                const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98];
                notes.forEach((f, i) => this.playTone(f, 0.22, 'triangle', 0.25, i * 0.06));
            } else if (streakCount >= 5) {
                // Arpeggio pentatônico brilhante (5 notas shimmer)
                const notes = [523.25, 659.25, 783.99, 987.77, 1046.50];
                notes.forEach((f, i) => this.playTone(f, 0.18, 'sine', 0.22, i * 0.06));
            } else if (streakCount >= 3) {
                // Chime alegre de 3 notas
                this.playTone(659.25, 0.15, 'triangle', 0.2, 0);
                this.playTone(783.99, 0.15, 'triangle', 0.22, 0.07);
                this.playTone(1046.50, 0.28, 'sine', 0.25, 0.14);
            } else {
                this.playSuccess();
            }
        }

        // Transição motivadora para o modo Gauntlet Kumon
        playGauntletTransition() {
            haptic.streak(5);
            if (this.muted) return;
            const notes = [
                { f: 293.66, d: 0.16, t: 0 },    // D4
                { f: 440.00, d: 0.16, t: 0.11 }, // A4
                { f: 587.33, d: 0.20, t: 0.22 }, // D5
                { f: 739.99, d: 0.45, t: 0.35 }  // F#5
            ];
            notes.forEach(n => this.playTone(n.f, n.d, 'triangle', 0.28, n.t));
        }

        // Fanfarra de Maestria 100% Conquistada
        playMasteryFanfare() {
            haptic.fanfare();
            if (this.muted) return;
            const notes = [
                { f: 523.25, d: 0.14, t: 0 },
                { f: 659.25, d: 0.14, t: 0.10 },
                { f: 783.99, d: 0.14, t: 0.20 },
                { f: 1046.50, d: 0.22, t: 0.30 },
                { f: 1318.51, d: 0.55, t: 0.45 }
            ];
            notes.forEach(n => this.playTone(n.f, n.d, 'sine', 0.32, n.t));
        }

        // Boop suave e acolhedor (não punitivo)
        playWrong() {
            haptic.wrong();
            if (this.muted) return;
            this.playTone(260, 0.14, 'sine', 0.15, 0);
            this.playTone(196, 0.22, 'sine', 0.18, 0.1);
        }

        // Fanfarra de comemoração de final de rodada
        playFanfare() {
            haptic.fanfare();
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
            haptic.lightClick();
            if (this.muted) return;
            this.playTone(700, 0.03, 'sine', 0.06, 0);
        }
    }

    const sound = new SoundEngine();

    // ------------------------------------------------------------
    // ------------------------------------------------------------
    // Gerenciador de Síntese de Voz (Web Speech API) — Kumon Speech Engine v4
    // ------------------------------------------------------------
    let _cachedVoices = [];
    const _utterancePool = new Set(); // Previne Garbage Collection prematuro de utterances (Chromium bug)
    let _speechWatchdogTimer = null;
    let _activeSpeechRequestId = 0;
    let _cardAutoplayTimer = null;

    function clearCardAutoplay() {
        if (_cardAutoplayTimer) {
            clearTimeout(_cardAutoplayTimer);
            _cardAutoplayTimer = null;
        }
    }

    function scheduleCardSpeech(fn, delay = 400) {
        clearCardAutoplay();
        _cardAutoplayTimer = setTimeout(() => {
            _cardAutoplayTimer = null;
            fn();
        }, delay);
    }

    function loadAvailableVoices() {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            try {
                const list = window.speechSynthesis.getVoices() || [];
                if (list.length > 0) {
                    _cachedVoices = list;
                }
            } catch (e) {
                _cachedVoices = [];
            }
        }
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        loadAvailableVoices();
        if (window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => {
                loadAvailableVoices();
            };
        }
    }

    function findBestVoice(lang = 'pt-BR') {
        if (!_cachedVoices.length) loadAvailableVoices();
        if (!_cachedVoices.length) return null;

        const target = (lang || 'pt-BR').toLowerCase().replace('_', '-');
        const langPrefix = target.split('-')[0];

        // Filtra todas as vozes compatíveis com o idioma
        const matchingVoices = _cachedVoices.filter(v => {
            const vLang = (v.lang || '').toLowerCase().replace('_', '-');
            return vLang === target || vLang.startsWith(langPrefix);
        });

        if (!matchingVoices.length) {
            const defaultVoice = _cachedVoices.find(v => v.default);
            if (defaultVoice && (defaultVoice.lang || '').toLowerCase().startsWith(langPrefix)) {
                return defaultVoice;
            }
            return null;
        }

        // 1. Preferência pedagógica por vozes claras, naturais e acolhedoras para crianças (ex: Maria, Francisca, Google, Zira, Jenny)
        const preferredRegex = langPrefix === 'pt'
            ? /maria|francisca|google|natural|neural|online|leticia|helena|vitoria|fabiola/i
            : /zira|jenny|google|natural|neural|online|samantha|aria|karen/i;

        const premiumVoice = matchingVoices.find(v => preferredRegex.test(v.name));
        if (premiumVoice) return premiumVoice;

        // 2. Voz que case exatamente com o dialeto (ex: pt-BR sobre pt-PT)
        const exactMatch = matchingVoices.find(v => (v.lang || '').toLowerCase().replace('_', '-') === target);
        if (exactMatch) return exactMatch;

        // 3. Primeira voz do idioma
        return matchingVoices[0];
    }

    // Mapeamento fonético claro para alfabeto em Português (P1)
    const LETRAS_FONETICAS_PT = {
        'A': 'Letra A', 'B': 'Letra Bê', 'C': 'Letra Cê', 'D': 'Letra Dê',
        'E': 'Letra E', 'F': 'Letra Éfe', 'G': 'Letra Gê', 'H': 'Letra Agá',
        'I': 'Letra I', 'J': 'Letra Jota', 'K': 'Letra Cá', 'L': 'Letra Éle',
        'M': 'Letra Eme', 'N': 'Letra Ene', 'O': 'Letra O', 'P': 'Letra Pê',
        'Q': 'Letra Quê', 'R': 'Letra Érre', 'S': 'Letra Esse', 'T': 'Letra Tê',
        'U': 'Letra U', 'V': 'Letra Vê', 'W': 'Letra Dáblio', 'X': 'Letra Xis',
        'Y': 'Letra Ípsilon', 'Z': 'Letra Zê'
    };

    // Mapeamento fonético com tonicidade explícita para sílabas isoladas (P2, P3, P4, P5, P6)
    // Garante que o sintetizador vocalize a sílaba com vogal plena e não confunda com preposições átonas ou siglas
    const SILABAS_FONETICAS_PT = {
        'DE': 'dê', 'DO': 'dô',
        'SE': 'sê', 'SO': 'sô',
        'TE': 'tê', 'TO': 'tô',
        'ME': 'mê', 'MO': 'mô',
        'NE': 'nê', 'NO': 'nô',
        'LE': 'lê', 'LO': 'lô',
        'PE': 'pê', 'PO': 'pô',
        'RE': 'rê', 'RO': 'rô',
        'BE': 'bê', 'BO': 'bô',
        'CE': 'cê', 'CO': 'cô',
        'FE': 'fê', 'FO': 'fô',
        'GE': 'gê', 'GO': 'gô',
        'JE': 'jê', 'JO': 'jô',
        'VE': 'vê', 'VO': 'vô',
        'ZE': 'zê', 'ZO': 'zô',
        'QUE': 'quê', 'QUI': 'qui'
    };

    function startSpeechWatchdog() {
        if (_speechWatchdogTimer) return;
        _speechWatchdogTimer = setInterval(() => {
            if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
                clearInterval(_speechWatchdogTimer);
                _speechWatchdogTimer = null;
                return;
            }
            if (_utterancePool.size > 0 && window.speechSynthesis.speaking) {
                // Bug do Chromium: se ficar pausado silenciosamente, acorda
                if (window.speechSynthesis.paused) {
                    window.speechSynthesis.resume();
                }
            } else if (_utterancePool.size === 0 && !window.speechSynthesis.speaking) {
                clearInterval(_speechWatchdogTimer);
                _speechWatchdogTimer = null;
            }
        }, 1500);
    }

    // Síntese de voz com afinação e velocidade acolhedoras para crianças (rate 0.84 para alfabetização calma e inteligível)
    function speakWord(text, lang = 'pt-BR', pitch = 1.04, rate = 0.84, btnEl = null) {
        if (!text || typeof text !== 'string') return;
        if (!('speechSynthesis' in window) || sound.muted) return;
        clearCardAutoplay();

        // Feedback sonoro tátil imediato via Web Audio API
        sound.init();
        if (btnEl) {
            sound.playTone(880, 0.04, 'sine', 0.08);
            btnEl.classList.add('ring-4', 'ring-emerald-400/80', 'animate-pulse');
        }

        const requestId = ++_activeSpeechRequestId;

        try {
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }

            const cleanText = text.trim();
            if (!cleanText) return;

            // Normalização fonética inteligente
            let textToSpeak = cleanText;
            const upper = cleanText.toUpperCase();
            if (lang.startsWith('pt')) {
                if (cleanText.length === 1 && LETRAS_FONETICAS_PT[upper]) {
                    textToSpeak = LETRAS_FONETICAS_PT[upper];
                } else if (SILABAS_FONETICAS_PT[upper]) {
                    textToSpeak = SILABAS_FONETICAS_PT[upper];
                } else if (cleanText.length <= 15 && cleanText === upper && !cleanText.includes(' ')) {
                    // Minúsculo impede o motor de confundir sílabas com siglas de estados (BA=Bahia, SE=Sergipe, etc.)
                    textToSpeak = cleanText.toLowerCase();
                }
            } else if (lang.startsWith('en')) {
                if (cleanText === upper) {
                    textToSpeak = cleanText.toLowerCase();
                }
            }

            const executeSpeak = () => {
                // Se uma requisição mais nova foi feita durante o delay de estabilização, descarta
                if (requestId !== _activeSpeechRequestId) return;

                try {
                    const utterance = new SpeechSynthesisUtterance(textToSpeak.slice(0, 300));
                    utterance.lang = lang;
                    utterance.pitch = pitch;
                    utterance.rate = rate;

                    const voice = findBestVoice(lang);
                    if (voice) {
                        utterance.voice = voice;
                    }

                    // Proteção de Garbage Collection (V8)
                    _utterancePool.add(utterance);

                    const cleanup = () => {
                        _utterancePool.delete(utterance);
                        if (btnEl) {
                            btnEl.classList.remove('ring-4', 'ring-emerald-400/80', 'animate-pulse');
                        }
                    };

                    utterance.onstart = () => {
                        if (btnEl) {
                            btnEl.classList.add('ring-4', 'ring-emerald-400/80');
                        }
                    };

                    utterance.onend = cleanup;
                    utterance.onerror = (err) => {
                        cleanup();
                        // Ignora erro benigno de 'interrupted'/'canceled' quando o usuário clica rápido em outra palavra
                        if (err && err.error !== 'interrupted' && err.error !== 'canceled') {
                            console.warn('[KumonGen Speech] Falha de síntese:', err.error || err);
                        }
                    };

                    startSpeechWatchdog();
                    window.speechSynthesis.speak(utterance);
                    if (window.speechSynthesis.paused) {
                        window.speechSynthesis.resume();
                    }
                } catch (e) {
                    console.warn('[KumonGen Speech] Erro ao sintetizar fala:', e);
                    if (btnEl) btnEl.classList.remove('ring-4', 'ring-emerald-400/80', 'animate-pulse');
                }
            };

            // Se o sintetizador estiver ocupado, cancela com segurança e reinicia rápido (50ms)
            if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
                window.speechSynthesis.cancel();
                setTimeout(executeSpeak, 50);
            } else {
                executeSpeak();
            }
        } catch (e) {
            console.warn('[KumonGen Speech] SpeechSynthesis error:', e);
            if (btnEl) btnEl.classList.remove('ring-4', 'ring-emerald-400/80', 'animate-pulse');
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
        { id: 'resiliencia_kumon', title: 'Persistência de Aço', desc: 'Completou o Gauntlet Kumon e atingiu 100% de maestria!', icon: 'fa-shield-alt', color: 'text-amber-400' },
        { id: 'maestria_total', title: 'Mestre da Maestria', desc: 'Dominou níveis com 100% de maestria acumulada!', icon: 'fa-graduation-cap', color: 'text-emerald-400' },
        { id: 'dedicado_3', title: 'Super Dedicado', desc: 'Completou 3 rodadas de treino!', icon: 'fa-medal', color: 'text-indigo-400' },
        { id: 'campeao_10', title: 'Mestre Kumon', desc: 'Completou 10 rodadas de exercícios!', icon: 'fa-trophy', color: 'text-yellow-500' }
    ];

    const Gamification = {
        STORAGE_KEY: 'kumongen_gamification_v3',

        get() {
            if (window.StudentProfileEngine) {
                const active = window.StudentProfileEngine.getActive();
                if (active && active.gamification) {
                    return active.gamification;
                }
            }
            const raw = (window.SafeStorage ? window.SafeStorage.getItem(this.STORAGE_KEY) : (typeof localStorage !== 'undefined' ? localStorage.getItem(this.STORAGE_KEY) : null));
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
            if (window.StudentProfileEngine) {
                window.StudentProfileEngine.updateActiveGamification(() => data);
            }
            (window.SafeStorage || localStorage).setItem(this.STORAGE_KEY, JSON.stringify(data));
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
        studentName: (window.StudentProfileEngine && window.StudentProfileEngine.getActive()) ? window.StudentProfileEngine.getActive().name : ((window.SafeStorage ? window.SafeStorage.getItem('kumongen_student_name') : (typeof localStorage !== 'undefined' ? localStorage.getItem('kumongen_student_name') : null)) || 'Super Aluno'),
        items: [],
        currentIndex: 0,
        currentInput: '',
        currentAttempts: 0,
        roundCorrectFirstAttempt: 0,
        startTime: null,
        timerInterval: null,
        transitionTimeout: null,
        isTransitionLocked: false,
        elapsedSeconds: 0,
        targetSctSeconds: 300, // 5 min padrão
        workedExampleDismissed: false,
        activeCanvas: null,
        // Gauntlet Kumon (Loop de Maestria 100%)
        missedItemsQueue: [],
        isGauntletPhase: false,
        isGauntlet: false,
        gauntletCycles: 0,
        initialItemsCount: 10,
        gauntletItemsSolved: 0
    };

    // ============================================================
    // 4. CERTIFICADO OFICIAL EM PDF (jsPDF)
    // ============================================================
    async function generateCertificatePDF(certData) {
        if (typeof window !== 'undefined' && window.StudentProfileEngine && typeof window.StudentProfileEngine.generateMasteryCertificatePDF === 'function') {
            return window.StudentProfileEngine.generateMasteryCertificatePDF(null, certData);
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

        // 2. Borda Externa Dourada Nobre (respeita margens seguras da impressora)
        doc.setDrawColor(205, 162, 40); // Ouro clássico
        doc.setLineWidth(2.2);
        doc.rect(13, 13, pageWidth - 26, pageHeight - 26);

        // 3. Moldura Interna Fina Azul Marinho
        doc.setDrawColor(30, 41, 59); // Slate-800
        doc.setLineWidth(0.6);
        doc.rect(16.5, 16.5, pageWidth - 33, pageHeight - 33);

        // 4. Cantoneiras e Detalhes Decorativos nos 4 Cantos
        const cornerOffset = 16.5;
        const cornerSize = 7;
        doc.setDrawColor(205, 162, 40);
        doc.setLineWidth(1.2);

        // Cantoneiras nos 4 cantos
        doc.line(cornerOffset, cornerOffset + cornerSize, cornerOffset, cornerOffset);
        doc.line(cornerOffset, cornerOffset, cornerOffset + cornerSize, cornerOffset);

        doc.line(pageWidth - cornerOffset, cornerOffset + cornerSize, pageWidth - cornerOffset, cornerOffset);
        doc.line(pageWidth - cornerOffset, cornerOffset, pageWidth - cornerOffset - cornerSize, cornerOffset);

        doc.line(cornerOffset, pageHeight - cornerOffset - cornerSize, cornerOffset, pageHeight - cornerOffset);
        doc.line(cornerOffset, pageHeight - cornerOffset, cornerOffset + cornerSize, pageHeight - cornerOffset);

        doc.line(pageWidth - cornerOffset, pageHeight - cornerOffset - cornerSize, pageWidth - cornerOffset, pageHeight - cornerOffset);
        doc.line(pageWidth - cornerOffset, pageHeight - cornerOffset, pageWidth - cornerOffset - cornerSize, pageHeight - cornerOffset);

        // Pontos Dourados de Enfeite nos Cantos
        doc.setFillColor(205, 162, 40);
        doc.circle(cornerOffset + 2.5, cornerOffset + 2.5, 1.2, 'F');
        doc.circle(pageWidth - cornerOffset - 2.5, cornerOffset + 2.5, 1.2, 'F');
        doc.circle(cornerOffset + 2.5, pageHeight - cornerOffset - 2.5, 1.2, 'F');
        doc.circle(pageWidth - cornerOffset - 2.5, pageHeight - cornerOffset - 2.5, 1.2, 'F');

        // 5. Cabeçalho Institucional
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(37, 99, 235); // Blue-600
        doc.setFontSize(11);
        doc.text('KUMONGEN 3.0 · PROGRAMA DE AUTONOMIA & EXCELÊNCIA PEDAGÓGICA', pageWidth / 2, 26, { align: 'center' });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.text('MÉTODO DE ESTUDO DIÁRIO AUTOINSTRUTIVO · DESENVOLVIMENTO DE POTENCIAL MÁXIMO', pageWidth / 2, 31, { align: 'center' });

        // 6. Título do Certificado
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(26);
        doc.setTextColor(15, 23, 42); // Slate-900
        doc.text('CERTIFICADO DE MÉRITO', pageWidth / 2, 45, { align: 'center' });

        // Linha dourada central sob o título
        doc.setDrawColor(205, 162, 40);
        doc.setLineWidth(1.0);
        doc.line(pageWidth / 2 - 35, 49, pageWidth / 2 + 35, 49);
        doc.circle(pageWidth / 2, 49, 1.2, 'F');

        // 7. Texto introdutório
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(71, 85, 105); // Slate-600
        doc.text('Certificamos com louvor e reconhecimento que o(a) aluno(a)', pageWidth / 2, 60, { align: 'center' });

        // 8. Nome do Aluno (com auto-redimensionamento inteligente se for longo)
        const studentName = (certData.studentName || 'SUPER ALUNO').toUpperCase().trim();
        let nameFontSize = 24;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(nameFontSize);
        let nameW = doc.getTextWidth(studentName);
        while (nameW > 180 && nameFontSize > 13) {
            nameFontSize -= 1;
            doc.setFontSize(nameFontSize);
            nameW = doc.getTextWidth(studentName);
        }
        doc.setTextColor(30, 58, 138); // Deep Blue
        doc.text(studentName, pageWidth / 2, 73, { align: 'center' });

        // Linha sob o nome proporcional e contida (máximo 140mm)
        const underlineW = Math.min(140, Math.max(70, nameW + 16));
        doc.setDrawColor(203, 213, 225); // Slate-300
        doc.setLineWidth(0.6);
        doc.line(pageWidth / 2 - underlineW / 2, 76, pageWidth / 2 + underlineW / 2, 76);

        // 9. Conquista do Nível
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(71, 85, 105);
        doc.text('concluiu com êxito os desafios de fluência e autonomia no módulo:', pageWidth / 2, 86, { align: 'center' });

        // Título do nível com ajuste de tamanho se for longo
        const levelText = `${certData.levelTitle} · ${certData.subjectTitle}`;
        let levelFontSize = 16;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(levelFontSize);
        let levelW = doc.getTextWidth(levelText);
        while (levelW > 190 && levelFontSize > 11) {
            levelFontSize -= 1;
            doc.setFontSize(levelFontSize);
            levelW = doc.getTextWidth(levelText);
        }
        doc.setTextColor(15, 23, 42);
        doc.text(levelText, pageWidth / 2, 94, { align: 'center' });

        // 10. Três Cartões de Métricas (Grid Modular Clean - NUNCA rompe a borda direita!)
        const cardW = 60;
        const cardH = 20;
        const cardGap = 8;
        const totalGridW = (cardW * 3) + (cardGap * 2); // 180 + 16 = 196mm
        const gridStartX = (pageWidth - totalGridW) / 2;
        const gridY = 103;

        const isMastered = certData.isGauntletMastered || certData.accuracy === 100;
        const metricsData = [
            {
                label: certData.isGauntletMastered ? 'MAESTRIA KUMON' : 'PRECISÃO',
                val: certData.isGauntletMastered ? '100%' : `${certData.accuracy}%`,
                sub: certData.isGauntletMastered ? `1ª tent: ${certData.accuracy}%` : 'Acertos na 1ª tentativa',
                color: [16, 185, 129]
            },
            { label: 'TEMPO SCT', val: certData.timeFormatted, sub: `Meta: ${certData.targetFormatted}`, color: [59, 130, 246] },
            { label: 'ESTRELAS', val: `+${certData.starsEarned}`, sub: 'Conquistadas na sessão', color: [245, 158, 11] }
        ];

        metricsData.forEach((m, i) => {
            const cX = gridStartX + i * (cardW + cardGap);
            // Fundo suave do cartão
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(cX, gridY, cardW, cardH, 3, 3, 'F');
            // Borda sutil
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.4);
            doc.roundedRect(cX, gridY, cardW, cardH, 3, 3, 'D');

            // Valor em destaque
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(m.color[0], m.color[1], m.color[2]);
            doc.text(m.val, cX + cardW / 2, gridY + 8, { align: 'center' });

            // Rótulo principal
            doc.setFontSize(7);
            doc.setTextColor(30, 41, 59);
            doc.text(m.label, cX + cardW / 2, gridY + 13, { align: 'center' });

            // Subtítulo
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(100, 116, 139);
            doc.text(m.sub, cX + cardW / 2, gridY + 17, { align: 'center' });
        });

        // 11. Selo de Honra com Fitas (Gráfico Vetorial Elegante)
        const sealX = pageWidth / 2;
        const sealY = 142;

        // Fitas da medalha
        doc.setFillColor(certData.isGauntletMastered ? 217 : 37, certData.isGauntletMastered ? 119 : 99, certData.isGauntletMastered ? 6 : 235); // Âmbar se Gauntlet, Azul se direto
        doc.triangle(sealX - 8, sealY + 8, sealX - 3, sealY + 20, sealX - 12, sealY + 22, 'F');
        doc.triangle(sealX + 8, sealY + 8, sealX + 3, sealY + 20, sealX + 12, sealY + 22, 'F');

        // Círculo Ouro Externo
        doc.setFillColor(205, 162, 40);
        doc.circle(sealX, sealY, 13, 'F');
        // Círculo Interno Marfim
        doc.setFillColor(254, 249, 195);
        doc.circle(sealX, sealY, 10.8, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(146, 64, 14);
        const sealTitle = certData.isGauntletMastered ? 'MAESTRIA' : (certData.accuracy === 100 ? 'NOTA 10' : '100%');
        doc.text(sealTitle, sealX, sealY - 0.5, { align: 'center' });
        doc.setFontSize(4.8);
        doc.setTextColor(180, 83, 9);
        const sealSubtitle = certData.isGauntletMastered ? 'PERSISTÊNCIA' : 'KUMONGEN';
        doc.text(sealSubtitle, sealX, sealY + 3.8, { align: 'center' });

        // 12. Linhas de Assinatura Balanceadas
        const sigY = 168;
        const sigLineW = 65;
        const sigLeftX = 40;
        const sigRightX = pageWidth - 40 - sigLineW;

        doc.setDrawColor(148, 163, 184); // Slate-400
        doc.setLineWidth(0.5);

        // Linha esquerda: Pais/Responsáveis
        doc.line(sigLeftX, sigY, sigLeftX + sigLineW, sigY);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Responsável / Orientador(a)', sigLeftX + sigLineW / 2, sigY + 4.5, { align: 'center' });

        // Linha direita: Sistema KumonGen
        doc.line(sigRightX, sigY, sigRightX + sigLineW, sigY);
        doc.text('KumonGen 3.0 · Certificação Digital', sigRightX + sigLineW / 2, sigY + 4.5, { align: 'center' });

        // 13. Rodapé Oficial perfeitamente enquadrado dentro da moldura
        const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`Emitido com dedicação em ${today} · Registro Oficial: KM-${Date.now().toString(36).toUpperCase()}`, pageWidth / 2, pageHeight - 20, { align: 'center' });

        const safeName = (certData.studentName || 'Aluno').replace(/[^a-zA-Z0-9]/g, '_');
        const pdfFileName = `Certificado_Kumon_${safeName}.pdf`;

        // Método de download resiliente para iOS, iPad e Android
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
    // 5.5. CATÁLOGO & MOTOR DE COMPANHEIROS MASCOTES
    // ============================================================
    const MASCOTS = {
        jaguar: {
            id: 'jaguar',
            name: 'Jade',
            fullName: 'Jade a Jaguatirica',
            icon: '🐾',
            avatar: 'assets/mascotes/jaguar_avatar.png',
            fullImg: 'assets/mascotes/jaguar.png',
            themeClass: 'theme-jaguar',
            ringGradient: 'from-amber-400 to-yellow-300',
            textColor: 'text-amber-400',
            borderColor: 'border-amber-400',
            badgeBg: 'bg-amber-500',
            desc: 'Ágil e curiosa! Adora desafios rápidos e celebrar cada vitória.',
            cheerSuccess: [
                'Incrível! Você acertou!',
                'Na mosca! Que rapidez!',
                'Sensacional! Você é demais!',
                'Muito bem! Mandou super bem!',
                'Boa! Continue nesse ritmo!'
            ],
            cheerStreak: [
                'Uau, que sequência feroz!',
                'Velocidade de jaguar! Imparável!',
                'Que foco impressionante!'
            ],
            cheerWrong: [
                'Quase lá! Tente mais uma vez!',
                'Respira fundo, você consegue!',
                'Vamos juntos, confio em você!',
                'Não desista, a prática faz o mestre!'
            ],
            cheerFinish: 'Parabéns campeão(ã)! Treino concluído com garra!'
        },
        capivara: {
            id: 'capivara',
            name: 'Capi',
            fullName: 'Capi a Capivara',
            icon: '🧢',
            avatar: 'assets/mascotes/capivara_avatar.png',
            fullImg: 'assets/mascotes/capivara.png',
            themeClass: 'theme-capivara',
            ringGradient: 'from-orange-500 to-amber-400',
            textColor: 'text-orange-400',
            borderColor: 'border-orange-400',
            badgeBg: 'bg-orange-500',
            desc: 'Focado e sereno com seu boné da sorte! Passo a passo até a perfeição.',
            cheerSuccess: [
                'Excelente foco!',
                'Muito bom! Constância é tudo!',
                'Passo a passo com calma!',
                'Perfeito! Grande acerto!',
                'Você pensou certinho!'
            ],
            cheerStreak: [
                'Que tranquilidade genial!',
                'Concentração de mestre!',
                'Super focado, que orgulho!'
            ],
            cheerWrong: [
                'Calma e tranquilidade!',
                'Respira e tenta de novo.',
                'Tudo bem errar, assim a gente aprende!'
            ],
            cheerFinish: 'Treino finalizado com muita paz e dedicação!'
        },
        calango: {
            id: 'calango',
            name: 'Lango',
            fullName: 'Lango o Calango',
            icon: '🦎',
            avatar: 'assets/mascotes/calango_avatar.png',
            fullImg: 'assets/mascotes/calango.png',
            themeClass: 'theme-calango',
            ringGradient: 'from-emerald-500 to-teal-400',
            textColor: 'text-emerald-400',
            borderColor: 'border-emerald-400',
            badgeBg: 'bg-emerald-500',
            desc: 'Esperto e veloz! Olhos atentos e raciocínio afiado para matemática.',
            cheerSuccess: [
                'Boa! Reflexos rápidos!',
                'Você é esperto demais!',
                'Cálculo afiado!',
                'Show! Mais um acerto na conta!',
                'Mandou ver!'
            ],
            cheerStreak: [
                'Velocidade máxima ativada!',
                'Ninguém te segura hoje!',
                'Que raciocínio relâmpago!'
            ],
            cheerWrong: [
                'Ops! Tenta outra vez!',
                'Chegou pertinho, recalcula aí!',
                'Bora lá, você pega de primeira agora!'
            ],
            cheerFinish: 'Treino épico! Você foi muito veloz!'
        },
        golfinho: {
            id: 'golfinho',
            name: 'Finho',
            fullName: 'Finho o Golfinho',
            icon: '🐬',
            avatar: 'assets/mascotes/golfinho_avatar.png',
            fullImg: 'assets/mascotes/golfinho.png',
            themeClass: 'theme-golfinho',
            ringGradient: 'from-blue-500 to-cyan-400',
            textColor: 'text-blue-400',
            borderColor: 'border-blue-400',
            badgeBg: 'bg-blue-500',
            desc: 'Alegre e saltitante! Torce com sorrisos em cada resposta certa.',
            cheerSuccess: [
                'Salto perfeito! Acertou!',
                'Uhul! Que resposta linda!',
                'Sensacional! Pura alegria!',
                'Nota 10! Mergulhou fundo!',
                'Parabéns, você é fera!'
            ],
            cheerStreak: [
                'Onda gigante de acertos!',
                'Show aquático de inteligência!',
                'Espetacular! Você brilha!'
            ],
            cheerWrong: [
                'Não desanima, mergulha de novo!',
                'Tenta outra vez, você vai achar!',
                'Estou torcendo por você!'
            ],
            cheerFinish: 'Festa no mar! Treino maravilhoso!'
        }
    };

    const MascotEngine = {
        currentId: localStorage.getItem('kumongen_active_mascot') || 'jaguar',

        getCurrent() {
            return MASCOTS[this.currentId] || MASCOTS.jaguar;
        },

        set(id) {
            if (!MASCOTS[id]) return;
            this.currentId = id;
            localStorage.setItem('kumongen_active_mascot', id);
            this.updateUI();
            this.speak(`Oi! Eu sou ${this.getCurrent().name}! Vamos treinar juntos!`);
        },

        updateUI() {
            const m = this.getCurrent();

            // Aplica tema de cores do mascote no body (CSS variables)
            document.body.classList.remove('theme-jaguar', 'theme-capivara', 'theme-golfinho', 'theme-calango');
            document.body.classList.add(m.themeClass);

            // Atualiza componente principal ao lado do card
            const avatarImg = document.getElementById('mascotAvatarImg');
            if (avatarImg) avatarImg.src = m.avatar;

            const nameBadge = document.getElementById('mascotNameBadge');
            if (nameBadge) {
                nameBadge.innerHTML = `${m.name} ${m.icon}`;
                nameBadge.className = `mt-1 text-[10px] md:text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm`;
                nameBadge.style.cssText = `background: var(--accent-light); color: var(--accent-dark); border: 1px solid var(--accent);`;
            }

            const ring = document.getElementById('mascotAvatarRing');
            if (ring) {
                ring.className = `w-14 h-14 md:w-20 md:h-20 rounded-full p-1 theme-ring shadow-xl transition-all duration-300 group-hover:scale-105 group-active:scale-95`;
            }

            // Atualiza botão do header
            const headerImg = document.getElementById('headerMascotImg');
            if (headerImg) {
                headerImg.src = m.avatar;
                headerImg.className = `w-6 h-6 rounded-full object-cover border-2`;
                headerImg.style.borderColor = `var(--accent)`;
            }
            const headerName = document.getElementById('headerMascotName');
            if (headerName) {
                headerName.innerText = m.name;
                headerName.className = `hidden md:inline text-xs font-bold`;
                headerName.style.color = `var(--accent-dark)`;
            }

            // Atualiza badges dinâmicos do header com CSS vars
            const starsSpan = document.getElementById('headerStarsCount');
            const starsDiv = starsSpan ? starsSpan.parentElement : null;
            if (starsDiv) {
                starsDiv.style.cssText = `background: var(--badge-bg); border: 1px solid var(--badge-border); color: var(--badge-text);`;
            }

            // Atualiza student name display com cor do tema
            const studentName = document.getElementById('studentNameDisplay');
            if (studentName) {
                studentName.style.color = `var(--accent-dark)`;
            }
        },

        getVoiceConfig() {
            const m = this.getCurrent();
            let pitch = 1.15;
            if (m.id === 'jaguar') pitch = 1.25;        // Jade: ágil e saltitante
            else if (m.id === 'capivara') pitch = 0.98;   // Capi: calma e serena
            else if (m.id === 'calango') pitch = 1.20;    // Lango: esperto e rápido
            else if (m.id === 'golfinho') pitch = 1.30;   // Finho: agudo e saltitante
            const lang = Session.subjectKey === 'ingles' ? 'en-US' : 'pt-BR';
            return { pitch, lang };
        },

        speak(text, duration = 3200, vocalize = false) {
            const bubble = document.getElementById('mascotSpeechBubble');
            const speechText = document.getElementById('mascotSpeechText');
            if (bubble && speechText) {
                speechText.innerText = text;
                bubble.style.opacity = '1';
                bubble.style.transform = 'scale(1)';

                if (this._speakTimer) clearTimeout(this._speakTimer);
                this._speakTimer = setTimeout(() => {
                    speechText.innerText = Session.isGauntletPhase ? 'Foco na maestria! 🎯' : 'Sua vez! ✏️';
                }, duration);
            }

            if (vocalize) {
                const { pitch, lang } = this.getVoiceConfig();
                // Limpeza de emojis para fala limpa sem pronunciar códigos
                const cleanText = text.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '').trim();
                speakWord(cleanText, lang, pitch, 0.92);
            }
        },

        onCorrect(streak = 1) {
            const m = this.getCurrent();
            let msg = '';
            const isStreakEvent = streak >= 3;
            if (isStreakEvent && Math.random() > 0.25) {
                msg = m.cheerStreak[Math.floor(Math.random() * m.cheerStreak.length)];
            } else {
                msg = m.cheerSuccess[Math.floor(Math.random() * m.cheerSuccess.length)];
            }

            // Pulinho do avatar
            const ring = document.getElementById('mascotAvatarRing');
            if (ring) {
                ring.classList.add('-translate-y-2');
                setTimeout(() => ring.classList.remove('-translate-y-2'), 350);
            }

            // Vocaliza áudio do mascote se for streak ou modo gauntlet
            const shouldVocalize = streak >= 3 || Session.isGauntletPhase;
            this.speak(msg, 2800, shouldVocalize);
        },

        onWrong() {
            const m = this.getCurrent();
            const msg = m.cheerWrong[Math.floor(Math.random() * m.cheerWrong.length)];
            this.speak(msg, 2800, false);
        },

        showPickerModal() {
            const modal = document.getElementById('mascotPickerModal');
            if (!modal) return;

            modal.innerHTML = `
                <div class="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border-4 border-amber-400 text-center relative max-h-[90vh] overflow-y-auto">
                    <div class="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto text-2xl mb-3 shadow-inner">
                        <i class="fas fa-paw"></i>
                    </div>
                    <span class="inline-block bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-1">Amigos do KumonGen</span>
                    <h3 class="text-xl font-black text-slate-900">Escolha seu Companheiro:</h3>
                    <p class="text-xs text-slate-500 mt-1 mb-4">Quem vai te acompanhar nos treinos hoje?</p>

                    <div id="mascotOptionsGrid" class="grid grid-cols-2 gap-3 mb-5">
                        ${Object.values(MASCOTS).map(m => {
                            const isSelected = m.id === this.currentId;
                            return `
                                <button type="button" class="mascot-pick-card p-3 rounded-2xl border-2 transition-all text-left flex flex-col items-center text-center cursor-pointer ${isSelected ? 'border-amber-400 bg-amber-50/90 shadow-md ring-2 ring-amber-300' : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300'}" data-mascot-id="${m.id}">
                                    <div class="w-16 h-16 rounded-full p-1 bg-gradient-to-tr ${m.ringGradient} shadow-md mb-2">
                                        <img src="${m.avatar}" alt="${m.name}" class="w-full h-full rounded-full object-cover border-2 border-white">
                                    </div>
                                    <div class="font-black text-slate-800 text-sm flex items-center gap-1">
                                        ${m.name} <span>${m.icon}</span>
                                    </div>
                                    <div class="text-[10px] text-slate-500 line-clamp-2 mt-1">${m.desc}</div>
                                    ${isSelected ? '<span class="mt-2 text-[9px] font-black uppercase text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Selecionado</span>' : ''}
                                </button>
                            `;
                        }).join('')}
                    </div>

                    <button id="closeMascotPickerBtn" class="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-colors">
                        Continuar com ${this.getCurrent().name}
                    </button>
                </div>
            `;

            modal.style.display = 'flex';

            modal.querySelectorAll('.mascot-pick-card').forEach(btn => {
                btn.addEventListener('click', () => {
                    sound.init();
                    sound.playSuccess();
                    const mid = btn.getAttribute('data-mascot-id');
                    this.set(mid);
                    modal.style.display = 'none';
                });
            });

            const closeBtn = document.getElementById('closeMascotPickerBtn');
            if (closeBtn) {
                closeBtn.onclick = () => { modal.style.display = 'none'; };
            }
        }
    };

    // ============================================================
    // 5b. WIZARD DE CONFIGURAÇÃO DE TAREFA (PAI → CRIANÇA)
    // ============================================================
    // ============================================================
    // 5. WIZARD GUIADO DE CONFIGURAÇÃO DE TAREFA (PARA PAIS/ALUNOS)
    // ============================================================
    const TaskWizard = {
        modal: null,
        selectedSubject: null,
        selectedLevel: null,
        currentStep: 1,
        _eventsBound: false,

        show() {
            this.modal = document.getElementById('taskWizardModal');
            if (!this.modal) return;
            this.selectedSubject = null;
            this.selectedLevel = null;
            this.bindGlobalEvents();
            this.renderStep1();
            this.modal.style.display = 'flex';
        },

        bindGlobalEvents() {
            if (this._eventsBound || !this.modal) return;
            // Fecha ao clicar fora do card (no backdrop escuro)
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.close();
            });

            // Tecla ESC para voltar um passo ou fechar
            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.modal && this.modal.style.display === 'flex') {
                    if (this.currentStep === 3) {
                        this.renderStep2();
                    } else if (this.currentStep === 2) {
                        this.renderStep1();
                    } else {
                        this.close();
                    }
                }
            });
            this._eventsBound = true;
        },

        close() {
            if (this.modal) this.modal.style.display = 'none';
        },

        renderStep1() {
            if (!window.KumonSubjects) return;
            this.currentStep = 1;
            const subjects = [
                { key: 'matematica', icon: 'fa-calculator', emoji: '🔢', label: 'Matemática', color: '#2563eb', bg: '#eff6ff', border: '#93c5fd', desc: 'Contagem, operações, sequências e frações' },
                { key: 'portugues', icon: 'fa-book-open', emoji: '📖', label: 'Português', color: '#059669', bg: '#ecfdf5', border: '#6ee7b7', desc: 'Sílabas, palavras, frases e rimas' },
                { key: 'ingles', icon: 'fa-globe-americas', emoji: '🇬🇧', label: 'Inglês', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', desc: 'Words, opposites, sentences' }
            ].filter(s => window.KumonSubjects[s.key]);

            this.modal.innerHTML = `
                <div class="wizard-card-modal bg-white p-5 md:p-6 text-center border-2 border-amber-400">
                    <button type="button" id="wizardCloseBtn1" class="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold transition-all cursor-pointer z-10 active:scale-90" title="Fechar (ESC)">
                        <i class="fas fa-times"></i>
                    </button>
                    
                    <div class="flex-shrink-0 mb-3">
                        <div class="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-xl bg-amber-100 text-amber-600 shadow-sm">
                            <i class="fas fa-tasks"></i>
                        </div>
                        <span class="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full mb-1 bg-amber-50 text-amber-700 border border-amber-300">Passo 1 de 3</span>
                        <h3 class="text-xl font-black text-gray-900 mb-0.5">Escolha a Matéria</h3>
                        <p class="text-xs text-gray-500">O que a criança vai treinar hoje?</p>
                    </div>

                    <div class="flex-1 overflow-y-auto min-h-0 pr-1 flex flex-col gap-2.5" style="-webkit-overflow-scrolling: touch;">
                        ${subjects.map(s => {
                            const subObj = window.KumonSubjects[s.key];
                            const lvlCount = subObj && subObj.levels ? subObj.levels.length : 0;
                            return `
                            <button type="button" class="wizard-subject-btn w-full p-3.5 rounded-2xl border-2 text-left flex items-center gap-3.5 cursor-pointer transition-all active:scale-95 hover:shadow-md" style="background:${s.bg};border-color:${s.border};" data-subject="${s.key}">
                                <div class="w-11 h-11 rounded-xl flex items-center justify-center text-lg flex-shrink-0 shadow-sm" style="background:${s.color};color:#fff;">
                                    <i class="fas ${s.icon}"></i>
                                </div>
                                <div class="min-w-0 flex-1">
                                    <div class="flex items-center gap-2">
                                        <span class="font-black text-gray-900 text-base leading-tight">${s.emoji} ${s.label}</span>
                                        <span class="text-[10px] font-bold px-2 py-0.5 rounded-full" style="background:${s.color}18;color:${s.color};">${lvlCount} níveis</span>
                                    </div>
                                    <div class="text-xs text-gray-500 mt-0.5 truncate">${s.desc}</div>
                                </div>
                                <i class="fas fa-chevron-right text-gray-300 ml-auto flex-shrink-0"></i>
                            </button>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;

            const closeBtn = document.getElementById('wizardCloseBtn1');
            if (closeBtn) closeBtn.addEventListener('click', () => this.close());

            this.modal.querySelectorAll('.wizard-subject-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.selectedSubject = btn.getAttribute('data-subject');
                    this.renderStep2();
                });
            });
        },

        renderStep2() {
            const sub = window.KumonSubjects[this.selectedSubject];
            if (!sub || !sub.levels) return;
            this.currentStep = 2;

            const subjectColors = {
                matematica: { color: '#2563eb', bg: '#eff6ff', border: '#93c5fd' },
                portugues: { color: '#059669', bg: '#ecfdf5', border: '#6ee7b7' },
                ingles: { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' }
            };
            const sc = subjectColors[this.selectedSubject] || subjectColors.matematica;

            this.modal.innerHTML = `
                <div class="wizard-card-modal bg-white p-5 md:p-6 text-center" style="border: 2px solid ${sc.border};">
                    <button type="button" id="wizardCloseBtn2" class="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold transition-all cursor-pointer z-10 active:scale-90" title="Fechar (ESC)">
                        <i class="fas fa-times"></i>
                    </button>

                    <div class="flex-shrink-0 mb-3">
                        <div class="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center text-xl shadow-sm" style="background:${sc.bg};color:${sc.color};">
                            <i class="fas fa-layer-group"></i>
                        </div>
                        <span class="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full mb-1" style="background:${sc.bg};color:${sc.color};border:1px solid ${sc.border};">Passo 2 de 3</span>
                        <h3 class="text-xl font-black text-gray-900 mb-0.5">Escolha o Nível</h3>
                        <p class="text-xs text-gray-500">${sub.title} · ${sub.levels.length} níveis disponíveis</p>
                    </div>

                    <div class="scroll-cue-wrapper">
                        <div class="wizard-scroll-area" id="wizardScrollArea" style="scrollbar-color: ${sc.color} ${sc.bg};">
                            <div class="wizard-level-grid">
                                ${sub.levels.map(lvl => `
                                    <button type="button" class="wizard-level-btn w-full p-2.5 rounded-xl border-2 text-left flex items-center gap-2.5 cursor-pointer bg-white hover:bg-slate-50 shadow-sm" style="border-color:${sc.border};" data-level="${lvl.id}">
                                        <span class="w-8 h-8 rounded-lg font-black text-xs flex items-center justify-center flex-shrink-0 shadow-sm" style="background:${sc.bg};color:${sc.color};border:1px solid ${sc.border};">
                                            ${lvl.id.toUpperCase()}
                                        </span>
                                        <div class="min-w-0 flex-1">
                                            <div class="font-bold text-gray-800 text-xs sm:text-sm leading-tight truncate" title="${lvl.title}">${lvl.title}</div>
                                        </div>
                                        <i class="fas fa-chevron-right text-gray-300 text-[10px] ml-auto flex-shrink-0"></i>
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                        <div class="scroll-cue-shadow" id="scrollCueShadow"></div>
                    </div>

                    <div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
                        <button type="button" id="wizardBackBtn" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95">
                            <i class="fas fa-arrow-left"></i> Voltar
                        </button>
                        <button type="button" id="wizardCancelBtn2" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-colors cursor-pointer active:scale-95">
                            Cancelar
                        </button>
                    </div>
                </div>
            `;

            const closeBtn = document.getElementById('wizardCloseBtn2');
            if (closeBtn) closeBtn.addEventListener('click', () => this.close());

            const cancelBtn = document.getElementById('wizardCancelBtn2');
            if (cancelBtn) cancelBtn.addEventListener('click', () => this.close());

            // Gerenciamento suave do scroll cue
            const scrollArea = document.getElementById('wizardScrollArea');
            const cueShadow = document.getElementById('scrollCueShadow');
            if (scrollArea && cueShadow) {
                const updateCue = () => {
                    const isAtBottom = scrollArea.scrollHeight - scrollArea.scrollTop <= scrollArea.clientHeight + 8;
                    cueShadow.style.opacity = isAtBottom ? '0' : '1';
                };
                scrollArea.addEventListener('scroll', updateCue, { passive: true });
                setTimeout(updateCue, 50);
            }

            this.modal.querySelectorAll('.wizard-level-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.selectedLevel = btn.getAttribute('data-level');
                    this.renderStep3();
                });
            });

            const backBtn = document.getElementById('wizardBackBtn');
            if (backBtn) backBtn.addEventListener('click', () => this.renderStep1());
        },

        renderStep3() {
            const sub = window.KumonSubjects[this.selectedSubject];
            const level = sub ? sub.levels.find(l => l.id === this.selectedLevel) : null;
            const mascot = MascotEngine.getCurrent();
            this.currentStep = 3;

            const subjectColors = {
                matematica: { color: '#2563eb', bg: '#eff6ff', border: '#93c5fd', label: '🔢 Matemática' },
                portugues: { color: '#059669', bg: '#ecfdf5', border: '#6ee7b7', label: '📖 Português' },
                ingles: { color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', label: '🇬🇧 Inglês' }
            };
            const sc = subjectColors[this.selectedSubject] || subjectColors.matematica;

            this.modal.innerHTML = `
                <div class="wizard-card-modal bg-white p-5 md:p-6 text-center" style="border: 2px solid ${sc.border};">
                    <button type="button" id="wizardCloseBtn3" class="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-sm font-bold transition-all cursor-pointer z-10 active:scale-90" title="Fechar (ESC)">
                        <i class="fas fa-times"></i>
                    </button>

                    <div class="flex-shrink-0 mb-3">
                        <div class="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr ${mascot.ringGradient} shadow-md mx-auto mb-2">
                            <img src="${mascot.avatar}" alt="${mascot.name}" class="w-full h-full rounded-full object-cover border-2 border-white">
                        </div>
                        <span class="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-0.5 rounded-full mb-1" style="background:${sc.bg};color:${sc.color};border:1px solid ${sc.border};">Passo 3 de 3</span>
                        <h3 class="text-xl font-black text-gray-900 mb-1">Tudo pronto!</h3>
                    </div>

                    <div class="flex-1 overflow-y-auto min-h-0 pr-1">
                        <div class="rounded-2xl p-4 mb-4 text-left shadow-sm" style="background:${sc.bg};border:1px solid ${sc.border};">
                            <div class="flex items-center gap-3 mb-2">
                                <span class="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0 shadow-sm" style="background:${sc.color};color:#fff;">${(this.selectedLevel || '').toUpperCase()}</span>
                                <div class="min-w-0 flex-1">
                                    <div class="text-sm font-black text-gray-900">${sc.label}</div>
                                    <div class="text-xs text-gray-600 truncate">${level ? level.title : ''}</div>
                                </div>
                            </div>
                            <div class="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                                <i class="fas fa-user text-gray-400"></i> ${(window.escapeHtml ? window.escapeHtml(Session.studentName) : Session.studentName)}
                                <span class="mx-1">·</span>
                                <img src="${mascot.avatar}" alt="${mascot.name}" class="w-4 h-4 rounded-full inline"> ${mascot.name}
                            </div>
                        </div>
                    </div>

                    <div class="flex-shrink-0 flex flex-col gap-2 mt-2">
                        <button type="button" id="wizardStartBtn" class="w-full py-3.5 font-black text-base rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2" style="background:${sc.color};color:#fff;">
                            <i class="fas fa-play"></i> Começar Tarefa
                        </button>

                        <div class="flex items-center justify-between gap-2 mt-1">
                            <button type="button" id="wizardBack2Btn" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95">
                                <i class="fas fa-arrow-left"></i> Voltar
                            </button>
                            <button type="button" id="wizardCancelBtn3" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-colors cursor-pointer active:scale-95">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            `;

            const closeBtn = document.getElementById('wizardCloseBtn3');
            if (closeBtn) closeBtn.addEventListener('click', () => this.close());

            const cancelBtn = document.getElementById('wizardCancelBtn3');
            if (cancelBtn) cancelBtn.addEventListener('click', () => this.close());

            const startBtn = document.getElementById('wizardStartBtn');
            if (startBtn) startBtn.addEventListener('click', () => this.confirm());

            const backBtn = document.getElementById('wizardBack2Btn');
            if (backBtn) backBtn.addEventListener('click', () => this.renderStep2());
        },

        confirm() {
            Session.subjectKey = this.selectedSubject;
            Session.levelId = this.selectedLevel;
            localStorage.setItem('kumongen-wizard-done', 'true');
            this.close();
            TabletPlayer.populateSubjects();
            TabletPlayer.populateLevels();
            TabletPlayer.startRound();
        }
    };

    // ============================================================
    // 6. MOTOR DO JOGO E CONTROLE DE TELAS
    // ============================================================
    const TabletPlayer = {
        init() {
            wakeLock.init();

            // Desbloqueia Web Audio e Síntese de Voz no primeiro toque do usuário (iPad / iOS / Android / Desktop)
            const unlockAudio = () => {
                sound.init();
                if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                    try {
                        loadAvailableVoices();
                        if (window.speechSynthesis.paused) {
                            window.speechSynthesis.resume();
                        }
                    } catch (e) {}
                }
                document.removeEventListener('touchstart', unlockAudio);
                document.removeEventListener('click', unlockAudio);
            };
            document.addEventListener('touchstart', unlockAudio, { passive: true });
            document.addEventListener('click', unlockAudio, { passive: true });

            MascotEngine.updateUI();
            this.bindTopNav();
            this.bindKeypad();
            this.loadInitialState();
            this.updateGamificationHeader();
        },

        bindTopNav() {
            // Seletor de Mascote Companheiro
            const mascotBtn = document.getElementById('mascotAvatarBtn');
            if (mascotBtn) {
                mascotBtn.addEventListener('click', () => MascotEngine.showPickerModal());
            }
            const headerMascotBtn = document.getElementById('headerMascotBtn');
            if (headerMascotBtn) {
                headerMascotBtn.addEventListener('click', () => MascotEngine.showPickerModal());
            }

            // Botão Nova Tarefa (abre wizard)
            const newTaskBtn = document.getElementById('newTaskBtn');
            if (newTaskBtn) {
                newTaskBtn.addEventListener('click', () => TaskWizard.show());
            }

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

            // Seletor visual touch-first de níveis (Modal)
            const openPickerBtn = document.getElementById('openLevelPickerBtn');
            if (openPickerBtn) {
                openPickerBtn.addEventListener('click', () => this.showLevelPickerModal());
            }

            const closePickerBtn = document.getElementById('closeLevelPickerBtn');
            if (closePickerBtn) {
                closePickerBtn.addEventListener('click', () => this.closeLevelPickerModal());
            }

            const pickerModal = document.getElementById('levelPickerModal');
            if (pickerModal) {
                pickerModal.addEventListener('click', (e) => {
                    if (e.target === pickerModal) this.closeLevelPickerModal();
                });
                window.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && pickerModal.style.display === 'flex') {
                        this.closeLevelPickerModal();
                    }
                });
            }

            // Tabs do modal de níveis
            document.querySelectorAll('.level-tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const targetSub = btn.getAttribute('data-subject');
                    this.switchLevelPickerTab(targetSub);
                });
            });

            // Seletor de Perfil do Aluno (Múltiplos Perfis)
            const nameBtn = document.getElementById('studentNameBtn');
            if (nameBtn) {
                nameBtn.addEventListener('click', () => {
                    if (window.StudentProfileEngine) {
                        window.StudentProfileEngine.showProfileModal({
                            onSelect: (student) => {
                                this.onStudentChanged(student);
                            }
                        });
                    } else {
                        const newName = prompt('Qual é o nome do(a) aluno(a)?', Session.studentName);
                        if (newName && newName.trim()) {
                            Session.studentName = (window.escapeHtml ? window.escapeHtml(newName.trim()) : newName.trim());
                            (window.SafeStorage || localStorage).setItem('kumongen_student_name', Session.studentName);
                            const nameEl = document.getElementById('studentNameDisplay');
                            if (nameEl) nameEl.innerText = Session.studentName;
                        }
                    }
                });
            }

            // Botão Direto para Cadastrar Outro Perfil / Criança
            const addProfileBtn = document.getElementById('headerAddProfileBtn');
            if (addProfileBtn) {
                addProfileBtn.addEventListener('click', () => {
                    if (window.StudentProfileEngine) {
                        window.StudentProfileEngine.showProfileModal({
                            initialView: 'form',
                            onSelect: (student) => {
                                this.onStudentChanged(student);
                            }
                        });
                    }
                });
            }

            // Botão Direto para Boletim de Evolução & Gráficos
            const evoBtn = document.getElementById('headerEvolutionBtn');
            if (evoBtn) {
                evoBtn.addEventListener('click', () => {
                    if (window.StudentProfileEngine) {
                        window.StudentProfileEngine.showEvolutionModal();
                    }
                });
            }

            // Escuta trocas de aluno originadas em qualquer parte da aplicação
            window.addEventListener('kumongen:student_changed', (e) => {
                if (e.detail && e.detail.student) {
                    this.onStudentChanged(e.detail.student);
                }
            });

            // Som mudo / desmutado
            const soundBtn = document.getElementById('soundToggleBtn');
            if (soundBtn) {
                this.updateSoundBtn();
                soundBtn.addEventListener('click', () => {
                    sound.toggleMute();
                    if (typeof window !== 'undefined' && window.speechSynthesis) {
                        try {
                            window.speechSynthesis.cancel();
                        } catch (e) {}
                    }
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
                if (Session.isTransitionLocked) return;
                if (e.key >= '0' && e.key <= '9') {
                    sound.init();
                    sound.playClick();
                    this.handleKeypadPress(e.key);
                } else if (e.key === 'Backspace') {
                    sound.init();
                    sound.playClick();
                    this.handleKeypadPress('backspace');
                } else if (e.key === 'Enter') {
                    sound.init();
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
                    if (Session.isTransitionLocked) return;
                    sound.init();
                    sound.playClick();
                    const key = btn.getAttribute('data-key');
                    this.handleKeypadPress(key);
                });
            });
        },

        onStudentChanged(student) {
            if (!student) return;
            Session.studentName = student.name;
            const nameEl = document.getElementById('studentNameDisplay');
            if (nameEl) nameEl.innerText = student.name;

            const mascotImg = document.getElementById('studentMascotAvatar');
            if (mascotImg && window.StudentProfileEngine) {
                const m = window.StudentProfileEngine.MASCOTS[student.mascot] || window.StudentProfileEngine.MASCOTS.jaguar;
                mascotImg.src = m.avatar;
            }

            if (student.mascot && typeof MascotEngine !== 'undefined') {
                MascotEngine.set(student.mascot);
            }

            this.updateGamificationHeader();
        },

        loadInitialState() {
            // Permite carregar matéria e nível via Query Params: tablet.html?subject=portugues&level=p3
            const urlParams = new URLSearchParams(window.location.search);
            const qSub = urlParams.get('subject');
            const qLvl = urlParams.get('level');
            const hasUrlParams = !!(qSub || qLvl);

            if (qSub && window.KumonSubjects && window.KumonSubjects[qSub]) {
                Session.subjectKey = qSub;
            }
            if (qLvl) {
                Session.levelId = qLvl;
            }

            if (window.StudentProfileEngine) {
                const active = window.StudentProfileEngine.getActive();
                if (active) {
                    this.onStudentChanged(active);
                }
            } else {
                const nameEl = document.getElementById('studentNameDisplay');
                if (nameEl) nameEl.innerText = Session.studentName;
            }

            this.populateSubjects();
            this.populateLevels();

            // Primeira abertura ou sem sessão salva: mostra wizard
            const wizardDone = localStorage.getItem('kumongen-wizard-done');
            if (!wizardDone && !hasUrlParams) {
                TaskWizard.show();
            } else {
                this.startRound();
            }
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

            // Atualiza o botão visual touch-first no header
            const curLevel = sub.levels.find(l => l.id === Session.levelId) || sub.levels[0];
            const titleEl = document.getElementById('pickerLevelTitle');
            const dotEl = document.getElementById('pickerSubjectDot');
            if (titleEl && curLevel) {
                titleEl.innerText = curLevel.title;
            }
            if (dotEl) {
                if (Session.subjectKey === 'matematica') dotEl.className = 'w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm flex-shrink-0';
                else if (Session.subjectKey === 'portugues') dotEl.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm flex-shrink-0';
                else if (Session.subjectKey === 'ingles') dotEl.className = 'w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm flex-shrink-0';
            }
        },

        showLevelPickerModal() {
            const modal = document.getElementById('levelPickerModal');
            if (!modal) return;
            const wModal = document.getElementById('workedExampleModal');
            if (wModal) wModal.style.display = 'none';
            this.switchLevelPickerTab(Session.subjectKey);
            modal.style.display = 'flex';
        },

        closeLevelPickerModal() {
            const modal = document.getElementById('levelPickerModal');
            if (modal) modal.style.display = 'none';
        },

        switchLevelPickerTab(subjectKey) {
            document.querySelectorAll('.level-tab-btn').forEach(btn => {
                const isCurrent = btn.getAttribute('data-subject') === subjectKey;
                if (isCurrent) {
                    let activeBg = 'bg-blue-600 text-white shadow';
                    if (subjectKey === 'portugues') activeBg = 'bg-emerald-700 text-white shadow';
                    else if (subjectKey === 'ingles') activeBg = 'bg-red-600 text-white shadow';
                    btn.className = `level-tab-btn py-2.5 rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer ${activeBg}`;
                } else {
                    btn.className = 'level-tab-btn py-2.5 rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-gray-100 text-gray-500 hover:bg-gray-200';
                }
            });

            this.renderLevelPickerGrid(subjectKey);
        },

        renderLevelPickerGrid(subjectKey) {
            const grid = document.getElementById('levelPickerGrid');
            if (!grid || !window.KumonSubjects) return;

            const sub = window.KumonSubjects[subjectKey];
            if (!sub || !sub.levels) return;

            grid.innerHTML = sub.levels.map(lvl => {
                const isSelected = (subjectKey === Session.subjectKey && lvl.id === Session.levelId);
                const activeCardClasses = isSelected
                    ? 'bg-blue-50 border-blue-500 text-gray-900 shadow-md'
                    : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700';
                const badgeClasses = isSelected
                    ? 'bg-blue-500 text-white shadow'
                    : 'bg-gray-200 text-gray-600';

                return `
                    <button type="button" class="level-card-btn w-full p-3 md:p-3.5 rounded-2xl border-2 transition-all flex items-center justify-between text-left cursor-pointer active:scale-98 ${activeCardClasses}" data-subject="${subjectKey}" data-level="${lvl.id}" data-level-id="${lvl.id}">
                        <div class="flex items-center gap-3 min-w-0">
                            <span class="w-9 h-9 rounded-xl font-black text-xs md:text-sm flex items-center justify-center flex-shrink-0 ${badgeClasses}">
                                ${lvl.id.toUpperCase()}
                            </span>
                            <div class="min-w-0">
                                <div class="font-black text-xs md:text-sm ${isSelected ? 'text-blue-900' : 'text-gray-900'} truncate">${lvl.title}</div>
                                <div class="text-[10px] md:text-[11px] ${isSelected ? 'text-blue-700 font-semibold' : 'text-slate-500'} truncate">${lvl.instruction}</div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 flex-shrink-0 ml-2">
                            ${isSelected ? '<i class="fas fa-check-circle text-blue-400 text-base"></i>' : '<i class="fas fa-play text-slate-500 text-xs"></i>'}
                        </div>
                    </button>
                `;
            }).join('');

            grid.querySelectorAll('.level-card-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const chosenSub = btn.getAttribute('data-subject');
                    const chosenLvl = btn.getAttribute('data-level-id');

                    Session.subjectKey = chosenSub;
                    Session.levelId = chosenLvl;

                    const subSelect = document.getElementById('subjectSelect');
                    if (subSelect) subSelect.value = chosenSub;
                    this.populateLevels();

                    const lvlSelect = document.getElementById('levelSelect');
                    if (lvlSelect) lvlSelect.value = chosenLvl;

                    this.closeLevelPickerModal();
                    this.startRound();
                });
            });
        },

        startRound() {
            wakeLock.request();

            // Sincroniza controles de nível no header
            const subSelect = document.getElementById('subjectSelect');
            if (subSelect && subSelect.value !== Session.subjectKey) {
                subSelect.value = Session.subjectKey;
            }
            this.populateLevels();
            const lvlSelect = document.getElementById('levelSelect');
            if (lvlSelect && lvlSelect.value !== Session.levelId) {
                lvlSelect.value = Session.levelId;
            }

            // Limpa qualquer timer pendente de transição e reseta trava
            if (Session.transitionTimeout) {
                clearTimeout(Session.transitionTimeout);
                Session.transitionTimeout = null;
            }
            Session.isTransitionLocked = false;

            // Fecha/oculta explicitamente modais que possam ter ficado abertos
            const gModal = document.getElementById('gauntletModal');
            if (gModal) gModal.style.display = 'none';
            const rModal = document.getElementById('roundFinishedModal');
            if (rModal) rModal.style.display = 'none';

            // Cancela síntese de voz ativa
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                try {
                    window.speechSynthesis.cancel();
                } catch (e) {}
            }

            // Limpa event listeners residuais de traçado
            if (typeof this.cleanupTraceCanvas === 'function') {
                this.cleanupTraceCanvas();
            }

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

            // Reseta flags do Gauntlet Kumon (Loop de Maestria 100%)
            Session.missedItemsQueue = [];
            Session.isGauntletPhase = false;
            Session.isGauntlet = false;
            Session.gauntletCycles = 0;
            Session.initialItemsCount = Session.items.length;
            Session.gauntletItemsSolved = 0;

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
            clearCardAutoplay();
            if (typeof this.cleanupTraceCanvas === 'function') {
                this.cleanupTraceCanvas();
            }
            Session.isTransitionLocked = false;
            Session.currentInput = '';
            Session.currentAttempts = 0;

            const item = Session.items[Session.currentIndex];
            if (!item) return;
            const total = Session.items.length;
            const sub = window.KumonSubjects[Session.subjectKey];
            const level = sub && sub.levels ? sub.levels.find(l => l.id === Session.levelId) : null;

            // Barra de progresso superior com destaque para modo Gauntlet
            const progressPercent = Math.round((Session.currentIndex / total) * 100);
            const progressBar = document.getElementById('roundProgressBar');
            const progressText = document.getElementById('roundProgressText');
            if (progressBar) {
                progressBar.style.width = `${progressPercent}%`;
                if (Session.isGauntletPhase) {
                    progressBar.className = 'h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full transition-all duration-300 shadow';
                } else {
                    progressBar.className = 'h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-300 shadow-sm';
                }
            }
            if (progressText) {
                if (Session.isGauntletPhase) {
                    progressText.innerHTML = `<span class="text-amber-400 font-black tracking-wide"><i class="fas fa-bullseye"></i> Modo Maestria: ${Session.currentIndex + 1} de ${total}</span>`;
                } else {
                    progressText.innerText = `Questão ${Session.currentIndex + 1} de ${total}`;
                }
            }

            // Exemplo guiado (Worked Example) no exercício 1
            const exampleContainer = document.getElementById('workedExampleModal');
            if (Session.currentIndex === 0 && !Session.workedExampleDismissed && exampleContainer) {
                this.renderWorkedExample(item, level);
                return;
            } else if (exampleContainer) {
                exampleContainer.style.display = 'none';
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
            const numericTypes = ['math', 'quantity', 'sequence', 'tens', 'neighbors'];
            if (keypadWrapper) {
                if (numericTypes.includes(item.type)) {
                    keypadWrapper.style.display = '';
                } else {
                    keypadWrapper.style.display = 'none';
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
                case 'fraction':
                    this.renderFractionCard(item, focusContainer);
                    break;
                case 'rhyme':
                    this.renderRhymeCard(item, focusContainer);
                    break;
                case 'sentence':
                    this.renderSentenceCard(item, focusContainer);
                    break;
                case 'opposite':
                    this.renderOppositeCard(item, focusContainer);
                    break;
                default:
                    focusContainer.innerHTML = `<div class="p-8 text-center text-slate-400">Exercício em preparação.</div>`;
            }
        },

        // Exemplo guiado Kumon antes de começar
        renderWorkedExample(item, level) {
            const modal = document.getElementById('workedExampleModal');
            if (!modal) return;

            const isEng = Session.subjectKey === 'ingles';
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
            } else if (item.type === 'fraction') {
                exampleHtml = `
                    <div class="text-2xl md:text-3xl font-black text-slate-800 flex items-center justify-center gap-3 my-6">
                        <span>Fração modelo:</span>
                        <span class="bg-blue-100 text-blue-700 px-4 py-2 rounded-2xl border-2 border-dashed border-blue-400 font-black">${solved}</span>
                    </div>
                `;
            } else if (item.type === 'rhyme') {
                exampleHtml = `
                    <div class="text-xl md:text-2xl font-bold text-slate-800 flex flex-col items-center justify-center gap-2 my-6">
                        <span>"${item.word}" rima com:</span>
                        <span class="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-2xl border-2 border-dashed border-indigo-400 font-black text-2xl">${solved}</span>
                    </div>
                `;
            } else if (item.type === 'sentence') {
                const sentText = item.sentence || solved;
                exampleHtml = `
                    <div class="text-lg md:text-xl font-bold text-slate-800 flex flex-col items-center justify-center gap-2 my-6">
                        <span>${isEng ? 'Sentence model:' : 'Frase modelo:'}</span>
                        <span class="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-2xl border-2 border-dashed border-emerald-400 font-black text-xl">${sentText}</span>
                        <button id="speakExampleBtn" type="button" class="mt-2 px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-full font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-300">
                            <i class="fas fa-volume-up"></i> ${isEng ? 'Listen Sentence' : 'Ouvir Frase'}
                        </button>
                    </div>
                `;
            } else if (item.type === 'opposite') {
                const targetWord = item.target || solved;
                exampleHtml = `
                    <div class="text-xl md:text-2xl font-bold text-slate-800 flex flex-col items-center justify-center gap-2 my-6">
                        <span>Opposite of "${item.word}":</span>
                        <span class="bg-purple-100 text-purple-700 px-4 py-2 rounded-2xl border-2 border-dashed border-purple-400 font-black text-2xl">${targetWord}</span>
                        <button id="speakExampleBtn" type="button" class="mt-2 px-3 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-full font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-purple-300">
                            <i class="fas fa-volume-up"></i> Listen Example
                        </button>
                    </div>
                `;
            } else if (item.type === 'word') {
                exampleHtml = `
                    <div class="text-xl md:text-2xl font-bold text-slate-800 flex flex-col items-center justify-center gap-2 my-6">
                        <span>${isEng ? 'Target word:' : 'Palavra modelo:'}</span>
                        <div class="flex items-center gap-2">
                            ${(item.parts || [item.word]).map(p => `<span class="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-xl font-black text-xl border-2 border-dashed border-emerald-400">${p}</span>`).join('')}
                        </div>
                        <button id="speakExampleBtn" type="button" class="mt-2 px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-full font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-300">
                            <i class="fas fa-volume-up"></i> ${isEng ? 'Listen Word' : 'Ouvir Palavra'}
                        </button>
                    </div>
                `;
            } else if (item.type === 'syllable') {
                exampleHtml = `
                    <div class="text-xl md:text-2xl font-bold text-slate-800 flex flex-col items-center justify-center gap-2 my-6">
                        <span>Sílaba modelo:</span>
                        <span class="bg-blue-100 text-blue-700 px-6 py-3 rounded-2xl border-2 border-dashed border-blue-400 font-black text-4xl">${item.syllable}</span>
                        <button id="speakExampleBtn" type="button" class="mt-2 px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-full font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-300">
                            <i class="fas fa-volume-up"></i> Ouvir Sílaba
                        </button>
                    </div>
                `;
            } else if (item.type === 'trace') {
                const charVal = item.char || 'A';
                exampleHtml = `
                    <div class="text-xl md:text-2xl font-bold text-slate-800 flex flex-col items-center justify-center gap-2 my-6">
                        <span>${isEng ? 'Letter model:' : 'Letra modelo:'}</span>
                        <span class="bg-blue-100 text-blue-700 px-8 py-4 rounded-3xl border-2 border-dashed border-blue-400 font-serif font-black text-6xl">${charVal}</span>
                        <button id="speakExampleBtn" type="button" class="mt-2 px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-full font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-blue-300">
                            <i class="fas fa-volume-up"></i> ${isEng ? 'Listen Letter' : 'Ouvir Letra'}
                        </button>
                    </div>
                `;
            } else {
                exampleHtml = `
                    <div class="text-2xl font-bold text-slate-700 my-6 text-center">
                        ${isEng ? 'Observe the pattern carefully before answering!' : 'Veja com atenção o padrão antes de responder!'}
                    </div>
                `;
            }

            modal.innerHTML = `
                <div class="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl text-center border border-slate-200/90 relative modal-enter">
                    <div class="flex items-center justify-center gap-3 mb-3">
                        <div class="w-12 h-12 rounded-full p-0.5 bg-gradient-to-tr ${MascotEngine.getCurrent().ringGradient} shadow-sm flex-shrink-0">
                            <img src="${MascotEngine.getCurrent().avatar}" alt="${MascotEngine.getCurrent().name}" class="w-full h-full rounded-full object-cover border-2 border-white shadow-inner">
                        </div>
                        <div class="text-left">
                            <span class="inline-block bg-blue-600 text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full mb-0.5">${isEng ? 'Guided Example' : 'Exemplo Guiado'}</span>
                            <h3 class="text-base font-bold text-slate-900">${isEng ? `${MascotEngine.getCurrent().name} shows the model:` : `${MascotEngine.getCurrent().name} mostra o modelo:`}</h3>
                        </div>
                    </div>
                    <p class="text-xs text-slate-500 mt-1">${level ? level.instruction : (isEng ? 'Observe the solved model before starting:' : 'Observe o modelo resolvido antes de começar:')}</p>
                    
                    ${exampleHtml}

                    <button id="dismissExampleBtn" class="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer">
                        <i class="fas fa-play text-sm"></i> ${isEng ? 'Start Practice' : 'Começar Exercícios'}
                    </button>
                </div>
            `;

            modal.style.display = 'flex';

            const exampleSpeakBtn = document.getElementById('speakExampleBtn');
            if (exampleSpeakBtn) {
                exampleSpeakBtn.addEventListener('click', () => {
                    const lang = isEng ? 'en-US' : 'pt-BR';
                    let toSpeak = '';
                    if (item.type === 'trace') {
                        toSpeak = isEng ? `Letter ${item.char || 'A'}` : (LETRAS_FONETICAS_PT[item.char || 'A'] || `Letra ${item.char || 'A'}`);
                    } else if (item.type === 'opposite') {
                        toSpeak = `${item.word}. Opposite: ${item.target || solved}`;
                    } else if (item.type === 'sentence') {
                        toSpeak = item.sentence || solved;
                    } else {
                        toSpeak = item.word || item.syllable || item.char || solved || '';
                    }
                    speakWord(toSpeak, lang, 1.15, 0.90, exampleSpeakBtn);
                });
            }

            const btn = document.getElementById('dismissExampleBtn');
            if (btn) {
                btn.addEventListener('click', () => {
                    sound.init();
                    sound.playSuccess();
                    Session.workedExampleDismissed = true;
                    modal.style.display = 'none';
                    this.renderCurrentQuestion();
                });
            }
        },

        // Renderizador: MATEMÁTICA
        renderMathCard(item, container) {
            const calcRes = item.result !== undefined ? item.result : (item.operator === '+' ? item.operand1 + item.operand2 : item.operator === '-' ? item.operand1 - item.operand2 : item.operator === '×' || item.operator === '*' ? item.operand1 * item.operand2 : (item.operand2 !== 0 ? Math.floor(item.operand1 / item.operand2) : 0));
            let formulaHtml = '';
            if (item.missingPos === 'op1') {
                formulaHtml = `
                    <div id="activeAnswerBox" class="w-20 md:w-28 h-18 md:h-22 bg-blue-50 border-4 border-blue-400 rounded-2xl flex items-center justify-center text-blue-700 font-black shadow-inner text-4xl md:text-5xl answer-box-focused">
                        <span class="text-blue-300 font-light text-2xl">?</span>
                    </div>
                    <span class="text-blue-600 font-bold">${item.operator}</span>
                    <span class="text-slate-900">${item.operand2}</span>
                    <span class="text-slate-400">=</span>
                    <span class="text-slate-900">${calcRes}</span>
                `;
            } else if (item.missingPos === 'op2') {
                formulaHtml = `
                    <span class="text-slate-900">${item.operand1}</span>
                    <span class="text-blue-600 font-bold">${item.operator}</span>
                    <div id="activeAnswerBox" class="w-20 md:w-28 h-18 md:h-22 bg-blue-50 border-4 border-blue-400 rounded-2xl flex items-center justify-center text-blue-700 font-black shadow-inner text-4xl md:text-5xl answer-box-focused">
                        <span class="text-blue-300 font-light text-2xl">?</span>
                    </div>
                    <span class="text-slate-400">=</span>
                    <span class="text-slate-900">${calcRes}</span>
                `;
            } else {
                formulaHtml = `
                    <span class="text-slate-900">${item.operand1}</span>
                    <span class="text-blue-600 font-bold">${item.operator}</span>
                    <span class="text-slate-900">${item.operand2}</span>
                    <span class="text-slate-400">=</span>
                    <div id="activeAnswerBox" class="w-24 md:w-32 h-20 md:h-24 bg-blue-50 border-4 border-blue-400 rounded-2xl flex items-center justify-center text-blue-700 font-black shadow-inner text-4xl md:text-5xl answer-box-focused">
                        <span class="text-blue-300 font-light text-2xl">?</span>
                    </div>
                `;
            }

            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-4">
                    <div class="text-4xl sm:text-5xl md:text-7xl font-black text-slate-800 flex items-center justify-center gap-3 sm:gap-4 select-none tracking-wider flex-wrap">
                        ${formulaHtml}
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
                    <div class="w-10 h-10 md:w-12 md:h-12 rounded-full shadow-md transform hover:scale-110 transition-transform" style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);border:2.5px solid #92400e;box-shadow:0 3px 6px rgba(180,83,9,0.3);"></div>
                `;
            }

            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-2">
                    <div class="text-sm font-bold text-slate-700 mb-3">Conte quantas bolinhas amarelas há no quadro:</div>
                    <div class="rounded-2xl p-5 flex flex-wrap items-center justify-center gap-3 max-w-sm shadow-inner min-h-[120px]" style="background-color:#ffffff;border:2px solid #cbd5e1;box-shadow:inset 0 2px 4px rgba(0,0,0,0.06);">
                        ${circlesHtml}
                    </div>
                    <div class="mt-4 flex items-center gap-3">
                        <span class="text-xl font-bold text-slate-600">Total:</span>
                        <div id="activeAnswerBox" class="w-20 h-16 bg-blue-50 border-4 border-blue-400 rounded-2xl flex items-center justify-center text-blue-700 font-black shadow-inner text-3xl answer-box-focused">
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
                        <div id="activeAnswerBox" class="w-20 h-16 bg-blue-50 border-4 border-blue-400 rounded-2xl flex items-center justify-center text-blue-700 font-black shadow-inner text-3xl answer-box-focused">
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
                        <div id="activeAnswerBox" class="w-20 h-20 bg-blue-50 border-4 border-dashed border-blue-400 rounded-2xl flex items-center justify-center text-4xl font-black text-blue-600 shadow-inner answer-box-focused">
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
                    if (Session.isTransitionLocked) return;
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
                        <div id="activeAnswerBox" class="w-20 h-20 bg-blue-50 border-4 border-dashed border-blue-400 rounded-2xl flex items-center justify-center text-3xl font-black text-blue-600 shadow-inner answer-box-focused">
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
            const isEng = Session.subjectKey === 'ingles';
            const lang = isEng ? 'en-US' : 'pt-BR';
            const spokenChar = isEng ? `Letter ${char}` : (LETRAS_FONETICAS_PT[char] || `Letra ${char}`);

            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-2">
                    <div class="flex items-center gap-3 mb-2">
                        <span class="text-sm font-bold text-slate-600">${isEng ? 'Trace the letter with your finger or stylus:' : 'Trace a letra com o dedo ou caneta stylus:'}</span>
                        <button id="speakTraceBtn" class="btn-speech-hero btn-speech-blue" style="padding: 0.5rem 1.25rem; font-size: 0.875rem;">
                            <i class="fas fa-volume-high text-blue-200"></i>
                            <span>${isEng ? 'Listen Letter' : 'Ouvir Letra'}</span>
                            <span class="btn-speech-badge"><i class="fas fa-redo-alt text-[9px]"></i>${isEng ? 'Repeat' : 'Repetir'}</span>
                        </button>
                    </div>

                    <!-- Área de Traçado com Letra Guia de Fundo e Pautas -->
                    <div class="relative bg-white rounded-3xl shadow-inner flex items-center justify-center overflow-hidden my-3" style="width: 280px; height: 280px; max-width: 90vw; border: 4px dashed #3b82f6; box-shadow: inset 0 2px 6px rgba(0,0,0,0.06);">
                        <!-- Pautas caligráficas pontilhadas de referência -->
                        <div style="position: absolute; left: 16px; right: 16px; top: 25%; border-bottom: 1.5px dashed #cbd5e1; pointer-events: none;"></div>
                        <div style="position: absolute; left: 16px; right: 16px; top: 50%; border-bottom: 2px dashed #93c5fd; pointer-events: none;"></div>
                        <div style="position: absolute; left: 16px; right: 16px; top: 75%; border-bottom: 1.5px dashed #cbd5e1; pointer-events: none;"></div>

                        <!-- Letra de modelo visível com alto contraste -->
                        <span class="select-none pointer-events-none" style="position: absolute; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 150px; font-weight: 900; color: #93c5fd; opacity: 0.85; line-height: 1; user-select: none;">
                            ${char}
                        </span>

                        <!-- Canvas transparente para captura do traço -->
                        <canvas id="traceCanvas" class="cursor-crosshair z-10 touch-none" style="position: absolute; inset: 0; width: 100%; height: 100%;"></canvas>
                    </div>

                    <div class="flex items-center gap-4 mt-3">
                        <button id="clearTraceBtn" class="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-2xl font-bold text-sm flex items-center gap-2 transition-colors active:scale-95 shadow-sm">
                            <i class="fas fa-eraser text-slate-500"></i> ${isEng ? 'Clear' : 'Limpar'}
                        </button>
                        <button id="confirmTraceBtn" class="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-black text-sm flex items-center gap-2 shadow-md active:scale-95 transition-all">
                            <i class="fas fa-check"></i> ${isEng ? 'Done! Next' : 'Pronto! Próxima'}
                        </button>
                    </div>
                </div>
            `;

            const speakBtn = document.getElementById('speakTraceBtn');
            if (speakBtn) {
                speakBtn.addEventListener('click', () => {
                    speakWord(spokenChar, lang, 1.04, 0.84, speakBtn);
                });
                scheduleCardSpeech(() => speakWord(spokenChar, lang, 1.04, 0.84, speakBtn), 400);
            }

            this.setupTraceCanvas();

            const clearBtn = document.getElementById('clearTraceBtn');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    if (Session.activeCanvas && Session.activeCanvas.getContext) {
                        const ctx = Session.activeCanvas.getContext('2d');
                        if (ctx && ctx.clearRect) {
                            ctx.clearRect(0, 0, Session.activeCanvas.width, Session.activeCanvas.height);
                        }
                    }
                });
            }

            const confirmBtn = document.getElementById('confirmTraceBtn');
            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    if (Session.isTransitionLocked) return;
                    this.registerSuccess();
                });
            }
        },

        cleanupTraceCanvas() {
            if (this._traceEndDrawHandler) {
                window.removeEventListener('mouseup', this._traceEndDrawHandler);
                window.removeEventListener('touchend', this._traceEndDrawHandler);
                this._traceEndDrawHandler = null;
            }
            Session.activeCanvas = null;
        },

        setupTraceCanvas() {
            this.cleanupTraceCanvas();
            const canvas = document.getElementById('traceCanvas');
            if (!canvas) return;
            Session.activeCanvas = canvas;
            const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { width: 400, height: 300, left: 0, top: 0 };
            canvas.width = rect.width || 400;
            canvas.height = rect.height || 300;

            const ctx = canvas.getContext ? canvas.getContext('2d') : null;
            if (ctx) {
                ctx.strokeStyle = '#2563eb'; // azul vivo
                ctx.lineWidth = 14;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
            }

            let drawing = false;

            const startDraw = (e) => {
                if (e && e.preventDefault) e.preventDefault();
                drawing = true;
                if (!ctx) return;
                const clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : (e.clientX || 0);
                const clientY = (e.touches && e.touches[0]) ? e.touches[0].clientY : (e.clientY || 0);
                const cRect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
                ctx.beginPath();
                ctx.moveTo(clientX - (cRect.left || 0), clientY - (cRect.top || 0));
            };

            const moveDraw = (e) => {
                if (!drawing || !ctx) return;
                if (e && e.preventDefault) e.preventDefault();
                const clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : (e.clientX || 0);
                const clientY = (e.touches && e.touches[0]) ? e.touches[0].clientY : (e.clientY || 0);
                const cRect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
                ctx.lineTo(clientX - (cRect.left || 0), clientY - (cRect.top || 0));
                ctx.stroke();
            };

            const endDraw = (e) => {
                if (e && e.cancelable && e.preventDefault) e.preventDefault();
                drawing = false;
            };

            this._traceEndDrawHandler = endDraw;

            canvas.addEventListener('mousedown', startDraw);
            canvas.addEventListener('mousemove', moveDraw);
            window.addEventListener('mouseup', endDraw);

            canvas.addEventListener('touchstart', startDraw, { passive: false });
            canvas.addEventListener('touchmove', moveDraw, { passive: false });
            window.addEventListener('touchend', endDraw, { passive: false });
        },

        // Renderizador: MONTAGEM DE PALAVRAS COM CHIPS (Português P3/P4, Inglês I2/I3/I4/I5)
        renderWordCard(item, container) {
            const word = item.word;
            const parts = item.parts || [word];
            const isEng = Session.subjectKey === 'ingles';
            const lang = isEng ? 'en-US' : 'pt-BR';

            // Embaralha as partes e inclui 1 distrator leve apropriado ao idioma
            const isSingleLetterParts = parts.every(p => p.length === 1);
            let distractors;
            if (isEng) {
                distractors = isSingleLetterParts
                    ? ['S', 'M', 'T', 'R', 'P', 'B', 'N', 'D', 'L', 'F']
                    : ['AT', 'IN', 'OP', 'ED', 'ER', 'EN', 'IT', 'AN', 'UN'];
            } else {
                distractors = ['CA', 'ME', 'PO', 'TO', 'RE', 'SO', 'IN', 'UP'];
            }
            const distractor = distractors.find(d => !parts.includes(d)) || (isEng ? 'S' : 'PA');
            const allChips = [...parts, distractor].sort(() => Math.random() - 0.5);

            const instructionText = isEng 
                ? (isSingleLetterParts ? 'Tap the letters in order to build the word:' : 'Tap the parts in order to build the word:')
                : 'Toque nas sílabas na ordem para formar a palavra:';
            const listenBtnText = isEng ? 'Listen Word' : 'Ouvir Palavra';
            const placeholderText = isEng ? 'Tap the blocks below...' : 'Toque nas sílabas abaixo...';
            const resetBtnText = isEng ? 'Reset word' : 'Recomeçar palavra';

            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-2">
                    <!-- Botão Hero de Audição & Repetição Ilimitada -->
                    <div class="flex flex-col items-center gap-2 mb-3">
                        <button id="speakWordBtn" class="btn-speech-hero btn-speech-emerald">
                            <i class="fas fa-volume-high text-xl"></i>
                            <span>${listenBtnText}</span>
                            <span class="btn-speech-badge"><i class="fas fa-redo-alt text-[10px]"></i>${isEng ? 'Repeat' : 'Repetir'}</span>
                        </button>
                        <span class="text-xs md:text-sm font-bold text-slate-500">${instructionText}</span>
                    </div>

                    <!-- Contexto da Palavra Alvo com Alto Contraste -->
                    <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-950 font-bold text-sm mb-4 shadow-sm">
                        <span class="text-emerald-700 text-xs font-semibold">${isEng ? 'Target Word:' : 'Palavra Alvo:'}</span>
                        <span class="text-emerald-950 font-black tracking-widest text-base uppercase">${word}</span>
                    </div>

                    <!-- Palavra sendo montada -->
                    <div id="wordTargetSlots" class="min-w-[220px] h-20 bg-white border-2 border-dashed border-emerald-500 rounded-2xl flex items-center justify-center gap-2 px-4 shadow-inner mb-5">
                        <span class="text-slate-500 text-sm font-semibold">${placeholderText}</span>
                    </div>

                    <!-- Sílabas disponíveis como botões táteis -->
                    <div id="syllableChipsWrapper" class="flex flex-wrap items-center justify-center gap-3 max-w-md">
                        ${allChips.map(chip => `
                            <button class="syllable-chip px-6 py-4 bg-white border-2 border-emerald-500 hover:bg-emerald-50 text-emerald-800 text-2xl font-black rounded-2xl shadow-md active:scale-95 transition-transform cursor-pointer" data-syllable="${chip}">
                                ${chip}
                            </button>
                        `).join('')}
                    </div>

                    <div class="flex items-center gap-3 mt-4">
                        <button id="resetWordChipsBtn" class="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors cursor-pointer">
                            <i class="fas fa-undo mr-1"></i> ${resetBtnText}
                        </button>
                    </div>
                </div>
            `;

            const speakBtn = document.getElementById('speakWordBtn');
            if (speakBtn) {
                speakBtn.addEventListener('click', () => speakWord(word, lang, 1.04, 0.84, speakBtn));
                // Pronúncia automática ao carregar o card
                scheduleCardSpeech(() => speakWord(word, lang, 1.04, 0.84, speakBtn), 400);
            }

            let assembled = [];
            const slotsContainer = document.getElementById('wordTargetSlots');
            const chipsWrapper = document.getElementById('syllableChipsWrapper');

            const updateSlots = () => {
                if (assembled.length === 0) {
                    slotsContainer.innerHTML = `<span class="text-slate-500 text-sm font-semibold">${placeholderText}</span>`;
                } else {
                    slotsContainer.innerHTML = assembled.map(s => `
                        <div class="px-4 py-2 rounded-xl font-black text-2xl shadow" style="background-color:#059669;color:#ffffff;">
                            ${s}
                        </div>
                    `).join('');
                }
            };

            chipsWrapper.querySelectorAll('.syllable-chip').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (Session.isTransitionLocked) return;
                    sound.init();
                    sound.playClick();
                    const syl = btn.getAttribute('data-syllable');
                    speakWord(syl, lang, 1.04, 0.84);
                    assembled.push(syl);
                    btn.classList.add('opacity-40', 'pointer-events-none');
                    updateSlots();

                    // Se juntou as sílabas necessárias
                    if (assembled.length === parts.length) {
                        const built = assembled.join('');
                        if (built === word || built === parts.join('')) {
                            speakWord(word, lang, 1.04, 0.84);
                            this.registerSuccess();
                        } else {
                            sound.playWrong();
                            this.shakeCard();
                            setTimeout(() => {
                                assembled = [];
                                updateSlots();
                                chipsWrapper.querySelectorAll('.syllable-chip').forEach(b => {
                                    b.classList.remove('opacity-40', 'pointer-events-none');
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
                        b.classList.remove('opacity-40', 'pointer-events-none');
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
                <div class="flex flex-col items-center justify-center py-3">
                    <div class="flex flex-col items-center gap-2 mb-4">
                        <button id="speakSyllableBtn" class="btn-speech-hero btn-speech-blue">
                            <i class="fas fa-volume-high text-xl"></i>
                            <span>Ouvir Sílaba</span>
                            <span class="btn-speech-badge"><i class="fas fa-redo-alt text-[10px]"></i>Repetir</span>
                        </button>
                        <span class="text-xs md:text-sm font-bold text-slate-500">Ouça o som e toque na sílaba correspondente:</span>
                    </div>

                    <!-- Bloco Sonoro Central de Treino Auditivo -->
                    <div class="w-32 h-28 bg-blue-50 border-2 border-dashed border-blue-400 rounded-3xl shadow-inner flex flex-col items-center justify-center gap-1 mb-6 text-blue-600">
                        <i class="fas fa-headphones text-3xl"></i>
                        <span class="text-xs font-black tracking-wider uppercase text-blue-500">Qual o som?</span>
                    </div>

                    <div class="grid grid-cols-2 gap-4 w-full max-w-xs">
                        ${options.map(opt => `
                            <button class="syl-choice-btn py-4 bg-white border-2 border-blue-500 hover:bg-blue-50 text-blue-800 rounded-2xl text-3xl font-black shadow-md active:scale-95 transition-transform cursor-pointer" data-syl="${opt}">
                                ${opt}
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;

            const speakBtn = document.getElementById('speakSyllableBtn');
            if (speakBtn) {
                speakBtn.addEventListener('click', () => speakWord(targetSyl, 'pt-BR', 1.04, 0.84, speakBtn));
                scheduleCardSpeech(() => speakWord(targetSyl, 'pt-BR', 1.04, 0.84, speakBtn), 300);
            }

            container.querySelectorAll('.syl-choice-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (Session.isTransitionLocked) return;
                    const chosen = btn.getAttribute('data-syl');
                    speakWord(chosen, 'pt-BR', 1.04, 0.84);
                    if (chosen === targetSyl) {
                        this.registerSuccess();
                    } else {
                        sound.playWrong();
                        this.shakeCard();
                    }
                });
            });
        },

        // Renderizador: FRAÇÕES (Matemática M10)
        renderFractionCard(item, container) {
            const num = item.numerator;
            const den = item.denominator;
            const correctFraction = `${num}/${den}`;

            let segmentsHtml = '';
            for (let i = 0; i < den; i++) {
                const isFilled = i < num;
                segmentsHtml += `
                    <div class="flex-1 h-14 md:h-16 rounded-xl transition-all duration-300 ${isFilled ? 'bg-gradient-to-tr from-blue-500 to-indigo-600 shadow-md border-2 border-blue-400' : 'bg-slate-100 border-2 border-dashed border-slate-300'} flex items-center justify-center">
                        ${isFilled ? '<i class="fas fa-check text-white text-xs md:text-sm"></i>' : ''}
                    </div>
                `;
            }

            const distractors = [];
            for (let d = 1; d < den; d++) {
                if (d !== num) distractors.push(`${d}/${den}`);
            }
            if (distractors.length < 2) {
                distractors.push(`${num}/${den + 1}`);
                if (den > 2) distractors.push(`${num}/${den - 1}`);
                else distractors.push(`${num + 1}/${den + 1}`);
            }
            const chosenDistractors = distractors.sort(() => Math.random() - 0.5).slice(0, 2);
            const options = [correctFraction, ...chosenDistractors].sort(() => Math.random() - 0.5);

            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-3">
                    <div class="text-sm font-bold text-slate-600 mb-4">Qual fração representa as partes em azul?</div>
                    
                    <div class="w-full max-w-sm flex items-center gap-1.5 p-3 bg-white border-2 border-slate-200 rounded-2xl shadow-inner mb-6">
                        ${segmentsHtml}
                    </div>
                    <div class="text-xs font-semibold text-slate-400 mb-4">
                        ${num} de ${den} partes pintadas
                    </div>

                    <div class="grid grid-cols-3 gap-3 w-full max-w-xs">
                        ${options.map(opt => {
                            const [top, bottom] = opt.split('/');
                            return `
                                <button class="fraction-choice-btn py-3 px-2 bg-white border-2 border-blue-400 hover:bg-blue-50 text-blue-900 rounded-2xl shadow-md active:scale-95 transition-transform flex flex-col items-center justify-center font-black cursor-pointer" data-frac="${opt}">
                                    <span class="text-xl md:text-2xl border-b-2 border-blue-800 w-8 text-center pb-0.5 leading-none">${top}</span>
                                    <span class="text-xl md:text-2xl pt-1 leading-none">${bottom}</span>
                                </button>
                            `;
                        }).join('')}
                    </div>
                    <div id="cardFeedbackMsg" class="h-6 mt-3 text-xs font-bold text-slate-400">Toque na fração correta</div>
                </div>
            `;

            container.querySelectorAll('.fraction-choice-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (Session.isTransitionLocked) return;
                    const chosen = btn.getAttribute('data-frac');
                    if (chosen === correctFraction) {
                        this.registerSuccess();
                    } else {
                        sound.playWrong();
                        this.shakeCard();
                    }
                });
            });
        },

        // Renderizador: RIMAS (Português P7)
        renderRhymeCard(item, container) {
            const baseWord = item.word;
            const targetWord = item.target;
            const options = (item.options || [targetWord]).slice().sort(() => Math.random() - 0.5);

            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-2">
                    <div class="flex flex-col items-center gap-2 mb-3">
                        <button id="speakRhymeBtn" class="btn-speech-hero btn-speech-indigo">
                            <i class="fas fa-volume-high text-xl"></i>
                            <span>Ouvir Palavra</span>
                            <span class="btn-speech-badge"><i class="fas fa-redo-alt text-[10px]"></i>Repetir</span>
                        </button>
                        <span class="text-xs md:text-sm font-bold text-slate-500">Qual palavra rima com:</span>
                    </div>

                    <div class="text-3xl md:text-4xl font-black text-indigo-900 bg-indigo-50 border-2 border-indigo-300 px-8 py-4 rounded-3xl shadow-inner mb-6 tracking-wide">
                        ${baseWord}
                    </div>

                    <div class="flex flex-col gap-3 w-full max-w-xs">
                        ${options.map(opt => `
                            <button class="rhyme-choice-btn py-3.5 px-4 bg-white border-2 border-indigo-400 hover:bg-indigo-50 text-indigo-900 rounded-2xl text-lg md:text-xl font-black shadow-md active:scale-95 transition-transform text-center cursor-pointer" data-word="${opt}">
                                ${opt}
                            </button>
                        `).join('')}
                    </div>
                    <div id="cardFeedbackMsg" class="h-6 mt-3 text-xs font-bold text-slate-400">Toque na palavra que rima</div>
                </div>
            `;

            const speakBtn = document.getElementById('speakRhymeBtn');
            if (speakBtn) {
                speakBtn.addEventListener('click', () => speakWord(baseWord, 'pt-BR', 1.04, 0.84, speakBtn));
                scheduleCardSpeech(() => speakWord(baseWord, 'pt-BR', 1.04, 0.84, speakBtn), 300);
            }

            container.querySelectorAll('.rhyme-choice-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (Session.isTransitionLocked) return;
                    const chosen = btn.getAttribute('data-word');
                    speakWord(chosen, 'pt-BR', 1.04, 0.84);
                    if (chosen === targetWord) {
                        this.registerSuccess();
                    } else {
                        sound.playWrong();
                        this.shakeCard();
                    }
                });
            });
        },

        // Renderizador: CONSTRUÇÃO DE FRASES (Português P8, Inglês I6)
        renderSentenceCard(item, container) {
            const sentence = item.sentence;
            const parts = item.parts || sentence.split(' ');
            const isEng = Session.subjectKey === 'ingles';
            const lang = isEng ? 'en-US' : 'pt-BR';
            const scrambled = parts.slice().sort(() => Math.random() - 0.5);

            const instructionText = isEng ? 'Tap the parts to build the sentence:' : 'Toque nas partes para montar a frase:';
            const listenBtnText = isEng ? 'Listen Sentence' : 'Ouvir Frase';
            const placeholderText = isEng ? 'Tap the blocks below...' : 'Toque nos blocos abaixo...';
            const resetBtnText = isEng ? 'Reset sentence' : 'Recomeçar frase';

            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-2">
                    <div class="flex flex-col items-center gap-2 mb-3">
                        <button id="speakSentenceBtn" class="btn-speech-hero btn-speech-emerald">
                            <i class="fas fa-volume-high text-xl"></i>
                            <span>${listenBtnText}</span>
                            <span class="btn-speech-badge"><i class="fas fa-redo-alt text-[10px]"></i>${isEng ? 'Repeat' : 'Repetir'}</span>
                        </button>
                        <span class="text-xs md:text-sm font-bold text-slate-500">${instructionText}</span>
                    </div>

                    <!-- Contexto da Frase Modelo com Alto Contraste -->
                    <div class="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-100/90 border border-emerald-300 text-emerald-950 font-bold text-sm md:text-base mb-3 shadow-sm max-w-md text-center">
                        <span class="text-emerald-700 font-medium whitespace-nowrap">${isEng ? 'Target Sentence:' : 'Frase Modelo:'}</span>
                        <span class="text-emerald-950 font-black tracking-wide">${sentence}</span>
                    </div>

                    <div id="sentenceTargetSlots" class="w-full max-w-md min-h-[70px] bg-white border-2 border-dashed border-emerald-500 rounded-2xl flex flex-wrap items-center justify-center gap-2 p-3 shadow-inner mb-5">
                        <span class="text-slate-500 text-xs md:text-sm font-semibold">${placeholderText}</span>
                    </div>

                    <div id="sentenceChipsWrapper" class="flex flex-wrap items-center justify-center gap-2.5 max-w-md">
                        ${scrambled.map((chip, idx) => `
                            <button class="sentence-chip px-4 py-3 bg-white border-2 border-emerald-500 hover:bg-emerald-50 text-emerald-900 text-base md:text-lg font-black rounded-2xl shadow-md active:scale-95 transition-transform cursor-pointer" data-chip="${chip}" data-idx="${idx}">
                                ${chip}
                            </button>
                        `).join('')}
                    </div>

                    <div class="flex items-center gap-3 mt-4">
                        <button id="resetSentenceChipsBtn" class="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors cursor-pointer">
                            <i class="fas fa-undo mr-1"></i> ${resetBtnText}
                        </button>
                    </div>
                </div>
            `;

            const speakBtn = document.getElementById('speakSentenceBtn');
            if (speakBtn) {
                speakBtn.addEventListener('click', () => speakWord(sentence, lang, 1.04, 0.86, speakBtn));
                scheduleCardSpeech(() => speakWord(sentence, lang, 1.04, 0.86, speakBtn), 400);
            }

            let assembled = [];
            const slotsContainer = document.getElementById('sentenceTargetSlots');
            const chipsWrapper = document.getElementById('sentenceChipsWrapper');

            const updateSlots = () => {
                if (assembled.length === 0) {
                    slotsContainer.innerHTML = `<span class="text-slate-500 text-xs md:text-sm font-semibold">${placeholderText}</span>`;
                } else {
                    slotsContainer.innerHTML = assembled.map(s => `
                        <div class="px-3 py-1.5 rounded-xl font-black text-sm md:text-base shadow" style="background-color:#059669;color:#ffffff;">
                            ${s}
                        </div>
                    `).join('');
                }
            };

            chipsWrapper.querySelectorAll('.sentence-chip').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (Session.isTransitionLocked) return;
                    sound.init();
                    sound.playClick();
                    const chipVal = btn.getAttribute('data-chip');
                    speakWord(chipVal, lang, 1.04, 0.84);
                    assembled.push(chipVal);
                    btn.classList.add('opacity-40', 'pointer-events-none');
                    updateSlots();

                    if (assembled.length === parts.length) {
                        const builtStr = assembled.join(' ');
                        const targetStr = parts.join(' ');
                        if (builtStr === targetStr || builtStr === sentence) {
                            speakWord(sentence, lang, 1.04, 0.86);
                            this.registerSuccess();
                        } else {
                            sound.playWrong();
                            this.shakeCard();
                            setTimeout(() => {
                                assembled = [];
                                updateSlots();
                                chipsWrapper.querySelectorAll('.sentence-chip').forEach(b => {
                                    b.classList.remove('opacity-40', 'pointer-events-none');
                                });
                            }, 700);
                        }
                    }
                });
            });

            const resetBtn = document.getElementById('resetSentenceChipsBtn');
            if (resetBtn) {
                resetBtn.addEventListener('click', () => {
                    assembled = [];
                    updateSlots();
                    chipsWrapper.querySelectorAll('.sentence-chip').forEach(b => {
                        b.classList.remove('opacity-40', 'pointer-events-none');
                    });
                });
            }
        },

        // Renderizador: OPOSTOS EM INGLÊS (Inglês I7)
        renderOppositeCard(item, container) {
            const word = item.word;
            const target = item.target;
            const icon = item.icon || '↔️';
            const options = (item.options || [target]).slice().sort(() => Math.random() - 0.5);

            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-2">
                    <div class="flex flex-col items-center gap-2 mb-3">
                        <button id="speakOppositeBtn" class="btn-speech-hero btn-speech-purple">
                            <i class="fas fa-volume-high text-xl"></i>
                            <span>Listen Word</span>
                            <span class="btn-speech-badge"><i class="fas fa-redo-alt text-[10px]"></i>Repeat</span>
                        </button>
                        <span class="text-xs md:text-sm font-bold text-slate-500">What is the opposite of:</span>
                    </div>

                    <div class="flex items-center gap-3 bg-purple-50 border-2 border-purple-300 px-8 py-4 rounded-3xl shadow-inner mb-6">
                        <span class="text-2xl">${icon}</span>
                        <span class="text-3xl md:text-4xl font-black text-purple-900 tracking-wider">${word}</span>
                    </div>

                    <div class="flex flex-col gap-3 w-full max-w-xs">
                        ${options.map(opt => `
                            <button class="opposite-choice-btn py-3.5 px-4 bg-white border-2 border-purple-400 hover:bg-purple-50 text-purple-900 rounded-2xl text-lg md:text-xl font-black shadow-md active:scale-95 transition-transform text-center cursor-pointer" data-word="${opt}">
                                ${opt}
                            </button>
                        `).join('')}
                    </div>
                    <div id="cardFeedbackMsg" class="h-6 mt-3 text-xs font-bold text-slate-400">Choose the opposite word</div>
                </div>
            `;

            const speakBtn = document.getElementById('speakOppositeBtn');
            if (speakBtn) {
                speakBtn.addEventListener('click', () => speakWord(word, 'en-US', 1.04, 0.84, speakBtn));
                scheduleCardSpeech(() => speakWord(word, 'en-US', 1.04, 0.84, speakBtn), 300);
            }

            container.querySelectorAll('.opposite-choice-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (Session.isTransitionLocked) return;
                    const chosen = btn.getAttribute('data-word');
                    speakWord(chosen, 'en-US', 1.04, 0.84);
                    if (chosen === target) {
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
            if (Session.isTransitionLocked) return;
            const answerBox = document.getElementById('activeAnswerBox');
            if (!answerBox) return;

            if (typeof key !== 'string') {
                if (key === null || key === undefined) key = '';
                else key = String(key);
            }

            if (key === 'backspace') {
                Session.currentInput = (Session.currentInput || '').slice(0, -1);
            } else if (key === 'clear') {
                Session.currentInput = '';
            } else if (key === 'enter') {
                this.validateNumericAnswer();
                return;
            } else if (key >= '0' && key <= '9' && key.length === 1) {
                if ((Session.currentInput || '').length < 4) {
                    Session.currentInput = (Session.currentInput || '') + key;
                }
            }

            if (!Session.currentInput || Session.currentInput === '') {
                answerBox.innerHTML = '<span class="text-blue-300 font-light text-2xl">?</span>';
            } else {
                const safeInput = String(Session.currentInput).replace(/[&<>"']/g, '');
                answerBox.innerHTML = `<span class="text-blue-700 font-black">${safeInput}</span>`;
            }
        },

        validateNumericAnswer() {
            if (Session.isTransitionLocked) return;
            if (!Session.currentInput || typeof Session.currentInput !== 'string' || Session.currentInput.trim() === '') return;
            if (!Session.items || !Session.items[Session.currentIndex]) return;

            const item = Session.items[Session.currentIndex];
            const entered = parseInt(Session.currentInput, 10);
            if (isNaN(entered) || !isFinite(entered)) return;

            let expected = null;
            if (item.type === 'math') {
                if (item.missingPos === 'op1') {
                    expected = item.operand1;
                } else if (item.missingPos === 'op2') {
                    expected = item.operand2;
                } else {
                    if (item.operator === '+') expected = item.operand1 + item.operand2;
                    if (item.operator === '-') expected = item.operand1 - item.operand2;
                    if (item.operator === '×' || item.operator === '*') expected = item.operand1 * item.operand2;
                    if (item.operator === '÷' || item.operator === '/') expected = item.operand2 !== 0 ? Math.floor(item.operand1 / item.operand2) : 0;
                }
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

            if (expected !== null && entered === expected) {
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
            if (Session.isTransitionLocked) return;
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
            if (Session.isTransitionLocked) return;
            Session.isTransitionLocked = true;

            sound.playSuccess();
            this.pulseSuccessCard();

            if (Session.currentAttempts === 0 && !Session.isGauntletPhase && !Session.isGauntlet) {
                Session.roundCorrectFirstAttempt++;
                Gamification.addStars(1);
                Gamification.registerCorrect();
            } else if (Session.isGauntletPhase || Session.isGauntlet) {
                // No modo gauntlet, cada acerto recuperado gera estrela de incentivo
                Gamification.addStars(1);
                Gamification.registerCorrect();
                Session.gauntletItemsSolved++;
            }

            const currentStreak = (Gamification.get && Gamification.get().streak) || 1;
            MascotEngine.onCorrect(currentStreak);
            if (currentStreak >= 3) {
                sound.playStreakChord(currentStreak);
            }

            this.updateGamificationHeader();

            if (Session.transitionTimeout) {
                clearTimeout(Session.transitionTimeout);
            }
            Session.transitionTimeout = setTimeout(() => {
                Session.transitionTimeout = null;
                Session.isTransitionLocked = false;
                Session.currentIndex++;
                if (Session.currentIndex >= Session.items.length) {
                    // Se ainda há pendências na fila do Gauntlet Kumon, inicia a fase de maestria
                    if (Session.missedItemsQueue && Session.missedItemsQueue.length > 0) {
                        this.startGauntletPhase();
                    } else {
                        this.finishRound();
                    }
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
            MascotEngine.onWrong();

            // Adiciona cópia limpa do exercício à fila do Gauntlet Kumon (sem duplicar)
            const currentItem = Session.items[Session.currentIndex];
            if (currentItem) {
                try {
                    const itemClone = JSON.parse(JSON.stringify(currentItem));
                    const itemKey = JSON.stringify(itemClone);
                    const alreadyEnqueued = Session.missedItemsQueue.some(it => JSON.stringify(it) === itemKey);
                    if (!alreadyEnqueued) {
                        Session.missedItemsQueue.push(itemClone);
                    }
                } catch (e) {
                    console.warn('Erro ao enfileirar no Gauntlet Kumon:', e);
                }
            }

            const msg = document.getElementById('cardFeedbackMsg');
            if (msg) {
                msg.innerText = Session.isGauntletPhase ? 'Com calma e concentração você domina!' : 'Quase lá! Tente mais uma vez.';
                msg.classList.remove('text-slate-400');
                msg.classList.add('text-amber-500');
            }

            Session.currentInput = '';
            const answerBox = document.getElementById('activeAnswerBox');
            if (answerBox) {
                answerBox.innerHTML = '<span class="text-blue-300 font-light text-2xl">?</span>';
            }
        },

        // Inicia o Loop de Maestria 100% (Gauntlet Kumon)
        startGauntletPhase() {
            if (Session.transitionTimeout) {
                clearTimeout(Session.transitionTimeout);
                Session.transitionTimeout = null;
            }
            Session.isTransitionLocked = false;
            Session.gauntletCycles++;
            const count = Session.missedItemsQueue.length;
            Session.isGauntletPhase = true;
            Session.isGauntlet = true;
            // A nova lista passa a ser estritamente os exercícios errados
            Session.items = [...Session.missedItemsQueue];
            Session.missedItemsQueue = [];
            Session.currentIndex = 0;
            Session.currentAttempts = 0;
            Session.currentInput = '';

            sound.playGauntletTransition();
            this.showGauntletModal(count);
        },

        // Modal motivador de entrada no Gauntlet
        showGauntletModal(count) {
            const modal = document.getElementById('gauntletModal');
            if (!modal) {
                this.renderCurrentQuestion();
                return;
            }

            const m = MascotEngine.getCurrent();
            const speech = count === 1
                ? 'Falta só 1 exercício para você alcançar a maestria completa de 100%!'
                : `Faltam apenas ${count} exercícios para você alcançar a maestria completa de 100%!`;

            modal.innerHTML = `
                <div class="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl text-center border border-amber-300/80 relative modal-enter max-h-[90vh] overflow-y-auto">
                    <div class="flex items-center justify-center gap-3 mb-2">
                        <div class="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr ${m.ringGradient} shadow-sm flex-shrink-0">
                            <img src="${m.avatar}" alt="${m.name}" class="w-full h-full rounded-full object-cover border-2 border-white shadow-inner">
                        </div>
                        <div class="w-14 h-14 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-2xl shadow-inner flex-shrink-0">
                            <i class="fas fa-shield-alt text-amber-500"></i>
                        </div>
                    </div>
                    <div>
                        <span class="inline-block bg-amber-500/10 text-amber-800 border border-amber-300/60 text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full mb-1">
                            Revisão Final
                        </span>
                        <h3 class="text-xl font-bold text-slate-900 mt-1">Completar a Rodada</h3>
                    </div>
                    
                    <div class="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 my-3 text-left">
                        <div class="text-xs font-bold text-amber-800 flex items-center gap-1.5 mb-1">
                            <i class="fas fa-comment-dots text-amber-600"></i> ${m.name}:
                        </div>
                        <p class="text-xs font-semibold text-amber-900 leading-relaxed">
                            "${speech} Vamos resolver as pendências com calma para concluir!"
                        </p>
                    </div>

                    <p class="text-[11px] text-slate-500 mb-4">
                        Resolva ${count === 1 ? 'o exercício pendente' : 'os exercícios pendentes'} para fechar 100% de acerto.
                    </p>

                    <button id="btnStartGauntletNow" class="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-bold text-base rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 mt-2 mb-1 cursor-pointer">
                        <i class="fas fa-arrow-right text-slate-950"></i> Continuar (${count})
                    </button>
                </div>
            `;

            modal.style.display = 'flex';
            MascotEngine.speak(`${speech} Vamos dominar juntos!`, 3500, true);

            const startBtn = document.getElementById('btnStartGauntletNow');
            if (startBtn) {
                startBtn.onclick = () => {
                    modal.style.display = 'none';
                    this.renderCurrentQuestion();
                };
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
            wakeLock.release();

            if (Session.transitionTimeout) {
                clearTimeout(Session.transitionTimeout);
                Session.transitionTimeout = null;
            }
            Session.isTransitionLocked = false;
            if (typeof this.cleanupTraceCanvas === 'function') {
                this.cleanupTraceCanvas();
            }
            if (Session.timerInterval) clearInterval(Session.timerInterval);
            
            const isGauntletMastered = Session.gauntletCycles > 0;
            if (isGauntletMastered) {
                sound.playMasteryFanfare();
            } else {
                sound.playFanfare();
            }
            launchConfetti();

            const total = Session.initialItemsCount || 10;
            const accuracy = Math.round((Session.roundCorrectFirstAttempt / total) * 100);
            const timeSec = Session.elapsedSeconds;
            const targetSec = Session.targetSctSeconds;

            // Bônus de estrelas se bateu a meta ou teve 100% de precisão de primeira
            let bonusStars = 0;
            if (accuracy === 100) bonusStars += 4;
            else if (isGauntletMastered) bonusStars += 2; // Bônus de resiliência
            if (timeSec <= targetSec) bonusStars += 2;
            if (bonusStars > 0) {
                Gamification.addStars(bonusStars);
            }

            const { newlyUnlocked } = Gamification.registerRoundFinished(accuracy, timeSec, targetSec);
            
            // Se completou pelo Gauntlet, garante desbloqueio do badge 'resiliencia_kumon'
            if (isGauntletMastered) {
                const cur = Gamification.get();
                if (!cur.badges.includes('resiliencia_kumon')) {
                    cur.badges.push('resiliencia_kumon');
                    Gamification.save(cur);
                    if (!newlyUnlocked.includes('resiliencia_kumon')) {
                        newlyUnlocked.push('resiliencia_kumon');
                    }
                }
            }

            // Registra no motor de perfis a maestria do nível
            try {
                if (window.StudentProfileEngine && window.StudentProfileEngine.recordLevelMastery) {
                    window.StudentProfileEngine.recordLevelMastery(
                        Session.subjectKey,
                        Session.levelId,
                        {
                            accuracy: accuracy,
                            timeSec: timeSec,
                            targetSec: targetSec,
                            gauntletCycles: Session.gauntletCycles
                        }
                    );
                }
            } catch (e) {
                console.warn('Erro ao registrar maestria no StudentProfileEngine', e);
            }

            // Registra no histórico analítico e geral do KumonGen (Scoreboard, Evolução e Controle dos Pais)
            try {
                const sub = window.KumonSubjects[Session.subjectKey];
                const level = sub && sub.levels ? sub.levels.find(l => l.id === Session.levelId) : null;
                const suffix = isGauntletMastered ? ' · 100% Maestria' : ' · 100% Perfeição';
                const now = new Date();
                const sessionDetails = {
                    type: 'tablet_round',
                    timestamp: now.toISOString(),
                    timeStr: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                    subjectKey: Session.subjectKey,
                    levelId: Session.levelId,
                    accuracy: accuracy,
                    timeSec: timeSec,
                    targetSec: targetSec,
                    totalItems: total,
                    firstAttemptCorrect: Session.roundCorrectFirstAttempt,
                    isGauntletMastered: isGauntletMastered,
                    starsEarned: bonusStars + total
                };

                if (window.KumonGen && window.KumonGen.saveHistory) {
                    window.KumonGen.saveHistory(
                        sub ? sub.title : 'Matemática',
                        `${level ? level.title : 'Nível'} · Tablet${suffix}`,
                        `${total} exer.`,
                        true,
                        sessionDetails
                    );
                } else if (window.StudentProfileEngine && window.StudentProfileEngine.addActiveHistoryItem) {
                    window.StudentProfileEngine.addActiveHistoryItem(Object.assign({
                        id: 'hist_' + Date.now(),
                        date: now.toLocaleDateString('pt-BR'),
                        subject: sub ? sub.title : 'Matemática',
                        levelTitle: `${level ? level.title : 'Nível'} · Tablet${suffix}`,
                        pages: `${total} exer.`,
                        completed: true
                    }, sessionDetails));
                }
            } catch (e) {
                console.warn('Erro ao integrar histórico analítico com KumonGen', e);
            }

            this.updateGamificationHeader();

            this.showRoundSummaryModal({
                total,
                accuracy,
                isGauntletMastered,
                gauntletCycles: Session.gauntletCycles,
                timeSec,
                targetSec,
                bonusStars,
                newlyUnlocked
            });
        },

        showRoundSummaryModal(res) {
            wakeLock.release();

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

            const headerBadgeText = res.isGauntletMastered
                ? '🎯 Todas Concluídas!'
                : (res.accuracy === 100 ? '🏆 100% de Acerto de Primeira!' : 'Rodada Concluída!');

            modal.innerHTML = `
                <div class="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl text-center border border-slate-200/90 relative modal-enter max-h-[90vh] overflow-y-auto">
                    <div class="flex items-center justify-center gap-3 mb-3">
                        <div class="w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr ${MascotEngine.getCurrent().ringGradient} shadow-sm flex-shrink-0">
                            <img src="${MascotEngine.getCurrent().avatar}" alt="${MascotEngine.getCurrent().name}" class="w-full h-full rounded-full object-cover border-2 border-white shadow-inner">
                        </div>
                        <div class="w-14 h-14 ${res.isGauntletMastered ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'} rounded-full flex items-center justify-center text-2xl shadow-inner flex-shrink-0">
                            <i class="fas ${res.isGauntletMastered ? 'fa-shield-alt text-amber-500' : 'fa-trophy text-amber-500'}"></i>
                        </div>
                    </div>
                    <span class="inline-block ${res.isGauntletMastered ? 'bg-amber-500/15 text-amber-800 border border-amber-300' : 'bg-emerald-500/15 text-emerald-800 border border-emerald-300'} text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-1">
                        ${headerBadgeText}
                    </span>
                    <h3 class="text-xl font-bold text-slate-900">Parabéns, ${(window.escapeHtml ? window.escapeHtml(Session.studentName) : Session.studentName)}!</h3>
                    <p class="text-xs text-slate-500 mt-0.5">${level ? level.title : ''} · ${sub ? sub.title : ''}</p>
                    <div class="${res.isGauntletMastered ? 'bg-amber-50 border border-amber-200 text-amber-900' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'} rounded-xl px-3 py-2 text-xs font-semibold my-2.5">
                        "${res.isGauntletMastered ? 'Parabéns pela persistência! Você concluiu todas as questões!' : MascotEngine.getCurrent().cheerFinish}"
                    </div>

                    <!-- Painel de Métricas -->
                    <div class="grid grid-cols-3 gap-3 my-4">
                        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
                            <span class="text-2xl font-black ${res.isGauntletMastered ? 'text-amber-500' : 'text-blue-600'}">
                                ${res.isGauntletMastered ? '100%' : `${res.accuracy}%`}
                            </span>
                            <span class="block text-[10px] font-bold text-slate-400 uppercase mt-1">
                                ${res.isGauntletMastered ? 'Conclusão' : 'Precisão'}
                            </span>
                            ${res.isGauntletMastered ? `<span class="block text-[9px] text-slate-400">1ª tent: ${res.accuracy}%</span>` : ''}
                        </div>
                        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
                            <span class="text-2xl font-black ${beatSCT ? 'text-emerald-600' : 'text-slate-700'}">${timeFormatted}</span>
                            <span class="block text-[10px] font-bold text-slate-400 uppercase mt-1">Tempo Real</span>
                        </div>
                        <div class="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-center">
                            <span class="text-2xl font-black text-amber-500">+${res.bonusStars + Session.roundCorrectFirstAttempt} ★</span>
                            <span class="block text-[10px] font-bold text-slate-400 uppercase mt-1">Estrelas</span>
                        </div>
                    </div>

                    ${beatSCT ? `
                        <div class="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700 flex items-center justify-center gap-2 mb-3">
                            <i class="fas fa-bolt text-emerald-500"></i> Concluído dentro da meta de tempo sugerida!
                        </div>
                    ` : ''}

                    ${badgesHtml}

                    <!-- Ações Principais -->
                    <div class="flex flex-col gap-3 mt-5">
                        <button id="downloadCertBtn" class="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-bold text-sm rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer">
                            <i class="fas fa-certificate text-base"></i> Baixar Certificado (PDF)
                        </button>

                        <div class="grid grid-cols-2 gap-3">
                            <button id="playAgainBtn" class="py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-95">
                                <i class="fas fa-redo"></i> Jogar Novamente
                            </button>
                            <button id="newTaskSummaryBtn" type="button" class="py-3 font-bold text-sm rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer active:scale-95" style="background: var(--accent); color: #fff;">
                                <i class="fas fa-plus-circle"></i> Nova Tarefa
                            </button>
                        </div>

                        <button id="closeSummaryBtn" type="button" class="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer">
                            <i class="fas fa-times"></i> Fechar
                        </button>
                    </div>
                </div>
            `;

            modal.style.display = 'flex';

            const certBtn = document.getElementById('downloadCertBtn');
            if (certBtn) {
                certBtn.addEventListener('click', () => {
                    generateCertificatePDF({
                        studentName: Session.studentName,
                        subjectTitle: sub ? sub.title : 'Matemática',
                        levelTitle: level ? level.title : 'Nível',
                        levelId: Session.levelId,
                        accuracy: res.accuracy,
                        isGauntletMastered: res.isGauntletMastered,
                        timeFormatted,
                        targetFormatted,
                        starsEarned: res.bonusStars + Session.roundCorrectFirstAttempt
                    });
                });
            }

            const evoBtn = document.getElementById('newTaskSummaryBtn');
            if (evoBtn) {
                evoBtn.addEventListener('click', () => {
                    modal.style.display = 'none';
                    TaskWizard.show();
                });
            }

            const playAgainBtn = document.getElementById('playAgainBtn');
            if (playAgainBtn) {
                playAgainBtn.addEventListener('click', () => {
                    modal.style.display = 'none';
                    this.startRound();
                });
            }

            const closeBtn = document.getElementById('closeSummaryBtn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    modal.style.display = 'none';
                    this.showIdleState();
                });
            }
        },

        // ============================================================
        // 9b. ESTADO IDLE PÓS-TAREFA
        // ============================================================
        showIdleState() {
            const container = document.getElementById('focusCardContainer') || document.getElementById('focusCard');
            const keypad = document.getElementById('keypadWrapper');
            if (keypad) keypad.style.display = 'none';
            if (container) {
                container.innerHTML = `
                    <div class="text-center py-10 px-6">
                        <div class="text-5xl mb-4">✅</div>
                        <h3 class="font-black text-xl text-gray-900 mb-2">Tarefa concluída com sucesso!</h3>
                        <p class="text-sm text-gray-600 mb-6 max-w-sm mx-auto">Escolha o que deseja fazer a seguir:</p>
                        <div class="flex flex-wrap items-center justify-center gap-3 max-w-md mx-auto">
                            <button type="button" id="idleNewTaskBtn" class="px-6 py-3.5 font-bold text-sm rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2" style="background: var(--accent); color: #fff;">
                                <i class="fas fa-plus-circle"></i> Nova Tarefa
                            </button>
                            <a href="index.html" class="px-6 py-3.5 font-bold text-sm rounded-2xl border-2 border-slate-300 bg-white text-slate-700 hover:bg-slate-50 shadow-sm transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2">
                                <i class="fas fa-home"></i> Voltar ao Início
                            </a>
                        </div>
                    </div>
                `;
                const btn = document.getElementById('idleNewTaskBtn');
                if (btn) btn.addEventListener('click', () => TaskWizard.show());
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
                                <p class="text-xs text-slate-500">Aluno(a): <strong>${(window.escapeHtml ? window.escapeHtml(Session.studentName) : Session.studentName)}</strong></p>
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

            modal.style.display = 'flex';
            const closeBtn = document.getElementById('closeBadgesBtn');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => modal.style.display = 'none');
            }
        }
    };

    // Exporta globalmente para uso na página e testes
    TabletPlayer.Session = Session;
    TabletPlayer.sound = sound;
    TabletPlayer.Gamification = Gamification;
    TabletPlayer.MascotEngine = MascotEngine;
    TabletPlayer.HapticEngine = haptic;
    TabletPlayer.WakeLockEngine = wakeLock;
    TabletPlayer.renderCard = function() {
        Session.isTransitionLocked = false;
        return this.renderCurrentQuestion();
    };
    window.TabletPlayer = TabletPlayer;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            TabletPlayer.init();
        });
    } else {
        TabletPlayer.init();
    }

})();
