import {
  Square,
  Calculator, Briefcase, ChartLine, ChartBar, ChartPie, TrendingUp, TrendingDown,
  FileText, FileCheck, FileSpreadsheet, FileSearch, ClipboardCheck, ClipboardList,
  Coins, DollarSign, Banknote, CreditCard, Wallet, PiggyBank, Receipt,
  Users, User, UserCheck, UserPlus, Building, Building2, Home, MapPin,
  Phone, Mail, MessageCircle, Globe, Compass,
  Check, CheckCircle, CheckSquare, ShieldCheck, Award, Star, Trophy, BadgeCheck,
  Hammer, Wrench, Cog, Settings,
  HeartPulse, Stethoscope, GraduationCap, Scale, Gavel,
  Sun, Lightbulb, Target, Flag, Zap, Sparkles,
  Calendar, Clock, AlarmClock,
  ArrowRight, ArrowUpRight, ChevronRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const ICON_MAP: Record<string, LucideIcon> = {
  // Default fallback
  Square,
  // Finance / accounting
  Calculator, Briefcase, ChartLine, ChartBar, ChartPie, TrendingUp, TrendingDown,
  FileText, FileCheck, FileSpreadsheet, FileSearch, ClipboardCheck, ClipboardList,
  Coins, DollarSign, Banknote, CreditCard, Wallet, PiggyBank, Receipt,
  // People + places
  Users, User, UserCheck, UserPlus, Building, Building2, Home, MapPin,
  Phone, Mail, MessageCircle, Globe, Compass,
  // Trust + credentials
  Check, CheckCircle, CheckSquare, ShieldCheck, Award, Star, Trophy, BadgeCheck,
  // Work / construction
  Hammer, Wrench, Cog, Settings,
  // Verticals
  HeartPulse, Stethoscope, GraduationCap, Scale, Gavel,
  // Process / motion
  Sun, Lightbulb, Target, Flag, Zap, Sparkles,
  // Time
  Calendar, Clock, AlarmClock,
  // Misc UI
  ArrowRight, ArrowUpRight, ChevronRight,
}

type IconProps = {
  name: string
  className?: string
  strokeWidth?: number
}

export function Icon({ name, className, strokeWidth = 1.75 }: IconProps) {
  const Component = ICON_MAP[name] ?? Square
  return <Component className={className} strokeWidth={strokeWidth} aria-hidden="true" />
}
