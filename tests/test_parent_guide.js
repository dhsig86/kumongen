// tests/test_parent_guide.js — Validação Automatizada do Guia/Manual dos Pais
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT_DIR = path.resolve(__dirname, '..');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
};

function createServer() {
    return http.createServer((req, res) => {
        let reqPath = req.url.split('?')[0];
        if (reqPath === '/') reqPath = '/index.html';
        const filePath = path.join(ROOT_DIR, reqPath);

        if (!filePath.startsWith(ROOT_DIR)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }

        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Not Found');
                return;
            }
            const ext = path.extname(filePath).toLowerCase();
            res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
            res.end(data);
        });
    });
}

async function runTests() {
    console.log('====================================================================');
    console.log('  KUMONGEN · TESTE DO MANUAL DO USUÁRIO & GUIA DOS PAIS');
    console.log('====================================================================\n');

    const server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;
    const baseUrl = `http://127.0.0.1:${port}`;

    let browser;
    let passed = 0;
    let failed = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`  ✔ PASS: ${message}`);
            passed++;
        } else {
            console.error(`  ❌ FAIL: ${message}`);
            failed++;
        }
    }

    try {
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        // 1. Acesso à Home
        await page.goto(`${baseUrl}/index.html`);
        await page.waitForLoadState('domcontentloaded');

        assert(await page.evaluate(() => typeof window.KumonParentGuide !== 'undefined'), 'KumonParentGuide definido no window');

        // 2. Abrir Guia pelo atalho
        await page.evaluate(() => window.KumonParentGuide.open('rotina'));
        await page.waitForTimeout(300);

        const modalVisible = await page.evaluate(() => {
            const m = document.getElementById('parent-guide-modal');
            return !!m && m.offsetHeight > 0;
        });
        assert(modalVisible, 'Modal #parent-guide-modal aberto e visível');

        // 3. Contagem de seções
        const tabCount = await page.evaluate(() => {
            return document.querySelectorAll('#parent-guide-modal .guide-tab-btn').length;
        });
        assert(tabCount === 5, `Possui exatamente 5 abas de navegação (encontradas: ${tabCount})`);

        // 4. Trocar para aba "Os 25 Níveis"
        await page.click('.guide-tab-btn[data-section="niveis"]');
        await page.waitForTimeout(200);

        const niveisContent = await page.evaluate(() => {
            const m = document.getElementById('parent-guide-modal');
            return m && m.innerText.includes('Matemática (10 Níveis)') && m.innerText.includes('M1 ao M10');
        });
        assert(niveisContent, 'Aba "Os 25 Níveis" exibe a matriz curricular completa');

        // 5. Trocar para aba "Tempo Alvo (SCT)"
        await page.click('.guide-tab-btn[data-section="sct"]');
        await page.waitForTimeout(200);

        const sctContent = await page.evaluate(() => {
            const m = document.getElementById('parent-guide-modal');
            return m && m.innerText.includes('Standard Completion Time') && m.innerText.includes('Significado Pedagógico');
        });
        assert(sctContent, 'Aba "Tempo Alvo (SCT)" exibe tabela de interpretação');

        // 6. Fechar modal via botão
        await page.click('#closeParentGuideBtn');
        await page.waitForTimeout(250);

        const modalClosed = await page.evaluate(() => !document.getElementById('parent-guide-modal'));
        assert(modalClosed, 'Modal fechado com sucesso pelo botão X');

        // 7. Teste no Tablet Player
        await page.goto(`${baseUrl}/tablet.html`);
        await page.waitForLoadState('domcontentloaded');

        assert(await page.evaluate(() => typeof window.KumonParentGuide !== 'undefined'), 'KumonParentGuide disponível em tablet.html');

        // 8. Teste em gerador de Matemática
        await page.goto(`${baseUrl}/matematica.html`);
        await page.waitForLoadState('domcontentloaded');

        assert(await page.evaluate(() => typeof window.KumonParentGuide !== 'undefined'), 'KumonParentGuide disponível em matematica.html');

        // 9. Verificar arquivo docs/MANUAL_DOS_PAIS.md
        const docPath = path.join(ROOT_DIR, 'docs', 'MANUAL_DOS_PAIS.md');
        const docExists = fs.existsSync(docPath);
        const docSize = docExists ? fs.statSync(docPath).size : 0;
        assert(docExists && docSize > 1500, `Arquivo docs/MANUAL_DOS_PAIS.md presente (${docSize} bytes)`);

    } catch (err) {
        console.error('Erro na execução dos testes do Guia dos Pais:', err);
        failed++;
    } finally {
        if (browser) await browser.close();
        server.close();
    }

    console.log('\n====================================================================');
    console.log(`  RESUMO DOS TESTES: ${passed} / ${passed + failed} aprovados (${((passed / (passed + failed)) * 100).toFixed(1)}%)`);
    console.log('====================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
}

runTests();
