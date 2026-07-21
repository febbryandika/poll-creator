import { describe, expect, it } from 'vitest'
import { pollInputSchema } from './validations'

const base = { question: 'Best editor?', options: ['Vim', 'Emacs'] }

describe('pollInputSchema', () => {
  it('accepts a valid 2-option poll with no expiry', () => {
    expect(pollInputSchema.safeParse(base).success).toBe(true)
  })

  it('accepts a far-future expiry', () => {
    expect(pollInputSchema.safeParse({ ...base, expiresAt: '2999-01-01T00:00' }).success).toBe(true)
  })

  it('rejects fewer than 2 options', () => {
    expect(pollInputSchema.safeParse({ ...base, options: ['only-one'] }).success).toBe(false)
  })

  it('rejects more than 6 options', () => {
    expect(
      pollInputSchema.safeParse({ ...base, options: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }).success,
    ).toBe(false)
  })

  it('rejects an empty or whitespace-only question', () => {
    expect(pollInputSchema.safeParse({ ...base, question: '' }).success).toBe(false)
    expect(pollInputSchema.safeParse({ ...base, question: '   ' }).success).toBe(false)
  })

  it('rejects a whitespace-only option', () => {
    expect(pollInputSchema.safeParse({ ...base, options: ['ok', '   '] }).success).toBe(false)
  })

  it('rejects an expiry in the past', () => {
    expect(pollInputSchema.safeParse({ ...base, expiresAt: '2000-01-01T00:00' }).success).toBe(
      false,
    )
  })
})
