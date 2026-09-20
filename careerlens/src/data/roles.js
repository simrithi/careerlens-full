// Role catalogue. In production this comes from the "roles" service (curated + mined from JDs).
// Per-role demand/supply/growth figures below are still ILLUSTRATIVE modeling inputs — no public
// dataset breaks India's job market down by individual tech role at this granularity. Only the
// aggregate INDIA_GAP figures further down are real, sourced numbers (AICTE/NASSCOM/PLFS).
export const ROLES = [
  {
    id: 'android', title: 'Android Developer', emoji: '📱', salary: '6-18 LPA',
    demand: { openings: 8, supply: 95, growth: 6 }, automationRisk: 22,
    skills: [
      { name: 'Kotlin', need: 80, weight: 3 }, { name: 'Android SDK', need: 80, weight: 3 },
      { name: 'Jetpack Compose', need: 70, weight: 2 }, { name: 'Java', need: 60, weight: 1 },
      { name: 'REST APIs', need: 60, weight: 2 }, { name: 'Room DB', need: 55, weight: 1 },
      { name: 'Git', need: 60, weight: 1 }, { name: 'Testing', need: 50, weight: 1 },
      { name: 'DSA', need: 65, weight: 2 }, { name: 'System Design', need: 40, weight: 1 },
      { name: 'Firebase', need: 40, weight: 1 },
    ],
  },
  {
    id: 'fullstack', title: 'Full Stack Developer', emoji: '🌐', salary: '5-22 LPA',
    demand: { openings: 26, supply: 260, growth: 4 }, automationRisk: 38,
    skills: [
      { name: 'JavaScript', need: 75, weight: 3 }, { name: 'React', need: 75, weight: 3 },
      { name: 'Node.js', need: 70, weight: 2 }, { name: 'TypeScript', need: 55, weight: 1 },
      { name: 'HTML/CSS', need: 70, weight: 1 }, { name: 'SQL', need: 60, weight: 2 },
      { name: 'MongoDB', need: 50, weight: 1 }, { name: 'REST APIs', need: 65, weight: 2 },
      { name: 'Git', need: 60, weight: 1 }, { name: 'DSA', need: 60, weight: 2 }, { name: 'Testing', need: 45, weight: 1 },
    ],
  },
  {
    id: 'backend', title: 'Backend Engineer', emoji: '⚙️', salary: '6-28 LPA',
    demand: { openings: 22, supply: 200, growth: 5 }, automationRisk: 30,
    skills: [
      { name: 'Java', need: 75, weight: 3 }, { name: 'Spring Boot', need: 70, weight: 3 },
      { name: 'SQL', need: 70, weight: 2 }, { name: 'REST APIs', need: 70, weight: 2 },
      { name: 'System Design', need: 60, weight: 2 }, { name: 'DSA', need: 65, weight: 2 },
      { name: 'Docker', need: 50, weight: 1 }, { name: 'Kafka', need: 40, weight: 1 },
      { name: 'AWS', need: 45, weight: 1 }, { name: 'Git', need: 60, weight: 1 }, { name: 'Testing', need: 55, weight: 1 },
    ],
  },
  {
    id: 'data', title: 'Data Analyst', emoji: '📊', salary: '4-14 LPA',
    demand: { openings: 14, supply: 140, growth: 9 }, automationRisk: 46,
    skills: [
      { name: 'SQL', need: 75, weight: 3 }, { name: 'Python', need: 70, weight: 3 },
      { name: 'Pandas', need: 65, weight: 2 }, { name: 'Statistics', need: 60, weight: 2 },
      { name: 'Data Visualization', need: 65, weight: 2 }, { name: 'Excel', need: 55, weight: 1 },
      { name: 'Power BI', need: 50, weight: 1 }, { name: 'Communication', need: 50, weight: 1 },
      { name: 'Machine Learning', need: 40, weight: 1 },
    ],
  },
  {
    id: 'ml', title: 'ML Engineer', emoji: '🧠', salary: '8-32 LPA',
    demand: { openings: 8, supply: 110, growth: 14 }, automationRisk: 18,
    skills: [
      { name: 'Python', need: 80, weight: 3 }, { name: 'Machine Learning', need: 75, weight: 3 },
      { name: 'TensorFlow/PyTorch', need: 65, weight: 3 }, { name: 'Statistics', need: 65, weight: 2 },
      { name: 'Pandas', need: 60, weight: 1 }, { name: 'SQL', need: 55, weight: 1 },
      { name: 'DSA', need: 55, weight: 1 }, { name: 'MLOps', need: 40, weight: 2 },
      { name: 'Computer Vision', need: 40, weight: 1 }, { name: 'Git', need: 55, weight: 1 },
    ],
  },
  {
    id: 'cloud', title: 'Cloud / DevOps Engineer', emoji: '☁️', salary: '7-30 LPA',
    demand: { openings: 14, supply: 55, growth: 16 }, automationRisk: 24,
    skills: [
      { name: 'AWS', need: 75, weight: 3 }, { name: 'Docker', need: 70, weight: 2 },
      { name: 'Kubernetes', need: 60, weight: 2 }, { name: 'Terraform', need: 55, weight: 2 },
      { name: 'CI/CD', need: 65, weight: 2 }, { name: 'Linux', need: 65, weight: 2 },
      { name: 'Python', need: 50, weight: 1 }, { name: 'Networking', need: 50, weight: 1 }, { name: 'Git', need: 55, weight: 1 },
    ],
  },
  {
    id: 'game', title: 'Game / Tools Developer', emoji: '🎮', salary: '5-24 LPA',
    demand: { openings: 2, supply: 12, growth: 11 }, automationRisk: 26,
    skills: [
      { name: 'C++', need: 60, weight: 2 }, { name: 'Unity', need: 70, weight: 3 },
      { name: '3D Math', need: 60, weight: 3 }, { name: 'Python', need: 45, weight: 1 },
      { name: 'Computer Vision', need: 30, weight: 1 }, { name: 'Git', need: 55, weight: 1 },
      { name: 'DSA', need: 55, weight: 1 }, { name: 'Communication', need: 40, weight: 1 },
    ],
  },
]

export const roleById = (id) => ROLES.find((r) => r.id === id)

export const SKILL_ALIASES = {
  compose: 'Jetpack Compose', 'android studio': 'Android SDK', android: 'Android SDK', js: 'JavaScript',
  reactjs: 'React', nodejs: 'Node.js', node: 'Node.js', ts: 'TypeScript', k8s: 'Kubernetes', pytorch: 'TensorFlow/PyTorch',
  tensorflow: 'TensorFlow/PyTorch', ml: 'Machine Learning', 'data structures': 'DSA', algorithms: 'DSA',
  'spring boot': 'Spring Boot', spring: 'Spring Boot', postgres: 'SQL', mysql: 'SQL', 'ci-cd': 'CI/CD', cicd: 'CI/CD',
  opencv: 'Computer Vision', 'three.js': '3D Math', 'system design': 'System Design',
}

export const ALL_SKILLS = Array.from(new Set(ROLES.flatMap((r) => r.skills.map((s) => s.name)))).sort()

// Overall numbers shown in the hero counters. Real, sourced figures (updated 2026):
// - graduatesPerYear: AICTE-approved B.Tech seats actually filled in 2024-25 — 12.53 lakh,
//   the highest in 8 years (source: Careers360, reporting AICTE data).
// - entryOpenings: NASSCOM's FY26 outlook projects ~3.5 lakh new tech jobs in 2025-26, with
//   freshers accounting for ~45% of new hires — ≈1.58 lakh entry-level tech openings (source: Taggd,
//   citing NASSCOM).
// - The 22.7% graduate unemployment rate (PLFS Annual Report 2025, Ministry of Statistics) is
//   folded into the note text below rather than a separate counter.
export const INDIA_GAP = {
  graduatesPerYear: 1253, // thousand => 12.53 lakh (AICTE, 2024-25 B.Tech intake filled)
  entryOpenings: 158, // thousand => 1.58 lakh (NASSCOM FY26 fresher tech hiring estimate)
  note: 'Sourced: AICTE (12.53 lakh B.Tech seats filled, 2024-25) and NASSCOM’s FY26 outlook (~3.5 lakh new tech jobs, ~45% for freshers). Graduate unemployment stood at 22.7% per PLFS 2025, the gap this app helps you close. Per-role numbers elsewhere are still illustrative modeling inputs.',
}
