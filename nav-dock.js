// nav-dock.js — Dock de Navegação Global Touch-First (KumonGen v3.9.0)
(function() {
    'use strict';

    function initNavDock() {
        if (document.getElementById('kumonGlobalNavDock')) return;

        const currentPath = window.location.pathname.toLowerCase();
        let activePage = 'home';
        if (currentPath.includes('matematica')) activePage = 'matematica';
        else if (currentPath.includes('portugues')) activePage = 'portugues';
        else if (currentPath.includes('ingles')) activePage = 'ingles';
        else if (currentPath.includes('tablet')) activePage = 'tablet';

        // Nav Dock não aparece na página inicial
        if (activePage === 'home') return;

        const dock = document.createElement('nav');
        dock.id = 'kumonGlobalNavDock';
        dock.className = 'no-print select-none transition-all duration-300 ease-out';
        dock.style.cssText = 'position: fixed; bottom: 14px; left: 50%; transform: translateX(-50%); z-index: 50;';
        dock.setAttribute('aria-label', 'Navegação principal');

        // Itens de navegação
        const items = [
            { id: 'home', title: 'Início', icon: 'fa-home', href: 'index.html', color: 'text-amber-400', activeBg: 'bg-amber-500/20 border-amber-400/40 text-amber-300' },
            { id: 'matematica', title: 'Matemática', icon: 'fa-calculator', href: 'matematica.html', color: 'text-blue-400', activeBg: 'bg-blue-600/30 border-blue-400/50 text-blue-300' },
            { id: 'portugues', title: 'Português', icon: 'fa-font', href: 'portugues.html', color: 'text-emerald-400', activeBg: 'bg-emerald-600/30 border-emerald-400/50 text-emerald-300' },
            { id: 'ingles', title: 'Inglês', icon: 'fa-language', href: 'ingles.html', color: 'text-red-400', activeBg: 'bg-red-600/30 border-red-400/50 text-red-300' },
            { id: 'tablet', title: 'Tablet', icon: 'fa-tablet-alt', href: 'tablet.html', color: 'text-indigo-400', activeBg: 'bg-indigo-600/30 border-indigo-400/50 text-indigo-300' }
        ];

        let itemsHtml = items.map(it => {
            const isActive = it.id === activePage;
            const activeClasses = isActive 
                ? `${it.activeBg} font-black shadow-inner` 
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100 border-transparent';
            
            return `
                <a href="${it.href}" class="nav-dock-item flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-3 py-2 sm:py-2.5 rounded-2xl border transition-all duration-200 text-center ${activeClasses} min-w-[48px] min-h-[44px] cursor-pointer" title="${it.title}">
                    <i class="fas ${it.icon} text-sm sm:text-base ${it.color}"></i>
                    <span class="text-[10px] sm:text-xs font-bold leading-none">${it.title}</span>
                </a>
            `;
        }).join('');

        // Botão para abrir o seletor de perfil de qualquer página
        const profileBtnHtml = `
            <button type="button" id="navDockProfileBtn" class="nav-dock-item flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-3 py-2 sm:py-2.5 rounded-2xl border border-transparent text-amber-300/80 hover:text-amber-200 hover:bg-amber-400/10 transition-all text-center min-w-[48px] min-h-[44px] cursor-pointer" title="Gerenciar Perfis de Aluno">
                <i class="fas fa-users text-sm sm:text-base text-amber-400"></i>
                <span class="text-[10px] sm:text-xs font-bold leading-none">Alunos</span>
            </button>
        `;

        // Botão de minimizar/expandir o dock
        const toggleBtnHtml = `
            <button type="button" id="navDockToggleBtn" class="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs transition-transform cursor-pointer ml-0.5 sm:ml-1" title="Ocultar/Exibir Barra">
                <i class="fas fa-chevron-down" id="navDockToggleIcon"></i>
            </button>
        `;

        if (activePage === 'tablet') {
            dock.className = 'no-print select-none transition-all duration-300 ease-out nav-dock-tablet-mode';
            dock.style.cssText = 'position: fixed; bottom: max(16px, env(safe-area-inset-bottom, 16px)); left: max(16px, env(safe-area-inset-left, 16px)); z-index: 45;';

            dock.innerHTML = `
                <div class="relative">
                    <div id="navDockTabletFlyout" class="hidden absolute bottom-12 left-0 rounded-2xl p-2.5 shadow-xl flex flex-col gap-1 min-w-[190px] mb-2 z-50 bg-white border border-gray-200" style="backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);">
                        <div class="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-200 flex items-center justify-between mb-1">
                            <span>Navegação</span>
                            <i class="fas fa-compass text-amber-500"></i>
                        </div>
                        <a href="index.html" class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors" style="text-decoration: none;">
                            <i class="fas fa-home w-4 text-amber-500"></i> <span>Início</span>
                        </a>
                        <a href="matematica.html" class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors" style="text-decoration: none;">
                            <i class="fas fa-calculator w-4 text-blue-500"></i> <span>Matemática</span>
                        </a>
                        <a href="portugues.html" class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors" style="text-decoration: none;">
                            <i class="fas fa-font w-4 text-emerald-500"></i> <span>Português</span>
                        </a>
                        <a href="ingles.html" class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors" style="text-decoration: none;">
                            <i class="fas fa-language w-4 text-red-500"></i> <span>Inglês</span>
                        </a>
                        <div class="h-[1px] bg-gray-200 my-1"></div>
                        <button type="button" id="navDockTabletEvolutionBtn" class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors text-left w-full cursor-pointer">
                            <i class="fas fa-chart-line w-4 text-blue-500"></i> <span>Boletim de Evolução</span>
                        </button>
                        <button type="button" id="navDockTabletProfileBtn" class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors text-left w-full cursor-pointer">
                            <i class="fas fa-users w-4 text-amber-500"></i> <span>Trocar Aluno</span>
                        </button>
                        <div class="h-[1px] bg-gray-200 my-1"></div>
                        <button type="button" id="navDockScreenModeBtn" class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors text-left w-full cursor-pointer" title="Alternar modo de tela entre Compacto e Normal">
                            <i class="fas fa-mobile-alt w-4 text-indigo-500" id="screenModeIcon"></i> <span id="screenModeLabel">Modo: Normal</span>
                        </button>
                        <button type="button" id="navDockTabletGuideBtn" class="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors text-left w-full cursor-pointer" title="Abrir Guia e Manual dos Pais">
                            <i class="fas fa-book-open w-4 text-emerald-500"></i> <span>Guia dos Pais</span>
                        </button>
                    </div>
                    <button type="button" id="navDockTabletTrigger" class="cursor-pointer transition-all active:scale-95 flex items-center gap-2 bg-white border border-gray-200 text-gray-700 shadow-sm rounded-full px-3 py-2" title="Menu rápido de navegação">
                        <i class="fas fa-compass text-amber-500 text-sm"></i>
                        <span class="text-xs font-black tracking-wide">Menu</span>
                        <i class="fas fa-chevron-up text-[9px] text-gray-400 transition-transform" id="navDockTabletTriggerIcon"></i>
                    </button>
                </div>
            `;

            document.body.appendChild(dock);

            const trigger = document.getElementById('navDockTabletTrigger');
            const flyout = document.getElementById('navDockTabletFlyout');
            const triggerIcon = document.getElementById('navDockTabletTriggerIcon');

            if (trigger && flyout) {
                trigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isOpen = !flyout.classList.contains('hidden');
                    if (isOpen) {
                        flyout.classList.add('hidden');
                        if (triggerIcon) triggerIcon.className = 'fas fa-chevron-up text-[9px] text-slate-400 transition-transform';
                    } else {
                        flyout.classList.remove('hidden');
                        if (triggerIcon) triggerIcon.className = 'fas fa-chevron-down text-[9px] text-amber-400 transition-transform';
                    }
                });

                document.addEventListener('click', (e) => {
                    if (!dock.contains(e.target)) {
                        flyout.classList.add('hidden');
                        if (triggerIcon) triggerIcon.className = 'fas fa-chevron-up text-[9px] text-slate-400 transition-transform';
                    }
                });
            }

            const tabletEvoBtn = document.getElementById('navDockTabletEvolutionBtn');
            if (tabletEvoBtn) {
                tabletEvoBtn.addEventListener('click', () => {
                    flyout.classList.add('hidden');
                    if (window.StudentProfileEngine) {
                        window.StudentProfileEngine.showEvolutionModal();
                    }
                });
            }

            const tabletProfBtn = document.getElementById('navDockTabletProfileBtn');
            if (tabletProfBtn) {
                tabletProfBtn.addEventListener('click', () => {
                    flyout.classList.add('hidden');
                    if (window.StudentProfileEngine) {
                        window.StudentProfileEngine.showProfileModal({
                            onSelect: (student) => {
                                if (window.TabletPlayer && window.TabletPlayer.onStudentChanged) {
                                    window.TabletPlayer.onStudentChanged(student);
                                }
                            }
                        });
                    }
                });
            }

            // ── Screen Mode Toggle (Compact / Normal) ──
            const screenModeBtn = document.getElementById('navDockScreenModeBtn');
            const screenModeIcon = document.getElementById('screenModeIcon');
            const screenModeLabel = document.getElementById('screenModeLabel');

            function getScreenMode() {
                try {
                    if (window.SafeStorage) return window.SafeStorage.getItem('kumon_screen_mode') || 'normal';
                    return localStorage.getItem('kumon_screen_mode') || 'normal';
                } catch (e) { return 'normal'; }
            }

            function setScreenMode(mode) {
                try {
                    if (window.SafeStorage) window.SafeStorage.setItem('kumon_screen_mode', mode);
                    else localStorage.setItem('kumon_screen_mode', mode);
                } catch (e) {}
            }

            function applyScreenMode(mode) {
                document.body.setAttribute('data-screen-mode', mode);
                if (screenModeIcon && screenModeLabel) {
                    if (mode === 'compact') {
                        screenModeIcon.className = 'fas fa-compress-alt w-4 text-indigo-400';
                        screenModeLabel.textContent = 'Modo: Compacto 📱';
                    } else {
                        screenModeIcon.className = 'fas fa-expand-alt w-4 text-indigo-400';
                        screenModeLabel.textContent = 'Modo: Normal 📋';
                    }
                }
            }

            // Aplicar modo salvo ao carregar
            const savedMode = getScreenMode();
            applyScreenMode(savedMode);

            if (screenModeBtn) {
                screenModeBtn.addEventListener('click', () => {
                    const current = getScreenMode();
                    const next = current === 'normal' ? 'compact' : 'normal';
                    setScreenMode(next);
                    applyScreenMode(next);
                    flyout.classList.add('hidden');
                });
            }

            const tabletGuideBtn = document.getElementById('navDockTabletGuideBtn');
            if (tabletGuideBtn) {
                tabletGuideBtn.addEventListener('click', () => {
                    flyout.classList.add('hidden');
                    if (window.KumonParentGuide) {
                        window.KumonParentGuide.open();
                    }
                });
            }

            return;
        }

        dock.innerHTML = `
            <div id="navDockInner" class="flex items-center gap-1 sm:gap-1.5 p-1.5 rounded-3xl shadow-lg transition-all" style="background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(229, 231, 235, 1);">
                ${itemsHtml}
                <div class="w-[1px] h-6 bg-gray-200 mx-0.5"></div>
                ${profileBtnHtml}
                <button type="button" id="navDockEvolutionBtn" class="nav-dock-item flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-3 py-2 sm:py-2.5 rounded-2xl border border-transparent text-blue-300/80 hover:text-blue-200 hover:bg-blue-400/10 transition-all text-center min-w-[48px] min-h-[44px] cursor-pointer" title="Boletim de Evolução & Gráficos">
                    <i class="fas fa-chart-line text-sm sm:text-base text-blue-400"></i>
                    <span class="text-[10px] sm:text-xs font-bold leading-none">Boletim</span>
                </button>
                <button type="button" id="navDockGuideBtn" class="nav-dock-item hidden sm:flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-3 py-2 sm:py-2.5 rounded-2xl border border-transparent text-emerald-300/80 hover:text-emerald-200 hover:bg-emerald-400/10 transition-all text-center min-w-[48px] min-h-[44px] cursor-pointer" title="Guia dos Pais & Método">
                    <i class="fas fa-book-open text-sm sm:text-base text-emerald-400"></i>
                    <span class="text-[10px] sm:text-xs font-bold leading-none">Guia</span>
                </button>
                ${toggleBtnHtml}
            </div>
        `;

        document.body.appendChild(dock);

        // Ações do botão de guia dos pais
        const guideBtn = document.getElementById('navDockGuideBtn');
        if (guideBtn) {
            guideBtn.addEventListener('click', () => {
                if (window.KumonParentGuide) {
                    window.KumonParentGuide.open();
                }
            });
        }

        // Ações do botão de boletim de evolução
        const evoBtn = document.getElementById('navDockEvolutionBtn');
        if (evoBtn) {
            evoBtn.addEventListener('click', () => {
                if (window.StudentProfileEngine) {
                    window.StudentProfileEngine.showEvolutionModal();
                }
            });
        }

        // Ações do botão de perfis
        const profBtn = document.getElementById('navDockProfileBtn');
        if (profBtn) {
            profBtn.addEventListener('click', () => {
                if (window.StudentProfileEngine) {
                    window.StudentProfileEngine.showProfileModal({
                        onSelect: (student) => {
                            if (window.KumonGen && window.KumonGen.onStudentSelected) {
                                window.KumonGen.onStudentSelected();
                            }
                            if (window.TabletPlayer && window.TabletPlayer.onStudentChanged) {
                                window.TabletPlayer.onStudentChanged(student);
                            }
                        }
                    });
                } else if (typeof openStudentProfiles === 'function') {
                    openStudentProfiles('cards');
                } else {
                    window.location.href = 'index.html';
                }
            });
        }

        // Toggle para minimizar/expandir o dock
        const toggleBtn = document.getElementById('navDockToggleBtn');
        const toggleIcon = document.getElementById('navDockToggleIcon');
        let isCollapsed = false;

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                isCollapsed = !isCollapsed;
                if (isCollapsed) {
                    dock.style.transform = 'translate(-50%, calc(100% - 14px))';
                    toggleIcon.className = 'fas fa-chevron-up';
                    dock.style.opacity = '0.7';
                } else {
                    dock.style.transform = 'translate(-50%, 0)';
                    toggleIcon.className = 'fas fa-chevron-down';
                    dock.style.opacity = '1';
                }
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNavDock);
    } else {
        initNavDock();
    }

    window.KumonNavDock = { init: initNavDock };
})();