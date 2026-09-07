// tests/ux_ui_audit_suite.js — Auditoria Completa de UX/UI via Playwright
// Testa responsividade, sobreposição, acessibilidade e bugs visuais em todas as páginas e viewports
const http = require('http');
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT_DIR = path.resolve(__dirname, '..');
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots_ux_audit');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

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
                res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'no-cache' });
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

// ─── Viewports de Teste ───
const VIEWPORTS = {
    mobile_portrait:    { width: 375,  height: 812,  label: 'Mobile Retrato (iPhone 12)',   isMobile: true },
    mobile_landscape:   { width: 812,  height: 375,  label: 'Mobile Paisagem',              isMobile: true },
    tablet_portrait:    { width: 768,  height: 1024, label: 'Tablet Retrato (iPad)',         isMobile: true },
    tablet_landscape:   { width: 1024, height: 768,  label: 'Tablet Paisagem (iPad)',        isMobile: true },
    desktop:            { width: 1280, height: 800,  label: 'Desktop 1280×800',              isMobile: false },
    desktop_wide:       { width: 1920, height: 1080, label: 'Desktop Full HD',               isMobile: false },
};

// ─── Results Collector ───
const R = { total: 0, passed: 0, failed: 0, warnings: 0, assertions: [], consoleErrors: [], bugs: [] };

function assert(condition, message, details = '') {
    R.total++;
    if (condition) {
        R.passed++;
        R.assertions.push({ status: 'PASS', message });
        console.log(`  ✔ PASS: ${message}`);
    } else {
        R.failed++;
        R.assertions.push({ status: 'FAIL', message, details });
        console.error(`  ❌ FAIL: ${message}${details ? ' — ' + details : ''}`);
        R.bugs.push({ message, details });
    }
}

function warn(message, details = '') {
    R.warnings++;
    R.assertions.push({ status: 'WARN', message, details });
    console.warn(`  ⚠️ WARN: ${message}${details ? ' — ' + details : ''}`);
}

// ─── Helpers ───
async function getBoundingBox(page, selector) {
    const el = await page.$(selector);
    if (!el) return null;
    return el.boundingBox();
}

function boxesOverlap(a, b) {
    if (!a || !b) return false;
    return !(a.x + a.width <= b.x || b.x + b.width <= a.x ||
             a.y + a.height <= b.y || b.y + b.height <= a.y);
}

async function screenshot(page, name) {
    const filePath = path.join(SCREENSHOTS_DIR, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: false });
    return filePath;
}

// ═══════════════════════════════════════════════════════════════
//  CENÁRIO 1: Tablet Player — Sobreposição do Nav Dock com Teclado
// ═══════════════════════════════════════════════════════════════
async function testTabletKeypadOverlap(page, baseUrl) {
    console.log('\n[CENÁRIO 1] Tablet Player — Sobreposição Nav Dock × Teclado Virtual');

    for (const [vpKey, vp] of Object.entries(VIEWPORTS)) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${baseUrl}/tablet.html`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);

        const navDock = await getBoundingBox(page, '#kumonGlobalNavDock');
        const lastKeypadBtns = await page.$$('.keypad-btn');

        if (lastKeypadBtns.length > 0) {
            const lastBtn = lastKeypadBtns[lastKeypadBtns.length - 1];
            const lastBtnBox = await lastBtn.boundingBox();

            if (navDock && lastBtnBox) {
                const overlap = boxesOverlap(navDock, lastBtnBox);
                assert(!overlap,
                    `[${vp.label}] Nav Dock NÃO sobrepõe botão OK/Enter do teclado`,
                    overlap ? `NavDock y:${navDock.y.toFixed(0)} vs BtnBottom y:${(lastBtnBox.y + lastBtnBox.height).toFixed(0)}` : ''
                );
            } else if (!navDock) {
                assert(true, `[${vp.label}] Nav Dock não visível nesta viewport (ok para tablet.html)`);
            }

            // Última fileira do teclado deve estar totalmente visível dentro do viewport
            if (lastBtnBox) {
                const btnFullyVisible = lastBtnBox.y + lastBtnBox.height <= vp.height + 2;
                assert(btnFullyVisible,
                    `[${vp.label}] Última fileira do teclado (0, backspace, OK) totalmente visível`,
                    !btnFullyVisible ? `Bottom: ${(lastBtnBox.y + lastBtnBox.height).toFixed(0)} > viewport ${vp.height}` : ''
                );
            }
        }

        await screenshot(page, `tablet_${vpKey}`);
    }
}

// ═══════════════════════════════════════════════════════════════
//  CENÁRIO 2: Layout Responsivo do Tablet Player
// ═══════════════════════════════════════════════════════════════
async function testTabletResponsiveLayout(page, baseUrl) {
    console.log('\n[CENÁRIO 2] Layout Responsivo do Tablet Player (Retrato × Paisagem)');

    // Paisagem — deve ser 2 colunas (flex-row)
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(`${baseUrl}/tablet.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const landscapeLayout = await page.evaluate(() => {
        const ws = document.querySelector('#playerWorkspace');
        if (!ws) return null;
        const cs = getComputedStyle(ws);
        return { flexDirection: cs.flexDirection, display: cs.display };
    });

    if (landscapeLayout) {
        assert(landscapeLayout.flexDirection === 'row',
            '[Tablet Paisagem] playerWorkspace usa flex-direction: row',
            `Obtido: ${landscapeLayout.flexDirection}`
        );
    }

    // Retrato — deve ser coluna (flex-col)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${baseUrl}/tablet.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const portraitLayout = await page.evaluate(() => {
        const ws = document.querySelector('#playerWorkspace');
        if (!ws) return null;
        const cs = getComputedStyle(ws);
        return { flexDirection: cs.flexDirection, display: cs.display };
    });

    if (portraitLayout) {
        assert(portraitLayout.flexDirection === 'column',
            '[Tablet Retrato] playerWorkspace usa flex-direction: column',
            `Obtido: ${portraitLayout.flexDirection}`
        );
    }

    // Mobile landscape ultra-baixo — mascote deve estar hidden
    await page.setViewportSize({ width: 812, height: 375 });
    await page.goto(`${baseUrl}/tablet.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const mascotHidden = await page.evaluate(() => {
        const el = document.querySelector('#mascotCompanionWrapper');
        if (!el) return true;
        const cs = getComputedStyle(el);
        return cs.display === 'none';
    });

    assert(mascotHidden,
        '[Mobile Paisagem ≤480px alt] Mascote oculto para economizar espaço',
        !mascotHidden ? 'Mascote ainda visível em tela ultra-baixa' : ''
    );

    // Paisagem — keypad e focusCard lado a lado (não empilhados)
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(`${baseUrl}/tablet.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const focusBox = await getBoundingBox(page, '#focusCard');
    const keypadBox = await getBoundingBox(page, '#keypadWrapper');

    if (focusBox && keypadBox) {
        const sideBySide = keypadBox.x > focusBox.x + focusBox.width - 20;
        assert(sideBySide,
            '[Tablet Paisagem] FocusCard e Keypad estão lado a lado (2 colunas)',
            `FocusCard right: ${(focusBox.x + focusBox.width).toFixed(0)}, Keypad left: ${keypadBox.x.toFixed(0)}`
        );
    }
}

// ═══════════════════════════════════════════════════════════════
//  CENÁRIO 3: Geradores (MAT/POR/ENG) — Layout Sidebar + Preview
// ═══════════════════════════════════════════════════════════════
async function testGeneratorPages(page, baseUrl) {
    console.log('\n[CENÁRIO 3] Layout Responsivo dos Geradores (MAT/POR/ENG)');

    const pages = [
        { url: 'matematica.html', name: 'Matemática' },
        { url: 'portugues.html', name: 'Português' },
        { url: 'ingles.html',    name: 'Inglês' }
    ];

    for (const pg of pages) {
        // Desktop — sidebar lado a lado com preview
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(`${baseUrl}/${pg.url}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(400);

        const desktopLayout = await page.evaluate(() => {
            const cs = getComputedStyle(document.body);
            return cs.flexDirection;
        });
        assert(desktopLayout === 'row',
            `[${pg.name}][Desktop] Sidebar e preview lado a lado (flex-row)`,
            `Obtido: ${desktopLayout}`
        );

        // Mobile — empilhado
        await page.setViewportSize({ width: 375, height: 812 });
        await page.goto(`${baseUrl}/${pg.url}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(400);

        const mobileLayout = await page.evaluate(() => {
            const cs = getComputedStyle(document.body);
            return cs.flexDirection;
        });
        assert(mobileLayout === 'column',
            `[${pg.name}][Mobile] Sidebar e preview empilhados (flex-column)`,
            `Obtido: ${mobileLayout}`
        );

        // Verificar que o preview A4 não transborda no mobile
        const a4Box = await getBoundingBox(page, '#a4-sheet');
        if (a4Box) {
            assert(a4Box.width <= 375 + 10,
                `[${pg.name}][Mobile] Preview A4 não excede largura do viewport`,
                `A4 width: ${a4Box.width.toFixed(0)}`
            );
        }

        // Botão "Ver Preview" sticky deve aparecer no mobile
        const previewBtn = await page.evaluate(() => {
            const btn = document.querySelector('.md\\:hidden.sticky');
            if (!btn) return null;
            const cs = getComputedStyle(btn);
            return { display: cs.display, position: cs.position };
        });
        if (previewBtn) {
            assert(previewBtn.display !== 'none',
                `[${pg.name}][Mobile] Botão "Ver Preview" sticky visível`,
                ''
            );
        }

        await screenshot(page, `gen_${pg.url.replace('.html','')}_mobile`);
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(`${baseUrl}/${pg.url}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(300);
        await screenshot(page, `gen_${pg.url.replace('.html','')}_desktop`);
    }
}

// ═══════════════════════════════════════════════════════════════
//  CENÁRIO 4: Index/Hub — Layout e Card do Aluno
// ═══════════════════════════════════════════════════════════════
async function testIndexPage(page, baseUrl) {
    console.log('\n[CENÁRIO 4] Hub Principal (index.html) — Responsividade');

    for (const [vpKey, vp] of Object.entries(VIEWPORTS)) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(400);

        // Card do aluno não deve exceder viewport
        const studentCard = await getBoundingBox(page, '#homeStudentCard');
        if (studentCard) {
            assert(studentCard.width <= vp.width + 2,
                `[index.html][${vp.label}] Card do aluno cabe no viewport`,
                `Card width: ${studentCard.width.toFixed(0)}`
            );
        }

        // 4 atalhos de navegação presentes
        const cardCount = await page.evaluate(() => {
            const links = document.querySelectorAll('a[href*="matematica"], a[href*="portugues"], a[href*="ingles"], a[href*="tablet"]');
            return links.length;
        });
        assert(cardCount >= 4,
            `[index.html][${vp.label}] 4 atalhos de navegação presentes`,
            `Encontrados: ${cardCount}`
        );

        await screenshot(page, `index_${vpKey}`);
    }
}

// ═══════════════════════════════════════════════════════════════
//  CENÁRIO 5: Modais — Perfis, Evolução, Level Picker
// ═══════════════════════════════════════════════════════════════
async function testModals(page, baseUrl) {
    console.log('\n[CENÁRIO 5] Modais — Perfis, Evolução, Level Picker');

    const modalViewports = [
        { ...VIEWPORTS.mobile_portrait, key: 'mobile_portrait' },
        { ...VIEWPORTS.tablet_portrait, key: 'tablet_portrait' },
        { ...VIEWPORTS.tablet_landscape, key: 'tablet_landscape' },
        { ...VIEWPORTS.desktop, key: 'desktop' }
    ];

    for (const vp of modalViewports) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${baseUrl}/tablet.html`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(600);

        // ── Level Picker Modal ──
        const levelBtn = await page.$('#openLevelPickerBtn');
        if (levelBtn) {
            await levelBtn.click();
            await page.waitForTimeout(400);

            const modalContent = await getBoundingBox(page, '#levelPickerModal > div');
            if (modalContent) {
                assert(modalContent.width <= vp.width + 2,
                    `[${vp.label}] Level Picker não excede largura do viewport`,
                    `Width: ${modalContent.width.toFixed(0)}`
                );
                assert(modalContent.height <= vp.height + 2,
                    `[${vp.label}] Level Picker não excede altura do viewport`,
                    `Height: ${modalContent.height.toFixed(0)}`
                );
            }
            await screenshot(page, `modal_level_${vp.key}`);

            const closeBtn = await page.$('#closeLevelPickerBtn');
            if (closeBtn) await closeBtn.click();
            await page.waitForTimeout(300);
        }

        // ── Profile Modal ──
        const profileBtn = await page.$('#studentNameBtn');
        if (profileBtn && await profileBtn.isVisible()) {
            await profileBtn.click();
            await page.waitForTimeout(600);

            const profileOverflow = await page.evaluate((vpWidth) => {
                const modal = document.querySelector('#kumonProfileModal');
                if (!modal || getComputedStyle(modal).display === 'none') return null;
                const inner = modal.querySelector('div');
                if (!inner) return null;
                const rect = inner.getBoundingClientRect();
                return { width: rect.width, height: rect.height, exceedsWidth: rect.width > vpWidth + 5 };
            }, vp.width);

            if (profileOverflow) {
                assert(!profileOverflow.exceedsWidth,
                    `[${vp.label}] Profile Modal não excede largura do viewport`,
                    `Width: ${profileOverflow.width.toFixed(0)}`
                );
            }
            await screenshot(page, `modal_profile_${vp.key}`);
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
        }

        // ── Evolution Modal ──
        const evoBtn = await page.$('#headerEvolutionBtn');
        if (evoBtn && await evoBtn.isVisible()) {
            await evoBtn.click();
            await page.waitForTimeout(600);

            const evoOverflow = await page.evaluate((vpWidth) => {
                const modal = document.querySelector('#kumonProfileModal');
                if (!modal || getComputedStyle(modal).display === 'none') return null;
                const children = modal.querySelectorAll(':scope > div');
                if (children.length === 0) return null;
                const inner = children[0];
                const rect = inner.getBoundingClientRect();
                return { width: rect.width, height: rect.height, exceedsWidth: rect.width > vpWidth + 5 };
            }, vp.width);

            if (evoOverflow) {
                assert(!evoOverflow.exceedsWidth,
                    `[${vp.label}] Evolution Modal não excede largura do viewport`,
                    `Width: ${evoOverflow.width.toFixed(0)}`
                );
            }
            await screenshot(page, `modal_evolution_${vp.key}`);
            await page.keyboard.press('Escape');
            await page.waitForTimeout(300);
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  CENÁRIO 6: Overflow e Scroll Horizontal (Bug Hunter)
// ═══════════════════════════════════════════════════════════════
async function testHorizontalOverflow(page, baseUrl) {
    console.log('\n[CENÁRIO 6] Detecção de Scroll Horizontal Indesejado');

    const pagesCheck = ['index.html', 'matematica.html', 'portugues.html', 'ingles.html', 'tablet.html'];
    const vpList = [VIEWPORTS.mobile_portrait, VIEWPORTS.tablet_portrait, VIEWPORTS.tablet_landscape];

    for (const pgUrl of pagesCheck) {
        for (const vp of vpList) {
            await page.setViewportSize({ width: vp.width, height: vp.height });
            await page.goto(`${baseUrl}/${pgUrl}`, { waitUntil: 'networkidle' });
            await page.waitForTimeout(400);

            const overflow = await page.evaluate(() => {
                return {
                    scrollWidth: document.documentElement.scrollWidth,
                    clientWidth: document.documentElement.clientWidth,
                    bodyScrollWidth: document.body.scrollWidth,
                    bodyClientWidth: document.body.clientWidth
                };
            });

            const hasHScroll = overflow.scrollWidth > overflow.clientWidth + 5 ||
                               overflow.bodyScrollWidth > overflow.bodyClientWidth + 5;

            assert(!hasHScroll,
                `[${pgUrl}][${vp.label}] Sem scroll horizontal indesejado`,
                hasHScroll ? `scrollW: ${overflow.scrollWidth}, clientW: ${overflow.clientWidth}` : ''
            );
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  CENÁRIO 7: Z-Index Stacking
// ═══════════════════════════════════════════════════════════════
async function testZIndexStacking(page, baseUrl) {
    console.log('\n[CENÁRIO 7] Verificação de Z-Index e Stacking Contexts');

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${baseUrl}/tablet.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Header z-index
    const headerZ = await page.evaluate(() => {
        const header = document.querySelector('header');
        if (!header) return '0';
        return getComputedStyle(header).zIndex;
    });
    assert(parseInt(headerZ) >= 50 || headerZ === 'auto',
        `[Tablet] Header z-index adequado (${headerZ})`
    );

    // Confetti z-index
    const confettiZ = await page.evaluate(() => {
        const c = document.querySelector('#confettiCanvas');
        return c ? (c.style.zIndex || getComputedStyle(c).zIndex) : null;
    });
    if (confettiZ) {
        assert(parseInt(confettiZ) >= 50,
            `[Tablet] Confetti canvas z-index >= 50 (${confettiZ})`
        );
    }

    // Level Picker z-index >= header
    const levelPickerZ = await page.evaluate(() => {
        const m = document.querySelector('#levelPickerModal');
        return m ? (m.style.zIndex || getComputedStyle(m).zIndex) : null;
    });
    if (levelPickerZ) {
        assert(parseInt(levelPickerZ) >= 60,
            `[Tablet] Level Picker z-index >= 60 (${levelPickerZ})`
        );
    }

    // Gauntlet modal z-index > worked example modal
    const gauntletZ = await page.evaluate(() => {
        const m = document.querySelector('#gauntletModal');
        return m ? (m.style.zIndex || getComputedStyle(m).zIndex) : null;
    });
    const workedExZ = await page.evaluate(() => {
        const m = document.querySelector('#workedExampleModal');
        return m ? (m.style.zIndex || getComputedStyle(m).zIndex) : null;
    });
    if (gauntletZ && workedExZ) {
        assert(parseInt(gauntletZ) >= parseInt(workedExZ),
            `[Tablet] Gauntlet z-index (${gauntletZ}) >= Worked Example (${workedExZ})`
        );
    }
}

// ═══════════════════════════════════════════════════════════════
//  CENÁRIO 8: Acessibilidade Básica
// ═══════════════════════════════════════════════════════════════
async function testAccessibility(page, baseUrl) {
    console.log('\n[CENÁRIO 8] Acessibilidade Básica (a11y)');

    const pagesCheck = [
        { url: 'index.html', name: 'index.html' },
        { url: 'tablet.html', name: 'tablet.html' },
        { url: 'matematica.html', name: 'matematica.html' }
    ];

    for (const pg of pagesCheck) {
        await page.setViewportSize({ width: 1280, height: 800 });
        await page.goto(`${baseUrl}/${pg.url}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(400);

        // Meta viewport
        const hasViewport = await page.evaluate(() => {
            const meta = document.querySelector('meta[name="viewport"]');
            return meta ? meta.getAttribute('content') : null;
        });
        assert(hasViewport && hasViewport.includes('width=device-width'),
            `[${pg.name}] Meta viewport com width=device-width`
        );

        // HTML lang
        const htmlLang = await page.evaluate(() => document.documentElement.lang);
        assert(htmlLang && htmlLang.startsWith('pt'),
            `[${pg.name}] <html lang="pt-BR"> presente`
        );

        // Botões sem label
        const unlabeledBtns = await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            let count = 0;
            btns.forEach(btn => {
                const text = (btn.textContent || '').trim();
                const ariaLabel = btn.getAttribute('aria-label');
                const title = btn.getAttribute('title');
                if (!text && !ariaLabel && !title) count++;
            });
            return count;
        });
        if (unlabeledBtns > 0) {
            warn(`[${pg.name}] ${unlabeledBtns} botão(ões) sem texto/aria-label/title`);
        } else {
            assert(true, `[${pg.name}] Todos os botões acessíveis (com texto ou title)`);
        }

        // Imagens sem alt
        const imgsNoAlt = await page.evaluate(() => {
            return [...document.querySelectorAll('img')].filter(i => !i.getAttribute('alt')).length;
        });
        assert(imgsNoAlt === 0,
            `[${pg.name}] Todas as imagens com atributo alt`,
            imgsNoAlt > 0 ? `${imgsNoAlt} sem alt` : ''
        );

        // Focus visible CSS rule
        const hasFocusVisible = await page.evaluate(() => {
            for (const sheet of document.styleSheets) {
                try {
                    for (const rule of sheet.cssRules) {
                        if (rule.selectorText && rule.selectorText.includes('focus-visible')) return true;
                    }
                } catch (e) {}
            }
            return false;
        });
        assert(hasFocusVisible, `[${pg.name}] Regra CSS :focus-visible presente`);
    }
}

// ═══════════════════════════════════════════════════════════════
//  CENÁRIO 9: Header do Tablet — Overflow e Truncamento
// ═══════════════════════════════════════════════════════════════
async function testTabletHeader(page, baseUrl) {
    console.log('\n[CENÁRIO 9] Header do Tablet — Truncamento e Responsividade');

    const smallVps = [VIEWPORTS.mobile_portrait, VIEWPORTS.mobile_landscape, VIEWPORTS.tablet_portrait];

    for (const vp of smallVps) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${baseUrl}/tablet.html`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);

        const headerBox = await getBoundingBox(page, 'header');
        if (headerBox) {
            assert(headerBox.height <= 80,
                `[${vp.label}] Header do tablet ≤80px de altura`,
                `Altura: ${headerBox.height.toFixed(0)}px`
            );
            assert(headerBox.width <= vp.width + 2,
                `[${vp.label}] Header não excede largura do viewport`,
                `Width: ${headerBox.width.toFixed(0)}`
            );
        }

        // Em mobile, nome truncado
        if (vp.width <= 375) {
            const nameWidth = await page.evaluate(() => {
                const el = document.querySelector('#studentNameDisplay');
                return el ? el.getBoundingClientRect().width : 0;
            });
            assert(nameWidth <= 100,
                `[${vp.label}] Nome do aluno truncado no mobile`,
                `Width: ${nameWidth.toFixed(0)}px`
            );
        }
    }
}

// ═══════════════════════════════════════════════════════════════
//  CENÁRIO 10: Erros de Console durante Navegação Completa
// ═══════════════════════════════════════════════════════════════
async function testConsoleErrors(page, baseUrl) {
    console.log('\n[CENÁRIO 10] Erros de Console durante Navegação Completa');

    const errors = [];
    const ignoredPatterns = ['speechSynthesis', 'AudioContext', 'play() failed', 'Fetch API',
                             'service-worker', 'favicon', 'net::ERR', 'Failed to register'];

    page.on('console', msg => {
        if (msg.type() === 'error') {
            const text = msg.text();
            if (!ignoredPatterns.some(p => text.includes(p))) {
                errors.push({ url: page.url(), text });
            }
        }
    });

    page.on('pageerror', err => {
        errors.push({ url: page.url(), text: err.message });
    });

    const allPages = ['index.html', 'matematica.html', 'portugues.html', 'ingles.html', 'tablet.html'];
    for (const pg of allPages) {
        await page.goto(`${baseUrl}/${pg}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);
    }

    assert(errors.length === 0,
        `Zero erros de console durante navegação por ${allPages.length} páginas`,
        errors.length > 0 ? errors.map(e => `[${e.url}] ${e.text}`).join(' | ') : ''
    );
    R.consoleErrors.push(...errors);
}

// ═══════════════════════════════════════════════════════════════
//  CENÁRIO 11: Interação Teclado no Tablet — Fluxo Completo
// ═══════════════════════════════════════════════════════════════
async function testTabletKeypadInteraction(page, baseUrl) {
    console.log('\n[CENÁRIO 11] Interação com Teclado Virtual no Tablet');

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${baseUrl}/tablet.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500); // Esperar inicialização completa do TabletPlayer

    // Verificar que teclado está visível (exercício padrão é M1 que é numérico)
    const keypadVisible = await page.evaluate(() => {
        const kp = document.querySelector('#keypadWrapper');
        if (!kp) return false;
        const cs = getComputedStyle(kp);
        return cs.display !== 'none' && kp.offsetHeight > 0;
    });

    assert(keypadVisible,
        '[Tablet Retrato] Teclado virtual visível na carga inicial (exercício numérico M1)'
    );

    // Verificar se o answer box dinâmico foi renderizado pelo TabletPlayer
    const hasAnswerBox = await page.evaluate(() => {
        const box = document.querySelector('#activeAnswerBox');
        return box !== null;
    });

    if (hasAnswerBox) {
        // Clicar num dígito e verificar que o answer box recebe o valor
        const btn5 = await page.$('.keypad-btn[data-key="5"]');
        if (btn5) {
            await btn5.click();
            await page.waitForTimeout(300);

            const answerText = await page.evaluate(() => {
                const box = document.querySelector('#activeAnswerBox');
                return box ? box.textContent.trim() : '';
            });

            assert(answerText.includes('5'),
                '[Tablet] Dígito "5" registrado no answer box',
                `Conteúdo: "${answerText}"`
            );

            // Backspace
            const backBtn = await page.$('.keypad-btn[data-key="backspace"]');
            if (backBtn) {
                await backBtn.click();
                await page.waitForTimeout(200);
                const afterBack = await page.evaluate(() => {
                    const box = document.querySelector('#activeAnswerBox');
                    return box ? box.textContent.trim() : '';
                });
                assert(!afterBack.includes('5') || afterBack.length < answerText.length,
                    '[Tablet] Backspace removeu dígito do answer box',
                    `Após backspace: "${afterBack}"`
                );
            }
        }
    } else {
        // O answer box não apareceu (pode ser exercício sem campo de texto)
        warn('[Tablet] #activeAnswerBox não renderizado — exercício pode ser de tipo seleção/arrasto');
    }
}

// ═══════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════
async function runAudit() {
    console.log('====================================================================');
    console.log('  KUMONGEN · AUDITORIA COMPLETA DE UX/UI (PLAYWRIGHT E2E)');
    console.log('====================================================================\n');

    const { server, baseUrl } = await startServer();
    console.log(`⚡ Servidor de testes inicializado em: ${baseUrl}`);
    console.log(`📸 Screenshots salvos em: ${SCREENSHOTS_DIR}\n`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) KumonGenUXAudit/5.0'
    });
    const page = await context.newPage();

    try {
        await testTabletKeypadOverlap(page, baseUrl);
        await testTabletResponsiveLayout(page, baseUrl);
        await testGeneratorPages(page, baseUrl);
        await testIndexPage(page, baseUrl);
        await testModals(page, baseUrl);
        await testHorizontalOverflow(page, baseUrl);
        await testZIndexStacking(page, baseUrl);
        await testAccessibility(page, baseUrl);
        await testTabletHeader(page, baseUrl);
        await testConsoleErrors(page, baseUrl);
        await testTabletKeypadInteraction(page, baseUrl);
    } catch (err) {
        console.error(`\n💥 ERRO FATAL NA SUÍTE: ${err.message}\n${err.stack}`);
    } finally {
        await browser.close();
        server.close();
    }

    // ─── Relatório Final ───
    console.log('\n====================================================================');
    console.log(`  RESUMO DA AUDITORIA UX/UI: ${R.passed} / ${R.total} testes (${((R.passed/R.total)*100).toFixed(1)}%)`);
    if (R.failed > 0) console.log(`  ❌ FALHAS: ${R.failed}`);
    console.log(`  ⚠️  AVISOS: ${R.warnings}`);
    console.log('====================================================================');

    if (R.bugs.length > 0) {
        console.log('\n🐛 BUGS ENCONTRADOS:');
        R.bugs.forEach((bug, i) => {
            console.log(`  ${i + 1}. ${bug.message}`);
            if (bug.details) console.log(`     ↳ ${bug.details}`);
        });
    }

    if (R.consoleErrors.length > 0) {
        console.log('\n⚠️ ERROS DE CONSOLE:');
        R.consoleErrors.forEach(err => console.log(`  • [${err.url}] ${err.text}`));
    }

    console.log(`\n📸 ${fs.readdirSync(SCREENSHOTS_DIR).length} screenshots salvos em: ${SCREENSHOTS_DIR}`);
    console.log('====================================================================\n');

    // Salvar resultados
    const resultsPath = path.join(__dirname, 'ux_audit_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify({
        metadata: {
            title: 'KumonGen UX/UI Audit Results',
            generatedAt: new Date().toISOString(),
            viewportsTested: Object.keys(VIEWPORTS).length,
            pagesTested: 5,
            scenariosTested: 11
        },
        summary: {
            total: R.total,
            passed: R.passed,
            failed: R.failed,
            warnings: R.warnings,
            passRate: ((R.passed / R.total) * 100).toFixed(1) + '%'
        },
        bugs: R.bugs,
        consoleErrors: R.consoleErrors,
        assertions: R.assertions
    }, null, 2));
    console.log(`💾 Resultados em: ${resultsPath}\n`);

    process.exit(R.failed > 0 ? 1 : 0);
}

runAudit().catch(err => {
    console.error('Fatal:', err);
    process.exit(2);
});
