import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

const siteUrl =
  process.env.VITE_SITE_URL || 'https://odenwald-honig.com'

function badRequest(message) {
  const error = new Error(message)
  error.statusCode = 400
  return error
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase()
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
    })
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

  let orderId = null
  let stripeSession = null
  let stockReserved = false

  try {
    const { items, customer } = req.body || {}

    if (!Array.isArray(items) || items.length === 0) {
      throw badRequest('Der Warenkorb ist leer.')
    }

    if (!customer || typeof customer !== 'object') {
      throw badRequest('Ungültige Kundendaten.')
    }

    const email = normalizeEmail(customer.email)
    const firstName = normalizeText(customer.firstName)
    const lastName = normalizeText(customer.lastName)
    const address = normalizeText(customer.address)
    const zip = normalizeText(customer.zip)
    const city = normalizeText(customer.city)
    const country = normalizeText(
      customer.country || 'DE'
    ).toUpperCase()

    if (
      !email ||
      !firstName ||
      !lastName ||
      !address ||
      !zip ||
      !city
    ) {
      throw badRequest('Ungültige Bestelldaten.')
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw badRequest('Ungültige E-Mail-Adresse.')
    }

    const allowedCountries = ['DE', 'AT', 'ES']

    if (!allowedCountries.includes(country)) {
      throw badRequest(
        'Dieses Lieferland wird nicht unterstützt.'
      )
    }

    const normalizedItems = items.map((item) => {
      const id = normalizeText(item?.id)
      const quantity = Number(item?.quantity)

      if (!id) {
        throw badRequest(
          'Ein Warenkorbartikel ist ungültig.'
        )
      }

      if (
        !Number.isFinite(quantity) ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        throw badRequest(
          'Die Produktmenge muss eine positive ganze Zahl sein.'
        )
      }

      if (quantity > 100) {
        throw badRequest(
          'Die maximale Menge eines Produkts beträgt 100 Stück.'
        )
      }

      return {
        id,
        quantity,
      }
    })

    const uniqueProductIds = new Set(
      normalizedItems.map((item) => item.id)
    )

    if (
      uniqueProductIds.size !== normalizedItems.length
    ) {
      throw badRequest(
        'Ein Produkt darf im Warenkorb nur einmal vorkommen.'
      )
    }

    const productIds = normalizedItems.map(
      (item) => item.id
    )

    const {
      data: products,
      error: productsError,
    } = await supabase
      .from('products')
      .select(
        'id,slug,name,price,stock,published'
      )
      .in('id', productIds)
      .eq('published', true)

    if (productsError) {
      throw productsError
    }

    const byId = Object.fromEntries(
      (products || []).map((product) => [
        product.id,
        product,
      ])
    )

    if (
      (products || []).length !==
      productIds.length
    ) {
      throw badRequest(
        'Mindestens ein Produkt ist nicht mehr verfügbar.'
      )
    }

    const lines = normalizedItems.map((item) => {
      const product = byId[item.id]

      if (!product) {
        throw badRequest(
          `Produkt nicht verfügbar: ${item.id}`
        )
      }

      if (
        !Number.isFinite(Number(product.price)) ||
        Number(product.price) < 0
      ) {
        throw new Error(
          `Ungültiger Produktpreis für: ${product.name}`
        )
      }

      if (
        !Number.isInteger(Number(product.stock))
      ) {
        throw new Error(
          `Ungültiger Lagerbestand für: ${product.name}`
        )
      }

      if (product.stock < item.quantity) {
        throw badRequest(
          `Nicht genügend Bestand für: ${product.name}`
        )
      }

      return {
        product,
        quantity: item.quantity,
      }
    })

    const subtotal = lines.reduce(
      (sum, line) =>
        sum +
        Number(line.product.price) *
          line.quantity,
      0
    )

    const shipping = subtotal >= 60 ? 0 : 4.90
    const total = subtotal + shipping

    const {
      data: order,
      error: orderError,
    } = await supabase
      .from('orders')
      .insert({
        email,
        first_name: firstName,
        last_name: lastName,
        address,
        postal_code: zip,
        city,
        country,
        subtotal,
        shipping,
        total,
        status: 'pending',
        payment_status: 'pending',
      })
      .select()
      .single()

    if (orderError) {
      throw orderError
    }

    orderId = order.id

    const { error: itemError } =
      await supabase
        .from('order_items')
        .insert(
          lines.map(({ product, quantity }) => ({
            order_id: order.id,
            product_id: product.id,
            product_name: product.name,
            quantity,
            unit_price: product.price,
            line_total:
              Number(product.price) * quantity,
          }))
        )

    if (itemError) {
      throw itemError
    }

    /*
     * Atomically reserve stock.
     */
    const {
      data: reservationResult,
      error: reservationError,
    } = await supabase.rpc(
      'reserve_order_stock',
      {
        p_order_id: order.id,
      }
    )

    if (reservationError) {
      throw reservationError
    }

    if (reservationResult !== true) {
      throw new Error(
        'Stock reservation was not created.'
      )
    }

    stockReserved = true

    /*
     * Stripe Checkout expires after 30 minutes.
     */
    stripeSession =
      await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: email,

        expires_at:
          Math.floor(Date.now() / 1000) +
          30 * 60,

        line_items: lines.map(
          ({ product, quantity }) => ({
            price_data: {
              currency: 'eur',
              product_data: {
                name: product.name,
              },
              unit_amount: Math.round(
                Number(product.price) * 100
              ),
            },
            quantity,
          })
        ),

        shipping_address_collection: {
          allowed_countries: allowedCountries,
        },

        shipping_options: shipping
          ? [
              {
                shipping_rate_data: {
                  type: 'fixed_amount',
                  fixed_amount: {
                    amount: 490,
                    currency: 'eur',
                  },
                  display_name: 'Versand',
                },
              },
            ]
          : [],

        metadata: {
          order_id: order.id,
        },

        success_url:
          `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${siteUrl}/checkout/cancel`,

        allow_promotion_codes: true,
      })

    const { error: updateError } =
      await supabase
        .from('orders')
        .update({
          stripe_checkout_session_id:
            stripeSession.id,
        })
        .eq('id', order.id)

    if (updateError) {
      throw updateError
    }

    return res.status(200).json({
      url: stripeSession.url,
    })
  } catch (error) {
    console.error(
      'Checkout error:',
      error
    )

    /*
     * Close Stripe session if it was already created.
     */
    if (stripeSession?.id) {
      try {
        await stripe.checkout.sessions.expire(
          stripeSession.id
        )
      } catch (expireError) {
        console.error(
          'Could not expire Stripe session:',
          expireError
        )
      }
    }

    /*
     * Release reserved stock if necessary.
     */
    if (orderId && stockReserved) {
      try {
        const {
          error: releaseError,
        } = await supabase.rpc(
          'release_order_stock',
          {
            p_order_id: orderId,
          }
        )

        if (releaseError) {
          console.error(
            'Could not release reserved stock:',
            releaseError
          )
        }
      } catch (releaseError) {
        console.error(
          'Could not release reserved stock:',
          releaseError
        )
      }
    }

    /*
     * Cancel failed pending order.
     */
    if (orderId) {
      try {
        await supabase
          .from('orders')
          .update({
            status: 'cancelled',
            payment_status: 'cancelled',
            updated_at:
              new Date().toISOString(),
          })
          .eq('id', orderId)
          .neq('payment_status', 'paid')
      } catch (cleanupError) {
        console.error(
          'Could not clean up failed order:',
          cleanupError
        )
      }
    }

    const statusCode =
      Number.isInteger(error?.statusCode) &&
      error.statusCode >= 400 &&
      error.statusCode < 500
        ? error.statusCode
        : 500

    return res.status(statusCode).json({
      error:
        error?.message ||
        'Checkout konnte nicht erstellt werden.',
    })
  }
}