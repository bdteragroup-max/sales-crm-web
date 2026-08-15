import crypto from 'crypto'

export function generateApiKey(): { plaintext: string; hashed: string } {
  const plaintext = `sk_live_${crypto.randomBytes(32).toString('hex')}`
  const hashed = crypto.createHash('sha256').update(plaintext).digest('hex')
  return { plaintext, hashed }
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}
