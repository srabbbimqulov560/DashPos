// ==========================================
// 1. ASOSIY YORDAMCHI FUNKSIYALAR
// ==========================================
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function showCustomAlert(msg, title="Xabar") {
    document.getElementById('alertTitle').innerText = title;
    document.getElementById('alertMessage').innerText = escapeHtml(msg);
    document.getElementById('customAlertModal').classList.add('active');
}

function closeCustomAlert() {
    document.getElementById('customAlertModal').classList.remove('active');
}

let pendingConfirmCallback = null;
function showCustomConfirm(msg, callback, title="Diqqat") {
    document.getElementById('confirmTitle').innerText = title;
    document.getElementById('confirmMessage').innerText = escapeHtml(msg);
    pendingConfirmCallback = callback;
    document.getElementById('customConfirmModal').classList.add('active');
}

function closeCustomConfirm() { 
    document.getElementById('customConfirmModal').classList.remove('active'); 
    pendingConfirmCallback = null; 
}

function executeConfirm() { 
    if (pendingConfirmCallback) pendingConfirmCallback(); 
    closeCustomConfirm(); 
}

function formatMoney(amount) { 
    return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " "); 
}

const themeBtn = document.getElementById('themeToggleBtn');
const moonIcon = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
const sunIcon = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) { 
        localStorage.setItem('r04_theme', 'dark'); 
        themeBtn.innerHTML = sunIcon; 
    } else { 
        localStorage.setItem('r04_theme', 'light'); 
        themeBtn.innerHTML = moonIcon; 
    }
}

function initTheme() {
    if (localStorage.getItem('r04_theme') === 'dark') { 
        document.body.classList.add('dark-mode'); 
        themeBtn.innerHTML = sunIcon; 
    } else { 
        themeBtn.innerHTML = moonIcon; 
    }
}
initTheme();

function hideGlobalLoader() {
    let loader = document.getElementById('globalLoader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => { loader.style.display = 'none'; }, 300);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        hideGlobalLoader();
        if(document.getElementById('loginOverlay') && document.getElementById('loginOverlay').classList.contains('active')) {
            updateLoginUI();
        }
    }, 3500);
});

// ==========================================
// 2. GLOBAL O'ZGARUVCHILAR
// ==========================================
STORE_ID = localStorage.getItem('r04_bound_store_id') || "";
STORE_NAME = localStorage.getItem('r04_bound_store_name') || "Do'kon";

let debtsDB = [];
let productsDB = [], currentSeller = null;
let savedCartsData = localStorage.getItem('r04_kassa_carts_' + STORE_ID);

let carts = savedCartsData ? JSON.parse(savedCartsData) : [{ items: [], delivery: 0, discount: 0 }];
if (!Array.isArray(carts) || carts.length === 0) carts = [{ items: [], delivery: 0, discount: 0 }];

let savedTabInfo = localStorage.getItem('r04_kassa_tab_' + STORE_ID);
let activeCartIndex = savedTabInfo ? parseInt(savedTabInfo) : 0;
if (activeCartIndex >= carts.length) activeCartIndex = 0;


function watchStoreStatus() {
    if(!STORE_ID || !navigator.onLine) return;
    database.ref('clients/' + STORE_ID).on('value', snap => {
        let data = snap.val();
        let overlay = document.getElementById('blockOverlay');
        if (overlay) {
            if (data && data.status === 'bloklangan') { 
                overlay.classList.add('active'); 
            } else { 
                overlay.classList.remove('active'); 
            }
        }
    });
}

function updateStoreNameUI(name) {
    STORE_NAME = name;
    localStorage.setItem('r04_bound_store_name', name);
    let headerEl = document.getElementById('headerStoreName');
    if(headerEl) headerEl.innerText = name;
    let loginBrand = document.getElementById('loginBrandTitle');
    if(loginBrand) loginBrand.innerHTML = escapeHtml(name) + ' <span style="color: #3498db;">POS</span>';
}

// ==========================================
// 3. TIZIMGA KIRISH (AUTH & PIN)
// ==========================================
function updateLoginUI() {
    let boundStoreId = localStorage.getItem('r04_bound_store_id');
    let boundStoreName = localStorage.getItem('r04_bound_store_name') || "Do'kon";
    if (boundStoreId) {
        STORE_ID = boundStoreId; 
        STORE_NAME = boundStoreName;
        document.getElementById('bindDeviceContainer').style.display = 'none';
        document.getElementById('pinLoginContainer').style.display = 'block';
        updateStoreNameUI(boundStoreName);
        clearPin();
    } else {
        document.getElementById('pinLoginContainer').style.display = 'none';
        document.getElementById('bindDeviceContainer').style.display = 'block';
        let emailInput = document.getElementById('bindStoreEmail');
        if (emailInput) setTimeout(() => emailInput.focus(), 100);
    }
}

function activateKassa(foundUser, storeName) {
    currentSeller = foundUser;
    updateStoreNameUI(storeName || "Do'kon");
    document.getElementById('displayCashierName').innerText = currentSeller.name;
    document.getElementById('displayAvatar').innerText = currentSeller.name.charAt(0).toUpperCase();
    
    document.getElementById('loginOverlay').classList.remove('active');
    document.getElementById('mainContainer').classList.remove('blurred');
    clearPin(); 

    loadProductsAfterLogin(); 
    listenToSellerChanges(); 
    loadCartsState();
    watchStoreStatus();
    syncOfflineData(); 
    
    setTimeout(() => { document.getElementById('searchInput').focus(); }, 100);
}

function verifyOfflinePin(pin) {
    let localSellers = JSON.parse(localStorage.getItem('r04_sellers_db_' + STORE_ID) || '[]');
    let foundUser = localSellers.find(s => String(s.password).trim() === String(pin));
    if(foundUser && !foundUser.isBlocked) {
        activateKassa(foundUser, localStorage.getItem('r04_bound_store_name'));
        if(!navigator.onLine) showCustomAlert("Siz oflayn rejimdasiz! Tarmoqqa ulanganda ma'lumotlar sinxronlanadi.", "Internet yo'q");
    } else {
        logoutKassir();
    }
}

function logoutKassir() {
    localStorage.removeItem('r04_kassir_pin_' + STORE_ID);
    document.getElementById('loginOverlay').classList.add('active');
    document.getElementById('mainContainer').classList.add('blurred');
    clearPin();
    updateLoginUI();
}

firebase.auth().onAuthStateChanged((user) => {
    let boundEmail = localStorage.getItem('r04_bound_email');
    let boundPass = localStorage.getItem('r04_bound_password');
    STORE_ID = localStorage.getItem('r04_bound_store_id') || "";
    let savedPin = localStorage.getItem('r04_kassir_pin_' + STORE_ID);

    if (user) {
        STORE_ID = user.uid;
        localStorage.setItem('r04_bound_store_id', STORE_ID);

        if (savedPin) {
            if(navigator.onLine) {
                database.ref('clients/' + STORE_ID).once('value').then(snap => {
                    hideGlobalLoader();
                    const storeData = snap.val();
                    if (!storeData) {
                        showCustomAlert("Do'kon topilmadi!", "Xatolik"); logoutKassir(); return;
                    }
                    if (storeData.status === 'bloklangan') {
                        showCustomAlert("Do'kon bloklangan!", "Diqqat"); logoutKassir(); return;
                    }

                    const sellers = storeData.sellers ? Object.values(storeData.sellers) : [];
                    let foundUser = sellers.find(s => String(s.password).trim() === String(savedPin));

                    if (foundUser && !foundUser.isBlocked) {
                        activateKassa(foundUser, storeData.name);
                    } else {
                        logoutKassir();
                    }
                }).catch(err => {
                    console.error("DB Read Error:", err);
                    hideGlobalLoader();
                    verifyOfflinePin(savedPin);
                });
            } else {
                hideGlobalLoader();
                verifyOfflinePin(savedPin);
            }
        } else {
            hideGlobalLoader();
            updateLoginUI();
        }
    } else {
        if (boundEmail && boundPass && navigator.onLine) {
            firebase.auth().signInWithEmailAndPassword(boundEmail, boundPass).catch(e => {
                console.error("Auto-login failed:", e);
                hideGlobalLoader();
                updateLoginUI();
            });
        } else {
            hideGlobalLoader();
            updateLoginUI();
        }
    }
});

function bindDevice() {
    let email = document.getElementById('bindStoreEmail').value.trim();
    let pass = document.getElementById('bindStorePassword').value.trim();
    
    if(!email || !pass) {
        return showCustomAlert("Email va parolni kiriting!", "Diqqat");
    }

    let loader = document.getElementById('globalLoader');
    if(loader) loader.style.display = 'flex';

    firebase.auth().signInWithEmailAndPassword(email, pass)
    .then((userCredential) => {
        localStorage.setItem('r04_bound_store_id', userCredential.user.uid);
        localStorage.setItem('r04_bound_email', email);
        localStorage.setItem('r04_bound_password', pass);
        
        window.location.reload(); 
    })
    .catch((error) => {
        if(loader) loader.style.display = 'none';
        console.error("Firebase xatosi:", error);
        
        let errorMsg = "Xatolik: " + error.message;
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            errorMsg = "Bunday email yoki parol topilmadi! Firebase'da bu profil ochilganiga ishonch hosil qiling.";
        } else if (error.code === 'auth/wrong-password') {
            errorMsg = "Parol xato kiritildi!";
        } else if (error.code === 'auth/invalid-email') {
            errorMsg = "Email formati xato (masalan, @ belgisi yo'q).";
        } else if (error.code === 'auth/network-request-failed') {
            errorMsg = "Internetga ulanishda muammo bor.";
        }

        showCustomAlert(errorMsg, "Ulanishda xatolik");
    });
}

function unbindDevice() {
    showCustomConfirm("DIQQAT! Qurilmani ushbu do'kondan uzmoqchimisiz?", () => {
        localStorage.removeItem('r04_bound_store_id');
        localStorage.removeItem('r04_bound_store_name');
        localStorage.removeItem('r04_bound_email');
        localStorage.removeItem('r04_bound_password');
        localStorage.removeItem('r04_bound_store_email'); 
        localStorage.removeItem('r04_kassir_pin_' + STORE_ID);
        STORE_ID = ""; STORE_NAME = "";
        firebase.auth().signOut();
        updateLoginUI();
    }, "Qurilmani uzish");
}

let currentPin = "";
let isLoggingIn = false; 

function appendPin(num) {
    document.getElementById('pinErrorMessage').innerText = ""; 
    if(currentPin.length < 4) { currentPin += num; updatePinDisplay(); }
    if(currentPin.length === 4 && !isLoggingIn) { setTimeout(attemptPinLogin, 100); }
}

function clearPin() { 
    currentPin = ""; 
    updatePinDisplay(); 
}

function deletePin() { 
    document.getElementById('pinErrorMessage').innerText = ""; 
    currentPin = currentPin.slice(0, -1); 
    updatePinDisplay(); 
}

function updatePinDisplay() { 
    document.getElementById('pinDisplay').innerText = "*".repeat(currentPin.length); 
}

document.addEventListener('keydown', function(e) {
    if(document.getElementById('loginOverlay').classList.contains('active') && 
       document.getElementById('pinLoginContainer').style.display === 'block') {
        if(e.key >= '0' && e.key <= '9') { appendPin(e.key); } 
        else if(e.key === 'Backspace') { deletePin(); } 
        else if(e.key === 'Enter') { attemptPinLogin(); }
    }
});

function attemptPinLogin() {
    let pinToCheck = currentPin.trim();
    if(pinToCheck.length !== 4 || isLoggingIn) return;

    isLoggingIn = true;
    document.getElementById('pinErrorMessage').innerText = "";
    
    let loader = document.getElementById('globalLoader');
    if(loader) { loader.style.display = 'flex'; loader.style.opacity = '1'; }

    STORE_ID = localStorage.getItem('r04_bound_store_id');
    
    if (!STORE_ID) {
        hideGlobalLoader(); isLoggingIn = false; clearPin();
        showCustomAlert("Avval qurilmani ulang!", "Xatolik");
        updateLoginUI();
        return;
    }

    const processPinCheck = () => {
        if(navigator.onLine) {
            database.ref('clients/' + STORE_ID).once('value')
            .then((snap) => {
                hideGlobalLoader();
                const storeData = snap.val();
                if (!storeData || storeData.status === 'bloklangan') {
                    isLoggingIn = false; clearPin();
                    document.getElementById('pinErrorMessage').innerText = storeData ? "Do'kon bloklangan!" : "Do'kon topilmadi!";
                    return;
                }

                const sellers = storeData.sellers ? Object.values(storeData.sellers) : [];
                let foundSeller = sellers.find(s => String(s.password).trim() === String(pinToCheck));

                if (foundSeller) {
                    if (foundSeller.isBlocked) {
                        isLoggingIn = false; clearPin();
                        showCustomAlert("Siz admin tomonidan vaqtinchalik bloklangansiz!", "Kirish cheklangan");
                        return;
                    }
                    localStorage.setItem('r04_kassir_pin_' + STORE_ID, pinToCheck);
                    activateKassa(foundSeller, storeData.name);
                    isLoggingIn = false; clearPin();
                } else {
                    isLoggingIn = false; clearPin();
                    document.getElementById('pinErrorMessage').innerText = "Parol xato! Qayta urinib ko'ring.";
                }
            }).catch((error) => {
                hideGlobalLoader(); isLoggingIn = false; clearPin();
                document.getElementById('pinErrorMessage').innerText = "Ulanishda xatolik yuz berdi!";
            });
        } else {
            hideGlobalLoader();
            let localSellers = JSON.parse(localStorage.getItem('r04_sellers_db_' + STORE_ID) || '[]');
            let foundSeller = localSellers.find(s => String(s.password).trim() === String(pinToCheck));
            
            if(foundSeller && !foundSeller.isBlocked) {
                localStorage.setItem('r04_kassir_pin_' + STORE_ID, pinToCheck);
                activateKassa(foundSeller, localStorage.getItem('r04_bound_store_name'));
                isLoggingIn = false; clearPin();
            } else {
                isLoggingIn = false; clearPin();
                document.getElementById('pinErrorMessage').innerText = "Parol xato yoki tarmoq yo'q!";
            }
        }
    };

    let user = firebase.auth().currentUser;
    let boundEmail = localStorage.getItem('r04_bound_email') || localStorage.getItem('r04_bound_store_email');
    let boundPass = localStorage.getItem('r04_bound_password');

    if (!user && navigator.onLine && boundEmail && boundPass) {
        firebase.auth().signInWithEmailAndPassword(boundEmail, boundPass)
        .then(() => { processPinCheck(); })
        .catch(e => {
            hideGlobalLoader(); isLoggingIn = false; clearPin();
            document.getElementById('pinErrorMessage').innerText = "Tizimga ulanishda xatolik. Qayta bog'lang!";
        });
    } else {
        processPinCheck();
    }
}

function listenToSellerChanges() {
    if(!navigator.onLine) return;
    database.ref('clients/' + STORE_ID + '/sellers').off(); 
    database.ref('clients/' + STORE_ID + '/sellers').on('value', snap => {
        let sellers = snap.val() ? Object.values(snap.val()) : [];
        localStorage.setItem('r04_sellers_db_' + STORE_ID, JSON.stringify(sellers));
        
        if (currentSeller) {
            let savedPin = localStorage.getItem('r04_kassir_pin_' + STORE_ID); 
            let updatedUser = sellers.find(s => String(s.password) === String(savedPin));
            
            if (updatedUser) {
                if (updatedUser.isBlocked) {
                    showCustomAlert("Hurmatli " + updatedUser.name + ", hisobingiz bloklandi!", "Diqqat"); 
                    logoutKassir();
                } else {
                    currentSeller = updatedUser;
                    document.getElementById('displayCashierName').innerText = currentSeller.name;
                    document.getElementById('displayAvatar').innerText = currentSeller.name.charAt(0).toUpperCase();
                    
                    let profileModal = document.getElementById('profileModal');
                    if (profileModal && profileModal.classList.contains('active')) {
                        document.getElementById('profileNameDisplay').innerText = currentSeller.name; 
                        document.getElementById('previewAvatar').innerText = currentSeller.name.charAt(0).toUpperCase();
                        const percent = currentSeller.percentage || 0;
                        const shareAmount = (currentSeller.revenue || 0) * (percent / 100);
                        document.getElementById('profileShareAmount').innerHTML = 'Sizning ulushingiz (' + percent + '%): <strong>' + formatMoney(shareAmount) + " so'm</strong>";
                    }
                }
            } else {
                if (sellers.length > 0) {
                    showCustomAlert("Hisob ma'lumotlari o'zgardi. Iltimos qayta kiring!", "Diqqat"); 
                    logoutKassir();
                }
            }
        }
    });
}

function loadProductsAfterLogin() {
    let localData = localStorage.getItem('r04_products_db_' + STORE_ID);
    if (localData) {
        productsDB = JSON.parse(localData);
        renderProducts(document.getElementById('searchInput').value || "");
    } else { 
        productsDB = []; 
        renderProducts(""); 
    }

    if(navigator.onLine) {
        database.ref('clients/' + STORE_ID + '/debts').on('value', (snap) => {
            debtsDB = snap.val() ? Object.values(snap.val()) : [];
            localStorage.setItem('r04_debts_db_' + STORE_ID, JSON.stringify(debtsDB));
        });
        database.ref('clients/' + STORE_ID + '/products').off(); 
        database.ref('clients/' + STORE_ID + '/products').on('value', (snap) => {
            const data = snap.val();
            if (data) { 
                productsDB = Array.isArray(data) ? data : Object.values(data); 
            } else { 
                productsDB = []; 
            }
            localStorage.setItem('r04_products_db_' + STORE_ID, JSON.stringify(productsDB));
            renderProducts(document.getElementById('searchInput').value || "");
        });
    } else {
        debtsDB = JSON.parse(localStorage.getItem('r04_debts_db_' + STORE_ID) || '[]');
    }
}

function logout() {
    logoutKassir();
}

// ==========================================
// 4. KASSA VA SAVAT FUNKSIYALARI
// ==========================================
function saveCartsState() {
    if (STORE_ID) {
        localStorage.setItem('r04_kassa_carts_' + STORE_ID, JSON.stringify(carts));
        localStorage.setItem('r04_kassa_tab_' + STORE_ID, activeCartIndex);
    }
}

function loadCartsState() {
    let dFee = document.getElementById('deliveryFee');
    let discFee = document.getElementById('discountFee');
    if (carts[activeCartIndex]) { 
        if(dFee) dFee.value = (carts[activeCartIndex].delivery || 0) === 0 ? '0' : formatMoney(carts[activeCartIndex].delivery); 
        if(discFee) discFee.value = (carts[activeCartIndex].discount || 0) === 0 ? '0' : formatMoney(carts[activeCartIndex].discount); 
    }
    updateCartUI(); 
    renderCartsTabs();
}

function openProfileModal() { 
    if(!currentSeller) return; 
    let d = new Date();
    let todayStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    let displayRev = currentSeller.revenue || 0;
    if (currentSeller.lastSaleDate !== todayStr) { displayRev = 0; }

    document.getElementById('profileNameDisplay').innerText = currentSeller.name; 
    document.getElementById('previewAvatar').innerText = currentSeller.name.charAt(0).toUpperCase();
    document.getElementById('profileTotalSales').innerText = formatMoney(displayRev) + " so'm"; 
    
    const percent = currentSeller.percentage || 0;
    const shareAmount = displayRev * (percent / 100);
    document.getElementById('profileShareAmount').innerHTML = 'Sizning ulushingiz (' + percent + '%): <strong>' + formatMoney(shareAmount) + " so'm</strong>";
    document.getElementById('profileModal').classList.add('active'); 
}

function closeProfileModal() { 
    document.getElementById('profileModal').classList.remove('active'); 
}

function renderCartsTabs() {
    const area = document.getElementById('heldCartsArea'); 
    area.innerHTML = '';
    carts.forEach((c, index) => {
        const total = c.items.reduce((s, i) => s + (i.price * i.quantity), 0);
        const isActive = index === activeCartIndex ? 'active' : '';
        const delBtn = carts.length > 1 ? '<span class="cart-del-btn" onclick="openDeleteCartModal(' + index + ', event)">x</span>' : '';
        area.innerHTML += '<div class="held-cart-btn ' + isActive + '" onclick="switchCart(' + index + ')"><span>#' + (index + 1) + ' (' + formatMoney(total) + ')</span>' + delBtn + '</div>';
    });
    const holdBtn = document.getElementById('btnHoldCart');
    if (holdBtn) holdBtn.disabled = carts.length >= 4;
    saveCartsState();
}

function switchCart(index) {
    activeCartIndex = index;
    let currentCart = carts[activeCartIndex];
    document.getElementById('deliveryFee').value = (currentCart.delivery || 0) === 0 ? '0' : formatMoney(currentCart.delivery);
    document.getElementById('discountFee').value = (currentCart.discount || 0) === 0 ? '0' : formatMoney(currentCart.discount);
    updateCartUI(); 
    renderCartsTabs();
}

function addNewCart() {
    if (carts.length >= 4) { 
        showCustomAlert("Maksimal 4 ta savat ochish mumkin!", "Diqqat"); 
        return; 
    }
    carts.push({ items: [], delivery: 0, discount: 0 }); 
    switchCart(carts.length - 1);
}

function openDeleteCartModal(index, event) {
    event.stopPropagation(); 
    document.getElementById('deleteCartIndex').value = index;
    document.getElementById('deleteCartModal').classList.add('active');
}

function closeDeleteCartModal() { 
    document.getElementById('deleteCartModal').classList.remove('active'); 
}

function confirmDeleteCart() {
    const index = parseInt(document.getElementById('deleteCartIndex').value);
    carts.splice(index, 1);
    
    if (carts.length === 0) { 
        carts.push({ items: [], delivery: 0, discount: 0 }); 
        activeCartIndex = 0; 
    } else if (activeCartIndex >= carts.length) { 
        activeCartIndex = carts.length - 1; 
    } else if (activeCartIndex === index) { 
        activeCartIndex = Math.max(0, index - 1); 
    }
    
    let currentCart = carts[activeCartIndex];
    document.getElementById('deliveryFee').value = (currentCart.delivery || 0) === 0 ? '0' : formatMoney(currentCart.delivery);
    document.getElementById('discountFee').value = (currentCart.discount || 0) === 0 ? '0' : formatMoney(currentCart.discount);
    updateCartUI(); 
    renderCartsTabs(); 
    closeDeleteCartModal();
}

function clearCart() {
    if(carts[activeCartIndex].items.length === 0) return;
    showCustomConfirm("Joriy savatni tozalashni tasdiqlaysizmi?", () => {
        carts[activeCartIndex].items = []; 
        carts[activeCartIndex].delivery = 0; 
        carts[activeCartIndex].discount = 0;
        document.getElementById('deliveryFee').value = '0';
        document.getElementById('discountFee').value = '0';
        updateCartUI(); 
        renderCartsTabs();
        const sInput = document.getElementById('searchInput');
        if(sInput) { sInput.value = ''; renderProducts(''); sInput.focus(); }
    }, "Savatni tozalash");
}


// ==========================================
// 5. AQLLI VA TEZKOR QIDIRUV
// ==========================================
function simplifyText(text) {
    if (!text) return "";
    return text.toLowerCase()
        .replace(/[q]/g, 'k')
        .replace(/[t]/g, 'd')
        .replace(/[v]/g, 'b')
        .replace(/[h]/g, 'x')
        .replace(/['`'\u02BB]/g, '');
}

function renderProducts(f) {
    const grid = document.getElementById('productGrid'); 
    let html = '';
    const searchSimplified = simplifyText(f);

    let filtered = productsDB.filter(p => {
        const nameSimplified = simplifyText(p.name);
        return nameSimplified.includes(searchSimplified) || String(p.code).includes(f);
    });

    let limit = 60;
    let toRender = filtered.slice(0, limit);

    toRender.forEach(p => {
        const warn = p.warning !== undefined ? p.warning : 5; 
        const unit = p.unit || 'dona';
        html += '<div class="product-card ' + (p.stock <= 0 ? 'out-of-stock' : '') + '" onclick="addToCart(\'' + escapeHtml(p.code) + '\')">'
            + '<div class="p-name">' + escapeHtml(p.name) + '</div>'
            + '<div>'
            + '<div class="p-price">' + formatMoney(p.price) + " so'm</div>"
            + '<div class="p-code">Kod: ' + escapeHtml(p.code) + '</div>'
            + '<div class="p-stock" style="color: ' + (p.stock <= warn ? '#e74c3c' : '#e67e22') + '">Qoldiq: ' + p.stock + ' ' + escapeHtml(unit) + '</div>'
            + '</div></div>';
    });

    if (filtered.length > limit) {
        html += `<div style="grid-column: 1 / -1; text-align: center; padding: 15px; color: var(--text-muted); font-size: 13px;">
                    Yana ${filtered.length - limit} ta mahsulot bor. Qidiruvni aniqroq yozing...
                 </div>`;
    }

    grid.innerHTML = html;
}

let searchTimeout = null;
document.getElementById('searchInput').addEventListener('input', e => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        renderProducts(e.target.value);
    }, 150); 
});

function handleFeeInput(el, type) {
    let raw = el.value.replace(/\D/g, '');
    let val = raw === '' ? 0 : parseInt(raw);
    el.value = raw === '' ? '' : formatMoney(val);
    
    if(type === 'delivery') carts[activeCartIndex].delivery = val;
    if(type === 'discount') carts[activeCartIndex].discount = val;
    
    updateCartUI();
}

let barcodeBuffer = '';
let barcodeTimer = null;

document.addEventListener('keydown', function(e) {
    if (document.getElementById('loginOverlay').classList.contains('active')) return;
    if (document.getElementById('checkoutModal').classList.contains('active') ||
        document.getElementById('outOfStockModal').classList.contains('active') ||
        document.getElementById('debtCustomerModal').classList.contains('active')) {
        return;
    }

    if (e.key === 'Enter') {
        let searchInput = document.getElementById('searchInput');
        let codeToCheck = barcodeBuffer.length >= 3 ? barcodeBuffer : searchInput.value.trim();
        
        if (codeToCheck.length > 0) {
            e.preventDefault();
            const product = productsDB.find(p => String(p.code) === String(codeToCheck));
            if (product) { 
                addToCart(product.code); 
                searchInput.value = ''; 
                clearTimeout(searchTimeout); 
                renderProducts(""); 
            } else {
                console.warn("Shtrix-kod topilmadi: " + codeToCheck);
            }
        }
        barcodeBuffer = ''; 
        return;
    }

    if (e.key.length === 1) {
        barcodeBuffer += e.key;
        clearTimeout(barcodeTimer);
        barcodeTimer = setTimeout(() => {
            barcodeBuffer = ''; 
        }, 50);
    }
});


// ==========================================
// 6. SAVATGA QO'SHISH VA MIQDORLAR
// ==========================================
let pendingCartAction = null; 
let pendingCartProductCode = null; 
let allowedNegativeProducts = {}; 

function openOutOfStockModal() { 
    document.getElementById('outOfStockModal').classList.add('active'); 
    document.addEventListener('keydown', handleOutOfStockEnter); 
}

function closeOutOfStockModal() { 
    document.getElementById('outOfStockModal').classList.remove('active'); 
    document.removeEventListener('keydown', handleOutOfStockEnter); 
    pendingCartAction = null; 
    pendingCartProductCode = null; 
}

function forceAddProduct() {
    if (pendingCartProductCode) allowedNegativeProducts[pendingCartProductCode] = true; 
    if (pendingCartAction) pendingCartAction(); 
    closeOutOfStockModal();
}

function handleOutOfStockEnter(e) { 
    if (e.key === 'Enter') { 
        e.preventDefault(); 
        forceAddProduct(); 
    } 
}

function addToCart(pCode) {
    let product = productsDB.find(p => String(p.code) === String(pCode));
    if (!product) return;
    let cart = carts[activeCartIndex].items;
    let existingItem = cart.find(i => String(i.code) === String(pCode));
    
    let currentQty = existingItem ? existingItem.quantity : 0;
    let step = 1; let plannedQty = currentQty + step;

    if (plannedQty > product.stock && !allowedNegativeProducts[pCode]) {
        pendingCartProductCode = pCode;
        pendingCartAction = function() { executeAddToCart(product, cart, existingItem, step); };
        openOutOfStockModal(); 
        return; 
    }
    executeAddToCart(product, cart, existingItem, step);
}

function executeAddToCart(product, cart, existingItem, step) {
    if (existingItem) { 
        existingItem.quantity += step; 
    } else { 
        cart.push({ code: product.code, name: product.name, price: product.price, unit: product.unit || 'dona', quantity: step }); 
    }
    updateCartUI(); 
    saveCartsState(); 

    let searchInput = document.getElementById('searchInput');
    if (searchInput) { searchInput.value = ''; searchInput.focus(); }
}

function setQuantity(idx, val) {
    let currentCart = carts[activeCartIndex].items;
    const ci = currentCart[idx];
    const p = productsDB.find(x => String(x.code) === String(ci.code));
    let newVal = parseFloat(val);
    
    if (isNaN(newVal) || newVal <= 0) { removeFromCart(idx); return; }
    if (ci.unit !== 'kilo' && ci.unit !== 'metr') { 
        newVal = Math.round(newVal); 
    } else { 
        newVal = Math.round(newVal * 100) / 100; 
    }
    
    if (newVal > p.stock && !allowedNegativeProducts[ci.code]) {
        pendingCartProductCode = ci.code;
        pendingCartAction = function() {
            ci.quantity = newVal;
            updateCartUI(); 
            renderCartsTabs();
        };
        openOutOfStockModal();
        return;
    }
    ci.quantity = newVal; 
    updateCartUI(); 
    renderCartsTabs();
}

function changeQuantity(index, step) {
    let cart = carts[activeCartIndex].items;
    let item = cart[index];
    if (!item) return;
    let product = productsDB.find(p => String(p.code) === String(item.code));
    if (!product) return;

    let actualStep = (product.unit === 'kilo' || product.unit === 'metr') ? (step > 0 ? 0.1 : -0.1) : step;
    let plannedQty = Math.round((item.quantity + actualStep) * 10) / 10;

    if (actualStep < 0 || plannedQty <= product.stock || allowedNegativeProducts[item.code]) {
        executeChangeQuantity(index, plannedQty); 
        return;
    }

    pendingCartProductCode = item.code;
    pendingCartAction = function() { executeChangeQuantity(index, plannedQty); };
    openOutOfStockModal(); 
}

function executeChangeQuantity(index, plannedQty) {
    let cart = carts[activeCartIndex].items;
    if (plannedQty <= 0) { 
        cart.splice(index, 1); 
    } else { 
        cart[index].quantity = plannedQty; 
    }
    updateCartUI(); 
    saveCartsState(); 
}

function removeFromCart(index) {
    carts[activeCartIndex].items.splice(index, 1);
    updateCartUI(); 
    saveCartsState();
}

function updateCartUI() {
    const tbody = document.getElementById('cartBody'); 
    let sub = 0;
    let currentCart = carts[activeCartIndex].items; 
    let html = '';

    currentCart.forEach((ci, i) => {
        sub += ci.price * ci.quantity;
        let stepAmount = (ci.unit === 'kilo' || ci.unit === 'metr') ? '0.1' : '1';
        html += '<tr>'
            + '<td style="font-weight: bold; font-size: 13px;">' + escapeHtml(ci.name) + '<div style="font-size: 11px; color: var(--text-muted); margin-top: 3px; font-weight: normal;">' + escapeHtml(ci.code) + '</div></td>'
            + '<td>' + formatMoney(ci.price) + '</td>'
            + '<td>'
            + '<div class="qty-controls">'
            + '<button class="qty-btn" onclick="changeQuantity(' + i + ',-1)">-</button>'
            + '<input type="number" value="' + ci.quantity + '" step="' + stepAmount + '" onchange="setQuantity(' + i + ', this.value)" style="width: 45px; text-align: center; border: 1px solid var(--border-input); border-radius: 4px; background: var(--bg); color: var(--text-primary); font-weight:bold; height: 28px; box-sizing: border-box; outline: none;">'
            + '<button class="qty-btn" onclick="changeQuantity(' + i + ',1)">+</button>'
            + '<span style="font-size:11px; margin-left:3px; color:var(--text-muted);">' + escapeHtml(ci.unit) + '</span>'
            + '</div></td>'
            + '<td style="font-weight: bold;">' + formatMoney(ci.price * ci.quantity) + '</td>'
            + '<td><button class="btn-remove-item" onclick="removeFromCart(' + i + ')" title="Savatdan olib tashlash">X</button></td>'
            + '</tr>';
    });
    tbody.innerHTML = html;
    
    const del = carts[activeCartIndex].delivery || 0;
    const disc = carts[activeCartIndex].discount || 0;
    let finalTotal = Math.max(0, sub + del - disc);
    
    document.getElementById('subtotalPrice').innerText = formatMoney(sub) + " so'm";
    document.getElementById('totalPrice').innerText = formatMoney(finalTotal) + " so'm";
    saveCartsState();
}


// ==========================================
// 7. TO'LOV VA CHEK CHIQARISH
// ==========================================
let checkoutTotalValue = 0;
let currentPaymentMethod = 'naqd'; 

function handleCashInput(inputElement) {
    let rawValue = inputElement.value.replace(/\D/g, '');
    inputElement.value = rawValue === '' ? '' : formatMoney(parseInt(rawValue));
    calculateModalChange(); 
}

function setPaymentMethod(method) {
    currentPaymentMethod = method;
    document.getElementById('payNaqd').classList.remove('active');
    document.getElementById('payKarta').classList.remove('active');
    document.getElementById('payVisa').classList.remove('active');
    document.getElementById('payNasiya').classList.remove('active');

    if (method === 'naqd') document.getElementById('payNaqd').classList.add('active');
    if (method === 'karta') document.getElementById('payKarta').classList.add('active');
    if (method === 'visa') document.getElementById('payVisa').classList.add('active');
    if (method === 'nasiya') document.getElementById('payNasiya').classList.add('active');

    let cashInput = document.getElementById('checkoutCashGiven');
    if (method !== 'naqd') {
        cashInput.value = formatMoney(checkoutTotalValue);
        cashInput.disabled = true; 
        cashInput.style.opacity = '0.7';
    } else {
        cashInput.disabled = false; 
        cashInput.style.opacity = '1';
        setTimeout(() => { cashInput.focus(); cashInput.select(); }, 50);
    }
    calculateModalChange();
}

function openCheckoutModal() {
    let currentCart = carts[activeCartIndex].items;
    if (currentCart.length === 0) return;
    
    checkoutTotalValue = parseInt(document.getElementById('totalPrice').innerText.replace(/\s/g, '').replace(/\D/g, ''));
    document.getElementById('checkoutTotalAmount').innerText = formatMoney(checkoutTotalValue) + " so'm";
    
    setPaymentMethod('naqd');
    
    const cashInput = document.getElementById('checkoutCashGiven');
    cashInput.value = formatMoney(checkoutTotalValue); 
    calculateModalChange();
    
    document.getElementById('checkoutModal').classList.add('active');
    setTimeout(() => { if(!cashInput.disabled) { cashInput.focus(); cashInput.select(); } }, 100);
}

function closeCheckoutModal() { 
    document.getElementById('checkoutModal').classList.remove('active'); 
}

function calculateModalChange() {
    const cashGivenText = document.getElementById('checkoutCashGiven').value;
    const cashGiven = cashGivenText === '' ? 0 : parseInt(cashGivenText.replace(/\D/g, ''));
    const changeElement = document.getElementById('checkoutChangeAmount');
    
    if (cashGiven < checkoutTotalValue) {
        changeElement.innerText = "Yetarli emas!"; 
        changeElement.style.color = "#e74c3c";
    } else {
        changeElement.innerText = formatMoney(cashGiven - checkoutTotalValue) + " so'm"; 
        changeElement.style.color = "#27ae60";
    }
}

function logInventoryHistoryOffline(action, code, name, oldQty, newQty, note) {
    let d = new Date(); 
    let ts = d.getTime();
    let dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    let timeStr = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    let adminName = currentSeller ? currentSeller.name : "Kassir";

    let id = "inv_" + ts + "_" + Math.floor(Math.random()*10000);
    let data = { id, timestamp: ts, date: dateStr, time: timeStr, action, code, name, oldQty, newQty, note, adminName };
    
    let invQueue = JSON.parse(localStorage.getItem('r04_inv_queue_' + STORE_ID) || '[]');
    invQueue.push(data);
    localStorage.setItem('r04_inv_queue_' + STORE_ID, JSON.stringify(invQueue));
}

function finalizeSale() {
    if (currentPaymentMethod === 'nasiya') {
        document.getElementById('debtCusTotal').value = formatMoney(checkoutTotalValue) + " so'm";
        document.getElementById('debtCusName').value = "";
        document.getElementById('debtCusPhone').value = "+998";
        document.getElementById('debtCusDays').value = "15";
        document.getElementById('debtCustomerModal').classList.add('active');
        return; 
    }

    const cashGiven = parseInt(document.getElementById('checkoutCashGiven').value.replace(/\D/g, '')) || 0;
    if (cashGiven < checkoutTotalValue) { 
        showCustomAlert("Summa yetarli emas!", "Diqqat"); 
        return; 
    }

    const changeAmount = cashGiven - checkoutTotalValue;
    let currentCart = carts[activeCartIndex].items;
    let sub = currentCart.reduce((s, i) => s + (i.price * i.quantity), 0);
    let del = carts[activeCartIndex].delivery || 0;
    let disc = carts[activeCartIndex].discount || 0;

    printReceipt(currentCart, sub, del, disc, checkoutTotalValue, cashGiven, changeAmount, currentPaymentMethod);

    const now = new Date();
    const receiptData = {
        id: Date.now(),
        date: now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0'),
        time: String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0'),
        sellerName: currentSeller ? currentSeller.name : "Noma'lum",
        subtotal: sub,
        delivery: del,
        discount: disc,
        totalAmount: checkoutTotalValue,
        paymentMethod: currentPaymentMethod, 
        items: currentCart.map(i => {
            let originalProd = productsDB.find(p => String(p.code) === String(i.code));
            return { 
                code: i.code, 
                name: i.name, 
                qty: i.quantity, 
                price: i.price, 
                unit: i.unit,
                costPriceAtSale: originalProd ? (Number(originalProd.costPrice) || 0) : 0 
            };
        })
    };

    currentCart.forEach(cartItem => {
        let pIndex = productsDB.findIndex(p => String(p.code) === String(cartItem.code));
        if (pIndex !== -1) { 
            let oldStock = productsDB[pIndex].stock;
            let newStock = oldStock - cartItem.quantity;
            productsDB[pIndex].stock = newStock; 
            logInventoryHistoryOffline("Sotildi", cartItem.code, cartItem.name, oldStock, newStock, "Kassadan sotildi");
        }
    });
    localStorage.setItem('r04_products_db_' + STORE_ID, JSON.stringify(productsDB));

    if(currentSeller) {
        let sellers = JSON.parse(localStorage.getItem('r04_sellers_db_' + STORE_ID) || '[]');
        let sIndex = sellers.findIndex(s => String(s.password) === String(currentSeller.password));
        if(sIndex !== -1) { 
            let d = new Date();
            let todayStr = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
            if (sellers[sIndex].lastSaleDate !== todayStr) {
                sellers[sIndex].revenue = 0; 
                sellers[sIndex].lastSaleDate = todayStr;
            }
            sellers[sIndex].revenue = (Number(sellers[sIndex].revenue) || 0) + checkoutTotalValue;
            localStorage.setItem('r04_sellers_db_' + STORE_ID, JSON.stringify(sellers)); 
            currentSeller = sellers[sIndex]; 
        }
    }

    let offlineQueue = JSON.parse(localStorage.getItem('r04_offline_queue_' + STORE_ID) || '[]');
    offlineQueue.push(receiptData);
    localStorage.setItem('r04_offline_queue_' + STORE_ID, JSON.stringify(offlineQueue));

    closeCheckoutModal();
    resetCartAfterSale();
    syncOfflineData();
}

function resetCartAfterSale() {
    if (carts.length > 1) {
        carts.splice(activeCartIndex, 1); 
        activeCartIndex = Math.max(0, activeCartIndex - 1);
    } else { 
        carts[0] = { items: [], delivery: 0, discount: 0 }; 
    }
    document.getElementById('deliveryFee').value = '0'; 
    document.getElementById('discountFee').value = '0'; 
    
    const searchInput = document.getElementById('searchInput');
    if(searchInput) { 
        searchInput.value = ''; 
        renderProducts(""); 
        setTimeout(() => { searchInput.focus(); }, 100); 
    }
    updateCartUI(); 
    renderCartsTabs();
}

function printReceipt(cartItems, subtotal, delivery, discount, total, cash, change, method) {
    let methodStr = "Naqd pul";
    if (method === 'karta') methodStr = "Karta (Humo/Uzcard)";
    if (method === 'visa') methodStr = "Visa / Mastercard";

    const receiptWindow = window.open('', '_blank', 'width=300,height=600');
    let itemsHtml = cartItems.map(item => 
        '<tr><td style="padding: 5px 0;">' + escapeHtml(item.name) + '<br><small>' + item.quantity + ' ' + escapeHtml(item.unit) + ' x ' + formatMoney(item.price) + "</small></td><td style=\"text-align: right;\">" + formatMoney(item.price * item.quantity) + '</td></tr>'
    ).join('');

    let extrasHtml = '';
    if(delivery > 0) { extrasHtml += '<p>Dastavka: <span style="float:right;">' + formatMoney(delivery) + " so'm</span></p>"; }
    if(discount > 0) { extrasHtml += '<p>Chegirma: <span style="float:right;">-' + formatMoney(discount) + " so'm</span></p>"; }

    receiptWindow.document.write(
        '<html><head><title>Check - ' + escapeHtml(STORE_NAME) + '</title>'
        + '<style>body { font-family: "Courier New", monospace; font-size: 13px; width: 260px; margin: 10px; } table { width: 100%; border-top: 1px dashed #000; border-collapse: collapse; } .center { text-align: center; } hr { border: none; border-top: 1px dashed #000; }</style></head>'
        + '<body><h2 class="center">' + escapeHtml(STORE_NAME) + '</h2>'
        + '<p class="center">' + new Date().toLocaleString() + '</p><hr>'
        + '<table><thead><tr><th align="left">Mahsulot</th><th align="right">Summa</th></tr></thead><tbody>' + itemsHtml + '</tbody></table><hr>'
        + "<p><b>Mahsulotlar: <span style=\"float:right;\">" + formatMoney(subtotal) + " so'm</span></b></p>"
        + extrasHtml + '<hr>'
        + "<p style=\"font-size: 16px;\"><b>JAMI: <span style=\"float:right;\">" + formatMoney(total) + " so'm</span></b></p>"
        + "<p>To'lov turi: <span style=\"float:right;\"><b>" + methodStr + '</b></span></p>'
        + (method === 'naqd' ? "<p>To'landi: <span style=\"float:right;\">" + formatMoney(cash) + " so'm</span></p><p>Qaytim: <span style=\"float:right;\">" + formatMoney(change) + " so'm</span></p>" : '')
        + "<hr><p class=\"center\">Xaridingiz uchun rahmat!</p>"
        + '<script>window.onload = function() { window.print(); window.close(); };<\/script></body></html>'
    );
    receiptWindow.document.close();
}


// ==========================================
// 8. SINXRONIZATSIYA (OFFLINE QUEUE)
// ==========================================
let isSyncing = false; 

function syncOfflineData() {
    if (!navigator.onLine || isSyncing) return; 

    // Qarz navbatini sinxronlash
    let debtQueue = JSON.parse(localStorage.getItem('r04_debt_queue_' + STORE_ID) || '[]');
    if (debtQueue.length > 0) {
        let promises = debtQueue.map(d => database.ref('clients/' + STORE_ID + '/debts/' + d.id).set(d));
        Promise.all(promises).then(() => { localStorage.setItem('r04_debt_queue_' + STORE_ID, '[]'); }).catch(e => console.error(e));
    }

    // Ombor tarixi navbatini sinxronlash
    let invQueue = JSON.parse(localStorage.getItem('r04_inv_queue_' + STORE_ID) || '[]');
    if (invQueue.length > 0) {
        let promises = invQueue.map(d => database.ref('clients/' + STORE_ID + '/inv_history/' + d.id).set(d));
        Promise.all(promises).then(() => { localStorage.setItem('r04_inv_queue_' + STORE_ID, '[]'); }).catch(e => console.error(e));
    }

    // Savdolar tarixi navbatini sinxronlash
    let offlineQueue = JSON.parse(localStorage.getItem('r04_offline_queue_' + STORE_ID) || '[]');
    if (offlineQueue.length === 0) return; 

    isSyncing = true; 
    let receipt = offlineQueue[0];

    database.ref('clients/' + STORE_ID + '/history').push(receipt)
    .then(() => {
        let updates = {};
        receipt.items.forEach(item => {
            let pIndex = productsDB.findIndex(p => String(p.code) === String(item.code));
            if(pIndex !== -1) { updates['products/' + pIndex + '/stock'] = productsDB[pIndex].stock; }
        });

        if(currentSeller) {
            let sellers = JSON.parse(localStorage.getItem('r04_sellers_db_' + STORE_ID) || '[]');
            let sIndex = sellers.findIndex(s => String(s.password) === String(currentSeller.password));
            if(sIndex !== -1) {
                updates['sellers/' + sIndex + '/revenue'] = sellers[sIndex].revenue;
                updates['sellers/' + sIndex + '/lastSaleDate'] = sellers[sIndex].lastSaleDate;
            }
        }
        
        return database.ref('clients/' + STORE_ID).update(updates);
    })
    .then(() => {
        offlineQueue.shift();
        localStorage.setItem('r04_offline_queue_' + STORE_ID, JSON.stringify(offlineQueue));
        isSyncing = false; 
        syncOfflineData(); 
    })
    .catch(err => {
        isSyncing = false; 
        console.error("Sinxronizatsiya xatosi:", err);
    });
}

window.addEventListener('online', syncOfflineData);
setInterval(syncOfflineData, 10000);

// ==========================================
// 9. NASIYA MANTIG'I
// ==========================================
let selectedExistingDebtId = null;

function searchDebtCustomer(val) {
    const sugg = document.getElementById('debtCusSuggestions');
    if(!val) { sugg.style.display = 'none'; return; }
    const matches = debtsDB.filter(d => (d.name || "").toLowerCase().includes(val.toLowerCase()));
    if(matches.length > 0) {
        sugg.innerHTML = matches.map(d => 
            '<div style="padding: 10px; border-bottom: 1px solid var(--border-color); cursor: pointer; color: var(--text-main);" onclick="selectDebtCustomer(\'' + escapeHtml(d.id) + '\')">'
            + '<b>' + escapeHtml(d.name) + '</b> (' + escapeHtml(d.phone) + ') - Qoldiq: ' + formatMoney(d.amount) + " so'm</div>"
        ).join('');
        sugg.style.display = 'block';
    } else { sugg.style.display = 'none'; }
}

function selectDebtCustomer(id) {
    const d = debtsDB.find(x => x.id === id);
    if(d) {
        document.getElementById('debtCusName').value = d.name;
        document.getElementById('debtCusPhone').value = d.phone;
        selectedExistingDebtId = d.id;
    }
    document.getElementById('debtCusSuggestions').style.display = 'none';
}

function closeDebtCustomerModal() {
    document.getElementById('debtCustomerModal').classList.remove('active');
    selectedExistingDebtId = null;
}

function confirmDebtSale() {
    const name = document.getElementById('debtCusName').value.trim();
    const phone = document.getElementById('debtCusPhone').value.trim();
    const days = parseInt(document.getElementById('debtCusDays').value) || 0;
    if(!name || days <= 0) return showCustomAlert("Ism va muddatni to'g'ri kiriting!");
    
    let targetId = selectedExistingDebtId || "debt_" + Date.now();
    let existing = debtsDB.find(x => x.id === targetId);
    
    let debtData = {
        id: targetId, name: name, phone: phone,
        amount: (existing ? existing.amount : 0) + checkoutTotalValue,
        lastUpdate: new Date().toISOString(), daysLimit: days
    };

    let currentCart = carts[activeCartIndex].items;
    let sub = currentCart.reduce((s, i) => s + (i.price * i.quantity), 0);
    let del = carts[activeCartIndex].delivery || 0;
    let disc = carts[activeCartIndex].discount || 0;

    const now = new Date();
    const receiptData = {
        id: Date.now(),
        date: now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0'),
        time: String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0'),
        sellerName: currentSeller ? currentSeller.name : "Noma'lum",
        subtotal: sub, delivery: del, discount: disc,
        totalAmount: checkoutTotalValue,
        paymentMethod: 'nasiya', customerName: name,
        items: currentCart.map(i => {
            let originalProd = productsDB.find(p => String(p.code) === String(i.code));
            return { code: i.code, name: i.name, qty: i.quantity, price: i.price, unit: i.unit, costPriceAtSale: originalProd ? (Number(originalProd.costPrice) || 0) : 0 };
        })
    };

    currentCart.forEach(cartItem => {
        let pIndex = productsDB.findIndex(p => String(p.code) === String(cartItem.code));
        if (pIndex !== -1) { 
            let oldStock = productsDB[pIndex].stock;
            let newStock = oldStock - cartItem.quantity;
            productsDB[pIndex].stock = newStock; 
            logInventoryHistoryOffline("Sotildi (Nasiya)", cartItem.code, cartItem.name, oldStock, newStock, "Kassadan Nasiyaga berildi");
        }
    });
    localStorage.setItem('r04_products_db_' + STORE_ID, JSON.stringify(productsDB));

    let offlineQueue = JSON.parse(localStorage.getItem('r04_offline_queue_' + STORE_ID) || '[]');
    offlineQueue.push(receiptData);
    localStorage.setItem('r04_offline_queue_' + STORE_ID, JSON.stringify(offlineQueue));

    let debtQueue = JSON.parse(localStorage.getItem('r04_debt_queue_' + STORE_ID) || '[]');
    debtQueue.push(debtData);
    localStorage.setItem('r04_debt_queue_' + STORE_ID, JSON.stringify(debtQueue));

    let receiptWindow = window.open('', '_blank', 'width=300,height=600');
    let itemsHtml = currentCart.map(item => 
        '<tr><td style="padding: 5px 0;">' + escapeHtml(item.name) + '<br><small>' + item.quantity + ' ' + escapeHtml(item.unit || 'dona') + ' x ' + formatMoney(item.price) + "</small></td><td style=\"text-align: right;\">" + formatMoney(item.price * item.quantity) + '</td></tr>'
    ).join('');
    receiptWindow.document.write(
        '<html><head><title>Check</title><style>body { font-family: "Courier New", monospace; font-size: 13px; width: 260px; margin: 10px; } table { width: 100%; border-top: 1px dashed #000; border-collapse: collapse; } .center { text-align: center; } hr { border: none; border-top: 1px dashed #000; }</style></head>'
        + '<body><h2 class="center">' + escapeHtml(STORE_NAME) + '</h2><p class="center">' + new Date().toLocaleString() + '</p><hr>'
        + '<p><b>HARIDOR (QARZ): ' + escapeHtml(name) + '</b></p><hr>'
        + '<table><thead><tr><th align="left">Mahsulot</th><th align="right">Summa</th></tr></thead><tbody>' + itemsHtml + '</tbody></table><hr>'
        + "<p style=\"font-size: 16px;\"><b>JAMI QARZ: <span style=\"float:right;\">" + formatMoney(checkoutTotalValue) + " so'm</span></b></p><hr>"
        + "<p class=\"center\">Xaridingiz uchun rahmat!</p>"
        + '<script>window.onload = function() { window.print(); window.close(); };<\/script></body></html>'
    );
    receiptWindow.document.close();

    closeDebtCustomerModal(); closeCheckoutModal();
    resetCartAfterSale();
    syncOfflineData();
}