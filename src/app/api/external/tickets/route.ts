import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/app/lib/db'
import { hashApiKey } from '@/lib/apiKey'
import { createTicketCore } from '@/app/actions/tickets'

export async function POST(req: NextRequest) {
  // 1. Check API Key
  const authHeader = req.headers.get('authorization')
  const apiKey = authHeader?.replace('Bearer ', '')

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing API key' }, { status: 401 })
  }

  const hashedKey = hashApiKey(apiKey)
  const keyRecord = await prisma.externalApiKey.findUnique({
    where: { hashedKey },
  })

  if (!keyRecord || keyRecord.revokedAt) {
    return NextResponse.json({ error: 'Invalid or revoked API key' }, { status: 401 })
  }

  if (!keyRecord.scope.includes('ticket:create')) {
    return NextResponse.json({ error: 'Key does not have permission' }, { status: 403 })
  }

  // 2. Parse body
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { reporterEmail, title, description, category, sourceModule, urgency } = body

  if (!reporterEmail || !title || !description) {
    return NextResponse.json({ error: 'Missing required fields: reporterEmail, title, description' }, { status: 400 })
  }

  // 3. Find real user from email
  const user = await prisma.user.findUnique({ where: { email: reporterEmail } })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // 4. Create ticket using shared core logic (gets all logs and notifications)
  try {
    const ticket = await createTicketCore({
      reporterId: user.id,
      title,
      description,
      category: category ?? 'OTHER',
      sourceModule: sourceModule ?? 'general',
      urgency: urgency ?? 'MEDIUM',
    })

    // 5. Update lastUsedAt (fire-and-forget)
    prisma.externalApiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {})

    return NextResponse.json({ success: true, ticketId: ticket.id }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating external ticket:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
