// Supabase Configuration
const SUPABASE_URL = 'https://yopdjvjaigregbfqxjke.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvcGRqdmphaWdyZWdiZnF4amtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjI1MTksImV4cCI6MjA5NDIzODUxOX0.pa1PoZYyvOPBc_1eTYbW6wodACrg-riRWtDSiEKuNe8';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_USER = "BrandKidsAdmin_2026";
const ADMIN_PASS = "BK_Secure_99!_Store";

// Check if already logged in
if (sessionStorage.getItem('admin_logged_in') === 'true') {
    window.onload = () => {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        initAdmin();
    };
}

let products = [];
let categories = [];
let settings = {};

// ---- Login & Init ----
function checkLogin() {
    if (document.getElementById('admin-user').value === ADMIN_USER && document.getElementById('admin-pass').value === ADMIN_PASS) {
        sessionStorage.setItem('admin_logged_in', 'true');
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'block';
        initAdmin();
    } else {
        document.getElementById('login-error').innerText = "Неверный логин или пароль";
    }
}

async function initAdmin() {
    await loadData();
    renderInventory();
    renderCategories();
    loadSettings();
    updateSubCategorySelect();
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

// ---- Category Management ----
function renderCategories() {
    const list = document.getElementById('category-list');
    list.innerHTML = categories.map((c) => `
        <div class="inventory-item">
            <div class="item-info">
                <h3>${c.name.ru} / ${c.name.uz} / ${c.name.en}</h3>
            </div>
            <button onclick="deleteCategory('${c.id}')" class="btn-link" style="color: #ef4444;">Удалить</button>
        </div>
    `).join('');
    updateSubCategorySelect();
}

async function addCategory(e) {
    e.preventDefault();
    const id = 'cat_' + Date.now();
    const name = {
        ru: document.getElementById('cat-name-ru').value,
        uz: document.getElementById('cat-name-uz').value,
        en: document.getElementById('cat-name-en').value
    };
    
    await supabaseClient.from('categories').insert([{ id, name }]);
    await initAdmin();
    e.target.reset();
}

async function deleteCategory(id) {
    if (confirm("Удалить эту категорию?")) {
        await supabaseClient.from('categories').delete().eq('id', id);
        await initAdmin();
    }
}

function updateSubCategorySelect() {
    const select = document.getElementById('prod-sub-category');
    select.innerHTML = categories.map(c => `<option value="${c.id}">${c.name.ru}</option>`).join('');
}

// ---- Inventory Management ----
function renderInventory() {
    const list = document.getElementById('inventory-list');
    list.innerHTML = products.map((p) => `
        <div class="inventory-item">
            <img src="${p.image}" class="item-thumb">
            <div class="item-info">
                <h3>${p.name.ru}</h3>
                <span>${p.category} | ${p.sub_category ? categories.find(c=>c.id===p.sub_category)?.name.ru : ''}</span>
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
    document.getElementById('img-preview-container').innerHTML = "<span>Нажмите, чтобы выбрать фото</span>";
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
    document.getElementById('img-preview-container').innerHTML = `<img src="${p.image}">`;
    modal.classList.add('active');
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

document.getElementById('product-form').onsubmit = async function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerText = "Сохранение...";

    try {
        const editId = document.getElementById('edit-id').value;
        const fileInput = document.getElementById('prod-image');
        let imageUrl = document.querySelector('#img-preview-container img')?.src;

        if (fileInput.files[0]) {
            imageUrl = await uploadImage(fileInput.files[0]);
        }

        const productData = {
            name: {
                ru: document.getElementById('name-ru').value,
                uz: document.getElementById('name-uz').value,
                en: document.getElementById('name-en').value
            },
            category: document.getElementById('prod-category').value,
            sub_category: document.getElementById('prod-sub-category').value,
            desc: {
                ru: document.getElementById('desc-ru').value,
                uz: document.getElementById('desc-uz').value,
                en: document.getElementById('desc-en').value
            },
            image: imageUrl,
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
        alert("Ошибка при сохранении: " + err.message);
    } finally {
        btn.disabled = false;
        btn.innerText = "Сохранить товар";
    }
};

async function deleteProduct(id) {
    if (confirm("Удалить этот товар?")) {
        await supabaseClient.from('products').delete().eq('id', id);
        await initAdmin();
    }
}

// --- Settings & Utils ---
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
    alert("Настройки сохранены в облаке!");
    await loadData();
}

function usePreset(type) {
    const presets = { sml: "S, M, L, XL", age: "1-2 года, 2-3 года, 3-4 года", height: "86, 92, 98, 104, 110" };
    document.getElementById('prod-sizes').value = presets[type];
}

function previewImg(event) {
    const reader = new FileReader();
    reader.onload = function() { document.getElementById('img-preview-container').innerHTML = `<img src="${reader.result}">`; }
    reader.readAsDataURL(event.target.files[0]);
}

function closeAdminModal() { modal.classList.remove('active'); }
function logout() { location.reload(); }
