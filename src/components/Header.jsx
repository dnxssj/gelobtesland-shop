import React, { useState } from 'react'
import { Menu, ShoppingBag, X } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import LanguageButtons from './LanguageButtons'
import { useCart } from '../contexts/CartContext'
import { useLanguage } from '../i18n'

export default function Header() {
  const [open, setOpen] = useState(false)
  const { count } = useCart()
  const { t } = useLanguage()
  const links = [['/shop', t('nav.shop')], ['/beekeeping', t('nav.beekeeping')], ['/about', t('nav.about')], ['/contact', t('nav.contact')]]
  return <>
    <header className="site-header">
      <nav className="desktop-nav">{links.map(([to, label]) => <NavLink key={to} to={to}>{label}</NavLink>)}</nav>
      <div className="header-actions"><LanguageButtons/><Link className="cart-button" to="/cart" aria-label={t('nav.cartAria', { count })}><ShoppingBag size={19}/>{count > 0 && <span>{count}</span>}</Link><button className="mobile-menu-button" onClick={() => setOpen(true)} aria-label={t('nav.openMenu')}><Menu size={22}/></button></div>
    </header>
    {open && <div className="mobile-menu">
      <div className="mobile-menu__top"><button onClick={() => setOpen(false)} aria-label={t('nav.closeMenu')}><X/></button></div>
      <LanguageButtons/><nav>{links.map(([to, label]) => <Link key={to} to={to} onClick={() => setOpen(false)}>{label}</Link>)}</nav>
      <Link className="button button--dark" to="/cart" onClick={() => setOpen(false)}>{t('nav.cart')} · {count}</Link>
    </div>}
  </>
}
