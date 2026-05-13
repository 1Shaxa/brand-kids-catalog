// Supabase Configuration
const SUPABASE_URL = 'https://yopdjvjaigregbfqxjke.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvcGRqdmphaWdyZWdiZnF4amtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjI1MTksImV4cCI6MjA5NDIzODUxOX0.pa1PoZYyvOPBc_1eTYbW6wodACrg-riRWtDSiEKuNe8';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let LANG = 'ru';
let currentMainCategory = 'all';
let currentSubCategory = 'all';
let searchQuery = '';

let PRODUCTS = [];
let CATEGORIES = [];
let SETTINGS = {
    title: { ru: "Стиль с первых шагов", uz: "Ilk qadamlardan uslub", en: "Style from first steps" },
    desc: { ru: "Коллекция одежды премиального качества для ваших детей", uz: "Farzandlaringiz uchun yuqori sifatli kiyimlar kolleksiyasi", en: "Premium quality collection" }
};

const T = {
    ru: { all: "Все", boys: "Мальчики", girls: "Девочки", baby: "Малыши", catalogTitle: "Каталог товаров", allSizes: "Bсе размеры", contactTg: "Уточнить в Telegram", availableSizes: "Доступные размеры:", sizeSuffix: "", footerContact: "Контакты", footerLinks: "Инструменты", footerTg: "Написать в Telegram", footerMap: "На карте" },
    uz: { all: "Barchasi", boys: "O'g'il bolalar", girls: "Qiz bolalar", baby: "Chaqaloqlar", catalogTitle: "Mahsulotlar katalogi", allSizes: "Barcha o'lchamlar", contactTg: "Telegram orqali so'rash", availableSizes: "Mavjud o'lchamlar:", sizeSuffix: " yosh", footerContact: "Kontaktlar", footerLinks: "Asboblar", footerTg: "Telegram orqali yozish", footerMap: "Xaritada" },
    en: { all: "All", boys: "Boys", girls: "Girls", baby: "Baby", catalogTitle: "Product Catalog", allSizes: "All sizes", contactTg: "Inquire via Telegram", availableSizes: "Available sizes:", sizeSuffix: "Y", footerContact: "Contacts", footerLinks: "Tools", footerTg: "Message on Telegram", footerMap: "On the map" }
};

const grid = document.getElementById('product-grid');
const modal = document.getElementById('modal-overlay');
const closeBtn = document.querySelector('.close-modal');

// --- Data Fetching ---
async function loadAppData() {
    try {
        // Load Settings
        const { data: settingsData } = await supabaseClient.from('settings').select('*').single();
        if (settingsData) SETTINGS = settingsData;

        // Load Categories
        const { data: catData } = await supabaseClient.from('categories').select('*');
        if (catData) CATEGORIES = catData;

        // Load Products
        const { data: prodData } = await supabaseClient.from('products').select('*').order('created_at', { ascending: false });
        if (prodData) PRODUCTS = prodData;

        setLanguage(LANG);
    } catch (error) {
        console.error("Error loading data:", error);
    }
}

function setLanguage(lang) {
    LANG = lang;
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.toggle('active', btn.innerText.toLowerCase() === lang));
    
    document.getElementById('nav-all').innerText = T[lang].all;
    document.getElementById('nav-boys').innerText = T[lang].boys;
    document.getElementById('nav-girls').innerText = T[lang].girls;
    document.getElementById('nav-baby').innerText = T[lang].baby;
    
    document.querySelector('.hero h1').innerText = SETTINGS.title[lang] || "";
    document.querySelector('.hero p').innerText = SETTINGS.desc[lang] || "";
    document.getElementById('catalog-title-text').innerText = T[lang].catalogTitle;
    document.querySelector('.tg-contact-btn span').innerText = T[lang].contactTg;
    document.getElementById('modal-sizes-label').innerText = T[lang].availableSizes;
    document.getElementById('footer-contact-title').innerText = T[lang].footerContact;
    document.getElementById('footer-links-title').innerText = T[lang].footerLinks;
    document.getElementById('footer-tg-text').innerText = T[lang].footerTg;
    document.getElementById('footer-map-text').innerText = T[lang].footerMap;

    renderSubNav();
    renderProducts();
}

function renderSubNav() {
    const subNav = document.getElementById('sub-nav');
    if (!subNav) return;
    let html = `<div class="cat-chip ${currentSubCategory === 'all' ? 'active' : ''}" onclick="filterSubCategory('all')">${T[LANG].all}</div>`;
    
    CATEGORIES.forEach(cat => {
        html += `<div class="cat-chip ${currentSubCategory === cat.id ? 'active' : ''}" onclick="filterSubCategory('${cat.id}')">${cat.name[LANG]}</div>`;
    });
    
    subNav.innerHTML = html;
}

function filterCategory(cat) {
    currentMainCategory = cat;
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    document.getElementById(`nav-${cat}`).classList.add('active');
    renderProducts();
}

function filterSubCategory(catId) {
    currentSubCategory = catId;
    renderSubNav();
    renderProducts();
}

function handleSearch(query) {
    searchQuery = query.toLowerCase().trim();
    renderProducts();
}

function renderProducts() {
    let filtered = PRODUCTS;
    
    if (currentMainCategory !== 'all') {
        filtered = filtered.filter(p => p.category === currentMainCategory);
    }
    
    if (currentSubCategory !== 'all') {
        filtered = filtered.filter(p => p.sub_category === currentSubCategory);
    }

    if (searchQuery) {
        filtered = filtered.filter(p => 
            p.name[LANG].toLowerCase().includes(searchQuery) || 
            (p.desc && p.desc[LANG].toLowerCase().includes(searchQuery))
        );
    }

    if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">Ничего не найдено</div>';
        return;
    }

    grid.innerHTML = filtered.map(product => `
        <div class="product-card" onclick="openProduct(${product.id})">
            <div class="product-image">
                <img src="${product.image}" alt="${product.name[LANG]}">
            </div>
            <div class="product-info">
                <h3>${product.name[LANG]}</h3>
                <p>${T[LANG][product.category]} | ${product.sub_category ? CATEGORIES.find(c=>c.id===product.sub_category)?.name[LANG] : ''}</p>
            </div>
        </div>
    `).join('');
}

function openProduct(id) {
    const product = PRODUCTS.find(p => p.id === id);
    if (!product) return;
    document.getElementById('modal-img').src = product.image;
    document.getElementById('modal-title').textContent = product.name[LANG];
    document.getElementById('modal-category').textContent = T[LANG][product.category];
    document.getElementById('modal-desc').textContent = product.desc ? product.desc[LANG] : '';
    document.getElementById('modal-sizes').innerHTML = (product.sizes || []).map(s => `<div class="size-chip">${s}${T[LANG].sizeSuffix}</div>`).join('');
    modal.classList.add('active');
}

closeBtn.onclick = () => modal.classList.remove('active');
window.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); }

// Initial Load
loadAppData();
