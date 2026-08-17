import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/app/lib/db'
import { hashApiKey } from '@/lib/apiKey'
import { createClient } from '@supabase/supabase-js'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

async function validateApiKey(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  const apiKey = authHeader?.replace('Bearer ', '')
  if (!apiKey) return { error: 'Missing API key', status: 401 }
  const hashedKey = hashApiKey(apiKey)
  const keyRecord = await prisma.externalApiKey.findUnique({ where: { hashedKey } })
  if (!keyRecord || keyRecord.revokedAt) return { error: 'Invalid or revoked API key', status: 401 }
  if (!keyRecord.scope.includes('ticket:create')) return { error: 'Key does not have permission', status: 403 }
  prisma.externalApiKey.update({ where: { id: keyRecord.id }, data: { lastUsedAt: new Date() } }).catch(() => {})
  return { keyRecord }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params

  const auth = await validateApiKey(req)
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: (auth as any).status })

  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId }, select: { id: true } })
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

  let formData: FormData
  try { formData = await req.formData() } catch { return NextResponse.json({ error: 'Invalid multipart body' }, { status: 400 }) }

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Missing field: file' }, { status: 400 })
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'File exceeds 10MB limit' }, { status: 400 })
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: `File type not allowed: ${file.type}` }, { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `tickets/${ticketId}/${uniqueSuffix}-${safeName}`

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('uploadsService')
    .upload(storagePath, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    console.error('Supabase upload error:', uploadError)
    return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage.from('uploadsService').getPublicUrl(uploadData.path)

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { attachments: { push: publicUrl } },
  })

  return NextResponse.json({ success: true, url: publicUrl }, { status: 201 })
}
