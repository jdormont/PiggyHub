export type AllowanceFrequency = 'none' | 'weekly' | 'biweekly' | 'monthly';

export interface Family {
  id: string;
  parent_user_id: string;
  parent_name: string;
  created_at: string;
}

export interface Child {
  id: string;
  family_id: string;
  name: string;
  avatar: string;
  dob: string | null;
  split_spend: number;
  split_save: number;
  split_give: number;
  allowance_amount: number;
  allowance_frequency: AllowanceFrequency;
  allowance_next_date: string | null;
  savings_match_rate: number;
  is_archived: boolean;
  badges: Badge[];
  created_at: string;
}

export type BadgeMilestone = 'streak_5' | 'streak_10' | 'streak_25';

export interface Badge {
  type: BadgeMilestone;
  chore_id: string;
  chore_title: string;
  earned_at: string;
}

export type ChildInput = Omit<Child, 'id' | 'family_id' | 'created_at' | 'is_archived' | 'badges'>;

export type ChoreFrequency = 'once' | 'daily' | 'weekly' | 'monthly';
export type CompletionStatus = 'pending' | 'approved' | 'rejected';
export type TxType = 'earn' | 'spend' | 'transfer' | 'allowance' | 'match';
export type Bucket = 'spend' | 'save' | 'give';

export interface Chore {
  id: string;
  child_id: string;
  title: string;
  description: string;
  value: number;
  frequency: ChoreFrequency;
  due_date: string | null;
  day_of_week: number | null;
  is_milestone: boolean;
  is_active: boolean;
  created_at: string;
}

export const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAYS_OF_WEEK_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export type ChoreInput = Omit<Chore, 'id' | 'child_id' | 'created_at' | 'is_active'>;

export interface ChoreCompletion {
  id: string;
  chore_id: string;
  child_id: string;
  status: CompletionStatus;
  completed_at: string;
  reviewed_at: string | null;
  rejection_note: string | null;
  streak_count: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  child_id: string;
  type: TxType;
  bucket: Bucket;
  amount: number;
  description: string;
  category: string | null;
  chore_completion_id: string | null;
  created_at: string;
}

export interface Balances {
  spend: number;
  save: number;
  give: number;
  total: number;
}

export type GoalContributionDirection = 'contribute' | 'withdraw' | 'complete';

export interface Goal {
  id: string;
  child_id: string;
  title: string;
  target_amount: number;
  target_date: string | null;
  emoji: string;
  image_url: string;
  is_complete: boolean;
  is_archived: boolean;
  completed_at: string | null;
  created_at: string;
}

export type GoalInput = Omit<
  Goal,
  'id' | 'child_id' | 'created_at' | 'is_complete' | 'is_archived' | 'completed_at'
>;

export interface GoalContribution {
  id: string;
  goal_id: string;
  child_id: string;
  transaction_id: string | null;
  amount: number;
  bucket: Bucket;
  direction: GoalContributionDirection;
  created_at: string;
}
