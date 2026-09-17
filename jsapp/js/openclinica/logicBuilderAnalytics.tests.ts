import chai from 'chai'

const mockTrack = jest.fn()
jest.mock('#/userpilot', () => ({
  __esModule: true,
  default: { track: (...args: unknown[]) => mockTrack(...args) },
}))

import {
  type GenerateRequestEvent,
  LOGIC_BUILDER_EVENTS,
  clearGenerationLedger,
  emitGenerateApply,
  latencyBucket,
  newGenerationId,
  recordGeneration,
} from './logicBuilderAnalytics'

describe('LOGIC_BUILDER_EVENTS (P1.12)', () => {
  it('uses the namespaced, permanent UserPilot event names', () => {
    chai.expect(LOGIC_BUILDER_EVENTS).to.deep.equal({
      generateRequest: 'logic_builder.generate.request',
      generateApply: 'logic_builder.generate.apply',
    })
  })
})

describe('latencyBucket (P1.12 AC1 timing)', () => {
  it('bins with the lower bound inclusive', () => {
    const cases: Array<[number, string]> = [
      [0, '<1s'],
      [999, '<1s'],
      [1000, '1-2s'],
      [1999, '1-2s'],
      [2000, '2-3s'],
      [2999, '2-3s'],
      [3000, '3-5s'],
      [4999, '3-5s'],
      [5000, '5-10s'],
      [9999, '5-10s'],
      [10000, '>10s'],
      [60000, '>10s'],
    ]
    for (const [ms, bucket] of cases) {
      chai.expect(latencyBucket(ms), `${ms} ms`).to.equal(bucket)
    }
  })
})

describe('newGenerationId (P1.12 AC1 identifier)', () => {
  it('uses randomUUID when the platform offers it', () => {
    chai.expect(newGenerationId({ randomUUID: () => 'uuid-1' })).to.equal('uuid-1')
  })

  it('falls back to a time+random id without randomUUID, and ids differ', () => {
    const a = newGenerationId({})
    const b = newGenerationId(undefined)
    chai.expect(a).to.match(/^[0-9a-z]+-[0-9a-z]+$/)
    chai.expect(a).to.not.equal(b)
  })

  it('falls back when randomUUID throws (insecure context)', () => {
    const id = newGenerationId({
      randomUUID: () => {
        throw new Error('insecure context')
      },
    })
    chai.expect(id).to.match(/^[0-9a-z]+-[0-9a-z]+$/)
  })
})

// AC3 at compile time: the request payload has no room for expression text.
// `npm run lint:types` fails if this directive becomes unused (i.e. if the
// whitelist ever gains an index signature or an `expression` key).
const forbiddenPayload: GenerateRequestEvent = {
  attribute: 'calculation',
  itemName: 'BMI',
  generationId: 'g',
  outcome: 'success',
  latencyMs: 1,
  latencyBucket: '<1s',
  // @ts-expect-error — `expression` is not a permitted GenerateRequestEvent key
  expression: 'never',
}
void forbiddenPayload

describe('emitGenerateApply (P1.12 AC2 — apply carries the generation id)', () => {
  const scope = { itemName: 'BMI', attribute: 'calculation' as const, expression: '${W} div (${H} * ${H})' }

  beforeEach(() => {
    mockTrack.mockReset()
    clearGenerationLedger()
  })

  it('emits the apply event with the ledger id when item, attribute and expression match', () => {
    recordGeneration({ generationId: 'g1', ...scope })
    const id = emitGenerateApply(scope)
    chai.expect(id).to.equal('g1')
    chai.expect(mockTrack.mock.calls).to.deep.equal([
      [LOGIC_BUILDER_EVENTS.generateApply, { attribute: 'calculation', itemName: 'BMI', generationId: 'g1' }],
    ])
  })

  it('retains the slot, so a retried Apply after a rejected write still matches', () => {
    recordGeneration({ generationId: 'g1', ...scope })
    emitGenerateApply(scope)
    chai.expect(emitGenerateApply(scope)).to.equal('g1')
    chai.expect(mockTrack.mock.calls.length).to.equal(2)
  })

  it('emits without an id and warns when the expression differs', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    recordGeneration({ generationId: 'g1', ...scope })
    const id = emitGenerateApply({ ...scope, expression: 'something else' })
    chai.expect(id).to.equal(undefined)
    chai.expect(mockTrack.mock.calls).to.deep.equal([
      [LOGIC_BUILDER_EVENTS.generateApply, { attribute: 'calculation', itemName: 'BMI' }],
    ])
    chai.expect(warn.mock.calls.length).to.equal(1)
    warn.mockRestore()
  })

  it('misses when the item or attribute differs', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    recordGeneration({ generationId: 'g1', ...scope })
    chai.expect(emitGenerateApply({ ...scope, itemName: 'HEIGHT' })).to.equal(undefined)
    chai.expect(emitGenerateApply({ ...scope, attribute: 'default' })).to.equal(undefined)
    warn.mockRestore()
  })

  it('misses on an empty ledger and after clearGenerationLedger()', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    chai.expect(emitGenerateApply(scope)).to.equal(undefined)
    recordGeneration({ generationId: 'g1', ...scope })
    clearGenerationLedger()
    chai.expect(emitGenerateApply(scope)).to.equal(undefined)
    chai.expect(mockTrack.mock.calls.length).to.equal(2)
    warn.mockRestore()
  })

  it('never throws when the tracker throws', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    mockTrack.mockImplementation(() => {
      throw new Error('sdk down')
    })
    recordGeneration({ generationId: 'g1', ...scope })
    chai.expect(() => emitGenerateApply(scope)).to.not.throw()
    warn.mockRestore()
  })
})
