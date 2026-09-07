// parent-guide.js — Manual do Usuário e Guia de Orientação para Pais & Educadores
// KumonGen (Design Moderno, Minimalista e Foco Pedagógico)
(function() {
    'use strict';

    const GUIDE_SECTIONS = [
        {
            id: 'rotina',
            title: 'Rotina de 10 min',
            icon: 'fa-clock',
            badge: 'Hábito Diário',
            content: `
                <div class="space-y-4">
                    <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <h4 class="text-sm font-black text-slate-900 mb-1 flex items-center gap-2">
                            <i class="fas fa-seedling text-emerald-600"></i> Por que 10 a 15 minutos por dia?
                        </h4>
                        <p class="text-xs text-slate-600 leading-relaxed">
                            No método de estudo individualizado, <strong>a constância diária supera o volume esporádico</strong>. Mais vale resolver 1 folha todos os dias com atenção do que fazer 10 folhas em um fim de semana sob cansaço.
                        </p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div class="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                            <div class="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-black mb-2">1</div>
                            <h5 class="text-xs font-black text-slate-900 mb-1">Horário Fixo</h5>
                            <p class="text-[11px] text-slate-500 leading-relaxed">
                                Estabeleça o momento do dia da tarefa (ex: após o lanche da tarde). A previsibilidade elimina a resistência.
                            </p>
                        </div>

                        <div class="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                            <div class="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm font-black mb-2">2</div>
                            <h5 class="text-xs font-black text-slate-900 mb-1">Mesa Livre de Distrações</h5>
                            <p class="text-[11px] text-slate-500 leading-relaxed">
                                Apenas a folha e o lápis (ou o tablet). Televisão desligada e celulares fora do campo de visão da criança.
                            </p>
                        </div>

                        <div class="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                            <div class="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-sm font-black mb-2">3</div>
                            <h5 class="text-xs font-black text-slate-900 mb-1">Correção no Mesmo Dia</h5>
                            <p class="text-[11px] text-slate-500 leading-relaxed">
                                Erros devem ser corrigidos no mesmo dia, enquanto o raciocínio está fresco, para não cristalizar dúvidas.
                            </p>
                        </div>
                    </div>

                    <div class="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900">
                        <i class="fas fa-lightbulb text-amber-500 text-base mt-0.5"></i>
                        <div class="text-xs leading-relaxed">
                            <strong>A Regra de Ouro da Autonomia:</strong> A primeira questão de cada folha traz o <em>Exemplo Guiado (#1)</em>. Incentive a criança a observar o modelo e tentar deduzir a regra antes de pedir ajuda. Evite dar a resposta pronta.
                        </div>
                    </div>
                </div>
            `
        },
        {
            id: 'sct',
            title: 'Tempo Alvo (SCT)',
            icon: 'fa-stopwatch',
            badge: 'Fluência',
            content: `
                <div class="space-y-4">
                    <div class="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <h4 class="text-sm font-black text-slate-900 mb-1 flex items-center gap-2">
                            <i class="fas fa-tachometer-alt text-blue-600"></i> O que é o SCT (Standard Completion Time)?
                        </h4>
                        <p class="text-xs text-slate-600 leading-relaxed">
                            O SCT é a meta de tempo para concluir a tarefa com <strong>agilidade natural e sem esforço excessivo</strong>. Ele mede a automatização do raciocínio.
                        </p>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                            <thead class="bg-slate-100 text-slate-700 font-bold">
                                <tr>
                                    <th class="p-2.5">Desempenho da Criança</th>
                                    <th class="p-2.5">Significado Pedagógico</th>
                                    <th class="p-2.5">O que Fazer</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-200 text-slate-600">
                                <tr>
                                    <td class="p-2.5 font-bold text-emerald-700">Abaixo do tempo alvo com 100% de acerto</td>
                                    <td class="p-2.5">Domínio completo e automatizado</td>
                                    <td class="p-2.5">Pode avançar para o próximo nível com segurança.</td>
                                </tr>
                                <tr>
                                    <td class="p-2.5 font-bold text-blue-700">Dentro do tempo com poucos erros</td>
                                    <td class="p-2.5">Boa compreensão em fase de consolidação</td>
                                    <td class="p-2.5">Praticar mais 1 ou 2 dias no mesmo nível antes de subir.</td>
                                </tr>
                                <tr>
                                    <td class="p-2.5 font-bold text-amber-700">Acima de 1,5x o tempo ou muitas dúvidas</td>
                                    <td class="p-2.5">A criança ainda está calculando nos dedos ou tateando</td>
                                    <td class="p-2.5"><strong>Repetir o nível</strong>. Repetição é polimento, nunca punição.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-900 leading-relaxed">
                        <i class="fas fa-info-circle mr-1 text-blue-600"></i>
                        <strong>Não faça do cronômetro uma pressão:</strong> Diga apenas <em>"Vamos ver em quanto tempo você termina hoje!"</em>. A velocidade surge naturalmente como consequência da repetição e do domínio, nunca da pressa.
                    </div>
                </div>
            `
        },
        {
            id: 'niveis',
            title: 'Os 25 Níveis',
            icon: 'fa-layer-group',
            badge: 'Curriculum',
            content: `
                <div class="space-y-4 text-xs">
                    <p class="text-slate-600 leading-relaxed">
                        O currículo é dividido em 25 etapas progressivas. Sempre comece um ou dois passos atrás do nível escolar da criança para garantir um início prazeroso e sem frustração.
                    </p>

                    <div class="space-y-3">
                        <div class="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-200">
                            <h5 class="font-black text-blue-900 mb-2 flex items-center justify-between">
                                <span><i class="fas fa-calculator text-blue-600 mr-1.5"></i> Matemática (10 Níveis)</span>
                                <span class="text-[10px] font-bold text-blue-700">M1 ao M10</span>
                            </h5>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-700">
                                <div><strong>M1</strong>: Quantidade e contagem (1 a 5)</div>
                                <div><strong>M2</strong>: Adição básica (+1 a +9)</div>
                                <div><strong>M3</strong>: Sequências numéricas e lacunas</div>
                                <div><strong>M4</strong>: Dezenas e grupos de 10 (11 a 19)</div>
                                <div><strong>M5</strong>: Comparação de grandezas (> < =)</div>
                                <div><strong>M6</strong>: Subtração simples (-1 a -9)</div>
                                <div><strong>M7</strong>: Vizinhos (antecessor e sucessor)</div>
                                <div><strong>M8</strong>: Multiplicação e tabuadas</div>
                                <div><strong>M9</strong>: Divisão exata estruturada</div>
                                <div><strong>M10</strong>: Frações visuais e partes do todo</div>
                            </div>
                        </div>

                        <div class="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200">
                            <h5 class="font-black text-emerald-900 mb-2 flex items-center justify-between">
                                <span><i class="fas fa-font text-emerald-600 mr-1.5"></i> Português (8 Níveis)</span>
                                <span class="text-[10px] font-bold text-emerald-700">P1 ao P8</span>
                            </h5>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-700">
                                <div><strong>P1</strong>: Vogais e decalque de traçado</div>
                                <div><strong>P2</strong>: Sílabas simples canônicas</div>
                                <div><strong>P3</strong>: Letras faltantes em palavras</div>
                                <div><strong>P4</strong>: Ditado visual e associação</div>
                                <div><strong>P5</strong>: Separação silábica rítmica</div>
                                <div><strong>P6</strong>: Consciência fonológica e rimas</div>
                                <div><strong>P7</strong>: Leitura de frases estruturadas</div>
                                <div><strong>P8</strong>: Pontuação básica (. ! ?)</div>
                            </div>
                        </div>

                        <div class="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-200">
                            <h5 class="font-black text-indigo-900 mb-2 flex items-center justify-between">
                                <span><i class="fas fa-language text-indigo-600 mr-1.5"></i> Inglês (7 Níveis)</span>
                                <span class="text-[10px] font-bold text-indigo-700">I1 ao I7</span>
                            </h5>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-700">
                                <div><strong>I1</strong>: Alphabet & Phonics sounds</div>
                                <div><strong>I2</strong>: CVC Words (Cat, Dog, Sun)</div>
                                <div><strong>I3</strong>: Numbers from 1 to 20</div>
                                <div><strong>I4</strong>: Animals, Colors & Nature</div>
                                <div><strong>I5</strong>: Simple affirmative sentences</div>
                                <div><strong>I6</strong>: Basic questions (What, How)</div>
                                <div><strong>I7</strong>: Opposites & Antonyms</div>
                            </div>
                        </div>
                    </div>
                </div>
            `
        },
        {
            id: 'formatos',
            title: 'Papel vs. Tablet',
            icon: 'fa-tablet-alt',
            badge: 'Formatos',
            content: `
                <div class="space-y-4 text-xs">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        <div class="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
                            <div>
                                <div class="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-base mb-2.5">
                                    <i class="fas fa-print"></i>
                                </div>
                                <h4 class="font-black text-slate-900 text-sm mb-1">Folha Impressa em Papel (A4)</h4>
                                <p class="text-slate-500 text-[11px] leading-relaxed mb-3">
                                    Recomendado para a rotina diária principal em casa.
                                </p>
                                <ul class="space-y-1.5 text-[11px] text-slate-600">
                                    <li>• Desenvolve a <strong>coordenação motora fina</strong> e a pega correta do lápis.</li>
                                    <li>• Zero luz azul: <strong>máxima concentração</strong> e foco sustentado.</li>
                                    <li>• Sai com 2 páginas A5 lado a lado. Basta <strong>dobrar ou cortar na linha tracejada</strong>.</li>
                                    <li>• Gabarito opcional na última folha para conferência em 1 minuto.</li>
                                </ul>
                            </div>
                        </div>

                        <div class="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
                            <div>
                                <div class="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-base mb-2.5">
                                    <i class="fas fa-tablet-alt"></i>
                                </div>
                                <h4 class="font-black text-slate-900 text-sm mb-1">Modo Tablet Interativo</h4>
                                <p class="text-slate-500 text-[11px] leading-relaxed mb-3">
                                    Ideal para viagens, dias corridos ou treino rápido independente.
                                </p>
                                <ul class="space-y-1.5 text-[11px] text-slate-600">
                                    <li>• <strong>Correção imediata</strong> e feedback auditivo suave.</li>
                                    <li>• Teclado touch de alta resposta que <strong>não sobe o teclado do sistema</strong>.</li>
                                    <li>• Não consome papel ou tinta de impressora.</li>
                                    <li>• Registra o histórico automaticamente no <strong>Boletim de Evolução</strong>.</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed">
                        <strong>Dica de Equilíbrio:</strong> Use o papel durante a semana letiva e o tablet nos fins de semana ou em viagens. Ambos trabalham exatamente o mesmo currículo com rigor pedagógico idêntico.
                    </div>
                </div>
            `
        },
        {
            id: 'dicas',
            title: 'Dúvidas & Dicas',
            icon: 'fa-heart',
            badge: 'Postura dos Pais',
            content: `
                <div class="space-y-3 text-xs">
                    <div class="p-3.5 rounded-2xl bg-white border border-slate-200">
                        <h5 class="font-black text-slate-900 mb-1 flex items-center gap-2">
                            <i class="fas fa-question-circle text-amber-500"></i> "Meu filho errou várias questões seguidas. O que eu faço?"
                        </h5>
                        <p class="text-[11px] text-slate-600 leading-relaxed">
                            Não se preocupe. O erro indica apenas que o ponto de partida estava um pouco avançado ou que o conteúdo anterior precisa de reforço. <strong>Volte 1 nível</strong> no dia seguinte. Quando a criança voltar a acertar tudo com facilidade, a confiança retorna imediatamente.
                        </p>
                    </div>

                    <div class="p-3.5 rounded-2xl bg-white border border-slate-200">
                        <h5 class="font-black text-slate-900 mb-1 flex items-center gap-2">
                            <i class="fas fa-eraser text-blue-500"></i> "Devo apagar o erro para ele?"
                        </h5>
                        <p class="text-[11px] text-slate-600 leading-relaxed">
                            <strong>Nunca apague pela criança.</strong> Entregue a borracha a ela ou deixe que clique no botão de apagar no tablet. Fazer a própria correção desenvolve senso de responsabilidade e protagonismo.
                        </p>
                    </div>

                    <div class="p-3.5 rounded-2xl bg-white border border-slate-200">
                        <h5 class="font-black text-slate-900 mb-1 flex items-center gap-2">
                            <i class="fas fa-medal text-emerald-500"></i> "Como elogiar do jeito certo?"
                        </h5>
                        <p class="text-[11px] text-slate-600 leading-relaxed">
                            Elogie o <strong>esforço e a persistência</strong>, não a inteligência inata. Em vez de <em>"Você é tão inteligente!"</em>, diga: <em>"Gostei muito de ver sua concentração hoje. Você fez tudo sem desistir!"</em>. Isso desenvolve mentalidade de crescimento.
                        </p>
                    </div>

                    <div class="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <div>
                            <div class="font-bold text-slate-800">Acessar Boletim de Desempenho</div>
                            <div class="text-[11px] text-slate-500">Acompanhe gráficos de precisão e certificados da criança.</div>
                        </div>
                        <button type="button" onclick="if(window.StudentProfileEngine){window.StudentProfileEngine.showEvolutionModal();} document.getElementById('parent-guide-modal')?.remove();" class="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow transition-all cursor-pointer">
                            Abrir Boletim
                        </button>
                    </div>
                </div>
            `
        }
    ];

    function openParentGuideModal(initialSectionId = 'rotina') {
        const existing = document.getElementById('parent-guide-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'parent-guide-modal';
        modal.className = 'fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md transition-opacity duration-200';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', 'Guia dos Pais e Educadores');

        let activeId = initialSectionId;

        function renderGuide() {
            const currentSec = GUIDE_SECTIONS.find(s => s.id === activeId) || GUIDE_SECTIONS[0];

            const tabsHtml = GUIDE_SECTIONS.map(s => {
                const isActive = s.id === activeId;
                const activeClass = isActive
                    ? 'bg-blue-600 text-white shadow-sm font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-semibold';
                return `
                    <button type="button" class="guide-tab-btn px-3 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${activeClass}" data-section="${s.id}">
                        <i class="fas ${s.icon} text-xs ${isActive ? 'text-white' : 'text-slate-400'}"></i>
                        <span>${s.title}</span>
                    </button>
                `;
            }).join('');

            modal.innerHTML = `
                <div class="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 text-slate-800 overflow-hidden transform transition-all duration-200">
                    <!-- Topo / Header do Guia -->
                    <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-blue-50/40">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-lg shadow-sm">
                                <i class="fas fa-book-open"></i>
                            </div>
                            <div>
                                <h3 class="text-base font-black text-slate-900 leading-tight">Guia dos Pais & Educadores</h3>
                                <p class="text-xs text-slate-500">Método de Estudo Diário Individualizado</p>
                            </div>
                        </div>
                        <button type="button" id="closeParentGuideBtn" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer" title="Fechar guia (ESC)">
                            <i class="fas fa-times text-sm"></i>
                        </button>
                    </div>

                    <!-- Barra de Abas de Navegação -->
                    <div class="px-4 py-2.5 border-b border-slate-100 bg-slate-50/70 overflow-x-auto flex items-center gap-1.5 no-scrollbar">
                        ${tabsHtml}
                    </div>

                    <!-- Conteúdo da Seção Ativa -->
                    <div class="p-5 sm:p-6 overflow-y-auto flex-1 custom-scrollbar">
                        <div class="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                            <h4 class="text-sm font-black text-slate-900 flex items-center gap-2">
                                <i class="fas ${currentSec.icon} text-blue-600"></i>
                                ${currentSec.title}
                            </h4>
                            <span class="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                ${currentSec.badge}
                            </span>
                        </div>
                        ${currentSec.content}
                    </div>

                    <!-- Rodapé Sóbrio -->
                    <div class="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
                        <span class="text-[11px]">Rotina recomendada: 1 folha por dia (10 a 15 min)</span>
                        <button type="button" id="doneParentGuideBtn" class="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer">
                            Entendido
                        </button>
                    </div>
                </div>
            `;

            // Event Listeners das abas
            modal.querySelectorAll('.guide-tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    activeId = btn.getAttribute('data-section');
                    renderGuide();
                });
            });

            // Botão Fechar
            modal.querySelector('#closeParentGuideBtn')?.addEventListener('click', closeModal);
            modal.querySelector('#doneParentGuideBtn')?.addEventListener('click', closeModal);
        }

        function closeModal() {
            modal.classList.add('opacity-0');
            setTimeout(() => {
                modal.remove();
                document.removeEventListener('keydown', onKeyDown);
            }, 150);
        }

        function onKeyDown(e) {
            if (e.key === 'Escape') closeModal();
        }

        document.addEventListener('keydown', onKeyDown);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        document.body.appendChild(modal);
        renderGuide();
    }

    // Expõe globalmente
    window.KumonParentGuide = {
        open: openParentGuideModal
    };

    // Atualiza compatibilidade com chamadas legadas
    window.KumonGen_showTutorialModal = () => openParentGuideModal('rotina');

})();
