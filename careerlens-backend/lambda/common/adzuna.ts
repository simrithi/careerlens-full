import { getSecret } from './secrets';

// Small, hand-maintained duplicate of the frontend's role/skill taxonomy (src/data/roles.js) —
// not worth cross-project importing JS into this TS project for a handful of keyword lists.
const KNOWN_SKILLS = [
  'Kotlin', 'Java', 'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'Spring Boot', 'SQL',
  'MongoDB', 'AWS', 'Docker', 'Kubernetes', 'Terraform', 'Machine Learning', 'TensorFlow', 'PyTorch',
  'Pandas', 'Android SDK', 'Jetpack Compose', 'REST APIs', 'Git', 'C++', 'Unity', 'HTML', 'CSS',
  'CI/CD', 'Linux', 'Kafka', 'Power BI', 'Excel', 'Firebase',
];

const ROLE_HINTS: [string, string[]][] = [
  ['android', ['android', 'kotlin']],
  ['ml', ['machine learning', 'data scientist', 'ai engineer', 'pytorch', 'tensorflow', 'ml engineer']],
  ['data', ['data analyst', 'data analytics', 'business analyst']],
  ['cloud', ['devops', 'cloud engineer', 'site reliability', 'sre ', 'kubernetes engineer']],
  ['game', ['game developer', 'unity developer', 'unreal', 'gameplay']],
  ['backend', ['backend', 'java developer', 'node developer', 'spring boot', 'api developer']],
];

function classifyRole(title: string): string {
  const t = title.toLowerCase();
  for (const [roleId, hints] of ROLE_HINTS) {
    if (hints.some((h) => t.includes(h))) return roleId;
  }
  return 'fullstack';
}

function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  return KNOWN_SKILLS.filter((s) => lower.includes(s.toLowerCase())).slice(0, 6);
}

interface AdzunaJob {
  id: string;
  title: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  salary_min?: number;
  salary_max?: number;
  created: string;
  redirect_url: string;
  description?: string;
  contract_time?: string;
}

export interface NormalizedJob {
  id: string;
  company: string;
  title: string;
  roleId: string;
  location: string;
  mode: string;
  exp: string;
  salary: string;
  posted: number;
  applicants: null;
  source: string;
  skills: string[];
  type: string;
  closesIn: null;
  applyUrl: string;
}

// Real listings from Adzuna's free-tier job search API (India). Fields Adzuna doesn't provide
// (applicant counts, precise experience band) are left null/estimated from the title rather than
// invented, so nothing here presents a fabricated number as if it were a real one.
export async function fetchAdzunaJobs(): Promise<NormalizedJob[]> {
  const raw = await getSecret(process.env.ADZUNA_SECRET_NAME as string);
  const { app_id: appId, app_key: appKey } = JSON.parse(raw) as { app_id: string; app_key: string };
  const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=25&what=software%20developer&content-type=application/json`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Adzuna request failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { results: AdzunaJob[] };

  return (data.results || []).map((j) => {
    const text = `${j.title} ${j.description || ''}`;
    const postedDays = Math.max(0, Math.round((Date.now() - new Date(j.created).getTime()) / 86400000));
    const salary = j.salary_min && j.salary_max
      ? `₹${Math.round(j.salary_min / 1000)}k - ₹${Math.round(j.salary_max / 1000)}k / yr`
      : 'Not disclosed';
    return {
      id: `adzuna-${j.id}`,
      company: j.company?.display_name || 'Unknown company',
      title: j.title,
      roleId: classifyRole(j.title),
      location: j.location?.display_name || 'India',
      mode: /remote/i.test(text) ? 'Remote' : /hybrid/i.test(text) ? 'Hybrid' : 'On-site',
      exp: /senior|lead|principal/i.test(j.title) ? '5+ yrs' : /intern/i.test(j.title) ? 'Intern' : '0-3 yrs',
      salary,
      posted: postedDays,
      applicants: null,
      source: 'Adzuna',
      skills: extractSkills(text),
      type: j.contract_time === 'part_time' ? 'Part-time' : /intern/i.test(j.title) ? 'Internship' : 'Full-time',
      closesIn: null,
      applyUrl: j.redirect_url,
    };
  });
}
