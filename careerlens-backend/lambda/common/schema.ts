import { z } from 'zod';
import { ApiError } from './http';

// Mirrors the shapes in src/data/seed.js. Kept permissive (partial + passthrough) because the
// frontend sends partial patches and profile items carry free-form fields the POC doesn't fully
// enumerate; strict validation here would drift from the mock and break the "same shapes" contract.

export const ProfilePatchSchema = z.object({}).passthrough();

export const ProfileItemSchema = z.object({}).passthrough();

export const SkillSchema = z.object({
  name: z.string().min(1).max(80),
  level: z.number().int().min(0).max(100).optional(),
  verified: z.boolean().optional(),
}).passthrough();

export const ExternalPlatformSchema = z.enum(['leetcode', 'github', 'codeforces', 'hackerrank', 'linkedin']);

export const ExternalPatchSchema = z.object({}).passthrough();

export const ProfileSectionSchema = z.enum(['education', 'experience', 'certifications', 'projects']);

export function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new ApiError(400, 'VALIDATION_ERROR', message);
  }
  return result.data;
}
