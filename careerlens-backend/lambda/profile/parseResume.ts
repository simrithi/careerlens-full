import { randomUUID } from 'node:crypto';
import type { S3Event } from 'aws-lambda';
import { DetectDocumentTextCommand, TextractClient, type Block } from '@aws-sdk/client-textract';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, TABLE_NAME, pk, SK } from '../common/db';
import { generateJson } from '../common/gemini';

const textract = new TextractClient({});

interface ExtractedSkill { name: string; level: number }
interface ExtractedProject { name: string; description: string; tech: string[]; link?: string }
interface ExtractedExperience { company: string; role: string; from: string; to: string; summary: string }
interface Extracted {
  skills: ExtractedSkill[];
  projects: ExtractedProject[];
  experience: ExtractedExperience[];
}

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    skills: {
      type: 'ARRAY',
      items: { type: 'OBJECT', properties: { name: { type: 'STRING' }, level: { type: 'NUMBER' } }, required: ['name', 'level'] },
    },
    projects: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { name: { type: 'STRING' }, description: { type: 'STRING' }, tech: { type: 'ARRAY', items: { type: 'STRING' } }, link: { type: 'STRING' } },
        required: ['name', 'description', 'tech'],
      },
    },
    experience: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { company: { type: 'STRING' }, role: { type: 'STRING' }, from: { type: 'STRING' }, to: { type: 'STRING' }, summary: { type: 'STRING' } },
        required: ['company', 'role', 'from', 'to', 'summary'],
      },
    },
  },
  required: ['skills', 'projects', 'experience'],
};

// Synchronous Textract only reliably reads a single page. Fine for most resumes; a follow-up
// could move to the async StartDocumentTextDetection + SNS API to lift that to multi-page.
async function extractText(bucket: string, key: string): Promise<string> {
  const res = await textract.send(new DetectDocumentTextCommand({ Document: { S3Object: { Bucket: bucket, Name: key } } }));
  return (res.Blocks || []).filter((b: Block) => b.BlockType === 'LINE').map((b: Block) => b.Text).join('\n');
}

async function setParseStatus(userId: string, status: 'done' | 'failed') {
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { pk: pk(userId), sk: SK.profile },
      UpdateExpression: 'SET resume.parseStatus = :s',
      ExpressionAttributeValues: { ':s': status },
    })
  );
}

// S3-triggered on every object created under resumes/{userId}/ (see resumeUploadUrl.ts for the
// key convention and lib/api-stack.ts for the event wiring). OCRs the upload with Textract, then
// asks Gemini to structure it — writing results additively (never overwriting a skill/project/
// experience entry the candidate already has) so a bad or partial extraction can't destroy real
// user edits.
export async function handler(event: S3Event): Promise<void> {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    const match = key.match(/^resumes\/([^/]+)\//);
    if (!match) continue;
    const userId = match[1];

    try {
      const text = await extractText(bucket, key);
      if (!text.trim()) throw new Error('Textract returned no text');

      const prompt = `Extract structured resume data from the resume text below. Only include information explicitly present in the text — never invent skills, projects or experience that aren't mentioned. For each skill, "level" is your best 0-100 estimate of proficiency based on how the resume itself describes it (years of use, depth, project context) — not a guess about skills the resume doesn't discuss.

Resume text:
"""
${text.slice(0, 12000)}
"""`;

      const extracted = await generateJson<Extracted>(prompt, SCHEMA);
      await writeExtracted(userId, extracted);
      await setParseStatus(userId, 'done');
    } catch (err) {
      console.error(`parseResume failed for ${key}:`, err);
      await setParseStatus(userId, 'failed').catch(() => {});
    }
  }
}

async function writeExtracted(userId: string, extracted: Extracted): Promise<void> {
  const key = pk(userId);

  for (const skill of extracted.skills || []) {
    if (!skill.name) continue;
    const existing = await ddb.send(new GetCommand({ TableName: TABLE_NAME, Key: { pk: key, sk: SK.skill(skill.name) } }));
    if (existing.Item) continue; // never overwrite a skill the candidate already has
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: { pk: key, sk: SK.skill(skill.name), name: skill.name, level: Math.max(0, Math.min(100, Math.round(skill.level))), verified: false, source: 'resume' },
      })
    );
  }

  const existingProjects = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': key, ':prefix': SK.sectionPrefixOf('projects') },
    })
  );
  const existingProjectNames = new Set((existingProjects.Items || []).map((p) => String(p.name).toLowerCase()));
  for (const project of extracted.projects || []) {
    if (!project.name || existingProjectNames.has(project.name.toLowerCase())) continue;
    const id = randomUUID();
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: { pk: key, sk: SK.section('projects', id), id, name: project.name, description: project.description || '', tech: project.tech || [], domains: [], link: project.link || '' },
      })
    );
  }

  const existingExp = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
      ExpressionAttributeValues: { ':pk': key, ':prefix': SK.sectionPrefixOf('experience') },
    })
  );
  const existingExpKeys = new Set((existingExp.Items || []).map((e) => `${e.company}|${e.role}`.toLowerCase()));
  for (const exp of extracted.experience || []) {
    if (!exp.company || existingExpKeys.has(`${exp.company}|${exp.role || ''}`.toLowerCase())) continue;
    const id = randomUUID();
    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: { pk: key, sk: SK.section('experience', id), id, company: exp.company, role: exp.role || '', from: exp.from || '', to: exp.to || '', summary: exp.summary || '' },
      })
    );
  }
}
