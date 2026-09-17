/**
 * OC fork — P1.12 (OC-28781): AI generation usage analytics.
 *
 * Emits two UserPilot tracked events — one per generation request, one per
 * applied proposal — and carries the generation identifier between them via a
 * one-slot ledger. Everything here is fire-and-forget: nothing on the
 * authoring path awaits analytics, and every emitter is guarded so an
 * analytics bug can never alter a generation result or an Apply (AC4).
 * Payloads are the AC3 whitelist and nothing else — no prompt, no expression.
 *
 * The private @openclinica/logic-builder package is analytics-agnostic: the
 * host sees every trigger (generation through the injected GenerateClient,
 * Apply through onApply), so the emitter lives here (design.md §10).
 */
import type { ExpressionTab, FailureReason } from '@openclinica/logic-builder'
import userpilot from '#/userpilot'

/** Event names are permanent in UserPilot (archive only) — agreed before the first production send. */
export const LOGIC_BUILDER_EVENTS = {
  generateRequest: 'logic_builder.generate.request',
  generateApply: 'logic_builder.generate.apply',
} as const

export type LatencyBucket = '<1s' | '1-2s' | '2-3s' | '3-5s' | '5-10s' | '>10s'

/**
 * Lower bound inclusive. UserPilot cannot average an event property, so the
 * distribution is charted from this bucket; the 3-5s / 5-10s bins straddle
 * the 5 s p95 budget (design.md §6.4).
 */
export function latencyBucket(ms: number): LatencyBucket {
  if (ms < 1000) return '<1s'
  if (ms < 2000) return '1-2s'
  if (ms < 3000) return '2-3s'
  if (ms < 5000) return '3-5s'
  if (ms < 10000) return '5-10s'
  return '>10s'
}

interface UuidSource {
  randomUUID?: () => string
}

/**
 * Opaque per-generation id (AC1): RFC 4122 when the platform offers
 * crypto.randomUUID (secure contexts), else time+random base-36. Injectable
 * source for tests; never throws.
 */
export function newGenerationId(source: UuidSource | undefined = globalThis.crypto as UuidSource | undefined): string {
  try {
    if (source && typeof source.randomUUID === 'function') {
      return source.randomUUID()
    }
  } catch {
    // insecure context or exotic platform — use the fallback below
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export type GenerationOutcome = 'success' | FailureReason

// AC3 whitelist, enforced by type. These are type aliases (not interfaces) so
// they are assignable to userpilot.track's Record<string, AnalyticsValue>
// without an index signature — which is exactly what keeps an extra key such
// as `expression` a compile error at every emit site.
export type GenerateRequestEvent = {
  readonly attribute: ExpressionTab
  readonly itemName: string
  readonly generationId: string
  readonly outcome: GenerationOutcome
  readonly latencyMs: number
  readonly latencyBucket: LatencyBucket
}

export type GenerateApplyEvent =
  | { readonly attribute: ExpressionTab; readonly itemName: string; readonly generationId: string }
  // Ledger miss only (spec Decision 6): the event still goes out, without an id.
  | { readonly attribute: ExpressionTab; readonly itemName: string }

export interface LedgerEntry {
  readonly generationId: string
  readonly itemName: string
  readonly attribute: ExpressionTab
  readonly expression: string
}

// One slot: the open dialog's last successful generation. design.md D2 gives
// one dialog at a time; the dialog clears its proposal on any failure and
// applies only the displayed proposal, verbatim — so this entry is exactly the
// generation that produced whatever the host is asked to apply (spec §6).
let ledger: LedgerEntry | null = null

/** Called by the decorated client on a successful generation. */
export function recordGeneration(entry: LedgerEntry): void {
  ledger = entry
}

/** Called on dialog close (and by the decorator on a failed generation). */
export function clearGenerationLedger(): void {
  ledger = null
}

export interface ApplyScope {
  readonly itemName: string
  readonly attribute: ExpressionTab
  readonly expression: string
}

function warn(message: string, ...detail: unknown[]): void {
  console.warn(`Logic Builder analytics: ${message}`, ...detail)
}

/**
 * Emit the apply event for the proposal the host just persisted (AC2). Returns
 * the generation id so P1.13 can stamp the post-Apply verdict; `undefined` on a
 * ledger miss — unreachable while the dialog applies only its displayed
 * proposal — in which case the event still goes out without an id and a
 * warning names the gap (spec Decision 6). The slot is retained: a rejected
 * Apply keeps the dialog open for a retry; the host clears the ledger on close.
 */
export function emitGenerateApply(scope: ApplyScope): string | undefined {
  try {
    const generationId =
      ledger !== null &&
      ledger.itemName === scope.itemName &&
      ledger.attribute === scope.attribute &&
      ledger.expression === scope.expression
        ? ledger.generationId
        : undefined
    if (generationId === undefined) {
      warn('apply had no matching generation in the ledger', scope.attribute, scope.itemName)
    }
    const event: GenerateApplyEvent =
      generationId === undefined
        ? { attribute: scope.attribute, itemName: scope.itemName }
        : { attribute: scope.attribute, itemName: scope.itemName, generationId }
    userpilot.track(LOGIC_BUILDER_EVENTS.generateApply, event)
    return generationId
  } catch (e) {
    warn('apply emission failed', e)
    return undefined
  }
}
