// Server-side admin login — credentials never leave the server
module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).end();

    const { user, pass } = req.body || {};

    const ADMIN_USER = process.env.ADMIN_USER;
    const ADMIN_PASS = process.env.ADMIN_PASS;
    const SESSION_TOKEN = process.env.ADMIN_SESSION_TOKEN;

    if (!ADMIN_USER || !ADMIN_PASS || !SESSION_TOKEN) {
        return res.status(500).json({ error: 'Server misconfigured' });
    }

    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        // Ставим httpOnly куку — JS на клиенте её не видит
        res.setHeader('Set-Cookie',
            `bk_admin_session=${SESSION_TOKEN}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
        );
        return res.status(200).json({ ok: true });
    }

    // Задержка 1с против брутфорса
    await new Promise(r => setTimeout(r, 1000));
    return res.status(401).json({ error: 'Неверный логин или пароль' });
};
