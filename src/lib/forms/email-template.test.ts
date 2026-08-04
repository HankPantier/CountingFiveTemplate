import { describe, expect, it } from 'vitest'
import { buildEmailBody } from './email-template'

describe('buildEmailBody', () => {
  it('renders fields then a labelled context section when context is present', () => {
    const body = buildEmailBody(
      { name: 'Jane', email: 'jane@example.com', message: 'Hi there' },
      undefined,
      {
        title: 'Your estimate',
        lines: [
          { label: 'Services', value: 'Bookkeeping, Tax' },
          { label: 'Estimated cost', value: '~$526–$712/mo' },
        ],
      }
    )
    expect(body).toContain('Name: Jane')
    expect(body).toContain('Your estimate:')
    expect(body).toContain('  Services: Bookkeeping, Tax')
    expect(body).toContain('  Estimated cost: ~$526–$712/mo')
    // context sits before the footer
    expect(body.indexOf('Your estimate:')).toBeLessThan(body.indexOf('Submitted via website contact form.'))
  })

  it('omits the context section entirely when no context is given', () => {
    const body = buildEmailBody({ name: 'Jane' })
    expect(body).not.toContain('Your estimate')
    expect(body).toContain('Name: Jane')
  })
})
