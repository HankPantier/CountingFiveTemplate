import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type SectionProps = {
  children: ReactNode
  fullBleed?: boolean
  bg?: 'none' | 'surface' | 'primary' | 'action' | 'card'
  /** Vertical rhythm. Establishes the light→ink→light cadence instead of every
   * section sharing one padding. Defaults to 'normal'. */
  spacing?: 'compact' | 'normal' | 'spacious' | 'none'
  className?: string
  as?: 'section' | 'header' | 'footer' | 'div'
  dataBlock?: string
}

const BG_CLASSES: Record<NonNullable<SectionProps['bg']>, string> = {
  none: '',
  surface: 'bg-background',
  primary: 'bg-primary text-primary-foreground',
  action: 'bg-[color:var(--color-action,theme(colors.cyan.500))] text-white',
  card: 'bg-card text-card-foreground',
}

const SPACING_CLASSES: Record<NonNullable<SectionProps['spacing']>, string> = {
  none: '',
  compact: 'py-10 md:py-14',
  normal: 'py-14 md:py-20',
  spacious: 'py-20 md:py-32',
}

export function Section({
  children,
  fullBleed = false,
  bg = 'none',
  spacing = 'normal',
  className,
  as: Tag = 'section',
  dataBlock,
}: SectionProps) {
  const bgClass = BG_CLASSES[bg]
  const padClass = SPACING_CLASSES[spacing]

  if (fullBleed) {
    return (
      <Tag data-block={dataBlock} className={cn(bgClass, className)}>
        <div className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8', padClass)}>
          {children}
        </div>
      </Tag>
    )
  }

  return (
    <Tag
      data-block={dataBlock}
      className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8', padClass, bgClass, className)}
    >
      {children}
    </Tag>
  )
}
