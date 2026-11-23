// tests/smoke_test_suite.js - Suíte de Smoke Test Automatizado & Deep Debugging End-to-End
const http = require('http');
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT_DIR = path.resolve(__dirname, '..');

// MIME types para o servidor estático
const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.webmanifest': 'application/manifest+json'
};

function startServer() {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            const parsedUrl = new URL(req.url, 'http://127.0.0.1');
            let filePath = path.join(ROOT_DIR, decodeURIComponent(parsedUrl.pathname));
            
            if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
                filePath = path.join(filePath, 'index.html');
            }

            if (!fs.existsSync(filePath)) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
                return;
            }

            const ext = path.extname(filePath).toLowerCase();
            const contentType = MIME_TYPES[ext] || 'application/octet-stream';

            try {
                const data = fs.readFileSync(filePath);
                res.writeHead(200, {
                    'Content-Type': contentType,
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                });
                res.end(data);
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 Server Error: ' + err.message);
            }
        });

        server.listen(0, '127.0.0.1', () => {
            const port = server.address().port;
            resolve({ server, port, baseUrl: `http://127.0.0.1:${port}` });
        });

        server.on('error', reject);
    });
}

// Coletor de métricas de testes
const Results = {
    total: 0,
    passed: 0,
    failed: 0,
    assertions: [],
    consoleErrors: [],
    networkErrors: [],
    pageTimings: {}
};

function assert(condition, message, details = '') {
    Results.total++;
    if (condition) {
        Results.passed++;
        Results.assertions.push({ status: 'PASS', message, details });
        console.log(`  ✔ PASS: ${message}`);
    } else {
        Results.failed++;
        Results.assertions.push({ status: 'FAIL', message, details });
        console.error(`  ❌ FAIL: ${message} ${details ? '(' + details + ')' : ''}`);
    }
}

async function runSmokeTests() {
    console.log('====================================================================');
    console.log('  KUMONGEN · SUÍTE DE SMOKE TEST E DEBUGGING PROFUNDO (E2E)');
    console.log('====================================================================\n');

    const { server, baseUrl } = await startServer();
    console.log(`⚡ Servidor de testes inicializado em: ${baseUrl}\n`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) KumonGenSmokeTest/4.0'
    });

    const page = await context.newPage();

    // Rastreia erros de console
    page.on('console', msg => {
        if (msg.type() === 'error') {
            const text = msg.text();
            if (!text.includes('speechSynthesis') && !text.includes('AudioContext') && !text.includes('play() failed')) {
                Results.consoleErrors.push({ url: page.url(), text });
                console.warn(`    ⚠️ Console Error [${page.url()}]: ${text}`);
            }
        }
    });

    // Rastreia exceções de página não tratadas
    page.on('pageerror', err => {
        Results.consoleErrors.push({ url: page.url(), text: err.message, stack: err.stack });
        console.error(`    💥 Page Exception [${page.url()}]: ${err.message}`);
    });

    // Rastreia falhas 404/500 de rede
    page.on('response', resp => {
        const status = resp.status();
        const url = resp.url();
        if (status >= 400 && url.startsWith(baseUrl)) {
            Results.networkErrors.push({ url, status });
            console.error(`    ❌ HTTP ${status} em: ${url}`);
        }
    });

    try {
        // -------------------------------------------------------------
        // CENÁRIO 1: HUB PRINCIPAL (index.html)
        // -------------------------------------------------------------
        console.log('[CENÁRIO 1] Validação da Landing Page / Hub Principal (index.html)');
        const t0Index = Date.now();
        const resIndex = await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
        Results.pageTimings['index.html'] = Date.now() - t0Index;

        assert(resIndex.status() === 200, 'index.html responde com status HTTP 200');
        await page.waitForTimeout(400);

        const hasMatLink = await page.$('a[href="matematica.html"]') !== null;
        const hasPorLink = await page.$('a[href="portugues.html"]') !== null;
        const hasEngLink = await page.$('a[href="ingles.html"]') !== null;
        const hasTabLink = await page.$('a[href*="tablet.html"]') !== null;
        assert(hasMatLink && hasPorLink && hasEngLink && hasTabLink, 'Todos os 4 atalhos centrais (Matemática, Português, Inglês, Tablet) existem na Home');

        // Teste real de abertura da Área dos Pais / Boletim na Home (sem falso verde)
        const homeParentBtn = await page.$('#homeParentAreaBtn');
        assert(homeParentBtn !== null, 'Botão Área dos Pais (#homeParentAreaBtn) existe na Home');
        const homeEvoWorks = await page.evaluate(() => {
            if (!window.StudentProfileEngine || typeof window.StudentProfileEngine.showEvolutionModal !== 'function') return false;
            window.StudentProfileEngine.showEvolutionModal();
            const modal = document.getElementById('studentProfileManagerModal');
            const opened = modal !== null && modal.style.display !== 'none';
            const closeBtn = document.getElementById('btnCloseEvolutionModal');
            if (closeBtn) closeBtn.click();
            return opened;
        });
        assert(homeEvoWorks, 'Modal do Boletim de Evolução abre e fecha corretamente a partir da Home');

        // -------------------------------------------------------------
        // CENÁRIO 2: GERADOR DE MATEMÁTICA (matematica.html)
        // -------------------------------------------------------------
        console.log('\n[CENÁRIO 2] Gerador de Matemática (matematica.html)');
        const t0Mat = Date.now();
        const resMat = await page.goto(`${baseUrl}/matematica.html`, { waitUntil: 'domcontentloaded' });
        Results.pageTimings['matematica.html'] = Date.now() - t0Mat;

        assert(resMat.status() === 200, 'matematica.html responde com status HTTP 200');
        await page.waitForTimeout(400);

        await page.evaluate(() => {
            const tut = document.getElementById('kumonTutorialModal');
            if (tut) tut.remove();
        });

        const hasA4SheetMat = await page.$('#a4-sheet') !== null;
        assert(hasA4SheetMat, 'Elemento #a4-sheet (preview do caderno) existe em matematica.html');

        const hasPrintBtnMat = await page.$('button[onclick*="printSheet()"]') !== null;
        const hasPdfBtnMat = await page.$('button[onclick*="generatePDF()"]') !== null;
        assert(hasPrintBtnMat && hasPdfBtnMat, 'Botões [IMPRIMIR] e [BAIXAR PDF] presentes na barra lateral de Matemática');

        // Teste 9b: Slider de Dificuldade Progressiva no PC (M2 Degrau 12 -> + até 20 + sync link Tablet)
        const pcSliderMatTest = await page.evaluate(() => {
            const slider = document.getElementById('pcDifficultySlider');
            if (!slider) return { found: false };

            slider.value = '12';
            slider.dispatchEvent(new Event('input', { bubbles: true }));

            const badgeText = document.getElementById('pcStageBadge')?.textContent || '';
            const tabletHref = document.getElementById('matPracticeTabletBtn')?.getAttribute('href') || '';
            const rowTexts = Array.from(document.querySelectorAll('#a4-sheet .exercise-row')).map((el) => el.textContent || '');
            const hasExtendedOperand = rowTexts.some((txt) => /\b1[0-9]\b|\b2[0-3]\b/.test(txt));

            // Restaura Degrau 1 para não afetar próximos cenários
            slider.value = '1';
            slider.dispatchEvent(new Event('input', { bubbles: true }));

            return {
                found: true,
                badgeText,
                tabletHref,
                rowCount: rowTexts.length,
                hasExtendedOperand
            };
        });
        await page.waitForTimeout(250);
        assert(
            pcSliderMatTest.found &&
            pcSliderMatTest.badgeText.includes('12/') &&
            pcSliderMatTest.tabletHref.includes('stage=12') &&
            pcSliderMatTest.rowCount >= 8 &&
            pcSliderMatTest.hasExtendedOperand,
            `Slider PC (M2 Degrau 12) atualizou badge (${pcSliderMatTest.badgeText}), gerou contas estendidas e sincronizou link Tablet (${pcSliderMatTest.tabletHref})`
        );

        // Troca de nível dinâmica: M10 (Frações)
        const switchedToM10 = await page.evaluate(() => {
            if (window.selectLevel) {
                window.selectLevel('m10');
                return true;
            }
            return false;
        });
        await page.waitForTimeout(400);
        assert(switchedToM10, 'Função window.selectLevel("m10") executada com sucesso');

        const fractionItemsCount = await page.evaluate(() => {
            return document.querySelectorAll('#a4-sheet .exercise-row').length;
        });
        assert(fractionItemsCount >= 8, `Folha A4 renderizou ${fractionItemsCount} exercícios de fração no nível M10`);

        // Teste 9c: Impressão Multipágina (#kumon-print-spool) + Gabarito + Modo Turma + Anti-Premature Cleanup (>950ms)
        const printSheetTested = await page.evaluate(async () => {
            const origPrint = window.print;
            let printCalled = false;
            let spoolCount = 0;
            let hasAnswerKeyInSpool = false;
            let hasBlankNameInSpool = false;

            const pagesEl = document.getElementById('pagesPerBook');
            if (pagesEl) {
                pagesEl.value = '4';
                pagesEl.dispatchEvent(new Event('change', { bubbles: true }));
            }
            if (window.KumonGen && typeof window.KumonGen.setPedagogicalConfig === 'function') {
                window.KumonGen.setPedagogicalConfig({ answerKey: true, blankNameForClass: true, classVariations: 1 });
            }
            if (window.refreshPreview) window.refreshPreview();

            window.print = () => {
                printCalled = true;
                const sp = document.getElementById('kumon-print-spool');
                if (sp) {
                    spoolCount = sp.querySelectorAll('.kumon-print-sheet').length;
                    hasAnswerKeyInSpool = sp.querySelector('.answer-key-sheet') !== null;
                    hasBlankNameInSpool = (sp.textContent || '').includes('____________________');
                }
            };
            try {
                if (window.printSheet) window.printSheet();
                window.print = origPrint;

                // Aguarda 950ms SEM disparar afterprint: spool deve permanecer intacto (prova fim do bug setTimeout 800ms)
                await new Promise(r => setTimeout(r, 950));
                const stillAliveAfter950ms = document.getElementById('kumon-print-spool') !== null && document.body.classList.contains('kumon-multiprint-active');

                // Dispara afterprint real e valida limpeza imediata
                window.dispatchEvent(new Event('afterprint'));
                const cleanedAfterPrintEvent = document.getElementById('kumon-print-spool') === null && !document.body.classList.contains('kumon-multiprint-active');

                // Valida também modal legado showParentalControlModal (botões Perfis/Boletim/+Novo mantêm onclick)
                window.KumonGen.showParentalControlModal();
                const pm = document.getElementById('parental-modal');
                const navButtonsPreserved = pm
                    ? Array.from(pm.querySelectorAll('button')).some(b => (b.getAttribute('onclick') || '').includes('showEvolutionModal'))
                    : false;
                if (pm) pm.remove();

                if (pagesEl) {
                    pagesEl.value = '2';
                    pagesEl.dispatchEvent(new Event('change', { bubbles: true }));
                }
                if (window.KumonGen && typeof window.KumonGen.setPedagogicalConfig === 'function') {
                    window.KumonGen.setPedagogicalConfig({ answerKey: false, blankNameForClass: false, classVariations: 1 });
                }
                if (window.refreshPreview) window.refreshPreview();
                return { printCalled, spoolCount, hasAnswerKeyInSpool, hasBlankNameInSpool, stillAliveAfter950ms, cleanedAfterPrintEvent, navButtonsPreserved };
            } catch (e) {
                window.print = origPrint;
                return { printCalled: false, error: e.message };
            }
        });
        assert(
            printSheetTested.printCalled &&
            printSheetTested.spoolCount === 3 &&
            printSheetTested.hasAnswerKeyInSpool &&
            printSheetTested.hasBlankNameInSpool &&
            printSheetTested.stillAliveAfter950ms &&
            printSheetTested.cleanedAfterPrintEvent &&
            printSheetTested.navButtonsPreserved,
            `window.printSheet() gerou spool multipágina (${printSheetTested.spoolCount} folhas + Gabarito + Nome em Branco), sobreviveu >950ms sem destruição prematura e limpou no afterprint`,
            JSON.stringify(printSheetTested)
        );

        // Teste 9d (P0-1): URL ?mode=weakness&level=m2 ativa realmente sheetSourceMode='weakness_only' e acordeão aberto
        await page.goto(`${baseUrl}/matematica.html?mode=weakness&level=m2`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(350);
        const weaknessUrlOk = await page.evaluate(() => {
            const cfg = window.KumonGen && typeof window.KumonGen.getPedagogicalConfig === 'function'
                ? window.KumonGen.getPedagogicalConfig()
                : {};
            const accOpen = !!document.getElementById('paperAssemblerAccordion')?.open;
            const weakBtnActive = !!document.querySelector('.pc-sheet-mode-btn[data-sheet-mode="weakness_only"].bg-blue-600');
            return { ok: cfg.sheetSourceMode === 'weakness_only' && accOpen && weakBtnActive, mode: cfg.sheetSourceMode, accOpen, weakBtnActive };
        });
        assert(weaknessUrlOk.ok, 'Link "Folha de Reforço" (?mode=weakness&level=m2) ativa modo Só Fraquezas e abre o montador A4', JSON.stringify(weaknessUrlOk));

        // -------------------------------------------------------------
        // CENÁRIO 3: GERADOR DE PORTUGUÊS (portugues.html)
        // -------------------------------------------------------------
        console.log('\n[CENÁRIO 3] Gerador de Português (portugues.html)');
        const t0Por = Date.now();
        const resPor = await page.goto(`${baseUrl}/portugues.html`, { waitUntil: 'domcontentloaded' });
        Results.pageTimings['portugues.html'] = Date.now() - t0Por;

        assert(resPor.status() === 200, 'portugues.html responde com status HTTP 200');
        await page.waitForTimeout(400);

        await page.evaluate(() => {
            const tut = document.getElementById('kumonTutorialModal');
            if (tut) tut.remove();
        });

        // Alterna para nível P8 (Frases curtas com pauta caligráfica)
        await page.evaluate(() => {
            if (window.selectLevel) window.selectLevel('p8');
        });
        await page.waitForTimeout(400);

        const hasP8Rows = await page.evaluate(() => {
            return document.querySelectorAll('#a4-sheet .exercise-row').length >= 8;
        });
        assert(hasP8Rows, 'Nível P8 (Frases com pauta) renderizado na folha com 8+ itens');

        // Alterna para nível P4 (Rimas e palavras longas)
        await page.evaluate(() => {
            if (window.selectLevel) window.selectLevel('p4');
        });
        await page.waitForTimeout(300);

        const hasP4Rows = await page.evaluate(() => {
            return document.querySelectorAll('#a4-sheet .exercise-row').length >= 8;
        });
        assert(hasP4Rows, 'Nível P4 (Palavras de 3 a 4 sílabas) renderizado com sucesso');

        // -------------------------------------------------------------
        // CENÁRIO 4: GERADOR DE INGLÊS (ingles.html)
        // -------------------------------------------------------------
        console.log('\n[CENÁRIO 4] Gerador de Inglês (ingles.html)');
        const t0Eng = Date.now();
        const resEng = await page.goto(`${baseUrl}/ingles.html`, { waitUntil: 'domcontentloaded' });
        Results.pageTimings['ingles.html'] = Date.now() - t0Eng;

        assert(resEng.status() === 200, 'ingles.html responde com status HTTP 200');
        await page.waitForTimeout(400);

        await page.evaluate(() => {
            const tut = document.getElementById('kumonTutorialModal');
            if (tut) tut.remove();
        });

        // Alterna para nível I7 (Opostos)
        await page.evaluate(() => {
            if (window.selectLevel) window.selectLevel('i7');
        });
        await page.waitForTimeout(400);

        const hasI7Rows = await page.evaluate(() => {
            return document.querySelectorAll('#a4-sheet .exercise-row').length >= 8;
        });
        assert(hasI7Rows, 'Nível I7 (Opostos / Antonyms) renderizado com sucesso na folha A4');

        // -------------------------------------------------------------
        // CENÁRIO 5: TABLET PLAYER INTERATIVO (tablet.html)
        // -------------------------------------------------------------
        console.log('\n[CENÁRIO 5] Tablet Player Interativo (tablet.html)');
        const t0Tab = Date.now();
        const resTab = await page.goto(`${baseUrl}/tablet.html?subject=matematica&level=m2`, { waitUntil: 'domcontentloaded' });
        Results.pageTimings['tablet.html'] = Date.now() - t0Tab;

        assert(resTab.status() === 200, 'tablet.html responde com status HTTP 200');
        await page.waitForTimeout(600);

        const hasFocusCard = await page.$('#focusCard') !== null;
        const hasKeypad = await page.$('#keypadWrapper') !== null;
        const hasMascot = await page.$('#mascotCompanionWrapper') !== null;
        const hasEvoBtn = await page.$('#headerEvolutionBtn') !== null;
        assert(hasFocusCard && hasKeypad && hasMascot && hasEvoBtn, 'Elementos vitais do Tablet (Card de Foco, Teclado Touch, Mascote Jade, Botão Evolução) presentes');

        // Simulação de resolução de questão com o teclado virtual via TabletPlayer
        const solvedOneItem = await page.evaluate(() => {
            const player = window.TabletPlayer;
            if (!player || !player.Session || !player.Session.items) return false;

            const curItem = player.Session.items[player.Session.currentIndex];
            let ans = null;
            if (curItem.type === 'math') {
                ans = (curItem.operator === '+') ? (curItem.operand1 + curItem.operand2) : (curItem.operand1 - curItem.operand2);
            } else if (curItem.value !== undefined) {
                ans = curItem.value;
            }

            if (ans === null || ans === undefined) return false;

            const ansStr = ans.toString();
            for (const ch of ansStr) {
                player.handleKeypadPress(ch);
            }
            player.handleKeypadPress('enter');
            return true;
        });
        await page.waitForTimeout(500);
        assert(solvedOneItem, 'Questão interativa respondida e validada via teclado touch do TabletPlayer');

        // Teste de abertura do Boletim de Evolução no Tablet
        const clickedEvoTab = await page.evaluate(() => {
            const btn = document.getElementById('headerEvolutionBtn');
            if (btn) {
                btn.click();
                return true;
            }
            return false;
        });
        await page.waitForTimeout(400);

        const isEvoModalOpen = await page.evaluate(() => {
            const modal = document.getElementById('studentProfileManagerModal');
            return modal !== null && modal.style.display !== 'none';
        });
        assert(clickedEvoTab && isEvoModalOpen, 'Botão de evolução no cabeçalho do Tablet abre o Boletim (studentProfileManagerModal)');

        // Alterna entre as abas do Boletim clicando nos botões de aba
        const switchedTabs = await page.evaluate(() => {
            const modal = document.getElementById('studentProfileManagerModal');
            if (!modal) return false;
            const tabMatrix = modal.querySelector('#tabBtnMatrix');
            const tabHistory = modal.querySelector('#tabBtnHistory');
            const tabMetrics = modal.querySelector('#tabBtnMetrics');
            if (tabMatrix && tabHistory && tabMetrics) {
                tabMatrix.click();
                tabHistory.click();
                tabMetrics.click();
                return true;
            }
            return false;
        });
        assert(switchedTabs, 'Navegação entre abas do Boletim (Métricas, 25 Níveis, Histórico) executada sem falhas');

        // Verifica presença do Resumo de 15s para os Pais no Boletim
        const hasParent15SecSummary = await page.evaluate(() => {
            return document.getElementById('parent15SecSummaryCard') !== null;
        });
        assert(hasParent15SecSummary, 'Card "Resumo de 15s para os Pais" (#parent15SecSummaryCard) presente no Boletim de Evolução');

        // Fecha modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);

        // Teste do Sistema de Camarim do Mascote (AvatarWardrobe GEN 3.0)
        const wardrobeTest = await page.evaluate(() => {
            const aw = window.AvatarWardrobe;
            const pe = window.StudentProfileEngine;
            if (!aw || !pe) return { ok: false, reason: 'missing_engine' };
            const active = pe.getActive();
            if (!active) return { ok: false, reason: 'no_active_student' };

            // Concede 20 estrelas para testar desbloqueio sem mutar total histórico após compra
            active.gamification = active.gamification || {};
            active.gamification.stars = 20;
            active.wardrobe = { unlocked: ['hat_crown_starter'], equipped: { hat: 'hat_crown_starter', glasses: null, outfit: null, aura: null }, starsSpent: 0 };
            pe.update(active.id, { gamification: active.gamification, wardrobe: active.wardrobe });

            const beforeTotal = aw.getTotalEarnedStars();
            const beforeSpendable = aw.getSpendableStars();
            const unlockRes = aw.unlockItem('glasses_star');
            const afterTotal = aw.getTotalEarnedStars();
            const afterSpendable = aw.getSpendableStars();

            aw.openModal();
            const modalEl = document.getElementById('avatarWardrobeModal');
            const hasSvgLayer = modalEl ? modalEl.querySelectorAll('svg.avatar-layer-svg').length >= 1 : false;
            if (modalEl) modalEl.remove();

            return {
                ok: unlockRes && unlockRes.success && beforeTotal === 20 && afterTotal === 20 && beforeSpendable === 20 && afterSpendable === 5 && hasSvgLayer,
                catalogSize: aw.CATALOG ? aw.CATALOG.length : 0
            };
        });
        assert(wardrobeTest.ok && wardrobeTest.catalogSize >= 12, `Motor AvatarWardrobe funcional (${wardrobeTest.catalogSize} acessórios SVG, economia de estrelas preserva total histórico)`);

        // Teste do Parent Gate e Revisão Multi-Matéria
        const parentGateAndReviewTest = await page.evaluate(() => {
            const pe = window.StudentProfileEngine;
            const tp = window.TabletPlayer;
            if (!pe || typeof pe.requireParentGate !== 'function' || !tp || !tp.ReviewNotebook) return false;

            // Testa abertura do Parent Gate
            pe.requireParentGate(() => {}, 'Teste de Segurança');
            const gateModal = document.getElementById('kumonParentGateModal');
            const gateOpened = gateModal !== null;
            if (gateModal) gateModal.remove();

            // Testa Revisão Multi-Matéria (Matemática + Inglês)
            tp.ReviewNotebook.saveItems([]);
            tp.ReviewNotebook.addItem({ type: 'math', operand1: 3, operator: '+', operand2: 2 }, 'matematica', 'm2');
            tp.ReviewNotebook.addItem({ type: 'opposite', word: 'BIG', target: 'SMALL', options: ['SMALL', 'HOT'] }, 'ingles', 'i7');
            tp.ReviewNotebook.startReviewSession();
            const firstSub = tp.Session.subjectKey;
            tp.Session.currentIndex = 1;
            tp.renderCurrentQuestion();
            const secondSub = tp.Session.subjectKey;
            tp.ReviewNotebook.saveItems([]);
            tp.Session.isReviewMode = false;

            return gateOpened && firstSub === 'matematica' && secondSub === 'ingles';
        });
        assert(parentGateAndReviewTest, 'Parent Gate anti-exclusão e Caderno de Revisão Multi-Matéria (Matemática → Inglês) validados');

        // Teste 11 (KumonGen 4.0): Trilha M2, Slider na Gaveta do Tablet, Progressão Automática + Ranking
        const progressionAndRankingTest = await page.evaluate(() => {
            const kp = window.KumonProgression;
            const pe = window.StudentProfileEngine;
            const tp = window.TabletPlayer;
            const ks = window.KumonSubjects;
            if (!kp || !pe || !tp || !ks || !ks.matematica) return { ok: false, reason: 'missing_modules' };

            const m2Stages = kp.getStagesForLevel('matematica', 'm2');
            if (!Array.isArray(m2Stages) || m2Stages.length !== 13) return { ok: false, reason: 'm2_stages_count' };

            const lvlM2 = ks.matematica.levels.find(l => l.id === 'm2');
            const itemsS12 = ks.matematica.generate(lvlM2, 10, { stage: 12 });
            const itemsS13 = ks.matematica.generate(lvlM2, 10, { stage: 13 });
            const s12HasExtended = itemsS12.some(it => (it.operand1 + it.operand2) > 10);
            const s13HasMissingHole = itemsS13.some(it => it.missingPos === 'op1' || it.missingPos === 'op2');

            // Testa Gaveta Deslizante + Slider no Tablet regenerando questões para +3
            pe.setLevelStage('matematica', 'm2', 1);
            tp.Session.subjectKey = 'matematica';
            tp.Session.levelId = 'm2';
            tp.Session.currentStage = 1;
            tp.startRound();
            tp.openDrawer();
            const drawerOpen = document.getElementById('tabletSettingsDrawer').classList.contains('open');
            const tabletSlider = document.getElementById('tabletDifficultySlider');
            if (!tabletSlider) return { ok: false, reason: 'no_tablet_slider' };
            tabletSlider.value = '3';
            tabletSlider.dispatchEvent(new Event('input', { bubbles: true }));
            const afterSliderOp2 = tp.Session.items[tp.Session.currentIndex] ? tp.Session.items[tp.Session.currentIndex].operand2 : null;
            tp.closeDrawer();

            // Testa Promoção Automática de Degrau após fechar rodada com 100% no degrau 1
            pe.setLevelStage('matematica', 'm2', 1);
            tp.Session.currentStage = 1;
            tp.Session.autoAdvance = true;
            tp.Session.initialItemsCount = 10;
            tp.Session.roundCorrectFirstAttempt = 10;
            tp.Session.elapsedSeconds = 42;
            tp.Session.targetSctSeconds = 300;
            tp.finishRound();

            const promotedStage = pe.getLevelStage('matematica', 'm2');
            const summaryBannerExists = document.getElementById('roundProgressionBanner') !== null;
            const leagueAfter = pe.getActiveLeagueInfo();
            const rankingBoard = pe.getActiveRanking();

            const closeSum = document.getElementById('closeSummaryBtn');
            if (closeSum) closeSum.click();

            // Valida aba #tabBtnRanking no Boletim de Evolução
            pe.showEvolutionModal(null, { initialEvolutionTab: 'ranking' });
            const rankingBoardEl = document.getElementById('kumonPersonalRankingBoard');
            const hasRankingUI = rankingBoardEl !== null && rankingBoardEl.textContent.includes('Finho Aprendiz');
            const closeEvo = document.getElementById('btnCloseEvolutionModal');
            if (closeEvo) closeEvo.click();

            return {
                ok: drawerOpen && afterSliderOp2 === 3 && s12HasExtended && s13HasMissingHole && promotedStage === 2 && summaryBannerExists && leagueAfter.xp > 0 && rankingBoard.entries.length >= 5 && hasRankingUI,
                drawerOpen,
                afterSliderOp2,
                s12HasExtended,
                s13HasMissingHole,
                promotedStage,
                summaryBannerExists,
                xp: leagueAfter.xp,
                hasRankingUI
            };
        });
        assert(progressionAndRankingTest.ok, `Progressão Automática M2, Slider na Gaveta (+3), XP/Recorde e Ranking Dual validados (degrau promovido: ${progressionAndRankingTest.promotedStage}, XP: ${progressionAndRankingTest.xp})`, JSON.stringify(progressionAndRankingTest));

        // Teste 12 (KumonGen 4.5): Senha Híbrida (Clarice -> eciralc + SHA-256), Leitner Espaçado, Recuo Protetor, Fraquezas & Link Turma
        const adaptiveParentTest = await page.evaluate(() => {
            const pe = window.StudentProfileEngine;
            const kp = window.KumonProgression;
            const tp = window.TabletPlayer;
            const ks = window.KumonSubjects;
            if (!pe || !kp || !tp || !ks || !ks.matematica) return { ok: false, reason: 'missing_modules' };

            const clarice = pe.create({ name: 'Clarice', ageTier: 'age_6_7', mascot: 'jaguar' });
            if (!clarice) return { ok: false, reason: 'create_clarice_failed' };

            // 1. Valida senha inicial invertida (Clarice -> eciralc)
            const revOk = pe.verifyParentPassword('eciralc', clarice) === true;
            const revReject = pe.verifyParentPassword('clarice', clarice) === false;

            // 2. Telemetria de erro e hesitação lenta + caixas Leitner (Box 0 -> Box 1 -> Dominado)
            const hardItem = { type: 'math', operand1: 7, operator: '+', operand2: 8, result: 15 };
            tp.ReviewNotebook.saveItems([]);
            tp.ReviewNotebook.addItem(hardItem, 'matematica', 'm2', { reason: 'error', box: 0, latencyMs: 14500 });
            const slowItem = { type: 'math', operand1: 6, operator: '+', operand2: 7, result: 13 };
            tp.ReviewNotebook.addItem(slowItem, 'matematica', 'm2', { reason: 'slow', box: 1, latencyMs: 18500 });

            const countBeforeHits = tp.ReviewNotebook.count();
            const lvlM2 = ks.matematica.levels.find(l => l.id === 'm2');
            const hybridPack = kp.buildAdaptiveSessionItems({
                subjectKey: 'matematica',
                level: lvlM2,
                stage: 7,
                totalCount: 10,
                generatorFn: ks.matematica.generate,
                reviewItems: tp.ReviewNotebook.getItems(),
                currentRoundNumber: 0,
                mixRatio: 0.25
            });
            const hasInjected = hybridPack.injectedReviewCount >= 1 && hybridPack.items.some(it => it._isAdaptiveReview);

            const hit1 = tp.ReviewNotebook.advanceLeitnerOnHit(hardItem, 0);
            const hit2 = tp.ReviewNotebook.advanceLeitnerOnHit(hardItem, 2);
            const leitnerOk = (hit1.promotedToBox === 1 && !hit1.removed) && (hit2.removed === true && hit2.mastered === true);

            // 3. Calibração Bidirecional: recuo protetor automático com <50% + limites parentais min/max + skillTag real (sem hardcode)
            pe.setTrackLimits('matematica', 'm2', 2, 10, clarice.id);
            pe.setLevelStage('matematica', 'm2', 5, clarice.id);
            const realTagInfo = kp.getItemSkillTag({ type: 'math', operand1: 4, operator: '+', operand2: 7, result: 11 }, 'matematica', 'm2');
            const protectRes = kp.evaluateRoundProgression(pe.getById(clarice.id), {
                subjectKey: 'matematica',
                levelId: 'm2',
                currentStage: 5,
                accuracy: 30,
                correctFirst: 3,
                timeSec: 180,
                targetSec: 300,
                itemMetrics: [
                    { skillTag: realTagInfo.tag, skillLabel: realTagInfo.label, subjectKey: 'matematica', levelId: 'm2', latencyMs: 14000, wrongCount: 4, slow: false }
                ]
            });
            const protectOk = protectRes.protectedStepDown === true && protectRes.nextStage === 4;

            // Registra telemetria derivada do motor real e valida Radar de Fraquezas + Modal Área dos Pais
            pe.recordRoundWeaknessTelemetry([
                { skillTag: realTagInfo.tag, skillLabel: realTagInfo.label, subjectKey: 'matematica', levelId: 'm2', latencyMs: 14000, wrongCount: 4, slow: false }
            ], clarice.id);
            const weakSum = pe.getWeaknessSummary(pe.getById(clarice.id), 5);
            const hasWeakPattern = realTagInfo.tag === 'math:+:add_f7' && weakSum.patterns.length >= 1 && weakSum.patterns[0].tag === 'math:+:add_f7';

            // 4. Senha própria SHA-256 local desativa atalho invertido
            const setRes = pe.setCustomParentPassword('Segredo@2026', clarice.id);
            const refreshedClarice = pe.getById(clarice.id);
            const customOk = setRes.success && pe.verifyParentPassword('Segredo@2026', refreshedClarice) && !pe.verifyParentPassword('eciralc', refreshedClarice);

            // Abre painel Pais & Fraquezas desbloqueado
            pe.unlockParentSession(clarice.id);
            pe.showEvolutionModal(clarice.id, { initialEvolutionTab: 'weaknesses' });
            const weakRadarDom = document.getElementById('parentWeaknessRadarBox') !== null;
            const closeEvo2 = document.getElementById('btnCloseEvolutionModal');
            if (closeEvo2) closeEvo2.click();

            // 5. Link offline Turma/Colegas
            const shareUrl = pe.createClassroomShareUrl('matematica', 'm2', 4, 'Turma 1A');
            const tok = new URL(shareUrl).searchParams.get('share');
            const decodedShare = kp.decodeShareMission(tok);
            const shareOk = decodedShare && decodedShare.level === 'm2' && decodedShare.stage === 4 && decodedShare.label === 'Turma 1A';

            // Limpeza do perfil temporário de teste
            pe.deleteStudent(clarice.id);

            return {
                ok: revOk && revReject && countBeforeHits === 2 && hasInjected && leitnerOk && protectOk && hasWeakPattern && customOk && weakRadarDom && shareOk,
                revOk,
                revReject,
                countBeforeHits,
                hasInjected,
                leitnerOk,
                protectOk,
                hasWeakPattern,
                customOk,
                weakRadarDom,
                shareOk
            };
        });
        assert(adaptiveParentTest.ok, 'Senha Híbrida (Clarice->eciralc / SHA-256), Leitner 3-Caixas, Recuo Protetor, Radar de Fraquezas e Link Turma validados', JSON.stringify(adaptiveParentTest));

        // Teste 13 (Adversarial Sprint 5.1 — Hardening Real): reproduz e blinda todos os bugs P0/P1 auditados
        const hardening51Test = await page.evaluate(() => {
            const pe = window.StudentProfileEngine;
            const kp = window.KumonProgression;
            const tp = window.TabletPlayer;
            const ks = window.KumonSubjects;
            if (!pe || !kp || !tp || !ks || !ks.matematica) return { ok: false, reason: 'missing_modules' };

            const activeOrig = pe.getActive();
            const sibling = pe.create({ name: 'Bento', ageTier: 'age_6_7', mascot: 'capivara' });
            // Mantém activeOrig como ativo para testar isolamento de sibling
            pe.setActive(activeOrig.id);

            // A) P1-1: Granularidade real de getItemSkillTag (+7/+8/-7 vs over10)
            const t78 = kp.getItemSkillTag({ type: 'math', operand1: 7, operator: '+', operand2: 8, result: 15 }, 'matematica', 'm2').tag;
            const t127 = kp.getItemSkillTag({ type: 'math', operand1: 12, operator: '-', operand2: 7, result: 5 }, 'matematica', 'm6').tag;
            const tOver = kp.getItemSkillTag({ type: 'math', operand1: 13, operator: '+', operand2: 6, result: 19 }, 'matematica', 'm2').tag;
            const skillTagOk = (t78 === 'math:+:add_f8' && t127 === 'math:-:sub_f7' && tOver === 'math:+:over10');

            // B) P1-2: mixRatio 0.5 (50% revisão intensa) realmente injeta 5/10 (não capado em 3)
            const lvlM2 = ks.matematica.levels.find(l => l.id === 'm2');
            const fakePool = Array.from({ length: 8 }, (_, i) => ({
                id: 'adv_' + i, subjectKey: 'matematica', levelId: 'm2', box: 0, dueRound: 0,
                item: { type: 'math', operand1: i + 1, operator: '+', operand2: 7, result: i + 8 }
            }));
            const pack50 = kp.buildAdaptiveSessionItems({
                subjectKey: 'matematica', level: lvlM2, stage: 2, totalCount: 10,
                generatorFn: ks.matematica.generate, reviewItems: fakePool, currentRoundNumber: 5, mixRatio: 0.5, forceWeaknessMode: false
            });
            const mix50Ok = pack50.injectedReviewCount === 5;

            // C) P1-5 & P1-6: Leitner Box 1 pula 1 rodada completa (dueRound=2) + canonicalKey diferencia missingPos
            const kNorm = tp.ReviewNotebook.getItemCanonicalKey({ type: 'math', operand1: 5, operator: '+', operand2: 4 });
            const kHole = tp.ReviewNotebook.getItemCanonicalKey({ type: 'math', operand1: 5, operator: '+', operand2: 4, missingPos: 'op1' });
            const keyOk = kNorm !== kHole && kHole.includes(':op1');

            tp.ReviewNotebook.saveItems([]);
            const lItem = { type: 'math', operand1: 8, operator: '+', operand2: 9, result: 17 };
            tp.ReviewNotebook.addItem(lItem, 'matematica', 'm2', { reason: 'error', box: 0 });
            tp.ReviewNotebook.advanceLeitnerOnHit(lItem, 0);
            const savedAfterHit = tp.ReviewNotebook.getItems()[0];
            const packRound1 = kp.buildAdaptiveSessionItems({
                subjectKey: 'matematica', level: lvlM2, stage: 2, totalCount: 10,
                generatorFn: ks.matematica.generate, reviewItems: tp.ReviewNotebook.getItems(), currentRoundNumber: 1, mixRatio: 0.25
            });
            const packRound2 = kp.buildAdaptiveSessionItems({
                subjectKey: 'matematica', level: lvlM2, stage: 2, totalCount: 10,
                generatorFn: ks.matematica.generate, reviewItems: tp.ReviewNotebook.getItems(), currentRoundNumber: 2, mixRatio: 0.25
            });
            const leitnerSpacingOk = savedAfterHit && savedAfterHit.dueRound === 2 && packRound1.injectedReviewCount === 0 && packRound2.injectedReviewCount === 1;

            // D) P0-5: isReviewMode com erro prévio NÃO remove item; finishRound com 30% no degrau 1 NÃO marca mastered=true
            tp.Session.isReviewMode = true;
            tp.Session.isGauntletPhase = false;
            tp.Session.isGauntlet = false;
            tp.Session.items = [Object.assign({}, lItem, { _reviewSubjectKey: 'matematica', _reviewLevelId: 'm2' })];
            tp.Session.currentIndex = 0;
            tp.Session.currentAttempts = 2; // Errou antes!
            tp.Session.isTransitionLocked = false;
            tp.registerSuccess(null);
            if (tp.Session.transitionTimeout) { clearTimeout(tp.Session.transitionTimeout); tp.Session.transitionTimeout = null; }
            tp.Session.isTransitionLocked = false;
            const keptAfterWrongInReview = tp.ReviewNotebook.count() === 1;
            tp.Session.isReviewMode = false;

            const freshKid = pe.create({ name: 'Lia', ageTier: 'age_6_7', mascot: 'golfinho' });
            pe.setLevelStage('matematica', 'm2', 1, freshKid.id);
            tp.Session.subjectKey = 'matematica';
            tp.Session.levelId = 'm2';
            tp.Session.currentStage = 1;
            tp.Session.initialItemsCount = 10;
            tp.Session.roundCorrectFirstAttempt = 3; // 30%
            tp.Session.elapsedSeconds = 120;
            tp.Session.targetSctSeconds = 300;
            tp.finishRound();
            const closeSum = document.getElementById('closeSummaryBtn');
            if (closeSum) closeSum.click();
            const liaAfter = pe.getById(freshKid.id);
            const noFalseMasteryOk = !(liaAfter.mastery && liaAfter.mastery.matematica && liaAfter.mastery.matematica.m2 && liaAfter.mastery.matematica.m2.mastered);

            // E) P1-3 & P1-4: setTrackLimits isola sibling, trava slider do Tablet [3..6] e sincroniza autoAdvance
            pe.setLevelStage('matematica', 'm2', 1, activeOrig.id);
            pe.setLevelStage('matematica', 'm2', 1, sibling.id);
            pe.setTrackLimits('matematica', 'm2', 3, 6, sibling.id);
            const isolatedLimitsOk = pe.getLevelStage('matematica', 'm2', pe.getById(sibling.id)) === 3 && pe.getLevelStage('matematica', 'm2', pe.getById(activeOrig.id)) === 1;

            pe.setActive(sibling.id);
            tp.Session.subjectKey = 'matematica';
            tp.Session.levelId = 'm2';
            tp.syncDrawerUI();
            tp.applyStageChange(13, false);
            const sliderEl = document.getElementById('tabletDifficultySlider');
            const autoChk = document.getElementById('drawerAutoAdvanceToggle');
            if (autoChk) {
                autoChk.checked = false;
                autoChk.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const autoSyncOk = pe.getParentControls(pe.getById(sibling.id)).autoAdvance === false;
            if (autoChk) {
                autoChk.checked = true;
                autoChk.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const sliderClampedOk = sliderEl && sliderEl.min === '3' && sliderEl.max === '6' && tp.Session.currentStage === 6 && autoSyncOk;

            // F) P0-2: keydown dentro de #parentPwdInput NÃO vaza para o exercício da criança
            tp.Session.currentInput = '';
            tp.Session.currentAttempts = 0;
            tp.Session.isTransitionLocked = false;
            pe.lockParentArea(sibling.id);
            pe.requireParentPassword(() => {}, { studentId: sibling.id, forcePrompt: true });
            const pwdInput = document.getElementById('parentPwdInput');
            if (pwdInput) {
                pwdInput.focus();
                pwdInput.dispatchEvent(new KeyboardEvent('keydown', { key: '5', bubbles: true }));
                pwdInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            }
            const pwdModal = document.getElementById('kumonParentPasswordModal');
            if (pwdModal) pwdModal.remove();
            const noKeyLeakOk = tp.Session.currentInput === '' && tp.Session.currentAttempts === 0;

            // G) P0-4: exportBackup / importBackup preserva wardrobe + reviewNotebooks e rejeita parentAuth sem salt
            const sbBefore = pe.getById(sibling.id);
            sbBefore.wardrobe = { unlocked: ['hat_crown_starter', 'glasses_star'], equipped: { hat: 'hat_crown_starter', glasses: 'glasses_star', outfit: null, aura: null }, starsSpent: 15 };
            pe.update(sibling.id, { wardrobe: sbBefore.wardrobe });
            tp.ReviewNotebook.saveItems([{ id: 'nb_test_1', subjectKey: 'matematica', levelId: 'm2', box: 1, dueRound: 3, item: lItem }], sibling.id);
            const exported = pe.exportBackup();
            // Injeta parentAuth malformado sem salt em um aluno para testar rejeição segura
            const cloneExport = JSON.parse(JSON.stringify(exported));
            const targetStu = cloneExport.students.find(x => x.id === sibling.id);
            targetStu.parentAuth = { mode: 'custom', hash: 'a'.repeat(64) }; // sem salt!
            tp.ReviewNotebook.saveItems([], sibling.id);
            pe.importBackup(cloneExport);
            const sbRestored = pe.getById(sibling.id);
            const nbRestored = pe.getReviewNotebookItems(sibling.id);
            const backupOk = exported.version === '4.6.0' &&
                sbRestored && sbRestored.wardrobe && sbRestored.wardrobe.unlocked.includes('glasses_star') && sbRestored.wardrobe.starsSpent === 15 &&
                nbRestored.length === 1 && nbRestored[0].id === 'nb_test_1' &&
                sbRestored.parentAuth && sbRestored.parentAuth.mode === 'reversed_name';

            // H) solveSequenceHole decrescente na pos 0
            const seqHoleDescOk = tp.solveSequenceHole(['__', 18, 16, 14, 12]) === 20 && tp.solveSequenceHole(['__', 10, 12, 14, 16]) === 8;

            // Limpeza dos perfis de teste
            pe.setActive(activeOrig.id);
            pe.deleteStudent(sibling.id);
            pe.deleteStudent(freshKid.id);
            tp.ReviewNotebook.saveItems([]);

            return {
                ok: skillTagOk && mix50Ok && keyOk && leitnerSpacingOk && keptAfterWrongInReview && noFalseMasteryOk && isolatedLimitsOk && sliderClampedOk && noKeyLeakOk && backupOk && seqHoleDescOk,
                skillTagOk, mix50Ok, keyOk, leitnerSpacingOk, keptAfterWrongInReview, noFalseMasteryOk, isolatedLimitsOk, sliderClampedOk, noKeyLeakOk, backupOk, seqHoleDescOk
            };
        });
        assert(hardening51Test.ok, 'Suíte Adversarial Sprint 5.1 (Hardening Real: P0-2, P0-4, P0-5, P1-1..P1-7) validada 100%', JSON.stringify(hardening51Test));

        // -------------------------------------------------------------
        // TESTE 14 (Sprint 6 — Vocabulário Graduado EN/PT, Auto-Split, Isolamento & Sync Papel↔Tablet)
        // -------------------------------------------------------------
        console.log('\n[TESTE 14] Sprint 6: Vocabulário Graduado EN/PT, Editor Vertical, Isolamento e Sync Papel↔Tablet');

        await page.goto(`${baseUrl}/ingles.html`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(350);

        const engVocabFlow = await page.evaluate(() => {
            const kv = window.KumonVocabulary;
            const pe = window.StudentProfileEngine;
            if (!kv || !pe) return { ok: false, reason: 'missing_engines' };

            const origStudent = pe.getActive();
            kv.clearCustomItemsForLevel('ingles', 'i2');
            kv.clearCustomItemsForLevel('ingles', 'i3');
            kv.clearCustomItemsForLevel('ingles', 'i4');

            // 1. Wizard I4 e I5 NUNCA vazam CAT/DOG do I2
            if (typeof window.selectEngWizardGoal === 'function') window.selectEngWizardGoal('i4');
            const listI4 = (document.getElementById('wordListContainer')?.textContent || '').toUpperCase();
            const sheetI4 = (document.getElementById('a4-sheet')?.textContent || '').toUpperCase().replace(/\+/g, '');
            const i4NoLeak = !listI4.includes('CAT') && !listI4.includes('DOG') && !sheetI4.includes('CAT') && !sheetI4.includes('DOG') && (listI4.includes('THE') || listI4.includes('THIS') || listI4.includes('AND'));

            if (typeof window.selectEngWizardGoal === 'function') window.selectEngWizardGoal('i5');
            const listI5 = (document.getElementById('wordListContainer')?.textContent || '').toUpperCase();
            const i5NoLeak = !listI5.includes('CAT') && !listI5.includes('DOG') && (listI5.includes('CAKE') || listI5.includes('MAKE') || listI5.includes('BIKE') || listI5.includes('HOME'));

            // 2. Slider em I2 evolui em tempo real nos 4 degraus
            if (typeof window.selectEngWizardGoal === 'function') window.selectEngWizardGoal('i2');
            const slider = document.getElementById('pcDifficultySlider');
            const setStage = (n) => {
                if (!slider) return;
                slider.value = String(n);
                slider.dispatchEvent(new Event('input', { bubbles: true }));
                slider.dispatchEvent(new Event('change', { bubbles: true }));
            };
            setStage(1);
            const st1Text = (document.getElementById('wordListContainer')?.textContent || '').toUpperCase();
            setStage(2);
            const st2Text = (document.getElementById('wordListContainer')?.textContent || '').toUpperCase();
            setStage(3);
            const st3Text = (document.getElementById('wordListContainer')?.textContent || '').toUpperCase();
            setStage(4);
            const st4Text = (document.getElementById('wordListContainer')?.textContent || '').toUpperCase();
            const sliderEvolves = st1Text !== st2Text && st2Text !== st3Text && st3Text !== st4Text &&
                st1Text.includes('CAT') && !st2Text.includes('CAT') && (st2Text.includes('PIG') || st2Text.includes('BED')) &&
                (st3Text.includes('SUN') || st3Text.includes('CUP')) && (st4Text.includes('CAB') || st4Text.includes('WEB'));

            // 3. Auto-split ao vivo + adição manual isolada no módulo I4 + modo lista em lote + modal ampliado
            if (typeof window.selectEngWizardGoal === 'function') window.selectEngWizardGoal('i4');
            setStage(1);
            const acc = document.getElementById('advancedAccordion');
            if (acc) acc.open = true;

            const inpWord = document.getElementById('newWord');
            const inpParts = document.getElementById('newParts');
            if (inpWord) {
                inpWord.value = 'THIS';
                inpWord.dispatchEvent(new Event('input', { bubbles: true }));
            }
            const autoSplitOk = (inpParts?.value || '').trim() === 'TH I S';

            // Adiciona palavra extra exclusiva do aluno em I4
            if (inpWord && inpParts) {
                inpWord.value = 'ZEBRA';
                inpParts.value = 'ZE BRA';
                document.getElementById('addWordBtn')?.click();
            }
            const customTabAfterSingle = (document.getElementById('wordListContainer')?.textContent || '').toUpperCase();
            const sheetAfterCustom = (document.getElementById('a4-sheet')?.textContent || '').toUpperCase().replace(/\+|\s+/g, '');
            const sheetHasCustom = sheetAfterCustom.includes('ZEBRA');

            // Testa isolamento entre módulos (I3 não herda ZEBRA de I4)
            if (typeof window.selectEngWizardGoal === 'function') window.selectEngWizardGoal('i3');
            const customInI3 = kv.getCustomItems('ingles', 'i3').length === 0;
            if (typeof window.selectEngWizardGoal === 'function') window.selectEngWizardGoal('i4');
            const persistedInI4 = kv.getCustomItems('ingles', 'i4').some(x => x.word === 'ZEBRA');

            // Modo Lote (Lista)
            document.getElementById('vocabAddModeBatch')?.click();
            const batchTa = document.getElementById('vocabBatchInput');
            if (batchTa) batchTa.value = 'CLOUDY, PLANET';
            document.getElementById('addWordBtn')?.click();
            const batchAddedOk = kv.getCustomItems('ingles', 'i4').length >= 3;

            // Modal Ampliado (#kumonVocabModal)
            document.getElementById('vocabExpandModalBtn')?.click();
            const modalEl = document.getElementById('kumonVocabModal');
            const modalStagesCount = modalEl ? modalEl.querySelectorAll('.vocab-modal-stage-card').length : 0;
            document.getElementById('closeVocabModalBtn')?.click();
            const modalOk = modalStagesCount === 4 && !document.getElementById('kumonVocabModal');

            // 4. Isolamento entre perfis + escopo Compartilhado ("Toda Turma") + Backup/Restore
            const peer = pe.create({ name: 'Bia', ageTier: 'age_6_7', mascot: 'capivara' });
            pe.setActive(peer.id);
            const peerIsolated = !kv.getCustomItems('ingles', 'i4', peer.id).some(x => x.word === 'ZEBRA');
            kv.addCustomItem('ingles', 'i4', { word: 'ROBOT', parts: ['RO', 'BOT'], theme: 'escola' }, 'shared');
            const sharedVisibleOrig = kv.getCustomItems('ingles', 'i4', origStudent.id).some(x => x.word === 'ROBOT');
            const sharedVisiblePeer = kv.getCustomItems('ingles', 'i4', peer.id).some(x => x.word === 'ROBOT');

            // Backup & Restore preserva customVocab
            pe.setActive(origStudent.id);
            const bkp = pe.exportBackup();
            kv.clearCustomItemsForLevel('ingles', 'i4');
            pe.importBackup(bkp);
            const restoreVocabOk = kv.getCustomItems('ingles', 'i4', origStudent.id).some(x => x.word === 'ZEBRA') &&
                kv.getCustomItems('ingles', 'i4', origStudent.id).some(x => x.word === 'ROBOT');

            pe.deleteStudent(peer.id);
            pe.setActive(origStudent.id);

            return {
                ok: i4NoLeak && i5NoLeak && sliderEvolves && autoSplitOk && customTabAfterSingle.includes('ZEBRA') &&
                    sheetHasCustom && customInI3 && persistedInI4 && batchAddedOk && modalOk &&
                    peerIsolated && sharedVisibleOrig && sharedVisiblePeer && restoreVocabOk,
                i4NoLeak, i5NoLeak, sliderEvolves, autoSplitOk, sheetHasCustom, customInI3, persistedInI4,
                batchAddedOk, modalOk, peerIsolated, sharedVisibleOrig, sharedVisiblePeer, restoreVocabOk
            };
        });
        assert(engVocabFlow.ok, 'Inglês Sprint 6: Wizard sem vazamento, slider 4 degraus, auto-split, lote, modal, isolamento por perfil e backup', JSON.stringify(engVocabFlow));

        // Sincronização Papel -> Tablet Player (extra ZEBRA/ROBOT aparece no Tablet em I4 Degrau 1)
        await page.goto(`${baseUrl}/tablet.html?subject=ingles&level=i4&stage=1&theme=all&autostart=true`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(350);
        const tabletVocabSync = await page.evaluate(() => {
            const items = (window.TabletPlayer && window.TabletPlayer.Session && window.TabletPlayer.Session.items) || [];
            const words = items.map(it => String(it.word || '').toUpperCase());
            const hasCustom = words.includes('ZEBRA') || words.includes('ROBOT') || words.includes('CLOUDY');
            const noI2Leak = !words.includes('CAT') && !words.includes('DOG');
            // Limpa extras de teste
            if (window.KumonVocabulary) window.KumonVocabulary.clearCustomItemsForLevel('ingles', 'i4');
            return { ok: items.length >= 10 && hasCustom && noI2Leak, count: items.length, words: words.slice(0, 6) };
        });
        assert(tabletVocabSync.ok, 'Sync Papel↔Tablet: palavra extra personalizada aparece com prioridade no Tablet Player sem vazamento I2', JSON.stringify(tabletVocabSync));

        // Português: Wizard P3 -> P4, slider 1 -> 4 e auto-split silábico (BORBOLETA -> BOR BO LE TA)
        await page.goto(`${baseUrl}/portugues.html`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(350);
        const porVocabFlow = await page.evaluate(() => {
            if (typeof window.selectPorWizardGoal === 'function') window.selectPorWizardGoal('p4');
            const slider = document.getElementById('pcDifficultySlider');
            if (slider) {
                slider.value = '1';
                slider.dispatchEvent(new Event('input', { bubbles: true }));
                slider.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const s1 = (document.getElementById('wordListContainer')?.textContent || '').toUpperCase();
            if (slider) {
                slider.value = '4';
                slider.dispatchEvent(new Event('input', { bubbles: true }));
                slider.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const s4 = (document.getElementById('wordListContainer')?.textContent || '').toUpperCase();
            const acc = document.getElementById('advancedAccordion');
            if (acc) acc.open = true;
            const inpWord = document.getElementById('newWord');
            const inpParts = document.getElementById('newParts');
            if (inpWord) {
                inpWord.value = 'BORBOLETA';
                inpWord.dispatchEvent(new Event('input', { bubbles: true }));
            }
            const ptAutoSplit = (inpParts?.value || '').trim() === 'BOR BO LE TA';
            const p4Evolves = s1 !== s4 && !s1.includes('BOLA') && (s1.includes('BANANA') || s1.includes('BONECA') || s1.includes('MACACO'));
            return { ok: p4Evolves && ptAutoSplit, p4Evolves, ptAutoSplit, partsGot: inpParts?.value || '' };
        });
        assert(porVocabFlow.ok, 'Português Sprint 6: Wizard P4 sem vazamento de P3, slider 4 degraus e auto-split BORBOLETA -> BOR BO LE TA', JSON.stringify(porVocabFlow));

        // -------------------------------------------------------------
        // TESTE 15 (Sprint 6.1 — Blindagem dos 9 Bugs: XSS, Frase 1-item I6, Papel P8/I6/P7/I7, #wordRepeat & Tema no Tablet)
        // -------------------------------------------------------------
        console.log('\n[TESTE 15] Sprint 6.1: Blindagem Anti-XSS, Frases 1-Item, Embaralhamento Impresso, #wordRepeat e Reset de Tema');

        await page.goto(`${baseUrl}/ingles.html`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(300);

        const sprint61PaperCheck = await page.evaluate(() => {
            window.__xssFired = false;
            const kv = window.KumonVocabulary;
            kv.clearCustomItemsForLevel('ingles', 'i6');
            kv.clearCustomItemsForLevel('ingles', 'i4');

            // 1. Bug #2: Frase adicionada no modo 1-item em I6 usa " | " e salva múltiplos blocos (nunca 1 bloco único)
            window.selectEngWizardGoal('i6');
            const acc = document.getElementById('advancedAccordion');
            if (acc) acc.open = true;
            const inpW = document.getElementById('newWord');
            const inpP = document.getElementById('newParts');
            if (inpW) {
                inpW.value = 'THE CAT IS HAPPY';
                inpW.dispatchEvent(new Event('input', { bubbles: true }));
            }
            const pipeSuggested = (inpP?.value || '').includes('|');
            document.getElementById('addWordBtn')?.click();
            const savedSent = kv.getCustomItems('ingles', 'i6')[0];
            const multiBlockSentOk = !!(pipeSuggested && savedSent && Array.isArray(savedSent.parts) && savedSent.parts.length >= 3);

            // 2. Bug #4: Na folha A4 de I6, as frases impressas exibem blocos embaralhados (separados por ·) e não a frase corrida pronta
            const sheetI6Html = document.getElementById('a4-sheet')?.innerHTML || '';
            const scrambledOnPaperOk = sheetI6Html.includes('·') && document.querySelectorAll('#a4-sheet .exercise-content').length >= 16;

            // 3. Bug #7: #wordRepeat realmente controla repetição na folha A4
            window.selectEngWizardGoal('i2');
            const repInput = document.getElementById('wordRepeat');
            if (repInput) {
                repInput.value = '1';
                repInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const getSheetWords = () => Array.from(document.querySelectorAll('#a4-sheet .exercise-content')).map(r => {
                const boxes = Array.from(r.querySelectorAll('span.bg-slate-100')).map(s => s.textContent.trim());
                return boxes.join('');
            }).filter(Boolean);
            const uniqAtRep1 = new Set(getSheetWords()).size;
            if (repInput) {
                repInput.value = '4';
                repInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const uniqAtRep4 = new Set(getSheetWords()).size;
            if (repInput) {
                repInput.value = '1';
                repInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
            const wordRepeatWorks = uniqAtRep1 >= 12 && uniqAtRep4 <= 6;

            // 4. Bug #1 (DOM E2E): tentativa de XSS via input na sidebar não executa script na folha A4
            window.selectEngWizardGoal('i4');
            const inpW2 = document.getElementById('newWord');
            if (inpW2) {
                inpW2.value = '<img src=x onerror="window.__xssFired=true">WOLF';
                inpW2.dispatchEvent(new Event('input', { bubbles: true }));
                document.getElementById('addWordBtn')?.click();
            }
            const noXssDom = window.__xssFired === false && !document.querySelector('#a4-sheet img[onerror]');

            return {
                ok: multiBlockSentOk && scrambledOnPaperOk && wordRepeatWorks && noXssDom,
                multiBlockSentOk, scrambledOnPaperOk, wordRepeatWorks, uniqAtRep1, uniqAtRep4, noXssDom
            };
        });
        assert(sprint61PaperCheck.ok, 'Sprint 6.1 Papel/Sidebar: Frase 1-item multi-bloco (I6), frase desordenada no A4, #wordRepeat ativo e anti-XSS DOM', JSON.stringify(sprint61PaperCheck));

        // 5. Verifica no Tablet: frase extra de I6 tem >=3 botões de ordenar + tema ?theme=animais exibe badge e reseta ao trocar de nível
        await page.goto(`${baseUrl}/tablet.html?subject=ingles&level=i6&stage=1&theme=escola&autostart=true`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(350);
        const sprint61TabletCheck = await page.evaluate(() => {
            const dismiss = document.getElementById('dismissExampleBtn');
            if (dismiss) dismiss.click();
            const tp = window.TabletPlayer;
            const kv = window.KumonVocabulary;
            const customSentInSession = (tp.Session.items || []).find(it => it.sentence === 'THE CAT IS HAPPY');
            const sentBlocksOk = !!(customSentInSession && Array.isArray(customSentInSession.parts) && customSentInSession.parts.length >= 3);
            const chipBtnsCount = document.querySelectorAll('.sentence-chip').length;
            const themeActiveBefore = tp.Session.selectedTheme === 'escola' && (document.getElementById('pickerLevelTitle')?.textContent || '').includes('🎒');

            // Troca de nível pelo Level Picker deve limpar o filtro de tema preso
            tp.showLevelPickerModal();
            const i4Card = document.querySelector('.level-card-btn[data-subject="ingles"][data-level-id="i4"]');
            if (i4Card) i4Card.click();
            const themeResetAfterSwitch = tp.Session.selectedTheme === 'all' && !(document.getElementById('pickerLevelTitle')?.textContent || '').includes('🎒');

            if (kv) {
                kv.clearCustomItemsForLevel('ingles', 'i6');
                kv.clearCustomItemsForLevel('ingles', 'i4');
            }
            return {
                ok: sentBlocksOk && chipBtnsCount >= 3 && themeActiveBefore && themeResetAfterSwitch,
                sentBlocksOk, chipBtnsCount, themeActiveBefore, themeResetAfterSwitch
            };
        });
        assert(sprint61TabletCheck.ok, 'Sprint 6.1 Tablet: Frase extra com >=3 chips clicáveis, badge de tema ativo e reset automático ao mudar nível', JSON.stringify(sprint61TabletCheck));

        // -------------------------------------------------------------
        // CENÁRIO 6: PWA, MANIFEST E RESILIÊNCIA DE STORAGE
        // -------------------------------------------------------------
        console.log('\n[CENÁRIO 6] Auditoria PWA, Manifest e Storage');

        const resManifest = await page.goto(`${baseUrl}/manifest.json`);
        assert(resManifest.status() === 200, 'manifest.json acessível com HTTP 200');
        const manifestJson = await resManifest.json();
        assert(manifestJson.name && manifestJson.icons && manifestJson.icons.length >= 3, 'manifest.json possui name e pelo menos 3 ícones');

        const resSw = await page.goto(`${baseUrl}/sw.js`);
        assert(resSw.status() === 200, 'sw.js acessível com HTTP 200');

        const resIcon192 = await page.goto(`${baseUrl}/icon-192x192.png`);
        assert(resIcon192.status() === 200, 'icon-192x192.png responde com HTTP 200');

        const storageSafe = await page.evaluate(() => {
            return typeof window.SafeStorage !== 'undefined' || typeof localStorage !== 'undefined';
        });
        assert(storageSafe, 'Mecanismo SafeStorage e LocalStorage operacional');

        // -------------------------------------------------------------
        // VERIFICAÇÃO DE ERROS NÃO TRATADOS DE CONSOLE
        // -------------------------------------------------------------
        console.log('\n[CENÁRIO 7] Verificação de Integridade de Console e Rede');
        assert(Results.consoleErrors.length === 0, `Zero erros de console durante toda a navegação (encontrados: ${Results.consoleErrors.length})`, JSON.stringify(Results.consoleErrors));
        assert(Results.networkErrors.length === 0, `Zero falhas de rede (404/500) em assets locais (falhas: ${Results.networkErrors.length})`, JSON.stringify(Results.networkErrors));

    } finally {
        await browser.close();
        server.close();
    }

    const reportPath = path.join(ROOT_DIR, 'tests/smoke_test_results.json');
    fs.writeFileSync(reportPath, JSON.stringify(Results, null, 2), 'utf8');

    console.log('\n====================================================================');
    console.log(`  RESUMO DO SMOKE TEST AUTOMATIZADO: ${Results.passed} / ${Results.total} asserções aprovadas (${Math.round((Results.passed/Results.total)*100)}%)`);
    console.log('====================================================================');
    console.log('Tempos de Carregamento (DOMContentLoaded):');
    for (const [pageName, ms] of Object.entries(Results.pageTimings)) {
        console.log(`  • ${pageName.padEnd(18)} : ${ms} ms`);
    }
    console.log('====================================================================\n');

    if (Results.failed > 0) {
        process.exit(1);
    } else {
        console.log('ZERO falhas · SMOKE_GATES_ALL_PASS');
        process.exit(0);
    }
}

runSmokeTests().catch(err => {
    console.error('Erro fatal no executor de smoke test:', err);
    process.exit(1);
});
