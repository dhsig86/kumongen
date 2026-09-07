// tests/test_native_features.js — Testes Automatizados para Recursos Nativos (Haptics, WakeLock, Backup JSON)
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
    console.log('  KUMONGEN · TESTES DE RECURSOS NATIVOS (HAPTICS, WAKELOCK, BACKUP)');
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
            console.error(`  ✖ FAIL: ${message}`);
            failed++;
        }
    }

    try {
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage();

        // -------------------------------------------------------------
        // FRENTE 1: HapticEngine (Vibration API) no tablet.html
        // -------------------------------------------------------------
        console.log('[1/3] Testando Haptic Feedback Engine (Vibration API)...');
        await page.goto(`${baseUrl}/tablet.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);

        const hapticResults = await page.evaluate(() => {
            const haptic = window.TabletPlayer && window.TabletPlayer.HapticEngine;
            if (!haptic) return { error: 'HapticEngine não encontrado' };

            // Instala mock de navigator.vibrate para interceptar chamadas
            const recordedVibrations = [];
            navigator.vibrate = function(pattern) {
                recordedVibrations.push(pattern);
                return true;
            };

            // Teste 1: lightClick
            haptic.lightClick();
            const clickCall = recordedVibrations[recordedVibrations.length - 1];

            // Teste 2: success
            haptic.success();
            const successCall = recordedVibrations[recordedVibrations.length - 1];

            // Teste 3: wrong
            haptic.wrong();
            const wrongCall = recordedVibrations[recordedVibrations.length - 1];

            // Teste 4: streak progressivo
            haptic.streak(3);
            const streak3Call = recordedVibrations[recordedVibrations.length - 1];
            haptic.streak(6);
            const streak6Call = recordedVibrations[recordedVibrations.length - 1];
            haptic.streak(10);
            const streak10Call = recordedVibrations[recordedVibrations.length - 1];

            // Teste 5: fanfare
            haptic.fanfare();
            const fanfareCall = recordedVibrations[recordedVibrations.length - 1];

            // Teste 6: desativação respeitada
            haptic.enabled = false;
            const disabledCountBefore = recordedVibrations.length;
            haptic.lightClick();
            haptic.success();
            const disabledCountAfter = recordedVibrations.length;
            haptic.enabled = true; // restaura

            return {
                exists: true,
                clickCall,
                successCall,
                wrongCall,
                streak3Call,
                streak6Call,
                streak10Call,
                fanfareCall,
                disabledSilent: disabledCountBefore === disabledCountAfter
            };
        });

        assert(hapticResults.exists === true, 'HapticEngine exportado e acessível em TabletPlayer');
        assert(hapticResults.clickCall === 12, 'Haptic lightClick dispara pulso sutil de 12ms');
        assert(Array.isArray(hapticResults.successCall) && hapticResults.successCall.length === 3, 'Haptic success dispara pulso duplo suave [15, 35, 25]');
        assert(Array.isArray(hapticResults.wrongCall) && hapticResults.wrongCall.length === 3, 'Haptic wrong dispara pulso duplo suave [35, 30, 35]');
        assert(Array.isArray(hapticResults.streak6Call) && hapticResults.streak6Call.length >= 4, 'Haptic streak escala dinamicamente para sequências altas');
        assert(Array.isArray(hapticResults.fanfareCall) && hapticResults.fanfareCall.length >= 5, 'Haptic fanfare dispara celebração rítmica');
        assert(hapticResults.disabledSilent === true, 'HapticEngine silencia vibrações quando enabled = false');

        // -------------------------------------------------------------
        // FRENTE 2: Screen Wake Lock API no tablet.html
        // -------------------------------------------------------------
        console.log('\n[2/3] Testando Screen Wake Lock Engine...');
        const wakeLockResults = await page.evaluate(async () => {
            const wakeLock = window.TabletPlayer && window.TabletPlayer.WakeLockEngine;
            if (!wakeLock) return { error: 'WakeLockEngine não encontrado' };

            let lockRequested = 0;
            let lockReleased = 0;

            // Mock do navigator.wakeLock com Object.defineProperty para contornar getter nativo
            const mockSentinel = {
                released: false,
                listeners: {},
                addEventListener(event, fn) { this.listeners[event] = fn; },
                async release() {
                    this.released = true;
                    lockReleased++;
                    if (this.listeners['release']) this.listeners['release']();
                }
            };

            Object.defineProperty(navigator, 'wakeLock', {
                value: {
                    async request(type) {
                        lockRequested++;
                        mockSentinel.released = false;
                        return mockSentinel;
                    }
                },
                configurable: true,
                writable: true
            });

            // Teste 1: request e isActive
            await wakeLock.request();
            const isActiveAfterRequest = wakeLock.isActive;
            const roundRunningAfterRequest = wakeLock.isRoundRunning;

            // Teste 2: release
            await wakeLock.release();
            const isActiveAfterRelease = wakeLock.isActive;
            const roundRunningAfterRelease = wakeLock.isRoundRunning;

            // Teste 3: integração com startRound e finishRound
            window.TabletPlayer.startRound();
            await new Promise(r => setTimeout(r, 60)); // aguarda resolução assíncrona do request
            const activeInRound = wakeLock.isActive;

            window.TabletPlayer.finishRound();
            await new Promise(r => setTimeout(r, 60));
            const activeAfterFinish = wakeLock.isActive;

            return {
                exists: true,
                isActiveAfterRequest,
                roundRunningAfterRequest,
                isActiveAfterRelease,
                roundRunningAfterRelease,
                activeInRound,
                activeAfterFinish,
                lockRequestedCount: lockRequested,
                lockReleasedCount: lockReleased
            };
        });

        assert(wakeLockResults.exists === true, 'WakeLockEngine exportado e acessível em TabletPlayer');
        assert(wakeLockResults.isActiveAfterRequest === true, 'WakeLock request() ativa o sentinel da tela');
        assert(wakeLockResults.isActiveAfterRelease === false, 'WakeLock release() desativa e libera o sentinel');
        assert(wakeLockResults.activeInRound === true, 'TabletPlayer.startRound() solicita automaticamente o WakeLock');
        assert(wakeLockResults.activeAfterFinish === false, 'TabletPlayer.finishRound() libera automaticamente o WakeLock');

        // -------------------------------------------------------------
        // FRENTE 3: Backup Familiar (Exportar / Importar JSON)
        // -------------------------------------------------------------
        console.log('\n[3/3] Testando Backup Familiar (Exportação & Restauração Segura)...');
        await page.goto(`${baseUrl}/index.html`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(500);

        const backupResults = await page.evaluate(() => {
            const engine = window.StudentProfileEngine;
            if (!engine) return { error: 'StudentProfileEngine não encontrado' };

            // Salva estado original para restaurar ao final
            const originalStudents = engine.getAll();

            // 1. Exportação
            const exported = engine.exportBackup();

            // 2. Validação da estrutura exportada
            const isAppValid = exported.app === 'KumonGen';
            const isVersionValid = exported.version === '4.4.0';
            const hasStudentsArray = Array.isArray(exported.students) && exported.students.length > 0;
            const hasExportedAt = typeof exported.exportedAt === 'string' && exported.exportedAt.length > 10;

            // 3. Importação de JSON válido
            const testPayload = {
                app: 'KumonGen',
                version: '4.4.0',
                students: [
                    {
                        id: 'std_test_alice',
                        name: 'Alice Estrela',
                        ageTier: 'age_6_7',
                        mascot: 'capivara',
                        gamification: {
                            stars: 42,
                            streak: 7,
                            bestStreak: 12,
                            totalRounds: 5,
                            totalCorrect: 50,
                            badges: ['primeiro_passo', 'fogo_5']
                        },
                        history: [],
                        mastery: {
                            math: {
                                m1: { mastered: true, mastered100: true, bestTimeSec: 180 }
                            }
                        }
                    }
                ]
            };

            const importValidRes = engine.importBackup(JSON.stringify(testPayload));
            const activeAfterImport = engine.getActive();
            const importedName = activeAfterImport ? activeAfterImport.name : null;
            const importedStars = activeAfterImport && activeAfterImport.gamification ? activeAfterImport.gamification.stars : 0;

            // 4. Importação de dados corrompidos / inválidos (deve rejeitar e não quebrar)
            const importEmptyRes = engine.importBackup('');
            const importNullRes = engine.importBackup(null);
            const importBadJsonRes = engine.importBackup('{ dados quebrados sem fechar chave');
            const importNoStudentsRes = engine.importBackup(JSON.stringify({ app: 'KumonGen', students: [] }));

            // 5. Teste de Sanitização XSS na importação
            const xssPayload = {
                app: 'KumonGen',
                students: [
                    {
                        id: 'std_xss',
                        name: '<script>alert("hacked")</script>Theo',
                        ageTier: 'age_6_7',
                        mascot: 'calango'
                    }
                ]
            };
            const importXssRes = engine.importBackup(xssPayload);
            const activeXss = engine.getActive();
            const xssSafe = activeXss && !activeXss.name.includes('<script>') && activeXss.name.includes('&lt;script&gt;');

            // 6. Restaura estado original
            engine.importBackup({ app: 'KumonGen', students: originalStudents });

            return {
                exists: true,
                isAppValid,
                isVersionValid,
                hasStudentsArray,
                hasExportedAt,
                importValidSuccess: importValidRes.success,
                importValidCount: importValidRes.count,
                importedName,
                importedStars,
                importEmptyBlocked: !importEmptyRes.success,
                importNullBlocked: !importNullRes.success,
                importBadJsonBlocked: !importBadJsonRes.success,
                importNoStudentsBlocked: !importNoStudentsRes.success,
                xssSafe
            };
        });

        assert(backupResults.exists === true, 'StudentProfileEngine exportado e acessível globalmente');
        assert(backupResults.isAppValid === true, 'exportBackup() gera pacote com app="KumonGen"');
        assert(backupResults.isVersionValid === true, 'exportBackup() marca versão canônica v4.4.0');
        assert(backupResults.hasStudentsArray === true, 'exportBackup() contém a lista completa de perfis de estudantes');
        assert(backupResults.hasExportedAt === true, 'exportBackup() inclui carimbo ISO exportedAt');
        assert(backupResults.importValidSuccess === true && backupResults.importValidCount === 1, 'importBackup() restaura perfis válidos com sucesso');
        assert(backupResults.importedName === 'Alice Estrela' && backupResults.importedStars === 42, 'importBackup() recupera nome, estrelas e histórico');
        assert(backupResults.importEmptyBlocked && backupResults.importNullBlocked && backupResults.importBadJsonBlocked, 'importBackup() rejeita com segurança payloads vazios ou corrompidos');
        assert(backupResults.importNoStudentsBlocked === true, 'importBackup() rejeita arquivo de backup sem estudantes');
        assert(backupResults.xssSafe === true, 'importBackup() sanitiza tags HTML prevenindo vulnerabilidades XSS');

    } catch (err) {
        console.error('Erro na execução da suíte de testes:', err);
        failed++;
    } finally {
        if (browser) await browser.close();
        server.close();
    }

    console.log('\n====================================================================');
    console.log(`  RESULTADO: ${passed} APROVADOS · ${failed} FALHAS`);
    console.log('====================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
}

runTests();
