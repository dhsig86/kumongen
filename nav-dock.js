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
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border-transparent';
            
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

        dock.innerHTML = `
            <div id="navDockInner" class="flex items-center gap-1 sm:gap-1.5 p-1.5 rounded-3xl shadow-2xl transition-all" style="background: rgba(15, 23, 42, 0.95); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(51, 65, 85, 0.8);">
                ${itemsHtml}
                <div class="w-[1px] h-6 bg-slate-700/80 mx-0.5"></div>
                ${profileBtnHtml}
                ${toggleBtnHtml}
            </div>
        `;

        document.body.appendChild(dock);

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
        const dockInner = document.getElementById('navDockInner');
        let isCollapsed = false;

        // No tablet, se estiver em tela cheia com teclado, começa sutilmente minimizado
        if (activePage === 'tablet') {
            dock.classList.add('nav-dock-tablet-mode');
        }

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