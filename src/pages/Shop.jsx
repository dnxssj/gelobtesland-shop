import React, { useEffect, useState } from 'react'
import ProductCard from '../components/ProductCard'
import { getProducts } from '../lib/products'
import { useLanguage } from '../i18n'

export default function Shop() {
  const { t } = useLanguage()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function loadProducts() {
      try {
        setLoading(true)
        setError('')

        const data = await getProducts()

        if (active) {
          setProducts(data)
        }
      } catch (err) {
        console.error('Error loading products:', err)

        if (active) {
          setError(
            err?.message ||
            'Die Produkte konnten nicht geladen werden.'
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadProducts()

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="page">
      <section className="page-hero">
        <p className="eyebrow">{t('shop.eyebrow')}</p>
        <h1>{t('shop.title')}</h1>
        <p>{t('shop.text')}</p>
      </section>

      <section className="section">
        {loading && (
          <div className="screen-state">
            <p>Produkte werden geladen…</p>
          </div>
        )}

        {!loading && error && (
          <div className="screen-state">
            <h2>Produkte konnten nicht geladen werden</h2>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && products.length === 0 && (
          <div className="screen-state">
            <h2>Keine Produkte verfügbar</h2>
            <p>Aktuell sind keine Produkte im Shop verfügbar.</p>
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="product-grid">
            {products.map(product => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}