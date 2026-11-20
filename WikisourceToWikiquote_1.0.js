/**
 * ============================================================
 * WikisourceToWikiquote.js (Official Wikiquote Structure Edition)
 * தமிழ் விக்கிமூலத்தில் தெரிவு செய்யும் மேற்கோள்களைத் தமிழ் விக்கிமேற்கோளின்
 * அதிகாரப்பூர்வ வகைப்பாடுகளுடன் (நபர், இலக்கியப் படைப்பு, கருப்பொருள்...)
 * இணைத்துச் சேமிக்கும் கருவி
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

    /* தமிழ் விக்கிமேற்கோள் தொகுப்பு வகைகளும் அவற்றின் நிலையான வடிவமைப்புகளும் */
    const WIKIQUOTE_TYPES = {
        person: {
            label: 'நபர் (Person)',
            category: 'நபர்கள்',
            headerTemplate: '{{நபர் தகவல்}}\n',
            sections: ['== மேற்கோள்கள் ==', '== இவரைப் பற்றிய மேற்கோள்கள் ==', '== வெளியிணைப்புகள் ==']
        },
        literary: {
            label: 'இலக்கியப் படைப்பு (Literary Work)',
            category: 'இலக்கியப் படைப்புகள்',
            headerTemplate: '',
            sections: ['== மேற்கோள்கள் ==', '== நூலைப் பற்றிய மேற்கோள்கள் ==', '== வெளியிணைப்புகள் ==']
        },
        theme: {
            label: 'கருப்பொருள் (Theme)',
            category: 'கருப்பொருள்கள்',
            headerTemplate: '',
            sections: ['== மேற்கோள்கள் ==', '== இவற்றையும் பார்க்க ==']
        },
        proverbs: {
            label: 'பழமொழிகள் பட்டியல் (Proverbs)',
            category: 'பழமொழிகள்',
            headerTemplate: '',
            sections: ['== பழமொழிகள் ==', '== இவற்றையும் பார்க்க ==']
        },
        film: {
            label: 'திரைப்படம் (Film)',
            category: 'திரைப்படங்கள்',
            headerTemplate: '',
            sections: ['== உரையாடல்கள் ==', '== பாடல் வரிகள் ==', '== வெளியிணைப்புகள் ==']
        },
        tv: {
            label: 'தொலைக்காட்சித் தொடர் (TV Series)',
            category: 'தொலைக்காட்சித் தொடர்கள்',
            headerTemplate: '',
            sections: ['== உரையாடல்கள் ==', '== வெளியிணைப்புகள் ==']
        },
        general: {
            label: 'பொது (General)',
            category: 'தமிழ் மேற்கோள்கள்',
            headerTemplate: '',
            sections: ['== மேற்கோள்கள் ==', '== வெளியிணைப்புகள் ==']
        }
    };

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

        let bookTitle = rawTitle;
        if (ns === 104 && rawTitle.includes('/')) {
            bookTitle = rawTitle.split('/')[0].replace(/\.(pdf|djvu)$/i, '');
        } else if (rawTitle.includes('/')) {
            bookTitle = rawTitle.split('/')[0];
        } else {
            bookTitle = rawTitle.replace(/\.(pdf|djvu)$/i, '');
        }
        bookTitle = bookTitle.replace(/_/g, ' ').trim();

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
       2. வகைப்பாட்டிற்கு ஏற்ப விக்கிநடை உரை உருவாக்கம்
       ======================================================== */
    function buildNewPageWikitext(typeKey, targetTitle, sectionTitle, quoteText, sourceRef, customCategory) {
        const cfg = WIKIQUOTE_TYPES[typeKey] || WIKIQUOTE_TYPES.literary;
        const formattedQuote = `* "${quoteText}"\n** ஆதாரம்: ${sourceRef}`;
        const wsBox = `{{விக்கிமூலம்|${sectionTitle || targetTitle}}}\n\n`;

        const mainHeading = cfg.sections[0] || '== மேற்கோள்கள் ==';
        const subHeading = (sectionTitle && sectionTitle !== targetTitle && typeKey === 'person')
            ? `=== ${sectionTitle} ===\n`
            : '';

        const otherSections = cfg.sections.slice(1).map(s => `\n\n${s}\n* `).join('');
        const finalCat = (customCategory || cfg.category).trim();

        return (
            cfg.headerTemplate +
            wsBox +
            `${mainHeading}\n` +
            subHeading +
            formattedQuote +
            otherSections +
            `\n\n[[பகுப்பு:${finalCat}]]`
        );
    }

    function mergeIntoExistingPage(existingContent, typeKey, targetTitle, sectionTitle, quoteText, sourceRef) {
        if (existingContent.includes(quoteText)) {
            return { text: existingContent, duplicate: true };
        }

        const cfg = WIKIQUOTE_TYPES[typeKey] || WIKIQUOTE_TYPES.literary;
        const mainHeading = cfg.sections[0] || '== மேற்கோள்கள் ==';
        const formattedQuote = `* "${quoteText}"\n** ஆதாரம்: ${sourceRef}`;

        if (sectionTitle && sectionTitle !== targetTitle && existingContent.includes(`=== ${sectionTitle} ===`)) {
            const updated = existingContent.replace(
                `=== ${sectionTitle} ===`,
                `=== ${sectionTitle} ===\n${formattedQuote}`
            );
            return { text: updated, duplicate: false };
        }

        if (existingContent.includes(mainHeading)) {
            const subSec = (sectionTitle && sectionTitle !== targetTitle && typeKey === 'person')
                ? `\n=== ${sectionTitle} ===\n`
                : '\n';
            const updated = existingContent.replace(
                mainHeading,
                `${mainHeading}${subSec}${formattedQuote}`
            );
            return { text: updated, duplicate: false };
        }

        if (existingContent.includes('== மேற்கோள்கள் ==')) {
            const updated = existingContent.replace(
                '== மேற்கோள்கள் ==',
                `== மேற்கோள்கள் ==\n${formattedQuote}`
            );
            return { text: updated, duplicate: false };
        }

        const catMatch = existingContent.match(/\[\[\s*பகுப்பு\s*:/i);
        const block = `\n${mainHeading}\n${formattedQuote}\n\n`;
        if (catMatch) {
            const idx = catMatch.index;
            return {
                text: existingContent.slice(0, idx) + block + existingContent.slice(idx),
                duplicate: false
            };
        }

        return {
            text: existingContent.trim() + '\n' + block,
            duplicate: false
        };
    }

    /* ========================================================
       3. உரைத் தெரிவு (Text Selection) கண்காணிப்பு
       ======================================================== */
    function removeFloatButton() {
        $('#' + FLOAT_BTN_ID).remove();
    }

    function handleTextSelection(e) {
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
       4. விக்கிமேற்கோள் இணைப்பு முகப்புப் பெட்டி (Modal)
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

    function refreshPreviewBox() {
        const typeKey = $('#wq-entry-type').val();
        const targetTitle = $('#wq-target-title').val().trim();
        const sectionTitle = $('#wq-section-title').val().trim();
        const quoteText = $('#wq-quote-text').val().trim();
        const sourceRef = $('#wq-source-ref').val().trim();
        const customCategory = $('#wq-category').val().trim();

        const previewText = buildNewPageWikitext(
            typeKey,
            targetTitle,
            sectionTitle,
            quoteText,
            sourceRef,
            customCategory
        );
        $('#wq-wikitext-preview').val(previewText);
    }

    function openWikiquoteModal(quoteText) {
        closeModal();

        const currentUser = mw.config.get('wgUserName');
        if (!currentUser) {
            mw.notify('விக்கிமேற்கோளில் இணைக்க முதலில் உள்நுழையவும்.', { type: 'error' });
            return;
        }

        const meta = getSourceMetadata();
        const defaultType = meta.authorName ? 'person' : 'literary';
        const defaultTargetTitle = meta.authorName || meta.bookTitle;
        const defaultCategory = WIKIQUOTE_TYPES[defaultType].category;

        const optionsHtml = Object.keys(WIKIQUOTE_TYPES).map(key => {
            const selected = key === defaultType ? 'selected' : '';
            return `<option value="${key}" ${selected}>${escapeHTML(WIKIQUOTE_TYPES[key].label)}</option>`;
        }).join('');

        const html = `
        <div id="${MODAL_ID}" role="dialog" aria-modal="true" style="position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:12px;">
            <div style="background:#fff;color:#202122;width:620px;max-width:100%;max-height:92vh;overflow:auto;border-radius:10px;padding:22px;font-family:sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.35);">
                <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #eaecf0;padding-bottom:10px;">
                    <h2 style="margin:0;font-size:18px;color:#1b6ca8;">💬 தமிழ் விக்கிமேற்கோள் தொகுப்பு உருவாக்கம் & இணைப்பு</h2>
                    <button id="wq-close-top" type="button" style="border:none;background:none;font-size:18px;cursor:pointer;color:#666;">✖</button>
                </div>

                <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;">
                    <div style="flex:1;min-width:220px;">
                        <label style="display:block;font-weight:bold;font-size:13px;margin-bottom:4px;">மேற்கோள் தொகுப்பு வகை:</label>
                        <select id="wq-entry-type" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:5px;box-sizing:border-box;font-size:13.5px;background:#f8f9fa;">
                            ${optionsHtml}
                        </select>
                    </div>
                    <div style="flex:1;min-width:220px;">
                        <label style="display:block;font-weight:bold;font-size:13px;margin-bottom:4px;">பக்கத் தலைப்பு (நபர் / நூல் / கருப்பொருள்):</label>
                        <input id="wq-target-title" type="text" value="${escapeHTML(defaultTargetTitle)}" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:5px;box-sizing:border-box;font-size:13.5px;">
                    </div>
                </div>

                <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;">
                    <div style="flex:1;min-width:220px;">
                        <label style="display:block;font-weight:bold;font-size:13px;margin-bottom:4px;">நூல் / துணைப் பிரிவுத் தலைப்பு:</label>
                        <input id="wq-section-title" type="text" value="${escapeHTML(meta.bookTitle)}" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:5px;box-sizing:border-box;font-size:13px;">
                    </div>
                    <div style="flex:1;min-width:220px;">
                        <label style="display:block;font-weight:bold;font-size:13px;margin-bottom:4px;">பகுப்பு (Category):</label>
                        <input id="wq-category" type="text" value="${escapeHTML(defaultCategory)}" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:5px;box-sizing:border-box;font-size:13px;">
                    </div>
                </div>

                <div style="margin-top:10px;">
                    <label style="display:block;font-weight:bold;font-size:13px;margin-bottom:4px;">மேற்கோள் உரை:</label>
                    <textarea id="wq-quote-text" rows="3" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:5px;box-sizing:border-box;font-size:13.5px;line-height:1.5;">${escapeHTML(quoteText)}</textarea>
                </div>

                <div style="margin-top:10px;">
                    <label style="display:block;font-weight:bold;font-size:13px;margin-bottom:4px;">ஆதாரம் / விக்கிமூலச் சான்று:</label>
                    <input id="wq-source-ref" type="text" value="${escapeHTML(meta.sourceLink)}" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:5px;box-sizing:border-box;font-size:13px;">
                </div>

                <details style="margin-top:10px;background:#f8f9fa;padding:8px 10px;border-radius:6px;border:1px solid #eaecf0;">
                    <summary style="cursor:pointer;font-weight:bold;font-size:12.5px;color:#333;">புதிய பக்க விக்கிநடை முன்னோட்டம் (Editable Wikitext)</summary>
                    <textarea id="wq-wikitext-preview" rows="7" style="width:100%;margin-top:8px;padding:8px;border:1px solid #ccc;border-radius:5px;box-sizing:border-box;font-family:monospace;font-size:12px;"></textarea>
                </details>

                <div id="wq-modal-status" style="margin:12px 0;font-weight:bold;font-size:13px;min-height:20px;"></div>

                <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;">
                    <button id="wq-cancel-btn" class="mw-ui-button" type="button">ரத்து செய்</button>
                    <button id="wq-submit-btn" class="mw-ui-button mw-ui-progressive" type="button">✅ விக்கிமேற்கோளில் சேமி</button>
                </div>
            </div>
        </div>`;

        $('body').append(html);
        refreshPreviewBox();

        $('#wq-entry-type').on('change', function () {
            const key = $(this).val();
            const cfg = WIKIQUOTE_TYPES[key];
            if (cfg) {
                $('#wq-category').val(cfg.category);
                if (key === 'person' && meta.authorName) {
                    $('#wq-target-title').val(meta.authorName);
                } else if (key === 'literary' && meta.bookTitle) {
                    $('#wq-target-title').val(meta.bookTitle);
                }
            }
            refreshPreviewBox();
        });

        $('#wq-target-title, #wq-section-title, #wq-quote-text, #wq-source-ref, #wq-category')
            .on('input', refreshPreviewBox);

        $('#wq-close-top, #wq-cancel-btn').on('click', closeModal);
        $('#' + MODAL_ID).on('click', function (ev) {
            if (ev.target === this) {
                closeModal();
            }
        });
        $('#wq-submit-btn').on('click', submitToWikiquote);
    }

    /* ========================================================
       5. விக்கிமேற்கோள் API வழியாகப் பக்கத்தை உருவாக்குதல் / இணைத்தல்
       ======================================================== */
    function getWikiquoteAPI() {
        if (!wqApi) {
            wqApi = new mw.ForeignApi(TARGET_WIKIQUOTE_API, { anonymous: false });
        }
        return wqApi;
    }

    async function submitToWikiquote() {
        const typeKey = $('#wq-entry-type').val();
        const targetTitle = $('#wq-target-title').val().trim();
        const sectionTitle = $('#wq-section-title').val().trim();
        const quoteText = $('#wq-quote-text').val().trim();
        const sourceRef = $('#wq-source-ref').val().trim();
        const editedNewPageText = $('#wq-wikitext-preview').val().trim();

        if (!targetTitle || !quoteText) {
            setModalStatus('பக்கத் தலைப்பு மற்றும் மேற்கோள் உரை அவசியம்.', 'error');
            return;
        }

        const $btn = $('#wq-submit-btn');
        $btn.prop('disabled', true).text('சேமிக்கப்படுகிறது...');
        setModalStatus('தமிழ் விக்கிமேற்கோள் பக்கம் சரிபார்க்கப்படுகிறது...', 'info');

        try {
            const api = getWikiquoteAPI();

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
            let finalWikitext = '';

            if (isMissing) {
                finalWikitext = editedNewPageText;
            } else {
                const rev = page.revisions && page.revisions[0];
                const existingContent = rev && rev.slots && rev.slots.main
                    ? rev.slots.main.content
                    : (rev ? rev.content : '');

                const merged = mergeIntoExistingPage(
                    existingContent,
                    typeKey,
                    targetTitle,
                    sectionTitle,
                    quoteText,
                    sourceRef
                );

                if (merged.duplicate) {
                    setModalStatus('இந்த மேற்கோள் ஏற்கனவே விக்கிமேற்கோளில் உள்ளது!', 'info');
                    $btn.prop('disabled', false).text('✅ விக்கிமேற்கோளில் சேமி');
                    return;
                }
                finalWikitext = merged.text;
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
                    .html(`✅ வெற்றி! <a href="${wqUrl}" target="_blank" rel="noopener" style="color:#14804a;text-decoration:underline;">${escapeHTML(targetTitle)}</a> பக்கத்தில் மேற்கோள் சேமிக்கப்பட்டது.`);
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
       6. தொடக்கம் (Initialize)
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
