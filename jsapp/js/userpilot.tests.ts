import chai from 'chai'

const mockTrack = jest.fn()
const mockInitialize = jest.fn()
jest.mock('userpilot', () => ({
  __esModule: true,
  Userpilot: {
    initialize: (...args: unknown[]) => mockInitialize(...args),
    identify: jest.fn(),
    reload: jest.fn(),
    track: (...args: unknown[]) => mockTrack(...args),
  },
}))

type Meta = Record<string, string | number | boolean | null>
interface Service {
  track: (event: string, meta: Meta) => void
}

/**
 * The module builds its singleton at import time from the SDK-token meta tag,
 * so each case gets a fresh module instance against a chosen <head>.
 */
function loadService(token: string | null): Service {
  document.head.innerHTML = token === null ? '' : `<meta name="user_pilot_sdk_token" content="${token}">`
  let service: Service | undefined
  jest.isolateModules(() => {
    service = jest.requireActual('./userpilot').default
  })
  return service as Service
}

describe('userpilot.track (P1.12 AC4 — fire-and-forget, never throws)', () => {
  beforeEach(() => {
    mockTrack.mockReset()
    mockInitialize.mockReset()
  })

  it('forwards the event name and metadata when an SDK token is present', () => {
    loadService('NX-not-a-real-token').track('logic_builder.test', { a: 1, b: 'x', c: true, d: null })
    chai.expect(mockInitialize.mock.calls).to.deep.equal([['NX-not-a-real-token']])
    chai.expect(mockTrack.mock.calls).to.deep.equal([['logic_builder.test', { a: 1, b: 'x', c: true, d: null }]])
  })

  it('is a no-op without an SDK token', () => {
    loadService(null).track('logic_builder.test', { a: 1 })
    chai.expect(mockInitialize.mock.calls.length).to.equal(0)
    chai.expect(mockTrack.mock.calls.length).to.equal(0)
  })

  it('swallows an SDK throw and warns instead', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    mockTrack.mockImplementation(() => {
      throw new Error('sdk down')
    })
    chai.expect(() => loadService('NX-not-a-real-token').track('logic_builder.test', {})).to.not.throw()
    chai.expect(warn.mock.calls.length).to.equal(1)
    warn.mockRestore()
  })
})
