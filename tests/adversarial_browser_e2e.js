// tests/adversarial_browser_e2e.js - Teste Adversarial E2E em Navegador Real (Chromium Headless)
const http = require('http');
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT_DIR = path.resolve(__dirname, '..');

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

async function runBrowserE2E() {
    console.log('Iniciando Teste Adversarial E2E no Chromium Headless...');
    const { server, baseUrl } = await startServer();
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    try {
        await page.goto(`${baseUrl}/tablet.html?subject=matematica&level=m1`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);

        // Se houver workedExampleModal aberto na 1ª questão, fecha para iniciar a prática
        const dismissBtn = await page.$('#dismissExampleBtn');
        if (dismissBtn && await dismissBtn.isVisible()) {
            console.log('Fechando workedExampleModal inicial...');
            await dismissBtn.click();
            await page.waitForTimeout(300);
        }

        // 1. Hammering de erro via interface real
        console.log('[E2E 1] Hammering de respostas erradas no Tablet Player...');
        for (let i = 0; i < 5; i++) {
            // Clica no dígito '9' no teclado virtual
            await page.click('button[data-key="9"]');
            // Clica em OK/Enter
            await page.click('button[data-key="enter"]');
            await page.waitForTimeout(100);
        }

        // Verifica estado após 5 erros
        const attempts = await page.evaluate(() => window.TabletPlayer.Session.currentAttempts);
        console.log(`Tentativas registradas na questão: ${attempts}`);
        if (attempts !== 5) throw new Error(`Esperado 5 tentativas, obtido: ${attempts}`);

        const isLocked = await page.evaluate(() => window.TabletPlayer.Session.isTransitionLocked);
        console.log(`isTransitionLocked após erros: ${isLocked}`);
        if (isLocked !== false) throw new Error('isTransitionLocked deveria ser false no erro!');

        // Verifica presença da classe .hint-glow-pulse no activeAnswerBox
        const hasHintGlow = await page.evaluate(() => {
            const box = document.getElementById('activeAnswerBox');
            return box ? box.classList.contains('hint-glow-pulse') : false;
        });
        console.log(`Presença de .hint-glow-pulse no 5º erro: ${hasHintGlow}`);
        if (!hasHintGlow) throw new Error('activeAnswerBox deveria possuir .hint-glow-pulse após 2+ erros!');

        // Verifica texto de dica em cardFeedbackMsg
        const feedbackText = await page.evaluate(() => {
            const el = document.getElementById('cardFeedbackMsg');
            return el ? el.innerText : '';
        });
        console.log(`Feedback de dica exibido: "${feedbackText}"`);
        if (!feedbackText.includes('💡') || !feedbackText.toLowerCase().includes('dica:')) throw new Error('Feedback não contém o prefixo de dica esperado!');

        // 2. Teste de Streak Sparks no Canvas
        console.log('[E2E 2] Disparo de Streak Sparks em múltiplos de 3...');
        await page.evaluate(() => {
            window.TabletPlayer.launchStreakSparks(3);
        });
        await page.waitForTimeout(100);

        const canvasDimensions = await page.evaluate(() => {
            const c = document.getElementById('confettiCanvas');
            return { w: c.width, h: c.height, rafId: window.TabletPlayer._streakSparkRafId };
        });
        console.log(`Canvas dimensões: ${canvasDimensions.w}x${canvasDimensions.h}, rafId: ${canvasDimensions.rafId}`);
        if (!canvasDimensions.rafId) throw new Error('Streak sparks deveria ter registrado um requestAnimationFrame ativo!');

        // Espera a animação concluir (~1000ms)
        await page.waitForTimeout(1100);
        const postRafId = await page.evaluate(() => window.TabletPlayer._streakSparkRafId);
        console.log(`rafId após 1100ms: ${postRafId}`);
        if (postRafId !== null) throw new Error('_streakSparkRafId deveria ser null após a conclusão da animação!');

        if (consoleErrors.length > 0) {
            throw new Error(`Erros detectados no console do navegador: ${consoleErrors.join('; ')}`);
        }

        console.log('✔ TODOS OS TESTES E2E NO CHROMIUM HEADLESS FORAM CONCLUÍDOS COM SUCESSO!');
    } finally {
        await browser.close();
        server.close();
    }
}

runBrowserE2E().catch(err => {
    console.error('Falha no teste E2E adversarial:', err);
    process.exit(1);
});
