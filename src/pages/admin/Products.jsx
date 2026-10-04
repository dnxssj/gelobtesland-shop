import React, { useEffect, useMemo, useState } from 'react'
import { Edit3, PackagePlus, Plus, Search, Trash2, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { formatDate, formatMoney } from '../../lib/admin'
import { useLanguage } from '../../i18n'

const EMPTY = {
  slug: '',
  name: '',
  description: '',
  long_description: '',
  category: 'Honig',
  weight: '',
  price: '',
  image_url: '',
  stock: 0,
  featured: false,
  published: false,
}

export default function Products() {
  const { profile } = useAuth()
  const { t } = useLanguage()

  const canEdit = ['admin', 'manager'].includes(profile?.role)

  const [products, setProducts] = useState([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editor, setEditor] = useState(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    if (!supabase) {
      setError(t('admin.notConfigured'))
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    const { data, error: dbError } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (dbError) {
      setError(dbError.message)
    } else {
      setProducts(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [t])

  const filtered = useMemo(
    () =>
      products.filter((p) =>
        `${p.name} ${p.slug} ${p.category}`
          .toLowerCase()
          .includes(query.toLowerCase())
      ),
    [products, query]
  )

  async function saveProduct(event) {
    event.preventDefault()

    if (!canEdit) return

    setSaving(true)
    setError('')
    setNotice('')

    const data = {
      ...editor,
      price: Number(editor.price),
      stock: Math.max(0, Math.floor(Number(editor.stock) || 0)),
    }

    if (
      !data.slug ||
      !data.name ||
      !Number.isFinite(data.price) ||
      data.price < 0
    ) {
      setError(t('admin.invalidProduct'))
      setSaving(false)
      return
    }

    const { error: dbError } = editor.id
      ? await supabase.from('products').update(data).eq('id', editor.id)
      : await supabase.from('products').insert(data)

    if (dbError) {
      setError(
        dbError.code === '23505'
          ? t('admin.duplicateSlug')
          : dbError.message
      )
    } else {
      setEditor(null)

      setNotice(
        editor.id
          ? t('admin.productSaved')
          : t('admin.productCreated')
      )

      await load()
    }

    setSaving(false)
  }

  async function removeProduct(product) {
    if (!canEdit) return

    const confirmed = window.confirm(
      t('admin.deleteConfirm', { name: product.name })
    )

    if (!confirmed) return

    setError('')
    setNotice('')

    const { error: dbError } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id)

    if (dbError) {
      setError(dbError.message)
    } else {
      setNotice(t('admin.productDeleted'))
      await load()
    }
  }

  async function togglePublished(product) {
    if (!canEdit) return

    const { error: dbError } = await supabase
      .from('products')
      .update({ published: !product.published })
      .eq('id', product.id)

    if (dbError) {
      setError(dbError.message)
    } else {
      await load()
    }
  }

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <p className="eyebrow">{t('admin.catalog')}</p>

          <h1>{t('admin.productsTitle')}</h1>

          <p className="admin-subtitle">
            {t('admin.publishedCount', {
              total: products.length,
              published: products.filter((p) => p.published).length,
            })}
          </p>
        </div>

        {canEdit && (
          <button
            className="button button--dark"
            onClick={() => setEditor({ ...EMPTY })}
          >
            <Plus size={16} />
            {t('admin.addProduct')}
          </button>
        )}
      </div>

      {error && <div className="form-error admin-error">{error}</div>}

      {notice && <div className="admin-success">{notice}</div>}

      <div className="admin-toolbar">
        <label className="search-field">
          <Search size={17} />

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('admin.searchProducts')}
          />
        </label>
      </div>

      <section className="admin-panel">
        {loading ? (
          <div className="admin-loading">
            {t('admin.loading')}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <PackagePlus size={26} />

            <h2>{t('admin.noProducts')}</h2>

            <p>
              {query
                ? t('admin.noSearchResults')
                : t('admin.createFirstProduct')}
            </p>
          </div>
        ) : (
          <div className="admin-table admin-table--responsive">
            <div className="admin-row admin-row--head">
              <span>{t('admin.product')}</span>
              <span>{t('admin.price')}</span>
              <span>{t('admin.stock')}</span>
              <span>{t('admin.status')}</span>
              <span>{t('admin.updated')}</span>
              <span>{t('admin.actions')}</span>
            </div>

            {filtered.map((p) => (
              <div
                className="admin-row admin-row--product"
                key={p.id}
              >
                <span>
                  <strong>{p.name}</strong>
                  <small>{p.slug}</small>
                </span>

                <span>{formatMoney(p.price)}</span>

                <span className={p.stock <= 5 ? 'stock-low' : ''}>
                  {p.stock}
                </span>

                <span>
                  <button
                    className={`status status-button status--${
                      p.published ? 'published' : 'draft'
                    }`}
                    onClick={() => togglePublished(p)}
                  >
                    {p.published
                      ? t('admin.published')
                      : t('admin.draft')}
                  </button>
                </span>

                <span>
                  {formatDate(p.updated_at || p.created_at)}
                </span>

                <span className="row-actions">
                  {canEdit && (
                    <>
                      <button
                        className="icon-button"
                        title={t('admin.edit')}
                        onClick={() => setEditor({ ...p })}
                      >
                        <Edit3 size={16} />
                      </button>

                      <button
                        className="icon-button icon-button--danger"
                        title={t('admin.delete')}
                        onClick={() => removeProduct(p)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {editor && (
        <ProductEditor
          value={editor}
          setValue={setEditor}
          onSubmit={saveProduct}
          onClose={() => {
            if (!saving) setEditor(null)
          }}
          saving={saving}
        />
      )}
    </div>
  )
}

function ProductEditor({
  value,
  setValue,
  onSubmit,
  onClose,
  saving,
}) {
  const { t } = useLanguage()

  const update = (key, next) =>
    setValue((current) => ({
      ...current,
      [key]: next,
    }))

  return (
    <div className="admin-modal-backdrop">
      <div className="admin-modal">
        <div className="admin-modal__head">
          <div>
            <p className="eyebrow">{t('admin.catalog')}</p>

            <h2>
              {value.id
                ? t('admin.editProduct')
                : t('admin.addProduct')}
            </h2>
          </div>

          <button
            className="icon-button"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        <form
          className="admin-form"
          onSubmit={onSubmit}
        >
          <div className="form-grid">
            <label>
              {t('admin.formName')}

              <input
                required
                value={value.name}
                onChange={(e) =>
                  update('name', e.target.value)
                }
              />
            </label>

            <label>
              {t('admin.slug')}

              <input
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                value={value.slug}
                onChange={(e) =>
                  update(
                    'slug',
                    e.target.value
                      .toLowerCase()
                      .replace(/\s+/g, '-')
                  )
                }
              />
            </label>
          </div>

          <div className="form-grid">
            <label>
              {t('admin.price')} (€)

              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={value.price}
                onChange={(e) =>
                  update('price', e.target.value)
                }
              />
            </label>

            <label>
              {t('admin.stock')}

              <input
                required
                type="number"
                min="0"
                step="1"
                value={value.stock}
                onChange={(e) =>
                  update('stock', e.target.value)
                }
              />
            </label>
          </div>

          <div className="form-grid">
            <label>
              {t('admin.category')}

              <input
                value={value.category || ''}
                onChange={(e) =>
                  update('category', e.target.value)
                }
              />
            </label>

            <label>
              {t('admin.weight')}

              <input
                value={value.weight || ''}
                onChange={(e) =>
                  update('weight', e.target.value)
                }
              />
            </label>
          </div>

          <label>
            {t('admin.imageUrl')}

            <input
              placeholder="https://… oder /images/…"
              value={value.image_url || ''}
              onChange={(e) =>
                update('image_url', e.target.value)
              }
            />
          </label>

          <label>
            {t('admin.shortDescription')}

            <textarea
              rows="3"
              value={value.description || ''}
              onChange={(e) =>
                update('description', e.target.value)
              }
            />
          </label>

          <label>
            {t('admin.longDescription')}

            <textarea
              rows="5"
              value={value.long_description || ''}
              onChange={(e) =>
                update('long_description', e.target.value)
              }
            />
          </label>

          <div className="admin-checks">
            <label>
              <input
                type="checkbox"
                checked={Boolean(value.featured)}
                onChange={(e) =>
                  update('featured', e.target.checked)
                }
              />

              {t('admin.featured')}
            </label>

            <label>
              <input
                type="checkbox"
                checked={Boolean(value.published)}
                onChange={(e) =>
                  update('published', e.target.checked)
                }
              />

              {t('admin.published')}
            </label>
          </div>

          <div className="admin-modal__actions">
            <button
              type="button"
              className="button"
              onClick={onClose}
              disabled={saving}
            >
              {t('admin.cancel')}
            </button>

            <button
              type="submit"
              className="button button--dark"
              disabled={saving}
            >
              {saving
                ? t('admin.saving')
                : t('admin.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}