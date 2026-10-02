import React from 'react';
import { BarChart3, Box, FileText, LogOut, Package, Settings, Users } from 'lucide-react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function AdminLayout() {
  const { profile, signOut } = useAuth()
  const links = [
    ['/admin', 'Dashboard', BarChart3], ['/admin/orders', 'Bestellungen', Package], ['/admin/products', 'Produkte', Box], ['/admin/customers', 'Kunden', Users], ['/admin/content', 'Inhalte', FileText], ['/admin/settings', 'Einstellungen', Settings],
  ]
  return <div className="admin-shell">
    <aside className="admin-sidebar"><div className="admin-brand"><span>Gelobtes Land</span><small>Store Admin</small></div><nav>{links.map(([to, label, Icon]) => <NavLink key={to} end={to === '/admin'} to={to}><Icon size={17}/>{label}</NavLink>)}</nav><div className="admin-sidebar__bottom"><Link to="/">← Zum Shop</Link><button onClick={signOut}><LogOut size={17}/> Abmelden</button></div></aside>
    <div className="admin-main"><header className="admin-topbar"><span>Administration</span><span>{profile?.full_name || profile?.email} · {profile?.role}</span></header><div className="admin-content"><Outlet/></div></div>
  </div>
}

