/* ==========================================================================
   Statistics & Analytics Controller (Chart.js Integration)
   ========================================================================== */

let categoryChartInstance = null;
let dailyTrendChartInstance = null;

function renderStatisticsView() {
    const year = state.currentYear;
    const month = state.currentMonth;

    // Filter current month transactions
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const monthlyTxs = state.transactions.filter(t => t.date.startsWith(monthStr));

    let totalIncome = 0;
    let totalExpense = 0;
    const categoryTotals = {};
    const dailyExpenses = {};

    // Get number of days in month for daily average calculation
    const daysInMonth = new Date(year, month, 0).getDate();

    monthlyTxs.forEach(tx => {
        const amount = Number(tx.amount);
        if (tx.type === 'income') {
            totalIncome += amount;
        } else {
            totalExpense += amount;

            // Category summary
            if (!categoryTotals[tx.category]) {
                categoryTotals[tx.category] = { amount: 0, count: 0 };
            }
            categoryTotals[tx.category].amount += amount;
            categoryTotals[tx.category].count += 1;

            // Daily expense summary
            const dayNum = parseInt(tx.date.split('-')[2], 10);
            dailyExpenses[dayNum] = (dailyExpenses[dayNum] || 0) + amount;
        }
    });

    const netBalance = totalIncome - totalExpense;
    const todayNum = (year === new Date().getFullYear() && month === (new Date().getMonth() + 1)) 
        ? new Date().getDate() 
        : daysInMonth;
    const dailyAvg = todayNum > 0 ? Math.round(totalExpense / todayNum) : 0;

    // Update Summary Cards
    document.getElementById('stat-total-income').textContent = `₩${formatKRW(totalIncome)}`;
    document.getElementById('stat-total-expense').textContent = `₩${formatKRW(totalExpense)}`;
    
    const netEl = document.getElementById('stat-net-balance');
    netEl.textContent = `₩${formatKRW(netBalance)}`;
    netEl.className = `metric-value ${netBalance >= 0 ? 'text-income' : 'text-expense'}`;
    
    document.getElementById('stat-daily-avg').textContent = `₩${formatKRW(dailyAvg)}`;

    // Update Budget Bar
    updateBudgetWidget(totalExpense);

    // Update Charts
    renderCategoryDoughnutChart(categoryTotals, totalExpense);
    renderDailyTrendBarChart(dailyExpenses, daysInMonth);

    // Update Category Table & Top Expenses
    renderCategoryTable(categoryTotals, totalExpense);
    renderTopExpenses(monthlyTxs);
}

function updateBudgetWidget(totalExpense) {
    const budget = state.monthlyBudget;
    const budgetInput = document.getElementById('budget-input');
    if (budgetInput) budgetInput.value = budget;

    const percent = Math.min(100, Math.round((totalExpense / budget) * 100)) || 0;
    const statusTextEl = document.getElementById('budget-status-text');
    const fillEl = document.getElementById('budget-progress-fill');

    if (statusTextEl) {
        if (totalExpense > budget) {
            statusTextEl.innerHTML = `<strong style="color: var(--color-expense);">⚠️ 목표 예산(₩${formatKRW(budget)})을 ₩${formatKRW(totalExpense - budget)} 초과했습니다! (${percent}%)</strong>`;
        } else {
            statusTextEl.textContent = `목표 예산(₩${formatKRW(budget)}) 중 ₩${formatKRW(totalExpense)} 사용 (${percent}%)`;
        }
    }

    if (fillEl) {
        fillEl.style.width = `${percent}%`;
    }
}

// Chart 1: Category Doughnut Chart
function renderCategoryDoughnutChart(categoryTotals, totalExpense) {
    const ctx = document.getElementById('category-chart');
    if (!ctx) return;

    const labels = [];
    const data = [];
    const backgroundColors = [];

    Object.keys(categoryTotals).forEach(catId => {
        const catInfo = getCategoryInfo(catId, 'expense');
        labels.push(catInfo.name);
        data.push(categoryTotals[catId].amount);
        backgroundColors.push(catInfo.color);
    });

    if (labels.length === 0) {
        labels.push('지출 내역 없음');
        data.push(1);
        backgroundColors.push('#334155');
    }

    if (categoryChartInstance) {
        categoryChartInstance.destroy();
    }

    const isDark = state.theme === 'dark';

    categoryChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                borderWidth: 2,
                borderColor: isDark ? '#1e293b' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: isDark ? '#f8fafc' : '#0f172a',
                        font: { family: 'Noto Sans KR', size: 12 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val = context.parsed;
                            const pct = totalExpense > 0 ? ((val / totalExpense) * 100).toFixed(1) : 0;
                            return ` ${context.label}: ₩${formatKRW(val)} (${pct}%)`;
                        }
                    }
                }
            },
            cutout: '68%'
        }
    });
}

// Chart 2: Daily Trend Bar Chart
function renderDailyTrendBarChart(dailyExpenses, daysInMonth) {
    const ctx = document.getElementById('daily-trend-chart');
    if (!ctx) return;

    const labels = [];
    const data = [];

    for (let d = 1; d <= daysInMonth; d++) {
        labels.push(`${d}일`);
        data.push(dailyExpenses[d] || 0);
    }

    if (dailyTrendChartInstance) {
        dailyTrendChartInstance.destroy();
    }

    const isDark = state.theme === 'dark';

    dailyTrendChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '일별 지출 (원)',
                data: data,
                backgroundColor: 'rgba(99, 102, 241, 0.7)',
                hoverBackgroundColor: '#6366f1',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => ` 지출: ₩${formatKRW(ctx.parsed.y)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: isDark ? '#94a3b8' : '#64748b', font: { size: 10 } }
                },
                y: {
                    grid: { color: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' },
                    ticks: {
                        color: isDark ? '#94a3b8' : '#64748b',
                        callback: (val) => val >= 10000 ? `${val / 10000}만` : val
                    }
                }
            }
        }
    });
}

// Render Category Breakdown Table
function renderCategoryTable(categoryTotals, totalExpense) {
    const tbody = document.getElementById('category-table-body');
    if (!tbody) return;

    tbody.innerHTML = '';

    const sortedCats = Object.keys(categoryTotals).sort((a, b) => categoryTotals[b].amount - categoryTotals[a].amount);

    if (sortedCats.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">이달 지출 데이터가 없습니다.</td></tr>`;
        return;
    }

    sortedCats.forEach(catId => {
        const item = categoryTotals[catId];
        const catInfo = getCategoryInfo(catId, 'expense');
        const pct = totalExpense > 0 ? ((item.amount / totalExpense) * 100).toFixed(1) : 0;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <span class="cat-badge" style="background: ${catInfo.color}22; color: ${catInfo.color}">
                    <i class="fa-solid ${catInfo.icon}"></i> ${catInfo.name}
                </span>
            </td>
            <td>${item.count}건</td>
            <td><strong>₩${formatKRW(item.amount)}</strong></td>
            <td>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="flex: 1; height: 6px; background: var(--bg-input); border-radius: 3px; overflow: hidden;">
                        <div style="width: ${pct}%; height: 100%; background: ${catInfo.color};"></div>
                    </div>
                    <span style="font-size: 0.75rem; color: var(--text-muted); width: 40px;">${pct}%</span>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Render Top 5 Expenses
function renderTopExpenses(monthlyTxs) {
    const listEl = document.getElementById('top-expenses-list');
    if (!listEl) return;

    listEl.innerHTML = '';

    const expensesOnly = monthlyTxs.filter(t => t.type === 'expense');
    expensesOnly.sort((a, b) => Number(b.amount) - Number(a.amount));

    const top5 = expensesOnly.slice(0, 5);

    if (top5.length === 0) {
        listEl.innerHTML = `<li style="text-align: center; color: var(--text-muted); padding: 20px;">지출 내역이 없습니다.</li>`;
        return;
    }

    top5.forEach((tx, idx) => {
        const catInfo = getCategoryInfo(tx.category, 'expense');
        const li = document.createElement('li');
        li.className = 'top-expense-item';
        li.innerHTML = `
            <div class="top-rank">${idx + 1}</div>
            <div class="top-info">
                <div class="top-title">${tx.title}</div>
                <div class="top-date">${tx.date} · ${catInfo.name}</div>
            </div>
            <div class="top-amount">-₩${formatKRW(tx.amount)}</div>
        `;
        listEl.appendChild(li);
    });
}
