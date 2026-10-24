// TUG'RILANDI: XSS himoyasi uchun funksiya
        function escapeHtml(str) {
            if (!str) return '';
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
        }

        const iconEdit = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
        const iconLock = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
        const iconUnlock = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`;
        const iconDelete = `<svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;

        function toggleSidebar() {
            document.querySelector('.sidebar').classList.toggle('active');
            document.querySelector('.sidebar-overlay').classList.toggle('active');
        }

        function toggleTheme() {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('sa_theme', isDark ? 'dark' : 'light');
            document.getElementById('themeIcon').innerHTML = isDark ? 
                `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>` : 
                `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
        }

        // TUG'RILANDI: customConfirmModal ni ishlashi
        let pendingConfirmCallback = null;
        function showCustomConfirm(msg, callback, title="Tasdiqlash") {
            document.getElementById('confirmTitle').innerText = title;
            document.getElementById('confirmMessage').innerText = escapeHtml(msg);
            pendingConfirmCallback = callback;
            document.getElementById('customConfirmModal').classList.add('active');
        }
        function closeCustomConfirm() { document.getElementById('customConfirmModal').classList.remove('active'); pendingConfirmCallback = null; }
        function executeConfirm() { if (pendingConfirmCallback) pendingConfirmCallback(); closeCustomConfirm(); }

        function initProfile() {
            let n = localStorage.getItem('sa_profile_name') || "Super Admin";
            let elName = document.getElementById('displayAdminName');
            if (elName) elName.innerHTML = `<strong>${escapeHtml(n)}</strong>`;
            
            let avatar = localStorage.getItem('sa_admin_avatar');
            if (avatar) {
                updateAvatarDisplays(avatar);
            } else {
                updateAvatarTextDisplays(n);
            }
        }

        function updateAvatarDisplays(src) {
            document.querySelectorAll('.admin-avatar').forEach(el => {
                el.innerHTML = `<img src="${src}" style="width:100%; height:100%; object-fit:cover;">`;
            });
            let modalImg = document.getElementById('profileAvatarImg');
            if(modalImg) {
                modalImg.src = src;
                modalImg.style.display = 'block';
                document.getElementById('profileAvatarText').style.display = 'none';
            }
        }

        function updateAvatarTextDisplays(name) {
            let letter = (name === "Super Admin") ? "SA" : (name ? name.charAt(0).toUpperCase() : "SA");
            document.querySelectorAll('.admin-avatar').forEach(el => {
                el.innerHTML = escapeHtml(letter);
            });
            let modalText = document.getElementById('profileAvatarText');
            if(modalText) {
                modalText.innerText = letter;
                modalText.style.display = 'block';
                let modalImg = document.getElementById('profileAvatarImg');
                if(modalImg) modalImg.style.display = 'none';
            }
        }

        // TUG'RILANDI: Rasm o'lchamini Canvas orqali qisqartirish (Memory & LocalStorage Error himoyasi)
        function handleAvatarUpload(event) {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const img = new Image();
                    img.onload = function() {
                        const canvas = document.createElement('canvas');
                        const MAX_SIZE = 150;
                        canvas.width = MAX_SIZE; canvas.height = MAX_SIZE;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, MAX_SIZE, MAX_SIZE);
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

        function openProfileModal() { 
            let n = localStorage.getItem('sa_profile_name') || "Super Admin";
            document.getElementById('saNameInput').value = n; 
            
            let currentAvatar = localStorage.getItem('sa_admin_avatar');
            if(currentAvatar) {
                document.getElementById('profileAvatarImg').src = currentAvatar;
                document.getElementById('profileAvatarImg').style.display = 'block';
                document.getElementById('profileAvatarText').style.display = 'none';
            } else {
                let letter = (n === "Super Admin") ? "SA" : n.charAt(0).toUpperCase();
                document.getElementById('profileAvatarText').innerText = letter;
                document.getElementById('profileAvatarText').style.display = 'block';
                document.getElementById('profileAvatarImg').style.display = 'none';
            }
            window.tempAvatar = null;
            document.getElementById('profileModal').classList.add('active'); 
        }

        function closeProfileModal() { document.getElementById('profileModal').classList.remove('active'); }
        
        function saveAdminProfile() { 
            const n = document.getElementById('saNameInput').value.trim(); 
            if(n) { 
                localStorage.setItem('sa_profile_name', n); 
                if(window.tempAvatar) {
                    localStorage.setItem('sa_admin_avatar', window.tempAvatar);
                }
                initProfile();
                closeProfileModal(); 
            } 
        }

        // ============================================================
        // S-ADMIN AUTH
        // ============================================================
        function attemptLogin() {
            let email    = document.getElementById('loginUsername').value.trim();
            let password = document.getElementById('loginPassword').value.trim();

            if (!email || !password) {
                showCustomAlert("Email va parolni kiriting!", "Xatolik");
                return;
            }

            firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION)
                .then(() => firebase.auth().signInWithEmailAndPassword(email, password))
                .then(() => {
                    sessionStorage.setItem('sa_logged_in', 'true');
                    // TUG'RILANDI: Parolni ochiq holda saqlamaymiz!
                    document.getElementById('loginOverlay').classList.remove('active');
                    loadData();
                })
                .catch(() => {
                    showCustomAlert("Email yoki parol noto'g'ri!", "Xatolik");
                });
        }

        function logout() {
            // TUG'RILANDI: Listener larni tozalash (Memory leak fix)
            database.ref('clients').off();
            database.ref('requests').off();
            
            firebase.auth().signOut().then(() => {
                sessionStorage.removeItem('sa_logged_in');
                document.getElementById('loginOverlay').classList.add('active');
                document.getElementById('loginUsername').value = '';
                document.getElementById('loginPassword').value = '';
                closeProfileModal();
            });
        }

        firebase.auth().onAuthStateChanged((user) => {
            let loader = document.getElementById('globalLoader');
            if (loader) {
                loader.style.opacity = '0';
                setTimeout(() => { loader.style.display = 'none'; }, 300);
            }

            const isLoggedIn = sessionStorage.getItem('sa_logged_in') === 'true';

            if (user && isLoggedIn) {
                document.getElementById('loginOverlay').classList.remove('active');
                loadData();
            } else {
                if (user) firebase.auth().signOut();
                document.getElementById('loginOverlay').classList.add('active');
            }
        });

        // ============================================================
        // DB MANIPULATION & UI RENDERING
        // ============================================================
        let clientsDB = [];
        let requestsDB = [];
        
        let currentPageClients = 1;
        const itemsPerPageClients = 10;
        
        let currentPageReq = 1;
        const itemsPerPageReq = 10;

        function loadData() {
            database.ref('clients').on('value', snap => {
                let val = snap.val();
                if(val) {
                    clientsDB = Object.keys(val).map(k => {
                        return { ...val[k], dbKey: k };
                    });
                } else {
                    clientsDB = [];
                }
                renderUI();
            });

            database.ref('requests').on('value', snap => {
                requestsDB = snap.val() ? Object.values(snap.val()).sort((a, b) => b.id - a.id) : [];
                renderRequests();
            });
        }

        // TUG'RILANDI: Mijozlar Ro'yxati uchun Paginatsiya va XSS himoya
        function renderUI() {
            const tbody = document.getElementById('clientsTableBody');
            tbody.innerHTML = '';
            let act = 0, blk = 0;
            clientsDB.forEach(c => { if(c.status === 'faol') act++; else blk++; });
            
            const totalPages = Math.ceil(clientsDB.length / itemsPerPageClients) || 1;
            if(currentPageClients > totalPages) currentPageClients = totalPages;
            
            const startIdx = (currentPageClients - 1) * itemsPerPageClients;
            const paginatedItems = clientsDB.slice(startIdx, startIdx + itemsPerPageClients);
            
            document.getElementById('pageInfoClients').innerText = `${currentPageClients} / ${totalPages}`;
            document.getElementById('prevBtnClients').disabled = currentPageClients === 1;
            document.getElementById('nextBtnClients').disabled = currentPageClients === totalPages;

            paginatedItems.forEach((c, idxOffset) => {
                const globalIndex = startIdx + idxOffset + 1;
                tbody.innerHTML += `<tr>
                    <td>${globalIndex}</td>
                    <td><div style="font-weight:bold; color:var(--text-dark);">${escapeHtml(c.name) || 'Nomsiz do\'kon'}</div><div style="font-size:11px;color:var(--text-muted)">ID: ${escapeHtml(c.id || c.dbKey)}</div></td>
                    <td><div style="font-size:12px">L: <strong>${escapeHtml(c.login)||'Mavjud emas'}</strong></div><div style="font-size:12px">P: <strong>***</strong></div></td>
                    <td><span class="badge" style="background:var(--brand-color); color:white;">${c.plan ? escapeHtml(c.plan.toUpperCase()) : 'NO PLAN'}</span></td>
                    <td style="font-family:monospace;font-weight:bold">${escapeHtml(c.end) || '-'}</td>
                    <td><span class="badge ${c.status==='faol'?'b-active':'b-blocked'}">${c.status === 'faol' ? 'Faol' : 'Bloklangan'}</span></td>
                    <td style="text-align:right;">
                        <div style="display:flex; gap:5px; justify-content:flex-end; flex-wrap:wrap;">
                            <button class="btn-action" onclick="openClientModal('${escapeHtml(c.dbKey)}')">${iconEdit} Tahrir</button>
                            <button class="btn-action" onclick="toggleBlock('${escapeHtml(c.dbKey)}', '${c.status==='faol'?'bloklangan':'faol'}')">
                                ${c.status==='faol'?iconLock:iconUnlock} ${c.status==='faol'?'Bloklash':'Ochish'}
                            </button>
                            <button class="btn-action" style="color:var(--danger); border-color:rgba(231,76,60,0.4);" onclick="requestDeleteClient('${escapeHtml(c.dbKey)}')">
                                ${iconDelete} O'chirish
                            </button>
                        </div>
                    </td>
                </tr>`;
            });
            document.getElementById('statTotal').innerText = clientsDB.length;
            document.getElementById('statActive').innerText = act;
            document.getElementById('statBlocked').innerText = blk;
        }

        function prevPageClients() { if(currentPageClients > 1) { currentPageClients--; renderUI(); } }
        function nextPageClients() { currentPageClients++; renderUI(); }

        // ============================================================
        // XAVFSIZ O'CHIRISH TIZIMI (Parolni Auth orqali tekshirish)
        // ============================================================
        let targetStoreToDelete = null;

        function requestDeleteClient(dbKey) {
            targetStoreToDelete = dbKey;
            document.getElementById('saPasswordInput').value = '';
            document.getElementById('saPasswordError').innerText = ''; 
            document.getElementById('passwordModal').classList.add('active');
            setTimeout(() => document.getElementById('saPasswordInput').focus(), 100);
        }

        function closePasswordModal() {
            document.getElementById('passwordModal').classList.remove('active');
        }

        // TUG'RILANDI: Parolni FirebaseAuth orqali xavfsiz tekshirish
        function submitPassword() {
            const p = document.getElementById('saPasswordInput').value;
            const errorEl = document.getElementById('saPasswordError');
            errorEl.innerText = "";

            if (!p) {
                errorEl.innerText = "Parolni kiriting!";
                setTimeout(() => document.getElementById('saPasswordInput').focus(), 100);
                return;
            }

            let user = firebase.auth().currentUser;
            if(!user) {
                errorEl.innerText = "Sessiya muddati tugagan! Qayta kiring.";
                return;
            }

            // Real vaqtda parolni tekshirish
            firebase.auth().signInWithEmailAndPassword(user.email, p).then(() => {
                document.getElementById('passwordModal').classList.remove('active');
                executeDeleteClient();
            }).catch(() => {
                errorEl.innerText = "Parol xato! Qayta urinib ko'ring.";
                document.getElementById('saPasswordInput').value = ''; 
                setTimeout(() => document.getElementById('saPasswordInput').focus(), 100);
            });
        }

        function executeDeleteClient() {
            if(!targetStoreToDelete) return;
            
            database.ref('clients/' + targetStoreToDelete).remove()
                .then(() => {
                    showCustomAlert("Do'kon muvaffaqiyatli o'chirildi!");
                    targetStoreToDelete = null;
                })
                .catch(err => {
                    showCustomAlert("Xatolik: " + err.message, "Xatolik");
                    targetStoreToDelete = null;
                });
        }

        function toggleBlock(dbKey, status) {
            database.ref('clients/'+dbKey).update({status});
        }

        function handlePlanChange() {
            const p = document.getElementById('cPlan').value;
            const end = document.getElementById('cEndDate');
            if(p === 'vip') { end.type='text'; end.value='∞'; end.disabled=true; }
            else { end.type='date'; end.disabled=false; if(end.value === '∞') end.value=''; }
        }

        function openClientModal(dbKey = null) {
            document.getElementById('clientModal').classList.add('active');
            if(dbKey) {
                let c = clientsDB.find(x => x.dbKey === dbKey);
                document.getElementById('modalTitle').innerText = "Tahrirlash";
                document.getElementById('cId').value = c.dbKey; 
                document.getElementById('cId').disabled = true; 
                document.getElementById('cName').value = c.name || '';
                document.getElementById('cPhone').value = c.phone || '+998';
                document.getElementById('cLogin').value = c.login || '';
                document.getElementById('cPassword').value = c.password || '';
                document.getElementById('cPlan').value = c.plan || 'oylik';
                document.getElementById('cStatus').value = c.status || 'faol';
                handlePlanChange();
                
                // Sanani to'g'ri o'qish
                if(c.plan !== 'vip' && c.end) {
                    if(c.end.includes('.')) {
                        let d = c.end.split('.'); 
                        document.getElementById('cEndDate').value = `${d[2]}-${d[1]}-${d[0]}`;
                    } else {
                        document.getElementById('cEndDate').value = c.end;
                    }
                } else if (c.plan === 'vip') {
                    document.getElementById('cEndDate').value = '∞';
                } else {
                    document.getElementById('cEndDate').value = '';
                }
            } else {
                document.getElementById('modalTitle').innerText = "Do'kon qo'shish";
                document.getElementById('cId').value = ""; 
                document.getElementById('cId').disabled = false; 
                document.getElementById('cName').value = ""; 
                document.getElementById('cLogin').value = ""; 
                document.getElementById('cPassword').value = "";
                document.getElementById('cPhone').value = "+998";
                document.getElementById('cPlan').value = "oylik";
                document.getElementById('cStatus').value = "faol";
                document.getElementById('cEndDate').value = "";
                handlePlanChange();
            }
        }

        function saveClient() {
            const id = document.getElementById('cId').value.trim();
            const name = document.getElementById('cName').value.trim();
            const phone = document.getElementById('cPhone').value.trim();
            const login = document.getElementById('cLogin').value.trim();
            const pass = document.getElementById('cPassword').value.trim();
            const plan = document.getElementById('cPlan').value;
            let end = document.getElementById('cEndDate').value;
            
            if(!id || !name || !login || !pass) {
                showCustomAlert("Iltimos, barcha maydonlarni to'ldiring!"); 
                return;
            }

            // TUG'RILANDI: Telefon raqam validatsiyasi qo'shildi
            if (!/^\+998\d{9}$/.test(phone)) {
                showCustomAlert("Telefon raqami +998 bilan boshlanib, 9 ta raqamdan iborat bo'lishi kerak (Masalan: +998901234567)", "Xatolik");
                return;
            }
            
            // Sanani DD.MM.YYYY formatiga o'tkazib saqlash
            if(plan !== 'vip' && end.includes('-')) { 
                let p = end.split('-'); 
                end = `${p[2]}.${p[1]}.${p[0]}`; 
            }
            
            let data = { 
                id: id, 
                name: name, 
                phone: phone, 
                login: login, 
                password: pass, 
                plan: plan, 
                status: document.getElementById('cStatus').value, 
                end: plan === 'vip' ? '∞' : end 
            };
            
            database.ref('clients/' + id).update(data).then(() => { 
                closeClientModal(); 
            });
        }

        function saveAdminSettings() {
            let nl = document.getElementById('setNewLogin').value.trim();
            let np = document.getElementById('setNewPassword').value.trim();
            
            if(!nl || !np) {
                showCustomAlert("Yangi login va parolni kiriting!", "Xatolik");
                return;
            }
            
            let user = firebase.auth().currentUser;
            if (user) {
                user.updateEmail(nl).then(() => {
                    return user.updatePassword(np);
                }).then(() => {
                    document.getElementById('setNewLogin').value = '';
                    document.getElementById('setNewPassword').value = '';
                    showCustomAlert("S-Admin ma'lumotlari muvaffaqiyatli yangilandi!", "Bajarildi");
                }).catch(err => {
                    if(err.code === 'auth/requires-recent-login') {
                         showCustomAlert("Xavfsizlik talabi: Parolni o'zgartirish uchun akkauntdan chiqib, qaytadan kiring!", "Diqqat");
                    } else {
                         showCustomAlert("Xatolik: " + err.message, "Xatolik");
                    }
                });
            }
        }

        // ============================================================
        // SO'ROVLAR BO'LIMI VA PAGINATSIYASI
        // ============================================================
        let currentReqFilter = 'all';

        function filterRequests(type, btn) {
            let parent = btn.parentElement;
            parent.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentReqFilter = type;
            currentPageReq = 1;
            renderRequests();
        }

        // TUG'RILANDI: So'rovlar ro'yxati uchun Paginatsiya va XSS himoyasi
        function renderRequests() {
            const tbody = document.getElementById('requestsTableBody');
            let filtered = requestsDB;
            if(currentReqFilter !== 'all') {
                filtered = requestsDB.filter(r => r.type === currentReqFilter);
            }

            const totalPages = Math.ceil(filtered.length / itemsPerPageReq) || 1;
            if(currentPageReq > totalPages) currentPageReq = totalPages;
            
            const startIdx = (currentPageReq - 1) * itemsPerPageReq;
            const paginated = filtered.slice(startIdx, startIdx + itemsPerPageReq);

            document.getElementById('pageInfoReq').innerText = `${currentPageReq} / ${totalPages}`;
            document.getElementById('prevBtnReq').disabled = currentPageReq === 1;
            document.getElementById('nextBtnReq').disabled = currentPageReq === totalPages;

            if(paginated.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 30px; color: var(--text-muted);">Hozircha so'rovlar yo'q...</td></tr>`;
                return;
            }

            let html = '';
            paginated.forEach(req => {
                let badge = '';
                if(req.type === 'login') badge = '<span class="badge" style="background:#f39c12;color:white;">Login/Parol</span>';
                else if(req.type === 'bug') badge = '<span class="badge" style="background:#e74c3c;color:white;">Bug (Xatolik)</span>';
                else if(req.type === 'suggestion') badge = '<span class="badge" style="background:#27ae60;color:white;">Taklif</span>';
                else badge = `<span class="badge" style="background:var(--text-muted);color:white;">Boshqa</span>`;

                html += `<tr>
                    <td style="font-weight:bold;">${escapeHtml(req.date) || '-'}</td>
                    <td><div style="color:var(--text-dark); font-weight:bold;">${escapeHtml(req.username) || 'Noma\'lum'}</div><div style="font-size:11px; color:var(--text-muted);">ID: ${escapeHtml(req.userId) || '-'}</div></td>
                    <td>${badge}</td>
                    <td style="white-space: normal; min-width: 250px; line-height:1.4;">${escapeHtml(req.message)}</td>
                    <td style="text-align:right;">
                        <button class="btn-action">Javob berish</button>
                    </td>
                </tr>`;
            });
            tbody.innerHTML = html;
        }

        function prevPageReq() { if(currentPageReq > 1) { currentPageReq--; renderRequests(); } }
        function nextPageReq() { currentPageReq++; renderRequests(); }

        function switchTab(t, el) {
            document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active')); el.classList.add('active');
            document.querySelectorAll('.section-container').forEach(s => s.classList.remove('active')); document.getElementById(t + '-section').classList.add('active');
            
            const titles = { dashboard: 'Do\'konlar Boshqaruvi', requests: 'Telegram So\'rovlar', settings: 'Sozlamalar' };
            document.getElementById('pageTitle').querySelector('span').innerText = titles[t];

            if (window.innerWidth <= 768) {
                document.querySelector('.sidebar').classList.remove('active');
                document.querySelector('.sidebar-overlay').classList.remove('active');
            }
        }
        
        function showCustomAlert(m, title="Xabar") { document.getElementById('alertTitle').innerText=title; document.getElementById('alertMessage').innerText = escapeHtml(m); document.getElementById('customAlertModal').classList.add('active'); }
        function closeCustomAlert() { document.getElementById('customAlertModal').classList.remove('active'); }
        function closeClientModal() { document.getElementById('clientModal').classList.remove('active'); }

        window.onload = () => {
            if(localStorage.getItem('sa_theme') === 'dark') toggleTheme();
            initProfile();
        };
