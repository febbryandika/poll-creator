import { relations } from 'drizzle-orm'
import { boolean, index, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { nanoid } from 'nanoid'

export const polls = pgTable(
  'polls',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text('user_id').notNull(),
    question: text('question').notNull(),
    shareCode: text('share_code')
      .notNull()
      .unique()
      .$defaultFn(() => nanoid(10)),
    isPublished: boolean('is_published').notNull().default(false),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('idx_poll_user').on(t.userId)],
)

export const options = pgTable('options', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => nanoid()),
  pollId: text('poll_id')
    .notNull()
    .references(() => polls.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
})

export const votes = pgTable(
  'votes',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => nanoid()),
    pollId: text('poll_id')
      .notNull()
      .references(() => polls.id, { onDelete: 'cascade' }),
    optionId: text('option_id')
      .notNull()
      .references(() => options.id, { onDelete: 'cascade' }),
    sessionKey: text('session_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  // One vote per session per poll (single-choice); index the hot count path.
  (t) => [unique('uq_vote').on(t.pollId, t.sessionKey), index('idx_vote_poll').on(t.pollId)],
)

export const pollsRelations = relations(polls, ({ many }) => ({
  options: many(options),
  votes: many(votes),
}))

export const optionsRelations = relations(options, ({ one, many }) => ({
  poll: one(polls, { fields: [options.pollId], references: [polls.id] }),
  votes: many(votes),
}))

export const votesRelations = relations(votes, ({ one }) => ({
  poll: one(polls, { fields: [votes.pollId], references: [polls.id] }),
  option: one(options, { fields: [votes.optionId], references: [options.id] }),
}))

export type Poll = typeof polls.$inferSelect
export type NewPoll = typeof polls.$inferInsert
export type Option = typeof options.$inferSelect
export type NewOption = typeof options.$inferInsert
export type Vote = typeof votes.$inferSelect
export type NewVote = typeof votes.$inferInsert

export * from './auth-schema'
