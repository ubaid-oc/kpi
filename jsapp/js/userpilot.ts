import type { AccountResponse } from 'js/dataInterface'
/**
 * UserPilot integration utility
 * Handles initialization and user identification for UserPilot SDK (npm package)
 */
import { Userpilot } from 'userpilot'

/** Flat metadata UserPilot accepts on a tracked event: primitives only, no arrays or nested objects. */
export type AnalyticsValue = string | number | boolean | null

class UserPilotService {
  private readonly userPilotSdkToken: string | null = null

  constructor() {
    const tokenEl = document.head.querySelector('meta[name=user_pilot_sdk_token]')
    if (tokenEl && tokenEl instanceof HTMLMetaElement) {
      this.userPilotSdkToken = tokenEl.content
      this.initialize()
    }
  }

  /**
   * Initialize UserPilot with the token
   */
  private initialize(): void {
    if (!this.userPilotSdkToken) {
      console.warn('[Userpilot] No SDK token found, Userpilot not initialized')
      return
    }
    try {
      Userpilot.initialize(this.userPilotSdkToken)
    } catch (error) {
      console.error('[Userpilot] Error during initialization:', error)
    }
  }

  /**
   * Identify user to UserPilot
   * Should be called after user login
   */
  identify(accountResp: AccountResponse): void {
    if (!this.userPilotSdkToken) {
      return
    }
    const userUuid = accountResp.user_uuid
    if (!userUuid) {
      console.warn('[Userpilot] User UUID is not present. Skipping Identification')
      return
    }
    const userProperties = {
      company: {
        id: accountResp.subdomain,
        name: accountResp.customer_name,
      },
    }
    try {
      Userpilot.identify(userUuid, userProperties)
    } catch (error) {
      console.warn('UserPilot identification failed:', error)
    }
  }

  /**
   * Reload UserPilot content
   */
  reload(url: string): void {
    if (!this.userPilotSdkToken) {
      return
    }
    try {
      Userpilot.reload(url)
    } catch (error) {
      console.warn('UserPilot reload failed:', error)
    }
  }

  /**
   * Emit a custom tracked event (OC product analytics). Fire-and-forget: a
   * no-op without a token, never throws, never awaited — emission must never
   * block or fail the caller (PRD P1.12 AC4). The SDK queues and delivers.
   */
  track(event: string, meta: Record<string, AnalyticsValue>): void {
    if (!this.userPilotSdkToken) {
      return
    }
    try {
      Userpilot.track(event, meta)
    } catch (error) {
      console.warn('[Userpilot] track failed:', error)
    }
  }
}

// Export singleton instance
export default new UserPilotService()
