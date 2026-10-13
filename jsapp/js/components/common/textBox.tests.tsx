import { render, screen } from '@testing-library/react'
import chai from 'chai'
import React from 'react'
import TextBox from './textBox'

describe('TextBox — OC-28482 error and required states', () => {
  it('links the error text to the field while in error (AC1, AC2, AC3)', () => {
    render(<TextBox label='Name' value='' errors='Name is required' />)
    const input = screen.getByLabelText('Name', { exact: false })
    const alert = screen.getByRole('alert')
    chai.expect(alert.textContent).to.equal('Name is required')
    chai.expect(alert.id).to.not.equal('')
    chai.expect(input.getAttribute('aria-invalid')).to.equal('true')
    chai.expect(input.getAttribute('aria-describedby')).to.equal(alert.id)
  })

  it('keeps the error text out of the field name', () => {
    render(<TextBox label='Name' value='' errors='Name is required' />)
    chai.expect(screen.getByRole('textbox', { name: 'Name' })).to.not.equal(null)
  })

  it('leaves out aria-invalid and aria-describedby once corrected (AC2)', () => {
    const { rerender } = render(<TextBox label='Name' value='' errors='Name is required' />)
    rerender(<TextBox label='Name' value='Ann' errors={false} />)
    const input = screen.getByLabelText('Name', { exact: false })
    chai.expect(input.hasAttribute('aria-invalid')).to.equal(false)
    chai.expect(input.hasAttribute('aria-describedby')).to.equal(false)
    chai.expect(screen.queryByRole('alert')).to.equal(null)
  })

  it('marks a red-only error as invalid without a description', () => {
    render(<TextBox label='Name' value='' errors />)
    const input = screen.getByLabelText('Name', { exact: false })
    chai.expect(input.getAttribute('aria-invalid')).to.equal('true')
    chai.expect(input.hasAttribute('aria-describedby')).to.equal(false)
  })

  it('marks a required field with aria-required (AC4)', () => {
    render(<TextBox label='Name' value='' required />)
    chai.expect(screen.getByLabelText('Name', { exact: false }).getAttribute('aria-required')).to.equal('true')
  })
})
