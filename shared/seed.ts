import { AppState, Category, ChecklistItem, Milestone, Scenario, TreeEdge, TreeNode, uid } from './types';

/** Cream and charcoal, with a muted rust. */
export const PALETTE = {
  cream: '#F4F1E6', ivory: '#FBF9F1', sand: '#E0DAC6', rust: '#A5654A',
  clay: '#C58F73', taupe: '#8F8670', slate: '#55524A', charcoal: '#2A2A25',
};

export const CATEGORY_SEED: Array<Category & { share: number }> = [
  { id: 'venue', name: 'Wedding Venues & Locations', icon: 'landmark', color: PALETTE.rust, kind: 'vendor', share: 0.7, description: 'Where we say I do. Catering, bar and most extras are usually included, so this one carries most of the budget. Venues can be here or abroad.' },
  { id: 'honeymoon', name: 'Honeymoon', icon: 'plane', color: PALETTE.clay, kind: 'vendor', share: 0.15, description: 'Where we go after.' },
  { id: 'planner', name: 'Planner & Misc', icon: 'sparkles', color: PALETTE.slate, kind: 'vendor', share: 0.1, description: 'Planner, insurance, favors, tips, contingency, digital invitations.' },
  // Hidden for now (data is kept; restore them in Settings if they come back).
  { id: 'catering', name: 'Catering & Bar', icon: 'utensils', color: PALETTE.clay, kind: 'vendor', share: 0, hidden: true, description: 'Food, drinks, service style.' },
  { id: 'photo', name: 'Photo & Video', icon: 'camera', color: PALETTE.taupe, kind: 'vendor', share: 0, hidden: true, description: 'Photographers, videographers, albums.' },
  { id: 'attire', name: 'Attire & Beauty', icon: 'shirt', color: PALETTE.taupe, kind: 'vendor', share: 0, hidden: true, description: 'Dress, suit, tailoring, hair & makeup.' },
  { id: 'music', name: 'Music & Entertainment', icon: 'music', color: PALETTE.slate, kind: 'vendor', share: 0, hidden: true, description: 'DJ, band, ceremony musicians, MC.' },
  { id: 'decor', name: 'Florals & Decor', icon: 'flower', color: PALETTE.rust, kind: 'vendor', share: 0, hidden: true, description: 'Flowers, rentals, lighting, signage.' },
  { id: 'officiant', name: 'Officiant & Ceremony', icon: 'scroll', color: PALETTE.slate, kind: 'vendor', share: 0, hidden: true, description: 'Officiant, traditions, legal paperwork.' },
  { id: 'stationery', name: 'Invites & Stationery', icon: 'mail', color: PALETTE.taupe, kind: 'vendor', share: 0, hidden: true, description: 'Invitations, programs, website.' },
  { id: 'lodging', name: 'Guest Lodging & Travel', icon: 'bed', color: PALETTE.clay, kind: 'vendor', share: 0, hidden: true, description: 'Room blocks, shuttles, welcome bags.' },
  { id: 'cake', name: 'Cake & Desserts', icon: 'cake', color: PALETTE.taupe, kind: 'vendor', share: 0, hidden: true, description: 'Cake, dessert tables, late-night snacks.' },
];

/** The three plans. Exact days are a starting point; edit them on the Timelines page. */
export const PLAN_SEED = [
  { id: 'sc_a', name: 'Plan A', label: 'Sep 2027', date: '2027-09-18', color: PALETTE.charcoal },
  { id: 'sc_b', name: 'Plan B', label: 'May 2027', date: '2027-05-15', color: PALETTE.rust },
  { id: 'sc_c', name: 'Plan C', label: 'Oct 2027', date: '2027-10-16', color: PALETTE.taupe },
];

export const SCENARIO_COLORS = [PALETTE.charcoal, PALETTE.rust, PALETTE.taupe, PALETTE.clay, PALETTE.slate, PALETTE.sand];

export const MILESTONE_TEMPLATE: Array<Omit<Milestone, 'id' | 'done'>> = [
  { title: 'Set total budget & priorities', monthsBefore: 14, categoryId: 'planner' },
  { title: 'Draft first-pass guest list', monthsBefore: 13, categoryId: 'planner' },
  { title: 'Shortlist venues & locations', monthsBefore: 13, categoryId: 'venue' },
  { title: 'Tour / visit top venues', monthsBefore: 12, categoryId: 'venue' },
  { title: 'Book venue', monthsBefore: 11, categoryId: 'venue' },
  { title: 'Hire planner / day-of coordinator', monthsBefore: 10, categoryId: 'planner' },
  { title: 'Plan honeymoon & book flights', monthsBefore: 8, categoryId: 'honeymoon' },
  { title: 'Finalize guest list', monthsBefore: 7, categoryId: 'planner' },
  { title: 'Send digital invitations', monthsBefore: 5, categoryId: 'planner' },
  { title: 'Final headcount to venue', monthsBefore: 1, categoryId: 'venue' },
  { title: 'Confirm all vendors & timeline', monthsBefore: 0.5, categoryId: 'planner' },
];

export function makeMilestones(): Milestone[] {
  return MILESTONE_TEMPLATE.map((m) => ({ ...m, id: uid('ms'), done: false }));
}

export function addMonths(iso: string, months: number): string {
  const d = new Date(iso + 'T12:00:00');
  const whole = Math.trunc(months);
  d.setMonth(d.getMonth() + whole);
  d.setDate(d.getDate() + Math.round((months - whole) * 30));
  return d.toISOString().slice(0, 10);
}

/** Added when the plan moved to venues that may be out of the country, and digital invitations. */
export const NEW_CHECKLIST: Array<[string, string]> = [
  ['venue', 'Out of country: legal marriage requirements and paperwork'],
  ['venue', 'Out of country: passport and visa needs for guests'],
  ['venue', 'Out of country: travel cost and time for elders and family'],
  ['venue', 'Capacity vs. our guest list (yes + maybe)'],
  ['planner', 'Digital invitations: platform, design and RSVP tracking'],
];

const CHECKLIST_SEED: Array<[string, string]> = [
  ['venue', 'Ceremony and reception in one place, or two?'],
  ['venue', 'Indoor backup plan for weather'],
  ['venue', 'Capacity, guest-count flexibility, and curfew'],
  ['venue', 'What is included (tables, chairs, linens, AV)?'],
  ['venue', 'Accessibility and parking for elderly guests'],
  ['venue', 'Venue exclusivity, vendor restrictions, and overtime fees'],
  ['party', 'Decide the size of the wedding party'],
  ['party', 'Best man / maid of honor / honor attendants'],
  ['party', 'Ring bearer, flower girls, readers, ushers'],
  ['party', 'Family roles (parents, elders, blessing, toasts)'],
  ['catering', 'Service style: plated, buffet, family-style, stations'],
  ['catering', 'Cultural dishes and dietary restrictions'],
  ['catering', 'Bar: open, limited, BYOB, corkage'],
  ['catering', 'Coffee ceremony / traditional elements'],
  ['photo', 'Photography and videography coverage hours'],
  ['photo', 'Engagement shoot and second shooter'],
  ['photo', 'Shot list for family and elders'],
  ['attire', 'Dress / suit / cultural outfits (multiple changes?)'],
  ['attire', 'Alterations timeline and fittings'],
  ['attire', 'Hair and makeup trials'],
  ['attire', 'Wedding party attire coordination'],
  ['music', 'Ceremony music, processional, first dance songs'],
  ['music', 'DJ vs live band, MC, sound equipment'],
  ['decor', 'Colour palette and overall style'],
  ['decor', 'Bouquets, boutonnieres, centerpieces, arch'],
  ['decor', 'Lighting, signage, rentals'],
  ['officiant', 'Officiant: friend, clergy, or professional'],
  ['officiant', 'Religious / cultural traditions to include'],
  ['officiant', 'Marriage license requirements and timeline'],
  ['officiant', 'Vows: traditional or written'],
  ['stationery', 'Wedding website and RSVP method'],
  ['stationery', 'Save-the-dates, invitations, programs, menus'],
  ['lodging', 'Hotel room blocks and group rates'],
  ['lodging', 'Shuttles between hotel and venue'],
  ['lodging', 'International guests: visa letters and travel info'],
  ['cake', 'Cake flavours, tiers, dessert table'],
  ['honeymoon', 'Destination, season, and length'],
  ['honeymoon', 'Passports, visas, vaccinations'],
  ['planner', 'Full planner vs day-of coordinator'],
  ['planner', 'Wedding insurance'],
  ['planner', 'Vendor tips and gratuities'],
  ['planner', 'Welcome party / rehearsal dinner / brunch'],
  ['planner', 'Contingency fund (5-10%)'],
  ['planner', 'Name change, legal documents, and registry'],
  ...NEW_CHECKLIST,
];

const PROPOSAL_CHECKLIST_SEED = [
  'Confirm her ring size (borrow a ring, ask a friend or her family)',
  'Decide what style she would love (shop together or secretly?)',
  'Pick the location and time of day',
  'Photographer / videographer hidden nearby?',
  'Ask for family blessing (parents, elders)',
  'Plan a backup for bad weather',
  'Who should be there — and who should be told after?',
  'Plan the day after: celebration dinner or call family',
  'Insure the ring',
  'Practice what you will say',
];

const mkNode = (id: string, label: string, kind: TreeNode['data']['kind'], x: number, y: number, note = ''): TreeNode => ({
  id,
  type: 'decision',
  position: { x, y },
  data: { label, kind, note },
});
const mkEdge = (s: string, t: string, label = ''): TreeEdge => ({ id: uid('e'), source: s, target: t, label });

export function seedTree(): AppState['tree'] {
  const nodes = [
    mkNode('n1', 'Where do we marry?', 'question', 360, 0),
    mkNode('n2', 'Home country', 'option', 80, 170, 'Closer to family, more guests, cheaper per head'),
    mkNode('n3', 'Destination abroad', 'option', 360, 170, 'Smaller guest list, higher travel burden'),
    mkNode('n4', 'Local venue', 'option', 640, 170),
    mkNode('n5', 'Guest list 200+ → larger venue & caterer', 'outcome', 0, 340),
    mkNode('n6', 'Date can move EARLIER (off-peak, 9-12 months)', 'outcome', 300, 340),
    mkNode('n7', 'Date can move LATER (peak season, 14+ months)', 'outcome', 580, 340),
  ];
  const edges = [
    mkEdge('n1', 'n2'),
    mkEdge('n1', 'n3'),
    mkEdge('n1', 'n4'),
    mkEdge('n2', 'n5', 'if X: big family'),
    mkEdge('n3', 'n6', 'then Y: fewer guests, flexible'),
    mkEdge('n4', 'n7', 'if venue is booked up'),
  ];
  return { nodes, edges };
}

export function seedState(): AppState {
  const totalBudget = 40000;
  const guestCount = 120;
  const categories: Category[] = CATEGORY_SEED.map(({ share: _s, ...c }) => c);
  const budget = CATEGORY_SEED.map((c) => {
    const target = Math.round((totalBudget * c.share) / 100) * 100;
    return { categoryId: c.id, min: Math.round((target * 0.7) / 100) * 100, target, max: Math.round((target * 1.35) / 100) * 100 };
  });
  const scenarios: Scenario[] = PLAN_SEED.map((p) => ({ id: p.id, name: `${p.name} — ${p.label}`, date: p.date, color: p.color, notes: '', milestones: makeMilestones() }));
  const checklist: ChecklistItem[] = CHECKLIST_SEED.filter(([categoryId]) => categoryId !== 'party').map(([categoryId, title]) => ({ id: uid('ck'), title, categoryId, done: false, note: '' }));
  const proposalChecklist: ChecklistItem[] = PROPOSAL_CHECKLIST_SEED.map((title) => ({ id: uid('pk'), title, categoryId: 'proposal', done: false, note: '' }));
  return {
    version: 6,
    settings: { coupleNames: 'Yabi & Johnny', totalBudget, guestCount, currency: 'USD', homeCountry: 'United States' },
    categories,
    options: [],
    scenarios,
    budget,
    notes: [],
    chats: [],
    tree: seedTree(),
    rings: [],
    proposals: [],
    proposalChecklist,
    checklist,
    guests: [],
  };
}
