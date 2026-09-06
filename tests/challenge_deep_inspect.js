const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PORT = 3501;

function createStaticServer() {
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

            const content = fs.readFileSync(filePath);
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(content);
        } catch (err) {
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('500 Server Error: ' + err.message);
        }
    });
    return server;
}

async function deepInspect() {
    console.log('=== CHALLENGER 2: DEEP INSPECTION ===');
    const server = createStaticServer();
    await new Promise(r => server.listen(PORT, '127.0.0.1', r));

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-frame-rate-limit', '--disable-gpu-vsync']
    });

    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    await page.goto(`http://127.0.0.1:${PORT}/sandbox.html?engine=anime`, { waitUntil: 'networkidle' });

    // 1. Inspeciona Mascot Selection
    const initialBadge = await page.$eval('#mascotBadge', el => el.innerText);
    console.log('Initial mascotBadge text:', JSON.stringify(initialBadge));

    await page.evaluate(() => selectMascot('capivara'));
    await page.waitForTimeout(100);
    const updatedBadge = await page.$eval('#mascotBadge', el => el.innerText);
    console.log('Updated mascotBadge text (capivara):', JSON.stringify(updatedBadge));

    // 2. Inspeciona Modal Close Timing
    await page.evaluate(() => openGauntletMasteryModal());
    const openState = await page.$eval('#gauntletModalOverlay', el => el.classList.contains('hidden'));
    console.log('Modal open (hidden should be false):', openState);

    await page.evaluate(() => closeGauntletMasteryModal());
    console.log('Modal close triggered, checking hidden status over time...');
    for (let t = 50; t <= 500; t += 50) {
        await page.waitForTimeout(50);
        const isHidden = await page.$eval('#gauntletModalOverlay', el => el.classList.contains('hidden'));
        console.log(`  at +${t}ms: isHidden = ${isHidden}`);
        if (isHidden) break;
    }

    // 3. Inspeciona escopo de variáveis no script
    const scopeCheck = await page.evaluate(() => {
        return {
            windowHasAnimeCDN: typeof window.hasAnimeCDN,
            scopeHasAnimeCDN: typeof hasAnimeCDN,
            valHasAnimeCDN: hasAnimeCDN,
            windowCurrentEngineMode: typeof window.currentEngineMode,
            scopeCurrentEngineMode: typeof currentEngineMode,
            valCurrentEngineMode: currentEngineMode
        };
    });
    console.log('Scope check:', scopeCheck);

    // 4. Inspeciona paridade visual e atributos CSS vs Anime.js
    // A) Mascot Bounce:
    console.log('\n--- Mascot Bounce Parity Check ---');
    await page.evaluate(() => setEngineMode('anime'));
    await page.evaluate(() => triggerMascotBounce());
    await page.waitForTimeout(200);
    const animeMascotTransform = await page.$eval('#mascotWrapper', el => el.style.transform);
    console.log('Anime.js Mascot Transform after 200ms:', animeMascotTransform);

    await page.evaluate(() => setEngineMode('css'));
    await page.evaluate(() => triggerMascotBounce());
    const cssMascotClasses = await page.$eval('#mascotWrapper', el => el.className);
    console.log('CSS Mascot Classes immediately after trigger:', cssMascotClasses);

    // B) Stars Stagger Parity:
    console.log('\n--- Stars Stagger Parity Check ---');
    await page.evaluate(() => setEngineMode('anime'));
    await page.evaluate(() => triggerStarBurst());
    await page.waitForTimeout(250);
    const animeStarTransform = await page.$eval('.burst-star', el => ({
        transform: el.style.transform,
        opacity: el.style.opacity
    }));
    console.log('Anime.js Star sample (250ms):', animeStarTransform);

    await page.evaluate(() => setEngineMode('css'));
    await page.evaluate(() => triggerStarBurst());
    const cssStarSample = await page.$eval('.burst-star', el => ({
        className: el.className,
        dx: el.style.getPropertyValue('--dx'),
        dy: el.style.getPropertyValue('--dy'),
        rot: el.style.getPropertyValue('--rot')
    }));
    console.log('CSS Star sample:', cssStarSample);

    // C) Modal Gauntlet Parity:
    console.log('\n--- Modal Gauntlet Parity Check ---');
    await page.evaluate(() => setEngineMode('anime'));
    await page.evaluate(() => openGauntletMasteryModal());
    await page.waitForTimeout(200);
    const animeModalStyles = await page.evaluate(() => {
        const card = document.getElementById('gauntletModalCard');
        const backdrop = document.getElementById('gauntletModalBackdrop');
        const crest = document.getElementById('gauntletModalCrest');
        return {
            cardTransform: card.style.transform,
            cardOpacity: card.style.opacity,
            backdropOpacity: backdrop.style.opacity,
            crestTransform: crest.style.transform
        };
    });
    console.log('Anime.js Modal Styles (200ms):', animeModalStyles);
    await page.evaluate(() => closeGauntletMasteryModal());
    await page.waitForTimeout(400);

    await page.evaluate(() => setEngineMode('css'));
    await page.evaluate(() => openGauntletMasteryModal());
    const cssModalStyles = await page.evaluate(() => {
        const card = document.getElementById('gauntletModalCard');
        const backdrop = document.getElementById('gauntletModalBackdrop');
        const crest = document.getElementById('gauntletModalCrest');
        return {
            cardClasses: card.className,
            backdropClasses: backdrop.className,
            crestClasses: crest.className,
            cardOpacity: card.style.opacity
        };
    });
    console.log('CSS Modal Styles:', cssModalStyles);
    await page.evaluate(() => closeGauntletMasteryModal());
    await page.waitForTimeout(100);

    await browser.close();
    server.close();
    console.log('\n=== DEEP INSPECTION COMPLETE ===');
    process.exit(0);
}

deepInspect().catch(err => {
    console.error('Inspection failed:', err);
    process.exit(1);
});
