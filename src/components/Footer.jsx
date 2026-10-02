import React from 'react'
import { Link } from 'react-router-dom'
import Brand from './Brand'
import LanguageButtons from './LanguageButtons'
import { useLanguage } from '../i18n'

export default function Footer() {
  const { t } = useLanguage()
  return <footer className="footer">
    <div className="footer__grid">
      <div><Brand dark/><p className="footer__copy">{t('footer.copy')}</p></div>
      <div><h3>{t('footer.shop')}</h3><Link to="/shop">{t('footer.honey')}</Link><Link to="/about">{t('footer.about')}</Link><Link to="/beekeeping">{t('footer.beekeeping')}</Link><Link to="/contact">{t('footer.contact')}</Link></div>
      <div><h3>{t('footer.info')}</h3><Link to="/shipping">{t('footer.shipping')}</Link><Link to="/impressum">{t('footer.imprint')}</Link><Link to="/datenschutz">{t('footer.privacy')}</Link><Link to="/widerruf">{t('footer.withdrawal')}</Link></div>
    </div>
    <div className="footer__bottom"><span>© {new Date().getFullYear()} Gelobtes Land</span><LanguageButtons/></div>
  </footer>
}
