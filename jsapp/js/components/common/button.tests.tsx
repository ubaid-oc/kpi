import { render, screen } from '@testing-library/react'
import chai from 'chai'
import React from 'react'
import Button from './button'

describe('Button — OC-28460 accessible names', () => {
  it('names an icon-only button from its tooltip, on load (OC-28460 AC1, AC3)', () => {
    render(<Button type='text' size='m' startIcon='trash' tooltip='Delete' />)
    chai.expect(screen.getByRole('button', { name: 'Delete' })).to.not.equal(null)
  })

  it('lets aria-label override the tooltip text (OC-28460 AC2)', () => {
    render(
      <Button
        type='text'
        size='m'
        startIcon='trash'
        tooltip='Delete questions disabled. Please select at least one question.'
        aria-label='Delete selected questions'
      />,
    )
    chai.expect(screen.getByRole('button', { name: 'Delete selected questions' })).to.not.equal(null)
  })

  it('keeps the visible label as the name, not doubled with the tooltip (no doubled name)', () => {
    render(<Button type='text' size='m' startIcon='trash' label='Delete' tooltip='Delete' />)
    chai.expect(screen.getByRole('button', { name: 'Delete' })).to.not.equal(null)
  })
})
