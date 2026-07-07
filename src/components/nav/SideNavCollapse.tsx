'use client'

import type { ReactNode } from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

/**
 * Mobile wrapper for the section side-nav: collapses the tree behind an
 * "In this section" toggle. Desktop renders the tree statically (see SideNav).
 */
export function SideNavCollapse({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <Accordion type="single" collapsible className="rounded-md border border-border">
      <AccordionItem value="section" className="border-none">
        <AccordionTrigger className="px-3 py-2 text-sm font-heading font-semibold">
          {label}
        </AccordionTrigger>
        <AccordionContent className="px-3 pb-3">{children}</AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
