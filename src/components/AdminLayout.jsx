import React from 'react'
import { BarChart3, Box, FileText, Globe2, LogOut, Package, Settings, Users as UsersIcon, UserCog } from 'lucide-react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../i18n'

export default function AdminLayout() {
  const { language, setLanguage, t } = useLanguage()
  const { profile, signOut } = useAuth()
  const role = profile?.role
  const links = [
    ['/admin', t('admin.dashboard'), BarChart3, true],
    ['/admin/orders', t('admin.orders'), Package, true],
    ['/admin/products', t('admin.productsTitle'), Box, true],
    ['/admin/customers', t('admin.customers'), UsersIcon, true],
    ['/admin/content', t('admin.content'), FileText, ['admin', 'manager'].includes(role)],
    ['/admin/users', t('admin.usersRoles'), UserCog, role === 'admin'],
    ['/admin/settings', t('admin.settings'), Settings, role === 'admin'],
  ]
  return <div className="admin-shell"><aside className="admin-sidebar"><div className="admin-brand"><span>Gelobtes Land</span><small>Store Admin</small></div><nav>{links.filter(x => x[3]).map(([to, label, Icon]) => <NavLink key={to} end={to === '/admin'} to={to}><Icon size={17} />{label}</NavLink>)}</nav><div className="admin-sidebar__bottom"><div className="admin-sidebar__bottom">
    <span className="admin-user">
      <strong>{profile?.full_name || profile?.email}</strong>
      <small>{profile?.role}</small>
    </span>

    <Link to="/">← {t('admin.backToShop')}</Link>

    <button onClick={signOut}>
      <LogOut size={17} /> {t('admin.logout')}
    </button>
  </div></div></aside><div className="admin-main"><header className="admin-topbar">
    <span>Administration</span>

    <div className="admin-topbar__right">
      <div className="admin-language-switcher" aria-label="Language">
        <Globe2 size={16} />

        {['de', 'en', 'es'].map((lang) => (
          <button
            key={lang}
            type="button"
            className={language === lang ? 'is-active' : ''}
            onClick={() => setLanguage(lang)}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>

      <span>
        {profile?.full_name || profile?.email} · {profile?.role}
      </span>
    </div>
  </header><main className="admin-content"><Outlet /></main></div></div>
}
