module.exports = (req, res) => {
    res.setHeader('Set-Cookie',
        'bk_admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'
    );
    res.redirect(302, '/admin-login.html');
};
