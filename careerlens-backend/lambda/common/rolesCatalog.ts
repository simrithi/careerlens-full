// Skill-requirement subset of ../../careerlens/src/data/roles.js's ROLES catalogue — only the
// fields readiness.ts's skill-match step needs (id + skills). Keep in sync with the frontend file;
// demand/supply/growth/automationRisk are illustrative UI-only fields and intentionally omitted
// here since nothing server-side scores against them.
export interface RoleSkillNeed {
  name: string;
  need: number;
  weight: number;
}

export interface RoleSkills {
  id: string;
  skills: RoleSkillNeed[];
}

export const ROLES: RoleSkills[] = [
  {
    id: 'android',
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
    id: 'fullstack',
    skills: [
      { name: 'JavaScript', need: 75, weight: 3 }, { name: 'React', need: 75, weight: 3 },
      { name: 'Node.js', need: 70, weight: 2 }, { name: 'TypeScript', need: 55, weight: 1 },
      { name: 'HTML/CSS', need: 70, weight: 1 }, { name: 'SQL', need: 60, weight: 2 },
      { name: 'MongoDB', need: 50, weight: 1 }, { name: 'REST APIs', need: 65, weight: 2 },
      { name: 'Git', need: 60, weight: 1 }, { name: 'DSA', need: 60, weight: 2 }, { name: 'Testing', need: 45, weight: 1 },
    ],
  },
  {
    id: 'backend',
    skills: [
      { name: 'Java', need: 75, weight: 3 }, { name: 'Spring Boot', need: 70, weight: 3 },
      { name: 'SQL', need: 70, weight: 2 }, { name: 'REST APIs', need: 70, weight: 2 },
      { name: 'System Design', need: 60, weight: 2 }, { name: 'DSA', need: 65, weight: 2 },
      { name: 'Docker', need: 50, weight: 1 }, { name: 'Kafka', need: 40, weight: 1 },
      { name: 'AWS', need: 45, weight: 1 }, { name: 'Git', need: 60, weight: 1 }, { name: 'Testing', need: 55, weight: 1 },
    ],
  },
  {
    id: 'data',
    skills: [
      { name: 'SQL', need: 75, weight: 3 }, { name: 'Python', need: 70, weight: 3 },
      { name: 'Pandas', need: 65, weight: 2 }, { name: 'Statistics', need: 60, weight: 2 },
      { name: 'Data Visualization', need: 65, weight: 2 }, { name: 'Excel', need: 55, weight: 1 },
      { name: 'Power BI', need: 50, weight: 1 }, { name: 'Communication', need: 50, weight: 1 },
      { name: 'Machine Learning', need: 40, weight: 1 },
    ],
  },
  {
    id: 'ml',
    skills: [
      { name: 'Python', need: 80, weight: 3 }, { name: 'Machine Learning', need: 75, weight: 3 },
      { name: 'TensorFlow/PyTorch', need: 65, weight: 3 }, { name: 'Statistics', need: 65, weight: 2 },
      { name: 'Pandas', need: 60, weight: 1 }, { name: 'SQL', need: 55, weight: 1 },
      { name: 'DSA', need: 55, weight: 1 }, { name: 'MLOps', need: 40, weight: 2 },
      { name: 'Computer Vision', need: 40, weight: 1 }, { name: 'Git', need: 55, weight: 1 },
    ],
  },
  {
    id: 'cloud',
    skills: [
      { name: 'AWS', need: 75, weight: 3 }, { name: 'Docker', need: 70, weight: 2 },
      { name: 'Kubernetes', need: 60, weight: 2 }, { name: 'Terraform', need: 55, weight: 2 },
      { name: 'CI/CD', need: 65, weight: 2 }, { name: 'Linux', need: 65, weight: 2 },
      { name: 'Python', need: 50, weight: 1 }, { name: 'Networking', need: 50, weight: 1 }, { name: 'Git', need: 55, weight: 1 },
    ],
  },
  {
    id: 'game',
    skills: [
      { name: 'C++', need: 60, weight: 2 }, { name: 'Unity', need: 70, weight: 3 },
      { name: '3D Math', need: 60, weight: 3 }, { name: 'Python', need: 45, weight: 1 },
      { name: 'Computer Vision', need: 30, weight: 1 }, { name: 'Git', need: 55, weight: 1 },
      { name: 'DSA', need: 55, weight: 1 }, { name: 'Communication', need: 40, weight: 1 },
    ],
  },
];

export const roleById = (id: string): RoleSkills | undefined => ROLES.find((r) => r.id === id);
