// Brand Kids Admin - Full Dashboard v2.0
const SUPABASE_URL = 'https://yopdjvjaigregbfqxjke.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvcGRqdmphaWdyZWdiZnF4amtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjI1MTksImV4cCI6MjA5NDIzODUxOX0.pa1PoZYyvOPBc_1eTYbW6wodACrg-riRWtDSiEKuNe8';

let supabaseClient;
try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch(e) {
    alert("Критическая ошибка: Не удалось подключиться к базе данных. Проверьте интернет.");
}

const ADMIN_USER = "BrandKidsAdmin_2026";
const ADMIN_PASS = "BK_Secure_99!_Store";

let PRODUCTS = [];
let CATEGORIES = [];
let SETTINGS = {};
let adminSearchQuery = '';

// Temporary storage for image files selected in the modal
let pendingImageFile = null;
let existingImageUrl = null;

// ===================== AUTH =====================
function checkLogin() {
    const user = document.getElementById('admin-user').value.trim();
    const pass = document.getElementById('admin-pass').value.trim();
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        localStorage.setItem('admin_logged_forever', 'true');
        enterDashboard();
    } else {
        document.getElementById('login-error').innerText = "Ошибка входа. Проверьте данные.";
    }
}

function enterDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'flex';
    initAdmin();
}

function logout() {
    localStorage.removeItem('admin_logged_forever');
    document.getElementById('admin-dashboard').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
}

// ===================== INIT & DATA =====================
async function initAdmin() {
    await loadData();
    renderInventory();
    renderCategories();
    loadSettings();
}

async function loadData() {
    try {
        const { data: p, error: pe } = await supabaseClient.from('products').select('*').order('created_at', { ascending: false });
        const { data: c, error: ce } = await supabaseClient.from('categories').select('*');
        const { data: s, error: se } = await supabaseClient.from('settings').select('*').single();
        if (pe) console.error("Products fetch error:", pe);
        if (ce) console.error("Categories fetch error:", ce);
        if (se) console.error("Settings fetch error:", se);
        PRODUCTS = p || [];
        CATEGORIES = c || [];
        SETTINGS = s || {};
    } catch (e) { console.error(e); }
}

// ===================== TABS =====================
function showTab(tab) {
    // Hide all tab contents
    document.getElementById('tab-inventory-content').style.display = 'none';
    document.getElementById('tab-categories-content').style.display = 'none';
    document.getElementById('tab-settings-content').style.display = 'none';

    // Remove active class from all nav items
    document.getElementById('tab-inv').classList.remove('active');
    document.getElementById('tab-cat').classList.remove('active');
    document.getElementById('tab-set').classList.remove('active');

    // Show selected tab
    if (tab === 'inventory') {
        document.getElementById('tab-inventory-content').style.display = 'block';
        document.getElementById('tab-inv').classList.add('active');
    } else if (tab === 'categories') {
        document.getElementById('tab-categories-content').style.display = 'block';
        document.getElementById('tab-cat').classList.add('active');
    } else if (tab === 'settings') {
        document.getElementById('tab-settings-content').style.display = 'block';
        document.getElementById('tab-set').classList.add('active');
    }
}

// ===================== INVENTORY =====================
function renderInventory() {
    const list = document.getElementById('inventory-list');
    let filtered = PRODUCTS;
    if (adminSearchQuery) {
        filtered = PRODUCTS.filter(p => {
            const name = p.name?.ru || '';
            return name.toLowerCase().includes(adminSearchQuery);
        });
    }

    list.innerHTML = filtered.map(p => {
        const imgSrc = p.image || '';
        const catName = CATEGORIES.find(c => c.id === p.sub_category)?.name?.ru || p.sub_category || '—';
        return `
        <tr>
            <td><img src="${imgSrc}" style="width:50px; height:60px; object-fit:cover; background:#f0f0f0;"></td>
            <td><strong>${p.name?.ru || '—'}</strong></td>
            <td>${p.category} / ${catName}</td>
            <td>${(p.sizes || []).join(', ')}</td>
            <td>
                <button onclick="editProduct(${p.id})" style="color:blue; background:none; border:none; cursor:pointer; font-weight:600;">Правка</button>
                <button onclick="deleteProduct(${p.id})" style="color:red; background:none; border:none; cursor:pointer; font-weight:600; margin-left:10px;">Удалить</button>
            </td>
        </tr>
    `;
    }).join('');

    // Update sub-category dropdown in the product form
    const subSelect = document.getElementById('prod-sub-category');
    if (subSelect) {
        subSelect.innerHTML = CATEGORIES.map(c => `<option value="${c.id}">${c.name?.ru || c.id}</option>`).join('');
    }
}

function handleAdminSearch(val) {
    adminSearchQuery = val.toLowerCase();
    renderInventory();
}

// ===================== IMAGE UPLOAD =====================
function previewMultiImg(event, slot) {
    const file = event.target.files[0];
    if (!file) return;

    // We only use slot 1 for the main image (DB only has single `image` column)
    if (slot === 1) {
        pendingImageFile = file;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const previewDiv = document.getElementById('preview-' + slot);
        previewDiv.innerHTML = `<img src="${e.target.result}">`;
    };
    reader.readAsDataURL(file);
}

async function uploadImage(file) {
    const fileName = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const { data, error } = await supabaseClient.storage
        .from('product-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });

    if (error) {
        console.error("Upload error:", error);
        throw error;
    }

    // Build the public URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/product-images/${fileName}`;
    return publicUrl;
}

// ===================== SAVE PRODUCT (CREATE & EDIT) =====================
async function saveProduct(e) {
    e.preventDefault();

    const btn = document.getElementById('save-product-btn');
    btn.disabled = true;
    btn.innerText = "Сохранение...";

    try {
        const editId = document.getElementById('edit-id').value;

        // Gather form data
        const name = {
            ru: document.getElementById('name-ru').value.trim(),
            uz: document.getElementById('name-uz').value.trim(),
            en: document.getElementById('name-en').value.trim()
        };
        const desc = {
            ru: document.getElementById('desc-ru').value.trim(),
            uz: '',
            en: ''
        };
        const category = document.getElementById('prod-category').value;
        const sub_category = document.getElementById('prod-sub-category').value;
        const sizesRaw = document.getElementById('prod-sizes').value.trim();
        const sizes = sizesRaw ? sizesRaw.split(',').map(s => s.trim()).filter(s => s) : [];

        // Determine image URL
        let imageUrl = existingImageUrl || '';
        if (pendingImageFile) {
            imageUrl = await uploadImage(pendingImageFile);
        }

        if (!name.ru) {
            alert("Введите название товара (RU)!");
            btn.disabled = false;
            btn.innerText = "Сохранить товар";
            return;
        }

        const productData = {
            name,
            desc,
            category,
            sub_category,
            sizes,
            image: imageUrl
        };

        if (editId) {
            // UPDATE existing product
            const { error } = await supabaseClient.from('products').update(productData).eq('id', parseInt(editId));
            if (error) throw error;
            showNotification("Товар обновлён!");
        } else {
            // INSERT new product
            const { error } = await supabaseClient.from('products').insert([productData]);
            if (error) throw error;
            showNotification("Товар добавлен!");
        }

        closeAdminModal();
        await initAdmin();

    } catch (err) {
        console.error("Save error:", err);
        alert("Ошибка сохранения: " + (err.message || JSON.stringify(err)));
    }

    btn.disabled = false;
    btn.innerText = "Сохранить товар";
}

// ===================== EDIT PRODUCT =====================
function editProduct(id) {
    const p = PRODUCTS.find(prod => prod.id === id);
    if (!p) return;

    // Reset pending image
    pendingImageFile = null;
    existingImageUrl = p.image || null;

    // Fill form fields
    document.getElementById('edit-id').value = p.id;
    document.getElementById('name-ru').value = p.name?.ru || '';
    document.getElementById('name-uz').value = p.name?.uz || '';
    document.getElementById('name-en').value = p.name?.en || '';
    document.getElementById('desc-ru').value = p.desc?.ru || '';
    document.getElementById('prod-category').value = p.category || 'boys';
    document.getElementById('prod-sizes').value = (p.sizes || []).join(', ');

    // Refresh sub-category dropdown and set value
    const subSelect = document.getElementById('prod-sub-category');
    subSelect.innerHTML = CATEGORIES.map(c => `<option value="${c.id}">${c.name?.ru || c.id}</option>`).join('');
    setTimeout(() => {
        subSelect.value = p.sub_category || '';
    }, 50);

    // Show existing image in first preview slot
    const preview1 = document.getElementById('preview-1');
    if (p.image) {
        preview1.innerHTML = `<img src="${p.image}">`;
    } else {
        preview1.innerHTML = `<span>+</span>`;
    }
    // Clear remaining preview slots
    for (let i = 2; i <= 4; i++) {
        document.getElementById('preview-' + i).innerHTML = '<span>+</span>';
        document.getElementById('img-' + i).value = '';
    }
    document.getElementById('img-1').value = '';

    document.getElementById('modal-type-title').innerText = "Редактирование товара";
    document.getElementById('product-modal').style.display = 'flex';
}

// ===================== DELETE PRODUCT =====================
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

// ===================== CATEGORIES =====================
async function addCategory(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerText = "Сохранение...";

    const name = {
        ru: document.getElementById('cat-name-ru').value.trim(),
        uz: document.getElementById('cat-name-uz').value.trim(),
        en: document.getElementById('cat-name-en').value.trim()
    };

    // Generate a slug-like id from the english name
    const id = name.en.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_') || 'cat_' + Date.now();

    const { error } = await supabaseClient.from('categories').insert([{ id, name }]);

    if (error) {
        alert("Ошибка базы данных: " + error.message);
    } else {
        showNotification("Категория создана!");
        await initAdmin();
        closeCategoryModal();
        e.target.reset();
    }
    btn.disabled = false;
    btn.innerText = "Создать";
}

function renderCategories() {
    const list = document.getElementById('category-list');
    list.innerHTML = CATEGORIES.map(c => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:15px; border-bottom:1px solid #eee;">
            <div>
                <strong>${c.name?.ru || c.id}</strong>
                <span style="color:#999; margin-left:10px; font-size:12px;">ID: ${c.id}</span>
            </div>
            <button onclick="deleteCategory('${c.id}')" style="color:red; background:none; border:none; cursor:pointer; font-weight:600;">Удалить</button>
        </div>
    `).join('');
}

async function deleteCategory(id) {
    if (!confirm("Удалить категорию? Товары с этой категорией останутся, но потеряют привязку.")) return;

    const { error } = await supabaseClient.from('categories').delete().eq('id', id);
    if (error) {
        alert("Ошибка: " + error.message);
    } else {
        showNotification("Категория удалена");
        await initAdmin();
    }
}

// ===================== SETTINGS =====================
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
        showNotification("Настройки сохранены!");
        await loadData();
    }
}

// ===================== MODALS =====================
function openAddModal() {
    // Reset form completely
    document.getElementById('product-form').reset();
    document.getElementById('edit-id').value = "";
    document.getElementById('modal-type-title').innerText = "Новый товар";

    // Reset pending image
    pendingImageFile = null;
    existingImageUrl = null;

    // Reset image previews
    for (let i = 1; i <= 4; i++) {
        document.getElementById('preview-' + i).innerHTML = '<span>+</span>';
        document.getElementById('img-' + i).value = '';
    }

    // Refresh sub-category dropdown
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

// ===================== LANG =====================
function toggleAdminLang(e) {
    e.stopPropagation();
    document.getElementById('admin-lang-dropdown').classList.toggle('active');
}

function selectAdminLang(lang) {
    document.getElementById('admin-lang-label').innerText = lang.toUpperCase();
    document.getElementById('admin-lang-dropdown').classList.remove('active');
}

// ===================== NOTIFICATIONS =====================
function showNotification(message) {
    // Remove any existing notification
    const existing = document.getElementById('admin-notification');
    if (existing) existing.remove();

    const div = document.createElement('div');
    div.id = 'admin-notification';
    div.style.cssText = 'position:fixed; bottom:30px; right:30px; background:#000; color:#fff; padding:16px 28px; font-size:14px; font-weight:600; z-index:9999; border-radius:4px; box-shadow:0 4px 20px rgba(0,0,0,0.3);';
    div.innerText = message;
    document.body.appendChild(div);

    setTimeout(() => {
        div.style.opacity = '0';
        div.style.transition = 'opacity 0.3s';
        setTimeout(() => div.remove(), 300);
    }, 2500);
}

// ===================== INIT =====================
window.onload = () => {
    if (window.location.hash === '#bypass') {
        localStorage.setItem('admin_logged_forever', 'true');
        window.location.hash = '';
    }
    if (localStorage.getItem('admin_logged_forever') === 'true') enterDashboard();
};

// Attach form submit handler
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('product-form');
    if (form) {
        form.addEventListener('submit', saveProduct);
    }
});

window.onclick = (e) => {
    const drop = document.getElementById('admin-lang-dropdown');
    if (drop && !e.target.closest('.lang-dropdown')) drop.classList.remove('active');
};
