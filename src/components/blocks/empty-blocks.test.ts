import { describe, expect, it } from 'vitest'
import { isValidElement } from 'react'
import { FeatureGrid } from './FeatureGrid'
import { ServiceCards } from './ServiceCards'
import { IndustryCards } from './IndustryCards'
import { TeamGrid } from './TeamGrid'
import { ChecklistSection } from './ChecklistSection'
import { ProcessSteps } from './ProcessSteps'
import { Pricing } from './Pricing'
import { ContentCards } from './ContentCards'
import { ContentTable } from './ContentTable'
import { extractProcessStepsProps } from '@/lib/assembly/extract-block-props'

/**
 * A list block whose parser found nothing used to render its heading over an
 * empty grid (Kinexus "What happens after you contact us"). It now renders
 * nothing — unless it has an intro, which still reads as a paragraph.
 */
describe('list blocks with zero parsed items', () => {
  const cases: Array<[string, () => unknown, () => unknown]> = [
    [
      'FeatureGrid',
      () => FeatureGrid({ variant: '3-col', heading: 'H', items: [] }),
      () => FeatureGrid({ variant: '3-col', heading: 'H', intro: 'Some intro.', items: [] }),
    ],
    [
      'ServiceCards',
      () => ServiceCards({ variant: '3-col', heading: 'H', cards: [] }),
      () => ServiceCards({ variant: '3-col', heading: 'H', intro: 'Some intro.', cards: [] }),
    ],
    [
      'IndustryCards',
      () => IndustryCards({ variant: '3-col', heading: 'H', industries: [] }),
      () => IndustryCards({ variant: '3-col', heading: 'H', intro: 'Some intro.', industries: [] }),
    ],
    [
      'TeamGrid',
      () => TeamGrid({ variant: '3-col', heading: 'H', members: [] }),
      () => TeamGrid({ variant: '3-col', heading: 'H', intro: 'Some intro.', members: [] }),
    ],
    [
      'ChecklistSection',
      () => ChecklistSection({ variant: 'standalone', heading: 'H', items: [] }),
      () => ChecklistSection({ variant: 'standalone', heading: 'H', intro: 'Some intro.', items: [] }),
    ],
    [
      'ProcessSteps',
      () => ProcessSteps({ variant: 'vertical', heading: 'H', steps: [] }),
      () => ProcessSteps({ variant: 'vertical', heading: 'H', intro: 'Some intro.', steps: [] }),
    ],
    [
      'Pricing',
      () => Pricing({ variant: '3-tier', heading: 'H', tiers: [] }),
      () => Pricing({ variant: '3-tier', heading: 'H', intro: 'Some intro.', tiers: [] }),
    ],
    [
      'ContentCards',
      () => ContentCards({ variant: '3-col', heading: 'H', cards: [] }),
      () => ContentCards({ variant: '3-col', heading: 'H', intro: 'Some intro.', cards: [] }),
    ],
    [
      'ContentTable',
      () => ContentTable({ heading: 'H', headers: ['A'], rows: [] }),
      () => ContentTable({ heading: 'H', intro: 'Some intro.', headers: ['A'], rows: [] }),
    ],
  ]
  for (const [name, empty, withIntro] of cases) {
    it(`${name} renders nothing when empty, and still renders with an intro`, () => {
      expect(empty()).toBeNull()
      expect(isValidElement(withIntro())).toBe(true)
    })
  }

  it('the Kinexus ### steps now render as steps (not an empty heading)', () => {
    const props = extractProcessStepsProps({
      blockId: 'process-steps',
      variant: 'horizontal',
      heading: 'What happens after you contact us',
      position: 0,
      content: [
        '### We pull and review your IRS file',
        'Before we respond to anything, we request a full transcript.',
        '',
        '### We build a strategy session around your numbers',
        'You meet with an enrolled agent or CPA.',
      ].join('\n'),
    })
    expect(props.steps).toHaveLength(2)
    expect(isValidElement(ProcessSteps(props))).toBe(true)
  })
})
