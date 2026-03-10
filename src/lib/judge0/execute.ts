export interface Judge0Result {
  stdout: string | null
  stderr: string | null
  compile_output: string | null
  message: string | null
  status: {
    id: number
    description: string
  }
  time: string | null
  memory: number | null
}

const JUDGE0_HOST = process.env.JUDGE0_API_HOST || 'judge0-ce.p.rapidapi.com'
const JUDGE0_KEY = process.env.JUDGE0_API_KEY || ''

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-RapidAPI-Host': JUDGE0_HOST,
    'X-RapidAPI-Key': JUDGE0_KEY,
  }
}

async function submitCode(params: {
  source_code: string
  language_id: number
  stdin: string
}): Promise<string> {
  const res = await fetch(`https://${JUDGE0_HOST}/submissions?base64_encoded=false&wait=false`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Judge0 submit failed: ${res.status} ${err}`)
  }

  const data = await res.json()
  return data.token as string
}

async function getResult(token: string): Promise<Judge0Result> {
  const res = await fetch(
    `https://${JUDGE0_HOST}/submissions/${token}?base64_encoded=false&fields=stdout,stderr,compile_output,message,status,time,memory`,
    { headers: getHeaders() }
  )

  if (!res.ok) {
    throw new Error(`Judge0 poll failed: ${res.status}`)
  }

  return res.json()
}

async function pollResult(token: string, timeoutMs = 30000): Promise<Judge0Result> {
  const start = Date.now()
  let delay = 500

  while (Date.now() - start < timeoutMs) {
    const result = await getResult(token)
    // status.id >= 3 means processing is done
    if (result.status.id >= 3) return result

    await new Promise((r) => setTimeout(r, delay))
    delay = Math.min(delay * 1.5, 3000) // exponential backoff, cap at 3s
  }

  throw new Error('Judge0 execution timed out after 30s')
}

export async function executeCode(params: {
  source_code: string
  language_id: number
  stdin: string
}): Promise<Judge0Result> {
  const token = await submitCode(params)
  return pollResult(token)
}

export function normalizeOutput(output: string | null): string {
  return (output ?? '').trim().replace(/\r\n/g, '\n')
}
