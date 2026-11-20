/**
 * ============================================================
 * NeyakkooUnifiedToolkit.js
 * தமிழ் விக்கிமூலம் - ஒருங்கிணைந்த கருவிப்பட்டை (Unified Toolkit Bar)
 * Author: Dr. Sathiyaraj Thangasamy (Neyakkoo)
 *
 * ஒருங்கிணைக்கப்பட்டுள்ள கருவிகள்:
 * 1. ஒலிப்பதிவு & முழு நூல் முன்னேற்றக் கருவி (WikisourceAudioRecorder.js)
 * 2. இன்றைய இலக்கியம் நூல் அறிமுகக் கருவி (Gadget-TodaysLiterature.js)
 * 3. விக்கித்தரவு லெக்சீம் உருவாக்கக் கருவி (WikidataLexemeCreator.js)
 * 4. விக்சனரி இறக்குமதிக் கருவி (WikisourceToWiktionaryImporter.js)
 * 5. விக்கிமேற்கோள் இணைப்புக் கருவி (WikisourceToWikiquote.js)
 * ============================================================
 */
(function () {
    'use strict';

    if (typeof mw === 'undefined' || typeof $ === 'undefined') {
        return;
    }

    const BAR_ID = 'neyakkoo-unified-toolbar';
    const loadedScripts = new Set();

    /* ========================================================
       1. ஒருங்கிணைந்த கருவிகளின் பட்டியல்
       ======================================================== */
    const TOOLS = [
        {
            id: 'nt-btn-audio',
            icon: '🎙️',
            label: 'ஒலிப்பதிவு & நூல் நிலை',
            title: 'பக்கத்தை ஒலிப்பதிவு செய்யவும் முழு நூலின் முன்னேற்றத்தைக் காணவும்',
            script: 'பயனர்:Neyakkoo/WikisourceAudioRecorder.js',
            triggerSelectors: ['#ws-audio-record-button', '#ws-page-audio-btn'],
            color: '#0369a1'
        },
        {
            id: 'nt-btn-lit',
            icon: '📚',
            label: 'இன்றைய இலக்கியம்',
            title: 'இன்றைய இலக்கியம் நூல் அறிமுகப் பெட்டியை உருவாக்கு',
            script: 'பயனர்:Neyakkoo/Gadget-TodaysLiterature.js',
            triggerSelectors: ['#todays-lit-btn', '#ca-todays-lit a', '.todays-literature-btn'],
            color: '#0f766e'
        },
        {
            id: 'nt-btn-lexeme',
            icon: '🧬',
            label: 'விக்கித்தரவு லெக்சீம்',
            title: 'அகராதிச் சொற்களை விக்கித்தரவு லெக்சீமில் இணை',
            script: 'பயனர்:Neyakkoo/WikidataLexemeCreator.js',
            triggerSelectors: ['#wikidata-lexeme-btn', '#ca-wikidata-lexeme a', '#lexeme-creator-btn'],
            color: '#4338ca'
        },
        {
            id: 'nt-btn-wikt',
            icon: '📖',
            label: 'விக்சனரியில் இணை',
            title: 'இப்பக்கத்தின் சொற்களைத் தமிழ் விக்சனரியில் இறக்குமதி செய்',
            script: 'பயனர்:Neyakkoo/WikisourceToWiktionaryImporter.js',
            triggerSelectors: ['#import-wiktionary-btn', '#ca-import-wiktionary a'],
            color: '#047857'
        },
        {
            id: 'nt-btn-quote',
            icon: '💬',
            label: 'விக்கிமேற்கோள் இணை',
            title: 'தெரிவு செய்த மேற்கோள் வரிகளை தமிழ் விக்கிமேற்கோளில் இணை',
            script: 'பயனர்:Neyakkoo/WikisourceToWikiquote.js',
            triggerSelectors: ['#ws-to-wq-float-btn'],
            isSelectionTool: true,
            color: '#b45309'
        }
    ];

    /* ========================================================
       2. CSS வடிவமைப்பு (மெய்ப்புத் திருத்தி பாணியில்)
       ======================================================== */
    function injectStyles() {
        if (document.getElementById('neyakkoo-unified-css')) return;

        const css = `
            #${BAR_ID} {
                margin: 8px 0 12px 0;
                padding: 7px 10px;
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 7px;
                background: #f0fdfa;
                border: 1.5px solid #0f766e;
                border-radius: 8px;
                box-shadow: 0 2px 6px rgba(15, 118, 110, 0.12);
                font-family: "Noto Sans Tamil", sans-serif;
            }
            #${BAR_ID} .nt-brand {
                font-size: 12px;
                font-weight: bold;
                color: #0f766e;
                padding: 3px 8px;
                background: #ccfbf1;
                border-radius: 5px;
                margin-right: 2px;
                user-select: none;
            }
            #${BAR_ID} .nt-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 5px 12px;
                background: #ffffff;
                color: var(--nt-color, #0f766e);
                border: 1.5px solid var(--nt-color, #0f766e);
                border-radius: 6px;
                font-size: 13px;
                font-weight: bold;
                cursor: pointer;
                transition: background-color 0.15s, color 0.15s, transform 0.1s;
                font-family: "Noto Sans Tamil", sans-serif;
            }
            #${BAR_ID} .nt-btn:hover {
                background: var(--nt-color, #0f766e);
                color: #ffffff;
            }
            #${BAR_ID} .nt-btn:active {
                transform: scale(0.98);
            }
            #${BAR_ID} .nt-btn.nt-loading {
                opacity: 0.75;
                pointer-events: none;
            }
            #${BAR_ID} .nt-sub-btn {
                padding: 5px 10px;
                background: #e0f2fe;
                color: #0369a1;
                border: 1.5px solid #0369a1;
                border-radius: 6px;
                font-size: 12.5px;
                font-weight: bold;
                cursor: pointer;
                font-family: "Noto Sans Tamil", sans-serif;
            }
            #${BAR_ID} .nt-sub-btn:hover {
                background: #0369a1;
                color: #ffffff;
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
        style.id = 'neyakkoo-unified-css';
        style.textContent = css;
        document.head.appendChild(style);
    }

    /* ========================================================
       3. கருவியை ஏற்றி இயக்குதல் (Load & Trigger)
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

    async function handleToolClick(tool, $button) {
        const originalHtml = $button.html();
        $button.addClass('nt-loading').html('⏳ ஏற்றப்படுகிறது...');

        await loadSubScript(tool.script);

        $button.removeClass('nt-loading').html(originalHtml);

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
                if (tool.id === 'nt-btn-audio' && mw.config.get('wgNamespaceNumber') !== 104) {
                    mw.notify('ஒலிப்பதிவுக் கருவி நூலின் "பக்கம்:" (Page) பெயர்வெளியில் மட்டுமே இயங்கும்.', { type: 'warn' });
                } else {
                    mw.notify('இக்கருவி இப்பக்கத்தில் செயல்படத் தயாராக உள்ளது.', { type: 'info' });
                }
            }
        }, 200);
    }

    /* ========================================================
       4. ஒருங்கிணைந்த கருவிப்பட்டையை உருவாக்குதல்
       ======================================================== */
    function mountUnifiedToolbar() {
        if (document.getElementById(BAR_ID)) return;

        injectStyles();

        const bar = document.createElement('div');
        bar.id = BAR_ID;

        const brand = document.createElement('span');
        brand.className = 'nt-brand';
        brand.textContent = '🛠️ விக்கிமூலக் கருவிகள்';
        bar.appendChild(brand);

        TOOLS.forEach(function (tool) {
            const button = document.createElement('button');
            button.id = tool.id;
            button.type = 'button';
            button.className = 'nt-btn';
            button.title = tool.title;
            button.style.setProperty('--nt-color', tool.color);
            button.innerHTML = `<span>${tool.icon}</span><span>${tool.label}</span>`;

            button.addEventListener('click', function () {
                handleToolClick(tool, $(button));
            });

            bar.appendChild(button);

            /* ஒலிப்பதிவுக் கருவிக்கு அருகிலேயே "நூல் நிலை" துணைப் பொத்தான் */
            if (tool.id === 'nt-btn-audio') {
                const dashBtn = document.createElement('button');
                dashBtn.id = 'nt-btn-audio-dash';
                dashBtn.type = 'button';
                dashBtn.className = 'nt-sub-btn';
                dashBtn.title = 'முழு நூலின் ஒலிப்பதிவு முன்னேற்றப் பட்டியல்';
                dashBtn.textContent = '📊 நூல் நிலை';
                dashBtn.addEventListener('click', async function () {
                    const $d = $(dashBtn);
                    const oldText = $d.text();
                    $d.text('⏳...');
                    await loadSubScript(tool.script);
                    $d.text(oldText);
                    setTimeout(function () {
                        const $target = $('#ws-audio-dashboard-button');
                        if ($target.length) {
                            $target[0].click();
                        } else {
                            mw.notify('நூல் நிலைப் பட்டியல் "பக்கம்:" அல்லது "அட்டவணை:" பக்கங்களில் இயங்கும்.', { type: 'warn' });
                        }
                    }, 300);
                });
                bar.appendChild(dashBtn);
            }
        });

        const heading = document.getElementById('firstHeading');
        if (heading && heading.parentNode) {
            heading.parentNode.insertBefore(bar, heading.nextSibling);
        } else {
            const content = document.getElementById('mw-content-text');
            if (content && content.parentNode) {
                content.parentNode.insertBefore(bar, content);
            }
        }

        /* விக்கிமேற்கோள் கருவியை மட்டும் பின்னணியில் முன்கூட்டியே ஏற்றுதல் (உரை தெரிவுக்காக) */
        loadSubScript('பயனர்:Neyakkoo/WikisourceToWikiquote.js');
    }

    /* ========================================================
       5. தொடக்கம் (Initialize)
       ======================================================== */
    mw.loader.using(['mediawiki.util']).then(function () {
        $(function () {
            mountUnifiedToolbar();
        });
        mw.hook('wikipage.content').add(function () {
            mountUnifiedToolbar();
        });
    });
})();
