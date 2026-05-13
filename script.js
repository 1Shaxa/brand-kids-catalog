// Supabase Configuration
const SUPABASE_URL = 'https://yopdjvjaigregbfqxjke.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvcGRqdmphaWdyZWdiZnF4amtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjI1MTksImV4cCI6MjA5NDIzODUxOX0.pa1PoZYyvOPBc_1eTYbW6wodACrg-riRWtDSiEKuNe8';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const T = {
    ru: { all: "Все", boys: "Мальчики", girls: "Девочки", baby: "Малыши", catalogTitle: "Коллекция", contactTg: "Уточнить наличие", availableSizes: "Размеры:", sizeSuffix: "", footerContact: "Контакты", footerLinks: "Инструменты", footerTg: "Написать в Telegram", footerMap: "Google Карты", footerYandex: "Яндекс Карты", footerBrandDesc: "Brand Kids — премиальная одежда для ваших детей. Качество, стиль и комфорт в каждой детали." },
    uz: { all: "Barchasi", boys: "O'g'il bolalar", girls: "Qiz bolalar", baby: "Chaqaloqlar", catalogTitle: "Kolleksiya", contactTg: "Mavjudligini so'rash", availableSizes: "O'lchamlar:", sizeSuffix: " yosh", footerContact: "Kontaktlar", footerLinks: "Asboblar", footerTg: "Telegram orqali yozish", footerMap: "Google Xaritalar", footerYandex: "Yandex Xaritalar", footerBrandDesc: "Brand Kids — farzandlaringiz uchun premium kiyimlar. Har bir detaldagi sifat, uslub va qulaylik." },
    en: { all: "All", boys: "Boys", girls: "Girls", baby: "Baby", catalogTitle: "Collection", contactTg: "Inquire Availability", availableSizes: "Sizes:", sizeSuffix: "Y", footerContact: "Contacts", footerLinks: "Tools", footerTg: "Message on Telegram", footerMap: "Google Maps", footerYandex: "Yandex Maps", footerBrandDesc: "Brand Kids — premium clothing for your children. Quality, style and comfort in every detail." }
};

let PRODUCTS = [];
let CATEGORIES = [];
let SETTINGS = {};
let LANG = 'ru';
let currentMainCategory = 'all';
let currentSubCategory = 'all';
let searchQuery = '';

async function loadAppData() {
    const { data: p } = await supabaseClient.from('products').select('*').order('created_at', { ascending: false });
    const { data: c } = await supabaseClient.from('categories').select('*');
    const { data: s } = await supabaseClient.from('settings').select('*').single();
    
    PRODUCTS = p || [];
    CATEGORIES = c || [];
    SETTINGS = s || {};
    
    renderSubNav();
    setLanguage(LANG);
}

function setMainCategory(cat) {
    currentMainCategory = cat;
    currentSubCategory = 'all';
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.toggle('active', a.id === `nav-${cat}`));
    renderSubNav();
    renderProducts();
}

function setSubCategory(sub) {
    currentSubCategory = sub;
    renderSubNav();
    renderProducts();
}

function renderSubNav() {
    const subNav = document.getElementById('sub-nav');
    const filteredCats = CATEGORIES;
    
    subNav.innerHTML = `<button onclick="setSubCategory('all')" class="sub-nav-btn ${currentSubCategory==='all'?'active':''}" style="border:none; background:none; font-size:12px; cursor:pointer; text-transform:uppercase; letter-spacing:1px; ${currentSubCategory==='all'?'font-weight:700; border-bottom:2px solid black;':'color:#999;'}">${T[LANG].all}</button>` + 
    filteredCats.map(c => `
        <button onclick="setSubCategory('${c.id}')" class="sub-nav-btn ${currentSubCategory===c.id?'active':''}" style="border:none; background:none; font-size:12px; cursor:pointer; text-transform:uppercase; letter-spacing:1px; ${currentSubCategory===c.id?'font-weight:700; border-bottom:2px solid black;':'color:#999;'}">
            ${c.name[LANG]}
        </button>
    `).join('');
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
        filtered = filtered.filter(p => p.name[LANG].toLowerCase().includes(searchQuery) || (p.desc && p.desc[LANG].toLowerCase().includes(searchQuery)));
    }

    grid.innerHTML = filtered.map(p => {
        const imgs = p.images && p.images.length > 0 ? p.images : [p.image];
        const hoverImg = imgs[1] || imgs[0];
        
        return `
            <div class="product-card" onclick="openProduct(${p.id})">
                <div class="image-container">
                    <img src="${imgs[0]}" class="img-main" loading="lazy">
                    <img src="${hoverImg}" class="img-hover" loading="lazy">
                </div>
                <div class="product-info">
                    <h3>${p.name[LANG]}</h3>
                    <p>${p.sub_category ? CATEGORIES.find(c=>c.id===p.sub_category)?.name[LANG] : ''}</p>
                </div>
            </div>
        `;
    }).join('');
}

// ---- Modal & Gallery ----
const modal = document.getElementById('modal-overlay');

function openProduct(id) {
    const p = PRODUCTS.find(prod => prod.id === id);
    if (!p) return;

    const imgs = p.images && p.images.length > 0 ? p.images : [p.image];
    document.getElementById('modal-img-container').innerHTML = `
        <img src="${imgs[0]}" id="modal-img-main" class="main-gallery-img">
        <div class="gallery-thumbs" style="margin-top:20px; display:flex; gap:10px;">
            ${imgs.map((img, idx) => `
                <div class="thumb-item ${idx===0?'active':''}" onclick="switchGalleryImg('${img}', this)" style="width:70px; height:90px; cursor:pointer; overflow:hidden; border:${idx===0?'2px solid black':'1px solid #eee'}">
                    <img src="${img}" style="width:100%; height:100%; object-fit:cover;">
                </div>
            `).join('')}
        </div>
    `;

    document.getElementById('modal-name').innerText = p.name[LANG];
    document.getElementById('modal-desc').innerText = p.desc ? p.desc[LANG] : "";
    document.getElementById('modal-sizes').innerHTML = (p.sizes || []).map(s => `
        <div style="padding:10px 20px; border:1px solid #eee; font-size:12px; font-weight:600;">${s}${T[LANG].sizeSuffix}</div>
    `).join('');

    const tgBtn = document.querySelector('.tg-contact-btn');
    const msg = `Здравствуйте! Меня интересует товар: ${p.name[LANG]} (ID: ${p.id})`;
    tgBtn.href = `https://t.me/Brand_kids?text=${encodeURIComponent(msg)}`;

    modal.classList.add('active');
}

function switchGalleryImg(src, thumb) {
    document.getElementById('modal-img-main').src = src;
    document.querySelectorAll('.thumb-item').forEach(t => t.style.border = '1px solid #eee');
    thumb.style.border = '2px solid black';
}

function closeProduct() {
    modal.classList.remove('active');
}

// ---- Language & UI ----
function toggleLangDropdown(e) {
    e.stopPropagation();
    document.getElementById('lang-dropdown').classList.toggle('active');
}

function selectLanguage(lang) {
    LANG = lang;
    document.getElementById('current-lang-label').innerText = lang.toUpperCase();
    setLanguage(lang);
    document.getElementById('lang-dropdown').classList.remove('active');
}

function setLanguage(lang) {
    document.getElementById('hero-title').innerText = SETTINGS.title ? SETTINGS.title[lang] : "Brand Kids";
    document.getElementById('hero-desc').innerText = SETTINGS.desc ? SETTINGS.desc[lang] : "";
    
    document.getElementById('nav-all').innerText = T[lang].all;
    document.getElementById('nav-boys').innerText = T[lang].boys;
    document.getElementById('nav-girls').innerText = T[lang].girls;
    document.getElementById('nav-baby').innerText = T[lang].baby;
    
    document.getElementById('catalog-title-text').innerText = T[lang].catalogTitle;
    document.getElementById('footer-brand-desc').innerText = T[lang].footerBrandDesc;
    
    renderSubNav();
    renderProducts();
}

window.onclick = (e) => {
    if (e.target === modal) closeProduct();
    document.getElementById('lang-dropdown').classList.remove('active');
};

loadAppData();
