import React from 'react'
import { ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCart } from '../contexts/CartContext'
import { useLanguage } from '../i18n'

export default function ProductCard({ product }) {
  const { addItem } = useCart(); const { language, t } = useLanguage(); const localized = product.translations?.[language] || product.translations?.de || product
  return <article className="product-card">
    <Link to={`/shop/${product.slug}`} className="product-card__image"><img src={product.image} alt={localized.name}/></Link>
    <div className="product-card__body">
      <div><p className="eyebrow">{localized.category} · {product.weight}</p><h3><Link to={`/shop/${product.slug}`}>{localized.name}</Link></h3></div>
      <div className="product-card__footer"><strong>{product.price.toFixed(2).replace('.', ',')} €</strong><button className="icon-button" onClick={() => addItem(product)} aria-label={`${localized.name} ${t('product.add').toLowerCase()}`}><ShoppingBag size={18}/></button></div>
    </div>
  </article>
}
