import chai from 'chai'

const mockTrack = jest.fn()
jest.mock('#/userpilot', () => ({
  __esModule: true,
  default: { track: (...args: unknown[]) => mockTrack(...args) },
}))

import { type GenerateRequestEvent, LOGIC_BUILDER_EVENTS, latencyBucket, newGenerationId } from './logicBuilderAnalytics'

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
