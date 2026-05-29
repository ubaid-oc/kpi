{expect} = require('../helper/fauxChai')

$inputParser = require("../../jsapp/xlform/src/model.inputParser")
$survey = require("../../jsapp/xlform/src/model.survey")

describe("translations", ->
  process = (src) ->
    parsed = $inputParser.parse(src)
    new $survey.Survey(parsed)

  it('should not allow editing form with unnamed translation', ->
    run = ->
      survey = process(
        survey: [
          type: "text"
          label: ["Ciasto?", "Pizza?"],
          name: "Pizza survey",
        ]
        translations: ["polski (pl)", null]
      )
    expect(run).toThrow("""
      This form includes columns with languages defined but there are also one or more columns that don\'t include a language name.
      If translations are used in your form, every user-facing text and media content column must include a language name as part of its column title.
      Please revise your form definition spreadsheet, upload it, and open it in Form Designer again.
    """)
  )
)
