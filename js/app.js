/* ==========================================================================
   Main Application Entry & UI Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    loadDataFromStorage();
    setupTheme();
    populateCategoryDropdowns();
    setupEventListeners();
    updateAllViews();
}

function updateAllViews() {
    updateSidebarSummary();
    renderCalendarView();
    renderStatisticsView();
    renderHistoryTable();
}

// Sidebar Balance & Income/Expense Totals
function updateSidebarSummary() {
    const year = state.currentYear;
    const month = state.currentMonth;
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;

    const monthlyTxs = state.transactions.filter(t => t.date.startsWith(monthStr));
    let inc = 0;
    let exp = 0;

    monthlyTxs.forEach(t => {
        if (t.type === 'income') inc += Number(t.amount);
        else exp += Number(t.amount);
    });

    const net = inc - exp;

    const balEl = document.getElementById('sidebar-balance');
    if (balEl) balEl.textContent = `₩${formatKRW(net)}`;

    const incEl = document.getElementById('sidebar-income');
    if (incEl) incEl.textContent = `₩${formatKRW(inc)}`;

    const expEl = document.getElementById('sidebar-expense');
    if (expEl) expEl.textContent = `₩${formatKRW(exp)}`;
}

// Populate Category Dropdowns dynamically
function populateCategoryDropdowns() {
    const txCatSelect = document.getElementById('tx-category');
    const filterCatSelect = document.getElementById('history-filter-category');

    if (txCatSelect) {
        updateTxCategorySelectOptions('expense');
    }

    if (filterCatSelect) {
        filterCatSelect.innerHTML = `<option value="all">전체 카테고리</option>`;
        [...CATEGORIES.expense, ...CATEGORIES.income].forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.name;
            filterCatSelect.appendChild(opt);
        });
    }
}

function updateTxCategorySelectOptions(type) {
    const txCatSelect = document.getElementById('tx-category');
    if (!txCatSelect) return;

    txCatSelect.innerHTML = '';
    const list = CATEGORIES[type] || CATEGORIES.expense;
    list.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.name;
        txCatSelect.appendChild(opt);
    });
}

// Theme setup & toggle
function setupTheme() {
    const body = document.body;
    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');

    if (state.theme === 'light') {
        body.classList.remove('dark-theme');
        body.classList.add('light-theme');
        if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
        if (themeText) themeText.textContent = '다크 모드';
    } else {
        body.classList.remove('light-theme');
        body.classList.add('dark-theme');
        if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
        if (themeText) themeText.textContent = '라이트 모드';
    }
}

function toggleTheme() {
    const newTheme = state.theme === 'dark' ? 'light' : 'dark';
    saveThemeToStorage(newTheme);
    setupTheme();
    renderStatisticsView(); // refresh charts color scheme
}

// Event Listeners Registration
function setupEventListeners() {
    // 1. Navigation Tabs
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));

            btn.classList.add('active');
            document.getElementById(`tab-${targetTab}`).classList.add('active');

            const titleMap = {
                calendar: '📅 달력 뷰',
                statistics: '📊 통계 & 분석',
                history: '📝 거래 내역 목록'
            };
            document.getElementById('current-view-title').textContent = titleMap[targetTab];

            if (targetTab === 'statistics') {
                renderStatisticsView();
            }
        });
    });

    // 2. Month Selector Navigation
    document.getElementById('prev-month-btn')?.addEventListener('click', () => {
        if (state.currentMonth === 1) {
            state.currentMonth = 12;
            state.currentYear -= 1;
        } else {
            state.currentMonth -= 1;
        }
        updateAllViews();
    });

    document.getElementById('next-month-btn')?.addEventListener('click', () => {
        if (state.currentMonth === 12) {
            state.currentMonth = 1;
            state.currentYear += 1;
        } else {
            state.currentMonth += 1;
        }
        updateAllViews();
    });

    document.getElementById('today-btn')?.addEventListener('click', () => {
        const now = new Date();
        state.currentYear = now.getFullYear();
        state.currentMonth = now.getMonth() + 1;
        updateAllViews();
    });

    // 3. Theme Toggle & Reset Data
    document.getElementById('theme-toggle-btn')?.addEventListener('click', toggleTheme);
    document.getElementById('btn-reset-data')?.addEventListener('click', () => {
        if (confirm('모든 거래 내역을 초기화하고 샘플 데이터로 복원하시겠습니까?')) {
            state.transactions = generateInitialMockData();
            saveTransactionsToStorage();
            updateAllViews();
            showToast('데이터가 초기화되었습니다.');
        }
    });

    // 4. Modal Open & Close logic
    document.getElementById('btn-add-transaction')?.addEventListener('click', () => {
        openTransactionModal();
    });

    document.getElementById('btn-add-for-day')?.addEventListener('click', (e) => {
        const dateStr = e.currentTarget.dataset.date;
        closeModal('modal-day-detail');
        openTransactionModal(null, dateStr);
    });

    document.querySelectorAll('[data-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            closeModal(btn.dataset.close);
        });
    });

    // 5. Transaction Form Type Toggle & Submit
    const typeBtns = document.querySelectorAll('.type-toggle-buttons .btn-type');
    typeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            typeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const type = btn.dataset.type;
            document.getElementById('tx-type').value = type;
            updateTxCategorySelectOptions(type);
        });
    });

    document.getElementById('form-transaction')?.addEventListener('submit', handleSaveTransaction);

    // 6. Budget Save
    document.getElementById('btn-save-budget')?.addEventListener('click', () => {
        const val = parseInt(document.getElementById('budget-input').value, 10);
        if (val > 0) {
            saveBudgetToStorage(val);
            renderStatisticsView();
            showToast(`목표 예산이 ₩${formatKRW(val)}으로 설정되었습니다.`);
        }
    });

    // 7. History View Filters, Search & Batch Delete
    document.getElementById('history-search')?.addEventListener('input', renderHistoryTable);
    document.getElementById('history-filter-type')?.addEventListener('change', renderHistoryTable);
    document.getElementById('history-filter-category')?.addEventListener('change', renderHistoryTable);

    document.getElementById('history-check-all')?.addEventListener('change', (e) => {
        const checked = e.target.checked;
        document.querySelectorAll('.hist-row-check').forEach(chk => chk.checked = checked);
        updateHistorySelectedCount();
    });

    document.getElementById('btn-delete-selected-history')?.addEventListener('click', () => {
        const checkedBoxes = document.querySelectorAll('.hist-row-check:checked');
        const ids = Array.from(checkedBoxes).map(chk => chk.dataset.id);
        if (ids.length === 0) return;

        if (confirm(`선택한 ${ids.length}건의 거래 내역을 모두 삭제하시겠습니까?`)) {
            deleteMultipleTransactions(ids);
            updateAllViews();
            showToast(`선택한 거래 내역 ${ids.length}건이 삭제되었습니다.`);
        }
    });

    // 8. AI PDF Modal Workflow
    setupPdfModalEvents();
}

// Modal Helpers
function openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.add('active');
}

function closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) el.classList.remove('active');
}

function openTransactionModal(txId = null, defaultDateStr = null) {
    const form = document.getElementById('form-transaction');
    form.reset();

    const titleEl = document.getElementById('modal-tx-title');
    const idEl = document.getElementById('tx-id');
    const dateInput = document.getElementById('tx-date');

    const defaultDate = defaultDateStr || getTodayFormattedStr();
    dateInput.value = defaultDate;

    if (txId) {
        const tx = state.transactions.find(t => t.id === txId);
        if (tx) {
            titleEl.innerHTML = `<i class="fa-solid fa-pen-to-square"></i> 거래 내역 수정`;
            idEl.value = tx.id;
            dateInput.value = tx.date;
            document.getElementById('tx-amount').value = tx.amount;
            document.getElementById('tx-title').value = tx.title;
            document.getElementById('tx-memo').value = tx.memo || '';
            document.getElementById('tx-type').value = tx.type;

            // Update type toggle buttons
            document.querySelectorAll('.type-toggle-buttons .btn-type').forEach(b => {
                b.classList.toggle('active', b.dataset.type === tx.type);
            });
            updateTxCategorySelectOptions(tx.type);
            document.getElementById('tx-category').value = tx.category;
        }
    } else {
        titleEl.innerHTML = `<i class="fa-solid fa-circle-plus"></i> 새 거래 내역 추가`;
        idEl.value = '';
        document.getElementById('tx-type').value = 'expense';
        document.querySelectorAll('.type-toggle-buttons .btn-type').forEach(b => {
            b.classList.toggle('active', b.dataset.type === 'expense');
        });
        updateTxCategorySelectOptions('expense');
    }

    openModal('modal-transaction');
}

function handleSaveTransaction(e) {
    e.preventDefault();

    const txId = document.getElementById('tx-id').value;
    const type = document.getElementById('tx-type').value;
    const date = document.getElementById('tx-date').value;
    const amount = parseInt(document.getElementById('tx-amount').value, 10);
    const category = document.getElementById('tx-category').value;
    const title = document.getElementById('tx-title').value.trim();
    const memo = document.getElementById('tx-memo').value.trim();

    if (!date || !amount || !title) {
        alert('필수 입력 항목을 확인해 주세요.');
        return;
    }

    if (txId) {
        updateTransaction(txId, { type, date, amount, category, title, memo });
        showToast('거래 내역이 수정되었습니다.');
    } else {
        addTransaction({ type, date, amount, category, title, memo });
        showToast('새 내역이 추가되었습니다.');
    }

    closeModal('modal-transaction');
    updateAllViews();
}

// History Table Renderer
function renderHistoryTable() {
    const tbody = document.getElementById('history-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    const query = (document.getElementById('history-search')?.value || '').toLowerCase().trim();
    const filterType = document.getElementById('history-filter-type')?.value || 'all';
    const filterCat = document.getElementById('history-filter-category')?.value || 'all';

    let filtered = [...state.transactions];

    // Filter by type
    if (filterType !== 'all') {
        filtered = filtered.filter(t => t.type === filterType);
    }

    // Filter by category
    if (filterCat !== 'all') {
        filtered = filtered.filter(t => t.category === filterCat);
    }

    // Search query
    if (query) {
        filtered = filtered.filter(t => 
            t.title.toLowerCase().includes(query) || 
            (t.memo && t.memo.toLowerCase().includes(query)) ||
            t.date.includes(query)
        );
    }

    // Sort latest date first
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Reset check-all and count
    const checkAll = document.getElementById('history-check-all');
    if (checkAll) checkAll.checked = false;
    updateHistorySelectedCount();

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 30px;">조건에 해당하는 거래 내역이 없습니다.</td></tr>`;
        return;
    }

    filtered.forEach(tx => {
        const catInfo = getCategoryInfo(tx.category, tx.type);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="hist-row-check" data-id="${tx.id}"></td>
            <td>${tx.date}</td>
            <td><span class="badge ${tx.type === 'income' ? 'badge-income' : 'badge-expense'}">${tx.type === 'income' ? '수입' : '지출'}</span></td>
            <td>
                <span class="cat-badge" style="background: ${catInfo.color}22; color: ${catInfo.color}">
                    <i class="fa-solid ${catInfo.icon}"></i> ${catInfo.name}
                </span>
            </td>
            <td>
                <strong>${tx.title}</strong>
                ${tx.memo ? `<br><small style="color: var(--text-muted);">${tx.memo}</small>` : ''}
            </td>
            <td class="${tx.type === 'income' ? 'text-income' : 'text-expense'}" style="font-weight: 800;">
                ${tx.type === 'income' ? '+' : '-'}${formatKRW(tx.amount)}원
            </td>
            <td>
                <div style="display: flex; gap: 4px;">
                    <button class="icon-btn btn-edit-hist" data-id="${tx.id}"><i class="fa-solid fa-pen"></i></button>
                    <button class="icon-btn btn-del-hist danger-text" data-id="${tx.id}"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Checkbox change handlers
    tbody.querySelectorAll('.hist-row-check').forEach(chk => {
        chk.addEventListener('change', updateHistorySelectedCount);
    });

    // Attach row action handlers
    tbody.querySelectorAll('.btn-edit-hist').forEach(b => {
        b.addEventListener('click', () => openTransactionModal(b.dataset.id));
    });

    tbody.querySelectorAll('.btn-del-hist').forEach(b => {
        b.addEventListener('click', () => {
            if (confirm('이 내역을 삭제하시겠습니까?')) {
                deleteTransaction(b.dataset.id);
                updateAllViews();
                showToast('내역이 삭제되었습니다.');
            }
        });
    });
}

function updateHistorySelectedCount() {
    const checkedBoxes = document.querySelectorAll('.hist-row-check:checked');
    const count = checkedBoxes.length;
    const countEl = document.getElementById('history-selected-count');
    const btnDel = document.getElementById('btn-delete-selected-history');

    if (countEl) countEl.textContent = count;
    if (btnDel) {
        btnDel.disabled = count === 0;
        if (count > 0) {
            btnDel.classList.remove('btn-outline');
            btnDel.classList.add('btn-primary');
            btnDel.style.backgroundColor = 'var(--color-expense)';
            btnDel.style.borderColor = 'var(--color-expense)';
        } else {
            btnDel.classList.add('btn-outline');
            btnDel.classList.remove('btn-primary');
            btnDel.style.backgroundColor = '';
            btnDel.style.borderColor = '';
        }
    }
}

/* ==========================================================================
   AI PDF STATEMENT IMPORT WORKFLOW CONTROLLER
   ========================================================================== */
let tempParsedPdfItems = [];

function setupPdfModalEvents() {
    const openBtn = document.getElementById('btn-open-pdf-modal');
    const modal = document.getElementById('modal-pdf-import');
    const dropZone = document.getElementById('pdf-drop-zone');
    const fileInput = document.getElementById('pdf-file-input');
    const sampleBtn = document.getElementById('btn-load-sample-pdf');
    const reuploadBtn = document.getElementById('btn-reupload-pdf');
    const confirmImportBtn = document.getElementById('btn-confirm-import');

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            resetPdfModalSteps();
            openModal('modal-pdf-import');
        });
    }

    // Dropzone triggers hidden file input
    dropZone?.addEventListener('click', (e) => {
        if (e.target.closest('#btn-load-sample-pdf')) return;
        fileInput.click();
    });

    // Drag and Drop support
    dropZone?.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#ec4899';
    });

    dropZone?.addEventListener('dragleave', () => {
        dropZone.style.borderColor = 'var(--color-ai)';
    });

    dropZone?.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--color-ai)';
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processUploadedFile(e.dataTransfer.files[0]);
        }
    });

    fileInput?.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            processUploadedFile(e.target.files[0]);
        }
    });

    // Sample PDF Generator & Test Button
    sampleBtn?.addEventListener('click', async (e) => {
        e.stopPropagation();
        const samplePdfData = createSampleBankStatementPDF();
        startAiProcessingAnimation(samplePdfData, 'pdf');
    });

    // Sample Excel Generator & Test Button
    document.getElementById('btn-load-sample-excel')?.addEventListener('click', async (e) => {
        e.stopPropagation();
        const sampleExcelData = createSampleExcelStatement();
        startAiProcessingAnimation(sampleExcelData, 'excel');
    });

    // Tab switcher between PDF File & Text Paste
    const tabFileBtn = document.getElementById('pdf-tab-file-btn');
    const tabTextBtn = document.getElementById('pdf-tab-text-btn');
    const modeFileDiv = document.getElementById('pdf-upload-mode-file');
    const modeTextDiv = document.getElementById('pdf-upload-mode-text');

    tabFileBtn?.addEventListener('click', () => {
        tabFileBtn.classList.add('active');
        tabTextBtn.classList.remove('active');
        modeFileDiv.style.display = 'block';
        modeTextDiv.style.display = 'none';
    });

    tabTextBtn?.addEventListener('click', () => {
        tabTextBtn.classList.add('active');
        tabFileBtn.classList.remove('active');
        modeFileDiv.style.display = 'none';
        modeTextDiv.style.display = 'block';
    });

    document.getElementById('btn-parse-pasted-text')?.addEventListener('click', () => {
        const textVal = document.getElementById('pdf-paste-input').value;
        if (!textVal || textVal.trim().length === 0) {
            alert('붙여넣을 텍스트를 입력해 주세요.');
            return;
        }
        startAiTextProcessingAnimation(textVal);
    });

    reuploadBtn?.addEventListener('click', () => {
        resetPdfModalSteps();
    });

    confirmImportBtn?.addEventListener('click', handleConfirmPdfImport);
}

function resetPdfModalSteps() {
    document.querySelectorAll('.pdf-step').forEach(s => s.classList.remove('active'));
    document.getElementById('pdf-step-upload').classList.add('active');
    tempParsedPdfItems = [];
}

async function processUploadedFile(file) {
    const fileName = file.name.toLowerCase();
    let fileType = 'pdf';

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
        fileType = 'excel';
    } else if (!fileName.endsWith('.pdf') && file.type !== 'application/pdf') {
        alert('PDF 또는 엑셀(.xlsx, .xls, .csv) 파일만 업로드할 수 있습니다.');
        return;
    }

    startAiProcessingAnimation(file, fileType);
}

// AI Scanning Animation & Workflow
async function startAiProcessingAnimation(fileOrBuffer, fileType = 'pdf') {
    document.querySelectorAll('.pdf-step').forEach(s => s.classList.remove('active'));
    document.getElementById('pdf-step-processing').classList.add('active');

    const fillEl = document.getElementById('ai-progress-fill');
    const statusTextEl = document.getElementById('ai-status-text');
    const check1 = document.getElementById('check-step-1');
    const check2 = document.getElementById('check-step-2');
    const check3 = document.getElementById('check-step-3');

    // Reset indicator
    fillEl.style.width = '10%';
    statusTextEl.textContent = fileType === 'excel' ? '엑셀(XLSX/CSV) 데이터 구조 분석 중...' : 'PDF 텍스트 구조 분석 중...';
    check1.className = 'done';
    check1.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${fileType === 'excel' ? '엑셀 시트 파싱' : 'PDF 텍스트 구조 분석'}`;
    check2.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 거래 날짜 / 거래처 / 금액 패턴 추출';
    check3.innerHTML = '<i class="fa-regular fa-circle"></i> 지출/수입 카테고리 AI 자동 분류';

    await new Promise(r => setTimeout(r, 600));

    // Step 1: Extract Text
    let rawText = '';
    try {
        if (fileType === 'excel') {
            rawText = await extractTextFromExcel(fileOrBuffer);
        } else {
            rawText = await extractTextFromPDF(fileOrBuffer);
        }
    } catch (err) {
        console.error('File extraction error:', err);
    }

    fillEl.style.width = '60%';
    statusTextEl.textContent = 'AI 거래내역 패턴 인식 중...';
    check2.className = 'done';
    check2.innerHTML = '<i class="fa-solid fa-circle-check"></i> 거래 날짜 / 거래처 / 금액 패턴 추출';
    check3.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 지출/수입 카테고리 AI 자동 분류';

    await new Promise(r => setTimeout(r, 600));

    // Step 2: AI Parse & Categorize
    tempParsedPdfItems = parseTransactionTextWithAI(rawText);

    fillEl.style.width = '100%';
    statusTextEl.textContent = 'AI 자동 카테고리 분류 완료!';
    check3.className = 'done';
    check3.innerHTML = '<i class="fa-solid fa-circle-check"></i> 지출/수입 카테고리 AI 자동 분류 완료';

    await new Promise(r => setTimeout(r, 400));

    // Show Results
    renderParsedPdfResults();
}

async function startAiTextProcessingAnimation(rawText) {
    document.querySelectorAll('.pdf-step').forEach(s => s.classList.remove('active'));
    document.getElementById('pdf-step-processing').classList.add('active');

    const fillEl = document.getElementById('ai-progress-fill');
    const statusTextEl = document.getElementById('ai-status-text');
    const check1 = document.getElementById('check-step-1');
    const check2 = document.getElementById('check-step-2');
    const check3 = document.getElementById('check-step-3');

    fillEl.style.width = '30%';
    statusTextEl.textContent = '붙여넣은 텍스트 패턴 분석 중...';
    check1.className = 'done';
    check1.innerHTML = '<i class="fa-solid fa-circle-check"></i> 텍스트 데이터 파싱';
    check2.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 거래 날짜 / 거래처 / 금액 패턴 추출';
    check3.innerHTML = '<i class="fa-regular fa-circle"></i> 지출/수입 카테고리 AI 자동 분류';

    await new Promise(r => setTimeout(r, 500));

    fillEl.style.width = '70%';
    check2.className = 'done';
    check2.innerHTML = '<i class="fa-solid fa-circle-check"></i> 거래 날짜 / 거래처 / 금액 패턴 추출';
    check3.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 지출/수입 카테고리 AI 자동 분류';

    await new Promise(r => setTimeout(r, 500));

    tempParsedPdfItems = parseTransactionTextWithAI(rawText);

    fillEl.style.width = '100%';
    statusTextEl.textContent = 'AI 자동 카테고리 분류 완료!';
    check3.className = 'done';
    check3.innerHTML = '<i class="fa-solid fa-circle-check"></i> 지출/수입 카테고리 AI 자동 분류 완료';

    await new Promise(r => setTimeout(r, 300));
    renderParsedPdfResults();
}

function renderParsedPdfResults() {
    document.querySelectorAll('.pdf-step').forEach(s => s.classList.remove('active'));
    document.getElementById('pdf-step-result').classList.add('active');

    document.getElementById('parsed-count').textContent = tempParsedPdfItems.length;

    const tbody = document.getElementById('parsed-items-body');
    tbody.innerHTML = '';

    tempParsedPdfItems.forEach((item, idx) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="checkbox" class="parsed-item-check" data-idx="${idx}" ${item.selected ? 'checked' : ''}></td>
            <td><input type="date" value="${item.date}" class="input-sm parsed-date" data-idx="${idx}"></td>
            <td>
                <select class="input-sm parsed-type" data-idx="${idx}">
                    <option value="expense" ${item.type === 'expense' ? 'selected' : ''}>지출</option>
                    <option value="income" ${item.type === 'income' ? 'selected' : ''}>수입</option>
                </select>
            </td>
            <td><input type="text" value="${item.title}" class="input-sm parsed-title" data-idx="${idx}"></td>
            <td>
                <select class="input-sm parsed-cat" data-idx="${idx}">
                    ${[...CATEGORIES.expense, ...CATEGORIES.income].map(c => 
                        `<option value="${c.id}" ${c.id === item.category ? 'selected' : ''}>${c.name}</option>`
                    ).join('')}
                </select>
            </td>
            <td><input type="number" value="${item.amount}" class="input-sm parsed-amount" data-idx="${idx}"></td>
        `;
        tbody.appendChild(tr);
    });

    updateSelectedPdfCount();

    // Checkbox & edit handlers in parsed table
    tbody.querySelectorAll('.parsed-item-check').forEach(chk => {
        chk.addEventListener('change', (e) => {
            const idx = e.target.dataset.idx;
            tempParsedPdfItems[idx].selected = e.target.checked;
            updateSelectedPdfCount();
        });
    });

    document.getElementById('check-all-parsed')?.addEventListener('change', (e) => {
        const checked = e.target.checked;
        tempParsedPdfItems.forEach(i => i.selected = checked);
        tbody.querySelectorAll('.parsed-item-check').forEach(chk => chk.checked = checked);
        updateSelectedPdfCount();
    });
}

function updateSelectedPdfCount() {
    const selectedCount = tempParsedPdfItems.filter(i => i.selected).length;
    document.getElementById('selected-import-count').textContent = `선택된 ${selectedCount}건`;
}

function handleConfirmPdfImport() {
    const selected = tempParsedPdfItems.filter(i => i.selected);
    if (selected.length === 0) {
        alert('등록할 거래 내역을 하나 이상 선택해 주세요.');
        return;
    }

    selected.forEach(item => {
        addTransaction({
            type: item.type,
            date: item.date,
            amount: Number(item.amount),
            category: item.category,
            title: item.title,
            memo: 'PDF AI 자동 인식 입력'
        });
    });

    closeModal('modal-pdf-import');
    updateAllViews();
    showToast(`AI 인식 거래 내역 ${selected.length}건이 용돈기입장에 자동 등록되었습니다! 🎉`);
}

// Toast helper
function showToast(message) {
    const toast = document.getElementById('toast');
    const msgEl = document.getElementById('toast-message');

    if (!toast || !msgEl) return;

    msgEl.textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}
