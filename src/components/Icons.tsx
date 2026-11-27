import React from 'react';
import {
  IconProps,
  Broadcast,
  BellSimple,
  CheckCircle,
  ClockClockwise,
  Compass,
  Confetti,
  CopySimple,
  CrosshairSimple,
  EnvelopeSimple,
  LightbulbFilament,
  MagicWand,
  MagnifyingGlass,
  MapPin,
  MapTrifold,
  ShareNetwork,
  Sparkle,
  DiamondsFour,
  Trash,
  Trophy,
  UsersThree,
  UserCircle,
  XCircle,
  Phone,
  CaretDown,
  CaretRight,
  ArrowSquareOut,
  Gift,
  Coins,
  QrCode,
  Crown,
  SlidersHorizontal,
  SidebarSimple,
  Lightning,
  FlagCheckered,
  WarningCircle,
  NavigationArrow,
  ArrowsOutSimple,
  ArrowsInSimple,
  ArrowLeft,
  ShieldCheck,
  ChartBar,
  FunnelSimple,
  Eye,
  LockKey,
  Activity,
  ArrowsClockwise,
  GlobeHemisphereWest,
} from 'phosphor-react';

type IconComponent = React.FC<IconProps>;

const withDefaults = (Component: IconComponent) => {
  const Wrapped: IconComponent = ({ size, weight, className, ...rest }) => (
    <Component
      size={size ?? 20}
      weight={weight ?? 'bold'}
      className={className}
      {...rest}
    />
  );

  Wrapped.displayName = Component.displayName ?? Component.name ?? 'Icon';
  return Wrapped;
};

export const Icons = {
  Adventure: withDefaults(Compass),
  Map: withDefaults(MapTrifold),
  Proximity: withDefaults(Broadcast),
  Treasure: withDefaults(DiamondsFour),
  Sparkle: withDefaults(Sparkle),
  User: withDefaults(UserCircle),
  Users: withDefaults(UsersThree),
  Bell: withDefaults(BellSimple),
  Copy: withDefaults(CopySimple),
  Check: withDefaults(CheckCircle),
  Search: withDefaults(MagnifyingGlass),
  Trash: withDefaults(Trash),
  Close: withDefaults(XCircle),
  Pin: withDefaults(MapPin),
  Target: withDefaults(CrosshairSimple),
  Share: withDefaults(ShareNetwork),
  Lightbulb: withDefaults(LightbulbFilament),
  Magic: withDefaults(MagicWand),
  Celebration: withDefaults(Confetti),
  Trophy: withDefaults(Trophy),
  Refresh: withDefaults(ClockClockwise),
  Phone: withDefaults(Phone),
  Email: withDefaults(EnvelopeSimple),
  Caret: withDefaults(CaretDown),
  CaretRight: withDefaults(CaretRight),
  External: withDefaults(ArrowSquareOut),
  Gift: withDefaults(Gift),
  Coin: withDefaults(Coins),
  Qr: withDefaults(QrCode),
  Crown: withDefaults(Crown),
  Sliders: withDefaults(SlidersHorizontal),
  Sidebar: withDefaults(SidebarSimple),
  Lightning: withDefaults(Lightning),
  Flag: withDefaults(FlagCheckered),
  Warning: withDefaults(WarningCircle),
  Locate: withDefaults(NavigationArrow),
  Expand: withDefaults(ArrowsOutSimple),
  Collapse: withDefaults(ArrowsInSimple),
  Back: withDefaults(ArrowLeft),
  Shield: withDefaults(ShieldCheck),
  Chart: withDefaults(ChartBar),
  Filter: withDefaults(FunnelSimple),
  Eye: withDefaults(Eye),
  Lock: withDefaults(LockKey),
  Activity: withDefaults(Activity),
  Sync: withDefaults(ArrowsClockwise),
  Satellite: withDefaults(GlobeHemisphereWest),
};

export type { IconProps } from 'phosphor-react';
