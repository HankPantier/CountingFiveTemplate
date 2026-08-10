'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { ClientCenterModal } from './ClientCenterModal'
import type { ClientCenterJson } from '@/lib/client-center/types'

type ClientCenterContextValue = {
  enabled: boolean
  label: string
  open: boolean
  openModal: () => void
  closeModal: () => void
}

const ClientCenterContext = createContext<ClientCenterContextValue | null>(null)

export function useClientCenter(): ClientCenterContextValue {
  const ctx = useContext(ClientCenterContext)
  if (!ctx) throw new Error('useClientCenter must be used within <ClientCenterProvider>')
  return ctx
}

export function ClientCenterProvider({
  config,
  children,
}: {
  config: ClientCenterJson
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const openModal = useCallback(() => setOpen(true), [])
  const closeModal = useCallback(() => setOpen(false), [])

  const value = useMemo(
    () => ({ enabled: config.enabled, label: config.label, open, openModal, closeModal }),
    [config.enabled, config.label, open, openModal, closeModal]
  )

  return (
    <ClientCenterContext.Provider value={value}>
      {children}
      {config.enabled && (
        <ClientCenterModal open={open} onOpenChange={setOpen} config={config} />
      )}
    </ClientCenterContext.Provider>
  )
}
