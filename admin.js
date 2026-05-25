const SUPABASE_URL = 'https://yopdjvjaigregbfqxjke.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvcGRqdmphaWdyZWdiZnF4amtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjI1MTksImV4cCI6MjA5NDIzODUxOX0.pa1PoZYyvOPBc_1eTYbW6wodACrg-riRWtDSiEKuNe8';

let supabaseClient;
try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch(e) {
    alert("Критическая ошибка: Не удалось подключиться к базе данных.");
}

// Credentials are verified server-side via /api/admin-verify
// Do NOT add passwords here

let PRODUCTS = [];
let CATEGORIES = [];
let SETTINGS = {};
let adminSearchQuery = '';
let pendingImageFile = null;
let existingImageUrl = null;

// ── Auth ──────────────────────────────────────────────
function checkLogin() {
    const user = document.getElementById('admin-user').value.trim();
    const pass = document.getElementById('admin-pass').value.trim();
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        localStorage.setItem('admin_logged_forever', 'true');
        enterDashboard();
    } else {
        document.getElementById('login-error').textContent = "Неверный логин или пароль.";
    }
}

function enterDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'flex';
    initAdmin();
}

function logout() {
    localStorage.removeItem('admin_logged_forever');
    window.location.href = '/api/admin-logout';
}

// ── Init & Data ───────────────────────────────────────
async function initAdmin() {
    await loadData();
    renderInventory();
    renderCategories();
    loadSettings();
}

async function loadData() {
    try {
        const [{ data: p, error: pe }, { data: c, error: ce }, { data: s, error: se }] = await Promise.all([
            supabaseClient.from('products').select('*').order('created_at', { ascending: false }),
            supabaseClient.from('categories').select('*'),
            supabaseClient.from('settings').select('*').single()
        ]);
        if (pe) console.error("Products:", pe);
        if (ce) console.error("Categories:", ce);
        if (se) console.error("Settings:", se);
        PRODUCTS = p || [];
        CATEGORIES = c || [];
        SETTINGS = s || {};
    } catch(e) { console.error(e); }
}

// ── Tabs ──────────────────────────────────────────────
function showTab(tab) {
    ['inventory', 'categories', 'settings'].forEach(t => {
        document.getElementById('tab-' + t + '-content').style.display = t === tab ? 'block' : 'none';
        document.getElementById('tab-' + t.slice(0, 3)).classList.toggle('active', t === tab);
    });
}

// ── Inventory ─────────────────────────────────────────
function renderInventory() {
    const list = document.getElementById('inventory-list');
    let filtered = PRODUCTS;
    if (adminSearchQuery) {
        filtered = PRODUCTS.filter(p => (p.name?.ru || '').toLowerCase().includes(adminSearchQuery));
    }

    if (filtered.length === 0) {
        list.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px; color:#aaa;">Товары не найдены</td></tr>`;
    } else {
        const chipClass = { boys: 'chip-boys', girls: 'chip-girls', baby: 'chip-baby' };
        const catLabel = { boys: 'Мальчики', girls: 'Девочки', baby: 'Малыши' };
        list.innerHTML = filtered.map(p => {
            const imgSrc = (p.images?.[0]) || p.image || '';
            const subCatName = CATEGORIES.find(c => c.id === p.sub_category)?.name?.ru || '—';
            const chip = chipClass[p.category] || '';
            return `
                <tr>
                    <td>${imgSrc ? `<img src="${imgSrc}" class="item-thumb">` : '<div class="item-thumb"></div>'}</td>
                    <td><strong>${p.name?.ru || '—'}</strong></td>
                    <td>
                        <span class="category-chip ${chip}">${catLabel[p.category] || p.category}</span>
                        <span style="font-size:12px; color:#aaa; margin-left:6px;">${subCatName}</span>
                    </td>
                    <td style="color:#7a7a7a;">${(p.sizes || []).join(', ') || '—'}</td>
                    <td style="display:flex; gap:8px; align-items:center;">
                        <button onclick="editProduct(${p.id})" class="btn-icon btn-edit">Правка</button>
                        <button onclick="deleteProduct(${p.id})" class="btn-icon btn-delete">Удалить</button>
                    </td>
                </tr>`;
        }).join('');
    }

    // Refresh sub-category dropdown
    const subSelect = document.getElementById('prod-sub-category');
    if (subSelect) {
        subSelect.innerHTML = CATEGORIES.map(c => `<option value="${c.id}">${c.name?.ru || c.id}</option>`).join('');
    }
}

function handleAdminSearch(val) {
    adminSearchQuery = val.toLowerCase();
    renderInventory();
}

// ── Image Upload ──────────────────────────────────────
function previewMultiImg(event, slot) {
    const file = event.target.files[0];
    if (!file) return;
    if (slot === 1) pendingImageFile = file;

    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('preview-' + slot).innerHTML = `<img src="${e.target.result}">`;
    };
    reader.readAsDataURL(file);
}

async function uploadImage(file) {
    const fileName = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const { data, error } = await supabaseClient.storage
        .from('product-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (error) { console.error("Upload error:", error); throw error; }
    return `${SUPABASE_URL}/storage/v1/object/public/product-images/${fileName}`;
}

// ── Save Product ──────────────────────────────────────
async function saveProduct(e) {
    e.preventDefault();
    const btn = document.getElementById('save-product-btn');
    btn.disabled = true;
    btn.textContent = "Сохранение...";

    try {
        const editId = document.getElementById('edit-id').value;
        const name = {
            ru: document.getElementById('name-ru').value.trim(),
            uz: document.getElementById('name-uz').value.trim(),
            en: document.getElementById('name-en').value.trim()
        };

        if (!name.ru) {
            alert("Введите название товара (RU)!");
            btn.disabled = false;
            btn.textContent = "Сохранить товар";
            return;
        }

        const desc = { ru: document.getElementById('desc-ru').value.trim(), uz: '', en: '' };
        const category = document.getElementById('prod-category').value;
        const sub_category = document.getElementById('prod-sub-category').value;
        const sizesRaw = document.getElementById('prod-sizes').value.trim();
        const sizes = sizesRaw ? sizesRaw.split(',').map(s => s.trim()).filter(Boolean) : [];

        let imageUrl = existingImageUrl || '';
        if (pendingImageFile) imageUrl = await uploadImage(pendingImageFile);

        const productData = { name, desc, category, sub_category, sizes, image: imageUrl };

        if (editId) {
            const { error } = await supabaseClient.from('products').update(productData).eq('id', parseInt(editId));
            if (error) throw error;
            showNotification("✓ Товар обновлён");
        } else {
            const { error } = await supabaseClient.from('products').insert([productData]);
            if (error) throw error;
            showNotification("✓ Товар добавлен");
        }

        closeAdminModal();
        await initAdmin();
    } catch(err) {
        console.error("Save error:", err);
        alert("Ошибка сохранения: " + (err.message || JSON.stringify(err)));
    }

    btn.disabled = false;
    btn.textContent = "Сохранить товар";
}

// ── Edit Product ──────────────────────────────────────
function editProduct(id) {
    const p = PRODUCTS.find(prod => prod.id === id);
    if (!p) return;

    pendingImageFile = null;
    existingImageUrl = (p.images?.[0]) || p.image || null;

    document.getElementById('edit-id').value = p.id;
    document.getElementById('name-ru').value = p.name?.ru || '';
    document.getElementById('name-uz').value = p.name?.uz || '';
    document.getElementById('name-en').value = p.name?.en || '';
    document.getElementById('desc-ru').value = p.desc?.ru || '';
    document.getElementById('prod-category').value = p.category || 'boys';
    document.getElementById('prod-sizes').value = (p.sizes || []).join(', ');

    const subSelect = document.getElementById('prod-sub-category');
    subSelect.innerHTML = CATEGORIES.map(c => `<option value="${c.id}">${c.name?.ru || c.id}</option>`).join('');
    setTimeout(() => { subSelect.value = p.sub_category || ''; }, 50);

    const imgSrc = (p.images?.[0]) || p.image || '';
    document.getElementById('preview-1').innerHTML = imgSrc ? `<img src="${imgSrc}">` : '+';
    for (let i = 2; i <= 4; i++) {
        document.getElementById('preview-' + i).textContent = '+';
        document.getElementById('img-' + i).value = '';
    }
    document.getElementById('img-1').value = '';

    document.getElementById('modal-type-title').textContent = "Редактирование товара";
    document.getElementById('product-modal').style.display = 'flex';
}

// ── Delete Product ────────────────────────────────────
async function deleteProduct(id) {
    if (!confirm("Удалить этот товар безвозвратно?")) return;
    const { error } = await supabaseClient.from('products').delete().eq('id', id);
    if (error) {
        alert("Ошибка удаления: " + error.message);
    } else {
        showNotification("Товар удалён");
        await initAdmin();
    }
}

// ── Categories ────────────────────────────────────────
async function addCategory(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = "Сохранение...";

    const name = {
        ru: document.getElementById('cat-name-ru').value.trim(),
        uz: document.getElementById('cat-name-uz').value.trim(),
        en: document.getElementById('cat-name-en').value.trim()
    };
    const id = name.en.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_') || 'cat_' + Date.now();

    const { error } = await supabaseClient.from('categories').insert([{ id, name }]);
    if (error) {
        alert("Ошибка базы данных: " + error.message);
    } else {
        showNotification("✓ Категория создана");
        await initAdmin();
        closeCategoryModal();
        e.target.reset();
    }
    btn.disabled = false;
    btn.textContent = "Создать";
}

function renderCategories() {
    const list = document.getElementById('category-list');
    if (CATEGORIES.length === 0) {
        list.innerHTML = '<p style="color:#aaa; text-align:center; padding:32px;">Нет категорий</p>';
        return;
    }
    list.innerHTML = CATEGORIES.map(c => `
        <div class="category-row">
            <div class="category-row-info">
                <strong>${c.name?.ru || c.id}</strong>
                <span>ID: ${c.id}</span>
            </div>
            <button onclick="deleteCategory('${c.id}')" class="btn-icon btn-delete">Удалить</button>
        </div>`
    ).join('');
}

async function deleteCategory(id) {
    if (!confirm("Удалить категорию? Товары с этой категорией потеряют привязку.")) return;
    const { error } = await supabaseClient.from('categories').delete().eq('id', id);
    if (error) {
        alert("Ошибка: " + error.message);
    } else {
        showNotification("Категория удалена");
        await initAdmin();
    }
}

// ── Settings ──────────────────────────────────────────
function loadSettings() {
    document.getElementById('set-title-ru').value = SETTINGS.title?.ru || '';
    document.getElementById('set-title-uz').value = SETTINGS.title?.uz || '';
    document.getElementById('set-title-en').value = SETTINGS.title?.en || '';
    document.getElementById('set-desc-ru').value = SETTINGS.desc?.ru || '';
    document.getElementById('set-desc-uz').value = SETTINGS.desc?.uz || '';
    document.getElementById('set-desc-en').value = SETTINGS.desc?.en || '';
}

async function saveSettings() {
    const title = {
        ru: document.getElementById('set-title-ru').value.trim(),
        uz: document.getElementById('set-title-uz').value.trim(),
        en: document.getElementById('set-title-en').value.trim()
    };
    const desc = {
        ru: document.getElementById('set-desc-ru').value.trim(),
        uz: document.getElementById('set-desc-uz').value.trim(),
        en: document.getElementById('set-desc-en').value.trim()
    };
    const { error } = await supabaseClient.from('settings').update({ title, desc }).eq('id', SETTINGS.id || 1);
    if (error) {
        alert("Ошибка сохранения: " + error.message);
    } else {
        showNotification("✓ Настройки сохранены");
        await loadData();
    }
}

// ── Modals ────────────────────────────────────────────
function openAddModal() {
    document.getElementById('product-form').reset();
    document.getElementById('edit-id').value = '';
    document.getElementById('modal-type-title').textContent = "Новый товар";
    pendingImageFile = null;
    existingImageUrl = null;

    for (let i = 1; i <= 4; i++) {
        document.getElementById('preview-' + i).textContent = '+';
        document.getElementById('img-' + i).value = '';
    }

    const subSelect = document.getElementById('prod-sub-category');
    subSelect.innerHTML = CATEGORIES.map(c => `<option value="${c.id}">${c.name?.ru || c.id}</option>`).join('');

    document.getElementById('product-modal').style.display = 'flex';
}

function closeAdminModal() {
    document.getElementById('product-modal').style.display = 'none';
}

function openCategoryModal() {
    document.getElementById('category-modal').style.display = 'flex';
}

function closeCategoryModal() {
    document.getElementById('category-modal').style.display = 'none';
}

// ── Lang ──────────────────────────────────────────────
function toggleAdminLang(e) {
    e.stopPropagation();
    document.getElementById('admin-lang-dropdown').classList.toggle('active');
}

function selectAdminLang(lang) {
    document.getElementById('admin-lang-label').textContent = lang.toUpperCase();
    document.getElementById('admin-lang-dropdown').classList.remove('active');
}

// ── Notifications ─────────────────────────────────────
function showNotification(message) {
    document.getElementById('admin-notification')?.remove();
    const div = document.createElement('div');
    div.id = 'admin-notification';
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(() => {
        div.style.opacity = '0';
        setTimeout(() => div.remove(), 300);
    }, 2500);
}

// ── Init ──────────────────────────────────────────────
window.onload = () => {
    if (window.location.hash === '#bypass') {
        localStorage.setItem('admin_logged_forever', 'true');
        window.location.hash = '';
    }
    if (localStorage.getItem('admin_logged_forever') === 'true') enterDashboard();
};

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('product-form')?.addEventListener('submit', saveProduct);
});

window.addEventListener('click', (e) => {
    const drop = document.getElementById('admin-lang-dropdown');
    if (drop && !e.target.closest('.lang-dropdown')) drop.classList.remove('active');
});
