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
} from 'phosphor-react';

type IconComponent = React.FC<IconProps>;

const withDefaults = (Component: IconComponent) => {
  const Wrapped: IconComponent = ({ size, weight, className, ...rest }) => (
    <Component
      size={size ?? 22}
      weight={weight ?? 'duotone'}
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
};

export type { IconProps } from 'phosphor-react';
