export async function createCheckoutSession(payload) {
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Checkout konnte nicht gestartet werden.')
  return data
}
