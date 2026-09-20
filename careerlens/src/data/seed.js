// Seed data for the 3 demo accounts. This is the "database" for the POC (persisted in localStorage).
// The shape of each record mirrors what the real backend (DynamoDB) should return.
import { iso, uid } from '../utils/dates'
import { TEMPLATES } from './roadmapTemplates'

const sk = (name, level, verified = false) => ({ name, level, verified })

// ---------- roadmap builder ----------
function buildRoadmap(templateKey, startDaysAgo, roleId) {
  const t = TEMPLATES[templateKey]
  const start = -startDaysAgo
  const dayOf = (months) => Math.round(months * 30.4)
  const phases = t.phases.map((p) => ({
    ...p,
    milestones: p.milestones.map((m, i, arr) => {
      const due = start + dayOf(p.span[0] + ((p.span[1] - p.span[0]) * (i + 1)) / arr.length)
      const done = t.doneIds.includes(m.id)
      return { ...m, due: iso(due), done, doneAt: done ? iso(Math.min(due, -1)) : null }
    }),
  }))
  return {
    templateKey,
    goal: { roleId, title: t.title, company: t.company, months: t.months, startDate: iso(start), deadline: iso(start + dayOf(t.months)) },
    phases,
    replans: 0,
  }
}

// ---------- applications builder ----------
const app = (company, role, source, status, daysAgo, extra = {}) => ({
  id: uid('app'), company, role, source, status, date: iso(-daysAgo), ...extra,
})

const ananyaApps = [
  app('Nimbus Labs', 'Android Developer', 'LinkedIn', 'APPLIED', 2),
  app('PixelForge Studios', 'Junior Android Dev', 'Company site', 'APPLIED', 3),
  app('Orbit Apps', 'SDE Mobile', 'Naukri', 'APPLIED', 5),
  app('Kirana Cloud', 'Android Engineer', 'LinkedIn', 'APPLIED', 9),
  app('ByteBazaar', 'Mobile Developer', 'Naukri', 'APPLIED', 16),
  app('Zenith Pay', 'Android Intern', 'Internshala', 'APPLIED', 18),
  app('Lumen Health', 'Android Dev', 'Referral', 'APPLIED', 20),
  app('Mango Mobility', 'SDE-1 Android', 'Company site', 'APPLIED', 22),
  app('CodeNest', 'Android Dev', 'LinkedIn', 'SCREENING', 8),
  app('Tapstack', 'Mobile SDE', 'Company site', 'SCREENING', 10),
  app('SkyBridge Tech', 'Android Engineer', 'LinkedIn', 'INTERVIEW', 12, { interviewDate: iso(2) }),
  app('Finlytics', 'Android Dev', 'Naukri', 'INTERVIEW', 15, { interviewDate: iso(6) }),
  app('Vertex Soft', 'Junior Developer', 'Naukri', 'REJECTED', 25, { reason: 'Needs 2+ years of experience' }),
  app('Quantum Pay', 'SDE-1', 'LinkedIn', 'REJECTED', 28, { reason: 'System design round' }),
  app('Bharat Apps', 'Android Dev', 'Company site', 'REJECTED', 30, { reason: 'No response after screening' }),
  app('Helix Robotics', 'Software Engineer', 'Naukri', 'REJECTED', 33, { reason: 'DSA / coding round' }),
]

const vikramApps = [
  app('Stratus Cloud', 'DevOps Engineer', 'Naukri', 'INTERVIEW', 6, { interviewDate: iso(3) }),
  app('Tapstack', 'Cloud Support Engineer', 'Company site', 'SCREENING', 9),
  app('Orbit Systems', 'Backend Engineer', 'LinkedIn', 'SCREENING', 11),
  app('CloudKart', 'Platform Engineer', 'LinkedIn', 'APPLIED', 2),
  app('Dhanam Fintech', 'Senior Backend Engineer', 'Foundit', 'APPLIED', 4),
  app('Vega AI', 'ML Platform Engineer', 'LinkedIn', 'APPLIED', 6),
  app('Lumen Retail', 'Cloud Engineer', 'Naukri', 'APPLIED', 19),
  app('Zenith Pay', 'Backend Engineer', 'LinkedIn', 'APPLIED', 21),
  app('Kirana Cloud', 'SRE', 'LinkedIn', 'APPLIED', 24),
  app('Quantile Analytics', 'Data Platform Eng', 'Naukri', 'APPLIED', 26),
  app('Helio Health', 'Backend Lead', 'Referral', 'APPLIED', 17),
  app('Nimbus Labs', 'Cloud Architect', 'LinkedIn', 'REJECTED', 30, { reason: 'No cloud certification' }),
  app('Arcadia Tech', 'DevOps Engineer', 'Naukri', 'REJECTED', 32, { reason: 'Needs Kubernetes production experience' }),
  app('ShopSphere', 'Backend Engineer', 'Company site', 'REJECTED', 35, { reason: 'Position filled' }),
  app('Bharat Apps', 'SRE', 'LinkedIn', 'REJECTED', 38, { reason: 'Needs Terraform experience' }),
  app('DriveMate', 'Cloud Engineer', 'Naukri', 'REJECTED', 41, { reason: 'No response after screening' }),
]

// ---------- accounts ----------
export const SEED = {
  ananya: {
    account: {
      id: 'ananya', email: 'ananya@demo.in', password: 'demo123', name: 'Ananya Iyer', role: 'fresher',
      title: 'Engineering Graduate', color: '#5b5fef',
      blurb: 'Final-year CSE student, Tier-2 college. Strong Android skills, on track for her 8-month goal.',
      college: 'Nandi Institute of Technology, Mysuru', location: 'Mysuru, Karnataka',
    },
    profile: {
      headline: 'Aspiring Android Developer | Kotlin | Jetpack Compose',
      about: 'Final-year B.E. Computer Science student who loves building mobile apps. I have built and published small Compose apps, and I am preparing for Android roles at product companies.',
      targetRoleId: 'android',
      education: [{ id: uid('edu'), school: 'Nandi Institute of Technology, Mysuru', degree: 'B.E. Computer Science', year: '2023 - 2027', score: '8.4 CGPA' }],
      experience: [{ id: uid('exp'), company: 'CampusDev Club', role: 'Android Lead (volunteer)', from: '2025', to: 'Present', summary: 'Led a team of 5 building college utility apps used by 1,200 students.' }],
      skills: [
        sk('Kotlin', 72, true), sk('Java', 80, true), sk('Android SDK', 62, true), sk('Jetpack Compose', 48), sk('Git', 75, true),
        sk('SQL', 65), sk('DSA', 68, true), sk('REST APIs', 60), sk('Firebase', 55), sk('Room DB', 50), sk('Testing', 30),
        sk('System Design', 25), sk('Python', 60), sk('3D Math', 40), sk('Computer Vision', 35),
      ],
      certifications: [
        { id: uid('c'), name: 'Kotlin for Android Developers', issuer: 'Coursera', date: '2026-05', status: 'earned' },
        { id: uid('c'), name: 'AWS Cloud Practitioner', issuer: 'AWS', date: '2026-08', status: 'earned' },
        { id: uid('c'), name: 'Meta Android Developer Certificate', issuer: 'Coursera', date: '2026-11', status: 'in-progress' },
      ],
      projects: [
        { id: uid('p'), name: 'WeatherNow', description: 'Weather app built with Jetpack Compose, Retrofit and Room caching. 300+ downloads on internal testing.', tech: ['Kotlin', 'Jetpack Compose', 'Retrofit', 'Room'], domains: ['mobile', 'api', 'ui'], link: 'github.com/ananya/weathernow' },
        { id: uid('p'), name: 'CampusConnect', description: 'Realtime chat app for college clubs using Firebase auth and Firestore.', tech: ['Kotlin', 'Firebase', 'MVVM'], domains: ['mobile', 'realtime', 'chat'], link: 'github.com/ananya/campusconnect' },
        { id: uid('p'), name: 'Img2Asset', description: 'Converts a single image into a textured 3D game asset using depth estimation and Three.js preview.', tech: ['Python', 'OpenCV', 'Three.js'], domains: ['game-dev', '3d', 'computer-vision', 'python', 'pipeline'], link: 'github.com/ananya/img2asset' },
      ],
      external: {
        leetcode: { handle: 'ananya_codes', solved: 132, easy: 70, medium: 54, hard: 8, rating: 1512, streak: 12 },
        github: { handle: 'ananya-iyer', repos: 18, commits: 640, stars: 24 },
        codeforces: { handle: 'ananya_cf', rating: 1104, maxRating: 1180, contests: 9 },
        hackerrank: { handle: 'ananya_hr', stars: 4 },
      },
      resume: { fileName: 'Ananya_Iyer_Resume.pdf', uploadedAt: iso(-12), sizeKb: 262 },
    },
    roadmap: buildRoadmap('android-google', 100, 'android'),
    applications: ananyaApps,
    interviews: [
      { id: uid('mi'), role: 'android', roleTitle: 'Android Developer', date: iso(-9), score: 61, mode: 'technical' },
      { id: uid('mi'), role: 'android', roleTitle: 'Android Developer', date: iso(-3), score: 72, mode: 'technical' },
    ],
    solvedQuestions: ['a1', 'a2', 'a3', 'a5'],
    savedJobs: ['j1', 'j8'],
    history: {
      readiness: [38, 44, 49, 55, 60, 66],
      weeklyHours: [6, 9, 11, 8, 12, 14, 13, 15],
      weeklySolved: [4, 9, 6, 11, 13, 8, 15, 12],
    },
    notifications: [
      { id: uid('n'), title: 'Interview in 2 days', desc: 'SkyBridge Tech - Android Engineer', tone: 'good', time: '2h ago' },
      { id: uid('n'), title: '4 applications with no reply for 14+ days', desc: 'Send follow-ups to stay on the recruiter radar.', tone: 'warn', time: '5h ago' },
      { id: uid('n'), title: 'New matching opening', desc: 'Nimbus Labs posted an Android Developer role (92% match).', tone: 'info', time: '1d ago' },
    ],
    votes: {},
  },

  vikram: {
    account: {
      id: 'vikram', email: 'vikram@demo.in', password: 'demo123', name: 'Vikram Rao', role: 'experienced',
      title: 'Backend Engineer (4.5 yrs)', color: '#6366f1',
      blurb: 'Laid off after 4.5 years in IT services. Pivoting from Java backend to Cloud / DevOps. Behind schedule.',
      college: 'Tier-3 engineering college, Hyderabad', location: 'Hyderabad, Telangana',
    },
    profile: {
      headline: 'Java Backend Engineer pivoting to Cloud / DevOps',
      about: '4.5 years building Java and Spring Boot services for banking clients at an IT services firm. Impacted by a layoff and now reskilling toward AWS, Kubernetes and Terraform.',
      targetRoleId: 'cloud',
      education: [{ id: uid('edu'), school: 'JNTU affiliated engineering college, Hyderabad', degree: 'B.Tech Information Technology', year: '2017 - 2021', score: '7.1 CGPA' }],
      experience: [
        { id: uid('exp'), company: 'Zentra Systems', role: 'Software Engineer', from: '2022', to: '2026', summary: 'Built and maintained Java/Spring Boot APIs for a banking client; led migration of 3 services to Docker.' },
        { id: uid('exp'), company: 'Zentra Systems', role: 'Graduate Trainee', from: '2021', to: '2022', summary: 'Joined via campus hiring; trained on Java, SQL and support processes.' },
      ],
      skills: [
        sk('Java', 90, true), sk('Spring Boot', 85, true), sk('SQL', 80, true), sk('REST APIs', 82), sk('System Design', 62),
        sk('Docker', 66, true), sk('AWS', 48), sk('Kubernetes', 34), sk('Terraform', 30), sk('CI/CD', 55), sk('Linux', 68),
        sk('Python', 50), sk('Kafka', 45), sk('Git', 78), sk('Testing', 60), sk('Networking', 40),
      ],
      certifications: [
        { id: uid('c'), name: 'AWS Cloud Practitioner', issuer: 'AWS', date: '2026-07', status: 'earned' },
        { id: uid('c'), name: 'AWS Solutions Architect Associate', issuer: 'AWS', date: '2026-12', status: 'in-progress' },
        { id: uid('c'), name: 'Certified Kubernetes Administrator', issuer: 'CNCF', date: '2027-03', status: 'planned' },
      ],
      projects: [
        { id: uid('p'), name: 'Terraform AWS Starter', description: 'Terraform modules that provision a VPC, ECS service and RDS with remote state.', tech: ['Terraform', 'AWS', 'ECS'], domains: ['cloud', 'iac', 'devops'], link: 'github.com/vikram/tf-starter' },
        { id: uid('p'), name: 'CI/CD for Spring services', description: 'GitHub Actions pipeline with tests, Docker build and blue-green deploy.', tech: ['GitHub Actions', 'Docker', 'Spring Boot'], domains: ['cicd', 'devops', 'backend'], link: 'github.com/vikram/cicd-demo' },
      ],
      external: {
        leetcode: { handle: 'vikram_r', solved: 210, easy: 110, medium: 90, hard: 10, rating: 1620, streak: 3 },
        github: { handle: 'vikram-rao', repos: 26, commits: 1180, stars: 41 },
        codeforces: { handle: '', rating: 0, maxRating: 0, contests: 0 },
        hackerrank: { handle: 'vikram_hr', stars: 5 },
      },
      resume: { fileName: 'Vikram_Rao_CV.pdf', uploadedAt: iso(-40), sizeKb: 241 },
    },
    roadmap: buildRoadmap('cloud-pivot', 90, 'cloud'),
    applications: vikramApps,
    interviews: [{ id: uid('mi'), role: 'cloud', roleTitle: 'Cloud / DevOps Engineer', date: iso(-6), score: 54, mode: 'technical' }],
    solvedQuestions: ['c1'],
    savedJobs: ['j7', 'j11'],
    history: {
      readiness: [52, 51, 55, 57, 58, 60],
      weeklyHours: [10, 8, 4, 5, 3, 6, 4, 5],
      weeklySolved: [12, 6, 2, 3, 1, 4, 2, 3],
    },
    notifications: [
      { id: uid('n'), title: 'You are behind your roadmap', desc: 'Kubernetes fundamentals is overdue. Re-plan to get back on track.', tone: 'bad', time: '1h ago' },
      { id: uid('n'), title: 'Interview in 3 days', desc: 'Stratus Cloud - DevOps Engineer', tone: 'good', time: '3h ago' },
      { id: uid('n'), title: 'Layoff alert for your former sector', desc: 'IT Services saw new layoffs; cloud roles keep growing.', tone: 'info', time: '1d ago' },
    ],
    votes: {},
  },

  novapixel: {
    account: {
      id: 'novapixel', email: 'hr@novapixel.demo', password: 'demo123', name: 'Meera Nair', role: 'company',
      title: 'Talent Lead, NovaPixel Games', color: '#f59e0b',
      blurb: 'Recruiter at a game studio. Uses project-to-role matching and blind screening to find talent faster.',
      college: '', location: 'Bengaluru, Karnataka',
    },
    company: {
      name: 'NovaPixel Games', industry: 'Game Development', size: '120 employees', location: 'Bengaluru',
      about: 'Indie-to-AA game studio building mobile and PC titles. Hiring for tooling and gameplay.',
      roles: [
        {
          id: 'r1', title: 'Technical Artist - Tools', roleId: 'game', openings: 2, applicants: 27, posted: iso(-5),
          domains: ['game-dev', '3d', 'pipeline', 'python', 'computer-vision'],
          skills: [{ name: 'Python', need: 60, weight: 3 }, { name: '3D Math', need: 55, weight: 3 }, { name: 'Unity', need: 50, weight: 2 }, { name: 'Computer Vision', need: 30, weight: 1 }, { name: 'Git', need: 50, weight: 1 }],
        },
        {
          id: 'r2', title: 'Unity Gameplay Developer', roleId: 'game', openings: 3, applicants: 58, posted: iso(-11),
          domains: ['game-dev', 'gameplay', 'mobile', 'unity'],
          skills: [{ name: 'Unity', need: 70, weight: 3 }, { name: 'C++', need: 55, weight: 2 }, { name: '3D Math', need: 55, weight: 2 }, { name: 'DSA', need: 55, weight: 1 }, { name: 'Git', need: 50, weight: 1 }],
        },
      ],
      funnel: [
        { stage: 'Applied', count: 85 }, { stage: 'Resume screened', count: 48 }, { stage: 'Skill matched', count: 26 },
        { stage: 'Interviewed', count: 11 }, { stage: 'Offered', count: 3 },
      ],
      timeToShortlist: [9, 8, 7, 6, 5, 4],
    },
    candidates: [
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
    ],
    shortlist: [],
    notifications: [
      { id: uid('n'), title: '3 high-match candidates for Technical Artist', desc: 'All have relevant 3D pipeline projects.', tone: 'good', time: '1h ago' },
      { id: uid('n'), title: 'Blind screening is ON', desc: 'Names and colleges are hidden until you shortlist.', tone: 'info', time: '1d ago' },
    ],
    votes: {},
  },
}

export const DEMO_ACCOUNTS = Object.values(SEED).map((s) => s.account)
