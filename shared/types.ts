export type Status = 'idea' | 'shortlist' | 'chosen' | 'rejected';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  kind: 'vendor' | 'people';
  /** Hidden categories disappear from the sidebar, dashboard and budget, but keep their data. */
  hidden?: boolean;
}

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** A price that applies on certain days of the week (e.g. Mon–Thu $12,000, Sat $21,000). */
export interface PriceTier {
  id: string;
  label: string; // e.g. "Mon–Thu"
  days: Weekday[];
  cost: number;
  season: string; // free text, e.g. "Peak (May–Oct)"; blank = year-round
  note: string;
}

export interface Option {
  id: string;
  categoryId: string;
  name: string;
  vendor: string; // vendor name, or role for "people" categories
  url: string;
  location: string;
  /** Country the option is in (blank = unspecified). Compared with Settings.homeCountry to flag out-of-country options. */
  country: string;
  /** Headline cost: the selected price tier's cost when there are tiers. */
  cost: number;
  /** Prices that differ by day of the week. */
  tiers: PriceTier[];
  /** Which tier is the headline price ('' = none selected / plain cost). */
  tierId: string;
  rating: number; // 0-5
  status: Status;
  pros: string;
  cons: string;
  notes: string;
  /** Scenario ids this option applies to. Empty = applies to every scenario. */
  scenarioIds: string[];
  /** How many months before the wedding this must be booked. */
  leadTimeMonths: number;
  /** Free text, e.g. "Booked through Sept 2027". */
  availability: string;
  tags: string[];
  custom: Record<string, string>;
  createdAt: string;
}

export interface Milestone {
  id: string;
  title: string;
  monthsBefore: number;
  categoryId: string;
  done: boolean;
}

export interface Scenario {
  id: string;
  name: string;
  date: string; // ISO yyyy-mm-dd
  color: string;
  notes: string;
  milestones: Milestone[];
}

export interface BudgetLine {
  categoryId: string;
  min: number;
  target: number;
  max: number;
  /** Locked lines keep their target when other sliders rebalance. */
  locked?: boolean;
}

export interface Settings {
  coupleNames: string;
  totalBudget: number;
  guestCount: number;
  currency: string;
  /** Options in any other country are flagged as "abroad". */
  homeCountry: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  author: string;
  categoryId: string;
  decision: string;
  resolved: boolean;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Names of files attached to a user message (the file contents themselves are not stored). */
  attachments?: Array<{ name: string; size: number }>;
  actions?: string[];
  createdAt: string;
}

export interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
}

export type TreeKind = 'question' | 'option' | 'outcome';
export interface TreeNode {
  id: string;
  type: 'decision';
  position: { x: number; y: number };
  data: { label: string; kind: TreeKind; note?: string };
}
export interface TreeEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface Ring {
  id: string;
  name: string;
  vendor: string;
  url: string;
  price: number;
  stone: string;
  carat: string;
  metal: string;
  style: string;
  rating: number;
  status: Status;
  notes: string;
  createdAt: string;
}

/** The ring being aimed for: pictures, spec and the dates that matter. Private (behind the ring password). */
export interface RingBrief {
  /** Saved picture paths (served only to someone who has unlocked the ring section). */
  images: string[];
  name: string;
  description: string;
  shape: string;
  carat: string;
  /** Stone type, e.g. lab-grown diamond. */
  stone: string;
  color: string;
  clarity: string;
  metal: string;
  setting: string;
  band: string;
  /** Other features she asked for, e.g. milgrain edges. */
  details: string;
  ringSize: string;
  /** What he wants to spend, in the planner currency (0 = not set). */
  budget: number;
  /** The day he wants the ring in hand by (ISO date, '' = none). */
  needBy: string;
  /** The proposal date, if known (ISO date, '' = none). */
  proposalDate: string;
}

/** Something she has said or hinted about the ring. */
export interface RingHint {
  id: string;
  kind: 'loves' | 'avoids' | 'size' | 'other';
  text: string;
  heardOn: string; // ISO date or ''
}

/** A quote. When the jeweler gives a range, amount is the low end and amountHigh the top end. */
export interface RingQuote { id: string; date: string; amount: number; amountHigh?: number; note: string }
export type JewelerStatus = 'researching' | 'inquired' | 'quoted' | 'ordered' | 'ready' | 'passed';

/** A place being asked about the ring, with every price it has quoted and how long it takes. */
export interface Jeweler {
  id: string;
  name: string;
  contact: string;
  url: string;
  location: string;
  status: JewelerStatus;
  inquiredOn: string;
  /** What the quotes are for, e.g. "1.8ct oval lab diamond, 14k yellow, hidden halo". */
  spec: string;
  /** Every quote in the order received; the last one is the current price. */
  quotes: RingQuote[];
  deposit: number;
  /** How many weeks from ordering until the ring is done. */
  leadWeeks: number;
  orderedOn: string;
  quoteExpires: string;
  notes: string;
  createdAt: string;
}

export interface ProposalIdea {
  id: string;
  name: string;
  location: string;
  cost: number;
  vibe: string;
  rating: number;
  status: Status;
  pros: string;
  cons: string;
  notes: string;
  createdAt: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  categoryId: string;
  done: boolean;
  note: string;
}

export type GuestSide = 'yabi' | 'johnny';
export type GuestStatus = 'yes' | 'maybe';
export interface Guest {
  id: string;
  name: string;
  side: GuestSide;
  status: GuestStatus;
  group: string; // e.g. Family, Friends, Work
  notes: string;
  createdAt: string;
}

export type IdeaSource = 'instagram' | 'pinterest' | 'tiktok' | 'youtube' | 'facebook' | 'article' | 'other';

/** A saved link for the Idea Board: an article, Instagram post, Pinterest pin, video, etc. */
export interface Idea {
  id: string;
  url: string;
  title: string;
  note: string;
  /** Path of a saved thumbnail (served from the planner's own storage), or '' for none. */
  image: string;
  source: IdeaSource;
  siteName: string;
  tags: string[];
  categoryId: string; // '' = general
  favorite: boolean;
  /** Months before the wedding to look at this again (0 = no reminder). */
  revisitMonths: number;
  createdAt: string;
}

export interface AppState {
  version: number;
  settings: Settings;
  categories: Category[];
  /** Array order inside a category == rank order (index 0 is #1). */
  options: Option[];
  scenarios: Scenario[];
  budget: BudgetLine[];
  notes: Note[];
  chats: Chat[];
  tree: { nodes: TreeNode[]; edges: TreeEdge[] };
  rings: Ring[];
  proposals: ProposalIdea[];
  proposalChecklist: ChecklistItem[];
  checklist: ChecklistItem[];
  guests: Guest[];
  ideas: Idea[];
  ringBrief: RingBrief;
  ringHints: RingHint[];
  jewelers: Jeweler[];
}

export const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-3)}`;
