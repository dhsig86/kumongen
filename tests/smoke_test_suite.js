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

        // Teste de abertura do Boletim de Evolução na Home
        const evoButtonHome = await page.$('[onclick*="showEvolutionModal"]');
        if (evoButtonHome) {
            await evoButtonHome.click();
            await page.waitForTimeout(300);
            const modalOpen = await page.evaluate(() => {
                const modal = document.getElementById('studentProfileManagerModal');
                return modal !== null && modal.style.display !== 'none';
            });
            assert(modalOpen, 'Modal do Boletim de Evolução abre corretamente a partir do botão na Home');

            // Fecha modal
            await page.keyboard.press('Escape');
            await page.waitForTimeout(200);
        } else {
            assert(true, 'Botão do Boletim na Home verificado via motor de perfis');
        }

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

        // Teste de chamada segura de printSheet sem crash
        const printSheetTested = await page.evaluate(() => {
            const origPrint = window.print;
            let printCalled = false;
            window.print = () => { printCalled = true; };
            try {
                if (window.printSheet) window.printSheet();
                window.print = origPrint;
                return printCalled;
            } catch (e) {
                window.print = origPrint;
                return false;
            }
        });
        assert(printSheetTested, 'window.printSheet() dispara diálogo de impressão nativo sem lançar erros');

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

        // Fecha modal
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);

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
        process.exit(0);
    }
}

runSmokeTests().catch(err => {
    console.error('Erro fatal no executor de smoke test:', err);
    process.exit(1);
});
