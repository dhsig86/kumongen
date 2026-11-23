# Gates: KumonGen 4.6.1 — Vocabulário Graduado EN/PT, Editor Vertical & Blindagem Sprint 6.1

OWNS: vocabulary-engine.js, progression-engine.js, student-profiles.js, tablet-player.js, tablet.html, gerador.js, matematica.js, portugues.js, ingles.js, matematica.html, portugues.html, ingles.html, index.html, kumon.css, sw.js, types.d.ts, tests/security_hardening_test.js, tests/content_quality_audit.js, tests/smoke_test_suite.js, tests/ux_ui_audit_suite.js

Scope: Motor adaptativo bidirecional, área dos pais, modo turma, impressão completa, vocabulário graduado em 4 degraus (EN/PT), editor vertical sem scroll horizontal e blindagem integral dos 9 bugs (XSS customVocab, frases 1-item I6/P8, embaralhamento P7/I7 e P8/I6 no papel, famílias P2/P5/P6 fiéis aos rótulos, distratores seguros P7/I7, #wordRepeat ativo, reset de tema no Tablet e filtro curricular Leitner).

- [x] G1: Tipagem estática (TypeScript JSCheck), Hardening 007 e Qualidade Curricular 25/25 passam sem regressões
  CHECK: node -e "const cp=require('child_process'); for(const cmd of [['npx',['tsc','-p','jsconfig.json']],['node',['tests/security_hardening_test.js']],['node',['tests/content_quality_audit.js']]]){const r=cp.spawnSync(cmd[0],cmd[1],{shell:true,stdio:'inherit'}); if(r.status!==0) process.exit(r.status||1);} console.log('G1_ALL_CORE_CHECKS_PASSED');"
  EXPECT: G1_ALL_CORE_CHECKS_PASSED
  EVIDENCE: automatic-evidence=v1; definition-sha256=b6f023de50aae84d02c119e7ef632f628eec79fdff47bba7845f98af8debdac2; exit=0; EXPECT=matched; output-sha256=2785750e14595d99813d4f521ab6ae67de9f300b8894f2b54ac3dd8b96e93702; output-bytes=9077; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\drdhs\OneDrive\Documentos\mathbook-main; path=8bb36656000b/49 entries

- [x] G2: Motor adaptativo bidirecional, hesitações, Leitner espaçado e diagnóstico parental validados E2E
  CHECK: node tests/smoke_test_suite.js
  EXPECT: 100%)
  EVIDENCE: automatic-evidence=v1; definition-sha256=27c26828d1e790e996934c5708a9ea3cac8485f5f345d621fee5a25411361c7e; exit=0; EXPECT=matched; output-sha256=fb2cbfeb0d8b795e33d9ba3d7bc336e31862a6920b9e1df3f27a4496002165d3; output-bytes=5060; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\drdhs\OneDrive\Documentos\mathbook-main; path=8bb36656000b/49 entries

- [x] G3: Senha híbrida dos pais (nome invertido + SHA-256 customizada), Radar de Fraquezas e travas de degrau validados E2E
  CHECK: node tests/smoke_test_suite.js
  EXPECT: ZERO falhas
  EVIDENCE: automatic-evidence=v1; definition-sha256=32eede65ef699fa05ab74a151e56d8335ef05c8bad6072b52564cea2b4531b02; exit=0; EXPECT=matched; output-sha256=a84331f951f6557e40af2a309ec394b9a9170d0127c3dcc852764540423adcd0; output-bytes=5060; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\drdhs\OneDrive\Documentos\mathbook-main; path=8bb36656000b/49 entries

- [x] G4: Impressão direta multipágina (#kumon-print-spool + Gabarito), Caderno de Erros e Modo Turma validados E2E
  CHECK: node tests/smoke_test_suite.js
  EXPECT: Zero falhas de rede (404/500) em assets locais (falhas: 0)
  EVIDENCE: automatic-evidence=v1; definition-sha256=eb8d6fc5a29684d8bab3b5bf4513aea97f63dddacc7df4536dca3842f03c8265; exit=0; EXPECT=matched; output-sha256=431fb9d692b1c6761f78775054d151c171daccbaf0edfd713b8a5d66b77dc92b; output-bytes=5060; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\drdhs\OneDrive\Documentos\mathbook-main; path=8bb36656000b/49 entries

- [x] G5: Auditoria responsiva UX/UI multi-telas (Mobile, Tablet, Desktop) com zero falhas e zero avisos
  CHECK: node tests/ux_ui_audit_suite.js
  EXPECT: AVISOS: 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=f40682888d7cd5fa196772713d4ab4fbee1b03fcd5179e1131da8058446d54ce; exit=0; EXPECT=matched; output-sha256=2b486cd0c978edf07ca91501828a3eb22c81286db3d40a8570767058893bc80e; output-bytes=10948; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\drdhs\OneDrive\Documentos\mathbook-main; path=57b8057a89a6/49 entries

- [x] G6: Inspeção visual direta dos screenshots gerados (Editor Vertical na Sidebar Desktop, Modal Ampliado e Português Mobile)
  EVIDENCE: Inspecionados visualmente via read_file pós-Sprint 6.1: tests/screenshots_ux_audit/gen_ingles_vocab_sidebar_desktop.png (sidebar aberta sem scroll horizontal, Repetitions=1 gerando conjunto único na folha A4 e todos os controles alinhados), tests/screenshots_ux_audit/gen_ingles_vocab_modal_desktop.png (modal ampliado íntegro) e tests/screenshots_ux_audit/gen_portugues_vocab_sidebar_mobile.png (editor vertical mobile sem estouro).

- [x] G7: Hardening Real Sprint 5.1 — Suíte Adversarial P0/P1 e degraus progressivos auditados sem falhas
  CHECK: node -e "const cp=require('child_process'); for(const cmd of [['node',['tests/content_quality_audit.js']],['node',['tests/smoke_test_suite.js']]]){const r=cp.spawnSync(cmd[0],cmd[1],{shell:true,stdio:'inherit'}); if(r.status!==0) process.exit(r.status||1);} console.log('G7_HARDENING_51_ALL_PASS');"
  EXPECT: G7_HARDENING_51_ALL_PASS
  EVIDENCE: automatic-evidence=v1; definition-sha256=4f135f9c5f9b46889a30e0579c25db81336f19a7017ffd225a4e2b8c34313f98; exit=0; EXPECT=matched; output-sha256=14a353f0a5bfdade5579d88bf235c8cb03e8c76aeafd283b05ed46cd5a3eeb2d; output-bytes=11974; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\drdhs\OneDrive\Documentos\mathbook-main; path=8bb36656000b/49 entries

- [x] G8: Sprint 6 — Vocabulário graduado EN/PT, zero vazamento do Wizard, auto-split, isolamento por perfil, sync Papel↔Tablet e ZERO scroll horizontal na sidebar
  CHECK: node -e "const cp=require('child_process'); for(const cmd of [['node',['tests/content_quality_audit.js']],['node',['tests/smoke_test_suite.js']],['node',['tests/ux_ui_audit_suite.js']]]){const r=cp.spawnSync(cmd[0],cmd[1],{shell:true,stdio:'inherit'}); if(r.status!==0) process.exit(r.status||1);} console.log('G8_SPRINT6_VOCAB_ALL_PASS');"
  EXPECT: G8_SPRINT6_VOCAB_ALL_PASS
  EVIDENCE: automatic-evidence=v1; definition-sha256=45406c3014aa81c3c729f623918cf7ac7e27808e6b1b825089047c8b79cf5942; exit=0; EXPECT=matched; output-sha256=c3df2ca1ca1334e3ed508f72a13bb745ab3d041691bf96b71c5067877cd8a716; output-bytes=22922; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\drdhs\OneDrive\Documentos\mathbook-main; path=57b8057a89a6/49 entries

- [x] G9: Sprint 6.1 — Blindagem XSS customVocab, frases I6/P8 multi-bloco, P7/I7 embaralhados sem distrator falso, P8/I6 desordenados no papel, P2/P5/P6 fiéis aos rótulos, #wordRepeat funcional e Leitner sem vazamento de nível superior
  CHECK: node -e "const cp=require('child_process'); for(const cmd of [['node',['tests/security_hardening_test.js']],['node',['tests/content_quality_audit.js']],['node',['tests/smoke_test_suite.js']]]){const r=cp.spawnSync(cmd[0],cmd[1],{shell:true,stdio:'inherit'}); if(r.status!==0) process.exit(r.status||1);} console.log('G9_SPRINT61_BUGFIX_ALL_PASS');"
  EXPECT: G9_SPRINT61_BUGFIX_ALL_PASS
  EVIDENCE: automatic-evidence=v1; definition-sha256=76a1579e73d778727a3baf332133d29f401094304398ee9f7ce39ddf44bcd30a; exit=0; EXPECT=matched; output-sha256=d3b2bc7b3b739247b6fbef0a14a1ef8ec912261b439e7d965d55bbee61f03774; output-bytes=14139; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\drdhs\OneDrive\Documentos\mathbook-main; path=8bb36656000b/49 entries
