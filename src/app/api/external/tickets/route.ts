import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/app/lib/db'
import { hashApiKey } from '@/lib/apiKey'
import { createTicketCore } from '@/app/actions/tickets'

async function validateApiKey(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const apiKey = authHeader?.replace('Bearer ', '')

  if (!apiKey) return { error: 'Missing API key', status: 401 }

  const hashedKey = hashApiKey(apiKey)
  const keyRecord = await prisma.externalApiKey.findUnique({
    where: { hashedKey },
  })

  if (!keyRecord || keyRecord.revokedAt) {
    return { error: 'Invalid or revoked API key', status: 401 }
  }

  if (!keyRecord.scope.includes('ticket:create')) {
    return { error: 'Key does not have permission', status: 403 }
  }

  // Fire-and-forget update lastUsedAt
  prisma.externalApiKey.update({
    where: { id: keyRecord.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => { })

  return { keyRecord }
}

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req)
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { reporterEmail, reporterName, title, description, category, sourceModule, urgency } = body

  if (!reporterEmail) return NextResponse.json({ error: 'Missing required field: reporterEmail' }, { status: 400 })
  if (!reporterName) return NextResponse.json({ error: 'Missing required field: reporterName' }, { status: 400 })
  if (!title) return NextResponse.json({ error: 'Missing required field: title' }, { status: 400 })
  if (!description) return NextResponse.json({ error: 'Missing required field: description' }, { status: 400 })

  const validCategories = ['BUG', 'FEATURE_REQUEST', 'QUESTION', 'ACCOUNT_ACCESS', 'OTHER'];
  let validatedCategory = category ?? 'OTHER';
  if (!validCategories.includes(validatedCategory)) {
    validatedCategory = 'OTHER';
  }

  // Find real user from email
  const user = await prisma.user.findUnique({ where: { email: reporterEmail } })

  try {
    const ticket = await createTicketCore({
      reporterId: user ? user.id : null,
      reporterName: user ? undefined : reporterName,
      reporterEmail: user ? undefined : reporterEmail,
      title,
      description,
      category: validatedCategory,
      sourceModule: sourceModule ?? 'general',
      urgency: urgency ?? 'MEDIUM',
    })

    return NextResponse.json({ success: true, ticketId: ticket.id }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating external ticket:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req)
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const email = req.nextUrl.searchParams.get('email')
  if (!email) {
    return NextResponse.json({ error: 'Missing required query parameter: email' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({ where: { email } })

  const tickets = await prisma.supportTicket.findMany({
    where: {
      OR: [
        ...(user ? [{ reporterId: user.id }] : []),
        { reporterEmail: email }
      ]
    },
    select: {
      id: true,
      ticketNumber: true,
      title: true,
      status: true,
      progressPercent: true,
      resolutionPlan: true,
      urgency: true,
      category: true,
      createdAt: true,
      updatedAt: true,
      attachments: true,
      assignee: {
        select: { fullName: true },
      },
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  const mappedTickets = tickets.map(t => ({
    ...t,
    progress: t.progressPercent,
    solutionPlan: t.resolutionPlan,
    assignee: t.assignee ? { name: t.assignee.fullName } : null
  }))

  return NextResponse.json({ success: true, tickets: mappedTickets }, { status: 200 })
}