import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { UploadCloud, FileText, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react'
import { Button, Field, Modal } from './ui'
import { profileApi } from '../api'
import { USE_MOCK } from '../api/http'
import { useData, useToast } from '../context/AppContext'

// Generic form modal driven by a field list. Reused for add/edit of experience, projects, certs, etc.
export function FormModal({ open, onClose, title, fields, initial = {}, onSubmit, submitLabel = 'Save' }) {
  const [vals, setVals] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) setVals(initial) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k, v) => setVals((s) => ({ ...s, [k]: v }))
  const submit = async () => {
    setBusy(true)
    try { await onSubmit(vals); onClose() } finally { setBusy(false) }
  }
  const valid = fields.filter((f) => f.required).every((f) => String(vals[f.key] ?? '').trim())
  return (
    <Modal open={open} onClose={onClose} title={title} footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={busy} disabled={!valid}>{submitLabel}</Button></>}>
      <div className="stack gap12">
        {fields.map((f) => (
          <Field key={f.key} label={f.label + (f.required ? ' *' : '')} hint={f.hint}>
            {f.type === 'textarea' ? (
              <textarea className="textarea" value={vals[f.key] ?? ''} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
            ) : f.type === 'select' ? (
              <select className="select" value={vals[f.key] ?? f.options[0]} onChange={(e) => set(f.key, e.target.value)}>
                {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input className="input" type={f.type || 'text'} value={vals[f.key] ?? ''} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} />
            )}
          </Field>
        ))}
      </div>
    </Modal>
  )
}

// Real mode: S3 presigned URL upload, then an S3-triggered Lambda OCRs it (Textract) and
// extracts skills/projects/experience (Gemini) a few seconds later — see profileApi.uploadResume
// and pollResumeParse. Mock mode has no async step, so parseStatus is simply absent there.
export function ResumeUploader({ compact }) {
  const { rec, setRec, run, userId } = useData()
  const toast = useToast()
  const inputRef = useRef(null)
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState(false)
  const resume = rec.profile.resume

  const upload = async (file) => {
    if (!file) return
    // Real mode only ever OCRs PDFs (S3-triggered Textract sync API + a hardcoded PDF content
    // type on the upload itself) — a .doc/.docx would upload fine but always fail parsing
    // server-side, so reject it here instead of promising support that doesn't exist.
    if (!USE_MOCK && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast('PDF only', { desc: 'Please upload your resume as a PDF.', tone: 'bad' })
      return
    }
    setBusy(true)
    await run(profileApi.uploadResume(userId, file))
    setBusy(false)
    if (USE_MOCK) {
      toast('Resume uploaded', { desc: `${file.name} was parsed. Re-run the ATS scan in Resume Lab.` })
    } else {
      toast('Resume uploaded', { desc: 'Extracting skills and projects — this takes a few seconds.' })
      profileApi.pollResumeParse(userId, setRec)
    }
  }

  const status = resume?.parseStatus
  return (
    <div>
      <motion.div
        className={`dropzone ${drag ? 'drag' : ''} ${compact ? 'compact' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files[0]) }}
        onClick={() => inputRef.current?.click()}
        whileHover={{ scale: 1.01 }}
      >
        <input ref={inputRef} type="file" accept=".pdf" hidden onChange={(e) => upload(e.target.files[0])} />
        <UploadCloud size={compact ? 26 : 38} className="icon-teal" />
        <div className="bold">{busy ? 'Uploading...' : 'Drop your resume here or click to browse'}</div>
        <div className="muted small">PDF only, up to 5 MB.{USE_MOCK ? ' (Demo: the file is not actually sent anywhere.)' : ''}</div>
      </motion.div>
      {resume?.fileName && (
        <div className="file-row">
          <FileText size={20} className="icon-teal" />
          <div style={{ flex: 1 }}>
            <div className="bold small">{resume.fileName}</div>
            <div className="muted tiny">
              Uploaded {resume.uploadedAt} - {resume.sizeKb} KB
              {status === 'pending' && ' - extracting skills and projects...'}
              {status === 'failed' && ' - automatic extraction failed, add skills/projects manually'}
            </div>
          </div>
          {status === 'pending' && <Loader2 size={18} className="spin" color="var(--muted)" />}
          {status === 'failed' && <AlertTriangle size={18} color="var(--red)" />}
          {(status === 'done' || !status) && <CheckCircle2 size={18} color="#10b981" />}
        </div>
      )}
    </div>
  )
}
