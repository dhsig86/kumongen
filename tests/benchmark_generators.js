#!/usr/bin/env node
/**
 * ============================================================================
 * KumonGen — Suíte de Benchmarking e Teste de Carga de Geradores Curriculares
 * Arquivo: tests/benchmark_generators.js
 * ============================================================================
 * 
 * Executa medição de latência de geração para todos os 25 níveis curriculares:
 * - Matemática: M1 a M10 (10 níveis)
 * - Português: P1 a P8 (8 níveis)
 * - Inglês: I1 a I7 (7 níveis)
 * 
 * Protocolo de Medição por Nível:
 * - Warmup: 50 iterações (para descarte de overhead JIT V8)
 * - Amostragem: N = 500 iterações cronometradas com performance.now()
 * - Cálculo estatístico rigoroso: Min, Média, Mediana (p50), p95, p99, Max, Desvio Padrão
 * - Medição de delta de heap de memória (process.memoryUsage().heapUsed)
 * - Critério de aceitação: Média p95 < 20ms por nível
 * - Persistência dos resultados: tests/benchmark_results_generators.json
 * ============================================================================
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const os = require('os');
const { performance } = require('perf_hooks');

// ============================================================================
// 1. CONFIGURAÇÃO E PARÂMETROS
// ============================================================================
const CONFIG = {
    warmupIterations: 50,
    sampleIterations: 500,
    batchSize: 10,               // 10 itens por rodada/folha padrão
    targetP95MaxMs: 20.0,        // Critério de aceitação: p95 < 20ms
    outputJsonPath: path.resolve(__dirname, 'benchmark_results_generators.json'),
    projectRoot: path.resolve(__dirname, '..')
};

// Cores ANSI para terminal
const c = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m',
    blue: '\x1b[34m',
    white: '\x1b[37m'
};

// ============================================================================
// 2. AMBIENTE SIMULADO (BROWSER CONTEXT VIA VM)
// ============================================================================
function createMockElement(tag = 'div') {
    return {
        tagName: tag.toUpperCase(),
        style: {},
        classList: {
            _classes: new Set(),
            add(...cls) { cls.forEach(c => this._classes.add(c)); },
            remove(...cls) { cls.forEach(c => this._classes.delete(c)); },
            contains(c) { return this._classes.has(c); },
            toggle(c) { if (this.contains(c)) this.remove(c); else this.add(c); }
        },
        children: [],
        appendChild(child) { this.children.push(child); return child; },
        removeChild(child) {
            const idx = this.children.indexOf(child);
            if (idx >= 0) this.children.splice(idx, 1);
            return child;
        },
        addEventListener: () => {},
        removeEventListener: () => {},
        setAttribute: () => {},
        getAttribute: () => null,
        innerHTML: '',
        innerText: '',
        textContent: '',
        focus: () => {},
        blur: () => {}
    };
}

function createBrowserEnvironment() {
    const mockBody = createMockElement('body');
    const mockHead = createMockElement('head');

    const sandbox = {
        console,
        performance,
        Math,
        Date,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
        localStorage: {
            _data: {
                kumongen_tutorial_seen: 'true',
                kumongen_student_name: 'Benchmark Bot'
            },
            getItem: (k) => (k in sandbox.localStorage._data ? sandbox.localStorage._data[k] : null),
            setItem: (k, v) => { sandbox.localStorage._data[k] = String(v); },
            removeItem: (k) => { delete sandbox.localStorage._data[k]; },
            clear: () => { sandbox.localStorage._data = {}; }
        },
        document: {
            readyState: 'complete',
            body: mockBody,
            head: mockHead,
            getElementById: () => null,
            querySelector: () => null,
            querySelectorAll: () => [],
            createElement: (tag) => createMockElement(tag),
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true
        }
    };

    sandbox.window = sandbox;
    sandbox.global = sandbox;
    sandbox.self = sandbox;

    const context = vm.createContext(sandbox);

    // Carrega scripts curriculares na ordem estrita de dependências
    const scripts = ['gerador.js', 'matematica.js', 'portugues.js', 'ingles.js'];
    for (const scriptName of scripts) {
        const scriptPath = path.join(CONFIG.projectRoot, scriptName);
        if (!fs.existsSync(scriptPath)) {
            throw new Error(`Arquivo obrigatório não encontrado: ${scriptPath}`);
        }
        const scriptCode = fs.readFileSync(scriptPath, 'utf8');
        vm.runInContext(scriptCode, context, { filename: scriptName });
    }

    if (!sandbox.KumonSubjects || Object.keys(sandbox.KumonSubjects).length === 0) {
        throw new Error('Falha na inicialização: window.KumonSubjects não foi preenchido!');
    }

    return sandbox;
}

// ============================================================================
// 3. ESTATÍSTICA MATEMÁTICA RIGOROSA
// ============================================================================
function calculateStatistics(samples) {
    const n = samples.length;
    if (n === 0) {
        return { min: 0, mean: 0, p50: 0, p95: 0, p99: 0, max: 0, stdDev: 0 };
    }

    const sorted = [...samples].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[n - 1];
    const sum = samples.reduce((acc, val) => acc + val, 0);
    const mean = sum / n;

    // Interpolação linear exata de percentis (Método NIST / R-7)
    function percentile(p) {
        if (p <= 0) return sorted[0];
        if (p >= 100) return sorted[n - 1];
        const idx = (p / 100) * (n - 1);
        const lower = Math.floor(idx);
        const upper = Math.ceil(idx);
        const weight = idx - lower;
        return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    }

    const p50 = percentile(50);
    const p95 = percentile(95);
    const p99 = percentile(99);

    // Desvio padrão amostral corrigido por Bessel (N - 1)
    const variance = n > 1
        ? samples.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (n - 1)
        : 0;
    const stdDev = Math.sqrt(variance);

    return {
        min: Number(min.toFixed(4)),
        mean: Number(mean.toFixed(4)),
        p50: Number(p50.toFixed(4)),
        p95: Number(p95.toFixed(4)),
        p99: Number(p99.toFixed(4)),
        max: Number(max.toFixed(4)),
        stdDev: Number(stdDev.toFixed(4))
    };
}

// ============================================================================
// 4. PROTOCOLO DE BENCHMARKING POR NÍVEL
// ============================================================================
function benchmarkLevel(subjectKey, subject, levelDef) {
    const { warmupIterations, sampleIterations, batchSize } = CONFIG;

    // 1. Fase de Warmup (descarte de compilação JIT inicial)
    for (let i = 0; i < warmupIterations; i++) {
        const warmupItems = subject.generate(levelDef, batchSize);
        if (!Array.isArray(warmupItems) || warmupItems.length === 0) {
            throw new Error(`Gerador retornou lote vazio ou inválido durante warmup no nível ${levelDef.id}`);
        }
    }

    // Coleta de GC se exposto
    if (typeof global.gc === 'function') {
        global.gc();
    }

    // 2. Medição de Memória Inicial
    const memBefore = process.memoryUsage().heapUsed;

    // 3. Fase de Amostragem Cronometrada (N = 500)
    const sampleLatencies = new Float64Array(sampleIterations);
    let sampleItemsGenerated = 0;

    for (let i = 0; i < sampleIterations; i++) {
        const t0 = performance.now();
        const items = subject.generate(levelDef, batchSize);
        const t1 = performance.now();

        sampleLatencies[i] = t1 - t0;
        sampleItemsGenerated += items.length;
    }

    // 4. Medição de Memória Final
    const memAfter = process.memoryUsage().heapUsed;
    const heapDeltaBytes = memAfter - memBefore;
    const heapDeltaKB = Number((heapDeltaBytes / 1024).toFixed(2));

    // 5. Estatística
    const stats = calculateStatistics(Array.from(sampleLatencies));
    const passed = stats.p95 <= CONFIG.targetP95MaxMs;

    return {
        id: levelDef.id,
        levelKey: levelDef.id.toUpperCase(),
        subject: subjectKey,
        subjectTitle: subject.title || subjectKey,
        title: levelDef.title,
        type: levelDef.type || 'standard',
        warmupIterations,
        sampleIterations,
        batchSize,
        totalItemsGeneratedInSample: sampleItemsGenerated,
        ...stats,
        heapDeltaBytes,
        heapDeltaKB,
        status: passed ? 'PASS' : 'FAIL',
        passed
    };
}

// ============================================================================
// 5. APRESENTAÇÃO TABULAR E RELATÓRIO VISUAL
// ============================================================================
function renderTerminalBanner() {
    console.log(`\n${c.bold}${c.cyan}╔═══════════════════════════════════════════════════════════════════════════════════════════════╗${c.reset}`);
    console.log(`${c.bold}${c.cyan}║   KUMONGEN · SUÍTE DE BENCHMARKING DE ALTA PRECISÃO — 25 NÍVEIS CURRICULARES                  ║${c.reset}`);
    console.log(`${c.bold}${c.cyan}╚═══════════════════════════════════════════════════════════════════════════════════════════════╝${c.reset}`);
    console.log(`${c.dim}  Data/Hora: ${new Date().toISOString()} | Node: ${process.version} | SO: ${process.platform} (${process.arch})${c.reset}`);
    console.log(`${c.dim}  Protocolo: Warmup = ${CONFIG.warmupIterations} iter | Amostras = ${CONFIG.sampleIterations} iter/nível | Lote = ${CONFIG.batchSize} itens | Meta p95 < ${CONFIG.targetP95MaxMs}ms${c.reset}\n`);
}

function renderResultsTable(results) {
    // Cabeçalho da tabela
    const pad = (str, len, align = 'left') => {
        const s = String(str);
        if (s.length >= len) return s.slice(0, len);
        return align === 'right' ? s.padStart(len, ' ') : s.padEnd(len, ' ');
    };

    console.log(`${c.bold}┌─────┬───────────┬─────────────┬─────────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬───────────┬─────────────┬────────┐${c.reset}`);
    console.log(`${c.bold}│ ${pad('Nív', 3)} │ ${pad('Matéria', 9)} │ ${pad('Tipo', 11)} │ ${pad('Min (ms)', 11, 'right')} │ ${pad('Média', 8, 'right')} │ ${pad('p50', 8, 'right')} │ ${pad('p95', 8, 'right')} │ ${pad('p99', 8, 'right')} │ ${pad('Max (ms)', 8, 'right')} │ ${pad('Desvio', 8, 'right')} │ ${pad('Heap (KB)', 9, 'right')} │ ${pad('Amostras', 11, 'right')} │ ${pad('Status', 6)} │${c.reset}`);
    console.log(`${c.bold}├─────┼───────────┼─────────────┼─────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┼───────────┼─────────────┼────────┤${c.reset}`);

    for (const r of results) {
        const statusColor = r.passed ? `${c.green} PASS ${c.reset}` : `${c.red} FAIL ${c.reset}`;
        const p95Color = r.p95 <= CONFIG.targetP95MaxMs ? c.green : c.red;
        const heapSign = r.heapDeltaKB >= 0 ? `+${r.heapDeltaKB}` : `${r.heapDeltaKB}`;

        console.log(`│ ${c.bold}${pad(r.levelKey, 3)}${c.reset} │ ${pad(r.subjectTitle, 9)} │ ${pad(r.type, 11)} │ ${pad(r.min.toFixed(3), 11, 'right')} │ ${pad(r.mean.toFixed(3), 8, 'right')} │ ${pad(r.p50.toFixed(3), 8, 'right')} │ ${p95Color}${pad(r.p95.toFixed(3), 8, 'right')}${c.reset} │ ${pad(r.p99.toFixed(3), 8, 'right')} │ ${pad(r.max.toFixed(3), 8, 'right')} │ ${pad(r.stdDev.toFixed(3), 8, 'right')} │ ${pad(heapSign, 9, 'right')} │ ${pad(r.sampleIterations, 11, 'right')} │${statusColor}│`);
    }

    console.log(`${c.bold}└─────┴───────────┴─────────────┴─────────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┴───────────┴─────────────┴────────┘${c.reset}`);
}

function renderSummaryBox(summary, allPassed) {
    console.log(`\n${c.bold}================================================================================================${c.reset}`);
    console.log(`${c.bold}📊 RESUMO EXECUTIVO DO BENCHMARKING DE GERADORES:${c.reset}`);
    console.log(`  • Níveis Avaliados:          ${c.bold}${summary.totalLevels} de 25${c.reset} (10 Matemática, 8 Português, 7 Inglês)`);
    console.log(`  • Níveis Aprovados:          ${summary.allPassed ? c.green : c.red}${summary.passedLevels} / ${summary.totalLevels} (${summary.allPassed ? '100% de conformidade' : 'FALHAS DETECTADAS'})${c.reset}`);
    console.log(`  • Total de Iterações CLI:    ${summary.totalIterations.toLocaleString('pt-BR')} execuções (${summary.totalWarmupIterations} warmup + ${summary.totalSampleIterations} cronometradas)`);
    console.log(`  • Exercícios Totais Gerados: ${summary.totalItemsGenerated.toLocaleString('pt-BR')} itens de teste`);
    console.log(`  • Latência Média Global:     ${c.cyan}${summary.overallMeanMs.toFixed(4)} ms${c.reset}`);
    console.log(`  • Percentil 95 Global Médio: ${c.cyan}${summary.overallP95Ms.toFixed(4)} ms${c.reset} (Critério: < ${CONFIG.targetP95MaxMs} ms)`);
    console.log(`  • Pior p95 Encontrado:       ${c.yellow}${summary.worstP95Level} (${summary.worstP95Ms.toFixed(4)} ms)${c.reset}`);
    console.log(`  • Melhor p95 Encontrado:     ${c.green}${summary.bestP95Level} (${summary.bestP95Ms.toFixed(4)} ms)${c.reset}`);
    console.log(`  • Tempo Total da Bateria:    ${(summary.totalBenchmarkDurationMs / 1000).toFixed(2)} segundos`);
    console.log(`  • Variação Líquida de Heap:  ${(summary.totalHeapDeltaBytes / 1024).toFixed(2)} KB`);
    console.log(`  • Veredito Final:            ${allPassed ? `${c.bold}${c.green}✅ APROVADO — PERFORMANCE EXCEPCIONAL (p95 médio << 20ms)` : `${c.bold}${c.red}❌ REPROVADO`}${c.reset}`);
    console.log(`${c.bold}================================================================================================${c.reset}\n`);
}

// ============================================================================
// 6. EXECUÇÃO PRINCIPAL
// ============================================================================
function runBenchmarkSuite() {
    const tSuiteStart = performance.now();
    renderTerminalBanner();

    console.log(`${c.cyan}⚡ Inicializando ambiente de simulação do navegador (VM context)...${c.reset}`);
    const env = createBrowserEnvironment();
    const kumonSubjects = env.KumonSubjects;

    const subjectsOrder = ['matematica', 'portugues', 'ingles'];
    const results = [];

    console.log(`${c.cyan}🚀 Iniciando medições para os 25 níveis curriculares...${c.reset}\n`);

    for (const subKey of subjectsOrder) {
        const sub = kumonSubjects[subKey];
        if (!sub) {
            throw new Error(`Matéria '${subKey}' não encontrada em KumonSubjects!`);
        }

        for (const level of sub.levels) {
            const levelResult = benchmarkLevel(subKey, sub, level);
            results.push(levelResult);
        }
    }

    const tSuiteEnd = performance.now();
    const suiteDuration = tSuiteEnd - tSuiteStart;

    if (results.length !== 25) {
        throw new Error(`Esperava 25 níveis, mas foram processados ${results.length}!`);
    }

    renderResultsTable(results);

    // Cálculos consolidados
    const passedLevels = results.filter(r => r.passed).length;
    const allPassed = passedLevels === 25;
    const overallMeanMs = results.reduce((acc, r) => acc + r.mean, 0) / results.length;
    const overallP95Ms = results.reduce((acc, r) => acc + r.p95, 0) / results.length;
    const overallP99Ms = results.reduce((acc, r) => acc + r.p99, 0) / results.length;
    const totalHeapDeltaBytes = results.reduce((acc, r) => acc + r.heapDeltaBytes, 0);

    const sortedByP95 = [...results].sort((a, b) => a.p95 - b.p95);
    const bestP95 = sortedByP95[0];
    const worstP95 = sortedByP95[sortedByP95.length - 1];

    const totalSampleIterations = results.reduce((acc, r) => acc + r.sampleIterations, 0);
    const totalWarmupIterations = results.reduce((acc, r) => acc + r.warmupIterations, 0);
    const totalItemsGenerated = results.reduce((acc, r) => acc + r.totalItemsGeneratedInSample, 0);

    const summary = {
        timestamp: new Date().toISOString(),
        totalLevels: results.length,
        passedLevels,
        failedLevels: results.length - passedLevels,
        allPassed,
        targetP95MaxMs: CONFIG.targetP95MaxMs,
        overallMeanMs: Number(overallMeanMs.toFixed(4)),
        overallP95Ms: Number(overallP95Ms.toFixed(4)),
        overallP99Ms: Number(overallP99Ms.toFixed(4)),
        worstP95Level: worstP95.levelKey,
        worstP95Ms: worstP95.p95,
        bestP95Level: bestP95.levelKey,
        bestP95Ms: bestP95.p95,
        totalSampleIterations,
        totalWarmupIterations,
        totalIterations: totalSampleIterations + totalWarmupIterations,
        totalItemsGenerated,
        totalHeapDeltaBytes,
        totalHeapDeltaKB: Number((totalHeapDeltaBytes / 1024).toFixed(2)),
        totalBenchmarkDurationMs: Number(suiteDuration.toFixed(2))
    };

    renderSummaryBox(summary, allPassed);

    // Payload de saída JSON estruturado
    const outputPayload = {
        metadata: {
            title: 'KumonGen Generators High-Precision Benchmark Results',
            generatedAt: summary.timestamp,
            nodeVersion: process.version,
            platform: process.platform,
            arch: process.arch,
            cpuModel: os.cpus()[0] ? os.cpus()[0].model : 'Unknown',
            cpuCount: os.cpus().length,
            totalMemoryMB: Math.round(os.totalmem() / (1024 * 1024)),
            protocol: {
                warmupIterationsPerLevel: CONFIG.warmupIterations,
                sampleIterationsPerLevel: CONFIG.sampleIterations,
                batchSizePerIteration: CONFIG.batchSize,
                targetP95MaxMs: CONFIG.targetP95MaxMs
            }
        },
        summary,
        levels: results
    };

    // Garante que o diretório de saída existe e salva o JSON
    const outputDir = path.dirname(CONFIG.outputJsonPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(CONFIG.outputJsonPath, JSON.stringify(outputPayload, null, 2), 'utf8');
    console.log(`${c.green}💾 Resultados gravados com sucesso em:${c.reset} ${CONFIG.outputJsonPath}\n`);

    if (!allPassed) {
        process.exit(1);
    }
}

// Execução
try {
    runBenchmarkSuite();
} catch (err) {
    console.error(`\n${c.red}❌ ERRO CRÍTICO DURANTE A EXECUÇÃO DO BENCHMARK:${c.reset}`, err);
    process.exit(1);
}
