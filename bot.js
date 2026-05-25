// Brand Kids — Telegram Channel Bot
// Читает посты из канала → создаёт карточки товаров в Supabase
//
// Запуск: node bot.js
// Зависимости: npm install

const { createClient } = require('@supabase/supabase-js');

const BOT_TOKEN  = process.env.BOT_TOKEN  || '8849663520:AAFdrSdmsvMmzl-zoJuIf80nCJLBkOSuRTU';
const SUPABASE_URL = 'https://yopdjvjaigregbfqxjke.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvcGRqdmphaWdyZWdiZnF4amtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjI1MTksImV4cCI6MjA5NDIzODUxOX0.pa1PoZYyvOPBc_1eTYbW6wodACrg-riRWtDSiEKuNe8';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Буфер для альбомов (несколько фото в одном посте)
const mediaGroups = {};

// ── Telegram API ──────────────────────────────────────────
async function tg(method, params = {}) {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
    });
    return res.json();
}

// ── Парсинг текста поста ──────────────────────────────────
function parseText(text) {
    if (!text) return { name: { ru: 'Новый товар', uz: 'Yangi mahsulot', en: 'New Product' }, sizes: [], category: 'boys', desc: { ru: '', uz: '', en: '' } };

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const lower = text.toLowerCase();

    // Определяем категорию по ключевым словам
    let category = 'boys'; // по умолчанию
    if (/девочк|girl|qiz|female/i.test(lower))         category = 'girls';
    else if (/малыш|baby|chaqaloq|infant|новорожд/i.test(lower)) category = 'baby';
    else if (/мальчик|boy|o[`']gil|male/i.test(lower))  category = 'boys';

    // Ищем размеры — строка с несколькими числами
    let sizes = [];
    for (const line of lines) {
        const nums = line.match(/\b\d{1,3}\b/g);
        if (nums && nums.length >= 2) {
            sizes = nums;
            break;
        }
    }

    // Имя = первая строка текста
    const nameRu = lines[0] || 'Новый товар';

    return {
        name: { ru: nameRu, uz: nameRu, en: nameRu },
        desc: { ru: text, uz: '', en: '' },
        sizes,
        category
    };
}

// ── Загрузка фото в Supabase Storage ─────────────────────
async function uploadPhoto(fileId) {
    const info = await tg('getFile', { file_id: fileId });
    if (!info.ok) throw new Error('getFile failed: ' + JSON.stringify(info));

    const filePath = info.result.file_path;
    const tgUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

    const res = await fetch(tgUrl);
    const buffer = Buffer.from(await res.arrayBuffer());

    const ext = filePath.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
        .from('product-images')
        .upload(fileName, buffer, { contentType: 'image/jpeg', cacheControl: '3600' });

    if (error) throw error;

    return `${SUPABASE_URL}/storage/v1/object/public/product-images/${fileName}`;
}

// ── Создание карточки товара ──────────────────────────────
async function createProduct(mainPost, extraImageUrls = []) {
    const text = mainPost.caption || mainPost.text || '';
    const parsed = parseText(text);

    let images = [...extraImageUrls];

    // Загружаем главное фото
    if (mainPost.photo) {
        const largest = mainPost.photo[mainPost.photo.length - 1];
        try {
            const url = await uploadPhoto(largest.file_id);
            images = [url, ...images]; // главное фото — первым
        } catch (e) {
            console.error('❌ Ошибка загрузки главного фото:', e.message);
        }
    }

    const product = {
        name:         parsed.name,
        desc:         parsed.desc,
        category:     parsed.category,
        sub_category: null,
        sizes:        parsed.sizes,
        image:        images[0] || '',
        images:       images
    };

    const { error } = await supabase.from('products').insert([product]);
    if (error) throw error;

    console.log(`✅ Товар создан: "${parsed.name.ru}" | ${parsed.category} | размеры: [${parsed.sizes.join(', ')}] | фото: ${images.length}`);
}

// ── Обработка поста ───────────────────────────────────────
async function handlePost(post) {
    // Альбом (несколько фото в одном посте)
    if (post.media_group_id) {
        const gid = post.media_group_id;

        if (!mediaGroups[gid]) {
            mediaGroups[gid] = { posts: [], timer: null };
        }

        mediaGroups[gid].posts.push(post);

        // Ждём 2 секунды — вдруг ещё фото придут
        clearTimeout(mediaGroups[gid].timer);
        mediaGroups[gid].timer = setTimeout(async () => {
            const group = mediaGroups[gid];
            delete mediaGroups[gid];

            // Главный пост — тот у кого есть caption, или первый
            const mainPost = group.posts.find(p => p.caption) || group.posts[0];
            const restPosts = group.posts.filter(p => p !== mainPost);

            // Загружаем дополнительные фото
            const extraUrls = [];
            for (const p of restPosts) {
                if (p.photo) {
                    try {
                        const largest = p.photo[p.photo.length - 1];
                        extraUrls.push(await uploadPhoto(largest.file_id));
                    } catch (e) {
                        console.error('❌ Доп. фото:', e.message);
                    }
                }
            }

            try {
                await createProduct(mainPost, extraUrls);
            } catch (e) {
                console.error('❌ Ошибка создания товара:', e.message);
            }
        }, 2000);

        return;
    }

    // Одиночный пост с фото или текстом
    if (post.photo || post.text) {
        try {
            await createProduct(post);
        } catch (e) {
            console.error('❌ Ошибка:', e.message);
        }
    }
}

// ── Long Polling ──────────────────────────────────────────
async function startPolling() {
    let offset = 0;
    console.log('🤖 Brand Kids Bot запущен');
    console.log('📡 Жду постов в канале...\n');

    while (true) {
        try {
            const res = await tg('getUpdates', {
                offset,
                timeout: 30,
                allowed_updates: ['channel_post']
            });

            if (res.ok && res.result.length > 0) {
                for (const update of res.result) {
                    offset = update.update_id + 1;
                    if (update.channel_post) {
                        console.log('📩 Новый пост в канале');
                        await handlePost(update.channel_post);
                    }
                }
            }
        } catch (e) {
            console.error('Polling error:', e.message);
            await new Promise(r => setTimeout(r, 3000));
        }
    }
}

startPolling();
