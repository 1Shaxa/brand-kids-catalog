// Vercel Edge Middleware — защита admin панели
// Блокирует /admin.html если нет валидной сессии

export const config = {
    matcher: ['/admin.html']
}

export default function middleware(request) {
    // Парсим cookie вручную (стандартный Web API, без Next.js)
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
        cookieHeader.split(';')
            .map(c => c.trim().split('='))
            .filter(([k]) => k)
            .map(([k, ...v]) => [k.trim(), v.join('=').trim()])
    );

    const session = cookies['bk_admin_session'];
    const validToken = process.env.ADMIN_SESSION_TOKEN;

    if (validToken && session === validToken) {
        return; // кука валидна — пропускаем
    }

    // Нет сессии — редирект на логин
    return Response.redirect(new URL('/admin-login.html', request.url), 302);
}
