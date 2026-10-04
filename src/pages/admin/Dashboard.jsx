import React, { useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Euro,
  Package,
  ShoppingBag,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatDate, formatMoney, statusLabel } from '../../lib/admin'
import { useLanguage } from '../../i18n'

const PAID = ['paid', 'processing', 'shipped', 'delivered']

export default function Dashboard() {
  const { t } = useLanguage()

  const [state, setState] = useState({
    loading: true,
    error: '',
    orders: [],
    stats: null,
  })

  useEffect(() => {
    let active = true

    async function load() {
      if (!supabase) {
        setState({
          loading: false,
          error: t('admin.notConfigured'),
          orders: [],
          stats: null,
        })
        return
      }

      const [ordersResult, productsResult] = await Promise.all([
        supabase
          .from('orders')
          .select(
            'id,order_number,status,payment_status,email,first_name,last_name,total,created_at'
          )
          .order('created_at', { ascending: false })
          .limit(100),

        supabase.from('products').select('id,published,stock'),
      ])

      if (!active) return

      if (ordersResult.error || productsResult.error) {
        setState({
          loading: false,
          error:
            ordersResult.error?.message ||
            productsResult.error?.message ||
            'Failed to load data.',
          orders: [],
          stats: null,
        })
        return
      }

      const orders = ordersResult.data || []
      const products = productsResult.data || []

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const todayOrders = orders.filter(
        (order) => new Date(order.created_at) >= today
      )

      const revenue = orders
        .filter((order) => PAID.includes(order.status))
        .reduce((sum, order) => sum + Number(order.total || 0), 0)

      const open = orders.filter((order) =>
        ['pending', 'paid', 'processing'].includes(order.status)
      ).length

      setState({
        loading: false,
        error: '',
        orders: orders.slice(0, 8),
        stats: {
          todayOrders: todayOrders.length,
          open,
          revenue,
          activeProducts: products.filter((product) => product.published)
            .length,
          lowStock: products.filter(
            (product) => product.published && product.stock <= 5
          ).length,
        },
      })
    }

    load()

    return () => {
      active = false
    }
  }, [t])

  if (state.loading) {
    return <AdminLoading />
  }

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <p className="eyebrow">{t('admin.storeAdmin')}</p>
          <h1>{t('admin.dashboard')}</h1>
        </div>

        <Link className="button button--dark" to="/admin/orders">
          {t('admin.ordersView')}
          <ArrowRight size={16} />
        </Link>
      </div>

      {state.error && <AdminError message={state.error} />}

      {state.stats && (
        <>
          <div className="stats-grid">
            <Stat
              icon={ShoppingBag}
              label={t('admin.todayOrders')}
              value={state.stats.todayOrders}
            />

            <Stat
              icon={Clock3}
              label={t('admin.openOrders')}
              value={state.stats.open}
            />

            <Stat
              icon={Euro}
              label={t('admin.revenue')}
              value={formatMoney(state.stats.revenue)}
            />

            <Stat
              icon={Package}
              label={t('admin.activeProducts')}
              value={state.stats.activeProducts}
            />
          </div>

          {state.stats.lowStock > 0 && (
            <div className="admin-alert">
              <AlertCircle size={18} />

              <span>
                {t('admin.lowStock', {
                  count: state.stats.lowStock,
                  product:
                    state.stats.lowStock === 1
                      ? t('admin.product')
                      : t('admin.products'),
                })}
              </span>

              <Link to="/admin/products">
                {t('admin.productsCheck')}
              </Link>
            </div>
          )}

          <section className="admin-panel">
            <div className="admin-panel__head">
              <div>
                <p className="eyebrow">{t('admin.current')}</p>
                <h2>{t('admin.recentOrders')}</h2>
              </div>

              <Link className="text-link" to="/admin/orders">
                {t('admin.viewAll')} →
              </Link>
            </div>

            {state.orders.length === 0 ? (
              <Empty text={t('admin.noOrders')} />
            ) : (
              <div className="admin-table admin-table--responsive">
                <div className="admin-row admin-row--head">
                  <span>{t('admin.order')}</span>
                  <span>{t('admin.customer')}</span>
                  <span>{t('admin.status')}</span>
                  <span>{t('admin.total')}</span>
                  <span>{t('admin.date')}</span>
                </div>

                {state.orders.map((order) => (
                  <Link
                    className="admin-row admin-row--link"
                    to={`/admin/orders?order=${order.id}`}
                    key={order.id}
                  >
                    <span>
                      OH-{String(order.order_number).padStart(6, '0')}
                    </span>

                    <span>
                      {order.first_name} {order.last_name}
                      <small>{order.email}</small>
                    </span>

                    <span>
                      <b className={`status status--${order.status}`}>
                        {statusLabel(order.status)}
                      </b>
                    </span>

                    <span>{formatMoney(order.total)}</span>

                    <span>{formatDate(order.created_at)}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="stat">
      <Icon size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Empty({ text }) {
  return (
    <div className="empty-state">
      <CheckCircle2 size={24} />
      <p>{text}</p>
    </div>
  )
}

function AdminLoading() {
  const { t } = useLanguage()

  return (
    <div className="admin-loading">
      {t('admin.loading')}
    </div>
  )
}

function AdminError({ message }) {
  return (
    <div className="form-error admin-error">
      <AlertCircle size={17} />
      {message}
    </div>
  )
}