import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '')

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export const config = {
  api: {
    bodyParser: false,
  },
}

async function rawBody(req) {
  const chunks = []

  for await (const chunk of req) {
    chunks.push(
      typeof chunk === 'string'
        ? Buffer.from(chunk)
        : chunk
    )
  }

  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end()
  }

  if (
    !process.env.STRIPE_SECRET_KEY ||
    !process.env.SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.STRIPE_WEBHOOK_SECRET
  ) {
    return res.status(503).json({
      error: 'Stripe webhook ist nicht konfiguriert.',
    })
  }

  try {
    const body = await rawBody(req)
    const signature = req.headers['stripe-signature']

    if (!signature) {
      return res.status(400).send('Missing Stripe signature')
    }

    /*
     * Stripe-Signatur prüfen.
     *
     * Ohne diese Prüfung darf kein Request unsere
     * Bestellungen verändern.
     */
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )

    switch (event.type) {
      /*
       * ========================================================
       * CHECKOUT COMPLETED
       * ========================================================
       */
      case 'checkout.session.completed': {
        const session = event.data.object
        const orderId = session.metadata?.order_id

        if (!orderId) {
          console.error(
            'Stripe session has no order_id:',
            session.id
          )
          break
        }

        /*
         * Der Kunde kann theoretisch die Zahlung abgeschlossen haben,
         * aber Stripe noch auf die endgültige Bestätigung warten.
         *
         * Bei normalen Card Payments ist payment_status "paid".
         */
        if (session.payment_status !== 'paid') {
          console.log(
            `Checkout session ${session.id} completed but payment is not paid yet.`
          )
          break
        }

        /*
         * Bestellung laden.
         */
        const {
          data: order,
          error: orderError,
        } = await supabase
          .from('orders')
          .select(
            'id, stripe_checkout_session_id, payment_status, stock_reserved_at, stock_released_at'
          )
          .eq('id', orderId)
          .single()

        if (orderError) {
          throw orderError
        }

        if (!order) {
          throw new Error(
            `Order not found: ${orderId}`
          )
        }

        /*
         * Sicherheitsprüfung:
         *
         * Die Stripe-Session muss exakt zu der Bestellung gehören,
         * die über die Metadata referenziert wird.
         */
        if (
          order.stripe_checkout_session_id !==
          session.id
        ) {
          throw new Error(
            `Stripe session mismatch for order ${orderId}`
          )
        }

        /*
         * Webhooks können mehrfach zugestellt werden.
         * Wenn die Bestellung bereits bezahlt ist, ist nichts mehr zu tun.
         */
        if (order.payment_status === 'paid') {
          console.log(
            `Order ${orderId} is already paid.`
          )
          break
        }

        /*
         * Eine bereits freigegebene Reservierung darf nicht
         * nachträglich bezahlt werden.
         */
        if (order.stock_released_at) {
          throw new Error(
            `Stock reservation was already released for order ${orderId}`
          )
        }

        /*
         * finalize_paid_order() NO descuenta stock.
         *
         * El stock ya fue reservado al crear el checkout.
         * Esta función solamente confirma el pago.
         */
        const {
          error: finalizeError,
        } = await supabase.rpc(
          'finalize_paid_order',
          {
            p_order_id: orderId,
            p_payment_intent_id:
              typeof session.payment_intent ===
              'string'
                ? session.payment_intent
                : null,
          }
        )

        if (finalizeError) {
          console.error(
            'Could not finalize order:',
            orderId,
            finalizeError
          )

          throw finalizeError
        }

        console.log(
          `Order ${orderId} successfully finalized.`
        )

        break
      }

      /*
       * ========================================================
       * CHECKOUT EXPIRED
       * ========================================================
       */
      case 'checkout.session.expired': {
        const session = event.data.object
        const orderId = session.metadata?.order_id

        if (!orderId) {
          break
        }

        /*
         * Cargar la orden.
         */
        const {
          data: order,
          error: orderError,
        } = await supabase
          .from('orders')
          .select(
            'id, stripe_checkout_session_id, payment_status, stock_reserved_at, stock_released_at'
          )
          .eq('id', orderId)
          .single()

        if (orderError) {
          throw orderError
        }

        if (!order) {
          throw new Error(
            `Order not found: ${orderId}`
          )
        }

        /*
         * Seguridad:
         * La sesión expirada debe pertenecer exactamente
         * a esta orden.
         */
        if (
          order.stripe_checkout_session_id !==
          session.id
        ) {
          throw new Error(
            `Stripe session mismatch for expired order ${orderId}`
          )
        }

        /*
         * Una orden ya pagada nunca debe ser modificada
         * por un evento de expiración.
         */
        if (order.payment_status === 'paid') {
          console.log(
            `Expired session ${session.id} belongs to an already paid order ${orderId}.`
          )
          break
        }

        /*
         * ========================================================
         * LIBERAR STOCK RESERVADO
         * ========================================================
         *
         * release_order_stock() devuelve:
         *
         * true  -> stock liberado correctamente
         * false -> no había nada que liberar
         *
         * Solo continuamos con la expiración si la función
         * confirma explícitamente que liberó el stock.
         */
        const {
          data: released,
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
            orderId,
            releaseError
          )

          throw releaseError
        }

        /*
         * No marcar la orden como expirada si la liberación
         * del stock no se realizó correctamente.
         */
        if (released !== true) {
          throw new Error(
            `Stock reservation could not be released for order ${orderId}`
          )
        }

        /*
         * ========================================================
         * MARCAR ORDEN COMO EXPIRADA
         * ========================================================
         *
         * Esto ocurre DESPUÉS de haber liberado correctamente
         * el stock.
         */
        const {
          error: expireError,
        } = await supabase
          .from('orders')
          .update({
            status: 'cancelled',
            payment_status: 'expired',
            updated_at:
              new Date().toISOString(),
          })
          .eq('id', orderId)
          .eq(
            'stripe_checkout_session_id',
            session.id
          )
          .neq('payment_status', 'paid')

        if (expireError) {
          throw expireError
        }

        console.log(
          `Order ${orderId} expired and reserved stock was released.`
        )

        break
      }

      /*
       * ========================================================
       * UNHANDLED EVENT
       * ========================================================
       */
      default:
        console.log(
          `Unhandled Stripe event: ${event.type}`
        )
    }

    return res.status(200).json({
      received: true,
    })
  } catch (error) {
    console.error(
      'Stripe webhook error:',
      error
    )

    return res.status(400).send(
      `Webhook Error: ${error.message}`
    )
  }
}