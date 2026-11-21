# Gates: KumonGen 4.5 — Motor Adaptativo, Área dos Pais, Modo Turma & Impressão Completa

OWNS: progression-engine.js, student-profiles.js, tablet-player.js, tablet.html, gerador.js, matematica.js, portugues.js, ingles.js, matematica.html, portugues.html, ingles.html, index.html, kumon.css, sw.js, types.d.ts, tests/smoke_test_suite.js, tests/ux_ui_audit_suite.js

Scope: Motor adaptativo bidirecional (erros, hesitações e Leitner espaçado), diagnóstico de fraquezas e senha híbrida dos pais, fluxo escolar multi-aluno/turma e impressão multipágina completa com gabarito e caderno cirúrgico de reforço.

- [x] G1: Tipagem estática (TypeScript JSCheck), Hardening 007 e Qualidade Curricular 25/25 passam sem regressões
  CHECK: node -e "const cp=require('child_process'); for(const cmd of [['npx',['tsc','-p','jsconfig.json']],['node',['tests/security_hardening_test.js']],['node',['tests/content_quality_audit.js']]]){const r=cp.spawnSync(cmd[0],cmd[1],{shell:true,stdio:'inherit'}); if(r.status!==0) process.exit(r.status||1);} console.log('G1_ALL_CORE_CHECKS_PASSED');"
  EXPECT: G1_ALL_CORE_CHECKS_PASSED
  EVIDENCE: automatic-evidence=v1; definition-sha256=b6f023de50aae84d02c119e7ef632f628eec79fdff47bba7845f98af8debdac2; exit=0; EXPECT=matched; output-sha256=5114d213524881d744cfff270a5f7a8f31ccbea800ba2c13dcdcf6c80df4a6ec; output-bytes=8656; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\drdhs\OneDrive\Documentos\mathbook-main; path=12c373b702c4/49 entries

- [x] G2: Motor adaptativo bidirecional, hesitações, Leitner espaçado e diagnóstico parental validados E2E
  CHECK: node tests/smoke_test_suite.js
  EXPECT: 100%)
  EVIDENCE: automatic-evidence=v1; definition-sha256=27c26828d1e790e996934c5708a9ea3cac8485f5f345d621fee5a25411361c7e; exit=0; EXPECT=matched; output-sha256=a819d027805edf0d3aad178f26e7cedb218bc3a5faa777052f7292cc16805f27; output-bytes=3894; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\drdhs\OneDrive\Documentos\mathbook-main; path=12c373b702c4/49 entries

- [x] G3: Senha híbrida dos pais (nome invertido + SHA-256 customizada), Radar de Fraquezas e travas de degrau validados E2E
  CHECK: node tests/smoke_test_suite.js
  EXPECT: ZERO falhas
  EVIDENCE: automatic-evidence=v1; definition-sha256=32eede65ef699fa05ab74a151e56d8335ef05c8bad6072b52564cea2b4531b02; exit=0; EXPECT=matched; output-sha256=3fa11e63f0f41aa510b48a01d294485d3e2f2f379f8b3327570b433e96f301f6; output-bytes=3896; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\drdhs\OneDrive\Documentos\mathbook-main; path=12c373b702c4/49 entries

- [x] G4: Impressão direta multipágina (#kumon-print-spool + Gabarito), Caderno de Erros e Modo Turma validados E2E
  CHECK: node tests/smoke_test_suite.js
  EXPECT: Zero falhas de rede (404/500) em assets locais (falhas: 0)
  EVIDENCE: automatic-evidence=v1; definition-sha256=eb8d6fc5a29684d8bab3b5bf4513aea97f63dddacc7df4536dca3842f03c8265; exit=0; EXPECT=matched; output-sha256=318e106caf8718e7d6bbd6c1c23fd705fdcb2acb524dbdbad7b1db62336b3370; output-bytes=3894; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\drdhs\OneDrive\Documentos\mathbook-main; path=12c373b702c4/49 entries

- [x] G5: Auditoria responsiva UX/UI multi-telas (Mobile, Tablet, Desktop) com zero falhas e zero avisos
  CHECK: node tests/ux_ui_audit_suite.js
  EXPECT: AVISOS: 0
  EVIDENCE: automatic-evidence=v1; definition-sha256=f40682888d7cd5fa196772713d4ab4fbee1b03fcd5179e1131da8058446d54ce; exit=0; EXPECT=matched; output-sha256=768ab15bdf3eeed35b49f397135466cd392f971dde951be92200fff6c5caf264; output-bytes=10575; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\drdhs\OneDrive\Documentos\mathbook-main; path=12c373b702c4/49 entries

- [x] G6: Inspeção visual direta dos screenshots gerados (Área dos Pais Fraquezas, Gaveta com Trava, Montador A4 & Preview)
  EVIDENCE: Inspecionados visualmente via read_file pós-Sprint 5.1: tests/screenshots_ux_audit/modal_parent_weaknesses_mobile.png, tablet_drawer_mobile.png e gen_assembler_desktop.png (além de modal_parent_weaknesses_desktop.png e home_mobile_retrato.png). Hierarquia limpa, contraste legível e zero estouro horizontal em 390x844 e 1280x800.

- [x] G7: Hardening Real Sprint 5.1 — 119 degraus progressivos auditados (0 falhas) e Suíte Adversarial P0/P1 100% aprovada
  CHECK: node -e "const cp=require('child_process'); for(const cmd of [['node',['tests/content_quality_audit.js']],['node',['tests/smoke_test_suite.js']]]){const r=cp.spawnSync(cmd[0],cmd[1],{shell:true,stdio:'inherit'}); if(r.status!==0) process.exit(r.status||1);} console.log('G7_HARDENING_51_ALL_PASS');"
  EXPECT: G7_HARDENING_51_ALL_PASS
  EVIDENCE: automatic-evidence=v1; definition-sha256=4f135f9c5f9b46889a30e0579c25db81336f19a7017ffd225a4e2b8c34313f98; exit=0; EXPECT=matched; output-sha256=61201ace4d33fcd51c9f942fa5ea1f447580eafbb5cdd6fc62f009ebb59449d3; output-bytes=11145; shell=C:\WINDOWS\system32\cmd.exe; cwd=C:\Users\drdhs\OneDrive\Documentos\mathbook-main; path=c5473b48988d/49 entries
