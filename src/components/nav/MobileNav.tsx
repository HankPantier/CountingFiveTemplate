'use client'

import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { isUrlActive } from '@/lib/nav/nav-tree'
import type { NavJson, NavItem } from '@/lib/nav/types'
import { useState } from 'react'

export function MobileNav({ nav }: { nav: NavJson }) {
  const pathname = usePathname() ?? '/'
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu" className="md:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72 sm:w-80">
        <SheetTitle className="sr-only">Site menu</SheetTitle>
        <nav className="mt-8 flex flex-col gap-1">
          <Accordion type="multiple">
            {nav.primary.map((item: NavItem) => {
              const itemActive = isUrlActive(pathname, item.url)
              return item.children?.length ? (
                <AccordionItem key={item.url} value={item.url} className="border-none">
                  <AccordionTrigger
                    className={cn(
                      'px-4 py-3 hover:no-underline text-base font-medium',
                      itemActive && 'text-primary'
                    )}
                  >
                    {item.label}
                  </AccordionTrigger>
                  <AccordionContent className="pl-8">
                    <Link
                      href={item.url}
                      aria-current={pathname === item.url ? 'page' : undefined}
                      className={cn(
                        'block py-2 text-sm text-muted-foreground hover:text-foreground',
                        pathname === item.url && 'text-primary font-semibold'
                      )}
                      onClick={() => setOpen(false)}
                    >
                      Overview
                    </Link>
                    {item.children.map((child) => {
                      const childActive = pathname === child.url
                      return (
                        <Link
                          key={child.url}
                          href={child.url}
                          aria-current={childActive ? 'page' : undefined}
                          className={cn(
                            'block py-2 text-sm text-muted-foreground hover:text-foreground',
                            childActive && 'text-primary font-semibold'
                          )}
                          onClick={() => setOpen(false)}
                        >
                          {child.label}
                        </Link>
                      )
                    })}
                  </AccordionContent>
                </AccordionItem>
              ) : (
                <Link
                  key={item.url}
                  href={item.url}
                  aria-current={itemActive ? 'page' : undefined}
                  className={cn(
                    'block px-4 py-3 text-base font-medium hover:bg-accent hover:text-accent-foreground rounded-md',
                    itemActive && 'text-primary'
                  )}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              )
            })}
          </Accordion>
        </nav>
        {nav.cta && (
          <div className="absolute bottom-6 left-6 right-6">
            <Button asChild className="w-full">
              <Link href={nav.cta.url} onClick={() => setOpen(false)}>
                {nav.cta.label}
              </Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
