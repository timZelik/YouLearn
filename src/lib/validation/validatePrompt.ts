import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// Tier 1: instant, free — catches obvious junk
const BLOCKED_PATTERNS = [
  /\b(hack|exploit|malware|virus|phishing|ddos|ransomware)\b/i,
  /\b(porn|sex|nude|adult content)\b/i,
  /\b(kill|murder|suicide|self.harm|weapon|bomb)\b/i,
  /(.)\1{10,}/, // repeated chars (aaaaaaaaaa)
]

// Educational domains we explicitly allow — used to short-circuit Haiku check
const EDUCATIONAL_SIGNALS = [
  /\b(learn|study|understand|build|code|program|develop|create|master|practice)\b/i,
  /\b(python|javascript|typescript|java|rust|go|sql|html|css|react|node|api|database|algorithm|data structure)\b/i,
  /\b(math|science|physics|chemistry|biology|history|economics|finance|machine learning|ai|cloud|devops|security)\b/i,
  /\b(beginner|intermediate|advanced|career|job|interview|project|portfolio)\b/i,
]

export interface ValidationResult {
  valid: boolean
  reason?: string
}

export async function validatePrompt(
  background: string,
  goals: string
): Promise<ValidationResult> {
  const combined = `${background} ${goals}`.trim()

  // Too short
  if (combined.length < 30) {
    return { valid: false, reason: 'Please tell us a bit more about your background and goals.' }
  }

  // Obvious blocks
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(combined)) {
      return { valid: false, reason: 'We only support educational learning requests.' }
    }
  }

  // Clear educational signal — skip Haiku call entirely
  const hasSignal = EDUCATIONAL_SIGNALS.some((p) => p.test(combined))
  if (hasSignal) return { valid: true }

  // Ambiguous — ask Haiku with a single YES/NO. Cost: ~$0.00005
  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 5,
      messages: [{
        role: 'user',
        content: `Is this a legitimate educational or professional learning request? Reply YES or NO only.\n\n"${combined.slice(0, 300)}"`,
      }],
    })
    const answer = msg.content[0].type === 'text' ? msg.content[0].text.trim().toUpperCase() : 'NO'
    if (answer.startsWith('NO')) {
      return { valid: false, reason: 'YouLearn is for educational and professional skill-building. Please describe a learning goal.' }
    }
  } catch {
    // If validation call fails, allow through — don't block users on infra errors
  }

  return { valid: true }
}
