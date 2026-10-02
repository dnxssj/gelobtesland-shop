import React, { useState } from 'react'
import { ArrowLeft, Minus, Plus, ShoppingBag } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { demoProducts } from '../data/products'
import { useCart } from '../contexts/CartContext'
import { useLanguage } from '../i18n'

export default function Product() {
  const { slug } = useParams(); const product = demoProducts.find(p => p.slug === slug); const { addItem } = useCart(); const [qty, setQty] = useState(1); const { language, t } = useLanguage()
  if (!product) return <div className="screen-state"><h1>{t('product.notFound')}</h1><Link className="button button--dark" to="/shop">{t('home.shop')}</Link></div>
  const localized = product.translations?.[language] || product.translations?.de
  return <div className="page"><section className="product-detail section"><div className="product-detail__image"><img src={product.image} alt={localized.name}/></div><div className="product-detail__content"><Link className="back-link" to="/shop"><ArrowLeft size={16}/> {t('product.back')}</Link><p className="eyebrow">{localized.category} · {product.weight}</p><h1>{localized.name}</h1><p className="product-detail__price">{product.price.toFixed(2).replace('.', ',')} €</p><p className="lead">{localized.longDescription}</p><div className="quantity"><button onClick={() => setQty(Math.max(1, qty - 1))}><Minus size={16}/></button><span>{qty}</span><button onClick={() => setQty(qty + 1)}><Plus size={16}/></button></div><button className="button button--dark button--full" onClick={() => addItem(product, qty)}><ShoppingBag size={17}/> {t('product.add')}</button><div className="product-detail__notes"><span>{t('product.regional')}</span><span>{t('product.bottled')}</span><span>{t('product.shipping')}</span></div></div></section></div>
}
