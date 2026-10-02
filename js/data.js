/* ==========================================================================
   Data & Storage Manager
   ========================================================================== */

const STORAGE_KEY = 'smart_pocket_transactions';
const BUDGET_STORAGE_KEY = 'smart_pocket_budget';
const THEME_STORAGE_KEY = 'smart_pocket_theme';

const CATEGORIES = {
    expense: [
        { id: 'food', name: '식비/카페', icon: 'fa-utensils', color: '#f59e0b' },
        { id: 'transport', name: '교통/차량', icon: 'fa-bus', color: '#3b82f6' },
        { id: 'shopping', name: '쇼핑/의류', icon: 'fa-bag-shopping', color: '#ec4899' },
        { id: 'entertainment', name: '문화/취미', icon: 'fa-gamepad', color: '#8b5cf6' },
        { id: 'education', name: '교육/도서', icon: 'fa-book', color: '#06b6d4' },
        { id: 'health', name: '의료/건강', icon: 'fa-heart-pulse', color: '#ef4444' },
        { id: 'living', name: '생활/공과금', icon: 'fa-house', color: '#10b981' },
        { id: 'misc', name: '기타 지출', icon: 'fa-ellipsis', color: '#64748b' }
    ],
    income: [
        { id: 'allowance', name: '정기 용돈', icon: 'fa-hand-holding-dollar', color: '#10b981' },
        { id: 'salary', name: '알바/급여', icon: 'fa-briefcase', color: '#3b82f6' },
        { id: 'bonus', name: '상여/포상금', icon: 'fa-gift', color: '#f59e0b' },
        { id: 'other_income', name: '기타 수입', icon: 'fa-coins', color: '#8b5cf6' }
    ]
};

// Data Model State
let state = {
    transactions: [],
    monthlyBudget: 800000,
    currentYear: 2026,
    currentMonth: 10, // 1-indexed (October)
    theme: 'dark'
};

// Helper to format currency (KRW)
function formatKRW(amount) {
    return new Intl.NumberFormat('ko-KR').format(amount);
}

// Generate Realistic Initial Data if local storage is empty
function generateInitialMockData() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    
    // Format YYYY-MM-DD
    const formatDateStr = (d) => {
        const mm = String(month).padStart(2, '0');
        const dd = String(d).padStart(2, '0');
        return `${year}-${mm}-${dd}`;
    };

    return [
        { id: 'tx_1', date: formatDateStr(1), type: 'income', category: 'allowance', title: '10월 정기 용돈', amount: 500000, memo: '부모님 송금' },
        { id: 'tx_2', date: formatDateStr(1), type: 'expense', category: 'living', title: '월세/관리비', amount: 150000, memo: '자동이체' },
        { id: 'tx_3', date: formatDateStr(2), type: 'expense', category: 'food', title: '스타벅스 강남점', amount: 6500, memo: '아메리카노' },
        { id: 'tx_4', date: formatDateStr(3), type: 'expense', category: 'transport', title: '후불교통카드 (지하철)', amount: 18500, memo: '시버스 및 지하철' },
        { id: 'tx_5', date: formatDateStr(4), type: 'expense', category: 'food', title: 'GS25 편의점', amount: 4800, memo: '도시락 및 삼각김밥' },
        { id: 'tx_6', date: formatDateStr(5), type: 'income', category: 'salary', title: '주말 카페 알바비', amount: 240000, memo: '주휴수당 포함' },
        { id: 'tx_7', date: formatDateStr(6), type: 'expense', category: 'shopping', title: '무신사 맨투맨', amount: 49000, memo: '가을 옷 구매' },
        { id: 'tx_8', date: formatDateStr(7), type: 'expense', category: 'entertainment', title: 'CGV 영화 관람', amount: 15000, memo: '팝콘 세트' },
        { id: 'tx_9', date: formatDateStr(8), type: 'expense', category: 'food', title: '동대문 엽기떡볶이', amount: 18000, memo: '친구들과 야식' },
        { id: 'tx_10', date: formatDateStr(10), type: 'expense', category: 'education', title: '교보문고 IT 서적', amount: 28000, memo: '알고리즘 교재' },
        { id: 'tx_11', date: formatDateStr(12), type: 'expense', category: 'food', title: '맥도날드 빅맥 세트', amount: 7500, memo: '점심식사' },
        { id: 'tx_12', date: formatDateStr(14), type: 'expense', category: 'health', title: '약국 종합감기약', amount: 6000, memo: '감기 기운' },
        { id: 'tx_13', date: formatDateStr(15), type: 'income', category: 'bonus', title: '중고나라 안쓰는 물품 판매', amount: 35000, memo: '키보드 중고 거래' },
        { id: 'tx_14', date: formatDateStr(16), type: 'expense', category: 'food', title: '투썸플레이스 케이크', amount: 8900, memo: '디저트' },
        { id: 'tx_15', date: formatDateStr(18), type: 'expense', category: 'shopping', title: '쿠팡 생활용품', amount: 23500, memo: '휴지, 수건' },
        { id: 'tx_16', date: formatDateStr(20), type: 'expense', category: 'entertainment', title: '닌텐도 eShop 게임', amount: 34000, memo: '할인 구매' }
    ];
}

// Load Data from LocalStorage
function loadDataFromStorage() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
        try {
            state.transactions = JSON.parse(raw);
        } catch (e) {
            console.error('Failed to parse transactions, reset to mock', e);
            state.transactions = generateInitialMockData();
        }
    } else {
        state.transactions = generateInitialMockData();
        saveTransactionsToStorage();
    }

    const savedBudget = localStorage.getItem(BUDGET_STORAGE_KEY);
    if (savedBudget) {
        state.monthlyBudget = parseInt(savedBudget, 10) || 800000;
    }

    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme) {
        state.theme = savedTheme;
    }

    const today = new Date();
    state.currentYear = today.getFullYear();
    state.currentMonth = today.getMonth() + 1;
}

// Save to LocalStorage
function saveTransactionsToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.transactions));
}

function saveBudgetToStorage(budget) {
    state.monthlyBudget = budget;
    localStorage.setItem(BUDGET_STORAGE_KEY, budget.toString());
}

function saveThemeToStorage(theme) {
    state.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
}

// Helper CRUD operations
function addTransaction(tx) {
    if (!tx.id) tx.id = 'tx_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    state.transactions.push(tx);
    saveTransactionsToStorage();
    return tx;
}

function updateTransaction(txId, updatedFields) {
    const idx = state.transactions.findIndex(t => t.id === txId);
    if (idx !== -1) {
        state.transactions[idx] = { ...state.transactions[idx], ...updatedFields };
        saveTransactionsToStorage();
    }
}

function deleteTransaction(txId) {
    state.transactions = state.transactions.filter(t => t.id !== txId);
    saveTransactionsToStorage();
}

function deleteMultipleTransactions(txIds) {
    if (!Array.isArray(txIds) || txIds.length === 0) return;
    const idSet = new Set(txIds);
    state.transactions = state.transactions.filter(t => !idSet.has(t.id));
    saveTransactionsToStorage();
}

function getCategoryInfo(categoryId, type = 'expense') {
    const list = CATEGORIES[type] || CATEGORIES.expense;
    let found = list.find(c => c.id === categoryId);
    if (!found) {
        // Search in all types
        found = [...CATEGORIES.expense, ...CATEGORIES.income].find(c => c.id === categoryId);
    }
    return found || { id: 'misc', name: '기타', icon: 'fa-ellipsis', color: '#64748b' };
}
