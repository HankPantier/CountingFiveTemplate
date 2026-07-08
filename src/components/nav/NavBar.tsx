'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu'
import { MobileNav } from './MobileNav'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { resolveImageSrc } from '@/lib/assembly/resolve-image'
import { isUrlActive } from '@/lib/nav/nav-tree'
import type { BrandJson } from '@/lib/brand/types'
import type { NavJson } from '@/lib/nav/types'

export function NavBar({ brand, nav }: { brand: BrandJson; nav: NavJson }) {
  const pathname = usePathname() ?? '/'
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    let frame = 0
    let pending = false
    const update = () => {
      pending = false
      // setState bails out if the value is unchanged, but the rAF guard
      // is what keeps us from triggering React work on every scroll tick.
      setScrolled(window.scrollY > 12)
    }
    const onScroll = () => {
      if (pending) return
      pending = true
      frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <header
      data-component="navbar"
      className={cn(
        'sticky top-0 z-40 w-full transition-colors',
        scrolled ? 'bg-background/95 backdrop-blur border-b border-border' : 'bg-background'
      )}
    >
      <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2" aria-label={`${brand.firm.name} home`}>
          {brand.logo.primary ? (
            <Image
              src={resolveImageSrc(brand.logo.primary)!}
              alt={brand.logo.alt}
              width={160}
              height={32}
              priority
              className="h-8 w-auto"
            />
          ) : (
            <span className="font-semibold text-lg">{brand.firm.name}</span>
          )}
        </Link>

        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            {nav.primary.map(item => {
              const itemActive = isUrlActive(pathname, item.url)
              return item.children?.length ? (
                <NavigationMenuItem key={item.url}>
                  <NavigationMenuTrigger
                    data-active={itemActive || undefined}
                    className="data-[active]:text-primary data-[active]:underline data-[active]:underline-offset-8 data-[active]:decoration-2"
                  >
                    {item.label}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid gap-1 p-2">
                      <li>
                        <NavigationMenuLink asChild>
                          <Link
                            href={item.url}
                            aria-current={pathname === item.url ? 'page' : undefined}
                            className={cn(
                              'block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
                              pathname === item.url && 'bg-accent text-accent-foreground font-semibold'
                            )}
                          >
                            Overview
                          </Link>
                        </NavigationMenuLink>
                      </li>
                      {item.children.map(child => {
                        const childActive = pathname === child.url
                        return (
                          <li key={child.url}>
                            <NavigationMenuLink asChild>
                              <Link
                                href={child.url}
                                aria-current={childActive ? 'page' : undefined}
                                className={cn(
                                  'block rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground',
                                  childActive && 'bg-accent text-accent-foreground font-semibold'
                                )}
                              >
                                {child.label}
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        )
                      })}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              ) : (
                <NavigationMenuItem key={item.url}>
                  <NavigationMenuLink asChild>
                    <Link
                      href={item.url}
                      aria-current={itemActive ? 'page' : undefined}
                      className={cn(
                        'inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium hover:bg-accent hover:text-accent-foreground',
                        itemActive && 'text-primary underline underline-offset-8 decoration-2'
                      )}
                    >
                      {item.label}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              )
            })}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex items-center gap-2">
          {nav.cta && (
            <Button asChild className="hidden md:inline-flex">
              <Link href={nav.cta.url}>{nav.cta.label}</Link>
            </Button>
          )}
          <ThemeToggle />
          <MobileNav nav={nav} />
        </div>
      </div>
    </header>
  )
}
