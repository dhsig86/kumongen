// Suíte de Testes Automatizados de Hardening de Segurança 007
// Valida defesas contra XSS, quarentena de dados corrompidos, resiliência de SafeStorage e importBackup
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('====================================================================');
console.log('  KUMONGEN · SUÍTE DE TESTES DE HARDENING DE SEGURANÇA 007 (BLUE TEAM)');
console.log('====================================================================\n');

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
    totalTests++;
    try {
        fn();
        passedTests++;
        console.log(`  ✔ PASS: ${name}`);
    } catch (err) {
        console.error(`  ✖ FAIL: ${name}`);
        console.error(`         ${err.message}`);
    }
}

// 1. CARREGA E EXECUTA STUDENT-PROFILES NO AMBIENTE SIMULADO
function createEnvironment() {
    const memoryStore = {};
    const mockLocalStorage = {
        getItem(k) { return Object.prototype.hasOwnProperty.call(memoryStore, k) ? memoryStore[k] : null; },
        setItem(k, v) { memoryStore[k] = String(v); },
        removeItem(k) { delete memoryStore[k]; },
        clear() { for (const k of Object.keys(memoryStore)) delete memoryStore[k]; }
    };

    const ctx = {
        console: {
            log: () => {},
            warn: () => {},
            error: () => {}
        },
        Date,
        Math,
        JSON,
        String,
        Number,
        Array,
        Object,
        URL: { createObjectURL: () => 'blob:mock', revokeObjectURL: () => {} },
        Blob: class { constructor(parts, opts) { this.parts = parts; this.opts = opts; } },
        CustomEvent: class { constructor(name, detail) { this.name = name; this.detail = detail; } },
        window: {
            localStorage: mockLocalStorage,
            dispatchEvent: () => {}
        },
        document: {
            createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, style: {} }),
            body: { appendChild: () => {}, removeChild: () => {} }
        }
    };
    ctx.window.window = ctx.window;
    vm.createContext(ctx);

    const code = fs.readFileSync(path.join(__dirname, '..', 'student-profiles.js'), 'utf-8');
    vm.runInContext(code, ctx);

    return { ctx, memoryStore, mockLocalStorage };
}

// ====================================================================
// CENÁRIO 1: SANITIZADOR UNIVERSAL ESCAPEHTML (PREVENÇÃO DE XSS)
// ====================================================================
console.log('[CENÁRIO 1] Sanitizador Universal escapeHtml (Defesa contra DOM XSS)');

const env1 = createEnvironment();
const { escapeHtml } = env1.ctx.window;

test('escapeHtml está disponível globalmente em window', () => {
    assert.strictEqual(typeof escapeHtml, 'function');
});

test('Sanitiza tags HTML perigosas (<script>, <img>, <iframe>)', () => {
    const malicious = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
    const clean = escapeHtml(malicious);
    assert(!clean.includes('<script>'), 'Não deve conter <script>');
    assert(!clean.includes('</script>'), 'Não deve conter </script>');
    assert(!clean.includes('<img'), 'Não deve conter <img');
    assert(clean.includes('&lt;script&gt;'), 'Deve conter &lt;script&gt;');
    assert(clean.includes('&lt;img src=x onerror=alert(1)&gt;'), 'Deve conter entidades seguras');
});

test('Sanitiza aspas duplas, aspas simples e ampersand', () => {
    const input = `Tom & "Jerry" 'cat'`;
    const clean = escapeHtml(input);
    assert.strictEqual(clean, 'Tom &amp; &quot;Jerry&quot; &#039;cat&#039;');
});

test('Tolera valores nulos, indefinidos ou numéricos com segurança', () => {
    assert.strictEqual(escapeHtml(null), '');
    assert.strictEqual(escapeHtml(undefined), '');
    assert.strictEqual(escapeHtml(123), '123');
    assert.strictEqual(escapeHtml(0), '0');
});

// ====================================================================
// CENÁRIO 2: SAFESTORAGE GLOBAL & RESILIÊNCIA A FALHAS
// ====================================================================
console.log('\n[CENÁRIO 2] SafeStorage Global com Fallback em Memória e QuotaExceeded');

const env2 = createEnvironment();
const { SafeStorage } = env2.ctx.window;

test('SafeStorage está exposto globalmente em window.SafeStorage', () => {
    assert.strictEqual(typeof SafeStorage, 'object');
    assert.strictEqual(typeof SafeStorage.getItem, 'function');
    assert.strictEqual(typeof SafeStorage.setItem, 'function');
    assert.strictEqual(typeof SafeStorage.removeItem, 'function');
});

test('SafeStorage grava e recupera dados normalmente com localStorage funcional', () => {
    SafeStorage.setItem('test_key', 'hello_world');
    assert.strictEqual(SafeStorage.getItem('test_key'), 'hello_world');
    assert.strictEqual(env2.memoryStore['test_key'], 'hello_world');
    SafeStorage.removeItem('test_key');
    assert.strictEqual(SafeStorage.getItem('test_key'), null);
});

test('SafeStorage migra transparentemente para memória quando localStorage lança QuotaExceededError', () => {
    // Simula navegador lançando QuotaExceededError
    env2.ctx.window.localStorage.setItem = () => {
        const err = new Error('QuotaExceededError: DOM Exception 22');
        err.name = 'QuotaExceededError';
        throw err;
    };

    // SafeStorage não deve quebrar nem propagar a exceção
    const result = SafeStorage.setItem('quota_test', 'persisted_in_memory');
    assert.strictEqual(result, false, 'Deve retornar false indicando fallback em memória');
    assert.strictEqual(SafeStorage.getItem('quota_test'), 'persisted_in_memory', 'Deve recuperar da memória');
});

// ====================================================================
// CENÁRIO 3: QUARENTENA AUTOMÁTICA EM DADOS CORROMPIDOS (GETALL)
// ====================================================================
console.log('\n[CENÁRIO 3] Quarentena Automática de Payloads Corrompidos (Anti-Wipeout)');

const env3 = createEnvironment();
const { StudentProfileEngine } = env3.ctx.window;

test('Preserva payload malformado em chave de quarentena com timestamp e restaura default', () => {
    const corruptedJson = '[{"id":"std_1","name":"Alice",'; // JSON sintaticamente truncado
    env3.memoryStore['kumongen_students'] = corruptedJson;

    const list = StudentProfileEngine.getAll();

    // 1. Verificação da quarentena
    const quarantineKeys = Object.keys(env3.memoryStore).filter(k => k.startsWith('kumongen_students_corrupted_bak_'));
    assert(quarantineKeys.length >= 1, 'Deve ter criado pelo menos uma chave de quarentena');
    assert.strictEqual(env3.memoryStore[quarantineKeys[0]], corruptedJson, 'Dado corrompido deve estar preservado intacto');

    // 2. Verificação de recuperação segura
    assert(Array.isArray(list) && list.length >= 1, 'Deve ter restaurado perfil padrão seguro');
    assert.strictEqual(list[0].id, 'std_default');
});

// ====================================================================
// CENÁRIO 4: IMPORTBACKUP SEGURO COM VALIDAÇÃO ESTRITA DE SCHEMA
// ====================================================================
console.log('\n[CENÁRIO 4] Validação e Sanitização em StudentProfileEngine.importBackup');

const env4 = createEnvironment();
const engine = env4.ctx.window.StudentProfileEngine;

test('Rejeita payloads de backup nulos, vazios ou sintaticamente inválidos', () => {
    assert.strictEqual(engine.importBackup(null).success, false);
    assert.strictEqual(engine.importBackup('').success, false);
    assert.strictEqual(engine.importBackup('{not_valid_json}').success, false);
    assert.strictEqual(engine.importBackup(JSON.stringify({ students: [] })).success, false);
});

test('Sanitiza injeção XSS em nomes de estudantes importados', () => {
    const backupData = {
        app: 'KumonGen',
        version: '4.0.0',
        activeStudentId: 'std_xss_test',
        students: [
            {
                id: 'std_xss_test',
                name: '<script>alert(1)</script>Lucas',
                ageTier: 'age_6_7',
                mascot: 'capivara',
                gamification: { stars: 15, streak: 3 }
            }
        ]
    };

    const res = engine.importBackup(JSON.stringify(backupData));
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.count, 1);

    const imported = engine.getById('std_xss_test');
    assert(imported !== null, 'Estudante importado deve existir');
    assert(!imported.name.includes('<script>'), 'Nome não pode conter script puro');
    assert(imported.name.includes('&lt;script&gt;'), 'Nome deve ser sanitizado com entidades seguras');
});

test('Normaliza mascote e ageTier inválidos para valores canônicos padrão', () => {
    const backupData = {
        students: [
            {
                name: 'Clara',
                ageTier: 'invalid_age_tier',
                mascot: 'alien_monster',
                gamification: { stars: 'cem', streak: -10 }
            }
        ]
    };

    const res = engine.importBackup(JSON.stringify(backupData));
    assert.strictEqual(res.success, true);

    const active = engine.getActive();
    assert.strictEqual(active.name, 'Clara');
    assert.strictEqual(active.ageTier, 'age_6_7', 'Deve normalizar para age_6_7');
    assert.strictEqual(active.mascot, 'jaguar', 'Deve normalizar para jaguar');
    assert.strictEqual(active.gamification.stars, 0, 'Stars não numérico deve normalizar para 0');
    assert.strictEqual(active.gamification.streak, 0, 'Streak negativo deve normalizar para 0');
});

// ====================================================================
// CENÁRIO 5: VERIFICAÇÃO DE VERCEL.JSON E CABEÇALHOS HTTP CSP
// ====================================================================
console.log('\n[CENÁRIO 5] Verificação dos Cabeçalhos de Segurança HTTP (vercel.json)');

test('vercel.json existe e possui sintaxe JSON válida', () => {
    const vercelPath = path.join(__dirname, '..', 'vercel.json');
    assert(fs.existsSync(vercelPath), 'vercel.json deve existir na raiz');
    const content = JSON.parse(fs.readFileSync(vercelPath, 'utf-8'));
    assert(Array.isArray(content.headers), 'Deve conter array de headers');
});

test('vercel.json define CSP, nosniff, SAMEORIGIN e Referrer-Policy', () => {
    const content = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf-8'));
    const headersList = content.headers[0].headers;
    const headerMap = {};
    headersList.forEach(h => { headerMap[h.key] = h.value; });

    assert(headerMap['Content-Security-Policy'], 'Deve definir Content-Security-Policy');
    assert(headerMap['Content-Security-Policy'].includes("default-src 'self'"), 'CSP deve restringir default-src');
    assert(headerMap['Content-Security-Policy'].includes("https://cdnjs.cloudflare.com"), 'CSP deve permitir cdnjs');
    assert.strictEqual(headerMap['X-Content-Type-Options'], 'nosniff');
    assert.strictEqual(headerMap['X-Frame-Options'], 'SAMEORIGIN');
    assert.strictEqual(headerMap['Referrer-Policy'], 'strict-origin-when-cross-origin');
    assert(headerMap['Permissions-Policy'], 'Deve definir Permissions-Policy');
});

// ====================================================================
// RESUMO FINAL
// ====================================================================
console.log('\n====================================================================');
console.log(`  RESUMO DA SUÍTE DE HARDENING: ${passedTests} / ${totalTests} testes aprovados (${Math.round(passedTests/totalTests*100)}%)`);
console.log('====================================================================');

if (passedTests === totalTests) {
    console.log('  ✅ TODOS OS TESTES DE HARDENING DE SEGURANÇA FORAM APROVADOS COM SUCESSO!\n');
    process.exit(0);
} else {
    console.error(`  ❌ ${totalTests - passedTests} testes falharam!\n`);
    process.exit(1);
}
