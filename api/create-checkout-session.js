import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const siteUrl = process.env.VITE_SITE_URL || 'https://odenwald-honig.com'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (
    !process.env.STRIPE_SECRET_KEY ||
    !process.env.SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return res.status(503).json({
      error:
        'Checkout ist noch nicht konfiguriert. Hinterlege Stripe und Supabase Server-Variablen in Vercel.',
    })
  }

  try {
    const { items, customer } = req.body || {}

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({
        error: 'Der Warenkorb ist leer.',
      })
    }

    if (
      !customer?.email ||
      !customer?.firstName ||
      !customer?.lastName ||
      !customer?.address ||
      !customer?.zip ||
      !customer?.city ||
      !customer?.country
    ) {
      return res.status(400).json({
        error: 'Bitte fülle alle Pflichtfelder aus.',
      })
    }

    const allowedCountries = ['DE', 'AT', 'ES']

    if (!allowedCountries.includes(customer.country)) {
      return res.status(400).json({
        error: 'Dieses Lieferland wird nicht unterstützt.',
      })
    }

    /*
     * Der Client darf nur Produkt-ID + Menge schicken.
     * Preise, Namen und Lagerbestand kommen ausschließlich aus Supabase.
     */
    const normalizedItems = items.map((item) => ({
      id: String(item.id),
      quantity: Math.floor(Number(item.quantity)),
    }))

    if (
      normalizedItems.some(
        (item) =>
          !item.id ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1
      )
    ) {
      return res.status(400).json({
        error: 'Ungültige Warenkorb-Daten.',
      })
    }

    const productIds = [...new Set(normalizedItems.map((item) => item.id))]

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        slug,
        name,
        price,
        stock,
        published
      `)
      .in('id', productIds)
      .eq('published', true)

    if (productsError) {
      throw productsError
    }

    const productsById = Object.fromEntries(
      (products || []).map((product) => [product.id, product])
    )

    const lines = normalizedItems.map((item) => {
      const product = productsById[item.id]

      if (!product) {
        throw new Error('Ein Produkt im Warenkorb ist nicht mehr verfügbar.')
      }

      if (product.stock < item.quantity) {
        throw new Error(
          `${product.name} ist nur noch ${product.stock}× verfügbar.`
        )
      }

      return {
        product,
        quantity: item.quantity,
        unitPrice: Number(product.price),
        lineTotal: Number(product.price) * item.quantity,
      }
    })

    const subtotal = Number(
      lines.reduce((sum, line) => sum + line.lineTotal, 0).toFixed(2)
    )

    const shipping = subtotal >= 60 ? 0 : 4.9

    const total = Number((subtotal + shipping).toFixed(2))

    /*
     * Bestellung zunächst als pending anlegen.
     * Erst der Stripe-Webhook darf sie auf paid setzen.
     */
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        email: customer.email.trim().toLowerCase(),
        first_name: customer.firstName.trim(),
        last_name: customer.lastName.trim(),
        address: customer.address.trim(),
        postal_code: customer.zip.trim(),
        city: customer.city.trim(),
        country: customer.country,
        subtotal,
        shipping,
        total,
        currency: 'EUR',
        status: 'pending',
        payment_status: 'pending',
      })
      .select()
      .single()

    if (orderError) {
      throw orderError
    }

    const orderItems = lines.map(({ product, quantity, unitPrice, lineTotal }) => ({
      order_id: order.id,
      product_id: product.id,
      product_name: product.name,
      quantity,
      unit_price: unitPrice,
      line_total: lineTotal,
    }))

    const { error: orderItemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (orderItemsError) {
      await supabase
        .from('orders')
        .delete()
        .eq('id', order.id)

      throw orderItemsError
    }

    const stripeLineItems = lines.map(
      ({ product, quantity, unitPrice }) => ({
        price_data: {
          currency: 'eur',
          product_data: {
            name: product.name,
          },
          unit_amount: Math.round(unitPrice * 100),
        },
        quantity,
      })
    )

    if (shipping > 0) {
      stripeLineItems.push({
        price_data: {
          currency: 'eur',
          product_data: {
            name: 'Versand',
          },
          unit_amount: 490,
        },
        quantity: 1,
      })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',

      customer_email: customer.email.trim().toLowerCase(),

      line_items: stripeLineItems,

      /*
       * Die Lieferadresse wurde bereits auf unserer Checkout-Seite
       * erfasst. Stripe wird sie nicht noch einmal abfragen.
       */
      billing_address_collection: 'auto',

      metadata: {
        order_id: order.id,
      },

      success_url:
        `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,

      cancel_url: `${siteUrl}/checkout/cancel`,

      allow_promotion_codes: true,

      locale:
        customer.country === 'DE'
          ? 'de'
          : customer.country === 'ES'
            ? 'es'
            : 'en',
    })

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        stripe_checkout_session_id: session.id,
      })
      .eq('id', order.id)

    if (updateError) {
      throw updateError
    }

    return res.status(200).json({
      url: session.url,
    })
  } catch (error) {
    console.error('Checkout error:', error)

    return res.status(500).json({
      error:
        error?.message ||
        'Checkout konnte nicht erstellt werden.',
    })
  }
}