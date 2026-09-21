{expect} = require('../helper/fauxChai')

window.t ?= (str) -> str

# P1.13 (OC-28782): Relevant and Constraint can be cleared to the mode selector
# — builder removes its last condition, or the hand-code trash button — without
# the instant check ever running, so the verdict dedupe memory must be told
# there, or re-entering the same expression in hand-code mode would never emit
# a verdict (Copilot review, PR #341).
do ->
  describe 'P1.13 verdict memory when a logic panel returns to its mode selector', ->
    mockForgetSyntaxVerdictFor = null
    $skipLogicHelpers = null
    $validationLogicHelpers = null
    row = null

    fakeButton = ->
      render: -> attach_to: ->
      bind_event: ->
    viewFactory = ->
      create_button: fakeButton
      create_empty: fakeButton
      create_textarea: -> {}
      survey: trigger: ->
    helperFactory = ->
      survey: off: ->
      current_question: row

    beforeAll ->
      mockForgetSyntaxVerdictFor = jest.fn()
      jest.resetModules()
      jest.doMock '#/openclinica/syntaxCheckBridge', ->
        runSyntaxCheck: jest.fn()
        forgetSyntaxVerdictFor: mockForgetSyntaxVerdictFor
      $skipLogicHelpers = require('../../jsapp/xlform/src/mv.skipLogicHelpers')
      $validationLogicHelpers = require('../../jsapp/xlform/src/mv.validationLogicHelpers')

    afterAll ->
      jest.resetModules()

    beforeEach ->
      row = {name: 'fake-row'}
      mockForgetSyntaxVerdictFor.mockReset()

    it 'Relevant: forgets on every return to the mode selector', ->
      context = new $skipLogicHelpers.SkipLogicHelperContext({}, viewFactory(), helperFactory(), '')
      expect(mockForgetSyntaxVerdictFor.mock.calls).toEqual([[row, 'relevant']])
      context.use_mode_selector_helper()
      expect(mockForgetSyntaxVerdictFor.mock.calls.length).toBe(2)

    it 'Constraint: forgets when the question type offers the mode selector', ->
      proto = $validationLogicHelpers.ValidationLogicHelperContext.prototype
      original = proto.questionTypeHasResponseType
      proto.questionTypeHasResponseType = -> true
      try
        new $validationLogicHelpers.ValidationLogicHelperContext({}, viewFactory(), helperFactory(), '')
        expect(mockForgetSyntaxVerdictFor.mock.calls).toEqual([[row, 'constraint']])
      finally
        proto.questionTypeHasResponseType = original

    it 'Constraint: leaves the memory alone when the type falls back to hand-code with its criteria kept', ->
      proto = $validationLogicHelpers.ValidationLogicHelperContext.prototype
      original = proto.questionTypeHasResponseType
      proto.questionTypeHasResponseType = -> false
      try
        new $validationLogicHelpers.ValidationLogicHelperContext({}, viewFactory(), helperFactory(), '')
        expect(mockForgetSyntaxVerdictFor.mock.calls.length).toBe(0)
      finally
        proto.questionTypeHasResponseType = original
