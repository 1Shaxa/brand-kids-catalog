// Supabase Configuration
const SUPABASE_URL = 'https://yopdjvjaigregbfqxjke.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvcGRqdmphaWdyZWdiZnF4amtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjI1MTksImV4cCI6MjA5NDIzODUxOX0.pa1PoZYyvOPBc_1eTYbW6wodACrg-riRWtDSiEKuNe8';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Fallback Credentials
const ADMIN_USER = "BrandKidsAdmin_2026";
const ADMIN_PASS = "BK_Secure_99!_Store";

const T_ADMIN = {
    ru: {
        toSite: "На сайт", addProduct: "+ Добавить товар", logout: "Выйти",
        tabInv: "Инвентарь", tabCat: "Категории", tabSet: "Настройки",
        invTitle: "Управление инвентарем", invDesc: "Добавляйте товары и размеры.",
        catTitle: "Категории одежды", catDesc: "Управление типами одежды.",
        addCat: "+ Добавить категорию", setTitle: "Настройки и Безопасность", setDesc: "Управление доступом и контентом.",
        heroTitle: "Заголовок", heroDesc: "Описание", save: "Сохранить настройки"
    },
    uz: {
        toSite: "Saytga", addProduct: "+ Mahsulot qo'shish", logout: "Chiqish",
        tabInv: "Inventar", tabCat: "Kategoriyalar", tabSet: "Sozlamalar",
        invTitle: "Inventarni boshqarish", invDesc: "Mahsulotlar va o'lchamlarni qo'shing.",
        catTitle: "Kiyim kategoriyalari", catDesc: "Kiyim turlarini boshqarish.",
        addCat: "+ Kategoriya qo'shish", setTitle: "Sozlamalar va Xavfsizlik", setDesc: "Kirish va kontentni boshqarish.",
        heroTitle: "Sarlavha", heroDesc: "Tavsif", save: "Saqlash"
    },
    en: {
        toSite: "To Site", addProduct: "+ Add Product", logout: "Logout",
        tabInv: "Inventory", tabCat: "Categories", tabSet: "Settings",
        invTitle: "Inventory Management", invDesc: "Add products and sizes.",
        catTitle: "Clothing Categories", catDesc: "Manage clothing types.",
        addCat: "+ Add Category", setTitle: "Settings & Security", setDesc: "Manage access and content.",
        heroTitle: "Title", heroDesc: "Description", save: "Save"
    }
};

let currentLang = 'ru';
let products = [];
let categories = [];
let settings = {};
let sessions = [];

function toggleAdminLangDropdown(e) {
    e.stopPropagation();
    document.getElementById('admin-lang-dropdown').classList.toggle('active');
}

function selectAdminLanguage(lang) {
    setAdminLanguage(lang);
    document.getElementById('current-admin-lang-label').innerText = lang.toUpperCase();
    document.getElementById('admin-lang-dropdown').classList.remove('active');
}

function setAdminLanguage(lang) {
    currentLang = lang;
    document.querySelectorAll('.lang-option').forEach(opt => {
        const isTarget = opt.getAttribute('onclick').includes(`'${lang}'`);
        opt.classList.toggle('active', isTarget);
    });
    
    document.getElementById('btn-to-site').innerText = T_ADMIN[lang].toSite;
    document.querySelector('button[onclick*="openAddModal"]').innerText = T_ADMIN[lang].addProduct;
    document.querySelector('button[onclick*="logout"]').innerText = T_ADMIN[lang].logout;
    document.getElementById('tab-inv').innerText = T_ADMIN[lang].tabInv;
    document.getElementById('tab-cat').innerText = T_ADMIN[lang].tabCat;
    document.getElementById('tab-set').innerText = T_ADMIN[lang].tabSet;
    document.getElementById('inv-title').innerText = T_ADMIN[lang].invTitle;
    document.getElementById('inv-desc').innerText = T_ADMIN[lang].invDesc;
    document.getElementById('cat-title').innerText = T_ADMIN[lang].catTitle;
    document.getElementById('cat-desc').innerText = T_ADMIN[lang].catDesc;
    document.getElementById('btn-add-cat').innerText = T_ADMIN[lang].addCat;
    document.getElementById('set-title-h1').innerText = T_ADMIN[lang].setTitle;
    document.getElementById('set-desc-p').innerText = T_ADMIN[lang].setDesc;
    document.getElementById('set-hero-title').innerText = T_ADMIN[lang].heroTitle;
    document.getElementById('set-hero-desc').innerText = T_ADMIN[lang].heroDesc;
    document.getElementById('btn-save-settings').innerText = T_ADMIN[lang].save;
}

// ---- Auth ----
const sessionToken = localStorage.getItem('admin_token');

async function checkSession() {
    if (!sessionToken) return false;
    try {
        const { data, error } = await supabaseClient.from('admin_sessions').select('*').eq('token', sessionToken).single();
        return !error && data;
    } catch(e) { return false; }
}

async function checkLogin() {
    const user = document.getElementById('admin-user').value;
    const pass = document.getElementById('admin-pass').value;

    try {
        const { data: auth } = await supabaseClient.from('admin_auth').select('*').eq('username', user).eq('password', pass).single();
        if (auth || (user === ADMIN_USER && pass === ADMIN_PASS)) {
            sessionStorage.setItem('admin_logged_in', 'true');
            enterDashboard();
            return;
        }
    } catch(e) {
        if (user === ADMIN_USER && pass === ADMIN_PASS) {
            sessionStorage.setItem('admin_logged_in', 'true');
            enterDashboard();
            return;
        }
    }
    document.getElementById('login-error').innerText = "Неверный логин или пароль";
}

function enterDashboard() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'block';
    initAdmin();
}

async function logout() {
    sessionStorage.removeItem('admin_logged_in');
    location.reload();
}

// ---- Core Logic ----
async function initAdmin() {
    await loadData();
    renderInventory();
    renderCategories();
    loadSettings();
    updateSubCategorySelect();
    setAdminLanguage(currentLang);
}

async function loadData() {
    const { data: p } = await supabaseClient.from('products').select('*').order('created_at', { ascending: false });
    const { data: c } = await supabaseClient.from('categories').select('*');
    const { data: s } = await supabaseClient.from('settings').select('*').single();
    
    products = p || [];
    categories = c || [];
    settings = s || {};
}

function showTab(tab) {
    document.getElementById('tab-inventory-content').style.display = tab === 'inventory' ? 'block' : 'none';
    document.getElementById('tab-categories-content').style.display = tab === 'categories' ? 'block' : 'none';
    document.getElementById('tab-settings-content').style.display = tab === 'settings' ? 'block' : 'none';
    
    document.getElementById('tab-inv').classList.toggle('active', tab === 'inventory');
    document.getElementById('tab-cat').classList.toggle('active', tab === 'categories');
    document.getElementById('tab-set').classList.toggle('active', tab === 'settings');
}

// ---- Multi Image Helpers ----
function previewMultiImg(event, index) {
    const reader = new FileReader();
    reader.onload = function() {
        document.getElementById(`preview-${index}`).innerHTML = `<img src="${reader.result}">`;
    }
    reader.readAsDataURL(event.target.files[0]);
}

async function uploadImage(file) {
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await supabaseClient.storage
        .from('product-images')
        .upload(fileName, file);
    
    if (error) throw error;
    
    const { data: { publicUrl } } = supabaseClient.storage
        .from('product-images')
        .getPublicUrl(fileName);
        
    return publicUrl;
}

// ---- Product Management ----
function renderInventory() {
    const list = document.getElementById('inventory-list');
    list.innerHTML = products.map((p) => `
        <div class="inventory-item">
            <img src="${p.images ? p.images[0] : p.image}" class="item-thumb">
            <div class="item-info">
                <h3>${p.name.ru}</h3>
                <span>${p.category}</span>
            </div>
            <div class="item-actions">
                <button onclick="editProduct(${p.id})" class="btn-link">Редактировать</button>
                <button onclick="deleteProduct(${p.id})" class="btn-link" style="color: #ef4444;">Удалить</button>
            </div>
        </div>
    `).join('');
}

const modal = document.getElementById('product-modal');
function openAddModal() {
    document.getElementById('product-form').reset();
    document.getElementById('edit-id').value = "";
    document.getElementById('modal-type-title').innerText = "Добавить новый товар";
    for(let i=1; i<=4; i++) {
        document.getElementById(`preview-${i}`).innerHTML = `<span>${i===1?'Главное':'Фото '+i}</span>`;
    }
    modal.classList.add('active');
}

function editProduct(id) {
    const p = products.find(prod => prod.id === id);
    if (!p) return;

    document.getElementById('edit-id').value = p.id;
    document.getElementById('modal-type-title').innerText = "Редактировать товар";
    document.getElementById('name-ru').value = p.name.ru;
    document.getElementById('name-uz').value = p.name.uz;
    document.getElementById('name-en').value = p.name.en;
    document.getElementById('prod-category').value = p.category;
    document.getElementById('prod-sub-category').value = p.sub_category || "";
    document.getElementById('desc-ru').value = p.desc.ru;
    document.getElementById('desc-uz').value = p.desc.uz;
    document.getElementById('desc-en').value = p.desc.en;
    document.getElementById('prod-sizes').value = (p.sizes || []).join(', ');
    
    const imgs = p.images || [p.image];
    for(let i=1; i<=4; i++) {
        const preview = document.getElementById(`preview-${i}`);
        if (imgs[i-1]) {
            preview.innerHTML = `<img src="${imgs[i-1]}">`;
        } else {
            preview.innerHTML = `<span>Фото ${i}</span>`;
        }
    }
    modal.classList.add('active');
}

document.getElementById('product-form').onsubmit = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('save-product-btn');
    btn.disabled = true;
    btn.innerText = "Сохранение...";

    try {
        const editId = document.getElementById('edit-id').value;
        let imageUrls = [];

        // Collect existing and new images
        for(let i=1; i<=4; i++) {
            const fileInput = document.getElementById(`img-${i}`);
            const previewImg = document.querySelector(`#preview-${i} img`);
            
            if (fileInput.files[0]) {
                const url = await uploadImage(fileInput.files[0]);
                imageUrls.push(url);
            } else if (previewImg && previewImg.src.startsWith('http')) {
                imageUrls.push(previewImg.src);
            }
        }

        const productData = {
            name: { ru: document.getElementById('name-ru').value, uz: document.getElementById('name-uz').value, en: document.getElementById('name-en').value },
            category: document.getElementById('prod-category').value,
            sub_category: document.getElementById('prod-sub-category').value,
            desc: { ru: document.getElementById('desc-ru').value, uz: document.getElementById('desc-uz').value, en: document.getElementById('desc-en').value },
            images: imageUrls,
            image: imageUrls[0], // for backward compatibility
            sizes: document.getElementById('prod-sizes').value.split(',').map(s => s.trim())
        };

        if (editId) {
            await supabaseClient.from('products').update(productData).eq('id', editId);
        } else {
            await supabaseClient.from('products').insert([productData]);
        }

        await initAdmin();
        closeAdminModal();
    } catch (err) {
        alert("Ошибка: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Сохранить товар";
    }
};

// ---- Categories ----
function renderCategories() {
    const list = document.getElementById('category-list');
    list.innerHTML = categories.map((c) => `
        <div class="inventory-item">
            <div class="item-info"><h3>${c.name.ru}</h3></div>
            <button onclick="deleteCategory('${c.id}')" class="btn-link" style="color: #ef4444;">Удалить</button>
        </div>
    `).join('');
    updateSubCategorySelect();
}

async function addCategory(e) {
    e.preventDefault();
    const id = 'cat_' + Date.now();
    const name = { ru: document.getElementById('cat-name-ru').value, uz: document.getElementById('cat-name-uz').value, en: document.getElementById('cat-name-en').value };
    await supabaseClient.from('categories').insert([{ id, name }]);
    await initAdmin();
    closeCategoryModal();
    e.target.reset();
}

function openCategoryModal() { document.getElementById('category-modal').classList.add('active'); }
function closeCategoryModal() { document.getElementById('category-modal').classList.remove('active'); }

async function deleteCategory(id) {
    if (confirm("Удалить?")) {
        await supabaseClient.from('categories').delete().eq('id', id);
        await initAdmin();
    }
}

function updateSubCategorySelect() {
    const select = document.getElementById('prod-sub-category');
    select.innerHTML = categories.map(c => `<option value="${c.id}">${c.name.ru}</option>`).join('');
}

async function deleteProduct(id) {
    if (confirm("Удалить?")) {
        await supabaseClient.from('products').delete().eq('id', id);
        await initAdmin();
    }
}

// --- Settings ---
function loadSettings() {
    if (!settings.title) return;
    document.getElementById('set-title-ru').value = settings.title.ru;
    document.getElementById('set-title-uz').value = settings.title.uz;
    document.getElementById('set-title-en').value = settings.title.en;
    document.getElementById('set-desc-ru').value = settings.desc.ru;
    document.getElementById('set-desc-uz').value = settings.desc.uz;
    document.getElementById('set-desc-en').value = settings.desc.en;
}

async function saveSettings() {
    const newSettings = {
        title: { ru: document.getElementById('set-title-ru').value, uz: document.getElementById('set-title-uz').value, en: document.getElementById('set-title-en').value },
        desc: { ru: document.getElementById('set-desc-ru').value, uz: document.getElementById('set-desc-uz').value, en: document.getElementById('set-desc-en').value }
    };
    await supabaseClient.from('settings').update(newSettings).eq('id', 1);
    alert("Сохранено!");
    await loadData();
}

function usePreset(type) {
    const presets = { sml: "S, M, L, XL", age: "1-2 года, 2-3 года", height: "86, 92, 98" };
    document.getElementById('prod-sizes').value = presets[type];
}

function closeAdminModal() { document.getElementById('product-modal').classList.remove('active'); }

window.onclick = (e) => { 
    if (e.target === document.getElementById('product-modal')) closeAdminModal(); 
    if (e.target === document.getElementById('category-modal')) closeCategoryModal();
    const lDrop = document.getElementById('admin-lang-dropdown');
    if (lDrop) lDrop.classList.remove('active');
}

if (sessionStorage.getItem('admin_logged_in') === 'true') {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'block';
    initAdmin();
}
