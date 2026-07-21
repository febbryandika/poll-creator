import { describe, expect, it } from 'vitest'
import { voteSchema } from './validation'

describe('voteSchema', () => {
  it('accepts a fully-populated body', () => {
    expect(
      voteSchema.safeParse({ shareCode: 'abc', optionId: 'opt', sessionKey: 'sess' }).success,
    ).toBe(true)
  })

  it('rejects a missing field', () => {
    expect(voteSchema.safeParse({ optionId: 'o', sessionKey: 's' }).success).toBe(false)
    expect(voteSchema.safeParse({ shareCode: 'c', sessionKey: 's' }).success).toBe(false)
    expect(voteSchema.safeParse({ shareCode: 'c', optionId: 'o' }).success).toBe(false)
  })

  it('rejects an empty-string field', () => {
    expect(voteSchema.safeParse({ shareCode: '', optionId: 'o', sessionKey: 's' }).success).toBe(
      false,
    )
  })
})
