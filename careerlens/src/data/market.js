// This file is the MOCK/OFFLINE fallback data (fictional companies) — used when VITE_USE_MOCK is
// true, or when the real feed in api/market.js fails and falls back here. In real mode, jobs and
// news/layoff headlines come from Adzuna and GNews respectively (see careerlens-backend's
// lambda/market/*). Placements, hiring-trend index and micro-gigs have no public data source and
// stay illustrative always — never present them as real statistics.
import { lastNMonths } from '../utils/dates'

export const SAMPLE_NOTE = 'Sample data with fictional companies, shown only as a fallback or when running in demo/mock mode.'

const j = (id, company, title, roleId, location, mode, exp, salary, posted, applicants, source, skills, type = 'Full-time', closesIn = null) => ({
  id, company, title, roleId, location, mode, exp, salary, posted, applicants, source, skills, type, closesIn,
})

// posted = days ago
export const JOBS = [
  j('j1', 'Nimbus Labs', 'Android Developer', 'android', 'Bengaluru', 'Hybrid', '0-2 yrs', '8-14 LPA', 1, 38, 'LinkedIn', ['Kotlin', 'Jetpack Compose', 'Room DB', 'REST APIs']),
  j('j2', 'PixelForge Studios', 'Junior Android Developer', 'android', 'Pune', 'On-site', '0-1 yrs', '5-9 LPA', 3, 112, 'Company site', ['Kotlin', 'Android SDK', 'Firebase']),
  j('j3', 'CloudKart', 'Full Stack Developer', 'fullstack', 'Hyderabad', 'Hybrid', '0-2 yrs', '7-15 LPA', 2, 205, 'Naukri', ['React', 'Node.js', 'TypeScript', 'MongoDB']),
  j('j4', 'Orbit Systems', 'Backend Engineer (Java)', 'backend', 'Chennai', 'On-site', '2-5 yrs', '14-26 LPA', 6, 143, 'LinkedIn', ['Java', 'Spring Boot', 'Kafka', 'SQL']),
  j('j5', 'Dhanam Fintech', 'Data Analyst', 'data', 'Mumbai', 'Hybrid', '0-2 yrs', '6-11 LPA', 1, 64, 'Foundit', ['SQL', 'Python', 'Power BI']),
  j('j6', 'Vega AI', 'ML Engineer', 'ml', 'Bengaluru', 'Remote', '1-3 yrs', '14-28 LPA', 4, 320, 'LinkedIn', ['Python', 'PyTorch', 'MLOps']),
  j('j7', 'Stratus Cloud', 'DevOps Engineer', 'cloud', 'Pune', 'Hybrid', '2-5 yrs', '12-24 LPA', 2, 41, 'Naukri', ['AWS', 'Terraform', 'Kubernetes', 'CI/CD']),
  j('j8', 'NovaPixel Games', 'Technical Artist - Tools', 'game', 'Bengaluru', 'Hybrid', '0-3 yrs', '9-18 LPA', 5, 27, 'Company site', ['Python', 'Unity', '3D Math'], 'Full-time', 20),
  j('j9', 'Kirana Cloud', 'Android Engineer', 'android', 'Gurugram', 'Hybrid', '1-3 yrs', '10-18 LPA', 9, 176, 'LinkedIn', ['Kotlin', 'Compose', 'Testing']),
  j('j10', 'Helio Health', 'Android Intern', 'android', 'Remote', 'Remote', 'Intern', '25-35k / mo', 2, 89, 'Internshala', ['Kotlin', 'Android SDK'], 'Internship', 9),
  j('j11', 'Tapstack', 'Cloud Support Engineer', 'cloud', 'Bengaluru', 'On-site', '0-2 yrs', '6-10 LPA', 1, 22, 'Company site', ['AWS', 'Linux', 'Networking']),
  j('j12', 'Zenith Pay', 'Backend Engineer', 'backend', 'Bengaluru', 'Hybrid', '0-2 yrs', '10-18 LPA', 7, 260, 'LinkedIn', ['Java', 'SQL', 'Docker']),
  j('j13', 'BharatBooks', 'Frontend Developer', 'fullstack', 'Remote', 'Remote', '0-1 yrs', '5-9 LPA', 12, 410, 'Naukri', ['React', 'JavaScript', 'HTML/CSS']),
  j('j14', 'Quantile Analytics', 'Junior Data Scientist', 'ml', 'Gurugram', 'Hybrid', '0-2 yrs', '9-15 LPA', 3, 198, 'LinkedIn', ['Python', 'Machine Learning', 'Statistics']),
  j('j15', 'ArcadeWorks', 'Unity Gameplay Developer', 'game', 'Hyderabad', 'On-site', '0-2 yrs', '6-12 LPA', 8, 58, 'Company site', ['Unity', 'C++', '3D Math']),
  j('j16', 'Lumen Retail', 'DevOps Trainee', 'cloud', 'Kochi', 'On-site', 'Fresher', '4-6 LPA', 2, 31, 'Campus portal', ['Linux', 'Docker', 'AWS'], 'Full-time', 12),
  j('j17', 'Finlytics', 'Android Developer', 'android', 'Bengaluru', 'Hybrid', '0-2 yrs', '9-16 LPA', 15, 240, 'Naukri', ['Kotlin', 'Compose', 'Hilt']),
  j('j18', 'Mango Mobility', 'SDE-1 (Mobile)', 'android', 'Bengaluru', 'On-site', '0-2 yrs', '12-20 LPA', 22, 388, 'Company site', ['Kotlin', 'Java', 'DSA']),
]

export const LAYOFFS = [
  { id: 'l1', company: 'Zentra Systems', sector: 'IT Services', daysAgo: 4, employees: 1200, pct: 8, roles: ['Java Dev', 'QA', 'Support'], note: 'Restructuring of legacy maintenance contracts.' },
  { id: 'l2', company: 'ShopSphere', sector: 'E-commerce', daysAgo: 9, employees: 450, pct: 6, roles: ['Marketing', 'Ops', 'Support'], note: 'Focus shift to profitability.' },
  { id: 'l3', company: 'Cobalt Cloud', sector: 'SaaS', daysAgo: 15, employees: 210, pct: 12, roles: ['Sales', 'Frontend'], note: 'Reduced runway, reprioritised roadmap.' },
  { id: 'l4', company: 'PayNest', sector: 'Fintech', daysAgo: 21, employees: 320, pct: 10, roles: ['Backend', 'Risk', 'Ops'], note: 'Regulatory pause on a product line.' },
  { id: 'l5', company: 'Learnly', sector: 'EdTech', daysAgo: 27, employees: 600, pct: 15, roles: ['Content', 'Sales', 'Tech'], note: 'Post-pandemic demand normalisation.' },
  { id: 'l6', company: 'DriveMate', sector: 'Mobility', daysAgo: 38, employees: 180, pct: 7, roles: ['Android', 'Ops'], note: 'Merged two product teams.' },
  { id: 'l7', company: 'MetaMart', sector: 'Retail Tech', daysAgo: 45, employees: 90, pct: 5, roles: ['Data', 'Design'], note: 'Automation of reporting workflows.' },
  { id: 'l8', company: 'Aster Labs', sector: 'AI Startup', daysAgo: 52, employees: 60, pct: 20, roles: ['Research', 'Ops'], note: 'Funding round delayed.' },
]

export const LAYOFF_BY_SECTOR = [
  { sector: 'IT Services', affected: 1700 }, { sector: 'EdTech', affected: 900 }, { sector: 'E-commerce', affected: 780 },
  { sector: 'Fintech', affected: 610 }, { sector: 'SaaS', affected: 380 }, { sector: 'Mobility', affected: 260 },
]

export const NEWS = [
  { id: 'n1', tag: 'Hiring', tone: 'good', title: 'Cloud and DevOps openings keep growing while supply stays thin', summary: 'Sample insight: entry-level cloud roles show the lowest applicants-per-opening among core engineering tracks.', daysAgo: 1, source: 'CareerLens Sample Desk' },
  { id: 'n2', tag: 'AI', tone: 'warn', title: 'Companies ask freshers to show real projects, not just certificates', summary: 'Sample insight: recruiters report shortlisting on proof-of-work such as deployed apps and repositories.', daysAgo: 2, source: 'CareerLens Sample Desk' },
  { id: 'n3', tag: 'Layoffs', tone: 'bad', title: 'Mid-size IT services firms trim maintenance teams', summary: 'Sample insight: legacy support and manual QA roles see most cuts; automation skills are in demand.', daysAgo: 4, source: 'CareerLens Sample Desk' },
  { id: 'n4', tag: 'Campus', tone: 'good', title: 'Tier-2 campus drives grow as companies widen hiring pools', summary: 'Sample insight: more product companies are visiting non-IIT campuses and running online assessments.', daysAgo: 5, source: 'CareerLens Sample Desk' },
  { id: 'n5', tag: 'Skills', tone: 'good', title: 'Kotlin and Compose now standard in Android job descriptions', summary: 'Sample insight: XML-only experience is increasingly seen as a gap for new Android roles.', daysAgo: 6, source: 'CareerLens Sample Desk' },
  { id: 'n6', tag: 'Market', tone: 'warn', title: 'Application volume per opening has risen sharply this quarter', summary: 'Sample insight: early applicants and referrals see higher response rates on crowded roles.', daysAgo: 8, source: 'CareerLens Sample Desk' },
  { id: 'n7', tag: 'Policy', tone: 'good', title: 'Apprenticeship and skilling programmes expand for engineering graduates', summary: 'Sample insight: stipend-based apprenticeships give a route into companies that do not hire freshers directly.', daysAgo: 10, source: 'CareerLens Sample Desk' },
  { id: 'n8', tag: 'Salaries', tone: 'warn', title: 'Fresher offer packages flat while experienced cloud roles rise', summary: 'Sample insight: skill premium is widening between generic and specialised profiles.', daysAgo: 12, source: 'CareerLens Sample Desk' },
]

// Real, cited figures (India Skills Report 2025 — Wheebox, with CII, AICTE, AIU and UNDP) rather
// than illustrative sample data. "employability" is that report's own skill-assessment measure
// (share of assessed graduates found employable), NOT a campus placement rate — no public dataset
// breaks actual placement % down by college tier, so this app doesn't claim one. Update these
// numbers when a newer edition of the report publishes fresh figures.
export const PLACEMENTS = {
  byTier: [
    { tier: 'Tier 1 (IITs / NITs / IIITs)', employability: 48.4 },
    { tier: 'Tier 2 (state & reputed private)', employability: 46.1 },
    { tier: 'Tier 3 (other private)', employability: 43.4 },
  ],
  note: "Employability % is the India Skills Report 2025's own skill-assessment score by college tier, not each tier's actual campus placement rate — no public dataset reports that by tier.",
}

export const HIRING_TREND = lastNMonths(12).map((m, i) => ({
  month: m,
  Fullstack: [100, 98, 92, 96, 99, 101, 100, 98, 97, 96, 95, 95][i],
  Cloud: [100, 103, 104, 108, 112, 115, 119, 124, 128, 133, 138, 142][i],
  ML: [100, 104, 108, 110, 115, 119, 121, 126, 130, 135, 139, 144][i],
  Android: [100, 99, 97, 98, 100, 102, 103, 104, 105, 106, 107, 108][i],
}))

// Micro-gigs: small paid tasks from startups (innovation feature)
export const GIGS = [
  { id: 'g1', company: 'PixelForge Studios', title: 'Build a Compose UI for a 3-screen onboarding flow', skill: 'Jetpack Compose', hours: 8, reward: 4500, level: 'Beginner', slots: 3 },
  { id: 'g2', company: 'Stratus Cloud', title: 'Write Terraform module for a VPC with 2 subnets', skill: 'Terraform', hours: 10, reward: 6000, level: 'Intermediate', slots: 2 },
  { id: 'g3', company: 'Dhanam Fintech', title: 'Clean and visualise a 50k-row transactions dataset', skill: 'Pandas', hours: 12, reward: 5500, level: 'Beginner', slots: 4 },
  { id: 'g4', company: 'NovaPixel Games', title: 'Prototype a Python script that turns a PNG into a normal map', skill: 'Python', hours: 14, reward: 8000, level: 'Intermediate', slots: 2 },
  { id: 'g5', company: 'CloudKart', title: 'Add unit tests to a Node.js checkout service', skill: 'Testing', hours: 6, reward: 3500, level: 'Beginner', slots: 5 },
]
