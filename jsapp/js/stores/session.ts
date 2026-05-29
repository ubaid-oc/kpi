<<<<<<< /tmp/kpiport/mf/cur
import { action, makeAutoObservable } from 'mobx'
import { fetchPost } from '#/api'
import { endpoints } from '#/api.endpoints'
import type { Json } from '#/components/common/common.interfaces'
import { dataInterface } from '#/dataInterface'
import type { AccountResponse, FailResponse } from '#/dataInterface'
import type { ProjectViewsSettings } from '#/projects/customViewStore'
import { ANON_USERNAME } from '#/users/utils'
import { currentLang, log } from '#/utils'

class SessionStore {
  currentAccount: AccountResponse | { username: string; date_joined: string } = {
    username: ANON_USERNAME,
    date_joined: '',
  }
  isAuthStateKnown = false
  isLoggedIn = false
  isInitialLoadComplete = false
  isPending = false
  isInitialRoute = true
=======
import {action, makeAutoObservable} from 'mobx';
import {ANON_USERNAME, ANON_USER_TYPE, ANON_USER_SUBDOMAIN} from 'js/constants';
import {dataInterface} from 'js/dataInterface';
import type {AccountResponse, FailResponse} from 'js/dataInterface';
import {log, currentLang} from 'js/utils';
import type {Json} from 'js/components/common/common.interfaces';
import type {ProjectViewsSettings} from 'js/projects/customViewStore';
import { actions } from 'js/actions';
import {
  checkCrossStorageTimeOut,
  checkCrossStorageUser,
  updateCrossStorageTimeOut
} from 'js/ocutils';
import cloneDeep from 'lodash.clonedeep';
import userpilot from 'js/userpilot';

class SessionStore {
  currentAccount: AccountResponse | {username: string; user_type: string; subdomain: string} = {
    username: ANON_USERNAME,
    user_type: ANON_USER_TYPE,
    subdomain: ANON_USER_SUBDOMAIN,
  };
  isAuthStateKnown = false;
  isLoggedIn = false;
  isInitialLoadComplete = false;
  isPending = false;
  isInitialRoute = true;
>>>>>>> /tmp/kpiport/mf/fork

  constructor() {
    makeAutoObservable(this)
    this.verifyLogin()
    // TODO make this not awful
    //
    // HACK FIX: avoid double calls to `/me` endpoint.
    // Context: when this store is being initialized, a call to `/me/` endpoint
    // is being made (to get all the user info). When `AccountSettingsRoute` is
    // being initialized (either by any navigation to the route or visiting it
    // via a direct url) it also makes a call. We want to avoid double calls
    // (happens in some cases), so we've introduced that `isInitialRoute` flag.
    setTimeout(() => (this.isInitialRoute = false), 1000)
  }

  private verifyLogin() {
    this.isPending = true
    dataInterface.getProfile().then(
<<<<<<< /tmp/kpiport/mf/cur
      action('verifyLoginSuccess', (account: AccountResponse | { message: string }) => {
        this.isPending = false
        this.isInitialLoadComplete = true
        if ('email' in account) {
          this.currentAccount = account
          this.isLoggedIn = true
          // Save UI language to Back-end for language usage statistics.
          // Logging in causes the whole page to be reloaded, so we don't need
          // to do it more than once.
          this.saveUiLanguage()
=======
      action(
        'verifyLoginSuccess',
        async (account: AccountResponse | {message: string}) => {
          this.isPending = false;
          this.isInitialLoadComplete = true;
          if ('email' in account) {
            this.currentAccount = account;
            const currentUserName = this.currentAccount.username;
            if (currentUserName !== '') {
              const crossStorageUserName = currentUserName.slice(0, currentUserName.lastIndexOf('+'))
              console.log('verifyLogin check');
              try {
                await checkCrossStorageUser(crossStorageUserName);
                await checkCrossStorageTimeOut();
                await updateCrossStorageTimeOut();
              } catch (err) {
                if (err == 'logout' || err == 'user-changed') {
                  if (err == 'logout') {
                    console.log('triggerLoggedIn logout');
                  } else {
                    console.log('triggerLoggedIn user changed');
                  }
                  actions.auth.logout();
                  return;
                }
                // Other errors (e.g., connection/timeout) are caught but don't force logout
              }
            } else {
              // Valid account with empty username - this shouldn't happen
              log('Warning: Valid account has empty username, skipping cross-storage checks');
            }
            this.isLoggedIn = true;
            userpilot.identify(account);
            window.parent.postMessage('fd_loggedin', '*');
            // Save UI language to Back-end for language usage statistics.
            // Logging in causes the whole page to be reloaded, so we don't need
            // to do it more than once.
            this.saveUiLanguage();
          }
          this.isAuthStateKnown = true;
>>>>>>> /tmp/kpiport/mf/fork
        }
        this.isAuthStateKnown = true
      }),
      action('verifyLoginFailure', (xhr: FailResponse) => {
        this.isPending = false
        log('login not verified', xhr.status, xhr.statusText)
      }),
    )
  }

  public refreshAccount() {
    this.isPending = true
    dataInterface.getProfile().then(
      action('refreshSuccess', (account: AccountResponse | { message: string }) => {
        this.isPending = false
        if ('email' in account) {
          this.currentAccount = account
        }
      }),
    )
  }

  /** Updates one of the `extra_details`. */
  public setDetail(detailName: string, value: Json | ProjectViewsSettings) {
    dataInterface.patchProfile({ extra_details: { [detailName]: value } }).then(
      action('setDetailSuccess', (account: AccountResponse) => {
        if ('email' in account) {
          this.currentAccount = account
        }
      }),
    )
  }

  public logOut() {
    dataInterface.logout().then(
      action('logOutSuccess', () => {
        // Reload so a new CSRF token is issued
        window.setTimeout(() => {
          window.location.replace('')
        }, 1)
      }),
      action('logOutFailed', () => {
        console.error('logout failed for some reason. what should happen now?')
      }),
    )
  }

  /**
   * Useful if you need to log out all sessions.
   */
  public async logOutAll() {
    try {
      // Logging out is simply POSTing to this endpoint
      await fetchPost(endpoints.LOGOUT_ALL, {})
      // After that we force reload
      window.location.replace('')
    } catch (err) {
      // `fetchPost` is handling the error
    }
  }

  private saveUiLanguage() {
    // We want to save the language if it differs from the one we saved or if
    // none is saved yet.
    if (
      'extra_details' in this.currentAccount &&
      this.currentAccount.extra_details.last_ui_language !== currentLang()
    ) {
      this.setDetail('last_ui_language', currentLang())
    }
  }
}

export default new SessionStore()
