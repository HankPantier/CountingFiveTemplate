'use client'

import { ArrowUpRight } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ClientCenterJson } from '@/lib/client-center/types'

export function ClientCenterModal({
  open,
  onOpenChange,
  config,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: ClientCenterJson
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-block="client-center"
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto bg-card"
      >
        <DialogHeader>
          <DialogTitle className="font-heading">{config.label}</DialogTitle>
          <DialogDescription>
            Quick access to the portals and tools you use with us.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-6">
          {config.groups.map((group) => (
            <section key={group.title} data-block="client-center-group">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.title}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.links.map((link) => (
                  <a
                    key={`${group.title}-${link.url}`}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-no-drawer
                    data-block="client-center-tile"
                    className="group flex flex-col rounded-xl border border-border bg-background p-4 shadow-[var(--shadow-card)] transition-colors hover:border-primary hover:shadow-[var(--shadow-card-hover)]"
                  >
                    <span className="flex items-center justify-between gap-2 font-medium text-foreground">
                      {link.label}
                      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
                    </span>
                    {link.description && (
                      <span className="mt-1 text-sm text-muted-foreground">{link.description}</span>
                    )}
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
