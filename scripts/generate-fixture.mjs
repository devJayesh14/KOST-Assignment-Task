// Expands the assessment fixture to 137 records. The first eight records are copied verbatim.
// Run with: npm run generate:fixture
import { writeFileSync } from 'node:fs';

const OUTPUT = new URL('../src/app/mock-api/organisations.fixture.json', import.meta.url);
const TOTAL = 137;

const base = [
  { id: 1, name: 'Northwind Traders', status: 'active', memberCount: 42, owner: { email: 'ops@northwind.example' }, createdAt: '2024-03-11T09:12:00Z' },
  { id: 2, name: '', status: 'ACTIVE', memberCount: '12', owner: { email: 'a@b.example' }, createdAt: 1710150720000 },
  { id: 3, name: null, status: 'Active', memberCount: -1, createdAt: '2024-01-02T00:00:00Z' },
  { id: 42, name: 'Globex Corporation', status: 'suspended', memberCount: 7, owner: { email: 'hq@globex.example' }, createdAt: '2023-11-30T14:45:10Z' },
  { id: 42, name: 'Globex Corporation Ltd', status: 'actve', memberCount: 7, owner: { email: 'hq@globex.example' }, createdAt: '2023-11-30T14:45:10Z' },
  { id: 6, name: 'شركةالأمل🚀', status: 'active', memberCount: 3, owner: { email: 'info@amal.example' }, createdAt: '2025-06-01T08:00:00Z' },
  {
    id: 7,
    name: 'The Very Long Organisation Name That Somebody Actually Typed Into The Field Because Nobody Validated It And It Keeps Going Well Past Any Reasonable Column Width And Still Has Not Stopped',
    status: 'inactive',
    memberCount: 0,
    owner: { email: 'long@example.com' },
    createdAt: '2024-07-19T16:20:00Z',
  },
  { id: 8, name: 'Initech', status: null, memberCount: null, owner: { email: 'not-an-email' }, createdAt: 'not a date' },
];

const prefixes = [
  'Acme', 'Blue Harbor', 'Cedar', 'Delta', 'Evergreen', 'Fjord', 'Granite', 'Helix', 'Iris',
  'Juniper', 'Kestrel', 'Lumen', 'Meridian', 'Nimbus', 'Orchid', 'Pioneer', 'Quartz',
  'Riverbend', 'Summit', 'Tidewater', 'Umbra', 'Vertex', 'Willow', 'Xenon', 'Yarrow', 'Zephyr',
];
const sectors = ['Logistics', 'Health', 'Analytics', 'Foods', 'Energy', 'Labs', 'Partners', 'Media', 'Robotics', 'Finance'];

let seed = 20240311;
function random() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
function pick(list) {
  return list[Math.floor(random() * list.length)];
}

const records = [...base];

const quirks = [
  (r) => { r.status = r.status.toUpperCase(); },
  (r) => { r.status = r.status[0].toUpperCase() + r.status.slice(1); },
  (r) => { r.status = 'actve'; },
  (r) => { r.status = null; },
  (r) => { r.status = ` ${r.status} `; },
  (r) => { r.memberCount = String(r.memberCount); },
  (r) => { r.memberCount = -1; },
  (r) => { r.memberCount = null; },
  (r) => { r.name = ''; },
  (r) => { r.name = null; },
  (r) => { r.name = `  ${r.name}  `; },
  (r) => { delete r.owner; },
  (r) => { r.owner = { email: 'not-an-email' }; },
  (r) => { r.createdAt = Date.parse(r.createdAt); },
  (r) => { r.createdAt = 'not a date'; },
  (r) => { r.id = records[records.length - 1].id; },
  (r) => { r.name = `${r.name} ${pick(['🚀', '✨', '🌿'])}`; },
  (r) => { r.name = pick(['شركة النور', 'مؤسسة الفجر', '株式会社サクラ']); },
  (r) => { r.name = `${r.name} Regional Division That Handles Every Enquiry Nobody Else Wanted And Kept The Full Registered Name`; },
  (r) => { r.name = 'globex corporation'; },
];

let nextId = 100;
for (let i = 0; records.length < TOTAL; i++) {
  const name = `${prefixes[i % prefixes.length]} ${sectors[Math.floor(i / prefixes.length) % sectors.length]}`;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const day = Math.floor(random() * 1200);
  const seconds = Math.floor(random() * 86400);

  const record = {
    id: nextId++,
    name,
    status: pick(['active', 'active', 'active', 'inactive', 'suspended']),
    memberCount: Math.floor(random() * 400),
    owner: { email: `admin@${slug}.example` },
    createdAt: new Date(Date.UTC(2022, 0, 1) + day * 86400000 + seconds * 1000).toISOString(),
  };

  if (i % 3 === 0) {
    quirks[(i / 3) % quirks.length](record);
  }

  records.push(record);
}

writeFileSync(OUTPUT, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
console.log(`Wrote ${records.length} records to ${OUTPUT.pathname}`);
