// --- DỮ LIỆU MẶC ĐỊNH VÀ STATE ---
const CATEGORIES = {
    expense: ['Ăn uống', 'Di chuyển', 'Mua sắm', 'Hóa đơn', 'Giải trí', 'Khác'],
    income: ['Lương', 'Đầu tư', 'Tiết kiệm', 'Khác']
};
const ICONS = {
    'Ăn uống': 'fa-utensils', 'Di chuyển': 'fa-car', 'Mua sắm': 'fa-shopping-bag', 'Hóa đơn': 'fa-file-invoice-dollar', 'Giải trí': 'fa-film', 'Khác': 'fa-ellipsis-h', 'Lương': 'fa-money-bill-wave', 'Đầu tư': 'fa-chart-line', 'Tiết kiệm': 'fa-piggy-bank'
};

let data = {
    transactions: [],
    budgets: {},
    settings: { darkMode: false }
};

let pieChartInst = null;
let barChartInst = null;

// --- KHỞI TẠO ỨNG DỤNG ---
function init() {
    loadData();
    setupNavigation();
    setupForm();
    setupSettings();
    document.getElementById('date').valueAsDate = new Date();
    document.getElementById('report-month').value = new Date().toISOString().slice(0, 7);
    
    document.getElementById('report-month').addEventListener('change', renderReports);

    applyTheme();
    updateUI();
}

// --- QUẢN LÝ DỮ LIỆU (LOCALSTORAGE) ---
function loadData() {
    const saved = localStorage.getItem('chauMoneyData');
    if (saved) {
        data = JSON.parse(saved);
        // Đảm bảo budgets tồn tại
        if(!data.budgets) data.budgets = {};
    }
}
function saveData() {
    localStorage.setItem('chauMoneyData', JSON.stringify(data));
    updateUI();
}

// --- ĐIỀU HƯỚNG TAB (NAV) ---
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabs = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            tabs.forEach(t => t.classList.remove('active'));
            
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            if (targetId === 'tab-report') renderReports();
            if (targetId === 'tab-budget') renderBudgetSetup();
        });
    });
}

// --- XỬ LÝ FORM GIAO DỊCH ---
function setupForm() {
    const typeRadios = document.querySelectorAll('input[name="type"]');
    const categorySelect = document.getElementById('category');

    function populateCategories(type) {
        categorySelect.innerHTML = CATEGORIES[type].map(c => `<option value="${c}">${c}</option>`).join('');
    }
    
    // Khởi tạo select box
    populateCategories('expense');

    typeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => populateCategories(e.target.value));
    });

    document.getElementById('transaction-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const type = document.querySelector('input[name="type"]:checked').value;
        const amount = Number(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;
        const note = document.getElementById('note').value;

        const transaction = {
            id: Date.now(), type, amount, category, date, note
        };

        data.transactions.push(transaction);
        
        // Cảnh báo vượt ngân sách
        if(type === 'expense' && data.budgets[category] > 0) {
            const currentMonthStr = date.slice(0,7);
            const totalSpentCategory = data.transactions
                .filter(t => t.type === 'expense' && t.category === category && t.date.startsWith(currentMonthStr))
                .reduce((sum, t) => sum + t.amount, 0);
            
            if(totalSpentCategory > data.budgets[category]) {
                alert(`⚠️ CẢNH BÁO: Bạn đã chi tiêu vượt ngân sách danh mục "${category}" trong tháng này!`);
            }
        }

        saveData();
        e.target.reset();
        document.getElementById('date').valueAsDate = new Date();
        document.querySelector('.nav-item[data-target="tab-dashboard"]').click();
        alert('Đã lưu giao dịch!');
    });
}

// --- ĐỊNH DẠNG TIỀN TỆ ---
const formatVND = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);

// --- CẬP NHẬT GIAO DIỆN (UI) ---
function updateUI() {
    renderDashboard();
    renderRecentTransactions();
}

function renderDashboard() {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    let totalIncome = 0;
    let totalExpense = 0;

    data.transactions.forEach(t => {
        if (t.date.startsWith(currentMonth)) {
            if (t.type === 'income') totalIncome += t.amount;
            else totalExpense += t.amount;
        }
    });

    const balance = totalIncome - totalExpense;

    document.getElementById('total-balance').textContent = formatVND(balance);
    document.getElementById('total-income').textContent = formatVND(totalIncome);
    document.getElementById('total-expense').textContent = formatVND(totalExpense);

    // Tính tổng ngân sách
    let totalBudget = 0;
    Object.values(data.budgets).forEach(b => totalBudget += b);
    
    const budgetBar = document.getElementById('main-budget-progress');
    document.getElementById('budget-used').textContent = formatVND(totalExpense);
    document.getElementById('budget-total').textContent = formatVND(totalBudget);

    if (totalBudget > 0) {
        let percent = (totalExpense / totalBudget) * 100;
        if(percent > 100) percent = 100;
        budgetBar.style.width = percent + '%';
        budgetBar.className = 'progress-bar'; // reset class
        if (percent > 90) budgetBar.classList.add('danger');
        else if (percent > 70) budgetBar.classList.add('warning');
    } else {
        budgetBar.style.width = '0%';
    }
}

function renderRecentTransactions() {
    const list = document.getElementById('recent-list');
    list.innerHTML = '';
    
    // Lấy 5 giao dịch mới nhất
    const recent = [...data.transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    if (recent.length === 0) {
        list.innerHTML = '<li><p class="text-muted">Chưa có giao dịch nào.</p></li>';
        return;
    }

    recent.forEach(t => {
        const icon = ICONS[t.category] || 'fa-ellipsis-h';
        const sign = t.type === 'income' ? '+' : '-';
        const colorClass = t.type === 'income' ? 'text-success' : 'text-danger';

        list.innerHTML += `
            <li>
                <div class="t-info">
                    <div class="t-icon"><i class="fas ${icon}"></i></div>
                    <div class="t-details">
                        <h4>${t.category}</h4>
                        <p>${t.date} ${t.note ? '- ' + t.note : ''}</p>
                    </div>
                </div>
                <div class="t-amount ${colorClass}">${sign}${formatVND(t.amount)}</div>
            </li>
        `;
    });
}

// --- NGÂN SÁCH ---
function renderBudgetSetup() {
    const list = document.getElementById('budget-list');
    list.innerHTML = '';
    CATEGORIES.expense.forEach(cat => {
        const val = data.budgets[cat] || 0;
        list.innerHTML += `
            <div class="form-group">
                <label>${cat} (VNĐ)</label>
                <input type="number" class="budget-input" data-cat="${cat}" value="${val > 0 ? val : ''}" placeholder="Không giới hạn">
            </div>
        `;
    });

    document.getElementById('save-budget-btn').onclick = () => {
        document.querySelectorAll('.budget-input').forEach(input => {
            const cat = input.getAttribute('data-cat');
            const val = Number(input.value);
            if(val > 0) data.budgets[cat] = val;
            else delete data.budgets[cat];
        });
        saveData();
        alert('Đã lưu cài đặt ngân sách!');
    };
}

// --- BÁO CÁO & CHART.JS ---
function renderReports() {
    const month = document.getElementById('report-month').value;
    const filteredTx = data.transactions.filter(t => t.date.startsWith(month));
    
    // Dữ liệu Chart Tròn (Chỉ tính chi tiêu)
    const expenseData = {};
    filteredTx.forEach(t => {
        if (t.type === 'expense') {
            expenseData[t.category] = (expenseData[t.category] || 0) + t.amount;
        }
    });

    // Dữ liệu Chart Cột (Chi tiêu theo ngày)
    const dailyData = {};
    filteredTx.forEach(t => {
        if(t.type === 'expense') {
            const day = t.date.split('-')[2];
            dailyData[day] = (dailyData[day] || 0) + t.amount;
        }
    });

    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f4f4f4' : '#333';

    // Vẽ Biểu đồ tròn
    const ctxPie = document.getElementById('pieChart').getContext('2d');
    if (pieChartInst) pieChartInst.destroy();
    pieChartInst = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: Object.keys(expenseData),
            datasets: [{
                data: Object.values(expenseData),
                backgroundColor: ['#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f40'],
                borderWidth: 0
            }]
        },
        options: { plugins: { legend: { labels: { color: textColor } } } }
    });

    // Vẽ Biểu đồ cột
    const ctxBar = document.getElementById('barChart').getContext('2d');
    if (barChartInst) barChartInst.destroy();
    
    // Tạo mảng ngày (1-31)
    const days = Object.keys(dailyData).sort((a,b) => a-b);
    const amounts = days.map(d => dailyData[d]);

    barChartInst = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: days.map(d => 'Ngày ' + d),
            datasets: [{
                label: 'Chi tiêu',
                data: amounts,
                backgroundColor: '#4361ee',
                borderRadius: 5
            }]
        },
        options: {
            scales: {
                y: { ticks: { color: textColor } },
                x: { ticks: { color: textColor } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// --- CÀI ĐẶT & DARK MODE ---
function setupSettings() {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const settingThemeToggle = document.getElementById('setting-theme-toggle');
    const resetBtn = document.getElementById('reset-data-btn');

    themeToggleBtn.addEventListener('click', toggleTheme);
    settingThemeToggle.addEventListener('change', toggleTheme);

    resetBtn.addEventListener('click', () => {
        if(confirm('Bạn có chắc chắn muốn xóa TOÀN BỘ dữ liệu không? Thao tác này không thể hoàn tác.')) {
            localStorage.removeItem('chauMoneyData');
            location.reload();
        }
    });
}

function toggleTheme() {
    data.settings.darkMode = !data.settings.darkMode;
    applyTheme();
    saveData();
    // Re-render chart text colors if in report tab
    if(document.getElementById('tab-report').classList.contains('active')) {
        renderReports();
    }
}

function applyTheme() {
    const isDark = data.settings.darkMode;
    if (isDark) {
        document.body.setAttribute('data-theme', 'dark');
        document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-sun"></i>';
        document.getElementById('setting-theme-toggle').checked = true;
    } else {
        document.body.removeAttribute('data-theme');
        document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-moon"></i>';
        document.getElementById('setting-theme-toggle').checked = false;
    }
}

// Chạy ứng dụng
init();
