// --- Report/Admin History Modal ---
function openReportAdminHistoryModal() {
    document.getElementById('report-admin-history-modal').setAttribute('aria-hidden', 'false');
    renderReportAdminHistory();
}
function closeReportAdminHistoryModal() {
    document.getElementById('report-admin-history-modal').setAttribute('aria-hidden', 'true');
}
function renderReportAdminHistory() {
    const user = getCurrentUser();
    if (!user) {
        document.getElementById('report-admin-history-list').innerHTML = '<div style="color:#dc2626">กรุณาเข้าสู่ระบบ</div>';
        return;
    }
    const reports = JSON.parse(localStorage.getItem('unai_reports') || '[]');
    const myReports = reports.filter(r => r.username === user.username);
    if (myReports.length === 0) {
        document.getElementById('report-admin-history-list').innerHTML = '<div style="color:#888">ยังไม่มีประวัติแจ้งปัญหา/สอบถาม</div>';
        return;
    }
    document.getElementById('report-admin-history-list').innerHTML = myReports.slice().reverse().map(r => `
        <div style="border-bottom:1px solid #e5e7eb;padding:10px 0;">
            <div style="font-weight:600;color:#f59e42">${escapeHtml(r.message)}</div>
            <div style="font-size:12px;color:#aaa;">${new Date(r.time).toLocaleString('th-TH')}</div>
            ${r.reply ? `<div style='margin-top:8px;color:#059669'><b>แอดมินตอบ:</b> ${escapeHtml(r.reply)}</div>` : '<div style="color:#888;font-size:13px;margin-top:6px;">(รอการตอบกลับจากแอดมิน)</div>'}
        </div>
    `).join('');
}
// --- Report/Admin Contact Modal ---
function openReportAdminModal() {
    document.getElementById('report-admin-modal').setAttribute('aria-hidden', 'false');
    document.getElementById('report-admin-message').value = '';
}
function closeReportAdminModal() {
    document.getElementById('report-admin-modal').setAttribute('aria-hidden', 'true');
}
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('report-admin-form');
    if(form) {
        form.onsubmit = function(e) {
            e.preventDefault();
            const msg = document.getElementById('report-admin-message').value.trim();
            if(!msg) return;
            const user = getCurrentUser();
            const reports = JSON.parse(localStorage.getItem('unai_reports') || '[]');
            reports.push({
                username: user ? user.username : 'guest',
                email: user ? user.email : '',
                message: msg,
                time: new Date().toISOString(),
                status: 'pending'
            });
            localStorage.setItem('unai_reports', JSON.stringify(reports));
            closeReportAdminModal();
            alert('✅ ส่งข้อความถึงแอดมินเรียบร้อยแล้ว!');
        };
    }
});
// (Removed header chat history button logic)
// --- Chat History for Customer ---
function openChatHistoryModal() {
    document.getElementById('chat-history-modal').setAttribute('aria-hidden', 'false');
    renderChatHistory();
}
function closeChatHistoryModal() {
    document.getElementById('chat-history-modal').setAttribute('aria-hidden', 'true');
}
function renderChatHistory() {
    const user = getCurrentUser();
    if (!user) {
        document.getElementById('chat-history-list').innerHTML = '<div style="color:#dc2626">กรุณาเข้าสู่ระบบ</div>';
        return;
    }
    // ค้นหา key ทั้งหมดใน localStorage ที่เป็นแชทของ user
    const chats = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('unai_chat_') && key.includes('_' + user.username + '_')) {
            const parts = key.split('_');
            const listingId = parts[2];
            const ownerUsername = parts[4];
            const messages = JSON.parse(localStorage.getItem(key) || '[]');
            if (messages.length > 0) {
                chats.push({ listingId, ownerUsername, messages });
            }
        }
    }
    if (chats.length === 0) {
        document.getElementById('chat-history-list').innerHTML = '<div style="color:#888">ยังไม่มีประวัติแชท</div>';
        return;
    }
    // ดึงข้อมูลที่พัก
    const allListings = JSON.parse(localStorage.getItem('unai_listings') || '[]');
    document.getElementById('chat-history-list').innerHTML = chats.map(chat => {
        const listing = allListings.find(l => String(l.id) === String(chat.listingId));
        const lastMsg = chat.messages[chat.messages.length-1];
        return `<div style="border-bottom:1px solid #e5e7eb;padding:10px 0;cursor:pointer" onclick="openChatModal('${chat.listingId}')">
            <div style="font-weight:600;color:#2563eb">${listing ? escapeHtml(listing.name || listing.title) : 'ที่พัก #' + chat.listingId}</div>
            <div style="font-size:13px;color:#666;">${lastMsg.sender === user.username ? 'คุณ' : lastMsg.sender}: ${escapeHtml(lastMsg.text)}</div>
            <div style="font-size:11px;color:#aaa;">${formatTime(lastMsg.time)}</div>
        </div>`;
    }).join('');
}
// --- Chat System ---
let currentChatListingId = null;
function openChatModal(listingId) {
    currentChatListingId = listingId;
    document.getElementById('chat-modal').setAttribute('aria-hidden', 'false');
    renderChat();
}

function closeChatModal() {
    document.getElementById('chat-modal').setAttribute('aria-hidden', 'true');
    document.getElementById('chat-input').value = '';
    currentChatListingId = null;
}

function getCurrentUser() {
    return JSON.parse(localStorage.getItem('unai_user') || 'null');
}

function getListingOwner(listingId) {
    const all = JSON.parse(localStorage.getItem('unai_listings') || '[]');
    return all.find(x => String(x.id) === String(listingId))?.owner || null;
}

function getChatKey(listingId, user) {
    // Chat is between customer and owner for a listing
    // Key: unai_chat_{listingId}_{customerUsername}_{ownerUsername}
    const owner = getListingOwner(listingId);
    if (!user || !owner) return null;
    let customer, ownerUser;
    if (user.role === 'owner') {
        customer = null; // owner will see all chats in dashboard (future)
        ownerUser = user.username;
    } else {
        customer = user.username;
        ownerUser = owner.username;
    }
    return `unai_chat_${listingId}_${customer || 'any'}_${ownerUser}`;
}

function renderChat() {
    const user = getCurrentUser();
    const owner = getListingOwner(currentChatListingId);
    if (!user || !owner) {
        document.getElementById('chat-messages').innerHTML = '<div style="color:#dc2626">ไม่พบข้อมูลผู้ใช้หรือเจ้าของ</div>';
        return;
    }
    const chatKey = getChatKey(currentChatListingId, user);
    const messages = JSON.parse(localStorage.getItem(chatKey) || '[]');
    const box = document.getElementById('chat-messages');
    box.innerHTML = '';
    messages.forEach(msg => {
        const div = document.createElement('div');
        div.style.margin = '8px 0';
        div.style.textAlign = msg.sender === user.username ? 'right' : 'left';
        div.innerHTML = `<span style="display:inline-block;padding:8px 14px;border-radius:16px;max-width:70%;background:${msg.sender === user.username ? '#2563eb' : '#f3f4f6'};color:${msg.sender === user.username ? '#fff' : '#222'};font-size:15px;">${escapeHtml(msg.text)}</span><br><span style="font-size:11px;color:#888;">${msg.sender === user.username ? 'คุณ' : owner.name} ${formatTime(msg.time)}</span>`;
        box.appendChild(div);
    });
    box.scrollTop = box.scrollHeight;
}

function formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
}

document.addEventListener('DOMContentLoaded', function() {
    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
        chatForm.onsubmit = function(e) {
            e.preventDefault();
            const input = document.getElementById('chat-input');
            const text = input.value.trim();
            if (!text) return;
            const user = getCurrentUser();
            const chatKey = getChatKey(currentChatListingId, user);
            if (!chatKey) return;
            const messages = JSON.parse(localStorage.getItem(chatKey) || '[]');
            messages.push({ sender: user.username, text, time: new Date().toISOString() });
            localStorage.setItem(chatKey, JSON.stringify(messages));
            input.value = '';
            renderChat();
        };
    }
});
// app.js - simple static booking demo with Leaflet + OpenStreetMap
const DATA_URL = 'data.json'

const $ = sel => document.querySelector(sel)
const $$ = sel => Array.from(document.querySelectorAll(sel))

let listings = []
let allListings = [] // Store all listings
let map = null
let markers = []

// Initialize default listings from data.json to localStorage if not exists
async function initializeListings() {
    const storedListings = localStorage.getItem('unai_listings')
    if (!storedListings) {
        try {
            const res = await fetch(DATA_URL)
            const defaultListings = await res.json()
            // Transform old format to new format
            const transformedListings = defaultListings.map(item => ({
                id: parseInt(item.id),
                name: item.title,
                type: item.type,
                location: item.location,
                price: item.priceMonth,
                image: item.image,
                coverImage: item.coverImage || item.image,
                description: item.description,
                bedrooms: item.maxGuests >= 4 ? 2 : 1,
                bathrooms: 1,
                size: item.maxGuests * 15,
                coordinates: {
                    lat: item.lat,
                    lng: item.lon
                },
                amenities: ['Wi-Fi', 'แอร์'],
                owner: {
                    username: 'demo',
                    name: item.owner.name,
                    phone: item.owner.phone,
                    line: item.owner.line || '',
                    facebook: item.owner.facebook || '',
                    other: item.owner.other || ''
                },
                createdAt: new Date().toISOString(),
                available: true
            }))
            localStorage.setItem('unai_listings', JSON.stringify(transformedListings))
        } catch(e) {
            console.error('Cannot initialize listings:', e)
        }
    }
}

// Detect current page type
function getPageType() {
    const path = window.location.pathname.toLowerCase()
    if (path.includes('house.html')) return 'house'
    if (path.includes('index.html') || path.endsWith('/')) return 'condo'
    return 'condo' // default
}

async function loadData(){
    try{
        // Initialize listings if needed
        await initializeListings()
        
        // Load from localStorage
        allListings = JSON.parse(localStorage.getItem('unai_listings') || '[]')
        
        // Filter based on current page
        const pageType = getPageType()
        listings = allListings.filter(item => item.type === pageType)
        
        renderListings(listings)
        // init map after listings loaded
        initLeafletMap()
    }catch(e){
        console.error('ไม่สามารถโหลดข้อมูลได้', e)
        document.getElementById('listings-grid').innerHTML = '<p>เกิดข้อผิดพลาดในการโหลดข้อมูล</p>'
    }
}

function renderListings(items){
    const grid = $('#listings-grid')
    grid.innerHTML = ''
    if(!items.length) grid.innerHTML = '<p>ไม่พบที่พักที่ตรงกับการค้นหา</p>'
    for(const it of items){
        const card = document.createElement('article')
        card.className = 'card'
        
        // Support both old and new format
        const title = it.name || it.title
        const price = it.price || it.priceMonth || 0
        const maxGuests = it.bedrooms ? it.bedrooms * 2 : (it.maxGuests || 2)
        const cover = it.coverImage || it.image || 'https://via.placeholder.com/400x250?text=No+Image'
        
        const priceMonth = formatPrice(price) + ' / เดือน'
        const amenitiesText = it.amenities ? it.amenities.join(' • ') : ''
        
        card.innerHTML = `
            <img src="${cover}" alt="${escapeHtml(title)}">
            <div class="card-body">
                <h3>${title}</h3>
                <p>${it.location} • ประเภท: ${it.type} • ${it.bedrooms || 1} ห้องนอน ${it.bathrooms || 1} ห้องน้ำ</p>
                <p>${it.description}</p>
                ${amenitiesText ? `<p style="font-size:13px;color:#666">✨ ${amenitiesText}</p>` : ''}
                <div class="meta">
                    <div>${priceMonth}</div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <button class="btn primary" data-id="${it.id}">จอง</button>
                        <button class="btn secondary" data-id="${it.id}" onclick="contactOwner('${it.id}')">📞 ติดต่อเจ้าของ</button>
                        <button class="btn chat-btn" data-id="${it.id}" onclick="openChatModal('${it.id}')">💬 แชทกับเจ้าของ</button>
                    </div>
                </div>
            </div>
        `
        grid.appendChild(card)
    }
    // attach handlers
    $$('.btn.primary').forEach(b=> b.addEventListener('click', openBooking))
    // refresh markers on map if Leaflet map exists
    if(map && typeof L !== 'undefined' && markers){
        // clear existing markers
        markers.forEach(m=> map.removeLayer(m))
        markers = []
        items.forEach(it=>{
            const lat = it.coordinates?.lat || it.lat
            const lng = it.coordinates?.lng || it.lon
            const title = it.name || it.title
            const price = it.price || it.priceMonth || 0
            const coverImg = it.coverImage || it.image || 'https://via.placeholder.com/400x250?text=No+Image'
            
            if(lat && lng){
                const marker = L.marker([lat, lng]).addTo(map)
                const priceMonth = formatPrice(price) + ' / เดือน'
                const popupHtml = `
                    <div style="min-width:220px; max-width:280px;">
                        <img src="${coverImg}" alt="${escapeHtml(title)}" style="width:100%; height:120px; object-fit:cover; border-radius:6px; margin-bottom:8px;">
                        <strong style="font-size:15px;">${escapeHtml(title)}</strong>
                        <div style="color:#666; font-size:13px; margin-top:4px;">${escapeHtml(it.location)} • ${escapeHtml(it.type)}</div>
                        <div style="color:#059669; font-weight:600; margin-top:6px;">${priceMonth}</div>
                        <div style="margin-top:10px; display:flex; gap:6px; flex-wrap:wrap;">
                            <a href='#' data-id='${it.id}' class='book-link' style="display:inline-block; background:#2563eb; color:#fff; padding:6px 14px; border-radius:6px; text-decoration:none; font-size:13px;">จองเลย</a>
                            <a href='#' data-id='${it.id}' class='contact-link' style="display:inline-block; background:#059669; color:#fff; padding:6px 14px; border-radius:6px; text-decoration:none; font-size:13px;">📞 ติดต่อ</a>
                        </div>
                    </div>
                `
                marker.bindPopup(popupHtml)
                markers.push(marker)
            }
        })
    }
}

function formatPrice(n){
    return new Intl.NumberFormat('th-TH',{style:'currency',currency:'THB',maximumFractionDigits:0}).format(n)
}

function openBooking(e){
    const id = e.currentTarget.dataset.id
    // require login
    const user = JSON.parse(localStorage.getItem('unai_user') || 'null')
    if(!user){
        // redirect to login page
        window.location.href = 'login.html'
        return
    }
    const item = listings.find(x=> x.id==id)
    if(!item) return
    $('#modal-title').textContent = `จอง: ${item.title}`
    
    // Show owner info if available
    let ownerInfo = ''
    if(item.owner){
        ownerInfo = `
            <div style="background:#f3f4f6; padding:12px; border-radius:8px; margin-top:10px;">
                <strong style="color:#059669;">📞 ข้อมูลเจ้าของ</strong>
                <div style="margin-top:6px; font-size:14px;">
                    <div>👤 ${escapeHtml(item.owner.name)}</div>
                    <div>📱 <a href="tel:${item.owner.phone}">${item.owner.phone}</a></div>
                    ${item.owner.line ? `<div>💬 LINE: <a href="https://line.me/R/ti/p/${item.owner.line}" target="_blank">${item.owner.line}</a></div>` : ''}
                        ${item.owner.facebook ? `<div>📘 Facebook: ${renderContactValue(item.owner.facebook)}</div>` : ''}
                        ${item.owner.other ? `<div>📝 ช่องทางอื่นๆ: ${escapeHtml(item.owner.other)}</div>` : ''}
                </div>
            </div>
        `
    }
    
    const title = item.name || item.title
    const maxGuests = item.bedrooms ? item.bedrooms * 2 : (item.maxGuests || 2)
    
    $('#modal-body').innerHTML = `
        <p><strong>${item.location}</strong></p>
        <p>ประเภท: ${item.type} • ${item.bedrooms || 1} ห้องนอน ${item.bathrooms || 1} ห้องน้ำ • ${item.size || 30} ตร.ม.</p>
        <p>${item.description}</p>
        ${ownerInfo}
    `
    $('#booking-modal').setAttribute('aria-hidden','false')

    // prefill form hidden data
    const form = $('#booking-form')
    form.dataset.id = item.id
    // set default period and duration
    const periodSel = $('#booking-period')
    periodSel.value = $('#period-select') ? $('#period-select').value : 'month'
    $('#booking-duration').value = 1
    // update total display
    updateBookingTotal(item)
}

// Contact owner function
function contactOwner(id){
    const item = listings.find(x=> x.id==id)
    if(!item || !item.owner){
        alert('ไม่พบข้อมูลเจ้าของ')
        return
    }
    
    const owner = item.owner
    const title = item.name || item.title
    let message = `📞 ติดต่อเจ้าของ: ${title}\n\n`
    message += `👤 ชื่อ: ${owner.name}\n`
    message += `📱 โทร: ${owner.phone}\n`
    if(owner.line) message += `💬 LINE: ${owner.line}\n`
    if(owner.facebook) message += `📘 Facebook: ${owner.facebook}\n`
    if(owner.other) message += `📝 ช่องทางอื่นๆ: ${owner.other}\n`
    message += `\nคุณต้องการติดต่อช่องทางไหน?`
    
    if(confirm(message)){
        // Open phone dialer
        window.location.href = `tel:${owner.phone}`
    }
}

function updateBookingTotal(item){
    const period = $('#booking-period').value
    const duration = parseInt($('#booking-duration').value || '1', 10)
    let unitPrice = item.price || item.priceMonth || 0
    const total = unitPrice * duration
    $('#booking-total').textContent = `รวม: ${formatPrice(total)} (${duration} เดือน)`
}

function closeModal(){
    $('#booking-modal').setAttribute('aria-hidden','true')
    $('#booking-form').reset()
}

function handleSearch(){
    const q = $('#search-input').value.trim().toLowerCase()
    const type = $('#type-select') ? $('#type-select').value : 'any'
    const period = $('#period-select') ? $('#period-select').value : 'month'
    
    // Get current page type for filtering
    const pageType = getPageType()
    
    const filtered = listings.filter(it => {
        const title = it.name || it.title
        const matchesQ = !q || title.toLowerCase().includes(q) || it.location.toLowerCase().includes(q)
        const matchesType = (type === 'any') ? true : it.type === type
        const matchesPage = it.type === pageType // Only show items matching current page
        return matchesQ && matchesType && matchesPage
    })
    renderListings(filtered)
}

function saveBooking(data){
    const key = 'unai_bookings_v1'
    const arr = JSON.parse(localStorage.getItem(key) || '[]')
    arr.push(data)
    localStorage.setItem(key, JSON.stringify(arr))
}

function init(){
    // date in footer
    document.getElementById('year').textContent = new Date().getFullYear()
    // show user status with role
    const user = JSON.parse(localStorage.getItem('unai_user') || 'null')
    const ua = document.getElementById('user-area')
    if(user && ua){
        const roleIcon = {
            customer: '👤',
            owner: '🏠',
            admin: '⚙️'
        }
        const roleName = {
            customer: 'ลูกค้า',
            owner: 'ผู้ปล่อยเช่า',
            admin: 'Admin'
        }
        const icon = roleIcon[user.role] || '👤'
        const role = roleName[user.role] || user.role
        
        ua.innerHTML = `
            <button id="profile-btn" class="tag" style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;border:none;cursor:pointer;padding:7px 15px;border-radius:18px;font-weight:600;transition:all 0.2s">
                ${icon} ${escapeHtml(user.username)} (${role})
            </button>
            ${user.role === 'admin' || user.role === 'owner' ? `<a href="dashboard.html" class="btn" style="background:#059669;color:white">📊 Dashboard</a>` : ''}
            <button id="logout-btn" class="btn">ออกจากระบบ</button>
        `
        document.getElementById('profile-btn').addEventListener('click', openProfileModal)
        document.getElementById('logout-btn').addEventListener('click', ()=>{
            localStorage.removeItem('unai_user')
            window.location.reload()
        })
    }
    // wire
    $('#search-btn').addEventListener('click', handleSearch)
    $('#search-input').addEventListener('keydown', e=>{ if(e.key==='Enter') handleSearch() })
    $('#modal-close').addEventListener('click', closeModal)
    $('#modal-cancel').addEventListener('click', closeModal)
    // update total when period or duration changes
    $('#booking-period').addEventListener('change', ()=>{
        const id = $('#booking-form').dataset.id
        const item = listings.find(x=> x.id==id)
        if(item) updateBookingTotal(item)
    })
    $('#booking-duration').addEventListener('input', ()=>{
        const id = $('#booking-form').dataset.id
        const item = listings.find(x=> x.id==id)
        if(item) updateBookingTotal(item)
    })

    $('#booking-form').addEventListener('submit', e=>{
        e.preventDefault()
        const fd = new FormData(e.target)
        const item = listings.find(x=> x.id==e.target.dataset.id)
        
        const booking = {
            id: `b_${Date.now()}`,
            listingId: e.target.dataset.id,
            listingName: item ? (item.name || item.title) : 'N/A',
            coverImage: item ? (item.coverImage || item.image || '') : '',
            name: fd.get('name'),
            email: fd.get('email'),
            period: fd.get('period'),
            duration: parseInt(fd.get('duration'),10),
            // compute total again to be safe
            total: (function(){
                if(!item) return 0
                const per = fd.get('period')
                const dur = parseInt(fd.get('duration'),10)
                const price = item.price || item.priceMonth || 0
                return price * dur
            })(),
            createdAt: new Date().toISOString()
        }
        saveBooking(booking)
        closeModal()
        alert('ขอบคุณค่ะ การจองของคุณถูกบันทึก (ตัวอย่าง: เก็บใน localStorage)')
    })
    // load
    loadData()
}

function loadScript(url){
    return new Promise((resolve,reject)=>{
        const s = document.createElement('script')
        s.src = url
        s.async = true
        s.defer = true
        s.onload = resolve
        s.onerror = reject
        document.head.appendChild(s)
    })
}

async function initLeafletMap(){
    const mapEl = document.getElementById('map')
    if(!mapEl) return
    
    // load Leaflet script if not already loaded
    if(typeof L === 'undefined'){
        try{
            await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js')
        }catch(err){ 
            console.error('ไม่สามารถโหลด Leaflet',err)
            mapEl.innerHTML = '<div style="padding:40px; text-align:center; color:#666;">ไม่สามารถโหลดแผนที่ได้</div>'
            return 
        }
    }
    
    // create map centered on Thailand
    map = L.map(mapEl).setView([13.736717,100.523186],6)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
        attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map)
    
    // add markers with enhanced popups
    markers = []
    listings.forEach(it=>{
        const lat = it.coordinates?.lat || it.lat
        const lng = it.coordinates?.lng || it.lon
        if(lat && lng){
            const marker = L.marker([lat, lng]).addTo(map)
            const priceValue = it.price || it.priceMonth || 0
            const priceMonth = priceValue ? formatPrice(priceValue) + ' / เดือน' : ''
            const priceYear = it.priceYear ? formatPrice(it.priceYear) + ' / ปี' : ''
            const coverImg = it.coverImage || it.image || 'https://via.placeholder.com/400x250?text=No+Image'
            const title = it.name || it.title
            const popupHtml = `
                <div style="min-width:220px; max-width:280px;">
                    <img src="${coverImg}" alt="${escapeHtml(title)}" style="width:100%; height:120px; object-fit:cover; border-radius:6px; margin-bottom:8px;">
                    <strong style="font-size:15px;">${escapeHtml(title)}</strong>
                    <div style="color:#666; font-size:13px; margin-top:4px;">${escapeHtml(it.location)} • ${escapeHtml(it.type)}</div>
                    <div style="color:#059669; font-weight:600; margin-top:6px;">${priceMonth}${priceYear ? '<br>' + priceYear : ''}</div>
                    <div style="margin-top:10px; display:flex; gap:6px; flex-wrap:wrap;">
                        <a href='#' data-id='${it.id}' class='book-link' style="display:inline-block; background:#2563eb; color:#fff; padding:6px 14px; border-radius:6px; text-decoration:none; font-size:13px;">จองเลย</a>
                        <a href='#' data-id='${it.id}' class='contact-link' style="display:inline-block; background:#059669; color:#fff; padding:6px 14px; border-radius:6px; text-decoration:none; font-size:13px;">📞 ติดต่อ</a>
                    </div>
                </div>
            `
            marker.bindPopup(popupHtml, {maxWidth: 300})
            markers.push(marker)
        }
    })
    
    // locate button - find user position and show nearest listings
    const locateBtn = document.getElementById('locate-btn')
    if(locateBtn){
        locateBtn.addEventListener('click', ()=>{
            if(!navigator.geolocation){ 
                alert('เบราว์เซอร์ไม่รองรับการใช้งาน GPS')
                return 
            }
            locateBtn.textContent = 'กำลังค้นหา...'
            locateBtn.disabled = true
            
            navigator.geolocation.getCurrentPosition(pos=>{
                const lat = pos.coords.latitude
                const lon = pos.coords.longitude
                
                // add user position marker
                const userMarker = L.circleMarker([lat,lon],{
                    radius:10,
                    fillColor:'#2563eb',
                    color:'#fff',
                    weight:3,
                    fillOpacity:0.9
                }).addTo(map)
                
                // center map on user
                map.setView([lat,lon],13)
                
                // find nearest listings
                const nearest = listings
                    .map(it=>({it,d:distance(lat,lon,it.lat||0,it.lon||0)}))
                    .sort((a,b)=>a.d-b.d)
                    .slice(0,3)
                
                // create popup content with nearest listings
                let popupHtml = '<div style="min-width:200px;"><strong style="font-size:15px;">📍 ตำแหน่งของคุณ</strong><hr style="margin:8px 0;">'
                if(nearest.length > 0){
                    popupHtml += '<strong style="font-size:13px;">ที่พักใกล้เคียง:</strong>'
                    nearest.forEach((n,i)=>{ 
                        popupHtml += `
                            <div style="margin-top:8px; padding-top:6px; border-top:1px solid #eee;">
                                <strong>${i+1}. ${escapeHtml(n.it.title)}</strong><br>
                                <span style="color:#666; font-size:12px;">${escapeHtml(n.it.location)}</span><br>
                                <span style="color:#059669; font-size:12px;">ระยะทาง: ~${Math.round(n.d)} กม.</span>
                            </div>
                        `
                    })
                } else {
                    popupHtml += '<div style="margin-top:8px; color:#999;">ไม่พบที่พักในพื้นที่นี้</div>'
                }
                popupHtml += '</div>'
                
                userMarker.bindPopup(popupHtml).openPopup()
                
                locateBtn.textContent = 'ค้นหาตำแหน่งของฉัน'
                locateBtn.disabled = false
            }, err=>{
                locateBtn.textContent='ค้นหาตำแหน่งของฉัน'
                locateBtn.disabled = false
                alert('ไม่สามารถรับตำแหน่งได้: '+err.message)
            })
        })
    }
    
    // delegate booking and contact link clicks from popups
    document.addEventListener('click', e=>{
        // Handle book link
        const bookLink = e.target.closest && e.target.closest('.book-link')
        if(bookLink){ 
            e.preventDefault()
            const id = bookLink.dataset.id
            const btn = document.querySelector(`.btn.primary[data-id='${id}']`)
            if(btn) btn.click()
            return
        }
        
        // Handle contact link
        const contactLink = e.target.closest && e.target.closest('.contact-link')
        if(contactLink){
            e.preventDefault()
            const id = contactLink.dataset.id
            contactOwner(id)
        }
    })
}

// Haversine distance in km
function distance(lat1,lon1,lat2,lon2){
    const toRad = v => v*Math.PI/180
    const R = 6371
    const dLat = toRad(lat2-lat1)
    const dLon = toRad(lon2-lon1)
    const a = Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)*Math.sin(dLon/2)
    const c = 2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))
    return R*c
}

function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, ch=>({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"
    }[ch]))
}
    function renderContactValue(raw){
        if(!raw) return ''
        const value = String(raw).trim()
        if(!value) return ''

        const isUrl = /^https?:\/\//i.test(value)
        const startsWithWww = /^www\./i.test(value)
        const containsFacebook = /facebook\.com/i.test(value)

        let href = value
        if(!isUrl){
            if(startsWithWww){
                href = `https://${value}`
            } else if(containsFacebook){
                href = `https://${value}`
            } else {
                const normalized = value.replace(/^@/, '')
                href = `https://www.facebook.com/${normalized}`
            }
        }

        const safeHref = escapeHtml(href)
        const safeLabel = escapeHtml(value)
        return `<a href="${safeHref}" target="_blank" rel="noopener">${safeLabel}</a>`
    }

// Profile Modal logic
function openProfileModal() {
    const user = JSON.parse(localStorage.getItem('unai_user') || 'null')
    if(!user) return
    
    const users = window.auth.getUsers()
    const fullUser = users.find(u => u.username === user.username)
    
    document.getElementById('profile-username').value = user.username
    document.getElementById('profile-email').value = user.email || ''
    
    const roleNames = { 
        customer: '👤 ลูกค้า (Customer)', 
        owner: '🏠 ผู้ปล่อยเช่า (Owner)', 
        admin: '⚙️ Admin (ผู้ดูแลระบบ)' 
    }
    document.getElementById('profile-role').value = roleNames[user.role] || user.role
    
    const createdDate = fullUser && fullUser.createdAt 
        ? new Date(fullUser.createdAt).toLocaleDateString('th-TH', { 
            year: 'numeric', month: 'long', day: 'numeric' 
        })
        : '-'
    document.getElementById('profile-created').value = createdDate
    
    // Show owner request section for customers only
    const reqSec = document.getElementById('profile-owner-request')
    if(user.role === 'customer') {
        reqSec.style.display = 'block'
        checkProfileOwnerRequestStatus()
    } else {
        reqSec.style.display = 'none'
    }
    
    document.getElementById('profileModal').style.display = 'flex'
}

function closeProfileModal() {
    document.getElementById('profileModal').style.display = 'none'
    // Reset to view mode when closing
    const viewMode = document.getElementById('profile-view-mode')
    const editMode = document.getElementById('profile-edit-mode')
    if(viewMode) viewMode.style.display = 'block'
    if(editMode) editMode.style.display = 'none'
}

function showEditProfile() {
    const user = JSON.parse(localStorage.getItem('unai_user') || 'null')
    if(!user) return
    
    // Populate edit form
    document.getElementById('edit-profile-username').value = user.username || ''
    document.getElementById('edit-profile-email').value = user.email || ''
    document.getElementById('edit-profile-password').value = ''
    document.getElementById('edit-profile-confirm-password').value = ''
    
    // Toggle modes
    document.getElementById('profile-view-mode').style.display = 'none'
    document.getElementById('profile-edit-mode').style.display = 'block'
}

function cancelEditProfile() {
    // Toggle back to view mode
    document.getElementById('profile-view-mode').style.display = 'block'
    document.getElementById('profile-edit-mode').style.display = 'none'
}

function saveProfileChanges(e) {
    e.preventDefault()
    
    const user = JSON.parse(localStorage.getItem('unai_user') || 'null')
    if(!user) return
    
    const email = document.getElementById('edit-profile-email').value.trim()
    const password = document.getElementById('edit-profile-password').value
    const confirmPassword = document.getElementById('edit-profile-confirm-password').value
    
    // Validate email
    if(!email) {
        alert('กรุณากรอกอีเมล')
        return
    }
    
    // Validate password match if provided
    if(password || confirmPassword) {
        if(password !== confirmPassword) {
            alert('รหัสผ่านไม่ตรงกัน')
            return
        }
        if(password.length < 4) {
            alert('รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร')
            return
        }
    }
    
    // Update profile
    const updates = { email }
    if(password) {
        updates.password = password
    }
    
    const result = window.auth.updateUserProfile(user.username, updates)
    alert(result.message)
    
    if(result.success) {
        // Update current user in localStorage
        const updatedUser = JSON.parse(localStorage.getItem('unai_users') || '[]')
            .find(u => u.username === user.username)
        if(updatedUser) {
            localStorage.setItem('unai_user', JSON.stringify(updatedUser))
        }
        
        // Refresh profile display
        openProfileModal()
    }
}

function checkProfileOwnerRequestStatus() {
    const user = JSON.parse(localStorage.getItem('unai_user') || 'null')
    if(!user) return
    
    const reqs = window.auth.getOwnerRequests()
    const found = reqs.find(r => r.username === user.username)
    const btn = document.getElementById('profile-request-owner-btn')
    const status = document.getElementById('profile-request-owner-status')
    
    if(found) {
        btn.disabled = true
        btn.style.opacity = '0.6'
        btn.style.cursor = 'not-allowed'
        status.textContent = '✓ คุณส่งคำขอแล้ว กรุณารอ Admin อนุมัติ'
    } else {
        btn.disabled = false
        btn.style.opacity = '1'
        btn.style.cursor = 'pointer'
        status.textContent = ''
    }
}

// Setup owner request button
document.addEventListener('DOMContentLoaded', function() {
    const requestBtn = document.getElementById('profile-request-owner-btn')
    if(requestBtn) {
        requestBtn.addEventListener('click', function() {
            const user = JSON.parse(localStorage.getItem('unai_user') || 'null')
            if(!user) return
            
            const result = window.auth.requestOwnerRole(user.username)
            alert(result.message)
            
            if(result.success) {
                checkProfileOwnerRequestStatus()
            }
        })
    }
    
    // Setup edit profile button
    const editBtn = document.getElementById('edit-profile-btn')
    if(editBtn) {
        editBtn.addEventListener('click', showEditProfile)
    }
    
    // Setup cancel edit button
    const cancelBtn = document.getElementById('cancel-edit-profile-btn')
    if(cancelBtn) {
        cancelBtn.addEventListener('click', cancelEditProfile)
    }
    
    // Setup profile edit form
    const editForm = document.getElementById('edit-profile-form')
    if(editForm) {
        editForm.addEventListener('submit', saveProfileChanges)
    }
    
    // Close modal when clicking outside
    const modal = document.getElementById('profileModal')
    if(modal) {
        modal.addEventListener('click', function(e) {
            if(e.target === modal) {
                closeProfileModal()
            }
        })
    }
})

document.addEventListener('DOMContentLoaded', init)
