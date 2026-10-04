import React, { useEffect, useState } from 'react'
import { ArrowLeft, Minus, Plus, ShoppingBag } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { getProductBySlug } from '../lib/products'
import { useCart } from '../contexts/CartContext'
import { useLanguage } from '../i18n'

export default function Product() {
  const { slug } = useParams()
  const { addItem } = useCart()
  const { language, t } = useLanguage()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [qty, setQty] = useState(1)

  useEffect(() => {
    let active = true

    async function loadProduct() {
      try {
        setLoading(true)
        setError('')

        const data = await getProductBySlug(slug)

        if (active) {
          setProduct(data)
        }
      } catch (err) {
        console.error('Error loading product:', err)

        if (active) {
          setError(
            err?.message ||
            'Das Produkt konnte nicht geladen werden.'
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadProduct()

    return () => {
      active = false
    }
  }, [slug])

  if (loading) {
    return (
      <div className="screen-state">
        <p>Produkt wird geladen…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="screen-state">
        <h1>Produkt konnte nicht geladen werden</h1>
        <p>{error}</p>
        <Link className="button button--dark" to="/shop">
          {t('home.shop')}
        </Link>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="screen-state">
        <h1>{t('product.notFound')}</h1>
        <Link className="button button--dark" to="/shop">
          {t('home.shop')}
        </Link>
      </div>
    )
  }

  const localized =
    product.translations?.[language] ||
    product.translations?.de ||
    product

  const outOfStock = product.stock <= 0
  const maxQuantity = Math.max(1, product.stock)

  const decreaseQuantity = () => {
    setQty(current => Math.max(1, current - 1))
  }

  const increaseQuantity = () => {
    setQty(current => Math.min(maxQuantity, current + 1))
  }

  const handleAddToCart = () => {
    if (outOfStock) return

    addItem(product, qty)
  }

  return (
    <div className="page">
      <section className="product-detail section">
        <div className="product-detail__image">
          <img
            src={product.image}
            alt={localized.name}
          />
        </div>

        <div className="product-detail__content">
          <Link className="back-link" to="/shop">
            <ArrowLeft size={16} />
            {t('product.back')}
          </Link>

          <p className="eyebrow">
            {localized.category} · {product.weight}
          </p>

          <h1>{localized.name}</h1>

          <p className="product-detail__price">
            {product.price.toFixed(2).replace('.', ',')} €
          </p>

          <p className="lead">
            {localized.longDescription}
          </p>

          {outOfStock ? (
            <div className="product-stock product-stock--empty">
              Ausverkauft
            </div>
          ) : (
            <>
              <div className="quantity">
                <button
                  type="button"
                  onClick={decreaseQuantity}
                  disabled={qty <= 1}
                  aria-label="Menge verringern"
                >
                  <Minus size={16} />
                </button>

                <span>{qty}</span>

                <button
                  type="button"
                  onClick={increaseQuantity}
                  disabled={qty >= maxQuantity}
                  aria-label="Menge erhöhen"
                >
                  <Plus size={16} />
                </button>
              </div>

              <button
                type="button"
                className="button button--dark button--full"
                onClick={handleAddToCart}
              >
                <ShoppingBag size={17} />
                {t('product.add')}
              </button>
            </>
          )}

          <div className="product-detail__notes">
            <span>{t('product.regional')}</span>
            <span>{t('product.bottled')}</span>
            <span>{t('product.shipping')}</span>
          </div>
        </div>
      </section>
    </div>
  )
}