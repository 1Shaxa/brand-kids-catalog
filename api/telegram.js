// Brand Kids — Telegram Webhook (Vercel Serverless)
// Telegram → POST /api/telegram → обработка → Supabase

const { createClient } = require('@supabase/supabase-js');

const BOT_TOKEN    = process.env.BOT_TOKEN;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const WH_SECRET    = process.env.WEBHOOK_SECRET; // защита от левых запросов

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Telegram API ──────────────────────────────────────────
async function tg(method, params = {}) {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
    });
    return res.json();
}

// ── Парсинг текста ────────────────────────────────────────
function parseText(text) {
    if (!text) return {
        name: { ru: 'Новый товар', uz: 'Yangi mahsulot', en: 'New Product' },
        sizes: [], category: 'boys',
        desc: { ru: '', uz: '', en: '' }
    };

    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const lower = text.toLowerCase();

    let category = 'boys';
    if (/девочк|girl|qiz/i.test(lower))              category = 'girls';
    else if (/малыш|baby|chaqaloq|infant/i.test(lower)) category = 'baby';
    else if (/мальчик|boy|o.gil/i.test(lower))          category = 'boys';

    let sizes = [];
    for (const line of lines) {
        const nums = line.match(/\b\d{1,3}\b/g);
        if (nums && nums.length >= 2) { sizes = nums; break; }
    }

    const nameRu = lines[0] || 'Новый товар';
    return {
        name: { ru: nameRu, uz: nameRu, en: nameRu },
        desc: { ru: text, uz: '', en: '' },
        sizes,
        category
    };
}

// ── Загрузка фото в Supabase ──────────────────────────────
async function uploadPhoto(fileId) {
    const info = await tg('getFile', { file_id: fileId });
    if (!info.ok) throw new Error('getFile failed');

    const filePath = info.result.file_path;
    const res = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`);
    const buffer = Buffer.from(await res.arrayBuffer());

    const ext = filePath.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
        .from('product-images')
        .upload(fileName, buffer, { contentType: 'image/jpeg', cacheControl: '3600' });

    if (error) throw error;
    return `${SUPABASE_URL}/storage/v1/object/public/product-images/${fileName}`;
}

// ── Обработка поста ───────────────────────────────────────
async function handlePost(post) {
    // Альбомы: берём только пост с caption (главный), остальные пропускаем
    if (post.media_group_id && !post.caption && !post.text) return;

    const text = post.caption || post.text || '';
    const parsed = parseText(text);

    let images = [];
    if (post.photo) {
        const largest = post.photo[post.photo.length - 1];
        const url = await uploadPhoto(largest.file_id);
        images = [url];
    }

    if (images.length === 0 && !text) return; // пустой пост — пропускаем

    const product = {
        name:         parsed.name,
        desc:         parsed.desc,
        category:     parsed.category,
        sub_category: null,
        sizes:        parsed.sizes,
        image:        images[0] || '',
        images
    };

    const { error } = await supabase.from('products').insert([product]);
    if (error) throw error;

    console.log(`✅ Товар: "${parsed.name.ru}" [${parsed.category}] ${parsed.sizes.join(',')}`);
}

// ── Vercel Handler ────────────────────────────────────────
module.exports = async (req, res) => {
    // GET запрос — просто пинг
    if (req.method === 'GET') {
        return res.status(200).json({ ok: true, status: 'Brand Kids Bot webhook active' });
    }

    if (req.method !== 'POST') {
        return res.status(405).end();
    }

    // Проверка секрета (если задан)
    if (WH_SECRET) {
        const incoming = req.headers['x-telegram-bot-api-secret-token'];
        if (incoming !== WH_SECRET) {
            return res.status(403).json({ error: 'Forbidden' });
        }
    }

    const update = req.body;

    if (update?.channel_post) {
        try {
            await handlePost(update.channel_post);
        } catch (e) {
            console.error('handlePost error:', e.message);
        }
    }

    res.status(200).json({ ok: true });
};
