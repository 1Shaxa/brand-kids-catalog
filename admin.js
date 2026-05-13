// Supabase Configuration
const SUPABASE_URL = 'https://yopdjvjaigregbfqxjke.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvcGRqdmphaWdyZWdiZnF4amtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjI1MTksImV4cCI6MjA5NDIzODUxOX0.pa1PoZYyvOPBc_1eTYbW6wodACrg-riRWtDSiEKuNe8';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_USER = "BrandKidsAdmin_2026";
const ADMIN_PASS = "BK_Secure_99!_Store";

let PRODUCTS = [];
let CATEGORIES = [];
let SETTINGS = {};
let adminSearchQuery = '';

async function initAdmin() {
    await loadData();
    renderInventory();
    renderCategories();
    loadSettings();
}

async function loadData() {
    const { data: p } = await supabaseClient.from('products').select('*').order('created_at', { ascending: false });
    const { data: c } = await supabaseClient.from('categories').select('*');
    const { data: s } = await supabaseClient.from('settings').select('*').single();
    PRODUCTS = p || [];
    CATEGORIES = c || [];
    SETTINGS = s || {};
}

function showTab(tab) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.getElementById(`tab-${tab.substring(0,3)}`).classList.add('active');
    
    document.getElementById('tab-inventory-content').style.display = tab === 'inventory' ? 'block' : 'none';
    document.getElementById('tab-categories-content').style.display = tab === 'categories' ? 'block' : 'none';
    document.getElementById('tab-settings-content').style.display = tab === 'settings' ? 'block' : 'none';
    
    if (tab === 'inventory') renderInventory();
    if (tab === 'categories') renderCategories();
}

function handleAdminSearch(val) {
    adminSearchQuery = val.toLowerCase();
    renderInventory();
}

function renderInventory() {
    const list = document.getElementById('inventory-list');
    let filtered = PRODUCTS;
    if (adminSearchQuery) {
        filtered = PRODUCTS.filter(p => p.name.ru.toLowerCase().includes(adminSearchQuery));
    }

    list.innerHTML = filtered.map(p => `
        <tr>
            <td><img src="${p.images?.[0] || p.image}" class="item-thumb"></td>
            <td><strong>${p.name.ru}</strong></td>
            <td>${p.category}</td>
            <td>${(p.sizes || []).join(', ')}</td>
            <td>
                <button onclick="editProduct(${p.id})" class="btn-link" style="color:blue; border:none; background:none; cursor:pointer;">Правка</button>
                <button onclick="deleteProduct(${p.id})" class="btn-link" style="color:red; border:none; background:none; margin-left:10px; cursor:pointer;">Удалить</button>
            </td>
        </tr>
    `).join('');
    
    // Update subcategory select in modal
    const subSelect = document.getElementById('prod-sub-category');
    subSelect.innerHTML = CATEGORIES.map(c => `<option value="${c.id}">${c.name.ru}</option>`).join('');
}

// ---- Modal Logic ----
function openAddModal() {
    document.getElementById('product-form').reset();
    document.getElementById('edit-id').value = "";
    document.getElementById('modal-type-title').innerText = "Новый товар";
    for(let i=1; i<=4; i++) document.getElementById(`preview-${i}`).innerHTML = '<span>+</span>';
    document.getElementById('product-modal').style.display = 'flex';
}

function editProduct(id) {
    const p = PRODUCTS.find(prod => prod.id === id);
    if (!p) return;
    document.getElementById('edit-id').value = p.id;
    document.getElementById('name-ru').value = p.name.ru;
    document.getElementById('name-uz').value = p.name.uz;
    document.getElementById('name-en').value = p.name.en;
    document.getElementById('prod-category').value = p.category;
    document.getElementById('prod-sub-category').value = p.sub_category || "";
    document.getElementById('prod-sizes').value = (p.sizes || []).join(', ');
    document.getElementById('desc-ru').value = p.desc ? p.desc.ru : "";

    const imgs = p.images || [p.image];
    for(let i=1; i<=4; i++) {
        const preview = document.getElementById(`preview-${i}`);
        if (imgs[i-1]) preview.innerHTML = `<img src="${imgs[i-1]}">`;
        else preview.innerHTML = '<span>+</span>';
    }
    document.getElementById('product-modal').style.display = 'flex';
}

function closeAdminModal() { document.getElementById('product-modal').style.display = 'none'; }

function previewMultiImg(event, index) {
    const reader = new FileReader();
    reader.onload = () => document.getElementById(`preview-${index}`).innerHTML = `<img src="${reader.result}">`;
    reader.readAsDataURL(event.target.files[0]);
}

async function uploadImage(file) {
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await supabaseClient.storage.from('product-images').upload(fileName, file);
    if (error) throw error;
    return supabaseClient.storage.from('product-images').getPublicUrl(fileName).data.publicUrl;
}

document.getElementById('product-form').onsubmit = async function(e) {
    e.preventDefault();
    const btn = document.getElementById('save-product-btn');
    btn.disabled = true;
    btn.innerText = "Сохранение...";
    try {
        const editId = document.getElementById('edit-id').value;
        let imageUrls = [];
        for(let i=1; i<=4; i++) {
            const input = document.getElementById(`img-${i}`);
            const preview = document.querySelector(`#preview-${i} img`);
            if (input.files[0]) imageUrls.push(await uploadImage(input.files[0]));
            else if (preview && preview.src.startsWith('http')) imageUrls.push(preview.src);
        }
        const data = {
            name: { ru: document.getElementById('name-ru').value, uz: document.getElementById('name-uz').value, en: document.getElementById('name-en').value },
            category: document.getElementById('prod-category').value,
            sub_category: document.getElementById('prod-sub-category').value,
            images: imageUrls,
            image: imageUrls[0],
            sizes: document.getElementById('prod-sizes').value.split(',').map(s => s.trim()),
            desc: { ru: document.getElementById('desc-ru').value, uz: "", en: "" }
        };
        if (editId) await supabaseClient.from('products').update(data).eq('id', editId);
        else await supabaseClient.from('products').insert([data]);
        await initAdmin();
        closeAdminModal();
    } catch(err) { alert(err.message); }
    finally { btn.disabled = false; btn.innerText = "Сохранить товар"; }
};

// ---- Auth & Logic ----
function checkLogin() {
    const user = document.getElementById('admin-user').value;
    const pass = document.getElementById('admin-pass').value;
    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        sessionStorage.setItem('admin_logged_in', 'true');
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'flex';
        initAdmin();
    } else {
        document.getElementById('login-error').innerText = "Ошибка входа";
    }
}

async function logout() { sessionStorage.removeItem('admin_logged_in'); location.reload(); }

function renderCategories() {
    const list = document.getElementById('category-list');
    list.innerHTML = CATEGORIES.map(c => `
        <div style="display:flex; justify-content:space-between; padding:15px; border-bottom:1px solid #eee;">
            <span>${c.name.ru}</span>
            <button onclick="deleteCategory('${c.id}')" style="color:red; border:none; background:none; cursor:pointer;">Удалить</button>
        </div>
    `).join('');
}

async function addCategory(e) {
    e.preventDefault();
    const name = { ru: document.getElementById('cat-name-ru').value, uz: document.getElementById('cat-name-uz').value, en: document.getElementById('cat-name-en').value };
    await supabaseClient.from('categories').insert([{ id: 'cat_'+Date.now(), name }]);
    await initAdmin();
    closeCategoryModal();
}

function openCategoryModal() { document.getElementById('category-modal').style.display = 'flex'; }
function closeCategoryModal() { document.getElementById('category-modal').style.display = 'none'; }

async function deleteCategory(id) {
    if (confirm("Удалить?")) {
        await supabaseClient.from('categories').delete().eq('id', id);
        await initAdmin();
    }
}

async function deleteProduct(id) {
    if (confirm("Удалить?")) {
        await supabaseClient.from('products').delete().eq('id', id);
        await initAdmin();
    }
}

function loadSettings() {
    if (!SETTINGS.title) return;
    document.getElementById('set-title-ru').value = SETTINGS.title.ru;
    document.getElementById('set-title-uz').value = SETTINGS.title.uz;
    document.getElementById('set-title-en').value = SETTINGS.title.en;
    document.getElementById('set-desc-ru').value = SETTINGS.desc.ru;
    document.getElementById('set-desc-uz').value = SETTINGS.desc.uz;
    document.getElementById('set-desc-en').value = SETTINGS.desc.en;
}

async function saveSettings() {
    const data = {
        title: { ru: document.getElementById('set-title-ru').value, uz: document.getElementById('set-title-uz').value, en: document.getElementById('set-title-en').value },
        desc: { ru: document.getElementById('set-desc-ru').value, uz: document.getElementById('set-desc-uz').value, en: document.getElementById('set-desc-en').value }
    };
    await supabaseClient.from('settings').update(data).eq('id', 1);
    alert("Настройки обновлены!");
    await initAdmin();
}

if (sessionStorage.getItem('admin_logged_in') === 'true') {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'flex';
    initAdmin();
}

// ---- Language Switcher Logic ----
function toggleAdminLang(e) {
    e.stopPropagation();
    document.getElementById('admin-lang-dropdown').classList.toggle('active');
}

function selectAdminLang(lang) {
    document.getElementById('admin-lang-label').innerText = lang.toUpperCase();
    document.getElementById('admin-lang-dropdown').classList.remove('active');
    // Here you can add logic to translate admin panel texts if needed
    // For now it just updates the label to match the site
}
