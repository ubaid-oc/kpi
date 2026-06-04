{expect} = require('../helper/fauxChai')

econsentSignature = require('../../jsapp/js/components/formBuilder/econsentSignature')

do ->
  describe 'econsentSignature helpers', ->
    describe 'isEConsentEnabledStatus', ->
      it 'returns true for ACTIVE', ->
        expect(econsentSignature.isEConsentEnabledStatus('ACTIVE')).toBe(true)

      it 'returns true for PENDING', ->
        expect(econsentSignature.isEConsentEnabledStatus('PENDING')).toBe(true)

      it 'returns false for other statuses', ->
        expect(econsentSignature.isEConsentEnabledStatus('INACTIVE')).toBe(false)
        expect(econsentSignature.isEConsentEnabledStatus(null)).toBe(false)

    describe 'appendEConsentQueryToPath', ->
      it 'appends econsent when status is enabled', ->
        expect(
          econsentSignature.appendEConsentQueryToPath('/library/asset/new', 'ACTIVE')
        ).toBe('/library/asset/new?econsent=ACTIVE')

      it 'removes stale econsent when status is not enabled', ->
        expect(
          econsentSignature.appendEConsentQueryToPath(
            '/library/asset/new?econsent=ACTIVE',
            null
          )
        ).toBe('/library/asset/new')

      it 'preserves hash fragments', ->
        expect(
          econsentSignature.appendEConsentQueryToPath(
            '/library/asset/new#section',
            'PENDING'
          )
        ).toBe('/library/asset/new?econsent=PENDING#section')

      it 'strips econsent without losing fragment or other query params', ->
        expect(
          econsentSignature.appendEConsentQueryToPath(
            '/library/asset/new?econsent=ACTIVE&foo=bar#section',
            'INACTIVE'
          )
        ).toBe('/library/asset/new?foo=bar#section')

    describe 'getEConsentStatusFromRouter', ->
      it 'reads econsent from router searchParams', ->
        router =
          searchParams: new URLSearchParams('econsent=PENDING')
          navigate: ->
        expect(econsentSignature.getEConsentStatusFromRouter(router)).toBe('PENDING')

