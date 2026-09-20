import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from 'recharts'
import { Target, Plus, Crown, CheckCircle2, ArrowRight, Zap } from 'lucide-react'
import { useData, useToast } from '../context/AppContext'
import { Badge, Bar, Button, Card, CardTitle, PageHeader, Ring, colorOf, toneOf, ratioColor, useAsync } from '../components/ui'
import { ROLES, roleById } from '../data/roles'
import { jobMatch, rankRoles, roadmapApi, profileApi, skillMatch, timingAdvice, marketApi } from '../api'
import { iso } from '../utils/dates'

export default function JobFit() {
  const { rec, run, userId } = useData()
  const toast = useToast()
  const nav = useNavigate()
  const [roleId, setRoleId] = useState(rec.profile.targetRoleId)
  const role = roleById(roleId)
  const skills = rec.profile.skills
  const { data: allJobs } = useAsync(() => marketApi.getJobs(), [])

  const m = useMemo(() => skillMatch(skills, role), [skills, role])
  const ranking = useMemo(() => rankRoles(skills), [skills])
  const radar = m.rows.map((r) => ({ skill: r.name, You: r.have, Needed: r.need }))
  const jobs = (allJobs || []).filter((j) => j.roleId === roleId).slice(0, 3)
  const isTarget = rec.profile.targetRoleId === roleId

  const addGap = async (row) => {
    await run(roadmapApi.addMilestone(userId, rec.roadmap.phases.find((p) => p.milestones.some((x) => !x.done))?.id, {
      title: `Close skill gap: ${row.name} (${row.have}% to ${row.need}%)`, type: 'learn', hours: Math.max(8, Math.round(row.gap / 2)), due: iso(21),
    }))
    toast('Added to your roadmap', { desc: `A learning milestone for ${row.name} was created.` })
  }

  const setTarget = async () => {
    await run(profileApi.updateProfile(userId, { targetRoleId: roleId }))
    toast(`Target role set to ${role.title}`)
  }

  return (
    <>
      <PageHeader title="Job Fit" subtitle="See how your skills match a role and exactly what to close. Match is a readiness estimate, not a hiring prediction." icon={Target} />
      <div className="role-chips">
        {ROLES.map((r) => (
          <motion.button key={r.id} whileTap={{ scale: 0.95 }} className={`role-chip ${r.id === roleId ? 'active' : ''}`} onClick={() => setRoleId(r.id)}>
            <span>{r.emoji}</span> {r.title}
            {r.id === rec.profile.targetRoleId && <Crown size={13} />}
          </motion.button>
        ))}
      </div>

      <div className="grid g-main-l mt16">
        <div className="stack gap16">
          <Card>
            <div className="row gap16">
              <Ring value={m.score} size={128} color={colorOf(m.score)} sub="skill match" />
              <div style={{ flex: 1 }}>
                <h3>{role.title}</h3>
                <div className="muted small">Typical pay {role.salary}</div>
                <div className="row gap8 wrap mt8">
                  <Badge tone={toneOf(m.score)}>{m.score >= 75 ? 'Strong fit' : m.score >= 50 ? 'Partial fit' : 'Big gaps'}</Badge>
                  <Badge tone="gray">{m.missing.length} gaps</Badge>
                </div>
                <div className="mt12">{isTarget ? <Badge tone="teal" icon={Crown}>Your target role</Badge> : <Button size="sm" onClick={setTarget}>Set as my target</Button>}</div>
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle>Skill radar</CardTitle>
            <div style={{ height: 300 }}>
              <ResponsiveContainer>
                <RadarChart data={radar} outerRadius="72%">
                  <PolarGrid stroke="var(--line)" />
                  <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11, fill: 'var(--muted)' }} />
                  <Radar name="Needed" dataKey="Needed" stroke="var(--text)" fill="var(--text)" fillOpacity={0.12} animationDuration={1000} />
                  <Radar name="You" dataKey="You" stroke="#84cc16" fill="#84cc16" fillOpacity={0.4} animationDuration={1300} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="row gap16 center small"><span><span className="dot" style={{ background: '#84cc16', display: 'inline-block' }} /> You</span><span><span className="dot" style={{ background: 'var(--text)', display: 'inline-block' }} /> Role needs</span></div>
          </Card>

          <Card>
            <CardTitle icon={Zap}>Best-fit roles for your profile</CardTitle>
            <div className="stack gap12">
              {ranking.map((r, i) => (
                <div key={r.role.id} className="rank-row" onClick={() => setRoleId(r.role.id)}>
                  <span className="rank-n">{i + 1}</span>
                  <div style={{ flex: 1 }}>
                    <div className="row between small"><span className="bold">{r.role.emoji} {r.role.title}</span><b style={{ color: colorOf(r.score) }}>{r.score}%</b></div>
                    <Bar value={r.score} color={colorOf(r.score)} delay={0.05 * i} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="stack gap16">
          <Card>
            <CardTitle icon={CheckCircle2} right={<span className="muted small">yours vs required</span>}>Skill-by-skill breakdown</CardTitle>
            <div className="stack gap12">
              {m.rows.slice().sort((a, b) => b.gap - a.gap).map((r, i) => (
                <div key={r.name} className="gap-row">
                  <div style={{ flex: 1 }}>
                    <div className="row between small">
                      <span className="bold">{r.name} {r.weight >= 3 && <Badge tone="purple">core</Badge>}</span>
                      <span><b style={{ color: colorOf((r.have / r.need) * 100) }}>{r.have}</b> / {r.need}</span>
                    </div>
                    <Bar value={r.have} marker={r.need} color={ratioColor(r.ratio)} delay={0.04 * i} />
                  </div>
                  {r.ratio < 0.7 && <Button size="sm" variant="outline" icon={Plus} onClick={() => addGap(r)}>Roadmap</Button>}
                </div>
              ))}
            </div>
            <div className="muted tiny mt12">The dark marker on each bar is the level typically expected for this role.</div>
          </Card>

          <Card>
            <CardTitle right={<Button size="sm" variant="ghost" onClick={() => nav('/market')}>All openings <ArrowRight size={14} /></Button>}>Openings for this role</CardTitle>
            <div className="stack gap12">
              {jobs.length === 0 && <div className="muted small">No current openings for this role.</div>}
              {jobs.map((j) => {
                const match = jobMatch(skills, j)
                const adv = timingAdvice(j, match)
                return (
                  <div key={j.id} className="job-mini">
                    <div className="job-logo">{j.company[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div className="bold">{j.title}</div>
                      <div className="muted small">{j.company} · {j.location} · {j.salary}</div>
                      <div className={`advice advice-${adv.tone}`}>{adv.verdict}</div>
                    </div>
                    <Badge tone={toneOf(match)}>{match}% match</Badge>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
