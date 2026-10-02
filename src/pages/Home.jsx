import React from 'react'
import { ArrowRight, Leaf, MapPin, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { demoProducts } from '../data/products'
import { useLanguage } from '../i18n'

export default function Home() {
  const { t } = useLanguage(); const title = t('home.heroTitle').split('|')
  return <>
    <section className="hero"><div className="hero__image"/><div className="hero__overlay"/><div className="hero__brand" aria-hidden="true"><img src="/images/gelobtes-land-logo.svg" alt="" /></div><div className="hero__content"><p className="eyebrow eyebrow--light">{t('home.eyebrow')}</p><h1>{title.map((part, i) => <React.Fragment key={part}>{i > 0 && <br/>}<em className={i === 1 ? 'hero-title-emphasis' : ''}>{part}</em></React.Fragment>)}</h1><p>{t('home.heroText')}</p><Link className="button button--light" to="/shop">{t('home.discover')} <ArrowRight size={17}/></Link></div></section>
    <section className="intro section"><div className="section__narrow"><p className="eyebrow">{t('home.introEyebrow')}</p><h2>{t('home.introTitle')}</h2><p className="lead">{t('home.introText')}</p><Link className="text-link" to="/about">{t('home.more')} <ArrowRight size={16}/></Link></div></section>
    <section className="section section--muted"><div className="section__header"><div><p className="eyebrow">{t('home.productsEyebrow')}</p><h2>{t('home.productsTitle')}</h2></div><Link className="text-link" to="/shop">{t('home.allProducts')} <ArrowRight size={16}/></Link></div><div className="product-grid">{demoProducts.filter(p => p.featured).map(p => <ProductCard key={p.id} product={p}/>)}</div></section>
    <section className="landscape section"><div className="landscape__image"/><div className="landscape__content"><p className="eyebrow">{t('home.homeEyebrow')}</p><h2>{t('home.homeTitle')}</h2><p>{t('home.homeText')}</p><Link className="button button--dark" to="/beekeeping">{t('home.beekeeping')} <ArrowRight size={17}/></Link></div></section>
    <section className="values section"><div className="section__header section__header--center"><div><p className="eyebrow">{t('home.valuesEyebrow')}</p><h2>{t('home.valuesTitle')}</h2></div></div><div className="values__grid"><Value icon={MapPin} title={t('home.value1Title')} text={t('home.value1Text')}/><Value icon={Leaf} title={t('home.value2Title')} text={t('home.value2Text')}/><Value icon={ShieldCheck} title={t('home.value3Title')} text={t('home.value3Text')}/></div></section>
    <section className="cta section"><div><p className="eyebrow eyebrow--light">{t('home.ctaEyebrow')}</p><h2>{t('home.ctaTitle')}</h2><Link className="button button--light" to="/shop">{t('home.shop')} <ArrowRight size={17}/></Link></div></section>
  </>
}
function Value({ icon: Icon, title, text }) { return <div className="value"><div className="value__icon"><Icon size={21}/></div><h3>{title}</h3><p>{text}</p></div> }
