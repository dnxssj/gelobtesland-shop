import React from 'react'
import ProductCard from '../components/ProductCard'
import { demoProducts } from '../data/products'
import { useLanguage } from '../i18n'
export default function Shop() { const { t } = useLanguage(); return <div className="page"><section className="page-hero"><p className="eyebrow">{t('shop.eyebrow')}</p><h1>{t('shop.title')}</h1><p>{t('shop.text')}</p></section><section className="section"><div className="product-grid">{demoProducts.map(p => <ProductCard key={p.id} product={p}/>)}</div></section></div> }
