import React, { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import {
  formatDate,
  formatMoney,
  PAYMENT_STATUS,
  statusLabel,
} from '../../lib/admin'
import { useLanguage } from '../../i18n'

const statuses = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
]

export default function Orders() {
  const { profile } = useAuth()
  const { t } = useLanguage()

  const canUpdate = Boolean(profile)

  const [params] = useSearchParams()
  const initial = params.get('order')

  const [orders, setOrders] = useState([])
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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
      .from('orders')
      .select('*, order_items(*)')
      .order('created_at', { ascending: false })

    if (dbError) {
      setError(dbError.message)
    } else {
      setOrders(data || [])

      if (initial) {
        setSelected(
          (data || []).find((order) => order.id === initial) || null
        )
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [initial, t])

  const filtered = useMemo(
    () =>
      orders.filter(
        (order) =>
          (filter === 'all' || order.status === filter) &&
          `${order.order_number} ${order.email} ${order.first_name} ${order.last_name}`
            .toLowerCase()
            .includes(query.toLowerCase())
      ),
    [orders, filter, query]
  )

  async function updateStatus(order, status) {
    if (!canUpdate || saving || status === order.status) return

    setSaving(true)
    setError('')

    const { error: dbError } = await supabase.rpc(
      'admin_update_order_status',
      {
        p_order_id: order.id,
        p_status: status,
      }
    )

    if (dbError) {
      setError(dbError.message)
    } else {
      await load()
    }

    setSaving(false)
  }

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <p className="eyebrow">STORE</p>

          <h1>{t('admin.orders')}</h1>

          <p className="admin-subtitle">
            {t('admin.orderCount', {
              count: orders.length,
            })}
          </p>
        </div>
      </div>

      {error && (
        <div className="form-error admin-error">
          {error}
        </div>
      )}

      <div className="admin-toolbar">
        <label className="search-field">
          <Search size={17} />

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('admin.searchOrders')}
          />
        </label>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">
            {t('admin.allStatuses')}
          </option>

          {statuses.map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
            </option>
          ))}
        </select>
      </div>

      <section className="admin-panel">
        {loading ? (
          <div className="admin-loading">
            {t('admin.loading')}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Check size={26} />

            <h2>{t('admin.noOrdersFound')}</h2>

            <p>
              {t('admin.noOrdersForSelection')}
            </p>
          </div>
        ) : (
          <div className="admin-table admin-table--responsive">
            <div className="admin-row admin-row--head">
              <span>{t('admin.order')}</span>
              <span>{t('admin.customer')}</span>
              <span>{t('admin.status')}</span>
              <span>{t('admin.payment')}</span>
              <span>{t('admin.total')}</span>
              <span>{t('admin.date')}</span>
            </div>

            {filtered.map((order) => (
              <React.Fragment key={order.id}>
                <button
                  className="admin-row admin-row--link admin-row--button"
                  onClick={() =>
                    setSelected(
                      selected?.id === order.id
                        ? null
                        : order
                    )
                  }
                >
                  <span>
                    OH-{String(order.order_number).padStart(6, '0')}
                  </span>

                  <span>
                    {order.first_name} {order.last_name}
                    <small>{order.email}</small>
                  </span>

                  <span>
                    <b
                      className={`status status--${order.status}`}
                    >
                      {statusLabel(order.status)}
                    </b>
                  </span>

                  <span>
                    {PAYMENT_STATUS[order.payment_status] ||
                      order.payment_status}
                  </span>

                  <span>{formatMoney(order.total)}</span>

                  <span>
                    {formatDate(order.created_at)}

                    {selected?.id === order.id ? (
                      <ChevronUp size={15} />
                    ) : (
                      <ChevronDown size={15} />
                    )}
                  </span>
                </button>

                {selected?.id === order.id && (
                  <OrderDetail
                    order={selected}
                    onStatus={updateStatus}
                    saving={saving}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function OrderDetail({ order, onStatus, saving }) {
  const { t } = useLanguage()

  return (
    <div className="order-detail">
      <div className="order-detail__grid">
        <div>
          <p className="eyebrow">
            {t('admin.customer')}
          </p>

          <strong>
            {order.first_name} {order.last_name}
          </strong>

          <span>{order.email}</span>
        </div>

        <div>
          <p className="eyebrow">
            {t('admin.deliveryAddress')}
          </p>

          <span>{order.address}</span>

          <span>
            {order.postal_code} {order.city}
          </span>

          <span>{order.country}</span>
        </div>

        <div>
          <p className="eyebrow">
            {t('admin.paymentDetails')}
          </p>

          <span>
            {PAYMENT_STATUS[order.payment_status] ||
              order.payment_status}
          </span>

          <small>
            {order.stripe_payment_intent_id ||
              'No Payment Intent ID'}
          </small>
        </div>
      </div>

      <div className="order-items">
        <h3>{t('admin.items')}</h3>

        {(order.order_items || []).map((item) => (
          <div key={item.id}>
            <span>
              {item.product_name} ×{item.quantity}
            </span>

            <strong>
              {formatMoney(item.line_total)}
            </strong>
          </div>
        ))}

        <div className="order-total">
          <span>{t('admin.grandTotal')}</span>

          <strong>
            {formatMoney(order.total)}
          </strong>
        </div>
      </div>

      <div className="order-detail__actions">
        <label>
          {t('admin.orderStatus')}

          <select
            value={order.status}
            onChange={(e) =>
              onStatus(order, e.target.value)
            }
            disabled={saving}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  )
}