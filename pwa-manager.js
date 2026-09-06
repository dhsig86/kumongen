// pwa-manager.js — Gerenciador de Instalação e Ciclo de Vida PWA (KumonGen v4.2.0)
(function() {
    'use strict';

    let deferredPrompt = null;

    const isStandalone = () => {
        return window.matchMedia('(display-mode: standalone)').matches ||
               window.navigator.standalone === true ||
               document.referrer.includes('android-app://');
    };

    const isIOS = () => {
        const ua = window.navigator.userAgent.toLowerCase();
        return /iphone|ipad|ipod/.test(ua);
    };

    function initPWA() {
        if (isStandalone()) {
            document.documentElement.classList.add('pwa-standalone');
            document.body.classList.add('pwa-standalone');
            console.log('[PWA] Executando em modo Standalone (App Instalado)');
        }

        // Service Worker Registration
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(reg => {
                        console.log('[PWA] SW registrado com escopo:', reg.scope);
                        reg.update();
                    })
                    .catch(err => console.warn('[PWA] Falha ao registrar SW:', err));
            });
        }

        // Captura do evento de instalação (Chromium, Edge, Samsung Internet, Android)
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            console.log('[PWA] beforeinstallprompt capturado');
            updateInstallButtons(true);
        });

        window.addEventListener('appinstalled', () => {
            deferredPrompt = null;
            console.log('[PWA] Aplicativo instalado com sucesso!');
            updateInstallButtons(false);
            showInstalledToast();
        });

        // Configuração dos botões de instalação existentes no DOM
        setupInstallTriggers();
    }

    function updateInstallButtons(available) {
        const btns = document.querySelectorAll('.pwa-install-btn, #pwaInstallBtn, #headerPwaInstallBtn');
        btns.forEach(btn => {
            if (isStandalone()) {
                btn.style.display = 'none';
            } else if (available || isIOS()) {
                btn.style.display = 'inline-flex';
                btn.classList.remove('hidden');
            }
        });
    }

    function setupInstallTriggers() {
        document.addEventListener('click', (e) => {
            const btn = e.target.closest('.pwa-install-btn, #pwaInstallBtn, #headerPwaInstallBtn');
            if (!btn) return;
            e.preventDefault();
            triggerInstallPrompt();
        });
    }

    async function triggerInstallPrompt() {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log('[PWA] Resposta do usuário à instalação:', outcome);
            deferredPrompt = null;
            if (outcome === 'accepted') {
                updateInstallButtons(false);
            }
        } else if (isIOS() && !isStandalone()) {
            showIOSInstructionsModal();
        } else if (isStandalone()) {
            alert('O KumonGen já está instalado e rodando como App no seu dispositivo!');
        } else {
            showGenericInstallModal();
        }
    }

    function showIOSInstructionsModal() {
        let modal = document.getElementById('pwaIOSModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'pwaIOSModal';
            modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;background:rgba(2,6,23,0.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:1rem';
            modal.innerHTML = `
                <div class="bg-slate-900 border-2 border-amber-500/60 rounded-3xl max-w-sm w-full p-6 text-white text-center shadow-2xl relative">
                    <button type="button" id="closePwaIOSModal" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 p-1 mx-auto mb-4 shadow-lg">
                        <img src="icon-192x192.png" alt="KumonGen" class="w-full h-full rounded-xl object-cover">
                    </div>
                    <h3 class="text-lg font-black text-white mb-2">Instalar no iPad / iPhone</h3>
                    <p class="text-xs text-slate-300 mb-4 leading-relaxed">
                        Tenha o KumonGen sempre à mão em tela cheia, sem barra de navegação do Safari:
                    </p>
                    <div class="space-y-3 text-left bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 text-xs text-slate-200 mb-5">
                        <div class="flex items-center gap-3">
                            <div class="w-7 h-7 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center font-black flex-shrink-0">1</div>
                            <span>Toque no botão <strong>Compartilhar</strong> (<i class="fas fa-arrow-up-from-bracket text-blue-400"></i>) no Safari.</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="w-7 h-7 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center font-black flex-shrink-0">2</div>
                            <span>Role para baixo e toque em <strong>'Adicionar à Tela de Início'</strong> (<i class="fas fa-plus-square text-amber-400"></i>).</span>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="w-7 h-7 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center font-black flex-shrink-0">3</div>
                            <span>Toque em <strong>Adicionar</strong> no canto superior direito.</span>
                        </div>
                    </div>
                    <button type="button" id="confirmPwaIOSModal" class="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-sm shadow-md cursor-pointer transition-all active:scale-95">
                        Entendi!
                    </button>
                </div>
            `;
            document.body.appendChild(modal);

            const close = () => { modal.style.display = 'none'; };
            document.getElementById('closePwaIOSModal').addEventListener('click', close);
            document.getElementById('confirmPwaIOSModal').addEventListener('click', close);
            modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        }
        modal.style.display = 'flex';
    }

    function showGenericInstallModal() {
        alert('Para instalar o KumonGen como App:\n\n1. Abra o menu do seu navegador (⋮ ou menu de configurações)\n2. Selecione "Instalar KumonGen" ou "Adicionar à Tela de Início".');
    }

    function showInstalledToast() {
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-6 right-6 z-50 bg-emerald-600 text-white font-bold text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce';
        toast.innerHTML = '<i class="fas fa-check-circle text-base"></i> <span>KumonGen instalado como aplicativo!</span>';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 4000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPWA);
    } else {
        initPWA();
    }

    window.KumonPWA = {
        triggerInstall: triggerInstallPrompt,
        isStandalone: isStandalone,
        isIOS: isIOS
    };
})();
