/**
 * ============================================================
 * NeyakkooUnifiedToolkit.js (Compact Dropdown Edition)
 * தமிழ் விக்கிமூலம் - ஒருங்கிணைந்த கீழிறங்கு கருவிப்பட்டியல்
 * Author: Dr. Sathiyaraj Thangasamy (Neyakkoo)
 * ============================================================
 */
(function () {
    'use strict';

    if (typeof mw === 'undefined' || typeof $ === 'undefined') {
        return;
    }

    const WRAPPER_ID  = 'neyakkoo-dropdown-wrap';
    const TOGGLE_ID   = 'neyakkoo-dropdown-toggle';
    const MENU_ID     = 'neyakkoo-dropdown-menu';
    const loadedScripts = new Set();

    /* ========================================================
       1. ஒருங்கிணைந்த கருவிகளின் பட்டியல்
       ======================================================== */
    const TOOLS = [
        {
            id: 'nt-item-audio',
            icon: '🎙️',
            label: 'இப்பக்கத்தை ஒலிப்பதிவு செய்',
            subLabel: 'பக்கத்தை வாசித்து Commons-இல் இணை',
            script: 'பயனர்:Neyakkoo/WikisourceAudioRecorder.js',
            triggerSelectors: ['#ws-audio-record-button', '#ws-page-audio-btn'],
            color: '#0369a1'
        },
        {
            id: 'nt-item-dash',
            icon: '📊',
            label: 'நூலின் ஒலிப்பதிவு நிலை',
            subLabel: 'முழு நூலின் முன்னேற்றப் பட்டியல்',
            script: 'பயனர்:Neyakkoo/WikisourceAudioRecorder.js',
            triggerSelectors: ['#ws-audio-dashboard-button'],
            color: '#0284c7'
        },
        {
            id: 'nt-item-lit',
            icon: '📚',
            label: 'இன்றைய இலக்கியம்',
            subLabel: 'நூல் அறிமுகப் பெட்டியை உருவாக்கு',
            script: 'பயனர்:Neyakkoo/Gadget-TodaysLiterature.js',
            triggerSelectors: ['#todays-lit-btn', '#ca-todays-lit a', '.todays-literature-btn'],
            color: '#0f766e'
        },
        {
            id: 'nt-item-lexeme',
            icon: '🧬',
            label: 'விக்கித்தரவு லெக்சீம்',
            subLabel: 'அகராதிச் சொற்களை லெக்சீமில் இணை',
            script: 'பயனர்:Neyakkoo/WikidataLexemeCreator.js',
            triggerSelectors: ['#wikidata-lexeme-btn', '#ca-wikidata-lexeme a', '#lexeme-creator-btn'],
            color: '#4338ca'
        },
        {
            id: 'nt-item-wikt',
            icon: '📖',
            label: 'விக்சனரியில் இணை',
            subLabel: 'சொற்களைத் தமிழ் விக்சனரியில் சேர்',
            script: 'பயனர்:Neyakkoo/WikisourceToWiktionaryImporter.js',
            triggerSelectors: ['#import-wiktionary-btn', '#ca-import-wiktionary a'],
            color: '#047857'
        },
        {
            id: 'nt-item-quote',
            icon: '💬',
            label: 'விக்கிமேற்கோள் இணை',
            subLabel: 'தெரிவு செய்த வரிகளை மேற்கோளில் சேர்',
            script: 'பயனர்:Neyakkoo/WikisourceToWikiquote.js',
            triggerSelectors: ['#ws-to-wq-float-btn'],
            isSelectionTool: true,
            color: '#b45309'
        }
    ];

    /* ========================================================
       2. CSS வடிவமைப்பு (Compact Dropdown)
       ======================================================== */
    function injectStyles() {
        if (document.getElementById('neyakkoo-dropdown-css')) return;

        const css = `
            #${WRAPPER_ID} {
                position: relative;
                display: inline-block;
                margin-left: 12px;
                vertical-align: middle;
                font-family: "Noto Sans Tamil", sans-serif;
                font-weight: normal;
            }
            #${TOGGLE_ID} {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 5px 12px;
                background: #0f766e;
                color: #ffffff;
                border: 1.5px solid #0d5c56;
                border-radius: 6px;
                font-size: 13px;
                font-weight: bold;
                cursor: pointer;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
                transition: background-color 0.15s;
                font-family: "Noto Sans Tamil", sans-serif;
            }
            #${TOGGLE_ID}:hover,
            #${TOGGLE_ID}.open {
                background: #115e59;
            }
            #${TOGGLE_ID} .nt-arrow {
                font-size: 11px;
                transition: transform 0.2s;
            }
            #${TOGGLE_ID}.open .nt-arrow {
                transform: rotate(180deg);
            }
            #${MENU_ID} {
                position: absolute;
                top: calc(100% + 6px);
                left: 0;
                min-width: 270px;
                background: #ffffff;
                border: 1.5px solid #0f766e;
                border-radius: 8px;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.22);
                padding: 6px;
                z-index: 99999;
                display: none;
                flex-direction: column;
                gap: 3px;
            }
            #${MENU_ID}.show {
                display: flex;
            }
            #${MENU_ID} .nt-menu-item {
                display: flex;
                align-items: center;
                gap: 10px;
                width: 100%;
                padding: 8px 10px;
                background: transparent;
                border: none;
                border-radius: 6px;
                text-align: left;
                cursor: pointer;
                transition: background-color 0.12s;
                font-family: "Noto Sans Tamil", sans-serif;
            }
            #${MENU_ID} .nt-menu-item:hover {
                background: #f0fdfa;
            }
            #${MENU_ID} .nt-item-icon {
                font-size: 17px;
                flex-shrink: 0;
            }
            #${MENU_ID} .nt-item-info {
                display: flex;
                flex-direction: column;
                line-height: 1.3;
            }
            #${MENU_ID} .nt-item-title {
                font-size: 13.5px;
                font-weight: bold;
                color: var(--nt-color, #0f766e);
            }
            #${MENU_ID} .nt-item-sub {
                font-size: 11px;
                color: #54595d;
            }
            #${MENU_ID} .nt-divider {
                height: 1px;
                background: #eaecf0;
                margin: 2px 4px;
            }
            /* பழைய கருவிகளின் தனித்தனி சிதறிய பொத்தான்களை மறைத்தல் */
            #import-wiktionary-btn,
            #ws-audio-record-button,
            #ws-audio-dashboard-button,
            #ws-page-audio-btn,
            #todays-lit-btn,
            #wikidata-lexeme-btn {
                display: none !important;
            }
        `;

        const style = document.createElement('style');
        style.id = 'neyakkoo-dropdown-css';
        style.textContent = css;
        document.head.appendChild(style);
    }

    /* ========================================================
       3. துணைக் கருவிகளை ஏற்றி இயக்குதல்
       ======================================================== */
    function loadSubScript(scriptPageTitle) {
        return new Promise(function (resolve) {
            if (loadedScripts.has(scriptPageTitle)) {
                resolve();
                return;
            }
            const url = mw.util.getUrl(scriptPageTitle, {
                action: 'raw',
                ctype: 'text/javascript'
            });
            mw.loader.getScript(url).then(function () {
                loadedScripts.add(scriptPageTitle);
                setTimeout(resolve, 350);
            }).catch(function (err) {
                console.error('கருவி ஏற்றத்தில் பிழை:', scriptPageTitle, err);
                mw.notify('கருவியை ஏற்ற முடியவில்லை: ' + scriptPageTitle, { type: 'error' });
                resolve();
            });
        });
    }

    function findTargetElement(selectors) {
        for (let i = 0; i < selectors.length; i++) {
            const $el = $(selectors[i]);
            if ($el.length > 0) {
                return $el.first();
            }
        }
        return null;
    }

    function closeMenu() {
        $('#' + MENU_ID).removeClass('show');
        $('#' + TOGGLE_ID).removeClass('open');
    }

    async function handleToolSelect(tool) {
        closeMenu();

        const $toggle = $('#' + TOGGLE_ID);
        const oldHtml = $toggle.html();
        $toggle.html('⏳ ஏற்றப்படுகிறது...');

        await loadSubScript(tool.script);

        $toggle.html(oldHtml);

        /* விக்கிமேற்கோள் கருவி எனில் உரை தெரிவு செய்யப்பட்டுள்ளதா எனப் பார்த்தல் */
        if (tool.isSelectionTool) {
            const sel = window.getSelection();
            const text = sel ? sel.toString().trim() : '';
            if (!text) {
                mw.notify(
                    'முதலில் பக்கத்தில் உள்ள மேற்கோள் வரிகளைச் சுட்டியால் தெரிவு செய்யவும்; உடனே விக்கிமேற்கோள் பொத்தான் தோன்றும்.',
                    { type: 'info', autoHideSeconds: 5 }
                );
                return;
            }
            const $float = findTargetElement(tool.triggerSelectors);
            if ($float) {
                $float.trigger('mousedown').trigger('click');
            } else {
                $(document).trigger('mouseup');
            }
            return;
        }

        /* பிற கருவிகளின் பொத்தானைத் தூண்டுதல் */
        let attempts = 0;
        const waitAndTrigger = setInterval(function () {
            attempts++;
            const $target = findTargetElement(tool.triggerSelectors);
            if ($target) {
                clearInterval(waitAndTrigger);
                $target[0].click();
            } else if (attempts > 15) {
                clearInterval(waitAndTrigger);
                if ((tool.id === 'nt-item-audio' || tool.id === 'nt-item-dash') &&
                    mw.config.get('wgNamespaceNumber') !== 104 &&
                    mw.config.get('wgNamespaceNumber') !== 106) {
                    mw.notify('இக்கருவி நூலின் "பக்கம்:" அல்லது "அட்டவணை:" பக்கங்களில் இயங்கும்.', { type: 'warn' });
                } else {
                    mw.notify('இக்கருவி இப்பக்கத்தில் செயல்படத் தயாராக உள்ளது.', { type: 'info' });
                }
            }
        }, 200);
    }

    /* ========================================================
       4. கீழிறங்கு பட்டியல் பொத்தானை உருவாக்குதல்
       ======================================================== */
    function mountCompactDropdown() {
        if (document.getElementById(WRAPPER_ID)) return;

        injectStyles();

        const wrapper = document.createElement('div');
        wrapper.id = WRAPPER_ID;

        const toggleBtn = document.createElement('button');
        toggleBtn.id = TOGGLE_ID;
        toggleBtn.type = 'button';
        toggleBtn.title = 'விக்கிமூலக் கருவிகள் பட்டியலைத் திற';
        toggleBtn.innerHTML = '<span>🛠️ விக்கிமூலக் கருவிகள்</span><span class="nt-arrow">▼</span>';

        const menu = document.createElement('div');
        menu.id = MENU_ID;
        menu.setAttribute('role', 'menu');

        TOOLS.forEach(function (tool, index) {
            if (index === 2) {
                const divider = document.createElement('div');
                divider.className = 'nt-divider';
                menu.appendChild(divider);
            }

            const itemBtn = document.createElement('button');
            itemBtn.id = tool.id;
            itemBtn.type = 'button';
            itemBtn.className = 'nt-menu-item';
            itemBtn.setAttribute('role', 'menuitem');
            itemBtn.style.setProperty('--nt-color', tool.color);
            itemBtn.innerHTML = `
                <span class="nt-item-icon">${tool.icon}</span>
                <span class="nt-item-info">
                    <span class="nt-item-title">${tool.label}</span>
                    <span class="nt-item-sub">${tool.subLabel}</span>
                </span>
            `;

            itemBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                handleToolSelect(tool);
            });

            menu.appendChild(itemBtn);
        });

        toggleBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            const isOpen = menu.classList.contains('show');
            if (isOpen) {
                closeMenu();
            } else {
                menu.classList.add('show');
                toggleBtn.classList.add('open');
            }
        });

        wrapper.appendChild(toggleBtn);
        wrapper.appendChild(menu);

        const heading = document.getElementById('firstHeading');
        if (heading) {
            heading.appendChild(wrapper);
        } else {
            const content = document.getElementById('mw-content-text');
            if (content && content.parentNode) {
                content.parentNode.insertBefore(wrapper, content);
            }
        }

        /* வெளியே சொடுக்கினால் பட்டியலை மூடுதல் */
        document.addEventListener('click', function (e) {
            if (!wrapper.contains(e.target)) {
                closeMenu();
            }
        });

        /* விக்கிமேற்கோள் உரைத் தெரிவு வசதியை மட்டும் பின்னணியில் முன்கூட்டியே ஏற்றுதல் */
        loadSubScript('பயனர்:Neyakkoo/WikisourceToWikiquote.js');
    }

    /* ========================================================
       5. தொடக்கம் (Initialize)
       ======================================================== */
    mw.loader.using(['mediawiki.util']).then(function () {
        $(function () {
            mountCompactDropdown();
        });
        mw.hook('wikipage.content').add(function () {
            mountCompactDropdown();
        });
    });
})();
