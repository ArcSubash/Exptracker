import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail, updateProfile } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_DOMAIN.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET.firebasestorage.app",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Data Storage
let expenses = [];
let savings = [];
let budget = { salary: 0, monthly: 0, categories: { Food: 0, Travel: 0, Rent: 0, Utilities: 0, Entertainment: 0, Other: 0 } };
let currentUser = null;

// DOM Elements
const loginSection = document.getElementById('login-section');
const appSection = document.getElementById('app-section');
const profileContainer = document.getElementById('profile-container');
const profileName = document.getElementById('profile-name');
const loginForm = document.getElementById('login-form');
const nameGroup = document.getElementById('name-group');
const loginName = document.getElementById('login-name');
const googleLoginBtn = document.getElementById('google-login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginError = document.getElementById('login-error');
const verificationSection = document.getElementById('verification-section');
const verificationEmailDisplay = document.getElementById('verification-email-display');
const verificationLoginBtn = document.getElementById('verification-login-btn');

// Forgot Password UI
const forgotPasswordLink = document.getElementById('forgot-password-link');
const forgotPasswordModal = document.getElementById('forgot-password-modal');
const closeForgotModal = document.getElementById('close-forgot-modal');
const forgotPasswordForm = document.getElementById('forgot-password-form');
const resetMsg = document.getElementById('reset-msg');
const resetError = document.getElementById('reset-error');

// Logout Modal UI
const logoutConfirmModal = document.getElementById('logout-confirm-modal');
const confirmLogoutBtn = document.getElementById('confirm-logout-btn');
const cancelLogoutBtn = document.getElementById('cancel-logout-btn');

// Social Menu UI
const socialMenuContainer = document.getElementById('social-menu');
const socialMenuToggle = document.getElementById('social-menu-toggle');

// Profile Icon Logic
if (profileContainer) {
    profileContainer.addEventListener('click', (e) => {
        if (e.target.closest('#logout-btn')) return;
        profileContainer.classList.toggle('open');
    });
}

const tabBtns = document.querySelectorAll('.tab-btn');
const views = document.querySelectorAll('.view');

const dashTotalExpenses = document.getElementById('dash-total-expenses');
const dashTotalSavings = document.getElementById('dash-total-savings');
const getAiAdviceBtn = document.getElementById('get-ai-advice-btn');
const aiRecommendationContent = document.getElementById('ai-recommendation-content');

const expenseForm = document.getElementById('expense-form');
const expenseList = document.getElementById('expense-list');

const savingsForm = document.getElementById('savings-form');
const savingsList = document.getElementById('savings-list');

const modal = document.getElementById('add-funds-modal');
const closeModalBtn = document.querySelector('.close-modal');
const addFundsForm = document.getElementById('add-funds-form');
const modalGoalName = document.getElementById('modal-goal-name');
const modalGoalId = document.getElementById('modal-goal-id');

const budgetForm = document.getElementById('budget-form');
const resetBudgetBtn = document.getElementById('reset-budget-btn');

// Calendar UI Elements
const currentMonthDisplay = document.getElementById('current-month-display');
const prevMonthBtn = document.getElementById('prev-month-btn');
const nextMonthBtn = document.getElementById('next-month-btn');
const heatmapCalendar = document.getElementById('heatmap-calendar');
const dailyExpensesCard = document.getElementById('daily-expenses-card');
const selectedDateDisplay = document.getElementById('selected-date-display');
const dailyTotalDisplay = document.getElementById('daily-total-display');
const dailyExpenseList = document.getElementById('daily-expense-list');

let calendarCurrentDate = new Date();
let selectedDateString = null;

// Setup default date for expense form
document.getElementById('exp-date').valueAsDate = new Date();

// Navigation Logic
tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetView = btn.getAttribute('data-tab');

        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        views.forEach(v => {
            v.classList.remove('active');
            if (v.id === targetView) {
                v.classList.add('active');
                // Re-init lucide icons for newly visible elements
                lucide.createIcons();
                if (targetView === 'budget') {
                    renderBudgetChart();
                }
                if (targetView === 'calendar') {
                    renderCalendar();
                }
            }
        });
    });
});

// Format Currency
const formatCurrency = (amount) => {
    return '$' + parseFloat(amount).toFixed(2);
};

// Update Dashboard Totals
const updateDashboard = () => {
    const totalExp = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
    const totalSav = savings.reduce((sum, sav) => sum + parseFloat(sav.current), 0);

    dashTotalExpenses.innerText = formatCurrency(totalExp);
    dashTotalSavings.innerText = formatCurrency(totalSav);
};

// Expense Management
const renderExpenses = () => {
    expenseList.innerHTML = '';

    if (expenses.length === 0) {
        expenseList.innerHTML = '<li style="text-align:center; color: var(--text-muted); padding: 20px;">No expenses recorded yet.</li>';
        return;
    }

    expenses.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(exp => {
        const li = document.createElement('li');
        li.className = 'list-item';
        li.innerHTML = `
            <div class="item-info">
                <span class="item-title">${exp.desc} <span style="font-size: 0.8em; color: var(--neon-blue); padding-left: 5px;">[${exp.category || 'Other'}]</span></span>
                <span class="item-date">${exp.date}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 15px;">
                <span class="item-amount expense">-${formatCurrency(exp.amount)}</span>
                <button class="delete-btn" onclick="deleteExpense('${exp.id}')">
                    <i data-lucide="trash-2" width="18" height="18"></i>
                </button>
            </div>
        `;
        expenseList.appendChild(li);
    });
    lucide.createIcons();
};

// Smart Auto-Categorization
const expDescInput = document.getElementById('exp-desc');
const expCategorySelect = document.getElementById('exp-category');

const categoryKeywords = {
    'Food': ['swiggy', 'zomato', 'food', 'restaurant', 'pizza', 'burger', 'cafe', 'coffee', 'mcdonalds', 'kfc', 'starbucks', 'grocery', 'blinkit', 'zepto'],
    'Travel': ['uber', 'ola', 'rapido', 'train', 'flight', 'bus', 'ticket', 'petrol', 'gas', 'fuel', 'metro', 'auto', 'cab'],
    'Rent': ['rent', 'house', 'pg', 'hostel', 'maintenance', 'deposit'],
    'Utilities': ['electricity', 'water', 'internet', 'wifi', 'broadband', 'recharge', 'jio', 'airtel', 'phone', 'bill', 'bescom'],
    'Entertainment': ['netflix', 'prime', 'spotify', 'movie', 'cinema', 'hotstar', 'game', 'steam', 'pvr', 'inox', 'youtube'],
    'Other': ['gym', 'fitness', 'workout', 'shopping', 'clothes', 'shoes', 'amazon', 'flipkart', 'myntra', 'zara']
};

expDescInput.addEventListener('input', (e) => {
    const desc = e.target.value.toLowerCase();
    let matchedCategory = null;

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => desc.includes(keyword))) {
            matchedCategory = category;
            break;
        }
    }

    if (matchedCategory) {
        expCategorySelect.value = matchedCategory;
        expCategorySelect.style.borderColor = 'var(--neon-blue)';
        expCategorySelect.style.boxShadow = '0 0 8px rgba(0, 255, 255, 0.4)';
        setTimeout(() => {
            expCategorySelect.style.borderColor = 'var(--glass-border)';
            expCategorySelect.style.boxShadow = 'none';
        }, 1500);
    }
});

expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const desc = document.getElementById('exp-desc').value;
    const amount = document.getElementById('exp-amount').value;
    const category = document.getElementById('exp-category').value;
    const date = document.getElementById('exp-date').value;

    const newExpense = {
        id: Date.now().toString(),
        desc,
        amount,
        category,
        date
    };

    expenses.push(newExpense);
    saveData();
    expenseForm.reset();
    document.getElementById('exp-date').valueAsDate = new Date();
    updateUI();
});

window.deleteExpense = (id) => {
    expenses = expenses.filter(exp => exp.id !== id);
    saveData();
    updateUI();
};

// Savings Management
const renderSavings = () => {
    savingsList.innerHTML = '';

    if (savings.length === 0) {
        savingsList.innerHTML = '<li style="text-align:center; color: var(--text-muted); padding: 20px;">No savings goals yet.</li>';
        return;
    }

    savings.forEach(sav => {
        const current = parseFloat(sav.current);
        const target = parseFloat(sav.target);
        const progress = Math.min((current / target) * 100, 100);

        const li = document.createElement('li');
        li.className = 'list-item';
        li.style.flexDirection = 'column';
        li.style.alignItems = 'stretch';

        li.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <span class="item-title">${sav.name}</span>
                <div class="goal-actions">
                    <button class="add-fund-btn" onclick="openFundModal('${sav.id}', '${sav.name}')">+ Funds</button>
                    <button class="delete-btn" onclick="deleteGoal('${sav.id}')">
                        <i data-lucide="trash-2" width="18" height="18"></i>
                    </button>
                </div>
            </div>
            <div class="goal-progress-container">
                <div class="progress-header">
                    <span>${formatCurrency(current)} / ${formatCurrency(target)}</span>
                    <span style="color:var(--neon-blue); font-weight:600;">${progress.toFixed(1)}%</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${progress}%"></div>
                </div>
            </div>
        `;
        savingsList.appendChild(li);
    });
    lucide.createIcons();
};

savingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('sav-name').value;
    const target = document.getElementById('sav-target').value;

    const newGoal = {
        id: Date.now().toString(),
        name,
        target,
        current: 0
    };

    savings.push(newGoal);
    saveData();
    savingsForm.reset();
    updateUI();
});

window.deleteGoal = (id) => {
    savings = savings.filter(sav => sav.id !== id);
    saveData();
    updateUI();
};

// Modal Logic
window.openFundModal = (id, name) => {
    modalGoalId.value = id;
    modalGoalName.innerText = name;
    modal.classList.remove('hidden');
    document.getElementById('fund-amount').focus();
};

closeModalBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.add('hidden');
    }
});

addFundsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = modalGoalId.value;
    const amountToAdd = parseFloat(document.getElementById('fund-amount').value);

    if (amountToAdd <= 0) return;

    savings = savings.map(sav => {
        if (sav.id === id) {
            return { ...sav, current: parseFloat(sav.current) + amountToAdd };
        }
        return sav;
    });

    saveData();
    addFundsForm.reset();
    modal.classList.add('hidden');
    updateUI();
});

// Budget Management
budgetForm.addEventListener('submit', (e) => {
    e.preventDefault();
    budget.salary = parseFloat(document.getElementById('budget-salary').value) || 0;
    budget.monthly = parseFloat(document.getElementById('budget-monthly').value) || 0;
    budget.categories.Food = parseFloat(document.getElementById('budget-food').value) || 0;
    budget.categories.Travel = parseFloat(document.getElementById('budget-travel').value) || 0;
    budget.categories.Rent = parseFloat(document.getElementById('budget-rent').value) || 0;
    budget.categories.Utilities = parseFloat(document.getElementById('budget-utilities').value) || 0;
    budget.categories.Entertainment = parseFloat(document.getElementById('budget-entertainment').value) || 0;
    budget.categories.Other = parseFloat(document.getElementById('budget-other').value) || 0;
    saveData();
    updateUI();
});

if (resetBudgetBtn) {
    resetBudgetBtn.addEventListener('click', () => {
        budget = { salary: 0, monthly: 0, categories: { Food: 0, Travel: 0, Rent: 0, Utilities: 0, Entertainment: 0, Other: 0 } };
        saveData();
        updateUI();
    });
}

const renderBudgetForm = () => {
    document.getElementById('budget-salary').value = budget.salary || '';
    document.getElementById('budget-monthly').value = budget.monthly || '';
    document.getElementById('budget-food').value = budget.categories.Food || '';
    document.getElementById('budget-travel').value = budget.categories.Travel || '';
    document.getElementById('budget-rent').value = budget.categories.Rent || '';
    document.getElementById('budget-utilities').value = budget.categories.Utilities || '';
    document.getElementById('budget-entertainment').value = budget.categories.Entertainment || '';
    document.getElementById('budget-other').value = budget.categories.Other || '';
};

let budgetChartInstance = null;
const renderBudgetChart = () => {
    const ctx = document.getElementById('budgetChart');
    if (!ctx) return;

    // Group expenses by category for current month
    const currentMonthExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        const now = new Date();
        return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    });

    let actuals = { Food: 0, Travel: 0, Rent: 0, Utilities: 0, Entertainment: 0, Other: 0 };
    currentMonthExpenses.forEach(exp => {
        if (actuals[exp.category] !== undefined) {
            actuals[exp.category] += parseFloat(exp.amount);
        } else {
            actuals.Other += parseFloat(exp.amount);
        }
    });

    const labels = ['Overall', 'Food', 'Travel', 'Rent', 'Utilities', 'Entertainment', 'Other'];
    const totalActual = Object.values(actuals).reduce((a, b) => a + b, 0);
    const budgetData = [budget.monthly || 0, budget.categories.Food || 0, budget.categories.Travel || 0, budget.categories.Rent || 0, budget.categories.Utilities || 0, budget.categories.Entertainment || 0, budget.categories.Other || 0];
    const actualData = [totalActual, actuals.Food, actuals.Travel, actuals.Rent, actuals.Utilities, actuals.Entertainment, actuals.Other];

    const budgetBgColors = ['rgba(0, 255, 100, 0.2)', 'rgba(176, 38, 255, 0.5)', 'rgba(176, 38, 255, 0.5)', 'rgba(176, 38, 255, 0.5)', 'rgba(176, 38, 255, 0.5)', 'rgba(176, 38, 255, 0.5)', 'rgba(176, 38, 255, 0.5)'];
    const budgetBorderColors = ['#00ff64', '#b026ff', '#b026ff', '#b026ff', '#b026ff', '#b026ff', '#b026ff'];

    const actualBgColors = ['rgba(0, 255, 100, 0.8)', 'rgba(0, 255, 255, 0.5)', 'rgba(0, 255, 255, 0.5)', 'rgba(0, 255, 255, 0.5)', 'rgba(0, 255, 255, 0.5)', 'rgba(0, 255, 255, 0.5)', 'rgba(0, 255, 255, 0.5)'];
    const actualBorderColors = ['#00ff64', '#00ffff', '#00ffff', '#00ffff', '#00ffff', '#00ffff', '#00ffff'];

    if (budgetChartInstance) {
        budgetChartInstance.destroy();
    }

    budgetChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Budget Limit',
                    data: budgetData,
                    backgroundColor: budgetBgColors,
                    borderColor: budgetBorderColors,
                    borderWidth: 1
                },
                {
                    label: 'Actual Spent',
                    data: actualData,
                    backgroundColor: actualBgColors,
                    borderColor: actualBorderColors,
                    borderWidth: 1
                }
            ]
        },
        options: {
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#fff' } },
                x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#fff' } }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#fff',
                        generateLabels: function (chart) {
                            const original = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                            original.forEach((label, i) => {
                                if (i === 0) {
                                    label.fillStyle = 'rgba(176, 38, 255, 0.5)';
                                    label.strokeStyle = '#b026ff';
                                } else if (i === 1) {
                                    label.fillStyle = 'rgba(0, 255, 255, 0.5)';
                                    label.strokeStyle = '#00ffff';
                                }
                            });
                            return original;
                        }
                    }
                }
            }
        }
    });
};

const updateBudgetWarnings = () => {
    const warningsContainer = document.getElementById('budget-warnings-container');
    if (!warningsContainer) return;

    const currentMonthExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        const now = new Date();
        return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    });

    let actuals = { Food: 0, Travel: 0, Rent: 0, Utilities: 0, Entertainment: 0, Other: 0 };
    let totalActual = 0;
    currentMonthExpenses.forEach(exp => {
        const amt = parseFloat(exp.amount);
        totalActual += amt;
        if (actuals[exp.category] !== undefined) {
            actuals[exp.category] += amt;
        } else {
            actuals.Other += amt;
        }
    });

    let warningsHTML = '';

    const checkWarning = (actual, limit, name) => {
        if (limit > 0 && actual >= limit * 0.8) {
            const percent = Math.min(((actual / limit) * 100).toFixed(1), 100);
            const overColor = actual > limit ? '#ff4444' : '#ffaa00';
            warningsHTML += `<div style="background: rgba(255,0,0,0.1); border-left: 4px solid ${overColor}; padding: 15px; border-radius: 8px;">
                 <strong style="color: ${overColor};">Warning:</strong> 
                 Your ${name} expenses ($${actual.toFixed(2)}) have reached <span style="color:${overColor}; font-weight:bold;">${percent}%</span> of your budget ($${limit.toFixed(2)}).
             </div>`;
        }
    };

    checkWarning(totalActual, budget.monthly, "Overall Monthly");
    Object.keys(actuals).forEach(cat => {
        checkWarning(actuals[cat], budget.categories[cat] || 0, cat);
    });

    warningsContainer.innerHTML = warningsHTML;
};

// --- Calendar Management ---
const renderCalendar = () => {
    const year = calendarCurrentDate.getFullYear();
    const month = calendarCurrentDate.getMonth(); // 0-11

    // Set Header
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    if (currentMonthDisplay) {
        currentMonthDisplay.innerText = `${monthNames[month]} ${year}`;
    }

    if (!heatmapCalendar) return;

    heatmapCalendar.innerHTML = '';

    // Day labels
    const daysArr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    daysArr.forEach(d => {
        const span = document.createElement('div');
        span.className = 'heatmap-day-label';
        span.innerText = d;
        heatmapCalendar.appendChild(span);
    });

    const firstDay = new Date(year, month, 1).getDay(); // 0-day of week
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Group expenses by date (YYYY-MM-DD) for this month
    const expenseByDate = {};
    expenses.forEach(exp => {
        const expDate = new Date(exp.date);
        const dateStr = exp.date;
        if (!expenseByDate[dateStr]) {
            expenseByDate[dateStr] = 0;
        }
        expenseByDate[dateStr] += parseFloat(exp.amount);
    });

    // Find max expense for the month to define scale
    const dailyTotals = [];
    for (let i = 1; i <= daysInMonth; i++) {
        const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        if (expenseByDate[dStr]) dailyTotals.push(expenseByDate[dStr]);
    }
    const maxDayTotal = dailyTotals.length > 0 ? Math.max(...dailyTotals) : 0;

    // Fill empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell empty';
        heatmapCalendar.appendChild(cell);
    }

    const todayDate = new Date();
    const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

    // Fill days
    for (let i = 1; i <= daysInMonth; i++) {
        const cell = document.createElement('div');
        cell.className = 'heatmap-cell';

        const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;

        // Heatmap level
        const amount = expenseByDate[dStr] || 0;
        if (amount > 0) {
            let level = 1;
            if (maxDayTotal > 0) {
                const ratio = amount / maxDayTotal;
                if (ratio > 0.75) level = 4;
                else if (ratio > 0.5) level = 3;
                else if (ratio > 0.25) level = 2;
                else level = 1;
            }
            cell.classList.add(`level-${level}`);
        }

        if (dStr === todayStr) {
            cell.classList.add('today');
        }

        if (dStr === selectedDateString) {
            cell.classList.add('selected');
        }

        cell.innerText = i;
        cell.title = `$${amount.toFixed(2)} spent`;

        cell.addEventListener('click', () => {
            selectedDateString = dStr;
            renderCalendar(); // Re-render to show selected outline
            showDailyExpenses(dStr);
        });

        heatmapCalendar.appendChild(cell);
    }
};

const showDailyExpenses = (dateStr) => {
    if (!dailyExpensesCard) return;
    dailyExpensesCard.style.display = 'block';
    selectedDateDisplay.innerText = dateStr;

    const dayExpenses = expenses.filter(exp => exp.date === dateStr);
    dailyExpenseList.innerHTML = '';

    let dailyTotal = 0;

    if (dayExpenses.length === 0) {
        dailyExpenseList.innerHTML = '<li style="text-align:center; color: var(--text-muted); padding: 20px;">No expenses on this day.</li>';
    } else {
        dayExpenses.forEach(exp => {
            dailyTotal += parseFloat(exp.amount);
            const li = document.createElement('li');
            li.className = 'list-item';
            li.innerHTML = `
                <div class="item-info">
                    <span class="item-title">${exp.desc} <span style="font-size: 0.8em; color: var(--neon-blue); padding-left: 5px;">[${exp.category || 'Other'}]</span></span>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span class="item-amount expense">-${formatCurrency(exp.amount)}</span>
                </div>
            `;
            dailyExpenseList.appendChild(li);
        });
    }

    dailyTotalDisplay.innerText = `Total: ${formatCurrency(dailyTotal)}`;
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

if (prevMonthBtn) {
    prevMonthBtn.addEventListener('click', () => {
        calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() - 1);
        renderCalendar();
    });
}

if (nextMonthBtn) {
    nextMonthBtn.addEventListener('click', () => {
        calendarCurrentDate.setMonth(calendarCurrentDate.getMonth() + 1);
        renderCalendar();
    });
}

// AI Recommendation Logic
getAiAdviceBtn.addEventListener('click', () => {
    aiRecommendationContent.innerHTML = '<span style="color: var(--text-main); display: flex; align-items: center; gap: 10px;">Analyzing financial data... <i data-lucide="loader" class="spin icon-purple"></i></span>';
    lucide.createIcons();

    setTimeout(() => {
        const totalExp = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
        const totalTarget = savings.reduce((sum, sav) => sum + parseFloat(sav.target), 0);
        const totalSaved = savings.reduce((sum, sav) => sum + parseFloat(sav.current), 0);

        if (savings.length === 0 && expenses.length === 0) {
            aiRecommendationContent.innerHTML = "You haven't logged any data yet. Add some expenses and savings goals so I can give you personalized advice!";
            return;
        }

        let recommendations = "<ul class='ai-points' style='display: flex; flex-direction: column; gap: 12px; margin-top: 10px;'>";

        // Savings Specific Insights
        if (savings.length > 0) {
            const completedGoals = savings.filter(s => parseFloat(s.current) >= parseFloat(s.target));
            const activeGoals = savings.filter(s => parseFloat(s.current) < parseFloat(s.target));

            if (completedGoals.length > 0) {
                recommendations += `<li><strong style="color:var(--neon-blue);">Achievement Unlocked:</strong> You've successfully completed ${completedGoals.length} goal(s) including '${completedGoals[0].name}'! Great job staying disciplined.</li>`;
            }

            if (activeGoals.length > 0) {
                // Find the closest goal to completion
                activeGoals.sort((a, b) => (parseFloat(b.current) / parseFloat(b.target)) - (parseFloat(a.current) / parseFloat(a.target)));
                const closest = activeGoals[0];
                const closestProgress = ((parseFloat(closest.current) / parseFloat(closest.target)) * 100).toFixed(1);
                const closestRemaining = (parseFloat(closest.target) - parseFloat(closest.current)).toFixed(2);

                recommendations += `<li><strong style="color:var(--neon-blue);">Focus Area:</strong> Your '${closest.name}' goal is <span style="color:var(--neon-pink);">${closestProgress}%</span> complete. You only need <span style="color:var(--neon-pink);">$${closestRemaining}</span> more to reach the target of $${parseFloat(closest.target).toFixed(2)}.</li>`;

                if (activeGoals.length > 1) {
                    recommendations += `<li><strong style="color:var(--text-main);">Multiple Targets:</strong> You are actively working on ${activeGoals.length} different goals. Try focusing on the closest one first to build momentum.</li>`;
                }
            }

            if (totalTarget > 0 && totalSaved > 0) {
                const overallProgress = ((totalSaved / totalTarget) * 100).toFixed(1);
                recommendations += `<li><strong style="color:var(--neon-blue);">Overall Savings:</strong> You have saved <span style="color:var(--neon-pink);">$${totalSaved.toFixed(2)}</span> across all goals, which is ${overallProgress}% of your total structured targets.</li>`;
            }
        } else {
            recommendations += `<li><strong style="color:var(--neon-pink);">Missing Goals:</strong> You haven't set any savings goals yet. Try setting a small goal like an emergency fund of $500 to start building financial security!</li>`;
        }

        // Expense Specific Insights
        if (expenses.length > 0) {
            // Highest expense
            const highestExpense = [...expenses].sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))[0];
            recommendations += `<li><strong style="color:var(--neon-pink);">Top Spending:</strong> Your highest recorded single expense is '${highestExpense.desc}' at <span style="color:var(--neon-pink);">$${parseFloat(highestExpense.amount).toFixed(2)}</span>. Consider if there's a cheaper alternative.</li>`;

            // Categorical spending
            const coffeeExp = expenses.filter(e => e.desc.toLowerCase().match(/coffee|cafe|starbucks|dunkin/)).reduce((sum, e) => sum + parseFloat(e.amount), 0);
            const foodExp = expenses.filter(e => e.desc.toLowerCase().match(/food|restaurant|eat|dinner|lunch|pizza|burger/)).reduce((sum, e) => sum + parseFloat(e.amount), 0);
            const subExp = expenses.filter(e => e.desc.toLowerCase().match(/sub|netflix|spotify|prime|hulu|gym/)).reduce((sum, e) => sum + parseFloat(e.amount), 0);

            if (coffeeExp > 0) {
                const potentialSavings = (coffeeExp * 0.5).toFixed(2);
                recommendations += `<li><strong style="color:var(--neon-purple);">Coffee Spend:</strong> You've spent <span style="color:var(--neon-pink);">$${coffeeExp.toFixed(2)}</span> on coffee and cafes. Cutting this down by half could save you $${potentialSavings} towards your active goals.</li>`;
            }
            if (foodExp > 0) {
                recommendations += `<li><strong style="color:var(--neon-purple);">Dining Out:</strong> You have <span style="color:var(--neon-pink);">$${foodExp.toFixed(2)}</span> in eating out expenses. Meal prepping for just a few days could help you redirect a significant amount to your savings.</li>`;
            }
            if (subExp > 0) {
                recommendations += `<li><strong style="color:var(--neon-purple);">Subscriptions:</strong> You've recorded <span style="color:var(--neon-pink);">$${subExp.toFixed(2)}</span> in subscription-like expenses. Take a moment to cancel any services you haven't actively used in the last 30 days.</li>`;
            }

            // Recurring Expense Detection
            const descCounts = {};
            expenses.forEach(exp => {
                const d = exp.desc.toLowerCase().trim();
                // Ignore very short/generic descriptions
                if (d.length > 2) {
                    if (!descCounts[d]) descCounts[d] = { count: 0, amounts: [] };
                    descCounts[d].count += 1;
                    descCounts[d].amounts.push(parseFloat(exp.amount));
                }
            });

            // Sort by count descending
            const recurringItems = Object.entries(descCounts)
                .filter(([_, data]) => data.count >= 2)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 2); // Limit to top 2 to avoid spamming the user

            recurringItems.forEach(([desc, data]) => {
                const avgAmount = (data.amounts.reduce((a, b) => a + b, 0) / data.count).toFixed(2);
                recommendations += `<li><strong style="color:var(--neon-green);">Recurring Match:</strong> You've paid for '${desc}' <span style="color:var(--neon-green);">${data.count} times</span> (avg $${avgAmount}). AI suggests monitoring this recurring cost closely!</li>`;
            });

            // Savings Rate
            if (budget.salary > 0) {
                const expensesThisMonth = expenses.filter(exp => {
                    const d = new Date(exp.date);
                    const now = new Date();
                    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
                }).reduce((sum, e) => sum + parseFloat(e.amount), 0);

                const remaining = budget.salary - expensesThisMonth;
                const expenseRate = ((expensesThisMonth / budget.salary) * 100).toFixed(1);

                recommendations += `<li><strong style="color:var(--neon-blue);">Salary Overview:</strong> Your expenses this month take up <span style="color:var(--neon-pink);">${expenseRate}%</span> of your monthly salary ($${budget.salary.toFixed(2)}). You have $${remaining.toFixed(2)} remaining.</li>`;

                if (remaining > 0) {
                    recommendations += `<li><strong style="color:#00ff64;">Savings Potential:</strong> You can potentially save $${remaining.toFixed(2)} this month based on your salary. Consider allocating this to your active goals!</li>`;
                } else if (remaining < 0) {
                    recommendations += `<li><strong style="color:var(--neon-pink);">Overspending Alert:</strong> You are spending more than your salary this month by <span style="color:var(--neon-pink);">$${Math.abs(remaining).toFixed(2)}</span>. Please review your expenses immediately!</li>`;
                }
            } else if (totalTarget > 0 || totalSaved > 0) {
                const totalOverall = totalExp + totalSaved;
                const savingsRate = ((totalSaved / totalOverall) * 100).toFixed(1);

                if (savingsRate < 10) {
                    recommendations += `<li><strong style="color:var(--neon-pink);">Warning:</strong> Your current savings rate is only <span style="color:var(--neon-pink);">${savingsRate}%</span>. Try to aim for at least 20% by reducing non-essential expenses.</li>`;
                } else if (savingsRate >= 20) {
                    recommendations += `<li><strong style="color:#00ff64;">Great Job!</strong> You are maintaining a healthy savings rate of <span style="color:#00ff64;">${savingsRate}%</span>. Consistency is the key to wealth!</li>`;
                } else {
                    recommendations += `<li><strong style="color:var(--neon-blue);">On Track:</strong> Your current savings rate is <span style="color:var(--neon-blue);">${savingsRate}%</span>. You're doing quite well, just keep optimizing your expenses!</li>`;
                }
            }

        } else {
            recommendations += `<li><strong style="color:var(--text-main);">No Expenses:</strong> We don't see any expenses recorded yet. Start logging your daily purchases to get a deeper insight into your spending habits.</li>`;
        }

        recommendations += "</ul>";
        aiRecommendationContent.innerHTML = recommendations;
    }, 1500);
});

// Utilities
const saveData = async () => {
    // Save to Firestore and scoped local storage if logged in
    if (currentUser) {
        // Keep local storage for offline state, scoped to the current user
        localStorage.setItem(`fin_expenses_${currentUser.uid}`, JSON.stringify(expenses));
        localStorage.setItem(`fin_savings_${currentUser.uid}`, JSON.stringify(savings));
        localStorage.setItem(`fin_budget_${currentUser.uid}`, JSON.stringify(budget));

        try {
            await setDoc(doc(db, "users", currentUser.uid), {
                expenses,
                savings,
                budget
            }, { merge: true });
        } catch (error) {
            console.error("Error saving data to Firestore: ", error);
        }
    }
};

const updateUI = () => {
    updateDashboard();
    renderExpenses();
    renderSavings();
    renderBudgetForm();
    if (document.getElementById('budget') && document.getElementById('budget').classList.contains('active')) {
        renderBudgetChart();
    }
    if (document.getElementById('calendar') && document.getElementById('calendar').classList.contains('active')) {
        renderCalendar();
    }
    updateBudgetWarnings();
};

// --- AUTHENTICATION LOGIC ---

// Listen to auth state changes
onAuthStateChanged(auth, async (user) => {
    if (user) {
        if (!user.emailVerified && user.providerData.some(p => p.providerId === 'password')) {
            loginSection.style.display = 'none';
            appSection.style.display = 'none';
            socialMenuContainer.style.display = 'none';
            verificationSection.style.display = 'flex';
            verificationEmailDisplay.innerText = user.email;
            await signOut(auth);
            return;
        }

        currentUser = user;
        if (profileName) {
            profileName.innerText = user.displayName || user.email.split('@')[0];
            if (profileContainer) profileContainer.classList.remove('open');
        }

        // Fetch data from Firestore
        try {
            const docRef = doc(db, "users", user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                expenses = data.expenses || [];
                savings = data.savings || [];
                budget = data.budget || { salary: 0, monthly: 0, categories: { Food: 0, Travel: 0, Rent: 0, Utilities: 0, Entertainment: 0, Other: 0 } };
            } else {
                // If no data exists, keep empty arrays and initialize Firestore doc
                expenses = [];
                savings = [];
                await setDoc(docRef, { expenses, savings, budget });
            }
        } catch (error) {
            console.error("Error fetching data from Firestore:", error);
            // Fallback to local storage if firestore fetch fails, scoped to user
            const localExp = localStorage.getItem(`fin_expenses_${user.uid}`);
            const localSav = localStorage.getItem(`fin_savings_${user.uid}`);
            const localBud = localStorage.getItem(`fin_budget_${user.uid}`);
            expenses = localExp ? JSON.parse(localExp) : [];
            savings = localSav ? JSON.parse(localSav) : [];
            budget = localBud ? JSON.parse(localBud) : { salary: 0, monthly: 0, categories: { Food: 0, Travel: 0, Rent: 0, Utilities: 0, Entertainment: 0, Other: 0 } };
        }

        // User is signed in
        loginSection.style.display = 'none';
        appSection.style.display = 'flex';
        socialMenuContainer.style.display = 'flex';

        updateUI();
        lucide.createIcons();
    } else {
        currentUser = null;
        expenses = [];
        savings = [];
        budget = { salary: 0, monthly: 0, categories: { Food: 0, Travel: 0, Rent: 0, Utilities: 0, Entertainment: 0, Other: 0 } };

        // ONLY change to login section if we are NOT showing the verification section
        if (verificationSection.style.display !== 'flex') {
            loginSection.style.display = 'flex';
            appSection.style.display = 'none';
            socialMenuContainer.style.display = 'none';
        }
    }
});

// Auth Mode Toggle Logic
let isSignUpMode = false;
const authTitle = document.getElementById('auth-title');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authToggleText = document.getElementById('auth-toggle-text');
const authToggleLink = document.getElementById('auth-toggle-link');

authToggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isSignUpMode = !isSignUpMode;
    if (isSignUpMode) {
        authTitle.innerText = "Create an Account";
        authSubmitBtn.innerText = "Sign Up";
        authToggleText.innerText = "Already have an account?";
        authToggleLink.innerText = "Sign In";
        forgotPasswordLink.style.display = 'none';
        nameGroup.style.display = 'block';
        loginName.required = true;
    } else {
        authTitle.innerText = "Welcome Back";
        authSubmitBtn.innerText = "Sign In";
        authToggleText.innerText = "Don't have an account?";
        authToggleLink.innerText = "Sign Up";
        forgotPasswordLink.style.display = 'block';
        nameGroup.style.display = 'none';
        loginName.required = false;
    }
});

// Email/Password Login or Sign Up
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const submitBtn = document.getElementById('auth-submit-btn');
    const originalText = submitBtn.innerText;
    submitBtn.innerText = isSignUpMode ? "Signing up..." : "Signing in...";
    submitBtn.disabled = true;

    try {
        if (isSignUpMode) {
            const name = loginName.value;
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: name });
            await sendEmailVerification(userCredential.user);
            await signOut(auth); // Sign out immediately to prevent auto-login

            loginSection.style.display = 'none';
            appSection.style.display = 'none';
            verificationSection.style.display = 'flex';
            verificationEmailDisplay.innerText = email;
            loginForm.reset();
        } else {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            if (!userCredential.user.emailVerified) {
                await signOut(auth);
                loginSection.style.display = 'none';
                appSection.style.display = 'none';
                verificationSection.style.display = 'flex';
                verificationEmailDisplay.innerText = email;
                throw new Error("unverified");
            }
            loginForm.reset();
        }
    } catch (error) {
        if (error.message !== "unverified") {
            loginError.innerText = error.message;
            loginError.style.display = 'block';
        }
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
});

// Verification Return to Login
verificationLoginBtn.addEventListener('click', () => {
    verificationSection.style.display = 'none';
    loginSection.style.display = 'flex';
    appSection.style.display = 'none';

    // Switch to login mode
    isSignUpMode = false;
    authTitle.innerText = "Welcome Back";
    authSubmitBtn.innerText = "Sign In";
    authToggleText.innerText = "Don't have an account?";
    authToggleLink.innerText = "Sign Up";
    forgotPasswordLink.style.display = 'block';
    nameGroup.style.display = 'none';
    loginName.required = false;
    loginError.style.display = 'none';
});

// --- FORGOT PASSWORD LOGIC ---

forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    forgotPasswordModal.classList.remove('hidden');
    document.getElementById('reset-email').value = document.getElementById('login-email').value; // pre-fill if possible
    resetMsg.style.display = 'none';
    resetError.style.display = 'none';
});

closeForgotModal.addEventListener('click', () => {
    forgotPasswordModal.classList.add('hidden');
});

forgotPasswordModal.addEventListener('click', (e) => {
    if (e.target === forgotPasswordModal) {
        forgotPasswordModal.classList.add('hidden');
    }
});

forgotPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    resetMsg.style.display = 'none';
    resetError.style.display = 'none';

    const email = document.getElementById('reset-email').value;
    const submitBtn = document.getElementById('reset-submit-btn');
    const originalText = submitBtn.innerText;

    submitBtn.innerText = 'Sending...';
    submitBtn.disabled = true;

    try {
        await sendPasswordResetEmail(auth, email);
        resetMsg.innerText = "Password reset email sent! Please check your inbox.";
        resetMsg.style.display = 'block';
        forgotPasswordForm.reset();
    } catch (error) {
        resetError.innerText = error.message;
        resetError.style.display = 'block';
    } finally {
        submitBtn.innerText = originalText;
        submitBtn.disabled = false;
    }
});

// Google Login
googleLoginBtn.addEventListener('click', async () => {
    loginError.style.display = 'none';
    const provider = new GoogleAuthProvider();
    const originalText = googleLoginBtn.innerHTML;
    googleLoginBtn.innerHTML = "Signing in...";
    googleLoginBtn.disabled = true;

    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        loginError.innerText = error.message;
        loginError.style.display = 'block';
    } finally {
        googleLoginBtn.innerHTML = originalText;
        googleLoginBtn.disabled = false;
    }
});

// Logout flow with Confirmation Modal
logoutBtn.addEventListener('click', () => {
    socialMenuContainer.classList.remove('open');
    logoutConfirmModal.classList.remove('hidden');
});

cancelLogoutBtn.addEventListener('click', () => {
    logoutConfirmModal.classList.add('hidden');
});

confirmLogoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        logoutConfirmModal.classList.add('hidden');
    } catch (error) {
        console.error("Error signing out: ", error);
    }
});

// Social Menu Toggle
socialMenuToggle.addEventListener('click', () => {
    socialMenuContainer.classList.toggle('open');
});

// Close social menu when clicking outside or on overlay
document.addEventListener('click', (e) => {
    const isOverlay = e.target.classList.contains('social-overlay');
    if ((!socialMenuContainer.contains(e.target) || isOverlay) && socialMenuContainer.classList.contains('open')) {
        socialMenuContainer.classList.remove('open');
    }
});
