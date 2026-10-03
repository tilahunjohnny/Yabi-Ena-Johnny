import { AppState, Category, ChecklistItem, Milestone, Scenario, TreeEdge, TreeNode, uid } from './types';

export const CATEGORY_SEED: Array<Category & { share: number }> = [
  { id: 'venue', name: 'Venue & Location', icon: 'landmark', color: '#c9a45c', kind: 'vendor', share: 0.3, description: 'Where we say I do — ceremony and reception spaces.' },
  { id: 'party', name: 'Wedding Party', icon: 'users', color: '#d98ca3', kind: 'people', share: 0.01, description: 'Who stands with us: groomsmen, bridesmaids, readers, family roles.' },
  { id: 'catering', name: 'Catering & Bar', icon: 'utensils', color: '#e08a5b', kind: 'vendor', share: 0.2, description: 'Food, drinks, service style.' },
  { id: 'photo', name: 'Photo & Video', icon: 'camera', color: '#7fa8d6', kind: 'vendor', share: 0.1, description: 'Photographers, videographers, albums.' },
  { id: 'attire', name: 'Attire & Beauty', icon: 'shirt', color: '#b48ad9', kind: 'vendor', share: 0.07, description: 'Dress, suit, tailoring, hair & makeup.' },
  { id: 'music', name: 'Music & Entertainment', icon: 'music', color: '#6fc2a3', kind: 'vendor', share: 0.06, description: 'DJ, band, ceremony musicians, MC.' },
  { id: 'decor', name: 'Florals & Decor', icon: 'flower', color: '#e6a5c4', kind: 'vendor', share: 0.08, description: 'Flowers, rentals, lighting, signage.' },
  { id: 'officiant', name: 'Officiant & Ceremony', icon: 'scroll', color: '#a6b86a', kind: 'vendor', share: 0.01, description: 'Officiant, traditions, legal paperwork.' },
  { id: 'stationery', name: 'Invites & Stationery', icon: 'mail', color: '#8fa0b8', kind: 'vendor', share: 0.02, description: 'Save-the-dates, invitations, programs, website.' },
  { id: 'lodging', name: 'Guest Lodging & Travel', icon: 'bed', color: '#7ec4c9', kind: 'vendor', share: 0.03, description: 'Room blocks, shuttles, welcome bags.' },
  { id: 'cake', name: 'Cake & Desserts', icon: 'cake', color: '#f0b27a', kind: 'vendor', share: 0.02, description: 'Cake, dessert tables, late-night snacks.' },
  { id: 'honeymoon', name: 'Honeymoon', icon: 'plane', color: '#6aa7e0', kind: 'vendor', share: 0.08, description: 'Where we go after.' },
  { id: 'planner', name: 'Planner & Misc', icon: 'sparkles', color: '#c0c0c8', kind: 'vendor', share: 0.02, description: 'Planner, insurance, favors, tips, contingency.' },
];

export const SCENARIO_COLORS = ['#c9a45c', '#6fc2a3', '#7fa8d6', '#d98ca3', '#b48ad9', '#e08a5b'];

export const MILESTONE_TEMPLATE: Array<Omit<Milestone, 'id' | 'done'>> = [
  { title: 'Set total budget & priorities', monthsBefore: 14, categoryId: 'planner' },
  { title: 'Draft first-pass guest list', monthsBefore: 13, categoryId: 'party' },
  { title: 'Tour & book venue', monthsBefore: 12, categoryId: 'venue' },
  { title: 'Hire planner / day-of coordinator', monthsBefore: 11, categoryId: 'planner' },
  { title: 'Book photographer & videographer', monthsBefore: 10, categoryId: 'photo' },
  { title: 'Book caterer', monthsBefore: 10, categoryId: 'catering' },
  { title: 'Book band / DJ', monthsBefore: 9, categoryId: 'music' },
  { title: 'Ask the wedding party', monthsBefore: 9, categoryId: 'party' },
  { title: 'Start dress / suit shopping', monthsBefore: 9, categoryId: 'attire' },
  { title: 'Plan honeymoon & book flights', monthsBefore: 8, categoryId: 'honeymoon' },
  { title: 'Send save-the-dates', monthsBefore: 8, categoryId: 'stationery' },
  { title: 'Reserve guest room blocks', monthsBefore: 8, categoryId: 'lodging' },
  { title: 'Book officiant', monthsBefore: 7, categoryId: 'officiant' },
  { title: 'Choose florist & decor', monthsBefore: 6, categoryId: 'decor' },
  { title: 'Cake tasting & order', monthsBefore: 4, categoryId: 'cake' },
  { title: 'Send invitations', monthsBefore: 3, categoryId: 'stationery' },
  { title: 'Marriage license & legal paperwork', monthsBefore: 2, categoryId: 'officiant' },
  { title: 'Final dress / suit fittings', monthsBefore: 1, categoryId: 'attire' },
  { title: 'Final headcount to caterer', monthsBefore: 1, categoryId: 'catering' },
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
  const scenarios: Scenario[] = [
    { id: 'sc_a', name: 'Plan A — Earlier', date: addMonths(new Date().toISOString().slice(0, 10), 10), color: SCENARIO_COLORS[0], notes: 'Faster timeline. Fewer venue options, quicker decisions.', milestones: makeMilestones() },
    { id: 'sc_b', name: 'Plan B — Later', date: addMonths(new Date().toISOString().slice(0, 10), 18), color: SCENARIO_COLORS[1], notes: 'More time to save, more availability, peak season pricing.', milestones: makeMilestones() },
  ];
  const checklist: ChecklistItem[] = CHECKLIST_SEED.map(([categoryId, title]) => ({ id: uid('ck'), title, categoryId, done: false, note: '' }));
  const proposalChecklist: ChecklistItem[] = PROPOSAL_CHECKLIST_SEED.map((title) => ({ id: uid('pk'), title, categoryId: 'proposal', done: false, note: '' }));
  return {
    version: 1,
    settings: { coupleNames: 'Yabi & Johnny', totalBudget, guestCount, currency: 'USD' },
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
  };
}
