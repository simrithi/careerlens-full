// One-off seed for a demo/test recruiter account, mirroring the `novapixel` company record in
// ../careerlens/src/data/seed.js. There's no signup-time seeding pipeline for recruiter data
// (candidates are demo-only content, not real cross-tenant sourcing — see lambda/common/db.ts),
// so this script writes the same demo shape directly under a given recruiter's own PK.
//
// Usage (from careerlens-backend/, with AWS creds for the target account/region already active,
// e.g. via `aws configure sso`):
//   TABLE_NAME=<CareerLensDataStack table name, from CDK/console> npx tsx scripts/seedRecruiterDemo.ts <cognito-sub>
//
// The <cognito-sub> must belong to a Cognito user already added to the "company" group:
//   aws cognito-idp admin-add-user-to-group --user-pool-id <pool-id> --username <email> --group-name company
//
// Idempotent: re-running overwrites the same items (same deterministic ids) rather than duplicating.

import { BatchWriteCommand, DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const TABLE_NAME = process.env.TABLE_NAME;
const userId = process.argv[2];

if (!TABLE_NAME || !userId) {
  console.error('Usage: TABLE_NAME=<table> npx tsx scripts/seedRecruiterDemo.ts <cognito-sub>');
  process.exit(1);
}

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
const pk = `USER#${userId}`;

const company = {
  pk,
  sk: 'COMPANY',
  name: 'NovaPixel Games',
  industry: 'Game Development',
  size: '120 employees',
  location: 'Bengaluru',
  about: 'Indie-to-AA game studio building mobile and PC titles. Hiring for tooling and gameplay.',
};

const roles = [
  {
    pk,
    sk: 'ROLE#r1',
    id: 'r1',
    title: 'Technical Artist - Tools',
    roleId: 'game',
    openings: 2,
    applicants: 27,
    posted: '2026-09-15',
    domains: ['game-dev', '3d', 'pipeline', 'python', 'computer-vision'],
    skills: [
      { name: 'Python', need: 60, weight: 3 },
      { name: '3D Math', need: 55, weight: 3 },
      { name: 'Unity', need: 50, weight: 2 },
      { name: 'Computer Vision', need: 30, weight: 1 },
      { name: 'Git', need: 50, weight: 1 },
    ],
  },
  {
    pk,
    sk: 'ROLE#r2',
    id: 'r2',
    title: 'Unity Gameplay Developer',
    roleId: 'game',
    openings: 3,
    applicants: 58,
    posted: '2026-09-09',
    domains: ['game-dev', 'gameplay', 'mobile', 'unity'],
    skills: [
      { name: 'Unity', need: 70, weight: 3 },
      { name: 'C++', need: 55, weight: 2 },
      { name: '3D Math', need: 55, weight: 2 },
      { name: 'DSA', need: 55, weight: 1 },
      { name: 'Git', need: 50, weight: 1 },
    ],
  },
];

const candidates = [
  {
    id: 'c1', name: 'Ananya Iyer', college: 'Nandi Institute of Technology', tier: 'Tier 2', city: 'Mysuru', exp: 'Fresher', ats: 84,
    skills: { Python: 60, '3D Math': 40, 'Computer Vision': 35, Git: 75, Unity: 25, DSA: 68, 'C++': 30 }, leetcode: 132, verified: 4,
    projects: [{ name: 'Img2Asset', desc: 'Converts a single image into a textured 3D game asset using depth estimation.', domains: ['game-dev', '3d', 'computer-vision', 'python', 'pipeline'] }],
  },
  {
    id: 'c2', name: 'Rohit Kulkarni', college: 'City College of Engineering', tier: 'Tier 3', city: 'Belagavi', exp: 'Fresher', ats: 62,
    skills: { Python: 72, '3D Math': 68, Unity: 55, Git: 60, 'Computer Vision': 40, 'C++': 45 }, leetcode: 41, verified: 2,
    projects: [{ name: 'Blender Batch Exporter', desc: 'Python add-on that batch-exports and validates Blender assets for Unity.', domains: ['3d', 'pipeline', 'python', 'game-dev'] }],
  },
  {
    id: 'c3', name: 'Sneha Patil', college: 'Tier-1 Institute', tier: 'Tier 1', city: 'Pune', exp: '1 yr', ats: 91,
    skills: { Unity: 78, 'C++': 66, '3D Math': 58, DSA: 82, Git: 80, Python: 40 }, leetcode: 310, verified: 6,
    projects: [{ name: 'Rogue Runner', desc: 'Mobile endless runner in Unity with procedural level generation.', domains: ['game-dev', 'gameplay', 'mobile', 'unity'] }],
  },
  {
    id: 'c4', name: 'Arjun Menon', college: 'State Engineering College', tier: 'Tier 2', city: 'Kochi', exp: 'Fresher', ats: 70,
    skills: { Unity: 64, 'C++': 52, Git: 70, '3D Math': 47, DSA: 60 }, leetcode: 98, verified: 3,
    projects: [{ name: 'PuzzleForge', desc: 'Physics puzzle game with 40 levels published on itch.io.', domains: ['game-dev', 'gameplay', 'unity'] }],
  },
  {
    id: 'c5', name: 'Divya Reddy', college: 'Regional Engineering College', tier: 'Tier 3', city: 'Warangal', exp: 'Fresher', ats: 55,
    skills: { Python: 66, 'Computer Vision': 62, Git: 45, '3D Math': 35 }, leetcode: 55, verified: 1,
    projects: [{ name: 'Sketch-to-Sprite', desc: 'Neural net that converts hand-drawn sketches into pixel-art sprites.', domains: ['computer-vision', 'python', 'game-dev', '2d'] }],
  },
  {
    id: 'c6', name: 'Karan Bhat', college: 'Tier-1 Institute', tier: 'Tier 1', city: 'Bengaluru', exp: '2 yrs', ats: 88,
    skills: { Python: 70, Unity: 60, '3D Math': 72, Git: 85, 'C++': 58 }, leetcode: 260, verified: 5,
    projects: [{ name: 'PipelineKit', desc: 'Asset validation pipeline used by a 15-member art team.', domains: ['pipeline', 'python', 'game-dev', '3d'] }],
  },
  {
    id: 'c7', name: 'Nisha Sharma', college: 'Autonomous Engineering College', tier: 'Tier 2', city: 'Indore', exp: 'Fresher', ats: 73,
    skills: { 'C++': 70, DSA: 76, Git: 66, Unity: 30 }, leetcode: 205, verified: 3,
    projects: [{ name: 'Mini Ray Tracer', desc: 'CPU ray tracer in C++ with reflections and soft shadows.', domains: ['3d', 'graphics', 'cpp'] }],
  },
  {
    id: 'c8', name: 'Faiz Ahmed', college: 'Private University', tier: 'Tier 2', city: 'Lucknow', exp: 'Fresher', ats: 48,
    skills: { Java: 65, SQL: 60, DSA: 50 }, leetcode: 60, verified: 1,
    projects: [{ name: 'Library Management', desc: 'Java desktop app with a SQL database for a school library.', domains: ['desktop', 'sql'] }],
  },
].map((c) => ({ pk, sk: `CAND#${c.id}`, ...c }));

const shortlist = { pk, sk: 'SHORTLIST', ids: [] as string[] };

async function main() {
  const items = [company, ...roles, ...candidates, shortlist];
  // BatchWriteCommand caps at 25 items per call.
  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25);
    await ddb.send(
      new BatchWriteCommand({
        RequestItems: { [TABLE_NAME as string]: chunk.map((Item) => ({ PutRequest: { Item } })) },
      })
    );
  }
  console.log(`Seeded company + ${roles.length} roles + ${candidates.length} candidates for USER#${userId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
