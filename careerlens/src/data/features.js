// Innovation Lab: ideas aimed at the "10 lakh graduates, ~1 lakh openings" problem.
// status: 'live' = interactive demo in this POC | 'prototype' = partial preview | 'concept' = idea card
export const FEATURES = [
  {
    id: 'pivot', title: 'Career Pivot Finder', emoji: '🧭', status: 'live', impact: 'Reduces competition',
    tagline: 'Find adjacent roles where you are already 70% ready and fewer people are applying.',
    problem: 'Everyone chases the same 3 roles (full stack, backend, data), so competition is 10:1 or worse.',
    how: 'Compares your skills to every role, then weighs match against applicants-per-opening.',
    aws: ['SageMaker (embeddings)', 'DynamoDB', 'Lambda'],
  },
  {
    id: 'gap', title: 'Reality Gap Explorer', emoji: '🗺️', status: 'live', impact: 'Data-led decisions',
    tagline: 'See where graduates pile up and where real demand is, by role.',
    problem: 'Students choose careers by hype, not by demand vs supply.',
    how: 'Shows graduates trained vs openings for each role with a competition ratio.',
    aws: ['Amazon QuickSight', 'S3 + Athena', 'Glue'],
  },
  {
    id: 'gigs', title: 'Micro-Gigs Proof-of-Work', emoji: '💸', status: 'live', impact: 'Experience without a job',
    tagline: 'Paid mini-tasks from startups that become verified experience in your roadmap.',
    problem: 'Freshers cannot get a job without experience, and cannot get experience without a job.',
    how: 'Companies post 6-14 hour tasks; completing one adds a verified experience milestone.',
    aws: ['Step Functions', 'DynamoDB', 'SES', 'Comprehend (task review)'],
  },
  {
    id: 'mentor', title: 'Vernacular AI Mentor', emoji: '🗣️', status: 'live', impact: 'Reach tier-2 / tier-3',
    tagline: 'Guidance in Hindi, Tamil, Telugu and Kannada, by text and voice.',
    problem: 'Great advice exists mostly in English; many students think and learn in their own language.',
    how: 'Translates roadmap nudges and mock-interview feedback and reads them aloud.',
    aws: ['Amazon Translate', 'Polly', 'Transcribe'],
  },
  {
    id: 'shield', title: 'Layoff & Automation Shield', emoji: '🛡️', status: 'live', impact: 'Future-proofing',
    tagline: 'A resilience score per role plus a reskilling path if your role is at risk.',
    problem: 'Students and laid-off professionals do not know which skills are safe to invest in.',
    how: 'Combines layoff signals, demand growth and automation risk into one score.',
    aws: ['Comprehend', 'SageMaker (risk model)', 'EventBridge (news ingest)'],
  },
  {
    id: 'circles', title: 'Rejection Circles', emoji: '🔁', status: 'prototype', impact: 'Answers "why rejected?"',
    tagline: 'Anonymous, pooled rejection data reveals what actually filters candidates out per company.',
    problem: 'Nobody tells candidates why they were rejected, so they repeat the same mistakes.',
    how: 'Users log outcomes anonymously; patterns like "DSA round" or "no cloud skills" surface per company type.',
    aws: ['DynamoDB', 'Comprehend (PII masking)', 'Macie'],
  },
  {
    id: 'passport', title: 'Verified Skill Passport', emoji: '🪪', status: 'prototype', impact: 'Hire by proof',
    tagline: 'A shareable profile where every skill is backed by evidence: repos, tests and certificates.',
    problem: 'Recruiters cannot trust self-declared skills; talented students from lesser-known colleges are ignored.',
    how: 'Skills get a "verified" badge from code analysis, timed assessments or Credly badges.',
    aws: ['Cognito', 'Lambda', 'S3', 'CodeGuru (code review)'],
  },
  {
    id: 'challenges', title: 'Employer Skill Challenges', emoji: '🏆', status: 'concept', impact: 'Removes college bias',
    tagline: 'Companies post real problems; top solvers get fast-tracked to interviews, regardless of college.',
    problem: 'College tier decides who is even looked at. Skill should decide.',
    how: 'Auto-graded challenges with blind ranking; companies see scores, not pedigree.',
    aws: ['CodeBuild (sandbox)', 'Lambda', 'DynamoDB', 'API Gateway'],
  },
  {
    id: 'campus', title: 'Campus Bridge Dashboard', emoji: '🏫', status: 'concept', impact: 'Scales through colleges',
    tagline: 'A placement-cell dashboard that shows a whole batch readiness and who needs help.',
    problem: 'Tier-2/3 placement cells have no data on their students until it is too late.',
    how: 'Aggregates anonymised readiness, skill gaps and roadmap progress per batch.',
    aws: ['QuickSight', 'Cognito (tenants)', 'Lake Formation'],
  },
  {
    id: 'referral', title: 'Referral Radar', emoji: '📡', status: 'concept', impact: 'Warm intros',
    tagline: 'Finds alumni and mentors at your target companies and drafts a respectful referral request.',
    problem: 'Referrals massively raise response rates but freshers have no network.',
    how: 'Opt-in alumni graph plus AI-drafted outreach messages.',
    aws: ['Neptune', 'Personalize', 'SES'],
  },
  {
    id: 'buddy', title: 'Interview Buddy Rooms', emoji: '🤝', status: 'concept', impact: 'Free peer practice',
    tagline: 'Match with a peer targeting the same role and run scored mock interviews for each other.',
    problem: 'Quality mock interviews are expensive and rare.',
    how: 'Matchmaking by role and level; AI provides the rubric and notes.',
    aws: ['Chime SDK', 'Transcribe', 'Comprehend (rubric scoring)'],
  },
  {
    id: 'schemes', title: 'Apprenticeship & Scheme Finder', emoji: '🏛️', status: 'concept', impact: 'Alternate on-ramps',
    tagline: 'Surfaces stipend-based apprenticeships and skilling programmes matching your profile.',
    problem: 'Many students never hear about programmes that could bridge them into work.',
    how: 'Curated programme catalogue matched to profile and location.',
    aws: ['OpenSearch', 'Kendra'],
  },
]

export const MENTOR_SAMPLES = {
  English: 'Your roadmap is 42% complete. Finish the Jetpack Compose project this week to stay on track.',
  'हिन्दी': 'आपका रोडमैप 42% पूरा हो चुका है। ट्रैक पर रहने के लिए इस हफ्ते Jetpack Compose प्रोजेक्ट पूरा करें।',
  'தமிழ்': 'உங்கள் ரோட்மேப் 42% முடிந்துள்ளது. இந்த வாரம் Jetpack Compose திட்டத்தை முடிக்கவும்.',
  'తెలుగు': 'మీ రోడ్‌మ్యాప్ 42% పూర్తయింది. ఈ వారం Jetpack Compose ప్రాజెక్ట్‌ను పూర్తి చేయండి.',
  'ಕನ್ನಡ': 'ನಿಮ್ಮ ರೋಡ್‌ಮ್ಯಾಪ್ 42% ಪೂರ್ಣಗೊಂಡಿದೆ. ಈ ವಾರ Jetpack Compose ಪ್ರಾಜೆಕ್ಟ್ ಮುಗಿಸಿ.',
}

export const REJECTION_CIRCLE_SAMPLE = [
  { reason: 'DSA / coding round', pct: 34 },
  { reason: 'No cloud or deployment experience', pct: 22 },
  { reason: 'Resume not ATS-readable', pct: 15 },
  { reason: 'Weak system design', pct: 14 },
  { reason: 'Project not relevant to role', pct: 9 },
  { reason: 'Other / unknown', pct: 6 },
]
