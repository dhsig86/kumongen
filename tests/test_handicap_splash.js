// tests/test_handicap_splash.js
// Suíte de Testes Automatizados E2E: Splash/Lobby do Tablet e Seletor de Handicap (3 Modos Kumon)
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
    '.ico': 'image/x-icon'
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

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✔ PASS: ${message}`);
    } else {
        failedTests++;
        console.error(`  ❌ FAIL: ${message}`);
    }
}

async function runTests() {
    console.log('====================================================================');
    console.log('  KUMONGEN · TESTES DO SPLASH DO TABLET & SELETOR DE HANDICAP');
    console.log('====================================================================\n');

    const { server, baseUrl } = await startServer();
    console.log(`⚡ Servidor de testes inicializado em: ${baseUrl}\n`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1024, height: 768 }
    });
    const page = await context.newPage();

    try {
        // -------------------------------------------------------------
        // CENÁRIO 1: Abertura Direta sem URL Params exibe Splash/Lobby
        // -------------------------------------------------------------
        console.log('[CENÁRIO 1] Splash/Lobby acolhedor ao abrir tablet.html sem parâmetros');
        await page.goto(`${baseUrl}/tablet.html`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(500);

        const isWizardVisible = await page.evaluate(() => {
            const wm = document.getElementById('taskWizardModal');
            return wm && wm.style.display === 'flex';
        });
        assert(isWizardVisible, 'Splash/Lobby (taskWizardModal) é exibido na carga sem parâmetros de URL');

        const step1Title = await page.evaluate(() => {
            const h = document.querySelector('#taskWizardModal h3');
            return h ? h.innerText : '';
        });
        assert(step1Title.includes('Escolha a Matéria'), 'Passo 1 do Wizard exibe "Escolha a Matéria"');

        // -------------------------------------------------------------
        // CENÁRIO 2: Navegação até o Seletor de Handicap (Passo 3)
        // -------------------------------------------------------------
        console.log('\n[CENÁRIO 2] Navegação e Renderização do Seletor de Handicap (3 Modos)');
        await page.click('.wizard-subject-btn[data-subject="matematica"]');
        await page.waitForTimeout(300);

        const step2Title = await page.evaluate(() => {
            const h = document.querySelector('#taskWizardModal h3');
            return h ? h.innerText : '';
        });
        assert(step2Title.includes('Escolha o Nível'), 'Passo 2 do Wizard exibe "Escolha o Nível"');

        // Clica no nível M2 (Adição)
        await page.click('.wizard-level-btn[data-level="m2"]');
        await page.waitForTimeout(300);

        const step3Title = await page.evaluate(() => {
            const h = document.querySelector('#taskWizardModal h3');
            return h ? h.innerText : '';
        });
        assert(step3Title.includes('Configurar Missão'), 'Passo 3 exibe "Configurar Missão"');

        const hasHandicapButtons = await page.evaluate(() => {
            const btns = document.querySelectorAll('.wizard-handicap-btn');
            return btns.length >= 10; // 9 botões de foco (1 a 9) + 2 botões mistos
        });
        assert(hasHandicapButtons, 'Seletor de Handicap no Passo 3 contém chips de foco e botões mistos');

        // -------------------------------------------------------------
        // CENÁRIO 3: Seleção de Handicap Foco (+3) e Geração da Rodada
        // -------------------------------------------------------------
        console.log('\n[CENÁRIO 3] Seleção de Handicap +3 e Validação de Operandos Gerados');
        await page.click('.wizard-handicap-btn[data-value="3"]');
        await page.waitForTimeout(200);

        const previewText = await page.evaluate(() => {
            const p = document.getElementById('wizardHandicapPreview');
            return p ? p.innerText : '';
        });
        assert(previewText.includes('+3'), 'Preview do Handicap exibe "+3" ao selecionar botão 3');

        // Clica em Iniciar Missão
        await page.click('#wizardStartBtn');
        await page.waitForTimeout(500);

        const isModalClosed = await page.evaluate(() => {
            const wm = document.getElementById('taskWizardModal');
            return !wm || wm.style.display === 'none';
        });
        assert(isModalClosed, 'Modal do Wizard é fechado ao iniciar a missão');

        const badgeText = await page.evaluate(() => {
            const b = document.getElementById('handicapBadgeText');
            return b ? b.innerText : '';
        });
        assert(badgeText.includes('+3'), 'Quick-Badge no cabeçalho exibe "+3"');

        // Valida que TODOS os 10 itens gerados para a rodada têm parcela +3
        const itemsValid = await page.evaluate(() => {
            const s = window.TabletPlayer.Session;
            if (!s || !s.items || s.items.length === 0) return false;
            return s.items.every(it => it.type === 'math' && it.operator === '+' && it.operand2 === 3);
        });
        assert(itemsValid, 'Todos os 10 itens gerados para M2 possuem operand2 === 3 (+3)');

        // -------------------------------------------------------------
        // CENÁRIO 4: Troca a Quente de Handicap via Quick-Badge no Header (+5)
        // -------------------------------------------------------------
        console.log('\n[CENÁRIO 4] Troca a quente de Handicap no cabeçalho via Popover (+5)');
        await page.click('#handicapQuickBtn');
        await page.waitForTimeout(200);

        const isPopoverVisible = await page.evaluate(() => {
            const p = document.getElementById('handicapPopover');
            return p && p.style.display !== 'none';
        });
        assert(isPopoverVisible, 'Popover de Handicap abre ao clicar no quick-badge');

        // Clica no chip +5 no popover
        await page.click('#handicapPopover .handicap-chip-btn[data-value="5"]');
        await page.waitForTimeout(300);

        const newBadgeText = await page.evaluate(() => {
            const b = document.getElementById('handicapBadgeText');
            return b ? b.innerText : '';
        });
        assert(newBadgeText.includes('+5'), 'Quick-Badge no cabeçalho atualizado para "+5"');

        const newItemsValid = await page.evaluate(() => {
            const s = window.TabletPlayer.Session;
            if (!s || !s.items || s.items.length === 0) return false;
            // Itens a partir do índice atual devem ter operand2 === 5
            return s.items.slice(s.currentIndex).every(it => it.operand2 === 5);
        });
        assert(newItemsValid, 'Perguntas subsequentes da rodada foram atualizadas para operand2 === 5 (+5)');

        // -------------------------------------------------------------
        // CENÁRIO 5: Modo Misto Completo (Kumon Master 1 a 9)
        // -------------------------------------------------------------
        console.log('\n[CENÁRIO 5] Modo Misto Completo (Kumon Master)');
        await page.click('#handicapQuickBtn');
        await page.waitForTimeout(200);
        await page.click('#handicapPopover .handicap-chip-btn[data-mode="mixed_full"]');
        await page.waitForTimeout(300);

        const masterBadgeText = await page.evaluate(() => {
            const b = document.getElementById('handicapBadgeText');
            return b ? b.innerText : '';
        });
        assert(masterBadgeText.includes('Master') || masterBadgeText.includes('1-9'), 'Quick-Badge exibe indicador do modo Master 1-9');

        // Gera 50 itens via motor de matemática e avalia distribuição de parcelas
        const hasVariedOperands = await page.evaluate(() => {
            const sub = window.KumonSubjects.matematica;
            const level = sub.levels.find(l => l.id === 'm2');
            const items = sub.generate(level, 50, { handicap: { mode: 'mixed_full' } });
            const uniqueOperands = new Set(items.map(it => it.operand2));
            return uniqueOperands.size >= 5; // Deve ter boa variedade entre 1 e 9
        });
        assert(hasVariedOperands, 'Modo Kumon Master gera parcelas diversificadas entre 1 e 9 (>= 5 operandos únicos em 50 amostras)');

        // -------------------------------------------------------------
        // CENÁRIO 6: Botão "Nova Tarefa" no Header reabre o Splash/Lobby
        // -------------------------------------------------------------
        console.log('\n[CENÁRIO 6] Reabertura Consistente do Splash/Lobby via Botão "Nova Tarefa"');
        await page.click('#newTaskBtn');
        await page.waitForTimeout(300);

        const isReopened = await page.evaluate(() => {
            const wm = document.getElementById('taskWizardModal');
            return wm && wm.style.display === 'flex';
        });
        assert(isReopened, 'Clicar em "Nova Tarefa" reabre o Splash/Lobby instantaneamente');

        // Fecha o modal do Wizard para liberar a tela
        await page.evaluate(() => {
            const wm = document.getElementById('taskWizardModal');
            if (wm) wm.style.display = 'none';
        });
        await page.waitForTimeout(300);

        // -------------------------------------------------------------
        // CENÁRIO 7: Botão "Nova Missão" no Idle State pós-rodada
        // -------------------------------------------------------------
        console.log('\n[CENÁRIO 7] Tela pós-rodada (Idle State) com botão "Nova Missão"');
        await page.evaluate(() => {
            window.TabletPlayer.showIdleState();
        });
        await page.waitForTimeout(300);

        const hasIdleNewTaskBtn = await page.$('#idleNewTaskBtn') !== null;
        assert(hasIdleNewTaskBtn, 'Botão #idleNewTaskBtn ("Nova Missão") está presente no Idle State');

        await page.evaluate(() => {
            const btn = document.getElementById('idleNewTaskBtn');
            if (btn) btn.click();
        });
        await page.waitForTimeout(300);

        const isLobbyOpenFromIdle = await page.evaluate(() => {
            const wm = document.getElementById('taskWizardModal');
            return wm && wm.style.display === 'flex';
        });
        assert(isLobbyOpenFromIdle, 'Clicar em #idleNewTaskBtn abre o Splash/Lobby para nova seleção');

        // -------------------------------------------------------------
        // CENÁRIO 8: Entrada via URL com matéria e nível (ex: vindo de matematica.html)
        // -------------------------------------------------------------
        console.log('\n[CENÁRIO 8] Entrada via URL com parâmetros (tablet.html?subject=matematica&level=m2)');
        await page.goto(`${baseUrl}/tablet.html?subject=matematica&level=m2`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(400);

        const step3Direct = await page.evaluate(() => {
            const h = document.querySelector('#taskWizardModal h3');
            return h ? h.innerText : '';
        });
        assert(step3Direct.includes('Configurar Missão'), 'Abertura com ?level=m2 abre diretamente no Passo 3');

        const previewDirectText = await page.evaluate(() => {
            const p = document.getElementById('wizardHandicapPreview');
            return p ? p.innerText : '';
        });
        assert(previewDirectText.includes('Aleatória'), 'Passo 3 inicia com modo Aleatória (Kumon Master) por padrão');

        // Clica em iniciar missão sem alterar nada e valida que gerou operações variadas (não fixas em 1)
        await page.click('#wizardStartBtn');
        await page.waitForTimeout(400);

        const itemsDiverse = await page.evaluate(() => {
            const s = window.TabletPlayer.Session;
            if (!s || !s.items || s.items.length === 0) return false;
            const op2Values = new Set(s.items.map(it => it.operand2));
            return op2Values.size >= 3; // Em 10 contas de soma aleatória, deve haver pelo menos 3 operandos diferentes
        });
        assert(itemsDiverse, 'Soma Aleatória gerou parcelas diversificadas (não travadas em +1)');

        // -------------------------------------------------------------
        // CENÁRIO 9: Contraste do Campo de Nome de Perfil em index.html
        // -------------------------------------------------------------
        console.log('\n[CENÁRIO 9] Verificação de Contraste no Campo de Nome de Perfil (index.html)');
        const indexPage = await context.newPage();
        await indexPage.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle' });
        await indexPage.waitForTimeout(400);

        // Abre modal de novo perfil
        await indexPage.evaluate(() => {
            if (window.openStudentProfiles) window.openStudentProfiles('form');
        });
        await indexPage.waitForTimeout(400);

        const inputStyle = await indexPage.evaluate(() => {
            const input = document.getElementById('inputStudentName');
            if (!input) return null;
            const computed = window.getComputedStyle(input);
            return {
                color: computed.color,
                bgColor: computed.backgroundColor
            };
        });
        assert(inputStyle !== null, 'Campo #inputStudentName existe no modal de perfil');
        // rgb(15, 23, 42) é #0f172a
        const isNotWhiteText = inputStyle && inputStyle.color !== 'rgb(255, 255, 255)';
        assert(isNotWhiteText, `Texto do input tem alto contraste (cor computada: ${inputStyle ? inputStyle.color : 'null'})`);
        await indexPage.close();

        // -------------------------------------------------------------
        // CENÁRIO 10: Modal Final em Formato Paisagem (Tablet Landscape)
        // -------------------------------------------------------------
        console.log('\n[CENÁRIO 10] Redesign e Rolagem do Modal Final em Formato Paisagem (1024×600)');
        await page.setViewportSize({ width: 1024, height: 600 });
        await page.waitForTimeout(300);

        // Dispara modal final de rodada
        await page.evaluate(() => {
            window.TabletPlayer.finishRound();
        });
        await page.waitForTimeout(400);

        const modalState = await page.evaluate(() => {
            const modal = document.getElementById('roundFinishedModal');
            if (!modal || modal.style.display === 'none') return null;
            const card = modal.querySelector('.tablet-modal-card');
            const rect = card ? card.getBoundingClientRect() : null;
            const computed = window.getComputedStyle(modal);
            return {
                visible: true,
                overflowY: computed.overflowY,
                zIndex: computed.zIndex,
                cardHeight: rect ? rect.height : 0,
                cardTop: rect ? rect.top : 0
            };
        });

        assert(modalState && modalState.visible, 'Modal final (#roundFinishedModal) exibido com sucesso');
        assert(modalState && modalState.overflowY === 'auto', 'Modal backdrop possui overflow-y: auto para rolagem');
        assert(modalState && Number(modalState.zIndex) >= 50, 'Z-Index do modal final (>=50) fica acima do cabeçalho');
        assert(modalState && modalState.cardTop >= 0, 'Topo do card do modal não fica cortado fora da tela (top >= 0)');
        assert(modalState && modalState.cardHeight < 580, `Card em formato 2 colunas tem altura compacta (${modalState ? modalState.cardHeight : 0}px < 580px)`);

        // Fecha modal
        await page.click('#closeSummaryBtn');
        await page.waitForTimeout(300);

    } catch (err) {
        console.error('Erro fatal durante execução do teste:', err);
        assert(false, `Exceção não tratada: ${err.message}`);
    } finally {
        await browser.close();
        await new Promise((res) => server.close(res));
    }

    console.log('\n====================================================================');
    console.log(`  RESULTADO: ${passedTests} / ${totalTests} asserções aprovadas (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    console.log('====================================================================\n');

    process.exit(failedTests > 0 ? 1 : 0);
}

runTests();
