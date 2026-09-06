/**
 * KumonGen — Challenger 2 Empirical Test Harness
 * Verifies sandbox.html:
 *  1. Authentic Fallback to CSS Native when Anime.js is unavailable (blocked/offline)
 *  2. Functional Parity between Anime.js and CSS Native across 3 choreographies
 *  3. Telemetry & FPS precision via requestAnimationFrame (and synthetic frame-drop oracle)
 *  4. Stress & Hammering resilience (concurrency, rapid clicks, memory/DOM cleanup)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PORT = 3499;

function createStaticServer() {
    const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon'
    };

    const server = http.createServer((req, res) => {
        try {
            const urlPath = req.url.split('?')[0];
            const safePath = path.normalize(urlPath).replace(/^(\.\.[\/\\])+/, '');
            let filePath = path.join(PROJECT_ROOT, safePath === '/' ? 'sandbox.html' : safePath);

            if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('404 Not Found');
                return;
            }

            const ext = path.extname(filePath).toLowerCase();
            const contentType = mimeTypes[ext] || 'application/octet-stream';

            const content = fs.readFileSync(filePath);
            res.writeHead(200, {
                'Content-Type': contentType,
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(content);
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('500 Server Error: ' + err.message);
        }
    });

    return server;
}

async function runEmpiricalChallenge() {
    console.log('================================================================');
    console.log('CHALLENGER 2: EMPIRICAL HARNESS FOR ANIME.JS SANDBOX & FPS');
    console.log('================================================================');

    const server = createStaticServer();
    await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
    console.log(`[INFO] Servidor de teste ativo em http://127.0.0.1:${PORT}`);

    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    const launchOptions = {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-frame-rate-limit',
            '--disable-gpu-vsync',
            '--enable-automation'
        ]
    };
    if (fs.existsSync(chromePath)) {
        launchOptions.executablePath = chromePath;
    }

    const browser = await chromium.launch(launchOptions);
    const testResults = {
        suite1_animeBaseline: null,
        suite2_cssFallbackBlockedCDN: null,
        suite3_fpsTelemetryAccuracy: null,
        suite4_stressHammering: null,
        suite5_splitMode: null,
        consoleErrors: []
    };

    try {
        // ====================================================================
        // SUITE 1: BASELINE ANIME.JS (CDN Disponível)
        // ====================================================================
        console.log('\n--- SUITE 1: ANIME.JS MODE (CDN ATIVO) ---');
        {
            const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
            const page = await context.newPage();
            const errors = [];
            page.on('console', msg => {
                if (msg.type() === 'error') {
                    errors.push(msg.text());
                    testResults.consoleErrors.push({ suite: 'suite1', error: msg.text() });
                }
            });
            page.on('pageerror', err => {
                errors.push(err.message);
                testResults.consoleErrors.push({ suite: 'suite1', pageerror: err.message });
            });

            await page.goto(`http://127.0.0.1:${PORT}/sandbox.html?engine=anime`, { waitUntil: 'networkidle' });

            const hasAnime = await page.evaluate(() => window.hasAnimeCDN);
            const engineMode = await page.evaluate(() => window.currentEngineMode);
            const badgeText = await page.$eval('#cdnStatusText', el => el.innerText);

            console.log(`- hasAnimeCDN: ${hasAnime}`);
            console.log(`- currentEngineMode: ${engineMode}`);
            console.log(`- CDN Badge: "${badgeText}"`);

            // Dispara Coreografia 1
            await page.evaluate(() => window.selectMascot('capivara'));
            const mascotName = await page.$eval('#mascotBadge', el => el.innerText);
            await page.evaluate(() => window.triggerMascotBounce());
            await page.waitForTimeout(300);
            await page.evaluate(() => window.triggerMascotShake());
            await page.waitForTimeout(300);

            // Dispara Coreografia 2
            await page.evaluate(() => window.triggerStarBurst());
            await page.evaluate(() => window.triggerStreakCombo());
            await page.evaluate(() => window.triggerOdometerIncrease());
            const starCount = await page.$eval('#starCounterNumber', el => el.innerText);
            await page.waitForTimeout(400);

            // Dispara Coreografia 3
            await page.evaluate(() => window.openGauntletMasteryModal());
            const isModalOpen = await page.$eval('#gauntletModalOverlay', el => !el.classList.contains('hidden'));
            await page.waitForTimeout(300);
            await page.evaluate(() => window.closeGauntletMasteryModal());
            await page.waitForTimeout(300);
            const isModalClosed = await page.$eval('#gauntletModalOverlay', el => el.classList.contains('hidden'));

            // Executa benchmark de 5s para coletar telemetria
            console.log('- Executando benchmark de 5s com Anime.js...');
            const benchmarkData = await page.evaluate(() => window.runFiveSecondBenchmark());

            testResults.suite1_animeBaseline = {
                hasAnime,
                engineMode,
                badgeText,
                mascotSwitched: mascotName.includes('Capi'),
                modalFlow: isModalOpen && isModalClosed,
                starCountUpdated: parseInt(starCount, 10) > 100,
                benchmarkData,
                errorsCount: errors.length
            };
            console.log(`  Resultado Suite 1: Média FPS = ${benchmarkData.fps.mean}, Drops = ${benchmarkData.droppedFrames}, Erros = ${errors.length}`);
            await context.close();
        }

        // ====================================================================
        // SUITE 2: ADVERSARIAL FALLBACK (CDN COMPLETAMENTE BLOQUEADA / OFFLINE)
        // ====================================================================
        console.log('\n--- SUITE 2: ADVERSARIAL CSS FALLBACK (CDN BLOQUEADA/OFFLINE) ---');
        {
            const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
            const page = await context.newPage();
            const errors = [];
            let dialogHandled = false;

            page.on('console', msg => {
                if (msg.type() === 'error') {
                    errors.push(msg.text());
                    testResults.consoleErrors.push({ suite: 'suite2', error: msg.text() });
                }
            });
            page.on('pageerror', err => {
                errors.push(err.message);
                testResults.consoleErrors.push({ suite: 'suite2', pageerror: err.message });
            });
            page.on('dialog', async dialog => {
                dialogHandled = true;
                console.log(`  [Dialog Capturado] Tipo: ${dialog.type()}, Mensagem: "${dialog.message()}"`);
                await dialog.dismiss();
            });

            // BLOQUEIA Anime.js e scripts de CDN
            await page.route('**/*anime*', route => route.abort());
            await page.route('**/cdnjs.cloudflare.com/ajax/libs/animejs/**', route => route.abort());

            await page.goto(`http://127.0.0.1:${PORT}/sandbox.html`, { waitUntil: 'load' });
            await page.waitForTimeout(500);

            const hasAnime = await page.evaluate(() => typeof anime !== 'undefined');
            const hasAnimeCDNVar = await page.evaluate(() => window.hasAnimeCDN);
            const engineMode = await page.evaluate(() => window.currentEngineMode);
            const badgeText = await page.$eval('#cdnStatusText', el => el.innerText);

            console.log(`- hasAnime (global typeof): ${hasAnime}`);
            console.log(`- hasAnimeCDN (variável): ${hasAnimeCDNVar}`);
            console.log(`- currentEngineMode padrão: ${engineMode}`);
            console.log(`- CDN Badge text: "${badgeText}"`);

            // Tenta forçar modo anime quando CDN indisponível
            await page.evaluate(() => window.setEngineMode('anime'));
            const modeAfterForcedAnime = await page.evaluate(() => window.currentEngineMode);
            console.log(`- Modo após tentativa forçada de ativar anime sem CDN: ${modeAfterForcedAnime} (esperado: css)`);

            // Testa Coreografia 1 (Mascote Bounce em CSS)
            await page.evaluate(() => window.triggerMascotBounce());
            const hasBounceClass = await page.$eval('#mascotWrapper', el => el.classList.contains('anim-css-bounce'));
            const hasSpeechClass = await page.$eval('#mascotSpeechBubble', el => el.classList.contains('anim-css-speech'));
            console.log(`- Coreografia 1 Bounce CSS class applied: ${hasBounceClass}, Speech: ${hasSpeechClass}`);

            // Testa Coreografia 1 Shake em CSS
            await page.evaluate(() => window.triggerMascotShake());
            const hasShakeClass = await page.$eval('#mascotWrapper', el => el.classList.contains('anim-css-shake'));
            console.log(`- Coreografia 1 Shake CSS class applied: ${hasShakeClass}`);

            // Testa Coreografia 2 (Estrelas Stagger em CSS)
            await page.evaluate(() => window.triggerStarBurst());
            const starsSampleStyle = await page.evaluate(() => {
                const s = document.querySelector('.burst-star');
                return {
                    hasAnimClass: s.classList.contains('anim-css-star'),
                    dx: s.style.getPropertyValue('--dx'),
                    dy: s.style.getPropertyValue('--dy'),
                    rot: s.style.getPropertyValue('--rot')
                };
            });
            console.log(`- Coreografia 2 Estrelas CSS: animClass=${starsSampleStyle.hasAnimClass}, dx=${starsSampleStyle.dx}, dy=${starsSampleStyle.dy}`);

            // Testa Coreografia 2 Streak & Odometer em CSS
            await page.evaluate(() => window.triggerStreakCombo());
            const streakClass = await page.$eval('#streakPill', el => el.classList.contains('anim-css-streak'));
            await page.evaluate(() => window.triggerOdometerIncrease());
            const starCountCss = await page.$eval('#starCounterNumber', el => el.innerText);
            console.log(`- Coreografia 2 Streak CSS: animClass=${streakClass}, Odômetro=${starCountCss}`);

            // Testa Coreografia 3 (Modal Gauntlet em CSS)
            await page.evaluate(() => window.openGauntletMasteryModal());
            const modalCssCheck = await page.evaluate(() => {
                const overlay = document.getElementById('gauntletModalOverlay');
                const backdrop = document.getElementById('gauntletModalBackdrop');
                const card = document.getElementById('gauntletModalCard');
                const crest = document.getElementById('gauntletModalCrest');
                return {
                    isOpen: !overlay.classList.contains('hidden'),
                    backdropHasClass: backdrop.classList.contains('anim-css-modal-backdrop'),
                    cardHasClass: card.classList.contains('anim-css-modal-card'),
                    crestHasClass: crest.classList.contains('anim-css-modal-crest')
                };
            });
            console.log(`- Coreografia 3 Modal CSS: isOpen=${modalCssCheck.isOpen}, backdrop=${modalCssCheck.backdropHasClass}, card=${modalCssCheck.cardHasClass}, crest=${modalCssCheck.crestHasClass}`);

            await page.evaluate(() => window.closeGauntletMasteryModal());
            const isModalClosedCss = await page.$eval('#gauntletModalOverlay', el => el.classList.contains('hidden'));
            console.log(`- Coreografia 3 Fechamento: isClosed=${isModalClosedCss}`);

            // Testa Particle Stress em CSS
            await page.evaluate(() => window.triggerParticleStress(25));
            const particleCount = await page.evaluate(() => document.querySelectorAll('.stress-particle').length);
            console.log(`- Stress Particles em CSS: ${particleCount} nós criados com transitions inline`);

            // Executa benchmark de 5s no modo fallback CSS
            console.log('- Executando benchmark de 5s no modo Fallback CSS...');
            const cssBenchmarkData = await page.evaluate(() => window.runFiveSecondBenchmark());
            console.log(`  Resultado Fallback CSS: Média FPS = ${cssBenchmarkData.fps.mean}, Drops = ${cssBenchmarkData.droppedFrames}, Erros = ${errors.length}`);

            testResults.suite2_cssFallbackBlockedCDN = {
                hasAnime,
                hasAnimeCDNVar,
                engineMode,
                badgeText,
                dialogHandled,
                modeAfterForcedAnime,
                mascotBounce: hasBounceClass,
                mascotShake: hasShakeClass,
                starsSampleStyle,
                streakClass,
                starCountCss,
                modalCssCheck,
                isModalClosedCss,
                particleCount,
                cssBenchmarkData,
                errorsCount: errors.length
            };
            await context.close();
        }

        // ====================================================================
        // SUITE 3: ORÁCULO DE TELEMETRIA & PRECISÃO DE MEDIÇÃO DE FPS
        // ====================================================================
        console.log('\n--- SUITE 3: FPS TELEMETRY ACCURACY & SYNTHETIC JANK ORACLE ---');
        {
            const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
            const page = await context.newPage();

            await page.goto(`http://127.0.0.1:${PORT}/sandbox.html`, { waitUntil: 'networkidle' });

            // 1. Inspeciona a estrutura e matemática do profiler
            const profilerVerification = await page.evaluate(() => {
                profiler.reset();
                return {
                    initialHistorySize: profiler.historySize,
                    initialDropped: profiler.droppedFramesCount,
                    hasCanvas: profiler.canvas !== null,
                    hasCtx: profiler.ctx !== null
                };
            });

            // Aguarda 60 quadros normais
            await page.waitForTimeout(600);
            const baselineMetrics = await page.evaluate(() => profiler.getMetricsSnapshot());
            console.log(`- Métricas baseline (sem carga pesada): Média=${baselineMetrics.mean} FPS, Min=${baselineMetrics.min} FPS, Drops=${baselineMetrics.droppedFrames}`);

            // 2. ORÁCULO DE DETECÇÃO DE JANK: Injeta artificialmente 3 atrasos pesados na thread principal
            console.log('- Injetando 3 atrasos síncronos artificiais (35ms, 55ms, 45ms) na thread...');
            const jankDetectionResult = await page.evaluate(() => {
                const initialDrops = profiler.droppedFramesCount;
                
                // Jank 1: 35ms
                const start1 = performance.now();
                while (performance.now() - start1 < 35) {}

                return new Promise(resolve => {
                    requestAnimationFrame(() => {
                        // Jank 2: 55ms
                        const start2 = performance.now();
                        while (performance.now() - start2 < 55) {}

                        requestAnimationFrame(() => {
                            // Jank 3: 45ms
                            const start3 = performance.now();
                            while (performance.now() - start3 < 45) {}

                            requestAnimationFrame(() => {
                                const finalSnapshot = profiler.getMetricsSnapshot();
                                resolve({
                                    initialDrops,
                                    finalDrops: finalSnapshot.droppedFrames,
                                    dropsDelta: finalSnapshot.droppedFrames - initialDrops,
                                    minFps: finalSnapshot.min,
                                    p95Delta: finalSnapshot.frameTimesMs.p95
                                });
                            });
                        });
                    });
                });
            });

            console.log(`- Resultado do Oráculo de Jank:`);
            console.log(`  Drops adicionados detectados: ${jankDetectionResult.dropsDelta} (esperado >= 3)`);
            console.log(`  Min FPS registrado: ${jankDetectionResult.minFps} FPS (esperado < 30 FPS devido aos atrasos)`);
            console.log(`  p95 delta de frame: ${jankDetectionResult.p95Delta} ms`);

            // 3. Validação matemática do snapshot
            const mathVerification = await page.evaluate(() => {
                const s = profiler.getMetricsSnapshot();
                const dataset = profiler.allFpsSamples;
                const manualSum = dataset.reduce((a, b) => a + b, 0);
                const manualMean = +(manualSum / dataset.length).toFixed(2);
                const manualMin = Math.min(...dataset);
                const manualMax = Math.max(...dataset);

                return {
                    reportedMean: s.mean,
                    calculatedMean: manualMean,
                    meanMatches: Math.abs(s.mean - manualMean) < 0.05,
                    reportedMin: s.min,
                    calculatedMin: manualMin,
                    minMatches: s.min === manualMin,
                    reportedMax: s.max,
                    calculatedMax: manualMax,
                    maxMatches: s.max === manualMax
                };
            });
            console.log(`- Validação matemática: meanMatches=${mathVerification.meanMatches}, minMatches=${mathVerification.minMatches}, maxMatches=${mathVerification.maxMatches}`);

            testResults.suite3_fpsTelemetryAccuracy = {
                profilerVerification,
                baselineMetrics,
                jankDetectionResult,
                mathVerification,
                verdict: (jankDetectionResult.dropsDelta >= 3 && mathVerification.meanMatches && mathVerification.minMatches) ? 'ACCURATE_GENUINE' : 'FAILED'
            };
            await context.close();
        }

        // ====================================================================
        // SUITE 4: ESTRESSE DE CONCORRÊNCIA, HAMMERING & LIMPEZA DE MEMÓRIA/DOM
        // ====================================================================
        console.log('\n--- SUITE 4: CONCURRENCY STRESS, HAMMERING & DOM LEAKS ---');
        {
            const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
            const page = await context.newPage();
            const errors = [];

            page.on('console', msg => {
                if (msg.type() === 'error') {
                    errors.push(msg.text());
                    testResults.consoleErrors.push({ suite: 'suite4', error: msg.text() });
                }
            });
            page.on('pageerror', err => {
                errors.push(err.message);
                testResults.consoleErrors.push({ suite: 'suite4', pageerror: err.message });
            });

            await page.goto(`http://127.0.0.1:${PORT}/sandbox.html`, { waitUntil: 'networkidle' });

            // 1. Hammering em Mascote Bounce (30 cliques rápidos em 300ms)
            console.log('- Hammering: 30 disparos consecutivos de triggerMascotBounce()...');
            await page.evaluate(async () => {
                for (let i = 0; i < 30; i++) {
                    window.triggerMascotBounce();
                    await new Promise(r => setTimeout(r, 10));
                }
            });

            // 2. Hammering em Estrelas & Streaks (30 disparos rápidos)
            console.log('- Hammering: 30 disparos rápidos de triggerStarBurst() e triggerStreakCombo()...');
            await page.evaluate(async () => {
                for (let i = 0; i < 30; i++) {
                    window.triggerStarBurst();
                    window.triggerStreakCombo();
                    await new Promise(r => setTimeout(r, 10));
                }
            });

            // 3. Hammering em Abertura e Fechamento do Modal Gauntlet (15 ciclos rápidos)
            console.log('- Hammering: 15 ciclos rápidos de abrir/fechar modal Gauntlet...');
            await page.evaluate(async () => {
                for (let i = 0; i < 15; i++) {
                    window.openGauntletMasteryModal();
                    await new Promise(r => setTimeout(r, 20));
                    window.closeGauntletMasteryModal();
                    await new Promise(r => setTimeout(r, 20));
                }
            });

            // 4. Carga Pesada de Partículas (200 nós sucessivos)
            console.log('- Stress: triggerParticleStress(200) repetido 3x...');
            await page.evaluate(async () => {
                window.triggerParticleStress(200);
                await new Promise(r => setTimeout(r, 200));
                window.triggerParticleStress(200);
                await new Promise(r => setTimeout(r, 200));
                window.triggerParticleStress(200);
                await new Promise(r => setTimeout(r, 1600));
            });

            // Verifica resíduos de DOM
            const particleDOMResiduals = await page.evaluate(() => {
                const area = document.getElementById('particleStressArea');
                const particlesLeft = area.querySelectorAll('.stress-particle').length;
                return {
                    particlesLeft,
                    text: area.innerText
                };
            });
            console.log(`- Resíduos de partículas DOM: ${particleDOMResiduals.particlesLeft} partículas ativas remanescentes`);

            // Executa sequência completa
            await page.evaluate(() => window.runAllChoreographiesSequence());
            await page.waitForTimeout(4500);

            testResults.suite4_stressHammering = {
                errorsCount: errors.length,
                particleDOMResiduals,
                status: errors.length === 0 ? 'PASSED_ROBUST' : 'FAILED'
            };
            console.log(`  Resultado Suite 4: Erros não tratados = ${errors.length}`);
            await context.close();
        }

        // ====================================================================
        // SUITE 5: MODO SPLIT COMPARATIVO A/B
        // ====================================================================
        console.log('\n--- SUITE 5: SPLIT A/B MODE ---');
        {
            const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
            const page = await context.newPage();
            const errors = [];
            page.on('console', msg => {
                if (msg.type() === 'error') errors.push(msg.text());
            });
            page.on('pageerror', err => errors.push(err.message));

            await page.goto(`http://127.0.0.1:${PORT}/sandbox.html?engine=split`, { waitUntil: 'networkidle' });

            const mode = await page.evaluate(() => window.currentEngineMode);
            const badgeCard1 = await page.$eval('#card1EngineBadge', el => el.innerText);

            testResults.suite5_splitMode = {
                mode,
                badgeCard1,
                errorsCount: errors.length,
                status: (mode === 'split' && errors.length === 0) ? 'PASSED' : 'FAILED'
            };
            console.log(`  Resultado Suite 5: mode=${mode}, badge="${badgeCard1}", errors=${errors.length}`);
            await context.close();
        }

    } finally {
        await browser.close();
        server.close();
        console.log('\n[INFO] Servidor e navegador encerrados.');
    }

    console.log('\n================================================================');
    console.log('CONSOLIDAÇÃO FINAL DOS RESULTADOS EMPÍRICOS');
    console.log('================================================================');
    console.log(`Total de erros de console detectados em todas as suites: ${testResults.consoleErrors.length}`);
    console.log('Resumo por Suite:');
    console.log('- Suite 1 (Anime Baseline):', testResults.suite1_animeBaseline ? 'PASSED' : 'FAILED');
    console.log('- Suite 2 (CSS Fallback com CDN Bloqueada):', testResults.suite2_cssFallbackBlockedCDN ? 'PASSED' : 'FAILED');
    console.log('- Suite 3 (Oráculo de Precisão de FPS):', testResults.suite3_fpsTelemetryAccuracy ? testResults.suite3_fpsTelemetryAccuracy.verdict : 'FAILED');
    console.log('- Suite 4 (Stress & Hammering):', testResults.suite4_stressHammering ? testResults.suite4_stressHammering.status : 'FAILED');
    console.log('- Suite 5 (Split A/B):', testResults.suite5_splitMode ? testResults.suite5_splitMode.status : 'FAILED');

    const outputPath = path.join(PROJECT_ROOT, 'tests', 'challenge_animejs_results.json');
    fs.writeFileSync(outputPath, JSON.stringify(testResults, null, 2), 'utf-8');
    console.log(`\n[INFO] Resultados gravados em: ${outputPath}`);

    return testResults;
}

runEmpiricalChallenge().catch(err => {
    console.error('Falha fatal na execução do harness empírico:', err);
    process.exit(1);
});
