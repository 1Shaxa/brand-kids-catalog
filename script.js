// Brand Kids - Extreme Stability 1000%
const SUPABASE_URL = 'https://yopdjvjaigregbfqxjke.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvcGRqdmphaWdyZWdiZnF4amtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjI1MTksImV4cCI6MjA5NDIzODUxOX0.pa1PoZYyvOPBc_1eTYbW6wodACrg-riRWtDSiEKuNe8';

let supabaseClient;
try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch(e) {
    console.error("Supabase failed to load. Check your connection.");
}

const T = {
    ru: { all: "Все", boys: "Мальчики", girls: "Девочки", baby: "Малыши", catalogTitle: "Коллекция", contactTg: "Уточнить наличие", availableSizes: "Размеры:", sizeSuffix: "", footerContact: "Контакты", footerLinks: "Инструменты", footerTg: "Написать в Telegram", footerMap: "Google Карты", footerYandex: "Яндекс Карты", footerBrandDesc: "Brand Kids — премиальная одежда для ваших детей. Качество, стиль и комфорт в каждой детали." },
    uz: { all: "Barchasi", boys: "O'g'il bolalar", girls: "Qiz bolalar", baby: "Chaqaloqlar", catalogTitle: "Kolleksiya", contactTg: "Mavjudligini so'rash", availableSizes: "O'lchamlar:", sizeSuffix: " yosh", footerContact: "Kontaktlar", footerLinks: "Asboblar", footerTg: "Telegram orqali yozish", footerMap: "Google Xaritalar", footerYandex: "Yandex Xaritalar", footerBrandDesc: "Brand Kids — farzandlaringiz uchun premium kiyimlar. Har bir detaldagi sifat, uslub va qulaylik." },
    en: { all: "All", boys: "Boys", girls: "Girls", baby: "Baby", catalogTitle: "Collection", contactTg: "Inquire Availability", availableSizes: "Sizes:", sizeSuffix: "Y", footerContact: "Contacts", footerLinks: "Tools", footerTg: "Message on Telegram", footerMap: "Google Maps", footerYandex: "Yandex Maps", footerBrandDesc: "Brand Kids — premium clothing for your children. Quality, style and comfort in every detail." }
};

let PRODUCTS = [];
let CATEGORIES = [];
let SETTINGS = {};
let LANG = localStorage.getItem('site_lang') || 'ru';
let currentMainCategory = 'all';
let currentSubCategory = 'all';
let searchQuery = '';

async function loadAppData() {
    if (!supabaseClient) return;
    const { data: p } = await supabaseClient.from('products').select('*').order('created_at', { ascending: false });
    const { data: c } = await supabaseClient.from('categories').select('*');
    const { data: s } = await supabaseClient.from('settings').select('*').single();
    
    PRODUCTS = p || [];
    CATEGORIES = c || [];
    SETTINGS = s || {};
    
    setLanguage(LANG);
}

function setLanguage(lang) {
    LANG = lang;
    localStorage.setItem('site_lang', lang);
    document.getElementById('current-lang-label').innerText = lang.toUpperCase();
    
    // Update texts
    document.getElementById('hero-title').innerText = SETTINGS.title ? SETTINGS.title[lang] : "Brand Kids";
    document.getElementById('hero-desc').innerText = SETTINGS.desc ? SETTINGS.desc[lang] : "";
    document.getElementById('nav-all').innerText = T[lang].all;
    document.getElementById('nav-boys').innerText = T[lang].boys;
    document.getElementById('nav-girls').innerText = T[lang].girls;
    document.getElementById('nav-baby').innerText = T[lang].baby;
    document.getElementById('catalog-title-text').innerText = T[lang].catalogTitle;
    
    renderSubNav();
    renderProducts();
    document.getElementById('lang-dropdown').classList.remove('active');
}

function renderSubNav() {
    const subNav = document.getElementById('sub-nav');
    subNav.innerHTML = `<button onclick="setSubCategory('all')" class="${currentSubCategory==='all'?'active':''}" style="border:none; background:none; font-size:12px; cursor:pointer; text-transform:uppercase; letter-spacing:1px; ${currentSubCategory==='all'?'font-weight:700; border-bottom:2px solid black;':'color:#999;'}">${T[LANG].all}</button>` + 
    CATEGORIES.map(c => `
        <button onclick="setSubCategory('${c.id}')" style="border:none; background:none; font-size:12px; cursor:pointer; text-transform:uppercase; letter-spacing:1px; ${currentSubCategory===c.id?'font-weight:700; border-bottom:2px solid black;':'color:#999;'}">
            ${c.name[LANG]}
        </button>
    `).join('');
}

function setSubCategory(sub) {
    currentSubCategory = sub;
    renderSubNav();
    renderProducts();
}

function setMainCategory(cat) {
    currentMainCategory = cat;
    currentSubCategory = 'all';
    renderSubNav();
    renderProducts();
}

function handleSearch(query) {
    searchQuery = query.toLowerCase().trim();
    renderProducts();
}

function renderProducts() {
    const grid = document.getElementById('product-grid');
    let filtered = PRODUCTS;
    if (currentMainCategory !== 'all') filtered = filtered.filter(p => p.category === currentMainCategory);
    if (currentSubCategory !== 'all') filtered = filtered.filter(p => p.sub_category === currentSubCategory);
    if (searchQuery) {
        filtered = filtered.filter(p => p.name[LANG].toLowerCase().includes(searchQuery));
    }

    grid.innerHTML = filtered.map(p => {
        const imgs = p.images && p.images.length > 0 ? p.images : [p.image];
        return `
            <div class="product-card" onclick="openProduct(${p.id})">
                <div class="image-container">
                    <img src="${imgs[0]}" class="img-main">
                    <img src="${imgs[1] || imgs[0]}" class="img-hover">
                </div>
                <div class="product-info">
                    <h3>${p.name[LANG]}</h3>
                    <p>${CATEGORIES.find(c=>c.id===p.sub_category)?.name[LANG] || ''}</p>
                </div>
            </div>
        `;
    }).join('');
}

function openProduct(id) {
    const p = PRODUCTS.find(prod => prod.id === id);
    if (!p) return;
    const imgs = p.images && p.images.length > 0 ? p.images : [p.image];
    document.getElementById('modal-img-container').innerHTML = `
        <img src="${imgs[0]}" id="modal-img-main" class="main-gallery-img">
        <div class="gallery-thumbs" style="display:flex; gap:10px; margin-top:15px;">
            ${imgs.map((img, idx) => `
                <div class="thumb-item ${idx===0?'active':''}" onclick="switchGalleryImg('${img}', this)" style="width:60px; height:80px; border:1px solid #eee; cursor:pointer;">
                    <img src="${img}" style="width:100%; height:100%; object-fit:cover;">
                </div>
            `).join('')}
        </div>
    `;
    document.getElementById('modal-name').innerText = p.name[LANG];
    document.getElementById('modal-desc').innerText = p.desc ? p.desc[LANG] : "";
    document.getElementById('modal-sizes').innerHTML = (p.sizes || []).map(s => `<div style="padding:10px; border:1px solid #eee; font-size:12px;">${s}</div>`).join('');
    
    const tgBtn = document.querySelector('.tg-contact-btn');
    const catName = CATEGORIES.find(c => c.id === p.sub_category)?.name[LANG] || '';
    const sizesText = (p.sizes || []).join(', ');
    const imgUrl = (p.images && p.images.length > 0) ? p.images[0] : p.image;
    const msg = `Assalomu alaykum! Meni quyidagi tovar qiziqtirmoqda:\n\n📦 ${p.name[LANG]}\n📂 ${catName}\n📏 O'lchamlar: ${sizesText}\n\nBor-yo'qligini aytib bera olasizmi?\n\n🖼 Rasm: ${imgUrl}`;
    tgBtn.href = `https://t.me/k_halimov_a7o1?text=${encodeURIComponent(msg)}`;
    document.getElementById('modal-overlay').classList.add('active');
}

function switchGalleryImg(src, thumb) {
    document.getElementById('modal-img-main').src = src;
    document.querySelectorAll('.thumb-item').forEach(t => t.style.border = '1px solid #eee');
    thumb.style.border = '2px solid black';
}

function closeProduct() {
    document.getElementById('modal-overlay').classList.remove('active');
}

function toggleLangDropdown(e) {
    e.stopPropagation();
    document.getElementById('lang-dropdown').classList.toggle('active');
}

window.onclick = (e) => {
    if (e.target.id === 'modal-overlay') closeProduct();
    document.getElementById('lang-dropdown').classList.remove('active');
};

function selectLanguage(lang) { setLanguage(lang); }

loadAppData();
