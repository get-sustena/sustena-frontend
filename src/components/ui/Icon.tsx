import {
  ArrowLeftRight,
  Bell,
  Bookmark,
  CalendarDays,
  ChartNoAxesColumn,
  Check,
  ChefHat,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CookingPot,
  CreditCard,
  Ellipsis,
  Eye,
  EyeOff,
  HeartPulse,
  House,
  Image as ImageIcon,
  Leaf,
  Lightbulb,
  List,
  Lock,
  Mail,
  MapPin,
  Minus,
  Pencil,
  Plus,
  Refrigerator,
  Search,
  Share2,
  ShoppingBasket,
  Shuffle,
  SlidersHorizontal,
  Star,
  Timer,
  Trash2,
  TriangleAlert,
  UserRound,
  UsersRound,
  Utensils,
  Wallet,
  WifiOff,
  X,
  type LucideIcon,
} from "lucide-react-native";
import { theme } from "../../theme/theme";

export type IconName =
  | "discover"
  | "plan"
  | "cook"
  | "shop"
  | "profile"
  | "mail"
  | "lock"
  | "budget"
  | "budgetWallet"
  | "ncd"
  | "bookmark"
  | "offline"
  | "timer"
  | "servings"
  | "market"
  | "notification"
  | "settings"
  | "help"
  | "filter"
  | "swap"
  | "shuffle"
  | "check"
  | "plus"
  | "minus"
  | "chevronDown"
  | "chevronRight"
  | "chevronLeft"
  | "close"
  | "spoon"
  | "chart"
  | "trash"
  | "home"
  | "moreH"
  | "pencil"
  | "share"
  | "star"
  | "chefHat"
  | "list"
  | "vegetarian"
  | "pantry"
  | "undecided"
  | "eye"
  | "eyeOff"
  | "image"
  | "alertTriangle"
  | "bulb";

const ICONS: Record<IconName, LucideIcon> = {
  discover: Search,
  plan: CalendarDays,
  cook: CookingPot,
  shop: ShoppingBasket,
  profile: UserRound,
  mail: Mail,
  lock: Lock,
  budget: CreditCard,
  budgetWallet: Wallet,
  ncd: HeartPulse,
  bookmark: Bookmark,
  offline: WifiOff,
  timer: Timer,
  servings: UsersRound,
  market: MapPin,
  notification: Bell,
  settings: SlidersHorizontal,
  help: CircleHelp,
  filter: SlidersHorizontal,
  swap: ArrowLeftRight,
  shuffle: Shuffle,
  check: Check,
  plus: Plus,
  minus: Minus,
  chevronDown: ChevronDown,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  close: X,
  spoon: Utensils,
  chart: ChartNoAxesColumn,
  trash: Trash2,
  home: House,
  moreH: Ellipsis,
  pencil: Pencil,
  share: Share2,
  star: Star,
  chefHat: ChefHat,
  list: List,
  vegetarian: Leaf,
  pantry: Refrigerator,
  undecided: CircleHelp,
  eye: Eye,
  eyeOff: EyeOff,
  image: ImageIcon,
  alertTriangle: TriangleAlert,
  bulb: Lightbulb,
};

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  filled?: boolean;
};

export function Icon({
  name,
  size = 24,
  color = theme.colors.text,
  strokeWidth = 1.75,
  filled = false,
}: IconProps) {
  const LucideGlyph = ICONS[name];

  return (
    <LucideGlyph
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      fill={filled ? color : "none"}
    />
  );
}
