/**
 * KUMONGEN — SUÍTE DE VALIDAÇÃO DE UX/UI & POLIMENTO DE TELAS (E2E)
 * Valida ergonomia do Wizard, grid de 2 colunas, ausência de estouro em telas baixas,
 * navegação de vai e volta (Escape, Voltar, Cancelar, Backdrop) e responsividade multiscreen.
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

const UXResults = {
    total: 0,
    passed: 0,
    failed: 0,
    failures: []
};

function assert(condition, name, details = '') {
    UXResults.total++;
    if (condition) {
        UXResults.passed++;
        console.log(`  ✔ PASS: ${name}`);
    } else {
        UXResults.failed++;
        console.error(`  ✖ FAIL: ${name} ${details ? '(' + details + ')' : ''}`);
        UXResults.failures.push({ name, details });
    }
}

async function runUXPolishingSuite() {
    return new Promise((resolve) => {
        server.listen(0, async () => {
            const port = server.address().port;
            const baseUrl = `http://127.0.0.1:${port}`;
            console.log('\n====================================================================');
            console.log('  KUMONGEN · SUÍTE DE AUDITORIA & POLIMENTO DE UX/UI');
            console.log('====================================================================');
            console.log(`⚡ Servidor de testes: ${baseUrl}\n`);

            const browser = await chromium.launch({ headless: true });

            try {
                // -------------------------------------------------------------
                // CENÁRIO 1: WIZARD NO TABLET (1024x768) — 2 COLUNAS & ANTI-ESTOURO
                // -------------------------------------------------------------
                console.log('[CENÁRIO 1] Wizard no Tablet (1024x768) — Grid de 2 Colunas e Anti-Estouro');
                {
                    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
                    await page.goto(`${baseUrl}/tablet.html`);
                    await page.waitForLoadState('networkidle');
                    await page.waitForTimeout(400);

                    // O Wizard abre automaticamente
                    const step1Visible = await page.isVisible('#taskWizardModal');
                    assert(step1Visible, 'TaskWizard abre automaticamente na primeira sessão');

                    // Passo 1: Badges de contagem de níveis presentes
                    const badgeTexts = await page.$$eval('.wizard-subject-btn', btns => 
                        btns.map(b => b.innerText)
                    );
                    assert(badgeTexts.some(t => t.includes('10 níveis')), 'Badge de 10 níveis presente em Matemática');
                    assert(badgeTexts.some(t => t.includes('8 níveis')), 'Badge de 8 níveis presente em Português');
                    assert(badgeTexts.some(t => t.includes('7 níveis')), 'Badge de 7 níveis presente em Inglês');

                    // Clica em Matemática
                    await page.click('.wizard-subject-btn[data-subject="matematica"]');
                    await page.waitForTimeout(300);

                    // Verifica se renderizou o Passo 2 com o grid de 2 colunas
                    const gridColumns = await page.evaluate(() => {
                        const grid = document.querySelector('.wizard-level-grid');
                        if (!grid) return null;
                        const style = window.getComputedStyle(grid);
                        return {
                            display: style.display,
                            gridTemplateColumns: style.gridTemplateColumns.split(' ').length
                        };
                    });
                    assert(gridColumns && gridColumns.display === 'grid', 'Container de níveis usa display: grid');
                    assert(gridColumns && gridColumns.gridTemplateColumns === 2, 'Grid de níveis renderiza exatamente 2 colunas no tablet');

                    // Verifica se o modal cabe na altura da tela (sem estourar viewport de 768px)
                    const modalBox = await page.$eval('.wizard-card-modal', el => {
                        const r = el.getBoundingClientRect();
                        return { top: r.top, bottom: r.bottom, height: r.height };
                    });
                    assert(modalBox.bottom <= 768, `Modal não estoura a tela inferior (bottom: ${modalBox.bottom}px <= 768px)`);
                    assert(modalBox.top >= 0, `Modal centralizado com margem superior (top: ${modalBox.top}px >= 0)`);

                    // Verifica se os botões Voltar e Cancelar estão perfeitamente visíveis e dentro do viewport
                    const backBtnBox = await page.$eval('#wizardBackBtn', el => {
                        const r = el.getBoundingClientRect();
                        return { top: r.top, bottom: r.bottom, height: r.height };
                    });
                    assert(backBtnBox.bottom <= 768 && backBtnBox.height >= 32, 'Botão Voltar visível e acessível no rodapé do modal');

                    await page.close();
                }

                // -------------------------------------------------------------
                // CENÁRIO 2: FLUXO DE VAI E VOLTA, TECLADO ESC E BACKDROP
                // -------------------------------------------------------------
                console.log('\n[CENÁRIO 2] Fluxo de "Vai e Volta" Universal (ESC, Voltar, Backdrop)');
                {
                    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
                    await page.goto(`${baseUrl}/tablet.html`);
                    await page.waitForLoadState('networkidle');
                    await page.waitForTimeout(400);

                    // Passo 1 -> Clica em Português
                    await page.click('.wizard-subject-btn[data-subject="portugues"]');
                    await page.waitForTimeout(200);

                    // Passo 2 -> Clica no nível P3
                    await page.click('.wizard-level-btn[data-level="p3"]');
                    await page.waitForTimeout(200);

                    // Passo 3 ativo: Verifica que o resumo de P3 está visível
                    const step3Title = await page.innerText('.wizard-card-modal h3');
                    assert(step3Title.includes('Tudo pronto'), 'Passo 3 renderizado com confirmação do treino');

                    // Pressiona tecla ESC: deve voltar para o Passo 2 de Português
                    await page.keyboard.press('Escape');
                    await page.waitForTimeout(200);
                    const isStep2 = await page.evaluate(() => {
                        const h3 = document.querySelector('.wizard-card-modal h3');
                        return h3 && h3.innerText.includes('Escolha o Nível');
                    });
                    assert(isStep2, 'Tecla ESC no Passo 3 volta graciosamente para o Passo 2');

                    // Clica no botão Voltar no Passo 2: deve voltar para o Passo 1
                    await page.click('#wizardBackBtn');
                    await page.waitForTimeout(200);
                    const isStep1 = await page.evaluate(() => {
                        const h3 = document.querySelector('.wizard-card-modal h3');
                        return h3 && h3.innerText.includes('Escolha a Matéria');
                    });
                    assert(isStep1, 'Botão Voltar no Passo 2 retorna com fidelidade ao Passo 1');

                    // Pressiona ESC no Passo 1: fecha o modal
                    await page.keyboard.press('Escape');
                    await page.waitForTimeout(200);
                    const isClosedEsc = await page.evaluate(() => {
                        const m = document.getElementById('taskWizardModal');
                        return m ? m.style.display === 'none' : true;
                    });
                    assert(isClosedEsc, 'Tecla ESC no Passo 1 fecha o modal completamente');

                    // Reabre o Wizard via botão #newTaskBtn
                    await page.click('#newTaskBtn');
                    await page.waitForTimeout(200);
                    const reOpened = await page.isVisible('#taskWizardModal');
                    assert(reOpened, 'Botão #newTaskBtn reabre o Wizard instantaneamente');

                    // Testa clique no backdrop (fora do card) para fechar
                    await page.mouse.click(20, 20);
                    await page.waitForTimeout(200);
                    const isClosedBackdrop = await page.evaluate(() => {
                        const m = document.getElementById('taskWizardModal');
                        return m ? m.style.display === 'none' : true;
                    });
                    assert(isClosedBackdrop, 'Clique no backdrop escuro fecha o modal com segurança');

                    await page.close();
                }

                // -------------------------------------------------------------
                // CENÁRIO 3: TABLET HORIZONTAL DE BAIXA ALTURA (800x480)
                // -------------------------------------------------------------
                console.log('\n[CENÁRIO 3] Tablet em Orientação Paisagem de Baixa Altura (800x480)');
                {
                    const page = await browser.newPage({ viewport: { width: 800, height: 480 } });
                    await page.goto(`${baseUrl}/tablet.html`);
                    await page.waitForLoadState('networkidle');
                    await page.waitForTimeout(400);

                    // Vai para Matemática (10 opções)
                    await page.click('.wizard-subject-btn[data-subject="matematica"]');
                    await page.waitForTimeout(300);

                    // Verifica dimensões do modal em tela de 480px de altura
                    const lowHeightCheck = await page.evaluate(() => {
                        const modal = document.querySelector('.wizard-card-modal');
                        const scroll = document.getElementById('wizardScrollArea');
                        const r = modal.getBoundingClientRect();
                        return {
                            bottom: r.bottom,
                            hasScroll: scroll ? scroll.scrollHeight > scroll.clientHeight : false,
                            cueExists: !!document.getElementById('scrollCueShadow')
                        };
                    });
                    assert(lowHeightCheck.bottom <= 480, `Modal ajustado verticalmente em tela de 480px (bottom: ${lowHeightCheck.bottom}px <= 480px)`);
                    assert(lowHeightCheck.hasScroll, 'Área interna de rolagem ativada suavemente para absorver os 10 níveis');
                    assert(lowHeightCheck.cueExists, 'Indicador visual de rolagem (scroll cue) presente no rodapé da lista');

                    // Rola até o final da lista e seleciona M10
                    await page.$eval('#wizardScrollArea', el => el.scrollTop = el.scrollHeight);
                    await page.waitForTimeout(200);
                    await page.click('.wizard-level-btn[data-level="m10"]');
                    await page.waitForTimeout(300);

                    // Confirmação no Passo 3 cabe na tela
                    const step3Height = await page.$eval('.wizard-card-modal', el => el.getBoundingClientRect().bottom);
                    assert(step3Height <= 480, `Passo 3 não transborda em tela de 480px (bottom: ${step3Height}px <= 480px)`);

                    // Clica em "Começar Tarefa"
                    await page.click('#wizardStartBtn');
                    await page.waitForTimeout(400);

                    const gameplayActive = await page.evaluate(() => {
                        return window.TabletPlayer && window.TabletPlayer.Session && window.TabletPlayer.Session.levelId === 'm10';
                    });
                    assert(gameplayActive, 'Transição para gameplay de M10 realizada com sucesso pós-wizard');

                    await page.close();
                }

                // -------------------------------------------------------------
                // CENÁRIO 4: LEVEL PICKER MODAL (25 NÍVEIS) & ESC
                // -------------------------------------------------------------
                console.log('\n[CENÁRIO 4] Seletor de 25 Níveis (LevelPickerModal) & Fechamento');
                {
                    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
                    await page.goto(`${baseUrl}/tablet.html?subject=matematica&level=m1`);
                    await page.waitForLoadState('networkidle');
                    await page.waitForTimeout(400);

                    // Abre modal de 25 níveis via botão do header
                    await page.click('#openLevelPickerBtn');
                    await page.waitForTimeout(200);
                    const pickerOpen = await page.isVisible('#levelPickerModal');
                    assert(pickerOpen, 'LevelPickerModal abre ao clicar no botão de nível do cabeçalho');

                    // Alterna para Português
                    await page.click('.level-tab-btn[data-subject="portugues"]');
                    await page.waitForTimeout(200);
                    const ptGridItem = await page.isVisible('#levelPickerGrid [data-level="p1"]');
                    assert(ptGridItem, 'Aba Português no LevelPickerModal carrega os níveis com sucesso');

                    // Fecha com tecla ESC
                    await page.keyboard.press('Escape');
                    await page.waitForTimeout(200);
                    const pickerClosed = await page.evaluate(() => {
                        const m = document.getElementById('levelPickerModal');
                        return m ? m.style.display === 'none' : true;
                    });
                    assert(pickerClosed, 'LevelPickerModal fecha graciosamente ao pressionar ESC');

                    await page.close();
                }

                // -------------------------------------------------------------
                // CENÁRIO 5: RESPONSIVIDADE MOBILE (390x844) & AUSÊNCIA DE SCROLL HORIZONTAL
                // -------------------------------------------------------------
                console.log('\n[CENÁRIO 5] Responsividade Mobile (390x844) — Zero Scroll Horizontal');
                {
                    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
                    await page.goto(`${baseUrl}/tablet.html`);
                    await page.waitForLoadState('networkidle');
                    await page.waitForTimeout(400);

                    // Verifica ausência de scroll horizontal no viewport
                    const bodyScroll = await page.evaluate(() => {
                        return {
                            scrollWidth: document.documentElement.scrollWidth,
                            clientWidth: document.documentElement.clientWidth
                        };
                    });
                    assert(bodyScroll.scrollWidth <= bodyScroll.clientWidth + 1, 'Zero overflow horizontal na tela do mobile');

                    // Abre Matemática no Wizard
                    await page.click('.wizard-subject-btn[data-subject="matematica"]');
                    await page.waitForTimeout(200);

                    const mobileGridColumns = await page.evaluate(() => {
                        const grid = document.querySelector('.wizard-level-grid');
                        if (!grid) return 0;
                        return window.getComputedStyle(grid).gridTemplateColumns.split(' ').length;
                    });
                    assert(mobileGridColumns >= 1, 'Grid de níveis no mobile renderizado perfeitamente');

                    await page.close();
                }

            } catch (err) {
                console.error('Erro na execução da suíte de UX:', err);
                UXResults.failed++;
                UXResults.failures.push({ name: 'Exceção não tratada', details: err.message });
            } finally {
                await browser.close();
                server.close();
            }

            console.log('\n====================================================================');
            console.log(`  RESULTADO DA SUÍTE DE UX: ${UXResults.passed} / ${UXResults.total} aprovados`);
            if (UXResults.failed === 0) {
                console.log('  🎉 100% DAS ASSERÇÕES DE UX/UI FORAM APROVADAS SEM REGRESSÕES!');
            } else {
                console.error(`  ⚠️ ${UXResults.failed} falhas detectadas.`);
            }
            console.log('====================================================================\n');

            resolve(UXResults.failed === 0);
        });
    });
}

runUXPolishingSuite().then(ok => {
    process.exit(ok ? 0 : 1);
});
