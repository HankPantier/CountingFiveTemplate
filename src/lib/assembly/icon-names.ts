/**
 * Icon names the block `Icon` component renders (its ICON_MAP keys — parity
 * enforced by src/components/blocks/icon-names.test.ts). Kept free of
 * lucide-react so the markdown parsers can tell an icon prefix ("Calculator:")
 * from an ordinary word ("Bookkeeping:").
 */
export const ICON_NAMES = [
  'Square',
  'Calculator', 'Briefcase', 'ChartLine', 'ChartBar', 'ChartPie', 'TrendingUp', 'TrendingDown',
  'FileText', 'FileCheck', 'FileSpreadsheet', 'FileSearch', 'ClipboardCheck', 'ClipboardList',
  'Coins', 'DollarSign', 'Banknote', 'CreditCard', 'Wallet', 'PiggyBank', 'Receipt',
  'Users', 'User', 'UserCheck', 'UserPlus', 'Building', 'Building2', 'Home', 'MapPin',
  'Phone', 'Mail', 'MessageCircle', 'Globe', 'Compass',
  'Check', 'CheckCircle', 'CheckSquare', 'ShieldCheck', 'Award', 'Star', 'Trophy', 'BadgeCheck',
  'Hammer', 'Wrench', 'Cog', 'Settings',
  'HeartPulse', 'Stethoscope', 'GraduationCap', 'Scale', 'Gavel',
  'Sun', 'Lightbulb', 'Target', 'Flag', 'Zap', 'Sparkles',
  'Calendar', 'Clock', 'AlarmClock',
  'ArrowRight', 'ArrowUpRight', 'ChevronRight',
] as const

const ICON_NAME_SET: ReadonlySet<string> = new Set(ICON_NAMES)

export function isIconName(word: string): boolean {
  return ICON_NAME_SET.has(word)
}
