# Gates: KumonGen 4.6 — Vocabulário Graduado EN/PT, Filtros Temáticos & Editor Vertical

OWNS: vocabulary-engine.js, progression-engine.js, student-profiles.js, tablet-player.js, tablet.html, gerador.js, matematica.js, portugues.js, ingles.js, matematica.html, portugues.html, ingles.html, index.html, kumon.css, sw.js, types.d.ts, tests/content_quality_audit.js, tests/smoke_test_suite.js, tests/ux_ui_audit_suite.js

Scope: Motor adaptativo bidirecional, área dos pais, modo turma, impressão completa e novo motor de vocabulário graduado em 4 degraus (80% novo + 20% revisão) com filtros temáticos, editor vertical sem scroll horizontal e sincronização Papel↔Tablet isolada por aluno.

- [x] G1: Tipagem estática (TypeScript JSCheck), Hardening 007 e Qualidade Curricular 25/25 passam sem regressões
  CHECK: node -e "const cp=require('child_process'); for(const cmd of [['npx',['tsc','-p','jsconfig.json']],['node',['tests/security_hardening_test.js']],['node',['tests/content_quality_audit.js']]]){const r=cp.spawnSync(cmd[0],cmd[1],{shell:true,stdio:'inherit'}); if(r.status!==0) process.exit(r.status||1);} console.log('G1_ALL_CORE_CHECKS_PASSED');"
  EXPECT: G1_ALL_CORE_CHECKS_PASSED
  EVIDENCE: automatic-evidence=v1; definition-sha256=b6f023de50aae84d02c119e7ef632f628eec79fdff47bba7845f98af8debdac2; exit=0; EXPECT=matched; output-sha256=1f0223aacbafe82944f4355e64787c599af64d214b1b3d603d1e064f866625f7; output-bytes=8786; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\drdhs\OneDrive\Documentos\mathbook-main; path=d8b3c185c9e8/49 entries

- [x] G2: Motor adaptativo bidirecional, hesitações, Leitner espaçado e diagnóstico parental validados E2E
  CHECK: node tests/smoke_test_suite.js
  EXPECT: 100%)
  EVIDENCE: automatic-evidence=v1; definition-sha256=27c26828d1e790e996934c5708a9ea3cac8485f5f345d621fee5a25411361c7e; exit=0; EXPECT=matched; output-sha256=e6b6269334ff6f44d3fed225d77c933e9dde833d8627281b41cd30c674e2f0d5; output-bytes=4697; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\drdhs\OneDrive\Documentos\mathbook-main; path=d8b3c185c9e8/49 entries

- [x] G3: Senha híbrida dos pais (nome invertido + SHA-256 customizada), Radar de Fraquezas e travas de degrau validados E2E
  CHECK: node tests/smoke_test_suite.js
  EXPECT: ZERO falhas
  EVIDENCE: automatic-evidence=v1; definition-sha256=32eede65ef699fa05ab74a151e56d8335ef05c8bad6072b52564cea2b4531b02; exit=0; EXPECT=matched; output-sha256=243d4958ce9fa61869cb7e07ea40fcc915bea4e6412650a6a312398989184b0c; output-bytes=4696; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\drdhs\OneDrive\Documentos\mathbook-main; path=d8b3c185c9e8/49 entries

- [x] G4: Impressão direta multipágina (#kumon-print-spool + Gabarito), Caderno de Erros e Modo Turma validados E2E
  CHECK: node tests/smoke_test_suite.js
  EXPECT: Zero falhas de rede (404/500) em assets locais (falhas: 0)
  EVIDENCE: automatic-evidence=v1; definition-sha256=eb8d6fc5a29684d8bab3b5bf4513aea97f63dddacc7df4536dca3842f03c8265; exit=0; EXPECT=matched; output-sha256=ce524a1b7f4db2652ade90587453b01a5d563f502408b3b1b85e3a7d7dcba8fe; output-bytes=4695; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\drdhs\OneDrive\Documentos\mathbook-main; path=d8b3c185c9e8/49 entries

- [x] G5: Auditoria responsiva UX/UI multi-telas (Mobile, Tablet, Desktop) com zero falhas e zero avisos
  CHECK: node tests/ux_ui_audit_suite.js
  EXPECT: AVISOS: 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=f40682888d7cd5fa196772713d4ab4fbee1b03fcd5179e1131da8058446d54ce; exit=0; EXPECT=matched; output-sha256=6da30a10f3737d194f958c0a71e561a69b20337b92da8b708a7c4da1f46c6297; output-bytes=10948; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\drdhs\OneDrive\Documentos\mathbook-main; path=d8b3c185c9e8/49 entries

- [x] G6: Inspeção visual direta dos screenshots gerados (Editor Vertical Sidebar 320px, Modal Ampliado, Português Mobile 390px)
  EVIDENCE: Inspecionados visualmente via read_file pós-Sprint 6: tests/screenshots_ux_audit/gen_ingles_vocab_sidebar_desktop.png (gaveta #advancedAccordion aberta em 320px com zero scroll horizontal, chips de tema quebrados em wrap, abas Degrau 1/Extras, auto-split ✨ Auto, botão + Add to Module 100% contido e folha A4 I4 sincronizada), tests/screenshots_ux_audit/gen_ingles_vocab_modal_desktop.png (modal #kumonVocabModal com os 4 degraus e importação em lote sem estouro) e tests/screenshots_ux_audit/gen_portugues_vocab_sidebar_mobile.png (editor vertical P4 em 390x844 sem overflow).

- [x] G7: Hardening Real Sprint 5.1 — Suíte Adversarial P0/P1 e 132 degraus progressivos auditados (0 falhas)
  CHECK: node -e "const cp=require('child_process'); for(const cmd of [['node',['tests/content_quality_audit.js']],['node',['tests/smoke_test_suite.js']]]){const r=cp.spawnSync(cmd[0],cmd[1],{shell:true,stdio:'inherit'}); if(r.status!==0) process.exit(r.status||1);} console.log('G7_HARDENING_51_ALL_PASS');"
  EXPECT: G7_HARDENING_51_ALL_PASS
  EVIDENCE: automatic-evidence=v1; definition-sha256=4f135f9c5f9b46889a30e0579c25db81336f19a7017ffd225a4e2b8c34313f98; exit=0; EXPECT=matched; output-sha256=39d65f2fa2773bee815b78da62b068ddcff008f7211535b75bf3882efb720535; output-bytes=11617; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\drdhs\OneDrive\Documentos\mathbook-main; path=d8b3c185c9e8/49 entries

- [x] G8: Sprint 6 — 132 degraus (4 degraus EN/PT graduados), zero vazamento do Wizard, auto-split, isolamento por perfil, sync Papel↔Tablet e ZERO scroll horizontal na sidebar
  CHECK: node -e "const cp=require('child_process'); for(const cmd of [['node',['tests/content_quality_audit.js']],['node',['tests/smoke_test_suite.js']],['node',['tests/ux_ui_audit_suite.js']]]){const r=cp.spawnSync(cmd[0],cmd[1],{shell:true,stdio:'inherit'}); if(r.status!==0) process.exit(r.status||1);} console.log('G8_SPRINT6_VOCAB_ALL_PASS');"
  EXPECT: G8_SPRINT6_VOCAB_ALL_PASS
  EVIDENCE: automatic-evidence=v1; definition-sha256=45406c3014aa81c3c729f623918cf7ac7e27808e6b1b825089047c8b79cf5942; exit=0; EXPECT=matched; output-sha256=2eaff994be1fda79f20d58966d8876eca24d6d1c4a5f5364043119cc72fade90; output-bytes=22565; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\drdhs\OneDrive\Documentos\mathbook-main; path=d8b3c185c9e8/49 entries
