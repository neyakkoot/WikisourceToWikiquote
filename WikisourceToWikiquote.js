/**
 * ============================================================
 * WikisourceToWikiquote.js
 * தமிழ் விக்கிமூலத்தில் தெரிவு செய்யும் மேற்கோள்களைத் தானாகவே
 * தமிழ் விக்கிமேற்கோளில் (ta.wikiquote.org) இணைக்கும் கருவி
 * Author: Dr. Sathiyaraj Thangasamy (Neyakkoo)
 * ============================================================
 */
(function () {
    'use strict';

    if (typeof mw === 'undefined' || typeof $ === 'undefined') {
        return;
    }

    const SCRIPT_RE = /[\u0B80-\u0BFF]/;
    const TARGET_WIKIQUOTE_API = 'https://ta.wikiquote.org/w/api.php';
    const FLOAT_BTN_ID = 'ws-to-wq-float-btn';
    const MODAL_ID = 'ws-to-wq-modal';

    let wqApi = null;
    let selectedQuoteText = '';

    /* ========================================================
       1. உதவிக் கூறுகள் (Helpers)
       ======================================================== */
    function escapeHTML(str) {
        return mw.html.escape(String(str || ''));
    }

    function cleanQuoteText(text) {
        return String(text || '')
            .replace(/\s+/g, ' ')
            .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
            .trim();
    }

    function getSourceMetadata() {
        const rawTitle = mw.config.get('wgTitle') || '';
        const ns = mw.config.get('wgNamespaceNumber');
        const fullPage = mw.config.get('wgPageName') || '';

        /* நூல் பெயரைப் பிரித்தெடுத்தல் */
        let bookTitle = rawTitle;
        if (ns === 104 && rawTitle.includes('/')) {
            bookTitle = rawTitle.split('/')[0].replace(/\.(pdf|djvu)$/i, '');
        } else if (rawTitle.includes('/')) {
            bookTitle = rawTitle.split('/')[0];
        } else {
            bookTitle = rawTitle.replace(/\.(pdf|djvu)$/i, '');
        }
        bookTitle = bookTitle.replace(/_/g, ' ').trim();

        /* பக்கத்தின் தலைப்புப் பகுதியிலிருந்து ஆசிரியர் பெயரைக் கண்டறிதல் */
        let authorName = '';
        const authorLink = $('#ws-author a, .wst-header a[href*="ஆசிரியர்:"], #mw-content-text a[title^="ஆசிரியர்:"]').first();
        if (authorLink.length) {
            authorName = authorLink.text().replace(/^ஆசிரியர்:/, '').trim();
        }

        return {
            bookTitle: bookTitle,
            authorName: authorName,
            sourceLink: `[[s:ta:${fullPage.replace(/_/g, ' ')}|${bookTitle}]]`
        };
    }

    /* ========================================================
       2. உரைத் தெரிவு (Text Selection) கண்காணிப்பு
       ======================================================== */
    function removeFloatButton() {
        $('#' + FLOAT_BTN_ID).remove();
    }

    function handleTextSelection(e) {
        /* உரையாடல் பெட்டி திறந்திருந்தால் மிதக்கும் பொத்தானைக் காட்ட வேண்டாம் */
        if ($('#' + MODAL_ID).length > 0) {
            return;
        }
        if (e && $(e.target).closest('#' + FLOAT_BTN_ID).length > 0) {
            return;
        }

        setTimeout(function () {
            const selection = window.getSelection();
            const text = selection ? cleanQuoteText(selection.toString()) : '';

            if (!text || text.length < 5 || !SCRIPT_RE.test(text)) {
                removeFloatButton();
                return;
            }

            selectedQuoteText = text;
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            removeFloatButton();

            const topPos = Math.max(10, rect.top + window.scrollY - 40);
            const leftPos = Math.max(10, Math.min(window.innerWidth - 220, rect.left + window.scrollX));

            $('<button>', {
                id: FLOAT_BTN_ID,
                type: 'button',
                title: 'தெரிவு செய்த வரிகளை தமிழ் விக்கிமேற்கோளில் இணை'
            })
                .html('💬 <b>விக்கிமேற்கோளில் இணை</b>')
                .css({
                    position: 'absolute',
                    top: topPos + 'px',
                    left: leftPos + 'px',
                    zIndex: 9999,
                    padding: '6px 12px',
                    backgroundColor: '#1b6ca8',
                    color: '#ffffff',
                    border: '1px solid #0f4c75',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
                })
                .on('mousedown', function (ev) {
                    ev.preventDefault();
                    ev.stopPropagation();
                    removeFloatButton();
                    openWikiquoteModal(selectedQuoteText);
                })
                .appendTo('body');
        }, 20);
    }

    /* ========================================================
       3. விக்கிமேற்கோள் இணைப்பு முகப்புப் பெட்டி (Modal)
       ======================================================== */
    function closeModal() {
        $('#' + MODAL_ID).remove();
    }

    function setModalStatus(msg, type) {
        const colors = {
            info: '#175cd3',
            success: '#14804a',
            error: '#b42318'
        };
        $('#wq-modal-status')
            .text(msg)
            .css('color', colors[type] || '#333');
    }

    function openWikiquoteModal(quoteText) {
        closeModal();

        const currentUser = mw.config.get('wgUserName');
        if (!currentUser) {
            mw.notify('விக்கிமேற்கோளில் இணைக்க முதலில் உள்நுழையவும்.', { type: 'error' });
            return;
        }

        const meta = getSourceMetadata();
        const defaultTargetTitle = meta.authorName || meta.bookTitle;

        const html = `
        <div id="${MODAL_ID}" role="dialog" aria-modal="true" style="position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:12px;">
            <div style="background:#fff;color:#202122;width:580px;max-width:100%;max-height:92vh;overflow:auto;border-radius:10px;padding:22px;font-family:sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.35);">
                <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #eaecf0;padding-bottom:10px;">
                    <h2 style="margin:0;font-size:18px;color:#1b6ca8;">💬 தமிழ் விக்கிமேற்கோளில் சேர்க்க</h2>
                    <button id="wq-close-top" type="button" style="border:none;background:none;font-size:18px;cursor:pointer;color:#666;">✖</button>
                </div>

                <div style="margin-top:12px;">
                    <label style="display:block;font-weight:bold;font-size:13px;margin-bottom:4px;">விக்கிமேற்கோள் பக்கத் தலைப்பு (ஆசிரியர் அல்லது நூல்):</label>
                    <input id="wq-target-title" type="text" value="${escapeHTML(defaultTargetTitle)}" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:5px;box-sizing:border-box;font-size:14px;">
                </div>

                <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;">
                    <div style="flex:1;min-width:200px;">
                        <label style="display:block;font-weight:bold;font-size:13px;margin-bottom:4px;">நூல் / பிரிவுத் தலைப்பு (விருப்பம்):</label>
                        <input id="wq-section-title" type="text" value="${escapeHTML(meta.bookTitle)}" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:5px;box-sizing:border-box;font-size:13px;">
                    </div>
                    <div style="flex:1;min-width:200px;">
                        <label style="display:block;font-weight:bold;font-size:13px;margin-bottom:4px;">பகுப்பு (Category):</label>
                        <input id="wq-category" type="text" value="தமிழ் மேற்கோள்கள்" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:5px;box-sizing:border-box;font-size:13px;">
                    </div>
                </div>

                <div style="margin-top:10px;">
                    <label style="display:block;font-weight:bold;font-size:13px;margin-bottom:4px;">மேற்கோள் உரை (தேவைப்படின் திருத்தலாம்):</label>
                    <textarea id="wq-quote-text" rows="4" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:5px;box-sizing:border-box;font-size:13.5px;line-height:1.5;">${escapeHTML(quoteText)}</textarea>
                </div>

                <div style="margin-top:10px;">
                    <label style="display:block;font-weight:bold;font-size:13px;margin-bottom:4px;">ஆதாரம் / குறிப்பு:</label>
                    <input id="wq-source-ref" type="text" value="${escapeHTML(meta.sourceLink)}" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:5px;box-sizing:border-box;font-size:13px;">
                </div>

                <div id="wq-modal-status" style="margin:12px 0;font-weight:bold;font-size:13px;min-height:20px;"></div>

                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px;">
                    <button id="wq-cancel-btn" class="mw-ui-button" type="button">ரத்து செய்</button>
                    <button id="wq-submit-btn" class="mw-ui-button mw-ui-progressive" type="button">✅ விக்கிமேற்கோளில் சேமி</button>
                </div>
            </div>
        </div>`;

        $('body').append(html);

        $('#wq-close-top, #wq-cancel-btn').on('click', closeModal);
        $('#' + MODAL_ID).on('click', function (ev) {
            if (ev.target === this) {
                closeModal();
            }
        });
        $('#wq-submit-btn').on('click', submitToWikiquote);
    }

    /* ========================================================
       4. விக்கிமேற்கோள் API வழியாகப் பக்கத்தை உருவாக்குதல் / இணைத்தல்
       ======================================================== */
    function getWikiquoteAPI() {
        if (!wqApi) {
            wqApi = new mw.ForeignApi(TARGET_WIKIQUOTE_API, { anonymous: false });
        }
        return wqApi;
    }

    async function submitToWikiquote() {
        const targetTitle = $('#wq-target-title').val().trim();
        const sectionTitle = $('#wq-section-title').val().trim();
        const quoteText = $('#wq-quote-text').val().trim();
        const sourceRef = $('#wq-source-ref').val().trim();
        const categoryName = $('#wq-category').val().trim();

        if (!targetTitle || !quoteText) {
            setModalStatus('பக்கத் தலைப்பு மற்றும் மேற்கோள் உரை அவசியம்.', 'error');
            return;
        }

        const $btn = $('#wq-submit-btn');
        $btn.prop('disabled', true).text('சேமிக்கப்படுகிறது...');
        setModalStatus('தமிழ் விக்கிமேற்கோள் பக்கம் சரிபார்க்கப்படுகிறது...', 'info');

        try {
            const api = getWikiquoteAPI();

            /* விக்கிமேற்கோளில் பக்கம் ஏற்கனவே உள்ளதா எனப் பார்த்தல் */
            const queryRes = await api.get({
                action: 'query',
                prop: 'revisions',
                titles: targetTitle,
                rvprop: 'content',
                rvslots: 'main',
                formatversion: 2
            });

            const page = queryRes && queryRes.query && queryRes.query.pages && queryRes.query.pages[0];
            const isMissing = !page || page.missing;

            const formattedQuote = `* "${quoteText}"\n** ஆதாரம்: ${sourceRef}`;
            let finalWikitext = '';

            if (isMissing) {
                /* புதிய பக்கம் உருவாக்கம் */
                const secHeader = (sectionTitle && sectionTitle !== targetTitle)
                    ? `=== ${sectionTitle} ===\n`
                    : '';
                const catLine = categoryName ? `\n\n[[பகுப்பு:${categoryName}]]` : '';

                finalWikitext =
                    `{{விக்கிமூலம்|${sectionTitle || targetTitle}}}\n\n` +
                    `== மேற்கோள்கள் ==\n` +
                    secHeader +
                    formattedQuote +
                    catLine;
            } else {
                /* ஏற்கனவே உள்ள பக்கத்தில் இணைத்தல் */
                const rev = page.revisions && page.revisions[0];
                let existingContent = rev && rev.slots && rev.slots.main
                    ? rev.slots.main.content
                    : (rev ? rev.content : '');

                if (existingContent.includes(quoteText)) {
                    setModalStatus('இந்த மேற்கோள் ஏற்கனவே விக்கிமேற்கோளில் உள்ளது!', 'info');
                    $btn.prop('disabled', false).text('✅ விக்கிமேற்கோளில் சேமி');
                    return;
                }

                if (sectionTitle && sectionTitle !== targetTitle && existingContent.includes(`=== ${sectionTitle} ===`)) {
                    existingContent = existingContent.replace(
                        `=== ${sectionTitle} ===`,
                        `=== ${sectionTitle} ===\n${formattedQuote}`
                    );
                } else if (existingContent.includes('== மேற்கோள்கள் ==')) {
                    const subSec = (sectionTitle && sectionTitle !== targetTitle)
                        ? `\n=== ${sectionTitle} ===\n`
                        : '\n';
                    existingContent = existingContent.replace(
                        '== மேற்கோள்கள் ==',
                        `== மேற்கோள்கள் ==${subSec}${formattedQuote}`
                    );
                } else {
                    /* பகுப்புகளுக்கு முன்பாக இணைத்தல் */
                    const catMatch = existingContent.match(/\[\[\s*பகுப்பு\s*:/i);
                    const block = `\n== மேற்கோள்கள் ==\n${formattedQuote}\n\n`;
                    if (catMatch) {
                        const idx = catMatch.index;
                        existingContent = existingContent.slice(0, idx) + block + existingContent.slice(idx);
                    } else {
                        existingContent = existingContent.trim() + '\n' + block;
                    }
                }
                finalWikitext = existingContent;
            }

            setModalStatus('விக்கிமேற்கோளில் பதிவேற்றப்படுகிறது...', 'info');

            const editRes = await api.postWithEditToken({
                action: 'edit',
                title: targetTitle,
                text: finalWikitext,
                summary: `தமிழ் விக்கிமூலத்திலிருந்து மேற்கோள் இணைக்கப்பட்டது (${sourceRef})`,
                format: 'json'
            });

            if (editRes && editRes.edit && editRes.edit.result === 'Success') {
                const wqUrl = 'https://ta.wikiquote.org/wiki/' + encodeURIComponent(targetTitle.replace(/ /g, '_'));
                $('#wq-modal-status')
                    .css('color', '#14804a')
                    .html(`✅ வெற்றி! <a href="${wqUrl}" target="_blank" rel="noopener" style="color:#14804a;text-decoration:underline;">${escapeHTML(targetTitle)}</a> பக்கத்தில் மேற்கோள் இணைக்கப்பட்டது.`);
                $btn.hide();
                $('#wq-cancel-btn').text('மூடு');
            } else {
                throw new Error('விக்கிமேற்கோள் தொகுப்பு தோல்வியடைந்தது.');
            }
        } catch (err) {
            console.error('WikisourceToWikiquote Error:', err);
            setModalStatus('பிழை: ' + (err.message || err), 'error');
            $btn.prop('disabled', false).text('✅ மீண்டும் முயற்சி செய்');
        }
    }

    /* ========================================================
       5. தொடக்கம் (Initialize)
       ======================================================== */
    mw.loader.using(['mediawiki.api', 'mediawiki.ForeignApi', 'mediawiki.util']).then(function () {
        $(document).on('mouseup keyup', handleTextSelection);
        $(document).on('mousedown', function (e) {
            if (!$(e.target).closest('#' + FLOAT_BTN_ID).length) {
                removeFloatButton();
            }
        });
    });
})();
