/**
 * KUMONGEN — SUÍTE GAUNTLET DE ÁUDIO & SÍNTESE DE VOZ (E2E)
 * Validação exaustiva de Web Speech API, Web Audio API, resiliência de concorrência e TTS.
 */

const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const projectRoot = 'c:\\Users\\drdhs\\OneDrive\\Documentos\\mathbook-main';

const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0].split('#')[0];
    if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
    const filePath = path.join(projectRoot, reqPath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        fs.createReadStream(filePath).pipe(res);
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

const GauntletResults = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    failures: []
};

function assert(condition, testName, details = '') {
    GauntletResults.totalTests++;
    if (condition) {
        GauntletResults.passed++;
        console.log(`  ✔ PASS: ${testName}`);
    } else {
        GauntletResults.failed++;
        const errMsg = `  ✖ FAIL: ${testName} ${details ? '(' + details + ')' : ''}`;
        console.error(errMsg);
        GauntletResults.failures.push({ testName, details });
    }
}

async function runAudioGauntlet() {
    return new Promise((resolve) => {
        server.listen(0, async () => {
            const port = server.address().port;
            const baseUrl = `http://127.0.0.1:${port}`;
            console.log('\n====================================================================');
            console.log('  KUMONGEN · GAUNTLET DE ÁUDIO & SÍNTESE DE VOZ (TTS + SFX)');
            console.log('====================================================================');
            console.log(`⚡ Servidor de testes inicializado em: ${baseUrl}\n`);

            const browser = await chromium.launch({
                args: [
                    '--no-sandbox',
                    '--autoplay-policy=no-user-gesture-required',
                    '--use-fake-ui-for-media-stream'
                ]
            });
            const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
            const page = await context.newPage();

            const browserConsoleErrors = [];
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    browserConsoleErrors.push(msg.text());
                }
            });
            page.on('pageerror', err => browserConsoleErrors.push(err.message));

            try {
                // -------------------------------------------------------------
                // LOOP 1: DESBLOQUEIO & INICIALIZAÇÃO LIMPA
                // -------------------------------------------------------------
                console.log('[GAUNTLET LOOP 1] Inicialização de Áudio & Desbloqueio');
                await page.goto(`${baseUrl}/tablet.html`);
                await page.waitForLoadState('networkidle');

                // Primeiro clique para disparar o unlockAudio
                await page.click('body');
                await page.waitForTimeout(300);

                const loop1State = await page.evaluate(() => {
                    const synth = window.speechSynthesis;
                    return {
                        hasSpeech: 'speechSynthesis' in window,
                        speaking: synth ? synth.speaking : false,
                        pending: synth ? synth.pending : false,
                        paused: synth ? synth.paused : false,
                        audioContextExists: !!(window.AudioContext || window.webkitAudioContext)
                    };
                });

                assert(loop1State.hasSpeech, 'Web Speech API (speechSynthesis) presente no navegador');
                assert(!loop1State.speaking && !loop1State.pending, 'Motor de fala inicializa destravado e sem utterance fantasma');
                assert(loop1State.audioContextExists, 'Web Audio API (AudioContext) suportado');

                // -------------------------------------------------------------
                // LOOP 2: MÓDULOS DE PORTUGUÊS (P1, P2, P3, P4, P7, P8)
                // -------------------------------------------------------------
                console.log('\n[GAUNTLET LOOP 2] Módulos de Português — Sílabas, Palavras, Frases e Rimas');

                // -------------------------------------------------------------
                // HELPER DE TESTE DE CLIQUE EM ÁUDIO
                // -------------------------------------------------------------
                const bypassModals = () => {
                    window.TabletPlayer.Session.workedExampleDismissed = true;
                    const ex = document.getElementById('workedExampleModal');
                    if (ex) ex.style.display = 'none';
                    const tut = document.getElementById('tabletTutorialModal');
                    if (tut) tut.style.display = 'none';
                    const wiz = document.getElementById('taskWizardModal');
                    if (wiz) wiz.style.display = 'none';
                    window.TabletPlayer.renderCurrentQuestion();
                };

                const testSpeakAction = async (setupFn, triggerSelector, expectedAudioLabel) => {
                    await setupFn();
                    await page.waitForTimeout(450); // Aguarda render inicial e estabilização de autoplay

                    const instrumented = await page.evaluate((sel) => {
                        const btn = document.querySelector(sel);
                        if (!btn) return { found: false };

                        return new Promise((res) => {
                            let calls = 0;
                            let lastUtteranceText = '';
                            let started = false;
                            let ended = false;
                            let capturedError = null;

                            const origSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
                            window.speechSynthesis.speak = (utterance) => {
                                calls++;
                                lastUtteranceText = utterance.text;
                                utterance.addEventListener('start', () => {
                                    started = true;
                                });
                                utterance.addEventListener('end', () => {
                                    ended = true;
                                    res({
                                        found: true,
                                        calls,
                                        started: true,
                                        ended: true,
                                        error: null,
                                        text: utterance.text,
                                        pending: window.speechSynthesis.pending
                                    });
                                });
                                utterance.addEventListener('error', (e) => {
                                    capturedError = e.error;
                                    if (e.error !== 'interrupted' && e.error !== 'canceled') {
                                        res({
                                            found: true,
                                            calls,
                                            started,
                                            ended,
                                            error: e.error,
                                            text: utterance.text,
                                            pending: window.speechSynthesis.pending
                                        });
                                    }
                                });
                                origSpeak(utterance);
                            };

                            btn.click();

                            setTimeout(() => {
                                res({
                                    found: true,
                                    calls,
                                    started,
                                    ended,
                                    error: capturedError || (started || calls > 0 ? null : 'timeout_wait'),
                                    text: lastUtteranceText,
                                    pending: window.speechSynthesis.pending
                                });
                            }, 1500);
                        });
                    }, triggerSelector);

                    assert(instrumented.found, `Botão ${triggerSelector} existe para ${expectedAudioLabel}`);
                    assert(instrumented.started || instrumented.ended || instrumented.calls > 0, `Evento de áudio disparou síntese para ${expectedAudioLabel}`);
                    assert(instrumented.error !== 'timeout_wait', `Síntese de fala não congelou em ${expectedAudioLabel}`);
                };

                // -------------------------------------------------------------
                // LOOP 2: MÓDULOS DE PORTUGUÊS (P1, P2, P3, P7, P8)
                // -------------------------------------------------------------
                console.log('\n[GAUNTLET LOOP 2] Módulos de Português — Sílabas, Palavras, Frases e Rimas');

                // P1: Ouvir Letra
                await testSpeakAction(async () => {
                    await page.goto(`${baseUrl}/tablet.html?subject=portugues&level=p1`);
                    await page.evaluate(bypassModals);
                }, '#speakTraceBtn', 'P1 Alfabeto (Ouvir Letra)');

                // P2: Ouvir Sílaba
                await testSpeakAction(async () => {
                    await page.goto(`${baseUrl}/tablet.html?subject=portugues&level=p2`);
                    await page.evaluate(bypassModals);
                }, '#speakSyllableBtn', 'P2 Sílabas Simples (Ouvir Som)');

                // P3: Ouvir Palavra
                await testSpeakAction(async () => {
                    await page.goto(`${baseUrl}/tablet.html?subject=portugues&level=p3`);
                    await page.evaluate(bypassModals);
                }, '#speakWordBtn', 'P3 Palavras Curtas (Ouvir Palavra)');

                // P3: Toque em Chip de Sílaba
                const chipSpeak = await page.evaluate(() => {
                    const chip = document.querySelector('.syllable-chip');
                    if (!chip) return { found: false };

                    return new Promise((res) => {
                        let calls = 0;
                        let started = false;
                        let ended = false;

                        const origSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
                        window.speechSynthesis.speak = (utterance) => {
                            calls++;
                            utterance.addEventListener('start', () => { started = true; });
                            utterance.addEventListener('end', () => {
                                ended = true;
                                res({ found: true, calls, started: true, ended: true, text: utterance.text });
                            });
                            origSpeak(utterance);
                        };

                        chip.click();
                        setTimeout(() => {
                            res({ found: true, calls, started, ended, text: 'timeout_ok' });
                        }, 1200);
                    });
                });
                assert(chipSpeak.found, 'Chip de sílaba existe no P3');
                assert(chipSpeak.started || chipSpeak.ended || chipSpeak.calls > 0, 'Toque no chip de sílaba vocaliza a sílaba com sucesso');

                // P7: Ouvir Rima
                await testSpeakAction(async () => {
                    await page.goto(`${baseUrl}/tablet.html?subject=portugues&level=p7`);
                    await page.evaluate(bypassModals);
                }, '#speakRhymeBtn', 'P7 Rimas (Ouvir Rima)');

                // P8: Ouvir Frase
                await testSpeakAction(async () => {
                    await page.goto(`${baseUrl}/tablet.html?subject=portugues&level=p8`);
                    await page.evaluate(bypassModals);
                }, '#speakSentenceBtn', 'P8 Frases (Ouvir Frase)');

                // -------------------------------------------------------------
                // LOOP 3: MÓDULOS DE INGLÊS (I1, I2, I6, I7)
                // -------------------------------------------------------------
                console.log('\n[GAUNTLET LOOP 3] Módulos de Inglês — Alphabet, CVC Words, Sentences e Opposites');

                // I1: Trace Letter
                await testSpeakAction(async () => {
                    await page.goto(`${baseUrl}/tablet.html?subject=ingles&level=i1`);
                    await page.evaluate(bypassModals);
                }, '#speakTraceBtn', 'I1 Alphabet (Listen Letter)');

                // I2: CVC Word
                await testSpeakAction(async () => {
                    await page.goto(`${baseUrl}/tablet.html?subject=ingles&level=i2`);
                    await page.evaluate(bypassModals);
                }, '#speakWordBtn', 'I2 CVC Words (Listen Word)');

                // I6: Sentence
                await testSpeakAction(async () => {
                    await page.goto(`${baseUrl}/tablet.html?subject=ingles&level=i6`);
                    await page.evaluate(bypassModals);
                }, '#speakSentenceBtn', 'I6 Sentences (Listen Sentence)');

                // I7: Opposites
                await testSpeakAction(async () => {
                    await page.goto(`${baseUrl}/tablet.html?subject=ingles&level=i7`);
                    await page.evaluate(bypassModals);
                }, '#speakOppositeBtn', 'I7 Opposites (Listen Opposite)');

                // -------------------------------------------------------------
                // LOOP 4: TREINO AUDITIVO INFANTIL & REPETIÇÕES SUCESSIVAS (ANTI-DEADLOCK)
                // -------------------------------------------------------------
                console.log('\n[GAUNTLET LOOP 4] Treino Auditivo — Repetição Múltipla da Palavra & Anti-Deadlock');
                await page.goto(`${baseUrl}/tablet.html?subject=portugues&level=p3`);
                await page.evaluate(bypassModals);
                await page.waitForTimeout(300);

                // Teste 4A: A criança repete o áudio 3 vezes sucessivas para treinar a audição da palavra
                const repeatedListenResult = await page.evaluate(async () => {
                    const btn = document.getElementById('speakWordBtn');
                    if (!btn) return { ok: false, reason: 'btn_not_found' };

                    let repeatEvents = 0;
                    const origSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
                    window.speechSynthesis.speak = (u) => {
                        repeatEvents++;
                        origSpeak(u);
                    };

                    // Criança clica 3 vezes com intervalo para ouvir a pronúncia repetidas vezes
                    for (let i = 0; i < 3; i++) {
                        btn.click();
                        await new Promise(r => setTimeout(r, 400));
                    }

                    await new Promise(r => setTimeout(r, 800));

                    return {
                        ok: true,
                        repeatEvents,
                        pending: window.speechSynthesis.pending,
                        speaking: window.speechSynthesis.speaking
                    };
                });

                assert(repeatedListenResult.ok, 'Treino auditivo de repetição de palavra executado');
                assert(repeatedListenResult.repeatEvents >= 3, `Repetições de áudio processadas com sucesso (total: ${repeatedListenResult.repeatEvents})`);
                assert(!repeatedListenResult.pending, 'Fila destravada após repetições de áudio da criança');

                // Teste 4B: Estresse de cliques rápidos (anti-deadlock)
                const rapidFireResult = await page.evaluate(async () => {
                    const btn = document.getElementById('speakWordBtn');
                    if (!btn) return { ok: false, reason: 'btn_not_found' };

                    let speakCalls = 0;
                    const origSpeak = window.speechSynthesis.speak.bind(window.speechSynthesis);
                    window.speechSynthesis.speak = (u) => {
                        speakCalls++;
                        origSpeak(u);
                    };

                    for (let i = 0; i < 5; i++) {
                        btn.click();
                        await new Promise(r => setTimeout(r, 60));
                    }

                    await new Promise(r => setTimeout(r, 1000));

                    return {
                        ok: true,
                        speakCalls,
                        pending: window.speechSynthesis.pending
                    };
                });

                assert(rapidFireResult.ok, 'Estresse de cliques rápidos executado');
                assert(rapidFireResult.speakCalls > 0, `Cliques rápidos absorvidos pelo motor (total: ${rapidFireResult.speakCalls})`);
                assert(!rapidFireResult.pending, 'Fila de síntese destravada após estresse (pending=false)');

                // -------------------------------------------------------------
                // LOOP 5: MUTE & UNMUTE
                // -------------------------------------------------------------
                console.log('\n[GAUNTLET LOOP 5] Comportamento de Mute & Unmute');
                const muteTest = await page.evaluate(() => {
                    const muteBtn = document.getElementById('soundToggleBtn');
                    if (!muteBtn) return { found: false };

                    // Muta
                    muteBtn.click();
                    const isMuted = window.TabletPlayer.sound ? window.TabletPlayer.sound.muted : false;

                    // Desmuta
                    muteBtn.click();
                    const isUnmuted = window.TabletPlayer.sound ? !window.TabletPlayer.sound.muted : false;

                    return { found: true, isMuted, isUnmuted };
                });

                assert(muteTest.found, 'Botão #soundToggleBtn presente no cabeçalho');
                assert(muteTest.isMuted, 'Clique em mute silencia o motor de áudio');
                assert(muteTest.isUnmuted, 'Segundo clique reativa o áudio perfeitamente');

                // Auditoria de Erros de Console
                assert(browserConsoleErrors.length === 0, `Zero erros no console durante todo o Gauntlet (encontrados: ${browserConsoleErrors.length})`);

            } catch (err) {
                console.error('Erro fatal durante execução do Gauntlet:', err);
                assert(false, 'Execução do Gauntlet sem exceções não tratadas', err.message);
            } finally {
                await browser.close();
                server.close();

                console.log('\n====================================================================');
                console.log(`  RESULTADO FINAL DO GAUNTLET: ${GauntletResults.passed} / ${GauntletResults.totalTests} asserções aprovadas (${Math.round(GauntletResults.passed / GauntletResults.totalTests * 100)}%)`);
                console.log('====================================================================\n');

                resolve(GauntletResults.failed === 0);
            }
        });
    });
}

runAudioGauntlet().then(success => {
    process.exit(success ? 0 : 1);
});
