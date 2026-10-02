import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')
const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '')
const siteUrl = process.env.VITE_SITE_URL || 'https://odenwald-honig.com'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!process.env.STRIPE_SECRET_KEY || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(503).json({ error: 'Checkout ist noch nicht konfiguriert. Hinterlege Stripe und Supabase Server-Variablen in Vercel.' })
  try {
    const { items, customer } = req.body || {}
    if (!Array.isArray(items) || !items.length || !customer?.email) return res.status(400).json({ error: 'Ungültige Bestelldaten.' })
    const ids = items.map(i => i.id)
    const { data: products, error } = await supabase.from('products').select('id,slug,name,price,stock,published').in('slug', ids).eq('published', true)
    if (error) throw error
    const bySlug = Object.fromEntries(products.map(p => [p.slug, p]))
    const lines = items.map(item => {
      const product = bySlug[item.id]
      const quantity = Math.max(1, Math.floor(Number(item.quantity)))
      if (!product || product.stock < quantity) throw new Error(`Produkt nicht verfügbar: ${item.id}`)
      return { product, quantity }
    })
    const subtotal = lines.reduce((sum, line) => sum + Number(line.product.price) * line.quantity, 0)
    const shipping = subtotal > 60 ? 0 : 4.90
    const total = subtotal + shipping
    const { data: order, error: orderError } = await supabase.from('orders').insert({
      email: customer.email, first_name: customer.firstName, last_name: customer.lastName, address: customer.address, postal_code: customer.zip, city: customer.city, country: customer.country || 'DE', subtotal, shipping, total, status: 'pending', payment_status: 'pending'
    }).select().single()
    if (orderError) throw orderError
    const { error: itemError } = await supabase.from('order_items').insert(lines.map(({product,quantity}) => ({ order_id: order.id, product_id: product.id, product_name: product.name, quantity, unit_price: product.price, line_total: Number(product.price) * quantity })))
    if (itemError) throw itemError
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: customer.email,
      line_items: lines.map(({product,quantity}) => ({ price_data: { currency: 'eur', product_data: { name: product.name }, unit_amount: Math.round(Number(product.price) * 100) }, quantity })),
      shipping_address_collection: { allowed_countries: ['DE','AT','ES'] },
      shipping_options: shipping ? [{ shipping_rate_data: { type: 'fixed_amount', fixed_amount: { amount: 490, currency: 'eur' }, display_name: 'Versand' } }] : [],
      metadata: { order_id: order.id },
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout/cancel`,
      allow_promotion_codes: true,
    })
    await supabase.from('orders').update({ stripe_checkout_session_id: session.id }).eq('id', order.id)
    return res.status(200).json({ url: session.url })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: error.message || 'Checkout konnte nicht erstellt werden.' })
  }
}
