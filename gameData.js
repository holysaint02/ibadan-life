// gameData.js — all the Ibadan-flavored content lives here.
// Edit freely: add locations, jobs, events without touching server logic.

const STARTING_PROFILES = {
  established: {
    label: 'Established',
    blurb: 'Your family has connections. You start comfortable, but people expect more from you.',
    cash: 50000,
    reputation: 20,
  },
  hustler: {
    label: 'Hustler',
    blurb: 'Nobody gave you anything. You start small, with a loan already hanging over your head.',
    cash: 5000,
    reputation: 0,
    debt: 15000,
  },
};

const LOCATIONS = [
  {
    id: 'bodija',
    name: 'Bodija Market',
    type: 'work',
    description: 'A sprawling market of food, fabric, and noise. Good place to trade or hustle.',
    jobs: ['trader', 'tailor'],
  },
  {
    id: 'dugbe',
    name: 'Dugbe Market',
    type: 'work',
    description: 'Ibadan\'s old commercial heart. Everyone from mechanics to importers passes through.',
    jobs: ['mechanic', 'trader'],
  },
  {
    id: 'ring_road',
    name: 'Ring Road',
    type: 'social',
    description: 'Bars, suya spots, and traffic. The place to be seen in the evening.',
    jobs: ['bartender'],
  },
  {
    id: 'ui',
    name: 'University of Ibadan',
    type: 'work',
    description: 'Nigeria\'s premier university. Academic jobs and ambitious students.',
    jobs: ['teaching_assistant', 'tutor'],
  },
  {
    id: 'cocoa_house',
    name: 'Cocoa House',
    type: 'work',
    description: 'A landmark office tower. Corporate jobs, suits, and slow elevators.',
    jobs: ['office_clerk', 'sales_rep'],
  },
  {
    id: 'agodi',
    name: 'Agodi Gardens',
    type: 'social',
    description: 'A quiet park to relax, clear your head, and meet people away from the market noise.',
    jobs: [],
  },
  {
    id: 'challenge',
    name: 'Challenge',
    type: 'work',
    description: 'A busy transport hub. Danfo and taxi drivers hustle here all day.',
    jobs: ['danfo_driver'],
  },
  {
    id: 'mokola',
    name: 'Mokola',
    type: 'social',
    description: 'Dense, lively, and full of small shops and street food stalls.',
    jobs: ['street_vendor'],
  },
];

const JOBS = {
  trader: { label: 'Market Trader', pay: [1500, 3500], energyCost: 20 },
  tailor: { label: 'Tailor', pay: [2000, 4000], energyCost: 25 },
  mechanic: { label: 'Mechanic', pay: [2500, 5000], energyCost: 30 },
  bartender: { label: 'Bartender', pay: [1800, 3200], energyCost: 20 },
  teaching_assistant: { label: 'Teaching Assistant', pay: [3000, 4500], energyCost: 15 },
  tutor: { label: 'Private Tutor', pay: [2000, 5000], energyCost: 15 },
  office_clerk: { label: 'Office Clerk', pay: [3500, 5500], energyCost: 20 },
  sales_rep: { label: 'Sales Rep', pay: [2000, 6000], energyCost: 25 },
  danfo_driver: { label: 'Danfo Driver', pay: [2000, 4500], energyCost: 35 },
  street_vendor: { label: 'Street Vendor', pay: [1000, 2800], energyCost: 15 },
};

module.exports = { STARTING_PROFILES, LOCATIONS, JOBS };
