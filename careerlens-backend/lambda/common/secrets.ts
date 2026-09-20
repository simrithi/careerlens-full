import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({});
const cache = new Map<string, string>();

// Cached per Lambda execution environment (across warm invocations) by secret name, so a
// container calling multiple secrets (or the same one repeatedly) only hits Secrets Manager once.
export async function getSecret(secretId: string): Promise<string> {
  const cached = cache.get(secretId);
  if (cached) return cached;
  const res = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
  if (!res.SecretString) throw new Error(`Secret ${secretId} has no value`);
  cache.set(secretId, res.SecretString);
  return res.SecretString;
}
