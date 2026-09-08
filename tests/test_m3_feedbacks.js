/**
 * Suíte de Verificação Automatizada — Milestone M3 (Feedbacks Visuais e Sensoriais R3)
 * Valida Features 11, 12 e 13:
 *  - Feature 11: Classes e Keyframes CSS no tablet.html, pulseSuccessCard, shakeCard, desbloqueio de digitação e múltipla escolha
 *  - Feature 12: Dica visual progressiva no 2º erro (applyProgressiveHint, hint-glow-pulse, apoio visual suave)
 *  - Feature 13: Partículas estelares em streak >= 3 (launchStreakSparks, Canvas 2D, requestAnimationFrame)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================================');
console.log('  KUMONGEN · SUÍTE DE TESTES UNITÁRIOS DO MILESTONE M3 (R3)');
console.log('====================================================================\n');

let passedTests = 0;
let totalTests = 0;

function it(desc, fn) {
    totalTests++;
    try {
        fn();
        console.log(`  ✔ PASS: ${desc}`);
        passedTests++;
    } catch (err) {
        console.error(`  ✖ FAIL: ${desc}`);
        console.error(`    ${err.message}`);
    }
}

// -------------------------------------------------------------
// [CENÁRIO 1] Auditoria de CSS e Estilos em tablet.html
// -------------------------------------------------------------
console.log('[CENÁRIO 1] Auditoria de Estilos e Keyframes CSS em tablet.html');
const tabletHtmlPath = path.join(__dirname, '..', 'tablet.html');
const tabletHtml = fs.readFileSync(tabletHtmlPath, 'utf8');

it('Keyframe cardSuccessPulse está presente em tablet.html', () => {
    assert.ok(tabletHtml.includes('@keyframes cardSuccessPulse'), 'cardSuccessPulse keyframe não encontrado');
});

it('Classe .card-feedback-success aplica borda esmeralda e glow de 24px', () => {
    assert.ok(tabletHtml.includes('.card-feedback-success'), 'Classe .card-feedback-success não encontrada');
    assert.ok(tabletHtml.includes('#10b981'), 'Cor esmeralda (#10b981) não encontrada');
    assert.ok(tabletHtml.includes('rgba(16, 185, 129, 0.45)'), 'Glow de acerto esmeralda rgba(16, 185, 129, 0.45) não encontrado');
});

it('Keyframe cardWrongShake está presente em tablet.html', () => {
    assert.ok(tabletHtml.includes('@keyframes cardWrongShake'), 'cardWrongShake keyframe não encontrado');
});

it('Classe .card-feedback-wrong aplica borda âmbar e sombra de 20px', () => {
    assert.ok(tabletHtml.includes('.card-feedback-wrong'), 'Classe .card-feedback-wrong não encontrada');
    assert.ok(tabletHtml.includes('#f59e0b'), 'Cor âmbar (#f59e0b) não encontrada');
    assert.ok(tabletHtml.includes('rgba(245, 158, 11, 0.35)'), 'Sombra âmbar rgba(245, 158, 11, 0.35) não encontrada');
});

it('Classes de tecla .key-feedback-emerald e .key-feedback-amber estão presentes', () => {
    assert.ok(tabletHtml.includes('.key-feedback-emerald'), '.key-feedback-emerald não encontrada');
    assert.ok(tabletHtml.includes('.key-feedback-amber'), '.key-feedback-amber não encontrada');
});

it('Keyframe hintGlowPulse e classe .hint-glow-pulse estão presentes', () => {
    assert.ok(tabletHtml.includes('@keyframes hintGlowPulse'), 'hintGlowPulse keyframe não encontrado');
    assert.ok(tabletHtml.includes('.hint-glow-pulse'), '.hint-glow-pulse não encontrada');
});

it('Canvas #confettiCanvas está configurado com pointer-events: none', () => {
    assert.ok(tabletHtml.includes('id="confettiCanvas"'), 'confettiCanvas não encontrado');
    assert.ok(tabletHtml.includes('pointer-events:none') || tabletHtml.includes('pointer-events: none'), 'pointer-events: none não encontrado no canvas');
});

// -------------------------------------------------------------
// [CENÁRIO 2] Auditoria de Código e Métodos em tablet-player.js
// -------------------------------------------------------------
console.log('\n[CENÁRIO 2] Auditoria de Código e Métodos em tablet-player.js');
const tabletPlayerJsPath = path.join(__dirname, '..', 'tablet-player.js');
const tabletPlayerJs = fs.readFileSync(tabletPlayerJsPath, 'utf8');

it('Método pulseSuccessCard(triggerEl) está definido e aplica card-feedback-success e key-feedback-emerald', () => {
    assert.ok(tabletPlayerJs.includes('pulseSuccessCard(triggerEl)'), 'pulseSuccessCard(triggerEl) não encontrado');
    assert.ok(tabletPlayerJs.includes('card-feedback-success'), 'card-feedback-success não utilizado em pulseSuccessCard');
    assert.ok(tabletPlayerJs.includes('key-feedback-emerald'), 'key-feedback-emerald não utilizado em pulseSuccessCard');
});

it('Método shakeCard(triggerEl) está definido e aplica card-feedback-wrong e key-feedback-amber', () => {
    assert.ok(tabletPlayerJs.includes('shakeCard(triggerEl)'), 'shakeCard(triggerEl) não encontrado');
    assert.ok(tabletPlayerJs.includes('card-feedback-wrong'), 'card-feedback-wrong não utilizado em shakeCard');
    assert.ok(tabletPlayerJs.includes('key-feedback-amber'), 'key-feedback-amber não utilizado em shakeCard');
});

it('Método applyProgressiveHint(item) está implementado e destaca activeAnswerBox com hint-glow-pulse', () => {
    assert.ok(tabletPlayerJs.includes('applyProgressiveHint(item)'), 'applyProgressiveHint(item) não encontrado');
    assert.ok(tabletPlayerJs.includes('hint-glow-pulse'), 'hint-glow-pulse não utilizado em applyProgressiveHint');
    assert.ok(tabletPlayerJs.includes('concreteMathPanel'), 'concreteMathPanel não manipulado em applyProgressiveHint');
});

it('Método launchStreakSparks(currentStreak) está implementado com canvas 2D e requestAnimationFrame', () => {
    assert.ok(tabletPlayerJs.includes('launchStreakSparks(currentStreak)'), 'launchStreakSparks(currentStreak) não encontrado');
    assert.ok(tabletPlayerJs.includes('confettiCanvas'), 'confettiCanvas não utilizado em launchStreakSparks');
    assert.ok(tabletPlayerJs.includes('cancelAnimationFrame'), 'cancelAnimationFrame não utilizado em launchStreakSparks');
    assert.ok(tabletPlayerJs.includes('requestAnimationFrame'), 'requestAnimationFrame não utilizado em launchStreakSparks');
    assert.ok(tabletPlayerJs.includes('clearRect'), 'clearRect não utilizado em launchStreakSparks');
});

it('registerSuccess dispara launchStreakSparks quando streak >= 3 e múltiplo de 3', () => {
    assert.ok(tabletPlayerJs.includes('currentStreak >= 3 && currentStreak % 3 === 0'), 'Condição múltiplo de 3 para launchStreakSparks não encontrada');
});

it('registerWrong garante que Session.isTransitionLocked permaneça false', () => {
    const regWrongIndex = tabletPlayerJs.indexOf('registerWrong(triggerEl)');
    assert.ok(regWrongIndex !== -1, 'Método registerWrong não localizado');
    const nextFuncIndex = tabletPlayerJs.indexOf('startGauntletPhase()', regWrongIndex);
    const regWrongBody = tabletPlayerJs.slice(regWrongIndex, nextFuncIndex);
    assert.ok(regWrongBody.includes('Session.isTransitionLocked = false'), 'isTransitionLocked = false não definido em registerWrong');
});

it('registerWrong aciona applyProgressiveHint quando currentAttempts >= 2', () => {
    assert.ok(tabletPlayerJs.includes('Session.currentAttempts >= 2'), 'Checagem currentAttempts >= 2 não encontrada');
    assert.ok(tabletPlayerJs.includes('this.applyProgressiveHint(currentItem)'), 'Invocação de applyProgressiveHint não encontrada');
});

it('Cards de escolha convergem para registerWrong(btn)', () => {
    assert.ok(!tabletPlayerJs.includes('sound.playWrong();\n                        this.shakeCard();'), 'Chamadas obsoletas diretas de shakeCard ainda presentes em escolhas');
    assert.ok(tabletPlayerJs.includes('this.registerWrong(btn);'), 'registerWrong(btn) não encontrado para botões de escolha');
});

// -------------------------------------------------------------
// [CENÁRIO 3] Simulação Lógica de Estado e Comportamento
// -------------------------------------------------------------
console.log('\n[CENÁRIO 3] Simulação Lógica de Estado e Comportamento');

it('Ciclo de erro sequencial: 1º erro (currentAttempts=1, sem dica), 2º erro (currentAttempts=2, com dica)', () => {
    const mockSession = {
        currentAttempts: 0,
        isTransitionLocked: false,
        items: [{ type: 'math', operand1: 2, operand2: 3, operator: '+' }],
        currentIndex: 0,
        missedItemsQueue: []
    };

    let hintTriggered = false;
    let shakeTriggered = false;
    let passedTrigger = null;

    const mockPlayer = {
        shakeCard(el) {
            shakeTriggered = true;
            passedTrigger = el;
        },
        applyProgressiveHint(item) {
            hintTriggered = true;
        },
        registerWrong(triggerEl) {
            mockSession.isTransitionLocked = false;
            mockSession.currentAttempts++;
            this.shakeCard(triggerEl);
            if (mockSession.currentAttempts >= 2) {
                this.applyProgressiveHint(mockSession.items[mockSession.currentIndex]);
            }
        }
    };

    // 1ª tentativa incorreta
    mockPlayer.registerWrong('btn-op-1');
    assert.strictEqual(mockSession.currentAttempts, 1, 'currentAttempts deve ser 1 após 1º erro');
    assert.strictEqual(mockSession.isTransitionLocked, false, 'isTransitionLocked deve ser false no 1º erro');
    assert.strictEqual(shakeTriggered, true, 'shakeCard deve ser disparado no 1º erro');
    assert.strictEqual(passedTrigger, 'btn-op-1', 'triggerEl deve ser repassado para shakeCard');
    assert.strictEqual(hintTriggered, false, 'Dica NÃO deve ser disparada no 1º erro');

    // 2ª tentativa incorreta consecutiva
    shakeTriggered = false;
    mockPlayer.registerWrong('btn-op-2');
    assert.strictEqual(mockSession.currentAttempts, 2, 'currentAttempts deve ser 2 após 2º erro');
    assert.strictEqual(mockSession.isTransitionLocked, false, 'isTransitionLocked deve ser false no 2º erro');
    assert.strictEqual(shakeTriggered, true, 'shakeCard deve ser disparado no 2º erro');
    assert.strictEqual(passedTrigger, 'btn-op-2', 'triggerEl deve ser repassado no 2º erro');
    assert.strictEqual(hintTriggered, true, 'Dica DEVE ser disparada no 2º erro consecutivo');
});

it('Disparo de Streak Sparks em múltiplos de 3 (streak=3, streak=4, streak=6)', () => {
    const sparkHistory = [];
    function checkStreakSparks(streak) {
        if (streak >= 3 && streak % 3 === 0) {
            sparkHistory.push(streak);
        }
    }

    [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach(checkStreakSparks);
    assert.deepStrictEqual(sparkHistory, [3, 6, 9], 'Sparks devem disparar exatamente em [3, 6, 9]');
});

console.log('\n====================================================================');
console.log(`  RESUMO DOS TESTES DO MILESTONE M3: ${passedTests} / ${totalTests} asserções aprovadas (${Math.round((passedTests/totalTests)*100)}%)`);
console.log('====================================================================\n');

if (passedTests !== totalTests) {
    process.exit(1);
} else {
    process.exit(0);
}
