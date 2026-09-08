/**
 * KumonGen — Declarações Canônicas de Tipos e Contratos Globais (types.d.ts)
 * 
 * Este arquivo define a malha de tipos de toda a aplicação:
 * - Sistema de Perfis e Gamificação (StudentProfile, Mastery, Gamification)
 * - Matriz Curricular dos 25 Níveis (KumonSubjects, KumonLevel, ExerciseItem)
 * - Motor do Tablet Player e Sessão Interativa
 * - Barramento Global (window.KumonSubjects, window.StudentProfileEngine, etc.)
 */

export type SubjectKey = 'matematica' | 'portugues' | 'ingles';

export type AgeTierId = 'age_4_5' | 'age_6_7' | 'age_8_9' | 'age_10_plus';

export type MascotId = 'jaguar' | 'capivara' | 'calango' | 'golfinho';

/**
 * Estado de Gamificação do Aluno
 */
export interface GamificationState {
    stars: number;
    streak: number;
    bestStreak: number;
    totalRounds: number;
    totalCorrect: number;
    badges: string[];
    lastPlayed: string | null;
}

/**
 * Registro de Histórico de Treino
 */
export interface HistoryRecord {
    id?: string;
    date: string;
    subject: SubjectKey | string;
    level: string;
    correct: number;
    total: number;
    timeSeconds: number;
    accuracy: number;
    starsEarned: number;
}

/**
 * Maestria de um Nível Específico (Kumon SCT - Standard Completion Time)
 */
export interface LevelMastery {
    stars: number; // 0 a 3 estrelas Kumon
    bestTimeSeconds: number;
    accuracyPercent: number;
    completedCount: number;
    lastCompleted: string;
}

/**
 * Perfil Canônico do Aluno
 */
export interface StudentProfile {
    id: string;
    name: string;
    ageTier: AgeTierId;
    mascot: MascotId;
    createdAt: string;
    gamification: GamificationState;
    history: HistoryRecord[];
    mastery: Record<string, LevelMastery>;
}

/**
 * Metadados de um Nível Kumon (M1-M10, P1-P8, I1-I7)
 */
export interface KumonLevel {
    id: string;
    name: string;
    title?: string;
    age: string;
    description: string;
    sctSeconds?: number;
    badge?: string;
    instruction?: string;
    instructions?: string;
}

/**
 * Exercício de Matemática
 */
export interface MathExerciseItem {
    type: 'math';
    operand1: number;
    operator: '+' | '-' | '×' | '*' | '÷' | '/' | string;
    operand2: number;
    correctAnswer?: number | string;
    answer?: number | string;
    prompt?: string;
    display?: string;
    example?: boolean;
}

/**
 * Exercício de Sílabas / Português
 */
export interface SyllableExerciseItem {
    type: 'syllables';
    word: string;
    syllables: string[];
    missingIndex?: number;
    missingSyllable?: string;
    options: string[];
    correctAnswer: string;
    prompt?: string;
    audioCue?: string;
    example?: boolean;
}

/**
 * Exercício de Palavras / Fonemas / Inglês
 */
export interface WordExerciseItem {
    type: 'words' | 'phonics';
    word: string;
    translation?: string;
    options: string[];
    correctAnswer: string;
    prompt?: string;
    audioCue?: string;
    example?: boolean;
}

/**
 * Exercício de Traçado Interativo de Letras / Números
 */
export interface TracingExerciseItem {
    type: 'tracing';
    char: string;
    prompt?: string;
    example?: boolean;
}

export type HandicapMode = 'focus' | 'mixed_basic' | 'mixed_full';

export interface HandicapConfig {
    mode: HandicapMode;
    value?: number;
}

/**
 * Item Genérico de Exercício (União Discriminada)
 */
export type ExerciseItem = MathExerciseItem | SyllableExerciseItem | WordExerciseItem | TracingExerciseItem | Record<string, any>;

/**
 * Módulo de Disciplina Kumon
 */
export interface KumonSubject {
    id: SubjectKey | string;
    name: string;
    title?: string;
    icon?: string;
    levels: KumonLevel[];
    generate: (level: KumonLevel, count: number, options?: { handicap?: HandicapConfig; [key: string]: any }) => ExerciseItem[];
}

/**
 * Estado da Sessão do Tablet Player
 */
export interface TabletSessionState {
    subjectKey: SubjectKey | string;
    levelId: string;
    studentName: string;
    handicap?: HandicapConfig;
    items: ExerciseItem[];
    currentIndex: number;
    currentInput: string;
    currentAttempts: number;
    roundCorrectFirstAttempt: number;
    startTime: number | null;
    timerInterval: any;
    transitionTimeout: any;
    isTransitionLocked: boolean;
    elapsedSeconds: number;
    targetSctSeconds: number;
    workedExampleDismissed: boolean;
    activeCanvas: HTMLCanvasElement | null;
    missedItemsQueue: ExerciseItem[];
    isGauntletPhase: boolean;
    isGauntlet: boolean;
    gauntletCycles: number;
    initialItemsCount: number;
    gauntletItemsSolved: number;
    isReviewMode?: boolean;
    showConcreteAids?: boolean;
    countedDots?: number[];
}

/**
 * Item persistido no Caderno de Revisão Inteligente (Spaced Repetition de Erros Recentes)
 */
export interface ReviewNotebookItem {
    id: string;
    subjectKey: SubjectKey | string;
    levelId: string;
    item: ExerciseItem;
    addedAt: string;
    attempts: number;
}

export interface ReviewNotebookManagerInterface {
    STORAGE_PREFIX: string;
    getStorageKey: () => string;
    getItemCanonicalKey: (item: any) => string;
    getItems: () => ReviewNotebookItem[];
    saveItems: (items: ReviewNotebookItem[]) => void;
    addItem: (item: any, subjectKey?: string, levelId?: string) => void;
    removeItem: (item: any) => void;
    count: () => number;
    updateHeaderUI: () => void;
    showModal: () => void;
    closeModal: () => void;
    startReviewSession: () => void;
}

/**
 * Motor do Modo Fonte Bastão Escolar (Caixa Alta / Ed. Infantil)
 */
export interface FontBastaoManagerInterface {
    STORAGE_KEY: string;
    isEnabled: () => boolean;
    setEnabled: (enabled: boolean, isExplicitUserAction?: boolean) => boolean;
    toggle: () => boolean;
    applyToDOM: (enabled?: boolean | null) => void;
    onStudentChanged: (student?: any) => void;
    init: () => void;
}

/**
 * Configuração e Parâmetros de Síntese de Voz
 */
export interface AudioEngineConfig {
    lang: 'pt-BR' | 'en-US' | string;
    rate: number;
    pitch: number;
    volume: number;
}

/**
 * Mecanismo SafeStorage
 */
export interface SafeStorageInterface {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: any) => boolean;
    removeItem: (key: string) => void;
    clear: () => void;
}

/**
 * Declarações de Escopo Global (Window)
 */
declare global {
    interface Window {
        KumonSubjects: Record<string, KumonSubject>;
        StudentProfileEngine: {
            getActive: () => StudentProfile;
            getAll: () => StudentProfile[];
            setActive: (id: string) => boolean;
            createProfile: (name: string, ageTier: AgeTierId, mascot: MascotId) => StudentProfile;
            saveProfile: (profile: StudentProfile) => void;
            deleteProfile: (id: string) => boolean;
            recordRound: (result: HistoryRecord) => void;
            showProfileModal?: (mode?: any) => void;
            showEvolutionModal?: () => void;
            recordLevelMastery?: (subject: string, levelId: string, stats: any) => void;
            addActiveHistoryItem?: (item: any) => void;
            generateMasteryCertificatePDF?: (studentId: string | null, certData: any) => Promise<any>;
            MASCOTS?: Record<string, any>;
            [key: string]: any;
        };
        TabletPlayer: {
            init?: () => void;
            startRound?: () => void;
            showSplashLobby?: () => void;
            openSplashLobby?: () => void;
            updateHandicapHeaderBadge?: () => void;
            Session?: TabletSessionState | any;
            sound?: any;
            Gamification?: any;
            MascotEngine?: any;
            HapticEngine?: any;
            WakeLockEngine?: any;
            speakWord?: (word: string, lang?: string) => Promise<boolean>;
            speakCurrentInstruction?: (userTriggered?: boolean) => void;
            getSpokenInstructionForItem?: (item: any, level: any, subjectKey: string) => { text: string; lang: string };
            shouldAutoNarrate?: () => boolean;
            testAudio?: (lang?: string) => void;
            showAudioDiagnosticsModal?: () => void;
            ReviewNotebook?: ReviewNotebookManagerInterface;
            FontBastao?: FontBastaoManagerInterface;
            [key: string]: any;
        };
        SafeStorage: SafeStorageInterface;
        KumonParentGuide?: {
            open: () => void;
            close: () => void;
        };
        toggleFontBastaoSheet?: (enabled: boolean) => void;
        jspdf?: any;
        KumonGen?: any;
        escapeHtml?: (str: any) => string;
        webkitAudioContext?: typeof AudioContext;
    }
}
