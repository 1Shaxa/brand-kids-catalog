const SUPABASE_URL = 'https://yopdjvjaigregbfqxjke.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvcGRqdmphaWdyZWdiZnF4amtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjI1MTksImV4cCI6MjA5NDIzODUxOX0.pa1PoZYyvOPBc_1eTYbW6wodACrg-riRWtDSiEKuNe8';

let supabaseClient;
try {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
} catch(e) {
    console.error("Supabase failed to load.");
}

const T = {
    ru: {
        all: "Все", boys: "Мальчики", girls: "Девочки", baby: "Малыши",
        catalogTitle: "Коллекция", catalogLabel: "Каталог",
        contactTg: "Уточнить наличие", availableSizes: "Размеры",
        sizeSuffix: "", heroTag: "Коллекция 2026",
        heroTitle: "Стиль для <em>маленьких</em> больших людей",
        heroDesc: "Откройте для себя премиальное качество и уникальный стиль для ваших детей.",
        heroCta: "Смотреть коллекцию",
        footerContact: "Контакты", footerLinks: "Локации",
        footerBrandDesc: "Премиальная одежда для ваших детей. Качество, стиль и комфорт в каждой детали.",
        emptyTitle: "Товары не найдены",
        emptyDesc: "Попробуйте изменить фильтры или поисковый запрос.",
        statsProducts: "товаров",
    },
    uz: {
        all: "Barchasi", boys: "O'g'il bolalar", girls: "Qiz bolalar", baby: "Chaqaloqlar",
        catalogTitle: "Kolleksiya", catalogLabel: "Katalog",
        contactTg: "Mavjudligini so'rash", availableSizes: "O'lchamlar",
        sizeSuffix: " yosh", heroTag: "2026 Kolleksiyasi",
        heroTitle: "<em>Kichkina</em> ulug' odamlar uchun uslub",
        heroDesc: "Farzandlaringiz uchun premium sifat va noyob uslubni kashf eting.",
        heroCta: "Kolleksiyani ko'rish",
        footerContact: "Kontaktlar", footerLinks: "Lokatsiyalar",
        footerBrandDesc: "Farzandlaringiz uchun premium kiyimlar. Har bir detaldagi sifat, uslub va qulaylik.",
        emptyTitle: "Mahsulotlar topilmadi",
        emptyDesc: "Filtrlarni yoki qidiruv so'rovini o'zgartiring.",
        statsProducts: "mahsulot",
    },
    en: {
        all: "All", boys: "Boys", girls: "Girls", baby: "Baby",
        catalogTitle: "Collection", catalogLabel: "Catalog",
        contactTg: "Inquire Availability", availableSizes: "Sizes",
        sizeSuffix: "Y", heroTag: "2026 Collection",
        heroTitle: "Style for <em>little</em> big people",
        heroDesc: "Discover premium quality and unique style for your children.",
        heroCta: "Shop Collection",
        footerContact: "Contacts", footerLinks: "Locations",
        footerBrandDesc: "Premium clothing for your children. Quality, style and comfort in every detail.",
        emptyTitle: "No products found",
        emptyDesc: "Try adjusting the filters or search query.",
        statsProducts: "products",
    }
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
    const [{ data: p }, { data: c }, { data: s }] = await Promise.all([
        supabaseClient.from('products').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('categories').select('*'),
        supabaseClient.from('settings').select('*').single()
    ]);

    PRODUCTS = p || [];
    CATEGORIES = c || [];
    SETTINGS = s || {};

    const statsRow = document.getElementById('hero-stats');
    if (statsRow && PRODUCTS.length > 0) {
        document.getElementById('stat-products').textContent = PRODUCTS.length + '+';
        statsRow.style.display = 'flex';
    }

    setLanguage(LANG);
}

function setLanguage(lang) {
    LANG = lang;
    localStorage.setItem('site_lang', lang);
    document.getElementById('current-lang-label').textContent = lang.toUpperCase();

    const heroTitleEl = document.getElementById('hero-title');
    if (SETTINGS.title?.[lang]) {
        heroTitleEl.textContent = SETTINGS.title[lang];
    } else {
        heroTitleEl.innerHTML = T[lang].heroTitle;
    }

    const el = (id) => document.getElementById(id);
    el('hero-desc').textContent = SETTINGS.desc?.[lang] || T[lang].heroDesc;
    el('hero-cta') && (el('hero-cta').childNodes[0].textContent = T[lang].heroCta + ' ');
    el('nav-all').textContent = T[lang].all;
    el('nav-boys').textContent = T[lang].boys;
    el('nav-girls').textContent = T[lang].girls;
    el('nav-baby').textContent = T[lang].baby;
    el('catalog-title-text').textContent = T[lang].catalogTitle;
    el('catalog-label-text') && (el('catalog-label-text').textContent = T[lang].catalogLabel);
    el('stat-products-label') && (el('stat-products-label').textContent = T[lang].statsProducts);
    el('footer-brand-desc') && (el('footer-brand-desc').textContent = T[lang].footerBrandDesc);
    el('footer-contact-title') && (el('footer-contact-title').textContent = T[lang].footerContact);
    el('footer-links-title') && (el('footer-links-title').textContent = T[lang].footerLinks);

    document.getElementById('lang-dropdown').classList.remove('active');
    renderSubNav();
    renderProducts();
}

function renderSubNav() {
    const subNav = document.getElementById('sub-nav');
    const makBtn = (label, val, isActive) =>
        `<button onclick="setSubCategory('${val}')" class="sub-nav-btn ${isActive ? 'active' : ''}">${label}</button>`;

    subNav.innerHTML = makBtn(T[LANG].all, 'all', currentSubCategory === 'all') +
        CATEGORIES.map(c => makBtn(c.name[LANG], c.id, currentSubCategory === c.id)).join('');
}

function setSubCategory(sub) {
    currentSubCategory = sub;
    renderSubNav();
    renderProducts();
}

function setMainCategory(cat) {
    currentMainCategory = cat;
    currentSubCategory = 'all';

    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    const navEl = document.getElementById('nav-' + cat);
    if (navEl) navEl.classList.add('active');

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

    if (currentMainCategory !== 'all') {
        filtered = filtered.filter(p => p.category === currentMainCategory);
    }
    if (currentSubCategory !== 'all') {
        filtered = filtered.filter(p => p.sub_category === currentSubCategory);
    }
    if (searchQuery) {
        filtered = filtered.filter(p => {
            const name = p.name?.[LANG] || '';
            return name.toLowerCase().includes(searchQuery);
        });
    }

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                <h3>${T[LANG].emptyTitle}</h3>
                <p>${T[LANG].emptyDesc}</p>
            </div>`;
        return;
    }

    grid.innerHTML = filtered.map(p => {
        const imgs = p.images?.length > 0 ? p.images : [p.image];
        const badgeClass = p.category === 'boys' ? 'badge-boys' : p.category === 'girls' ? 'badge-girls' : 'badge-baby';
        const badgeLabel = T[LANG][p.category] || '';
        const catName = CATEGORIES.find(c => c.id === p.sub_category)?.name?.[LANG] || '';

        return `
            <div class="product-card" onclick="openProduct(${p.id})">
                <div class="image-container">
                    <img src="${imgs[0]}" class="img-main" alt="${p.name?.[LANG] || ''}" loading="lazy">
                    <img src="${imgs[1] || imgs[0]}" class="img-hover" alt="" loading="lazy">
                    <span class="product-badge ${badgeClass}">${badgeLabel}</span>
                </div>
                <div class="product-info">
                    <h3>${p.name?.[LANG] || ''}</h3>
                    <p>${catName}</p>
                </div>
            </div>`;
    }).join('');
}

function openProduct(id) {
    const p = PRODUCTS.find(prod => prod.id === id);
    if (!p) return;

    const imgs = p.images?.length > 0 ? p.images : [p.image];
    const catName = CATEGORIES.find(c => c.id === p.sub_category)?.name?.[LANG] || '';

    document.getElementById('modal-img-container').innerHTML = `
        <img src="${imgs[0]}" id="modal-img-main" class="main-gallery-img" alt="${p.name?.[LANG] || ''}">
        <div class="gallery-thumbs">
            ${imgs.map((img, idx) => `
                <div class="thumb-item ${idx === 0 ? 'active' : ''}" onclick="switchGalleryImg('${img}', this)">
                    <img src="${img}" alt="" loading="lazy">
                </div>
            `).join('')}
        </div>`;

    document.getElementById('modal-cat-tag').textContent = catName;
    document.getElementById('modal-name').textContent = p.name?.[LANG] || '';
    document.getElementById('modal-desc').textContent = p.desc?.[LANG] || '';
    document.getElementById('sizes-label').textContent = T[LANG].availableSizes;

    document.getElementById('modal-sizes').innerHTML = (p.sizes || []).map(s =>
        `<div class="size-chip">${s}</div>`
    ).join('');

    document.querySelectorAll('.size-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            document.querySelectorAll('.size-chip').forEach(c => c.classList.remove('selected'));
            this.classList.add('selected');
        });
    });

    const sizesText = (p.sizes || []).join(', ');
    const imgUrl = imgs[0];
    const msg = `Assalomu alaykum! Meni quyidagi tovar qiziqtirmoqda:\n\n📦 ${p.name?.[LANG] || ''}\n📂 ${catName}\n📏 O'lchamlar: ${sizesText}\n\nBor-yo'qligini aytib bera olasizmi?\n\n________________\n🖼 Rasm: ${imgUrl}`;

    const tgBtn = document.getElementById('tg-btn');
    tgBtn.href = `https://t.me/k_halimov_a7o1?text=${encodeURIComponent(msg)}`;
    document.getElementById('tg-btn-text').textContent = T[LANG].contactTg;

    document.getElementById('modal-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function switchGalleryImg(src, thumb) {
    const mainImg = document.getElementById('modal-img-main');
    mainImg.style.opacity = '0';
    setTimeout(() => {
        mainImg.src = src;
        mainImg.style.opacity = '1';
    }, 150);

    document.querySelectorAll('.thumb-item').forEach(t => t.classList.remove('active'));
    thumb.classList.add('active');
}

function closeProduct() {
    document.getElementById('modal-overlay').classList.remove('active');
    document.body.style.overflow = '';
}

function toggleLangDropdown(e) {
    e.stopPropagation();
    document.getElementById('lang-dropdown').classList.toggle('active');
}

function selectLanguage(lang) { setLanguage(lang); }

// Sticky header shadow on scroll
window.addEventListener('scroll', () => {
    const header = document.getElementById('site-header');
    if (header) header.classList.toggle('scrolled', window.scrollY > 10);
});

// Close modal on overlay click, close lang dropdown on outside click
window.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeProduct();
    if (!e.target.closest('.lang-dropdown')) {
        document.getElementById('lang-dropdown')?.classList.remove('active');
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeProduct();
});

loadAppData();
