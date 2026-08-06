const EXTRA_THRESHOLD = 5_000_000
const CAST_THRESHOLD = 60_000_000

function toAmount(value) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? amount : 0
}

export function calculateBookingPricing(cost, extra) {
  const costAmount = toAmount(cost)
  const extraAmount = toAmount(extra)
  const quotedAmount = costAmount + extraAmount
  const totalCast = quotedAmount >= EXTRA_THRESHOLD ? quotedAmount / 0.9 : quotedAmount
  const bookingExpense = totalCast >= CAST_THRESHOLD ? totalCast / 0.65 : totalCast / 0.6

  return {
    quotedAmount,
    totalCast: Math.round(totalCast),
    bookingExpense: Math.round(bookingExpense),
  }
}
