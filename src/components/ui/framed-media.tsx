import { Image } from './skeleton-image'
import { cn } from '@/lib/utils'

type Ratio = '16/9' | '3/2' | '4/3' | '5/4' | '4/5' | '1/1'

const RATIO_CLASS: Record<Ratio, string> = {
  '16/9': 'aspect-video',
  '3/2': 'aspect-[3/2]',
  '4/3': 'aspect-[4/3]',
  '5/4': 'aspect-[5/4]',
  '4/5': 'aspect-[4/5]',
  '1/1': 'aspect-square',
}

type FramedMediaProps = {
  src: string
  alt: string
  ratio?: Ratio
  /** 'duotone' applies a subtle brand grade (desaturate + a primary→action
   * multiply wash) so mixed stock reads as one art-directed set. */
  grade?: 'none' | 'duotone'
  /** Frame = rounded corners + brand-tinted hairline + depth (the .u-frame
   * utility). Set false for images that sit flush inside another frame. */
  framed?: boolean
  priority?: boolean
  sizes?: string
  className?: string
  /** data-c5-slot hook (layout variants only; see blocks/layout-slot.ts). */
  slot?: string
}

/**
 * The house image treatment for the Ink & Clay floor. Every block routes
 * imagery through here so aspect ratios, framing, and grade stay consistent
 * instead of each block dropping a raw object-cover <img> in a bare box.
 */
export function FramedMedia({
  src,
  alt,
  ratio = '3/2',
  grade = 'none',
  framed = true,
  priority = false,
  sizes = '(max-width: 768px) 100vw, 50vw',
  className,
  slot,
}: FramedMediaProps) {
  return (
    <div
      data-c5-slot={slot}
      className={cn(
        'relative w-full overflow-hidden bg-muted',
        RATIO_CLASS[ratio],
        framed && 'u-frame',
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className={cn(
          'object-cover',
          grade === 'duotone' && '[filter:saturate(0.85)_contrast(1.04)]',
        )}
      />
      {grade === 'duotone' && (
        // Grade strength and fill are tokens, not inline styles, so a site's
        // design-overrides.css (or a Design Studio concept) can raise the
        // grade: --c5-media-grade-opacity (default .24) and
        // --c5-media-grade-fill (default primary → action wash). Utilities
        // are layered, so an unlayered [data-c5="media-grade"] rule wins too.
        <span
          aria-hidden
          data-c5="media-grade"
          className="pointer-events-none absolute inset-0 mix-blend-multiply opacity-[var(--c5-media-grade-opacity,0.24)] [background:var(--c5-media-grade-fill,linear-gradient(150deg,var(--color-primary)_0%,var(--color-action)_130%))]"
        />
      )}
    </div>
  )
}
