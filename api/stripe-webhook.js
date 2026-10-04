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

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    )

    switch (event.type) {
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

        const { error } = await supabase.rpc(
          'finalize_paid_order',
          {
            p_order_id: orderId,
            p_payment_intent_id:
              typeof session.payment_intent === 'string'
                ? session.payment_intent
                : null,
          }
        )

        if (error) {
          console.error(
            'Could not finalize order:',
            orderId,
            error
          )

          throw error
        }

        console.log(
          `Order ${orderId} successfully finalized.`
        )

        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object
        const orderId = session.metadata?.order_id

        if (!orderId) break

        /*
         * Eine bereits bezahlte Bestellung darf nicht
         * nachträglich auf cancelled gesetzt werden.
         */
        const { error } = await supabase
          .from('orders')
          .update({
            status: 'cancelled',
            payment_status: 'expired',
            updated_at: new Date().toISOString(),
          })
          .eq('id', orderId)
          .neq('payment_status', 'paid')

        if (error) {
          throw error
        }

        break
      }

      default:
        console.log(
          `Unhandled Stripe event: ${event.type}`
        )
    }

    return res.status(200).json({
      received: true,
    })
  } catch (error) {
    console.error('Stripe webhook error:', error)

    return res.status(400).send(
      `Webhook Error: ${error.message}`
    )
  }
}