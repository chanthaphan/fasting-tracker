import type { LucideIcon } from 'lucide-react';
import {
  Timer, Hourglass, Moon, Flame, Award, Medal, Crown, Weight, CalendarCheck,
  Target, Trophy, CheckCircle2, Star, Dumbbell,
} from 'lucide-react';

export type AchievementTier = 'bronze' | 'silver' | 'gold';

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  tier: AchievementTier;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first-fast', title: 'First Fast', description: 'Complete your first fast', icon: Timer, tier: 'bronze' },
  { id: 'fast-16h', title: 'Sweet 16', description: 'Complete a fast of 16 hours or more', icon: Hourglass, tier: 'silver' },
  { id: 'fast-24h', title: 'Full Day', description: 'Complete a 24-hour fast', icon: Moon, tier: 'gold' },
  { id: 'fast-streak-3', title: 'Warming Up', description: 'Fast 3 days in a row', icon: Flame, tier: 'bronze' },
  { id: 'fast-streak-7', title: 'One Week Strong', description: 'Fast 7 days in a row', icon: Award, tier: 'silver' },
  { id: 'fast-streak-14', title: 'Fortnight Fighter', description: 'Fast 14 days in a row', icon: Medal, tier: 'silver' },
  { id: 'fast-streak-30', title: 'Iron Will', description: 'Fast 30 days in a row', icon: Crown, tier: 'gold' },
  { id: 'first-weight', title: 'On the Scale', description: 'Log your first weight', icon: Weight, tier: 'bronze' },
  { id: 'weight-7-days', title: 'Weigh-in Regular', description: 'Log weight on 7 different days', icon: CalendarCheck, tier: 'silver' },
  { id: 'goal-halfway', title: 'Halfway There', description: 'Reach 50% of your weight goal', icon: Target, tier: 'silver' },
  { id: 'goal-reached', title: 'Goal Crusher', description: 'Reach your weight goal', icon: Trophy, tier: 'gold' },
  { id: 'checkin-7', title: 'Daily Devotee', description: 'Check in 7 days in a row', icon: CheckCircle2, tier: 'bronze' },
  { id: 'checkin-30', title: 'Habit Master', description: 'Check in 30 days in a row', icon: Star, tier: 'gold' },
  { id: 'first-workout', title: 'First Rep', description: 'Finish your first workout', icon: Dumbbell, tier: 'bronze' },
];
