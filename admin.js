// --- GLOBAL O'ZGARUVCHILAR VA BAZA HOLATI ---
let dbListenersAttached = false;

let currentPageProducts = 1; const itemsPerPageProducts = 20;
let currentPageHistory = 1; const itemsPerPageHistory = 20;
let currentPageAstatka = 1; const itemsPerPageAstatka = 25;
let currentPageInvHist = 1; const itemsPerPageInvHist = 25;
let currentPageExpTx = 1; const itemsPerPageExpTx = 25;

let productsDB = [], sellersDB = [], historyDB = [], debtsDB = [];
let expCatsDB = [], expTxDB = [], invHistoryDB = [];
let currentOpenExpCatId = null;
let revenueChart;

// --- YORDAMCHI FUNKSIYALAR ---
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function formatMoney(amount) { 
    return Math.round(Number(amount)||0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "); 
}

function formatExpenseInput(el) { 
    let raw = el.value.replace(/\D/g, ''); 
    let val = raw === '' ? 0 : parseInt(raw); 
    let caretPos = el.selectionStart;
    let oldLen = el.value.length;
    el.value = raw === '' ? '' : formatMoney(val); 
    let newLen = el.value.length;
    el.setSelectionRange(caretPos + (newLen - oldLen), caretPos + (newLen - oldLen));
}

// --- MODALLAR ---
function showCustomAlert(msg, title="Xabar") {
    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMessage').innerText = escapeHtml(msg);
    document.getElementById('customAlertModal').classList.add('active');
}
function closeCustomAlert() { document.getElementById('customAlertModal').classList.remove('active'); }

let pendingConfirmCallback = null;
function showCustomConfirm(msg, callback, title="Diqqat") {
    document.getElementById('confirmTitle').innerText = title;
    document.getElementById('confirmMessage').innerText = escapeHtml(msg);
    pendingConfirmCallback = callback;
    document.getElementById('customConfirmModal').classList.add('active');
}
function closeCustomConfirm() { document.getElementById('customConfirmModal').classList.remove('active'); pendingConfirmCallback = null; }
function executeConfirm() { if (pendingConfirmCallback) pendingConfirmCallback(); closeCustomConfirm(); }

function openSuccessModal(added, updated) {
    document.getElementById('successModalMessage').innerHTML = `Yangilandi: <strong>${updated} ta</strong><br>Qo'shildi: <strong>${added} ta</strong>`;
    document.getElementById('successModal').classList.add('active');
}
function closeSuccessModal() { document.getElementById('successModal').classList.remove('active'); }

// --- THEME & UI ---
const themeBtn = document.getElementById('themeToggleBtn');
const moonIcon = `<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
const sunIcon = `<svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line></svg>`;

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) { localStorage.setItem('r04_admin_theme', 'dark'); themeBtn.innerHTML = sunIcon; } 
    else { localStorage.setItem('r04_admin_theme', 'light'); themeBtn.innerHTML = moonIcon; }
    if(typeof revenueChart !== 'undefined' && revenueChart) updateChartTheme();
}

function initTheme() {
    if (localStorage.getItem('r04_admin_theme') === 'dark') { document.body.classList.add('dark-mode'); themeBtn.innerHTML = sunIcon; } 
    else { themeBtn.innerHTML = moonIcon; }
    initProfile();
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
    document.querySelector('.sidebar-overlay').classList.toggle('active');
}

function hideLoader() {
    let loader = document.getElementById('globalLoader');
    if(loader) { loader.style.opacity = '0'; setTimeout(() => { loader.style.display = 'none'; }, 300); }
}

function switchTab(tabId, element = null) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active')); 
    let user = firebase.auth().currentUser;
    if(document.getElementById('setCurrLogin')) document.getElementById('setCurrLogin').value = user ? user.email : '';

    if (!element) {
        let navs = document.querySelectorAll('.nav-item');
        element = Array.from(navs).find(el => el.getAttribute('onclick') && el.getAttribute('onclick').includes(tabId));
    }
    if (element) element.classList.add('active');

    document.querySelectorAll('.section-container').forEach(sec => sec.classList.remove('active')); 
    let targetSec = document.getElementById(tabId + '-section');
    if(targetSec) targetSec.classList.add('active');
    
    const titles = { 
        dashboard: 'Bosh sahifa - Statistika', products: 'Mahsulotlar', astatka: "Ombor Qoldig'i (Astatka)",
        invhistory: "Ombor Tarixi", sellers: 'Sotuvchilar', history: 'Savdo tarixi', 
        debts: 'Qarz Daftari', finance: 'Hisob-kitob va Moliya', subscription: 'Obuna', settings: 'Sozlamalar', contact: 'Aloqa' 
    };
    let titleSpan = document.getElementById('pageTitle').querySelector('span');
    if(titleSpan) titleSpan.innerText = titles[tabId] || 'Boshqaruv Paneli';
    
    if(tabId === 'dashboard') updateDashboardInfo();
    if(tabId === 'history') renderHistory(); 
    if(tabId === 'products') renderTable();
    if(tabId === 'finance') { showFinanceView('main'); updateFinanceInfo(); }
    if(tabId === 'debts') renderDebts(); 
    if(tabId === 'astatka') { currentPageAstatka = 1; renderAstatka(); }
    if(tabId === 'invhistory') { currentPageInvHist = 1; closeInvDetailsView(); renderInvHistory(); }
    
    if (window.innerWidth <= 768) {
        document.querySelector('.sidebar').classList.remove('active');
        document.querySelector('.sidebar-overlay').classList.remove('active');
    }
    sessionStorage.setItem('r04_admin_active_tab', tabId);
}

// --- AUTH & PROFILE ---
let isLoggingIn = false; 
function attemptLogin() {
    if (isLoggingIn) return;
    const email = document.getElementById('loginUsername').value.trim(); 
    const password = document.getElementById('loginPassword').value.trim();
    if(!email || !password) return showCustomAlert("Email va parolni kiriting!", "Xatolik");

    isLoggingIn = true;
    let loader = document.getElementById('globalLoader');
    if(loader) { loader.style.display = 'flex'; loader.style.opacity = '1'; }

    firebase.auth().signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            STORE_ID = userCredential.user.uid; 
            return database.ref('clients/' + STORE_ID).once('value');
        })
        .then((snap) => {
            const storeData = snap.val();
            hideLoader();
            if (storeData && storeData.status === 'bloklangan') {
                firebase.auth().signOut();
                isLoggingIn = false;
                return showCustomAlert("Do'koningiz bloklangan!", "Diqqat");
            }
            sessionStorage.setItem('current_store_id', STORE_ID);
            sessionStorage.setItem('admin_logged_in', 'true');
            
            document.getElementById('loginOverlay').classList.remove('active');
            let savedTab = sessionStorage.getItem('r04_admin_active_tab') || 'dashboard';
            switchTab(savedTab);
            loadAllData(); 
            isLoggingIn = false;
        }).catch((error) => {
            hideLoader();
            isLoggingIn = false;
            showCustomAlert("Email yoki parol xato!", "Xatolik");
        });
}

function logout() {
    if (STORE_ID) database.ref('clients/' + STORE_ID).off();
    firebase.auth().signOut().then(() => {
        dbListenersAttached = false;
        sessionStorage.clear();
        document.getElementById('loginOverlay').classList.add('active');
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        closeProfileModal(); 
        switchTab('dashboard'); 
    });
}

function initProfile() {
    let n = localStorage.getItem('r04_admin_name_' + STORE_ID) || "Admin";
    let elName = document.getElementById('adminUserName');
    if (elName) elName.innerText = n;
    
    let avatar = localStorage.getItem('r04_admin_avatar_' + STORE_ID);
    if (avatar) {
        document.querySelectorAll('.admin-avatar').forEach(el => { el.innerHTML = `<img src="${avatar}" style="width:100%; height:100%; object-fit:cover;">`; });
        if(document.getElementById('profileAvatarImg')) {
            document.getElementById('profileAvatarImg').src = avatar;
            document.getElementById('profileAvatarImg').style.display = 'block';
            document.getElementById('profileAvatarText').style.display = 'none';
        }
    } else {
        let letter = n ? n.charAt(0).toUpperCase() : 'A';
        document.querySelectorAll('.admin-avatar').forEach(el => { el.innerHTML = letter; });
        if(document.getElementById('profileAvatarText')) {
            document.getElementById('profileAvatarText').innerText = letter;
            document.getElementById('profileAvatarText').style.display = 'block';
            document.getElementById('profileAvatarImg').style.display = 'none';
        }
    }
}

function openProfileModal() { 
    let n = localStorage.getItem('r04_admin_name_' + STORE_ID) || "Admin";
    document.getElementById('editAdminNameInput').value = n; 
    initProfile();
    window.tempAvatar = null;
    document.getElementById('profileModal').classList.add('active'); 
}
function closeProfileModal() { document.getElementById('profileModal').classList.remove('active'); }

function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                canvas.width = 150; canvas.height = 150;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, 150, 150);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                document.getElementById('profileAvatarImg').src = dataUrl;
                document.getElementById('profileAvatarImg').style.display = 'block';
                document.getElementById('profileAvatarText').style.display = 'none';
                window.tempAvatar = dataUrl; 
            }
            img.src = e.target.result;
        }
        reader.readAsDataURL(file);
    }
}

function saveAdminProfile() { 
    const n = document.getElementById('editAdminNameInput').value.trim(); 
    if(n) { 
        localStorage.setItem('r04_admin_name_' + STORE_ID, n); 
        if(window.tempAvatar) localStorage.setItem('r04_admin_avatar_' + STORE_ID, window.tempAvatar);
        initProfile(); 
        closeProfileModal(); 
    } 
}

function saveAdminSettings() {
    let np = document.getElementById('setNewPassword').value.trim();
    if(!np) return showCustomAlert("Yangi parolni to'liq kiriting!", "Diqqat");
    
    showCustomConfirm("Parol o'zgartirilsinmi?", () => {
        let user = firebase.auth().currentUser;
        if(user) {
            let loader = document.getElementById('globalLoader');
            if(loader) loader.style.display = 'flex';
            
            user.updatePassword(np).then(() => {
                if(loader) loader.style.display = 'none';
                showCustomAlert("Muvaffaqiyatli! Parolingiz xavfsiz tarzda o'zgartirildi.", "Bajarildi");
                document.getElementById('setNewPassword').value = '';
            }).catch(e => {
                if(loader) loader.style.display = 'none';
                if(e.code === 'auth/requires-recent-login') showCustomAlert("Xavfsizlik talabi: Parolni o'zgartirish uchun akkauntdan chiqib, qaytadan kiring!", "Diqqat");
                else showCustomAlert("Xatolik: " + e.message, "Xatolik");
            });
        }
    });
}

// --- BAZADAN MA'LUMOTLARNI YUKLASH ---
function loadAllData() {
    if (!STORE_ID) return;
    if (dbListenersAttached) return;

    database.ref('clients/' + STORE_ID).on('value', snap => {
        const data = snap.val();
        if(data) {
            if (data.status === 'bloklangan') {
                showCustomAlert("Do'koningiz bloklandi. Tizimdan chiqarilmoqdasiz!", "Diqqat");
                setTimeout(() => { logout(); }, 2000);
                return; 
            }
            if(document.getElementById('subStatus')) {
                document.getElementById('subStatus').innerText = data.status === 'faol' ? 'Faol' : 'Bloklangan';
                document.getElementById('subStatus').style.color = data.status === 'faol' ? 'var(--success)' : 'var(--danger)';
            }
            if(document.getElementById('subPlan')) {
                document.getElementById('subPlan').innerText = data.plan ? data.plan.toUpperCase() : 'BEPUL';
                document.getElementById('subPlan').className = 'badge-plan ' + (data.plan === 'vip' ? 'plan-vip' : (data.plan === 'yillik' ? 'plan-yearly' : 'plan-monthly'));
            }
            if(document.getElementById('subEndDate')) document.getElementById('subEndDate').innerText = data.end || 'Muddatsiz';
            
            if (document.getElementById('profileModalPlan')) {
                document.getElementById('profileModalPlan').innerText = data.plan ? data.plan.toUpperCase() : 'BEPUL';
                document.getElementById('profileModalPlan').className = 'badge-plan ' + (data.plan === 'vip' ? 'plan-vip' : (data.plan === 'yillik' ? 'plan-yearly' : 'plan-monthly'));
            }
        } else { logout(); }
    });
    
    database.ref('clients/' + STORE_ID + '/history').on('value', snap => {
        let val = snap.val();
        historyDB = val ? (Array.isArray(val) ? val.filter(v => v !== null) : Object.values(val)) : [];
        historyDB.sort((a, b) => b.id - a.id);
        if (document.getElementById('history-section').classList.contains('active')) renderHistory();
        updateDashboardInfo(); updateFinanceInfo();
    });

    database.ref('clients/' + STORE_ID + '/sellers').on('value', snap => {
        let val = snap.val();
        if(val) { sellersDB = Array.isArray(val) ? val.filter(v => v !== null) : Object.values(val); renderSellers(); }
    });

    database.ref('clients/' + STORE_ID + '/products').on('value', (snap) => {
        let val = snap.val();
        productsDB = val ? (Array.isArray(val) ? val.filter(v => v !== null) : Object.values(val)) : [];
        renderTable(); updateDashboardInfo(); updateFinanceInfo(); 
        if(document.getElementById('astatka-section').classList.contains('active')) renderAstatka();
    });

    database.ref('clients/' + STORE_ID + '/expense_cats').on('value', snap => {
        let val = snap.val();
        expCatsDB = val ? (Array.isArray(val) ? val.filter(v => v !== null) : Object.values(val)) : [];
        if(currentFinanceView === 'expenses') renderExpCats();
    });

    database.ref('clients/' + STORE_ID + '/expense_tx').on('value', snap => {
        let val = snap.val();
        expTxDB = val ? (Array.isArray(val) ? val.filter(v => v !== null) : Object.values(val)) : [];
        expTxDB.sort((a,b) => b.timestamp - a.timestamp);
        if(currentOpenExpCatId) renderExpTx();
        if(currentFinanceView === 'expenses') renderExpCats();
        updateFinanceInfo();
    });

    database.ref('clients/' + STORE_ID + '/debts').on('value', snap => {
        let val = snap.val();
        debtsDB = val ? (Array.isArray(val) ? val.filter(v => v !== null) : Object.values(val)) : [];
        if(document.getElementById('debts-section').classList.contains('active')) renderDebts();
    });

    database.ref('clients/' + STORE_ID + '/inv_history').on('value', snap => {
        let val = snap.val();
        invHistoryDB = val ? (Array.isArray(val) ? val.filter(v => v !== null) : Object.values(val)) : [];
        invHistoryDB.sort((a,b) => b.timestamp - a.timestamp);
        if(document.getElementById('invhistory-section').classList.contains('active')) renderInvHistory();
    });
    
    dbListenersAttached = true;
    clearHistoryFilter();
}

function syncToDatabase() { 
    if(STORE_ID) database.ref('clients/' + STORE_ID + '/products').set(productsDB); 
}

// --- DASHBOARD & CHARTS ---
function initChart() {
    try {
        if (typeof Chart === 'undefined') return;
        const ctx = document.getElementById('revenueChart').getContext('2d');
        let gradient = ctx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(52, 152, 219, 0.4)'); gradient.addColorStop(1, 'rgba(52, 152, 219, 0.0)');
        revenueChart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [{ label: "Savdo", data: [], borderColor: '#3498db', backgroundColor: gradient, borderWidth: 3, pointBackgroundColor: '#fff', pointBorderColor: '#3498db', pointBorderWidth: 2, pointRadius: 4, fill: true, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: getGridColor() }, ticks: { color: getTextColor() }, border: { dash: [5, 5] } }, x: { grid: { display: false }, ticks: { color: getTextColor() } } } }
        });
    } catch(e) {}
}
function getGridColor() { return document.body.classList.contains('dark-mode') ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'; }
function getTextColor() { return document.body.classList.contains('dark-mode') ? '#7f8c8d' : '#95a5a6'; }
function updateChartTheme() { if(revenueChart) { revenueChart.options.scales.y.grid.color = getGridColor(); revenueChart.options.scales.y.ticks.color = getTextColor(); revenueChart.options.scales.x.ticks.color = getTextColor(); revenueChart.update(); } }

let currentFilterType = 'kunlik'; 
function setRevFilter(type, btnElement) {
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
    currentFilterType = type;
    
    const dateInput = document.getElementById('revDateInput');
    let d = new Date(); let yyyy = d.getFullYear(); let mm = String(d.getMonth() + 1).padStart(2, '0'); let dd = String(d.getDate()).padStart(2, '0');
    
    let labelText = '';
    if(type === 'kunlik') { dateInput.type = 'date'; dateInput.max = `${yyyy}-${mm}-${dd}`; dateInput.value = `${yyyy}-${mm}-${dd}`; labelText = 'Kunlik'; }
    else if(type === 'oylik') { dateInput.type = 'month'; dateInput.max = `${yyyy}-${mm}`; dateInput.value = `${yyyy}-${mm}`; labelText = 'Oylik'; }
    else if(type === 'yillik') { dateInput.type = 'number'; dateInput.max = yyyy; dateInput.value = yyyy; labelText = 'Yillik'; }

    document.getElementById('revFilterLabel').innerText = labelText;
    if(document.getElementById('profitFilterLabel')) document.getElementById('profitFilterLabel').innerText = labelText;
    updateDashboardInfo();
}

function enforceMaxDate(el) {
    if (!el.value) return;
    let d = new Date(); let yyyy = d.getFullYear(); let mm = String(d.getMonth() + 1).padStart(2, '0'); let dd = String(d.getDate()).padStart(2, '0');
    if (el.type === 'date') { el.max = `${yyyy}-${mm}-${dd}`; if (el.value > el.max) el.value = el.max; } 
    else if (el.type === 'month') { el.max = `${yyyy}-${mm}`; if (el.value > el.max) el.value = el.max; } 
    else if (el.type === 'number') { el.max = yyyy; if (el.value > el.max) el.value = el.max; }
}

function updateDashboardInfo() {
    try {
        if(document.getElementById('statTotalItems')) document.getElementById('statTotalItems').innerText = productsDB.length + " xil";
        
        const lowStockItems = productsDB.filter(p => (Number(p.stock)||0) <= (p.warning !== undefined ? p.warning : 5));
        if(document.getElementById('lowStockCountText')) document.getElementById('lowStockCountText').innerText = lowStockItems.length + " ta";

        let displayRevenue = 0; let displayProfit = 0; let chartLabels = []; let chartData = [];
        let dateInput = document.getElementById('revDateInput');
        let selectedVal = dateInput ? dateInput.value : '';
        
        if (!selectedVal) {
            let d = new Date();
            if (currentFilterType === 'kunlik') selectedVal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            else if (currentFilterType === 'oylik') selectedVal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            else if (currentFilterType === 'yillik') selectedVal = `${d.getFullYear()}`;
            if(dateInput) dateInput.value = selectedVal;
        }

        let filteredHistory = historyDB;
        if(selectedVal) filteredHistory = historyDB.filter(h => String(h.date).startsWith(String(selectedVal)));

        filteredHistory.forEach(h => {
            if (h.paymentMethod !== 'nasiya') {
                displayRevenue += (Number(h.totalAmount) || 0);
                let receiptProfit = 0;
                (h.items || []).forEach(item => {
                    let cost = Number(item.costPriceAtSale) || 0; let salePrice = Number(item.price) || 0; let qty = Number(item.qty) || 0;
                    if (cost > 0) receiptProfit += (salePrice - cost) * qty;
                });
                let discount = Number(h.discount) || 0;
                displayProfit += (receiptProfit - discount);
            }
        });

        if (currentFilterType === 'kunlik') {
            for (let i = 8; i <= 23; i++) {
                let hourStr = String(i).padStart(2, '0'); chartLabels.push(hourStr + ":00");
                let hourTotal = filteredHistory.filter(h => h.time && h.time.startsWith(hourStr + ":") && h.paymentMethod !== 'nasiya').reduce((sum, h) => sum + (Number(h.totalAmount) || 0), 0);
                chartData.push(hourTotal);
            }
        } else if (currentFilterType === 'oylik') {
            let [year, month] = selectedVal.split('-'); let daysInMonth = new Date(year, month, 0).getDate(); 
            for (let i = 1; i <= daysInMonth; i++) {
                chartLabels.push(i);
                let dayStr = selectedVal + "-" + String(i).padStart(2, '0');
                let dayTotal = filteredHistory.filter(h => h.date === dayStr && h.paymentMethod !== 'nasiya').reduce((sum, h) => sum + (Number(h.totalAmount) || 0), 0);
                chartData.push(dayTotal);
            }
        } else if (currentFilterType === 'yillik') {
            chartLabels = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyun', 'Iyul', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
            for (let i = 1; i <= 12; i++) {
                let monthStr = selectedVal + "-" + String(i).padStart(2, '0');
                let monthTotal = filteredHistory.filter(h => h.date && h.date.startsWith(monthStr) && h.paymentMethod !== 'nasiya').reduce((sum, h) => sum + (Number(h.totalAmount) || 0), 0);
                chartData.push(monthTotal);
            }
        }

        if(document.getElementById('revSumDisplay')) document.getElementById('revSumDisplay').innerText = formatMoney(displayRevenue) + " so'm";
        if(document.getElementById('profitSumDisplay')) document.getElementById('profitSumDisplay').innerText = formatMoney(displayProfit) + " so'm";
        
        if(!revenueChart) initChart();
        if(revenueChart) { revenueChart.data.labels = chartLabels; revenueChart.data.datasets[0].data = chartData; revenueChart.update(); }
    } catch(e) { console.error("Statistika xatoligi:", e); }
}

function openLowStockModal() {
    const lowStockItems = productsDB.filter(p => (Number(p.stock)||0) <= (p.warning !== undefined ? p.warning : 5));
    const listEl = document.getElementById('lowStockListModal');
    listEl.innerHTML = '';
    if (lowStockItems.length === 0) { 
        listEl.innerHTML = '<li style="color: var(--success); padding: 20px; text-align: center;">Hammasi joyida! Yaxshi zaxira mavjud.</li>'; 
    } else { 
        lowStockItems.forEach(item => { 
            listEl.innerHTML += `<li class="low-stock-item"><div><div class="ls-name">${escapeHtml(item.name)}</div><div style="font-size: 11px; color: var(--text-muted);">Kod: ${escapeHtml(item.code)}</div></div><span class="ls-qty">${item.stock} ${escapeHtml(item.unit || 'dona')}</span></li>`; 
        }); 
    }
    document.getElementById('lowStockModal').classList.add('active');
}
function closeLowStockModal() { document.getElementById('lowStockModal').classList.remove('active'); }

// --- MAHSULOTLAR TIZIMI ---
function renderTable() {
    const tbody = document.getElementById('tableBody');
    if(!tbody) return;
    const searchText = (document.getElementById('searchInput').value || "").toLowerCase();
    
    let filteredProducts = productsDB.filter(p => (p.name || "").toLowerCase().includes(searchText) || (p.code || "").toLowerCase().includes(searchText));
    
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPageProducts) || 1;
    if(currentPageProducts > totalPages) currentPageProducts = totalPages;
    const startIdx = (currentPageProducts - 1) * itemsPerPageProducts;
    const paginatedItems = filteredProducts.slice(startIdx, startIdx + itemsPerPageProducts);

    document.getElementById('pageInfoProd').innerText = `${currentPageProducts} / ${totalPages}`;
    document.getElementById('prevBtnProd').disabled = currentPageProducts === 1;
    document.getElementById('nextBtnProd').disabled = currentPageProducts === totalPages;

    if (paginatedItems.length === 0) { 
        tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">Topilmadi...</td></tr>`; 
        return; 
    }
    
    let html = '';
    paginatedItems.forEach((p, idxOffset) => {
        const globalIndex = productsDB.indexOf(p);
        const warn = p.warning !== undefined ? p.warning : 5;
        const stockClass = p.stock <= warn ? 'stock-low' : 'stock-ok';
        html += `<tr>
            <td>${startIdx + idxOffset + 1}</td>
            <td class="td-code">${escapeHtml(p.code)}</td>
            <td class="td-name">${escapeHtml(p.name)}</td>
            <td style="color: var(--success); font-weight:bold;">${formatMoney(p.price)} so'm</td>
            <td>${escapeHtml(p.unit || 'dona')}</td>
            <td class="${stockClass}">${p.stock}</td>
            <td style="color: var(--text-muted);">${warn}</td>
            <td style="text-align: right; white-space: nowrap;">
                <button class="btn-edit" onclick="openEditModal(${globalIndex})">Tahrirlash</button>
                <button class="btn-delete" onclick="openDeleteModal(${globalIndex})">O'chirish</button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

function prevPageProducts() { if(currentPageProducts > 1) { currentPageProducts--; renderTable(); } }
function nextPageProducts() { currentPageProducts++; renderTable(); }

function openAddModal() { 
    document.getElementById('modalTitle').innerText = "Yangi Mahsulot"; 
    document.getElementById('editIndex').value = ""; 
    document.getElementById('pCode').value = ""; 
    document.getElementById('pName').value = ""; 
    document.getElementById('pCostPrice').value = ""; 
    document.getElementById('pPrice').value = ""; 
    document.getElementById('pStock').value = ""; 
    document.getElementById('pUnit').value = "dona"; 
    document.getElementById('pWarning').value = "5"; 
    document.getElementById('pCode').disabled = false; 
    document.getElementById('productModal').classList.add('active'); 
}
        
function openEditModal(index) { 
    document.getElementById('modalTitle').innerText = "Tahrirlash"; 
    document.getElementById('editIndex').value = index; 
    const p = productsDB[index]; 
    document.getElementById('pCode').value = p.code; 
    document.getElementById('pName').value = p.name; 
    document.getElementById('pCostPrice').value = p.costPrice !== undefined ? p.costPrice : ''; 
    document.getElementById('pPrice').value = p.price; 
    document.getElementById('pStock').value = p.stock; 
    document.getElementById('pUnit').value = p.unit || "dona"; 
    document.getElementById('pWarning').value = p.warning !== undefined ? p.warning : 5; 
    document.getElementById('pCode').disabled = true; 
    document.getElementById('productModal').classList.add('active'); 
}
        
function closeModal() { document.getElementById('productModal').classList.remove('active'); }
        
function saveProduct() {
    const code = document.getElementById('pCode').value.trim(); 
    const name = document.getElementById('pName').value.trim(); 
    const price = parseInt(document.getElementById('pPrice').value); 
    const costPrice = parseInt(document.getElementById('pCostPrice').value) || 0; 
    const unit = document.getElementById('pUnit').value; 
    const warning = parseInt(document.getElementById('pWarning').value) || 0; 
    const editIndex = document.getElementById('editIndex').value; 
    let stockRaw = document.getElementById('pStock').value; 
    let stock = (unit === 'kilo' || unit === 'metr') ? parseFloat(stockRaw) : parseInt(stockRaw);
    
    if (!code || !name || isNaN(price) || isNaN(stock)) { showCustomAlert("Maydonlarni to'liq to'ldiring!", "Xatolik"); return; }
    
    if (editIndex === "") { 
        if (productsDB.find(p => p.code === code)) { showCustomAlert("Ushbu kod mavjud!", "Xatolik"); return; } 
        productsDB.push({ code, name, costPrice, price, stock, unit, warning }); 
        logInventoryHistory("Qo'shildi", code, name, 0, stock, "Yangi kiritildi");
    } else { 
        if (productsDB.some((p, idx) => p.code === code && idx != editIndex)) {
            showCustomAlert("Ushbu kod boshqa mahsulotga tegishli!", "Xatolik"); return;
        }
        let oldP = productsDB[editIndex];
        let oldStock = oldP.stock;
        productsDB[editIndex] = { code, name, costPrice, price, stock, unit, warning }; 
        if (oldStock !== stock || oldP.price !== price || oldP.costPrice !== costPrice) {
            logInventoryHistory("O'zgartirildi", code, name, oldStock, stock, "Tahrirlandi");
        }
    }
    syncToDatabase(); closeModal(); 
}

function exportToExcel() {
    if (productsDB.length === 0) return showCustomAlert("Eksport qilish uchun mahsulotlar yo'q!", "Diqqat");
    const data = productsDB.map(p => ({ 
        "Fiskal Kod": p.code, "Nomi": p.name, "Tan narxi (so'm)": p.costPrice || 0,
        "Sotish narxi (so'm)": p.price, "Sotuv birligi": p.unit || "dona", 
        "Qoldiq": p.stock, "Ogohlantirish chegarasi": p.warning !== undefined ? p.warning : 5 
    }));
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); 
    XLSX.utils.book_append_sheet(wb, ws, "Mahsulotlar"); 
    XLSX.writeFile(wb, "r04_Ombor_Qoldig'i.xlsx");
}

function importFromExcel(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result); const workbook = XLSX.read(data, { type: 'array' });
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        let added = 0, updated = 0;
        let importedItemsList = []; 
        
        jsonData.forEach(row => {
            const code = String(row["Kod"] || row["Fiskal Kod"] || row["ID"] || "").trim();
            const name = row["Nomi"] || row["Mahsulot Nomi"] || row["Name"] || "";
            const costPriceStr = String(row["Tan narxi"] || row["Tan narxi (so'm)"] || "0").replace(/[, ]/g, '');
            const costPrice = parseInt(costPriceStr) || 0;
            const priceStr = String(row["Narxi"] || row["Sotish narxi"] || row["Narxi (so'm)"] || "0").replace(/[, ]/g, '');
            const price = parseInt(priceStr) || 0;
            const unitRaw = String(row["Birlik"] || row["Sotuv birligi"] || "dona").toLowerCase().trim();
            const unit = (unitRaw === 'kilo' || unitRaw === 'qadoq' || unitRaw === 'metr') ? unitRaw : 'dona';
            const warning = parseInt(row["Ogohlantirish"] || row["Ogohlantirish chegarasi"] || 5);
            const stockRaw = row["Soni"] || row["Qoldiq"] || 0; 
            const stock = (unit === 'kilo' || unit === 'metr') ? parseFloat(stockRaw) : parseInt(stockRaw);
            
            if (code && name) {
                const idx = productsDB.findIndex(p => p.code === code);
                let oldStock = 0;
                if (idx !== -1) { 
                    oldStock = Number(productsDB[idx].stock) || 0;
                    productsDB[idx] = { code, name, costPrice, price, stock, unit, warning }; 
                    updated++; 
                } else { 
                    productsDB.push({ code, name, costPrice, price, stock, unit, warning }); 
                    added++; 
                }
                importedItemsList.push({ code, name, oldQty: oldStock, newQty: stock });
            }
        });
        
        if(added > 0 || updated > 0) {
            logInventoryHistory("Import", "Ommaviy Import", `Jami: ${added + updated} xil mahsulot`, "-", "-", `Qo'shildi: ${added}, Yangilandi: ${updated}`, importedItemsList);
        }
        
        syncToDatabase(); 
        openSuccessModal(added, updated); 
        event.target.value = ""; 
    };
    reader.readAsArrayBuffer(file);
}

function executeZeroStock() {
    let loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'flex';

    let zeroedItemsList = []; 
    productsDB.forEach(p => { 
        let oldStock = Number(p.stock) || 0;
        if(oldStock > 0) {
            zeroedItemsList.push({ code: p.code, name: p.name, oldQty: oldStock, newQty: 0 });
            p.stock = 0; 
        }
    });

    if(zeroedItemsList.length > 0) {
        logInventoryHistory("O'zgartirildi", "BARCHA", `Jami: ${zeroedItemsList.length} ta mahsulot`, "-", 0, "Barcha qoldiqlar nollangan", zeroedItemsList);
    }

    if(!STORE_ID) return;
    database.ref('clients/' + STORE_ID + '/products').set(productsDB)
        .then(() => {
            if (loader) loader.style.display = 'none';
            renderTable(); 
            updateDashboardInfo(); 
            showCustomAlert("Barcha mahsulotlar qoldig'i muvaffaqiyatli 0 ga tushirildi!", "Bajarildi");
        })
        .catch(err => {
            if (loader) loader.style.display = 'none';
            showCustomAlert("Xatolik yuz berdi: " + err.message, "Xatolik");
        });
}

function openDeleteModal(index) {
    showCustomConfirm("Bu mahsulotni bazadan butunlay o'chirasizmi?", () => {
        let p = productsDB[index];
        logInventoryHistory("O'chirildi", p.code, p.name, p.stock, 0, "Butunlay o'chirildi");
        productsDB.splice(index, 1); syncToDatabase();
    });
}

function confirmZeroStock() {
    if (productsDB.length === 0) return showCustomAlert("Omborda mahsulot yo'q!", "Diqqat");
    showCustomConfirm("DIQQAT! BARCHA mahsulotlarning qoldig'i 0 ta qilib belgilanadi. Buni ortga qaytarib bo'lmaydi. Davom etasizmi?", () => {
        executeZeroStock();
    });
}

// --- ASTATKA BO'LIMI ---
function renderAstatka() {
    const tbody = document.getElementById('astatkaBody'); if(!tbody) return;
    let search = (document.getElementById('astatkaSearch').value || "").toLowerCase();
    let arr = productsDB.filter(p => (p.name || "").toLowerCase().includes(search) || (p.code || "").toLowerCase().includes(search));
    
    let totalCostVal = 0, totalSaleVal = 0, totalExpectedProfit = 0;
    arr.forEach(p => {
        let s = Number(p.stock) || 0; let c = Number(p.costPrice) || 0; let pr = Number(p.price) || 0;
        if(s > 0) { totalCostVal += (c * s); totalSaleVal += (pr * s); totalExpectedProfit += ((pr - c) * s); }
    });
    
    document.getElementById('astTotalItems').innerText = arr.length;
    document.getElementById('astTotalCost').innerText = formatMoney(totalCostVal) + " so'm";
    document.getElementById('astTotalSale').innerText = formatMoney(totalSaleVal) + " so'm";
    document.getElementById('astTotalProfit').innerText = formatMoney(totalExpectedProfit) + " so'm";

    const totalPages = Math.ceil(arr.length / itemsPerPageAstatka) || 1;
    if(currentPageAstatka > totalPages) currentPageAstatka = totalPages;
    const start = (currentPageAstatka - 1) * itemsPerPageAstatka;
    const items = arr.slice(start, start + itemsPerPageAstatka);

    document.getElementById('pageInfoAstatka').innerText = `${currentPageAstatka} / ${totalPages}`;
    document.getElementById('prevBtnAst').disabled = currentPageAstatka === 1;
    document.getElementById('nextBtnAst').disabled = currentPageAstatka === totalPages;

    if(items.length === 0) { tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 20px; color: var(--text-muted);">Ma'lumot topilmadi</td></tr>`; return; }

    tbody.innerHTML = items.map((p, i) => {
        let s = Number(p.stock) || 0; let c = Number(p.costPrice) || 0; let pr = Number(p.price) || 0;
        let valCost = s > 0 ? s * c : 0; let valSale = s > 0 ? s * pr : 0; let profit = s > 0 ? (pr - c) * s : 0;
        return `<tr>
            <td>${start + i + 1}</td>
            <td style="font-family:monospace; color:var(--text-muted);">${escapeHtml(p.code)}</td>
            <td style="font-weight:bold; color:var(--text-dark);">${escapeHtml(p.name)}</td>
            <td style="font-weight:bold; color:${s <= (p.warning||5) ? 'var(--danger)' : 'var(--text-main)'};">${s} ${escapeHtml(p.unit||'dona')}</td>
            <td style="color:var(--danger);">${formatMoney(c)}</td>
            <td style="color:var(--success);">${formatMoney(pr)}</td>
            <td style="font-weight:bold; color:var(--brand-color);">${formatMoney(valSale)}</td>
            <td style="font-weight:bold; color:var(--success);">${formatMoney(profit)}</td>
        </tr>`;
    }).join('');
}
function prevPageAstatka() { if(currentPageAstatka > 1) { currentPageAstatka--; renderAstatka(); } }
function nextPageAstatka() { currentPageAstatka++; renderAstatka(); }

function exportAstatkaToExcel() {
    if (productsDB.length === 0) return showCustomAlert("Eksport qilish uchun mahsulotlar yo'q!", "Diqqat");
    const data = productsDB.map((p, i) => {
        let s = Number(p.stock) || 0; let c = Number(p.costPrice) || 0; let pr = Number(p.price) || 0;
        return { 
            "T/r": i + 1, "Fiskal Kod": p.code, "Nomi": p.name, "Qoldiq (Soni)": s + " " + (p.unit||"dona"), 
            "Tan narxi (so'm)": c, "Sotish narxi (so'm)": pr, "Umumiy Sotish Qiymati (so'm)": s > 0 ? s * pr : 0, "Kutilayotgan Foyda (so'm)": s > 0 ? (pr - c) * s : 0
        };
    });
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); 
    XLSX.utils.book_append_sheet(wb, ws, "Astatka"); XLSX.writeFile(wb, "r04_Astatka.xlsx");
}

// --- OMBOR TARIXI ---
function logInventoryHistory(action, code, name, oldQty, newQty, note, itemsArray = null) {
    if(!STORE_ID) return;
    let d = new Date();
    let ts = d.getTime();
    let dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    let timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    let adminName = localStorage.getItem('r04_admin_name_' + STORE_ID) || "Admin";

    let id = "inv_" + ts + "_" + Math.floor(Math.random()*10000);
    
    // Yuborilgan qiymatlarni aniq son formatiga aylantirish
    let oq = Number(oldQty) || 0;
    let nq = Number(newQty) || 0;

    let itemsToSave = itemsArray ? itemsArray.map(item => ({
        code: item.code,
        name: item.name,
        oldQty: Number(item.oldQty) || 0,
        newQty: Number(item.newQty) || 0
    })) : [{ code: code, name: name, oldQty: oq, newQty: nq }];

    let data = { 
        id, timestamp: ts, date: dateStr, time: timeStr, 
        action, code, name, oldQty: oq, newQty: nq, note, adminName, 
        items: itemsToSave 
    };
    
    invHistoryDB.push(data);
    database.ref('clients/' + STORE_ID + '/inv_history').set(invHistoryDB);
}

function renderInvHistory() {
    const tbody = document.getElementById('invHistoryBody');
    if(!tbody) return;

    let dateInput = document.getElementById('invHistDate');
    if (dateInput && !dateInput.value) {
        let d = new Date();
        dateInput.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }

    let filterDate = dateInput ? dateInput.value : '';
    let actionEl = document.getElementById('invHistAction');
    let filterAction = actionEl ? actionEl.value : 'all';
    let searchEl = document.getElementById('invHistSearch');
    let search = searchEl ? (searchEl.value || "").toLowerCase() : '';

    let arr = invHistoryDB.filter(h => {
        if(filterDate && h.date !== filterDate) return false;
        if(filterAction !== 'all' && h.action !== filterAction) return false;
        if(search && !(h.name||"").toLowerCase().includes(search) && !(h.code||"").toLowerCase().includes(search)) return false;
        return true;
    });

    const totalPages = Math.ceil(arr.length / itemsPerPageInvHist) || 1;
    if(currentPageInvHist > totalPages) currentPageInvHist = totalPages;
    const start = (currentPageInvHist - 1) * itemsPerPageInvHist;
    const items = arr.slice(start, start + itemsPerPageInvHist);

    if(document.getElementById('pageInfoInvHist')) document.getElementById('pageInfoInvHist').innerText = `${currentPageInvHist} / ${totalPages}`;
    if(document.getElementById('prevBtnInvHist')) document.getElementById('prevBtnInvHist').disabled = currentPageInvHist === 1;
    if(document.getElementById('nextBtnInvHist')) document.getElementById('nextBtnInvHist').disabled = currentPageInvHist === totalPages;

    if(items.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px; color: var(--text-muted);">Tarix topilmadi</td></tr>`;
        return;
    }

    tbody.innerHTML = items.map(h => {
        let actColor = "var(--text-muted)";
        if(h.action === "Qo'shildi") actColor = "var(--success)";
        else if(h.action === "O'zgartirildi") actColor = "var(--brand-color)";
        else if(h.action === "O'chirildi") actColor = "var(--danger)";
        else actColor = "#8e44ad"; 

        // Ichki sahifaga o'tish tugmasi
        let btn = `<button class="btn-edit" style="color:var(--brand-color); border-color:var(--brand-color);" onclick="openInvDetailsView('${h.id}')">Batafsil</button>`;

        return `<tr>
            <td style="font-weight:bold; font-size:13px; white-space:nowrap;">${h.date} <br><span style="color:var(--text-muted); font-size: 11px;">${h.time}</span></td>
            <td><span style="background:var(--table-header); border:1px solid ${actColor}; color:${actColor}; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:bold;">${h.action}</span></td>
            <td><div style="font-weight:bold; color:var(--text-dark);">${escapeHtml(h.name)}</div><div style="font-size:11px; color:var(--text-muted);">KOD: ${escapeHtml(h.code)}</div></td>
            <td style="font-weight:bold; font-size:14px;">${h.oldQty} ➔ ${h.newQty}</td>
            <td style="color:var(--text-muted); font-size:12px;">${escapeHtml(h.adminName)}</td>
            <td style="font-size:12px; color:var(--text-muted); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(h.note)}">${escapeHtml(h.note)}</td>
            <td style="text-align:right;">${btn}</td>
        </tr>`;
    }).join('');
}

function clearInvHistoryFilters() {
    let d = new Date();
    let today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if(document.getElementById('invHistDate')) document.getElementById('invHistDate').value = today;
    if(document.getElementById('invHistAction')) document.getElementById('invHistAction').value = "all";
    if(document.getElementById('invHistSearch')) document.getElementById('invHistSearch').value = "";
    currentPageInvHist = 1;
    renderInvHistory();
}

function prevPageInvHist() { if(currentPageInvHist > 1) { currentPageInvHist--; renderInvHistory(); } }
function nextPageInvHist() { currentPageInvHist++; renderInvHistory(); }

// YANGILANISH: BATAfsil Ko'rinish (Ichki sahifa arxitekturasi)
function openInvDetailsView(id) {
    const h = invHistoryDB.find(x => x.id === id);
    if (!h) return;

    // Asosiy bo'limni topish va uning ichidagi barcha original qismlarni yashirish
    const section = document.getElementById('invhistory-section');
    Array.from(section.children).forEach(child => {
        if (child.id !== 'invDetailsSubViewWrapper') {
            child.style.display = 'none';
        }
    });

    // Ichki sahifa konteynerini yaratish (agar yo'q bo'lsa)
    let subView = document.getElementById('invDetailsSubViewWrapper');
    if (!subView) {
        subView = document.createElement('div');
        subView.id = 'invDetailsSubViewWrapper';
        section.appendChild(subView);
    }
    subView.style.display = 'block';

    let items = h.items || [{ code: h.code, name: h.name, oldQty: h.oldQty, newQty: h.newQty }];
    let totalAdded = 0;
    let totalRemoved = 0;

    let rowsHtml = items.map(item => {
        let oq = Number(item.oldQty) || 0;
        let nq = Number(item.newQty) || 0;
        let diff = nq - oq;
        
        let diffHtml = '';
        if (diff > 0) {
            diffHtml = `<span style="color:var(--success); font-weight:bold;">+${diff}</span>`;
            totalAdded += diff;
        } else if (diff < 0) {
            diffHtml = `<span style="color:var(--danger); font-weight:bold;">${diff}</span>`;
            totalRemoved += Math.abs(diff);
        } else {
            diffHtml = `<span style="color:var(--text-muted);">0</span>`;
        }

        return `<tr>
            <td style="font-family: monospace; color: var(--text-muted);">${escapeHtml(item.code)}</td>
            <td style="font-weight: bold; color: var(--text-dark);">${escapeHtml(item.name)}</td>
            <td style="color: var(--danger); font-weight: bold;">${oq}</td>
            <td style="color: var(--success); font-weight: bold;">${nq}</td>
            <td style="text-align:center;">${diffHtml}</td>
        </tr>`;
    }).join('');

    subView.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px; cursor: pointer; color: var(--brand-color); width: max-content; padding: 5px 10px; border-radius: 6px; transition: 0.2s;" class="hover-bg" onclick="closeInvDetailsView()">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"></path></svg>
            <strong>Tarixga qaytish</strong>
        </div>
        
        <div style="background: var(--table-header); border: 1px solid var(--border-color); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; margin-bottom: 15px; color: var(--text-dark);">Harakat tafsilotlari</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; font-size: 14px;">
                <div><span style="color:var(--text-muted);">Harakat turi:</span> <br><strong>${escapeHtml(h.action)}</strong></div>
                <div><span style="color:var(--text-muted);">Sana va Vaqt:</span> <br><strong>${escapeHtml(h.date)} ${escapeHtml(h.time)}</strong></div>
                <div><span style="color:var(--text-muted);">Boshqardi:</span> <br><strong>${escapeHtml(h.adminName)}</strong></div>
                <div style="grid-column: 1 / -1;"><span style="color:var(--text-muted);">Asos/Izoh:</span> <br><strong>${escapeHtml(h.note)}</strong></div>
            </div>
            <hr style="border: 0; border-top: 1px dashed var(--border-color); margin: 15px 0;">
            <div style="font-size: 15px;">
                Umumiy qo'shildi: <strong style="color:var(--success)">+${totalAdded} ta</strong> &nbsp;|&nbsp; 
                Umumiy kamaydi: <strong style="color:var(--danger)">-${totalRemoved} ta</strong>
            </div>
        </div>

        <div class="table-container" style="background: var(--bg-card); border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse; text-align: left;">
                <thead>
                    <tr>
                        <th>Fiskal Kod</th>
                        <th>Mahsulot Nomi</th>
                        <th>Eski qoldiq</th>
                        <th>Yangi qoldiq</th>
                        <th style="text-align:center;">O'zgarish</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
    `;
}

function closeInvDetailsView() {
    const section = document.getElementById('invhistory-section');
    if (!section) return;
    
    const subView = document.getElementById('invDetailsSubViewWrapper');
    if (subView) subView.style.display = 'none';

    // Original elementlarni qayta ko'rsatish
    Array.from(section.children).forEach(child => {
        if (child.id !== 'invDetailsSubViewWrapper') {
            child.style.display = ''; 
        }
    });
}

// --- SOTUVCHILAR ---
function renderSellers() {
    const tbody = document.getElementById('sellersBody'); if(!tbody) return;
    let html = ''; let d = new Date(); let todayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    sellersDB.forEach((seller, index) => {
        const statusBadge = seller.isBlocked ? `<span class="status-badge status-blocked">Bloklangan</span>` : `<span class="status-badge status-active">Faol</span>`;
        const blockBtnText = seller.isBlocked ? "Ochish" : "Bloklash";
        const blockBtnColor = seller.isBlocked ? "var(--success)" : "var(--danger)";
        const percent = seller.percentage || 0;
        let displayRev = seller.revenue || 0;
        if (seller.lastSaleDate !== todayStr) displayRev = 0; 
        const shareAmount = displayRev * (percent / 100);

        html += `<tr>
            <td style="color:var(--text-muted);">${index + 1}</td>
            <td style="font-weight:bold; color:var(--text-dark);">${escapeHtml(seller.name)}</td>
            <td style="color:var(--text-muted);">${escapeHtml(seller.login)}</td><td style="color:var(--text-muted);">***</td>
            <td style="font-weight:bold; color:var(--success);">${formatMoney(displayRev)} so'm</td>
            <td style="font-weight:bold; color:var(--warning);">${percent}% <br><span style="font-size:11px; color:var(--text-muted); font-weight:normal;">(${formatMoney(shareAmount)} so'm)</span></td>
            <td style="text-align: center;">${statusBadge}</td>
            <td style="text-align: right; white-space: nowrap;">
                <button class="btn-edit" onclick="openEditSellerModal(${index})">Tahrirlash</button>
                <button class="btn-edit" style="color:${blockBtnColor}; border-color:${blockBtnColor};" onclick="toggleBlockSeller(${index})">${blockBtnText}</button>
                <button class="btn-delete" onclick="deleteSeller(${index})">O'chirish</button>
            </td>
        </tr>`;
    });
    tbody.innerHTML = html;
}
function openSellerModal() { document.getElementById('sellerModalTitle').innerText = "Yangi Sotuvchi"; document.getElementById('editSellerIndex').value = ""; document.getElementById('sName').value = ""; document.getElementById('sLogin').value = ""; document.getElementById('sPassword').value = ""; document.getElementById('sPercentage').value = "0"; document.getElementById('sellerModal').classList.add('active'); }
function openEditSellerModal(index) { document.getElementById('sellerModalTitle').innerText = "Sotuvchini Tahrirlash"; document.getElementById('editSellerIndex').value = index; const seller = sellersDB[index]; document.getElementById('sName').value = seller.name; document.getElementById('sLogin').value = seller.login; document.getElementById('sPassword').value = seller.password; document.getElementById('sPercentage').value = seller.percentage || 0; document.getElementById('sellerModal').classList.add('active'); }
function closeSellerModal() { document.getElementById('sellerModal').classList.remove('active'); }
function saveSeller() {
    const name = document.getElementById('sName').value.trim(); const login = document.getElementById('sLogin').value.trim(); const password = document.getElementById('sPassword').value.trim(); const percentage = parseInt(document.getElementById('sPercentage').value) || 0; const editIndex = document.getElementById('editSellerIndex').value;
    if(!name || !login || !password) return showCustomAlert("Barcha maydonlarni to'ldiring!", "Xatolik"); 
    if (editIndex === "") sellersDB.push({ name, login, password, percentage, revenue: 0, isBlocked: false });
    else sellersDB[editIndex] = { ...sellersDB[editIndex], name, login, password, percentage };
    if(STORE_ID) database.ref('clients/' + STORE_ID + '/sellers').set(sellersDB); closeSellerModal(); 
}
function toggleBlockSeller(index) { sellersDB[index].isBlocked = !sellersDB[index].isBlocked; if(STORE_ID) database.ref('clients/' + STORE_ID + '/sellers').set(sellersDB); }
function deleteSeller(index) { showCustomConfirm("Sotuvchini butunlay o'chirishni tasdiqlaysizmi?", () => { sellersDB.splice(index, 1); if(STORE_ID) database.ref('clients/' + STORE_ID + '/sellers').set(sellersDB); }); }

// --- SAVDO TARIXI ---
function renderHistory() {
    const tbody = document.getElementById('historyBody'); if(!tbody) return;
    const sellerSelect = document.getElementById('histFilterSeller'); 
    let currentSellerVal = sellerSelect ? sellerSelect.value : 'all'; 
    let uniqueSellers = [...new Set(historyDB.map(h => h.sellerName))];
    let selectHtml = '<option value="all">Barcha sotuvchilar</option>';
    uniqueSellers.forEach(sName => { selectHtml += `<option value="${escapeHtml(sName)}">${escapeHtml(sName)}</option>`; });
    if(sellerSelect) { sellerSelect.innerHTML = selectHtml; sellerSelect.value = uniqueSellers.includes(currentSellerVal) ? currentSellerVal : 'all'; }

    const filterDate = document.getElementById('histFilterDate') ? document.getElementById('histFilterDate').value : ''; 
    const filterSeller = document.getElementById('histFilterSeller') ? document.getElementById('histFilterSeller').value : 'all';
    let payFilter = document.getElementById('historyPaymentFilter') ? document.getElementById('historyPaymentFilter').value : 'all';

    let filteredHistory = historyDB.filter(h => { let method = h.paymentMethod || 'naqd'; return payFilter === 'all' || method === payFilter; });
    if (filterDate) filteredHistory = filteredHistory.filter(h => h.date === filterDate);
    if (filterSeller !== 'all') filteredHistory = filteredHistory.filter(h => h.sellerName === filterSeller); 

    const totalPages = Math.ceil(filteredHistory.length / itemsPerPageHistory) || 1;
    if(currentPageHistory > totalPages) currentPageHistory = totalPages;
    const startIdx = (currentPageHistory - 1) * itemsPerPageHistory;
    const paginatedItems = filteredHistory.slice(startIdx, startIdx + itemsPerPageHistory);

    if(document.getElementById('pageInfoHist')) document.getElementById('pageInfoHist').innerText = `${currentPageHistory} / ${totalPages}`;
    if(document.getElementById('prevBtnHist')) document.getElementById('prevBtnHist').disabled = currentPageHistory === 1;
    if(document.getElementById('nextBtnHist')) document.getElementById('nextBtnHist').disabled = currentPageHistory === totalPages;

    if(paginatedItems.length === 0) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--text-muted); padding: 20px;">Hech qanday savdo tarixi topilmadi</td></tr>`; return; }

    let html = '';
    paginatedItems.forEach(h => {
        let payIcon = "💵 Naqd"; if(h.paymentMethod === 'karta') payIcon = "💳 Karta"; if(h.paymentMethod === 'visa') payIcon = "🌍 Visa"; if(h.paymentMethod === 'nasiya') payIcon = "📝 Nasiya";
        html += `<tr>
            <td style="font-weight: bold;">${escapeHtml(h.date)}</td>
            <td><span style="background: var(--table-header); padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border-color);">${escapeHtml(h.time)}</span></td>
            <td>${escapeHtml(h.sellerName)}<br><span style="font-size: 11px; color: var(--text-muted);">${payIcon}</span></td>
            <td style="color: #27ae60; font-weight: bold;">${formatMoney(h.totalAmount)} so'm</td>
            <td style="text-align: right; white-space: nowrap;">
                <button class="btn-edit" onclick="openReceiptModalView(${h.id})">Batafsil</button>
                <button class="btn-edit" style="color:#f39c12; border-color:#f39c12;" onclick="openReceiptModalEdit(${h.id})">Tahrirlash</button>
            </td>
        </tr>`;
    });
    let filteredTotal = filteredHistory.reduce((sum, h) => sum + (Number(h.totalAmount) || 0), 0);
    if (document.getElementById('historyFilteredTotal')) document.getElementById('historyFilteredTotal').innerText = `(Jami: ${formatMoney(filteredTotal)} so'm)`;
    tbody.innerHTML = html;
}

function prevPageHistory() { if(currentPageHistory > 1) { currentPageHistory--; renderHistory(); } }
function nextPageHistory() { currentPageHistory++; renderHistory(); }
function clearHistoryFilter() {
    let d = new Date(); let today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if(document.getElementById('histFilterDate')) document.getElementById('histFilterDate').value = today;
    if(document.getElementById('histFilterSeller')) document.getElementById('histFilterSeller').value = 'all';
    if(document.getElementById('historyPaymentFilter')) document.getElementById('historyPaymentFilter').value = 'all';
    currentPageHistory = 1; renderHistory();
}

let currentEditingReceipt = null; 
let originalEditingReceipt = null; // Asl nusxani saqlash uchun
let targetReceiptIdForSave = null; 
let isReceiptEdited = false;

function openReceiptModalView(id) {
    const receipt = historyDB.find(h => h.id === id); if (!receipt) return;
    currentEditingReceipt = JSON.parse(JSON.stringify(receipt)); renderReceiptView(); document.getElementById('receiptModal').classList.add('active');
}
function openReceiptModalEdit(id) {
    const receipt = historyDB.find(h => h.id === id); if (!receipt) return;
    currentEditingReceipt = JSON.parse(JSON.stringify(receipt)); 
    originalEditingReceipt = JSON.parse(JSON.stringify(receipt)); // Vozvratni hisoblash uchun
    isReceiptEdited = false; 
    renderReceiptEdit(); 
    document.getElementById('receiptModal').classList.add('active');
}
function closeReceiptModal() { 
    currentEditingReceipt = null; 
    originalEditingReceipt = null; 
    document.getElementById('receiptModal').classList.remove('active'); 
}

function renderReceiptView() {
    if (!currentEditingReceipt) return; const receipt = currentEditingReceipt;
    document.getElementById('receiptModalTitle').innerText = "Chek tafsilotlari";
    const content = document.getElementById('receiptDetailsContent'); const actions = document.getElementById('receiptModalActions');
    let subtotal = receipt.subtotal || receipt.items.reduce((s, i) => s + (i.price * i.qty), 0); let del = receipt.delivery || 0; let disc = receipt.discount || 0;
    let itemsHtml = receipt.items.map(item => `<div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding: 10px 0; font-size: 14px; align-items: center;"><div style="flex: 1;"><div style="font-weight: bold; color: var(--text-main); margin-bottom: 2px;">${escapeHtml(item.name)}</div><div style="font-size: 12px; color: var(--text-muted);">${item.qty} ${escapeHtml(item.unit || 'dona')} x ${formatMoney(item.price)} so'm</div></div><div style="font-weight: bold; color: var(--brand-dark); text-align: right; width: 110px;">${formatMoney(item.price * item.qty)} so'm</div></div>`).join('');
    let extraHtml = '';
    if (del > 0 || disc > 0) {
        extraHtml += `<hr style="border:0; border-top: 1px dashed var(--border-color); margin: 10px 0;"><div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px;"><span>Mahsulotlar:</span> <strong>${formatMoney(subtotal)} so'm</strong></div>`;
        if(del > 0) extraHtml += `<div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px;"><span>Dastavka:</span> <strong>${formatMoney(del)} so'm</strong></div>`;
        if(disc > 0) extraHtml += `<div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 14px; color: var(--danger);"><span>Chegirma:</span> <strong>-${formatMoney(disc)} so'm</strong></div>`;
    }
    content.innerHTML = `<div style="background: var(--table-header); padding: 12px; border-radius: 6px; margin-bottom: 15px; font-size: 14px; border: 1px solid var(--border-color);"><div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span><strong>Sana / Vaqt:</strong> ${escapeHtml(receipt.date)} | ${escapeHtml(receipt.time)}</span></div><div style="margin-bottom: 5px;"><strong>Sotuvchi:</strong> ${escapeHtml(receipt.sellerName)}</div><div style="font-size: 20px; margin-top: 10px; color: var(--brand-dark);"><strong>Jami: ${formatMoney(receipt.totalAmount)} so'm</strong></div></div>${itemsHtml}${extraHtml}`;
    actions.innerHTML = `<button onclick="printHistoricalReceipt(${receipt.id})" class="btn-print-outline" style="margin-right: auto; padding: 8px 12px; border: 1px solid var(--border-input); border-radius: 6px; background: transparent; cursor:pointer;">Chop etish</button>`;
}

function renderReceiptEdit() {
    if (!currentEditingReceipt) return; const receipt = currentEditingReceipt;
    document.getElementById('receiptModalTitle').innerText = "Chekni tahrirlash";
    const content = document.getElementById('receiptDetailsContent'); const actions = document.getElementById('receiptModalActions');
    let del = receipt.delivery || 0; let disc = receipt.discount || 0;
    let itemsHtml = receipt.items.map((item, index) => `<div style="display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding: 10px 0; font-size: 14px; align-items: center;"><div style="flex: 1;"><div style="font-weight: bold; color: var(--text-main); margin-bottom: 5px;">${escapeHtml(item.name)}</div><div style="display: flex; gap: 5px; align-items: center;"><input type="number" class="edit-input" style="width: 60px; text-align:center; padding: 5px;" value="${item.qty}" min="0" step="any" onchange="updateReceiptItem(${index}, 'qty', this.value)"> <span style="color: var(--text-muted); font-size: 12px;">${escapeHtml(item.unit || 'dona')} x</span><input type="text" class="edit-input" style="width: 90px; text-align:right; padding: 5px;" value="${formatMoney(item.price)}" oninput="updateReceiptItemPrice(${index}, this)"> <span style="color: var(--text-muted); font-size: 12px;">so'm</span></div></div><div style="font-weight: bold; color: var(--brand-dark); text-align: right; width: 110px;">${formatMoney(item.price * item.qty)} so'm <button onclick="deleteReceiptItem(${index})" style="background: rgba(231, 76, 60, 0.1); border: 1px solid #e74c3c; color: #e74c3c; cursor: pointer; padding: 4px 8px; border-radius: 4px; margin-left: 8px; transition: 0.2s;" title="O'chirish">X</button></div></div>`).join('');
    let extraHtml = `<hr style="border:0; border-top: 1px dashed var(--border-color); margin: 10px 0;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 14px;"><span>Dastavka:</span> <div><input type="text" class="edit-input" style="width: 100px; text-align: right; font-weight: bold; padding: 5px;" value="${del === 0 ? '0' : formatMoney(del)}" oninput="updateReceiptExtra('delivery', this.value, this)"> so'm</div></div><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; font-size: 14px; color: var(--danger);"><span>Chegirma:</span> <div><input type="text" class="edit-input" style="width: 100px; text-align: right; color: var(--danger); font-weight: bold; border-color: rgba(231,76,60,0.4); padding: 5px;" value="${disc === 0 ? '0' : formatMoney(disc)}" oninput="updateReceiptExtra('discount', this.value, this)"> so'm</div></div>`;
    content.innerHTML = `<div style="background: var(--table-header); padding: 12px; border-radius: 6px; margin-bottom: 15px; font-size: 14px; border: 1px solid var(--border-color);"><div style="margin-bottom: 5px;"><strong>Sana / Vaqt:</strong> ${escapeHtml(receipt.date)} | ${escapeHtml(receipt.time)}</div><div style="margin-bottom: 5px;"><strong>Sotuvchi:</strong> ${escapeHtml(receipt.sellerName)}</div><div style="font-size: 20px; margin-top: 10px; color: #27ae60;"><strong>Jami: <span id="editReceiptTotalAmount">${formatMoney(receipt.totalAmount)} so'm</span></strong></div></div>${itemsHtml}${extraHtml}`;
    actions.innerHTML = `<div style="display: flex; gap: 10px; margin-right: auto;"><button onclick="printHistoricalReceipt(${receipt.id})" style="padding: 8px 12px; border: 1px solid var(--border-input); border-radius: 6px; background: transparent; cursor:pointer;">Chop etish</button><button id="btnSaveReceiptEdit" onclick="openPasswordModal(${receipt.id})" style="padding: 8px 12px; border: 1px solid #f39c12; border-radius: 6px; background: rgba(243,156,18,0.1); color: #f39c12; cursor:pointer; font-weight:bold; ${!isReceiptEdited ? 'opacity: 0.4; cursor: not-allowed;' : ''}" ${!isReceiptEdited ? 'disabled' : ''}>Saqlash</button></div>`;
}

function updateReceiptExtra(field, value, el) { let rawVal = value.replace(/\D/g, ''); let numVal = rawVal === '' ? 0 : parseInt(rawVal); let caretPos = el.selectionStart; let oldLen = el.value.length; el.value = rawVal === '' ? '' : formatMoney(numVal); el.setSelectionRange(caretPos + (el.value.length - oldLen), caretPos + (el.value.length - oldLen)); currentEditingReceipt[field] = numVal; isReceiptEdited = true; recalculateReceiptTotal(); }
function updateReceiptItemPrice(index, el) { let rawVal = el.value.replace(/\D/g, ''); let numVal = rawVal === '' ? 0 : parseInt(rawVal); let caretPos = el.selectionStart; let oldLen = el.value.length; el.value = rawVal === '' ? '' : formatMoney(numVal); el.setSelectionRange(caretPos + (el.value.length - oldLen), caretPos + (el.value.length - oldLen)); currentEditingReceipt.items[index].price = numVal; isReceiptEdited = true; recalculateReceiptTotal(); }
function updateReceiptItem(index, field, value) { let rawVal = value.replace(/[^\d.]/g, ''); currentEditingReceipt.items[index][field] = parseFloat(rawVal) || 0; isReceiptEdited = true; recalculateReceiptTotal(); }
function deleteReceiptItem(index) { 
    currentEditingReceipt.items.splice(index, 1); 
    isReceiptEdited = true; 
    recalculateReceiptTotal(); 
    renderReceiptEdit(); 
}
function recalculateReceiptTotal() {
    let sub = currentEditingReceipt.items.reduce((sum, item) => sum + (item.price * item.qty), 0); let d = currentEditingReceipt.delivery || 0; let dis = currentEditingReceipt.discount || 0;
    currentEditingReceipt.totalAmount = Math.max(0, sub + d - dis);
    if(document.getElementById('editReceiptTotalAmount')) document.getElementById('editReceiptTotalAmount').innerText = formatMoney(currentEditingReceipt.totalAmount) + " so'm";
    let saveBtn = document.getElementById('btnSaveReceiptEdit');
    if(saveBtn && saveBtn.disabled) { saveBtn.disabled = false; saveBtn.style.opacity = "1"; saveBtn.style.cursor = "pointer"; }
}

function printHistoricalReceipt(id) {
    const receipt = (currentEditingReceipt && currentEditingReceipt.id === id) ? currentEditingReceipt : historyDB.find(h => h.id === id); if (!receipt) return;
    let method = receipt.paymentMethod || 'naqd'; let methodStr = "Naqd pul"; if (method === 'karta') methodStr = "Karta (Humo/Uzcard)"; if (method === 'visa') methodStr = "Visa / Mastercard"; if (method === 'nasiya') methodStr = "Nasiya (Qarz)";
    let subtotal = receipt.subtotal || receipt.items.reduce((s, i) => s + (i.price * i.qty), 0); let delivery = receipt.delivery || 0; let discount = receipt.discount || 0; let total = receipt.totalAmount;
    let storeName = localStorage.getItem('r04_admin_name_' + STORE_ID) || "DUBLIKAT CHEK"; 
    const receiptWindow = window.open('', '_blank', 'width=300,height=600');
    let itemsHtml = receipt.items.map(item => `<tr><td style="padding: 5px 0;">${escapeHtml(item.name)}<br><small>${item.qty} ${escapeHtml(item.unit || 'dona')} x ${formatMoney(item.price)}</small></td><td style="text-align: right;">${formatMoney(item.price * item.qty)}</td></tr>`).join('');
    let extrasHtml = '';
    if(delivery > 0) extrasHtml += `<p>Dastavka: <span style="float:right;">${formatMoney(delivery)} so'm</span></p>`;
    if(discount > 0) extrasHtml += `<p>Chegirma: <span style="float:right;">-${formatMoney(discount)} so'm</span></p>`;
    receiptWindow.document.write(`<html><head><title>Check - r.04</title><style>body { font-family: 'Courier New', monospace; font-size: 13px; width: 260px; margin: 10px; } table { width: 100%; border-top: 1px dashed #000; border-collapse: collapse; } .center { text-align: center; } hr { border: none; border-top: 1px dashed #000; }</style></head><body><h2 class="center" style="margin-bottom: 5px;">${escapeHtml(storeName.toUpperCase())}</h2><p class="center" style="margin-top: 0; font-size: 11px;">DUBLIKAT</p><p class="center" style="margin-top: 0;">Sana: ${escapeHtml(receipt.date)} <br>Vaqt: ${escapeHtml(receipt.time)}</p><p>Sotuvchi: ${escapeHtml(receipt.sellerName)}</p><hr><table><thead><tr><th align="left">Mahsulot</th><th align="right">Summa</th></tr></thead><tbody>${itemsHtml}</tbody></table><hr><p><b>Mahsulotlar: <span style="float:right;">${formatMoney(subtotal)} so'm</span></b></p>${extrasHtml}<hr><p style="font-size: 16px;"><b>JAMI: <span style="float:right;">${formatMoney(total)} so'm</span></b></p><p>To'lov turi: <span style="float:right;"><b>${methodStr}</b></span></p><hr><p class="center">Xaridingiz uchun rahmat!</p><script>window.onload = function() { window.print(); window.close(); };<\/script></body></html>`);
    receiptWindow.document.close();
}

// XAVFSIZLIK (PAROL BILAN TASDIQLASH)
let secureActionType = null; 
function openPasswordModal(id) {
    secureActionType = 'save_receipt'; targetReceiptIdForSave = id; document.getElementById('adminPasswordInput').value = ''; 
    document.getElementById('passwordModal').classList.add('active'); setTimeout(() => document.getElementById('adminPasswordInput').focus(), 100); 
}
function requestHistoryClear() {
    if (historyDB.length === 0) return showCustomAlert("Tarix shundoq ham bo'sh!");
    showCustomConfirm("DIQQAT! Barcha savdo tarixi butunlay o'chib ketadi. Buni ortga qaytarib bo'lmaydi. Ishonchingiz komilmi?", () => {
        secureActionType = 'clear_history'; document.getElementById('adminPasswordInput').value = '';
        document.getElementById('passwordModal').classList.add('active'); setTimeout(() => document.getElementById('adminPasswordInput').focus(), 100);
    }, "Tarixni tozalash");
}
function closePasswordModal() { document.getElementById('passwordModal').classList.remove('active'); }

function submitPassword() {
    const password = document.getElementById('adminPasswordInput').value;
    let email = firebase.auth().currentUser ? firebase.auth().currentUser.email : "";
    if(!email || !password) return showCustomAlert("Parol bo'sh bo'lishi mumkin emas!", "Xatolik");
    
    // Tahrirlandi: Loader ni olib tashladik
    firebase.auth().signInWithEmailAndPassword(email, password).then(() => {
        closePasswordModal(); 
        if (secureActionType === 'clear_history') actuallyClearHistory();
        else if (secureActionType === 'save_receipt') actuallySaveReceipt(); 
    }).catch(e => {
        showCustomAlert("Parol xato!", "Xatolik");
    });
}

function actuallySaveReceipt() {
    if(!STORE_ID) return;
    let loader = document.getElementById('globalLoader'); if(loader) loader.style.display = 'flex'; 

    // 1. CHEKDAN 0 TA QOLGAN MAHSULOTLARNI AVTOMAT TOZALASH
    currentEditingReceipt.items = currentEditingReceipt.items.filter(item => item.qty > 0);

    let returnItems = [];
    let totalRefundSum = 0;
    
    if (!currentEditingReceipt.items) currentEditingReceipt.items = [];

    // 2. VOZVRATNI ANIQLASH (Eski va Yangi holatni solishtirish)
    originalEditingReceipt.items.forEach(origItem => {
        let currItem = currentEditingReceipt.items.find(i => 
            (i.code && origItem.code && i.code === origItem.code) || 
            (i.name && origItem.name && i.name === origItem.name)
        );
        
        let origQty = Number(origItem.qty) || 0;
        let currQty = currItem ? (Number(currItem.qty) || 0) : 0; 
        
        if (origQty > currQty) {
            let diffQty = origQty - currQty;
            returnItems.push({
                code: origItem.code || "KOD-YOQ",
                name: origItem.name,
                qty: diffQty, 
                price: origItem.price
            });
            totalRefundSum += (diffQty * origItem.price);
        }
    });

    // 3. OMBOR VA KASSANI YANGILASH
    if (returnItems.length > 0) {
        let invLogItems = [];
        
        returnItems.forEach(retItem => {
            let pIndex = productsDB.findIndex(p => 
                (p.code && retItem.code && p.code === retItem.code) || 
                (p.name && retItem.name && p.name === retItem.name)
            );

            if(pIndex !== -1) {
                // Ombordagi eski qoldiqni olib, ustiga qo'shamiz
                let oldStock = Number(productsDB[pIndex].stock) || 0;
                let newStock = oldStock + retItem.qty; 
                
                productsDB[pIndex].stock = newStock; 
                
                invLogItems.push({ 
                    code: productsDB[pIndex].code || retItem.code, 
                    name: productsDB[pIndex].name || retItem.name, 
                    oldQty: oldStock, 
                    newQty: newStock 
                });
            }
        });
        
        // Bazaga zudlik bilan saqlash
        database.ref('clients/' + STORE_ID + '/products').set(productsDB);

        // ⚠️ XATO SHU YERDA TUZATILDI: Ombor tarixiga yozish
        // Endi har bir vozvrat qilingan mahsulot alohida o'z nomi va soni bilan yoziladi
        if (invLogItems.length > 0) {
            invLogItems.forEach(logItem => {
                logInventoryHistory(
                    "Vozvrat", 
                    logItem.code, 
                    logItem.name, 
                    logItem.oldQty, 
                    logItem.newQty, 
                    `Savdo ID: ${currentEditingReceipt.id} dan vozvrat`
                );
            });
        }

        // Sotuvchi pulini ayirish
        let dStr = new Date(); let todayStr = dStr.getFullYear() + '-' + String(dStr.getMonth()+1).padStart(2,'0') + '-' + String(dStr.getDate()).padStart(2,'0');
        if (originalEditingReceipt.date === todayStr) {
            let sIndex = sellersDB.findIndex(s => s.name === currentEditingReceipt.sellerName);
            if (sIndex !== -1 && sellersDB[sIndex].lastSaleDate === todayStr) {
                let newRev = Math.max(0, (Number(sellersDB[sIndex].revenue) || 0) - totalRefundSum);
                sellersDB[sIndex].revenue = newRev;
                database.ref('clients/' + STORE_ID + '/sellers').set(sellersDB);
            }
        }
    }

    // 4. CHEKNI BAZAGA YOZISH YOKI O'CHIRISH
    database.ref('clients/' + STORE_ID + '/history').orderByChild('id').equalTo(targetReceiptIdForSave).once('value', snap => {
        if (snap.exists()) {
            let key = Object.keys(snap.val())[0]; 
            
            // Jami summani hisoblash
            let finalSubtotal = currentEditingReceipt.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
            let finalTotal = Math.max(0, finalSubtotal + (currentEditingReceipt.delivery || 0) - (currentEditingReceipt.discount || 0));
            currentEditingReceipt.totalAmount = finalTotal;

            if (currentEditingReceipt.items.length === 0 || finalTotal <= 0) {
                // Chek nolga tushdi
                database.ref('clients/' + STORE_ID + '/history/' + key).remove().then(() => {
                    if (loader) loader.style.display = 'none';
                    closeReceiptModal(); 
                    showCustomAlert("Mahsulotlar vozvrat qilindi va 0 summalik chek tarixdan o'chirildi!", "Bajarildi");
                });
            } else {
                // Qisman saqlandi
                database.ref('clients/' + STORE_ID + '/history/' + key).set(currentEditingReceipt).then(() => {
                    if (loader) loader.style.display = 'none';
                    closeReceiptModal(); 
                    showCustomAlert("O'zgarishlar saqlandi va vozvrat amalga oshirildi!", "Bajarildi");
                });
            }
        } else { 
            if (loader) loader.style.display = 'none';
            closeReceiptModal(); 
            showCustomAlert("Bunday chek topilmadi!", "Xatolik"); 
        }
    });
}

function actuallyClearHistory() {
    if(!STORE_ID) return;
    let loader = document.getElementById('globalLoader'); if(loader) loader.style.display = 'flex';
    database.ref('clients/' + STORE_ID + '/history').remove().then(() => {
        if(loader) loader.style.display = 'none'; showCustomAlert("Tarix muvaffaqiyatli tozalandi!", "Bajarildi"); historyDB = []; renderHistory(); 
    }).catch(err => { if(loader) loader.style.display = 'none'; showCustomAlert("Xatolik yuz berdi: " + err.message, "Xatolik"); });
}

// --- QARZ DAFTARI ---
function renderDebts() {
    const tbody = document.getElementById('debtsBody'); if(!tbody) return;
    const search = (document.getElementById('debtSearch').value || "").toLowerCase();
    let filtered = debtsDB.filter(d => (d.name||"").toLowerCase().includes(search)); filtered.sort((a,b) => b.amount - a.amount); 
    
    let total = filtered.reduce((s, d) => s + d.amount, 0);
    if(document.getElementById('totalDebtAmount')) document.getElementById('totalDebtAmount').innerText = formatMoney(total) + " so'm";
    if(filtered.length === 0) { tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-muted);">Qarzdorlar topilmadi</td></tr>`; return; }

    tbody.innerHTML = filtered.map(d => {
        let created = new Date(d.lastUpdate); let due = new Date(created); due.setDate(due.getDate() + (d.daysLimit || 15));
        let dueStr = `${due.getFullYear()}-${String(due.getMonth()+1).padStart(2,'0')}-${String(due.getDate()).padStart(2,'0')}`;
        let isLate = new Date() > due; let dateColor = isLate ? "color: var(--danger); font-weight: bold;" : "color: var(--text-muted);";
        return `<tr>
            <td style="font-weight:bold; color:var(--text-dark);">${escapeHtml(d.name)}</td><td>${escapeHtml(d.phone)}</td>
            <td style="font-weight:bold; color:var(--danger); font-size: 16px;">${formatMoney(d.amount)} so'm</td>
            <td style="${dateColor}">${dueStr} <br><span style="font-size:11px;">(${d.daysLimit} kun)</span></td>
            <td style="text-align:right;"><button class="btn-edit" style="color:var(--success); border-color:rgba(39, 174, 96, 0.4);" onclick="openDebtPaymentModal('${d.id}')">To'lov qilish</button></td>
        </tr>`;
    }).join('');
}

let currentDebtId = null;
function openDebtPaymentModal(id) {
    const d = debtsDB.find(x => x.id === id); if(!d) return; currentDebtId = id;
    document.getElementById('payDebtName').innerText = d.name; document.getElementById('payDebtBalance').innerText = formatMoney(d.amount);
    document.getElementById('payDebtAmount').value = ''; document.getElementById('payDebtPassword').value = ''; document.getElementById('payDebtError').innerText = ''; 
    const sellerSelect = document.getElementById('payDebtSeller');
    if(sellerSelect) { let html = sellersDB.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join(''); html += `<option value="Admin" selected>Admin (Tizim)</option>`; sellerSelect.innerHTML = html; }
    document.getElementById('debtPaymentModal').classList.add('active');
}
function closeDebtPaymentModal() { document.getElementById('debtPaymentModal').classList.remove('active'); }

function confirmDebtPayment() {
    if(!STORE_ID) return;
    const pass = document.getElementById('payDebtPassword').value; let email = firebase.auth().currentUser ? firebase.auth().currentUser.email : ""; const errEl = document.getElementById('payDebtError');
    if(!email || !pass) { errEl.innerText = "Iltimos, parolni kiriting!"; return; }
    const payAmount = parseInt(document.getElementById('payDebtAmount').value.replace(/\D/g, '')) || 0;
    if(payAmount <= 0) { errEl.innerText = "To'lov summasini kiriting!"; return; }
    const d = debtsDB.find(x => x.id === currentDebtId);
    if(payAmount > d.amount) { errEl.innerText = "Kiritilgan summa qarzdan ko'p bo'lishi mumkin emas!"; return; }
    errEl.innerText = "";
    let loader = document.getElementById('globalLoader'); if(loader) loader.style.display = 'flex';

    firebase.auth().signInWithEmailAndPassword(email, pass).then(() => {
        const now = new Date();
        const hData = { id: Date.now(), date: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`, time: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`, sellerName: "Admin (Qarz undirildi)", totalAmount: payAmount, paymentMethod: 'naqd', items: [{code: 'QARZ', name: `Qarz to'lovi: ${d.name}`, qty: 1, price: payAmount, unit: 'tolov'}] };
        const selectedSeller = document.getElementById('payDebtSeller') ? document.getElementById('payDebtSeller').value : "Admin"; hData.sellerName = selectedSeller + " (Qarz undirildi)";
        if (selectedSeller !== "Admin") {
            let sIndex = sellersDB.findIndex(s => s.name === selectedSeller);
            if (sIndex !== -1) {
                let dStr = new Date(); let todayStr = dStr.getFullYear() + '-' + String(dStr.getMonth()+1).padStart(2,'0') + '-' + String(dStr.getDate()).padStart(2,'0');
                if (sellersDB[sIndex].lastSaleDate !== todayStr) { sellersDB[sIndex].revenue = 0; sellersDB[sIndex].lastSaleDate = todayStr; }
                sellersDB[sIndex].revenue = (Number(sellersDB[sIndex].revenue) || 0) + payAmount; database.ref('clients/' + STORE_ID + '/sellers').set(sellersDB);
            }
        }
        return database.ref('clients/' + STORE_ID + '/history/' + hData.id).set(hData).then(() => {
            let newAmount = d.amount - payAmount;
            if(newAmount <= 0) return database.ref('clients/' + STORE_ID + '/debts/' + currentDebtId).remove();
            else return database.ref('clients/' + STORE_ID + '/debts/' + currentDebtId).update({amount: newAmount, lastUpdate: new Date().toISOString()});
        });
    }).then(() => {
        if(loader) loader.style.display = 'none'; closeDebtPaymentModal(); showCustomAlert("Qarz to'lovi muvaffaqiyatli qabul qilindi!", "Bajarildi");
    }).catch(e => {
        if(loader) loader.style.display = 'none'; errEl.innerText = "Parol xato yoki tarmoqda xatolik!";
    });
}

// --- MOLIYA VA XARAJATLAR ---
let currentFinanceView = 'main';

function showFinanceView(viewName) {
    currentFinanceView = viewName;
    ['financeMainView', 'financeProfitView', 'financeExpensesView', 'financeRealizedProfitView'].forEach(id => { if(document.getElementById(id)) document.getElementById(id).style.display = 'none'; });
    let bc = document.getElementById('financeBreadcrumb'); let bcText = document.getElementById('financeBreadcrumbText');

    if(viewName === 'main') {
        if(bc) bc.style.display = 'none'; document.getElementById('financeMainView').style.display = 'block'; updateFinanceInfo();
    } else {
        if(bc) bc.style.display = 'flex';
        if(viewName === 'profit') { bcText.innerText = "Kutilayotgan Sof Foyda"; document.getElementById('financeProfitView').style.display = 'block'; renderFinanceProfit(); } 
        else if(viewName === 'expenses') { bcText.innerText = "Xarajatlar Daftari"; document.getElementById('financeExpensesView').style.display = 'block'; renderExpCats(); } 
        else if(viewName === 'realized_profit') {
            bcText.innerText = "Haqiqiy Sof Foyda (Tarix bo'yicha)"; document.getElementById('financeRealizedProfitView').style.display = 'block';
            let dateInput = document.getElementById('realizedProfitDate');
            if (!dateInput.value) { let d = new Date(); dateInput.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
            enforceMaxDate(dateInput); renderFinanceRealizedProfit();
        }
    }
}

function updateFinanceInfo() {
    let expectedProfit = 0;
    productsDB.forEach(p => { let s = p.stock || 0; let price = p.price || 0; let cost = p.costPrice || 0; if(s > 0) expectedProfit += ((price - cost) * s); });
    let totalExp = expTxDB.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    let realizedProfit = 0;
    historyDB.forEach(h => {
        if (h.paymentMethod !== 'nasiya') { 
            let receiptProfit = 0; let validItemsForProfit = 0;
            (h.items || []).forEach(item => {
                let p = productsDB.find(x => String(x.code) === String(item.code)); let cost = p ? (Number(p.costPrice) || 0) : 0;
                if(cost > 0) { receiptProfit += ((Number(item.price) || 0) - cost) * (Number(item.qty) || 0); validItemsForProfit++; }
            });
            if (validItemsForProfit > 0) { let discount = Number(h.discount) || 0; receiptProfit -= discount; }
            if(receiptProfit > 0) realizedProfit += receiptProfit;
        }
    });

    if(document.getElementById('finNetProfit')) document.getElementById('finNetProfit').innerText = formatMoney(expectedProfit) + " so'm";
    if(document.getElementById('finTotalExpenses')) document.getElementById('finTotalExpenses').innerText = formatMoney(totalExp) + " so'm";
    if(document.getElementById('finRealizedProfit')) document.getElementById('finRealizedProfit').innerText = formatMoney(realizedProfit) + " so'm";
}

let finProfSort = { field: 'total', order: 'desc' };
function applyFinanceFilter(type) {
    if (type === 'profit') { finProfSort.field = document.getElementById('profFilterField').value; finProfSort.order = document.getElementById('profFilterOrder').value; renderFinanceProfit(); }
}

function renderFinanceProfit() {
    const tbody = document.getElementById('finProfBody'); if(!tbody) return;
    let arr = productsDB.filter(p => (p.costPrice || 0) > 0); 
    arr.sort((a,b) => {
        let cpA = a.costPrice||0; let cpB = b.costPrice||0; let vA, vB;
        if(finProfSort.field === 'qty') { vA = a.stock; vB = b.stock; } else if(finProfSort.field === 'margin') { vA = a.price - cpA; vB = b.price - cpB; } else { vA = a.stock * (a.price - cpA); vB = b.stock * (b.price - cpB); }
        return finProfSort.order === 'asc' ? vA - vB : vB - vA;
    });
    tbody.innerHTML = arr.map(p => {
        let cost = p.costPrice || 0; let margin = p.price - cost; let total = margin * p.stock;
        return `<tr><td><div style="font-weight:bold; color: var(--text-dark);">${escapeHtml(p.name)}</div><div style="font-size:11px;color:var(--text-muted)">KOD: ${escapeHtml(p.code)}</div></td><td style="font-weight:bold;">${p.stock} ${escapeHtml(p.unit||'dona')}</td><td style="color:var(--danger);">${formatMoney(cost)} so'm</td><td>${formatMoney(p.price)} so'm</td><td style="color:var(--success);">${formatMoney(margin)} so'm</td><td style="color:var(--success); font-weight:bold; font-size:16px;">${formatMoney(total)} so'm</td></tr>`;
    }).join('');
}

function renderFinanceRealizedProfit() {
    const tbody = document.getElementById('finRealizedProfitBody'); if(!tbody) return;
    let html = ''; let dateFilter = document.getElementById('realizedProfitDate').value;
    let filteredHistory = dateFilter ? historyDB.filter(h => String(h.date) === String(dateFilter)) : historyDB;

    filteredHistory.forEach(h => {
        if(h.paymentMethod !== 'nasiya') {
            let receiptProfit = 0; let costSum = 0; let validItemsForProfit = 0;
            (h.items || []).forEach(item => {
                let p = productsDB.find(x => String(x.code) === String(item.code)); let cost = p ? (Number(p.costPrice) || 0) : 0;
                if(cost > 0) { receiptProfit += ((Number(item.price) || 0) - cost) * (Number(item.qty) || 0); costSum += cost * (Number(item.qty) || 0); validItemsForProfit++; }
            });
            if (validItemsForProfit > 0) receiptProfit -= (Number(h.discount) || 0);
            if(receiptProfit > 0) {
                html += `<tr><td>${escapeHtml(h.date)} <span style="color:var(--text-muted); font-size:12px;">${escapeHtml(h.time)}</span></td><td>${escapeHtml(h.sellerName)}</td><td style="font-weight:bold;">${formatMoney(h.totalAmount)} so'm</td><td style="color: var(--danger);">${formatMoney(costSum)} so'm</td><td style="color: var(--success); font-weight:bold; font-size:16px;">${formatMoney(receiptProfit)} so'm</td><td style="text-align:right;"><button class="btn-edit" onclick="openReceiptModalView(${h.id})">Batafsil</button></td></tr>`;
            }
        }
    });
    if(html === '') html = `<tr><td colspan="6" style="text-align:center; padding: 20px; color: var(--text-muted);">Ushbu sanada sof foyda topilmadi</td></tr>`;
    tbody.innerHTML = html;
}

// --- XARAJATLAR TIZIMI ---
function openExpCatModal() { document.getElementById('expCatModalTitle').innerText = "Yangi Bo'lim"; document.getElementById('expCatId').value = ''; document.getElementById('expCatType').value = 'korxona'; document.getElementById('expCatName').value = ''; document.getElementById('expCatPhone').value = ''; document.getElementById('expCatPerson').value = ''; toggleExpCatFields(); document.getElementById('expCatModal').classList.add('active'); }
function openEditExpCat(id) { const c = expCatsDB.find(x => x.id === id); if(!c) return; document.getElementById('expCatModalTitle').innerText = "Bo'limni Tahrirlash"; document.getElementById('expCatId').value = c.id; document.getElementById('expCatType').value = c.type; document.getElementById('expCatName').value = c.name; document.getElementById('expCatPhone').value = c.phone || ''; document.getElementById('expCatPerson').value = c.person || ''; toggleExpCatFields(); document.getElementById('expCatModal').classList.add('active'); }
function toggleExpCatFields() {
    let val = document.getElementById('expCatType').value; let extra = document.getElementById('expCatExtraFields'); let nameLabel = document.getElementById('expCatNameLabel'); let nameInput = document.getElementById('expCatName');
    if(val === 'korxona') { extra.style.display = 'block'; nameLabel.innerText = "Korxona yoki Firma nomini kiriting"; nameInput.placeholder = "Masalan: Optom 1, Imkon Savdo..."; } 
    else if(val === 'soliq') { extra.style.display = 'none'; nameLabel.innerText = "Soliq turi nomini kiriting"; nameInput.placeholder = "Masalan: Daromad solig'i, Yer solig'i..."; } 
    else { extra.style.display = 'none'; nameLabel.innerText = "Texnika turi nomini kiriting"; nameInput.placeholder = "Masalan: Xolodilnik ta'miri, Konditsioner..."; }
}
function closeExpCatModal() { document.getElementById('expCatModal').classList.remove('active'); }

function saveExpCat() {
    let id = document.getElementById('expCatId').value; 
    let type = document.getElementById('expCatType').value; 
    let name = document.getElementById('expCatName').value.trim(); 
    let phone = document.getElementById('expCatPhone').value.trim(); 
    let person = document.getElementById('expCatPerson').value.trim();
    
    if(!name) return showCustomAlert("Nom kiritilishi shart!", "Xatolik");

    let loader = document.getElementById('globalLoader'); 
    if(loader) loader.style.display = 'flex';

    if(!id) {
        id = "cat_" + Date.now();
        expCatsDB.push({ id, type, name, phone: type === 'korxona' ? phone : '', person: type === 'korxona' ? person : '' });
    } else {
        let idx = expCatsDB.findIndex(c => c.id === id);
        if(idx !== -1) expCatsDB[idx] = { id, type, name, phone: type === 'korxona' ? phone : '', person: type === 'korxona' ? person : '' };
    }

    if(!STORE_ID) return;
    database.ref('clients/' + STORE_ID + '/expense_cats').set(expCatsDB).then(() => { 
        if(loader) loader.style.display = 'none'; 
        closeExpCatModal(); 
    }).catch(err => { 
        if(loader) loader.style.display = 'none'; 
        showCustomAlert("Xato: " + err.message, "Xatolik"); 
    });
}

function deleteExpCat(id) {
    showCustomConfirm("Ushbu bo'limni va unga tegishli barcha chiqimlarni butunlay o'chirasizmi?", () => {
        let loader = document.getElementById('globalLoader'); 
        if(loader) loader.style.display = 'flex';
        
        expCatsDB = expCatsDB.filter(c => c.id !== id);
        expTxDB = expTxDB.filter(tx => tx.catId !== id);
        
        if(!STORE_ID) return;
        Promise.all([
            database.ref('clients/' + STORE_ID + '/expense_cats').set(expCatsDB),
            database.ref('clients/' + STORE_ID + '/expense_tx').set(expTxDB)
        ]).then(() => { 
            if(loader) loader.style.display = 'none'; 
        }).catch(err => {
            if(loader) loader.style.display = 'none'; 
            showCustomAlert("Xato: " + err.message, "Xatolik");
        });
    });
}

function renderExpCats() {
    const tbody = document.getElementById('expCatsBody'); if(!tbody) return;
    const filter = document.getElementById('expCatFilter').value; const search = document.getElementById('expCatSearch').value.toLowerCase();
    
    let arr = expCatsDB.filter(c => { 
        if (filter !== 'all' && c.type !== filter) return false; 
        if (search && !(c.name||"").toLowerCase().includes(search)) return false; 
        return true; 
    });
    
    if (arr.length === 0) { tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 30px;">Ma'lumot topilmadi</td></tr>`; return; }
    
    tbody.innerHTML = arr.map(c => {
        let typeStr = c.type === 'korxona' ? '🏢 Korxona' : (c.type === 'soliq' ? '🏛 Soliq' : '⚙️ Texnika');
        let totalExp = expTxDB.filter(tx => tx.catId === c.id).reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
        return `<tr><td><span class="status-badge" style="background:var(--table-header); color:var(--text-main); border:1px solid var(--border-color); width:auto;">${typeStr}</span></td><td><div style="font-weight:bold; color:var(--text-dark);">${escapeHtml(c.name)}</div><div style="font-size:11px; color:var(--text-muted); margin-top: 4px;">${c.phone ? 'Tel: ' + escapeHtml(c.phone) : ''} ${c.person ? '| Shaxs: ' + escapeHtml(c.person) : ''}</div></td><td style="color:var(--danger); font-weight:bold; font-size:16px;">${formatMoney(totalExp)} so'm</td><td style="text-align:right; white-space: nowrap;"><button class="btn-edit" style="color:var(--brand-color); border-color:rgba(52, 152, 219, 0.4);" onclick="openExpHistoryModal('${c.id}', '${escapeHtml(c.name)}')">Tarix & Chiqim</button><button class="btn-edit" style="color:#f39c12; border-color:#f39c12;" onclick="openEditExpCat('${c.id}')">Tahrirlash</button><button class="btn-delete" onclick="deleteExpCat('${c.id}')">O'chirish</button></td></tr>`;
    }).join('');
}

function openExpHistoryModal(id, name) { currentOpenExpCatId = id; document.getElementById('expHistoryTitle').innerText = name + " - Chiqimlar"; currentPageExpTx = 1; renderExpTx(); document.getElementById('expHistoryModal').classList.add('active'); }
function closeExpHistoryModal() { currentOpenExpCatId = null; document.getElementById('expHistoryModal').classList.remove('active'); }

function renderExpTx() {
    const tbody = document.getElementById('expHistoryBody'); if(!tbody) return;
    let filtered = expTxDB.filter(tx => tx.catId === currentOpenExpCatId);
    
    const totalPages = Math.ceil(filtered.length / itemsPerPageExpTx) || 1; if(currentPageExpTx > totalPages) currentPageExpTx = totalPages;
    const startIdx = (currentPageExpTx - 1) * itemsPerPageExpTx; const paginatedItems = filtered.slice(startIdx, startIdx + itemsPerPageExpTx);
    
    document.getElementById('pageInfoExpTx').innerText = `${currentPageExpTx} / ${totalPages}`; document.getElementById('prevBtnExpTx').disabled = currentPageExpTx === 1; document.getElementById('nextBtnExpTx').disabled = currentPageExpTx === totalPages;
    
    if (paginatedItems.length === 0) { tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">Chiqimlar mavjud emas</td></tr>`; return; }
    
    tbody.innerHTML = paginatedItems.map(tx => { 
        let d = new Date(tx.timestamp); let dStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; 
        return `<tr><td style="white-space:nowrap; font-weight:bold;">${dStr}</td><td>${escapeHtml(tx.note || '-')}</td><td style="color:var(--danger); font-weight:bold; white-space:nowrap;">${formatMoney(tx.amount)} so'm</td><td style="text-align:right;"><button class="btn-delete" style="padding:4px 8px; font-size:11px;" onclick="deleteExpTx('${tx.id}')">O'chirish</button></td></tr>`; 
    }).join('');
}

function prevPageExpTx() { if(currentPageExpTx > 1) { currentPageExpTx--; renderExpTx(); } }
function nextPageExpTx() { currentPageExpTx++; renderExpTx(); }
function openExpTxModal() { document.getElementById('expTxAmount').value = ''; document.getElementById('expTxNote').value = ''; let d = new Date(); document.getElementById('expTxDate').value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; document.getElementById('expTxModal').classList.add('active'); }
function closeExpTxModal() { document.getElementById('expTxModal').classList.remove('active'); }

function saveExpTx() {
    if(!currentOpenExpCatId || !STORE_ID) return;
    let amount = parseInt(document.getElementById('expTxAmount').value.replace(/\D/g, '')) || 0; 
    let note = document.getElementById('expTxNote').value.trim(); 
    let dateVal = document.getElementById('expTxDate').value;

    if(amount <= 0) return showCustomAlert("Iltimos, summani kiriting!", "Diqqat");

    let ts = dateVal ? new Date(dateVal).getTime() : Date.now(); 
    let id = "tx_" + Date.now() + Math.floor(Math.random() * 100);

    let data = { id, catId: currentOpenExpCatId, amount, note, timestamp: ts };
    expTxDB.push(data);

    let loader = document.getElementById('globalLoader'); 
    if(loader) loader.style.display = 'flex';
    
    database.ref('clients/' + STORE_ID + '/expense_tx').set(expTxDB).then(() => { 
        if(loader) loader.style.display = 'none'; 
        closeExpTxModal(); 
    }).catch(err => {
        if(loader) loader.style.display = 'none'; 
        showCustomAlert("Xato: " + err.message, "Xatolik");
    });
}

function deleteExpTx(id) { 
    showCustomConfirm("Ushbu chiqimni o'chirasizmi?", () => { 
        let loader = document.getElementById('globalLoader'); 
        if(loader) loader.style.display = 'flex'; 
        
        expTxDB = expTxDB.filter(tx => tx.id !== id);
        
        if(!STORE_ID) return;
        database.ref('clients/' + STORE_ID + '/expense_tx').set(expTxDB).then(() => { 
            if(loader) loader.style.display = 'none'; 
        }).catch(err => {
            if(loader) loader.style.display = 'none'; 
            showCustomAlert("Xato: " + err.message, "Xatolik");
        }); 
    }); 
}

// --- KAM QOLGAN MAHSULOTLARNI CHOP ETISH ---
function printLowStock() {
    const lowStockItems = productsDB.filter(p => (Number(p.stock)||0) <= (p.warning !== undefined ? p.warning : 5));
    
    if (lowStockItems.length === 0) {
        showCustomAlert("Chop etish uchun kam qolgan mahsulotlar yo'q!", "Ma'lumot");
        return;
    }
    
    let storeName = localStorage.getItem('r04_admin_name_' + STORE_ID) || "R.04 - Boshqaruv";
    let d = new Date();
    let dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    
    let html = `
    <html>
    <head>
        <title>Kam qolgan mahsulotlar</title>
        <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h2 { text-align: center; margin-bottom: 5px; color: #2c3e50; }
            .date { text-align: center; font-size: 12px; color: #7f8c8d; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #bdc3c7; padding: 10px 12px; text-align: left; font-size: 14px; }
            th { background-color: #f8f9fa; font-weight: bold; color: #2c3e50; }
            .qty { color: #e74c3c; font-weight: bold; }
        </style>
    </head>
    <body>
        <h2>⚠️ Kam qolgan mahsulotlar ro'yxati</h2>
        <div class="date">${escapeHtml(storeName)} | Sana: ${dateStr}</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 50px;">T/r</th>
                    <th>Fiskal Kod</th>
                    <th>Mahsulot Nomi</th>
                    <th>Qoldiq</th>
                    <th>Chegara</th>
                </tr>
            </thead>
            <tbody>
                ${lowStockItems.map((item, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td style="font-family: monospace; color: #7f8c8d;">${escapeHtml(item.code)}</td>
                        <td style="font-weight: bold;">${escapeHtml(item.name)}</td>
                        <td class="qty">${item.stock} ${escapeHtml(item.unit || 'dona')}</td>
                        <td>${item.warning !== undefined ? item.warning : 5}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <script>
            window.onload = function() { 
                setTimeout(() => {
                    window.print(); 
                    window.close(); 
                }, 300);
            }
        </script>
    </body>
    </html>`;
    
    const printWin = window.open('', '_blank');
    printWin.document.write(html);
    printWin.document.close();
}

window.addEventListener('load', function() {
    let d = new Date(); let yyyy = d.getFullYear(); let mm = String(d.getMonth() + 1).padStart(2, '0'); let dd = String(d.getDate()).padStart(2, '0');
    document.querySelectorAll('input[type="date"]').forEach(el => el.setAttribute('max', `${yyyy}-${mm}-${dd}`));
    document.querySelectorAll('input[type="month"]').forEach(el => el.setAttribute('max', `${yyyy}-${mm}`));
    
    hideLoader(); initTheme();
    
    // Agar foydalanuvchi oldin kirgan bo'lsa, uni bazadan tiklash
    if (sessionStorage.getItem('admin_logged_in') === 'true') {
        STORE_ID = sessionStorage.getItem('current_store_id');
        if (STORE_ID) {
            document.getElementById('loginOverlay').classList.remove('active');
            let savedTab = sessionStorage.getItem('r04_admin_active_tab') || 'dashboard';
            switchTab(savedTab); loadAllData();
        }
    }
});