// Vercel Edge Middleware — защита admin панели
// Блокирует /admin.html если нет валидной сессии

export const config = {
    matcher: ['/admin.html']
}

export default function middleware(request) {
    const cookie = request.cookies.get('bk_admin_session')

    // Разрешаем если есть валидная сессионная кука
    if (cookie?.value === process.env.ADMIN_SESSION_TOKEN) {
        return // пропускаем
    }

    // Иначе — редирект на страницу входа
    const loginUrl = new URL('/admin-login.html', request.url)
    return Response.redirect(loginUrl, 302)
}
