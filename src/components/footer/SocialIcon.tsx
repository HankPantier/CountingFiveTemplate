/**
 * SocialIcon — renders a platform-specific brand icon.
 *
 * Uses @icons-pack/react-simple-icons for the brand marks. LinkedIn is the
 * exception: Simple Icons removed it at LinkedIn's request, so it stays as
 * an inline SVG here. Simple Icons carries no Apple Maps mark either, so that
 * one is a hand-authored monochrome tile below. Swap either block out if you
 * ever switch to a library that ships those marks.
 */
import { Globe, Map } from 'lucide-react'
import {
  SiFacebook,
  SiX,
  SiInstagram,
  SiYoutube,
  SiGooglemaps,
} from '@icons-pack/react-simple-icons'
import type { SocialLink } from '@/lib/brand/types'

type SvgIconProps = { className?: string }

function LinkedinIcon({ className }: SvgIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.95v5.66H9.34V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.59 0 4.26 2.36 4.26 5.43v6.31zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zm1.78 13.02H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" />
    </svg>
  )
}

// Simple Icons carries no Apple Maps mark, and a bespoke tile reads as a
// crossed-out box at 20px. lucide's folded-map glyph reads cleanly as "map"
// and pairs distinctly with Google's teardrop pin below.
const ICON_MAP: Record<SocialLink['platform'], React.ComponentType<SvgIconProps>> = {
  linkedin: LinkedinIcon,
  facebook: ({ className }) => <SiFacebook className={className} aria-hidden="true" />,
  twitter: ({ className }) => <SiX className={className} aria-hidden="true" />,
  instagram: ({ className }) => <SiInstagram className={className} aria-hidden="true" />,
  youtube: ({ className }) => <SiYoutube className={className} aria-hidden="true" />,
  appleMaps: ({ className }) => <Map className={className} strokeWidth={1.75} aria-hidden="true" />,
  googleMaps: ({ className }) => <SiGooglemaps className={className} aria-hidden="true" />,
  other: ({ className }) => <Globe className={className} strokeWidth={1.75} aria-hidden="true" />,
}

const PLATFORM_LABELS: Record<SocialLink['platform'], string> = {
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
  twitter: 'X',
  instagram: 'Instagram',
  youtube: 'YouTube',
  appleMaps: 'Apple Maps',
  googleMaps: 'Google Maps',
  other: 'Website',
}

// Upgrade legacy `other` entries whose URL is actually a maps link, so live
// brand.json files render the right icon without a data edit. Returns `other`
// for anything that isn't a maps URL — never a false upgrade.
function sniffFromUrl(url: string): SocialLink['platform'] {
  const u = url.toLowerCase()
  if (u.includes('maps.apple') || (u.includes('apple.com') && u.includes('/maps'))) return 'appleMaps'
  if (
    u.includes('maps.google') ||
    u.includes('maps.app.goo.gl') ||
    u.includes('goo.gl/maps') ||
    (u.includes('google.') && u.includes('/maps'))
  ) return 'googleMaps'
  return 'other'
}

function resolvePlatform(platform: SocialLink['platform'], url?: string): SocialLink['platform'] {
  return platform === 'other' && url ? sniffFromUrl(url) : platform
}

export function platformLabel(platform: SocialLink['platform'], url?: string): string {
  const resolved = resolvePlatform(platform, url)
  return PLATFORM_LABELS[resolved] ?? PLATFORM_LABELS.other
}

export function SocialIcon({
  platform,
  url,
  className,
}: {
  platform: SocialLink['platform']
  url?: string
  className?: string
}) {
  const resolved = resolvePlatform(platform, url)
  const Component = ICON_MAP[resolved] ?? ICON_MAP.other
  return <Component className={className} />
}
