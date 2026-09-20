// Roadmap templates. In production an AI planner generates the plan, but resources come from a CURATED table
// (never let the LLM invent links). URLs below are placeholders to verify before shipping.
// Milestone types: learn | build | certify | experience | practice | apply
// auto: 'github' | 'leetcode' | 'credly' | null  -> progress that can be tracked automatically later.

export const TEMPLATES = {
  'android-google': {
    title: 'Android Developer',
    company: 'Google',
    months: 8,
    phases: [
      {
        id: 'p1', name: 'Foundations', icon: '🧱', span: [0, 1.5],
        milestones: [
          { id: 'm1', title: 'Kotlin fundamentals course', type: 'learn', hours: 20, resource: { label: 'Kotlin docs', url: 'https://kotlinlang.org/docs/getting-started.html' } },
          { id: 'm2', title: 'Android Basics with Compose', type: 'learn', hours: 30, resource: { label: 'Android Developers', url: 'https://developer.android.com/courses' } },
          { id: 'm3', title: 'Git & GitHub workflow', type: 'learn', hours: 8, auto: 'github' },
          { id: 'm4', title: 'Solve 50 DSA problems', type: 'practice', hours: 25, auto: 'leetcode' },
          { id: 'm5', title: 'Set up Android Studio + emulator', type: 'learn', hours: 3 },
        ],
      },
      {
        id: 'p2', name: 'Build Projects', icon: '🛠️', span: [1.5, 3.5],
        milestones: [
          { id: 'm6', title: 'Weather app with Jetpack Compose', type: 'build', hours: 25, auto: 'github' },
          { id: 'm7', title: 'Chat app with Firebase', type: 'build', hours: 30, auto: 'github' },
          { id: 'm8', title: 'Offline-first notes app (Room)', type: 'build', hours: 20, auto: 'github' },
          { id: 'm9', title: 'Learn MVVM + Hilt', type: 'learn', hours: 18 },
          { id: 'm10', title: 'Publish an app on Play Store', type: 'build', hours: 12 },
        ],
      },
      {
        id: 'p3', name: 'Certify', icon: '🎓', span: [3.5, 4.5],
        milestones: [
          { id: 'm11', title: 'Android developer certificate prep', type: 'certify', hours: 40, resource: { label: 'Coursera: Meta Android Developer', url: 'https://www.coursera.org/professional-certificates/meta-android-developer' } },
          { id: 'm12', title: 'Take the certificate exam', type: 'certify', hours: 6, auto: 'credly' },
          { id: 'm13', title: 'Polish portfolio + README files', type: 'build', hours: 10 },
        ],
      },
      {
        id: 'p4', name: 'Experience', icon: '💼', span: [4.5, 6],
        milestones: [
          { id: 'm14', title: '3 pull requests to an open-source Android repo', type: 'experience', hours: 30, auto: 'github' },
          { id: 'm15', title: 'Android internship or freelance project', type: 'experience', hours: 120 },
          { id: 'm16', title: 'Complete one paid micro-gig', type: 'experience', hours: 15 },
        ],
      },
      {
        id: 'p5', name: 'Interview Prep', icon: '🎤', span: [6, 7.5],
        milestones: [
          { id: 'm17', title: 'Reach 150 solved DSA problems', type: 'practice', hours: 60, auto: 'leetcode' },
          { id: 'm18', title: 'Android interview question bank', type: 'practice', hours: 40 },
          { id: 'm19', title: 'Mobile system design basics', type: 'learn', hours: 20 },
          { id: 'm20', title: '5 mock interviews', type: 'practice', hours: 10 },
        ],
      },
      {
        id: 'p6', name: 'Apply', icon: '🚀', span: [7.5, 8],
        milestones: [
          { id: 'm21', title: 'Tailor resume for target role', type: 'apply', hours: 5 },
          { id: 'm22', title: 'Apply to 30 targeted roles', type: 'apply', hours: 10 },
          { id: 'm23', title: 'Referral outreach (10 people)', type: 'apply', hours: 8 },
          { id: 'm24', title: 'Final mock interview', type: 'apply', hours: 3 },
        ],
      },
    ],
    doneIds: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9'],
  },

  'cloud-pivot': {
    title: 'Cloud / DevOps Engineer',
    company: 'Product companies',
    months: 6,
    phases: [
      {
        id: 'p1', name: 'Foundations', icon: '🧱', span: [0, 1],
        milestones: [
          { id: 'm1', title: 'Linux + networking refresher', type: 'learn', hours: 15 },
          { id: 'm2', title: 'AWS Cloud Practitioner', type: 'certify', hours: 20, auto: 'credly', resource: { label: 'AWS Skill Builder', url: 'https://skillbuilder.aws' } },
          { id: 'm3', title: 'Docker deep-dive', type: 'learn', hours: 18 },
        ],
      },
      {
        id: 'p2', name: 'Core Skills', icon: '🛠️', span: [1, 3],
        milestones: [
          { id: 'm4', title: 'AWS Solutions Architect Associate prep', type: 'certify', hours: 60, resource: { label: 'AWS Certification', url: 'https://aws.amazon.com/certification/certified-solutions-architect-associate/' } },
          { id: 'm5', title: 'Terraform IaC project', type: 'build', hours: 30, auto: 'github' },
          { id: 'm6', title: 'Kubernetes fundamentals', type: 'learn', hours: 30, resource: { label: 'Kubernetes tutorials', url: 'https://kubernetes.io/docs/tutorials/' } },
          { id: 'm7', title: 'CI/CD pipeline project', type: 'build', hours: 25, auto: 'github' },
        ],
      },
      {
        id: 'p3', name: 'Portfolio', icon: '📁', span: [3, 4.5],
        milestones: [
          { id: 'm8', title: 'Deploy a microservice on EKS', type: 'build', hours: 40, auto: 'github' },
          { id: 'm9', title: 'Add monitoring + alerts', type: 'build', hours: 15 },
          { id: 'm10', title: 'Write 2 technical blog posts', type: 'experience', hours: 10 },
        ],
      },
      {
        id: 'p4', name: 'Prepare', icon: '🎤', span: [4.5, 5.5],
        milestones: [
          { id: 'm11', title: 'Cloud system design practice', type: 'practice', hours: 30 },
          { id: 'm12', title: 'Cloud interview question bank', type: 'practice', hours: 30 },
          { id: 'm13', title: '3 mock interviews', type: 'practice', hours: 8 },
        ],
      },
      {
        id: 'p5', name: 'Apply', icon: '🚀', span: [5.5, 6],
        milestones: [
          { id: 'm14', title: 'Reframe resume for cloud roles', type: 'apply', hours: 5 },
          { id: 'm15', title: 'Apply to 25 targeted roles', type: 'apply', hours: 10 },
          { id: 'm16', title: 'Referral outreach (8 people)', type: 'apply', hours: 6 },
        ],
      },
    ],
    doneIds: ['m1', 'm2', 'm3', 'm5', 'm7'],
  },
}

export const MILESTONE_TYPES = {
  learn: { label: 'Learn', color: '#3b82f6', icon: 'BookOpen' },
  build: { label: 'Build', color: '#5b5fef', icon: 'Hammer' },
  certify: { label: 'Certify', color: '#8b5cf6', icon: 'Award' },
  experience: { label: 'Experience', color: '#f59e0b', icon: 'Briefcase' },
  practice: { label: 'Practice', color: '#ec4899', icon: 'Target' },
  apply: { label: 'Apply', color: '#ef4444', icon: 'Send' },
}
