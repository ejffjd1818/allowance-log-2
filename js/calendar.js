/* ==========================================================================
   Calendar View Controller
   ========================================================================== */

function renderCalendarView() {
    const gridEl = document.getElementById('calendar-grid');
    const displayMonthEl = document.getElementById('current-month-display');
    const periodTextEl = document.getElementById('current-period-text');

    if (!gridEl) return;

    const year = state.currentYear;
    const month = state.currentMonth; // 1-indexed

    displayMonthEl.textContent = `${year}년 ${String(month).padStart(2, '0')}월`;
    periodTextEl.textContent = `${year}년 ${String(month).padStart(2, '0')}월`;

    // Clear grid
    gridEl.innerHTML = '';

    // First day of current month & last day of current month
    const firstDayIndex = new Date(year, month - 1, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    const prevMonthTotalDays = new Date(year, month - 1, 0).getDate();

    // Map transactions by YYYY-MM-DD
    const txMap = {};
    state.transactions.forEach(tx => {
        if (!txMap[tx.date]) {
            txMap[tx.date] = { income: 0, expense: 0, items: [] };
        }
        txMap[tx.date].items.push(tx);
        if (tx.type === 'income') {
            txMap[tx.date].income += Number(tx.amount);
        } else {
            txMap[tx.date].expense += Number(tx.amount);
        }
    });

    const todayStr = getTodayFormattedStr();

    // 1. Render Previous Month Days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        const dayNum = prevMonthTotalDays - i;
        const prevMonthVal = month === 1 ? 12 : month - 1;
        const prevYearVal = month === 1 ? year - 1 : year;
        const dateStr = `${prevYearVal}-${String(prevMonthVal).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        
        const cell = createCalendarDayCell(dayNum, dateStr, true, false, txMap[dateStr]);
        gridEl.appendChild(cell);
    }

    // 2. Render Current Month Days
    for (let d = 1; d <= totalDaysInMonth; d++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;
        const dayOfWeek = new Date(year, month - 1, d).getDay();

        const cell = createCalendarDayCell(d, dateStr, false, isToday, txMap[dateStr], dayOfWeek);
        gridEl.appendChild(cell);
    }

    // 3. Render Next Month Days (to fill 35 or 42 grid cells)
    const totalCells = firstDayIndex + totalDaysInMonth;
    const remainingCells = (totalCells > 35 ? 42 : 35) - totalCells;

    for (let n = 1; n <= remainingCells; n++) {
        const nextMonthVal = month === 12 ? 1 : month + 1;
        const nextYearVal = month === 12 ? year + 1 : year;
        const dateStr = `${nextYearVal}-${String(nextMonthVal).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
        
        const cell = createCalendarDayCell(n, dateStr, true, false, txMap[dateStr]);
        gridEl.appendChild(cell);
    }
}

function createCalendarDayCell(dayNum, dateStr, isOtherMonth, isToday, dayData, dayOfWeek = -1) {
    const cell = document.createElement('div');
    cell.className = `cal-day ${isOtherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`;
    
    if (dayOfWeek === 0) cell.classList.add('sunday');
    if (dayOfWeek === 6) cell.classList.add('saturday');

    cell.dataset.date = dateStr;

    // Header (Day number + item count)
    const header = document.createElement('div');
    header.className = 'cal-day-header';

    const numSpan = document.createElement('span');
    numSpan.className = 'cal-date-num';
    numSpan.textContent = dayNum;
    header.appendChild(numSpan);

    if (dayData && dayData.items.length > 0) {
        const countSpan = document.createElement('span');
        countSpan.className = 'cal-count-dot';
        countSpan.textContent = `${dayData.items.length}건`;
        header.appendChild(countSpan);
    }

    cell.appendChild(header);

    // Amounts Summary (Income / Expense)
    const amountsDiv = document.createElement('div');
    amountsDiv.className = 'cal-day-amounts';

    if (dayData) {
        if (dayData.income > 0) {
            const incSpan = document.createElement('span');
            incSpan.className = 'cal-income';
            incSpan.textContent = `+${formatKRW(dayData.income)}`;
            amountsDiv.appendChild(incSpan);
        }
        if (dayData.expense > 0) {
            const expSpan = document.createElement('span');
            expSpan.className = 'cal-expense';
            expSpan.textContent = `-${formatKRW(dayData.expense)}`;
            amountsDiv.appendChild(expSpan);
        }
    }

    cell.appendChild(amountsDiv);

    // Click handler to open Day Detail Modal
    cell.addEventListener('click', () => {
        openDayDetailModal(dateStr);
    });

    return cell;
}

function getTodayFormattedStr() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// Open Day Detail Modal
function openDayDetailModal(dateStr) {
    const modal = document.getElementById('modal-day-detail');
    const dateTitleEl = document.getElementById('day-detail-date');
    const incSumEl = document.getElementById('day-sum-income');
    const expSumEl = document.getElementById('day-sum-expense');
    const listEl = document.getElementById('day-items-list');

    dateTitleEl.textContent = dateStr;

    // Filter transactions for this day
    const dayTxs = state.transactions.filter(t => t.date === dateStr);

    let incTotal = 0;
    let expTotal = 0;
    listEl.innerHTML = '';

    if (dayTxs.length === 0) {
        listEl.innerHTML = `<div class="empty-state" style="padding: 20px; text-align: center; color: var(--text-muted);"><i class="fa-solid fa-calendar-xmark" style="font-size: 2rem; margin-bottom: 8px;"></i><p>등록된 거래 내역이 없습니다.</p></div>`;
    } else {
        dayTxs.forEach(tx => {
            if (tx.type === 'income') incTotal += Number(tx.amount);
            else expTotal += Number(tx.amount);

            const catInfo = getCategoryInfo(tx.category, tx.type);
            const row = document.createElement('div');
            row.className = 'day-item-row';
            row.innerHTML = `
                <div class="day-item-left">
                    <span class="cat-badge" style="background: ${catInfo.color}22; color: ${catInfo.color}">
                        <i class="fa-solid ${catInfo.icon}"></i> ${catInfo.name}
                    </span>
                    <div>
                        <div style="font-weight: 700;">${tx.title}</div>
                        ${tx.memo ? `<div style="font-size: 0.75rem; color: var(--text-muted);">${tx.memo}</div>` : ''}
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="font-weight: 800; font-size: 0.95rem;" class="${tx.type === 'income' ? 'text-income' : 'text-expense'}">
                        ${tx.type === 'income' ? '+' : '-'}${formatKRW(tx.amount)}원
                    </div>
                    <div class="day-item-actions">
                        <button class="icon-btn btn-edit-tx" data-id="${tx.id}"><i class="fa-solid fa-pen"></i></button>
                        <button class="icon-btn btn-del-tx danger-text" data-id="${tx.id}"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
            listEl.appendChild(row);
        });
    }

    incSumEl.textContent = formatKRW(incTotal);
    expSumEl.textContent = formatKRW(expTotal);

    // Store active date on add button
    document.getElementById('btn-add-for-day').dataset.date = dateStr;

    // Attach edit/delete listeners
    listEl.querySelectorAll('.btn-edit-tx').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeModal('modal-day-detail');
            openTransactionModal(btn.dataset.id);
        });
    });

    listEl.querySelectorAll('.btn-del-tx').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('이 내역을 삭제하시겠습니까?')) {
                deleteTransaction(btn.dataset.id);
                openDayDetailModal(dateStr);
                updateAllViews();
                showToast('내역이 삭제되었습니다.');
            }
        });
    });

    openModal('modal-day-detail');
}
