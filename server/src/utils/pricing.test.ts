import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateBookingPricing } from './pricing.js'

test('keeps quoted amount below five million as total cast', () => {
  assert.deepEqual(calculateBookingPricing(3_000_000, 1_000_000), { quotedAmount: 4_000_000, totalCast: 4_000_000, bookingExpense: 6_666_667 })
})

test('applies the 0.9 and 0.6 rates for a normal quote', () => {
  assert.deepEqual(calculateBookingPricing(42_000_000, 2_000_000), { quotedAmount: 44_000_000, totalCast: 48_888_889, bookingExpense: 81_481_481 })
})

test('uses the 0.65 rate when total cast reaches sixty million', () => {
  assert.deepEqual(calculateBookingPricing(54_000_000, 0), { quotedAmount: 54_000_000, totalCast: 60_000_000, bookingExpense: 92_307_692 })
})
