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

