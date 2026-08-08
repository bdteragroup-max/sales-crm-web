import { NextResponse } from 'next/server'
import prisma from '@/app/lib/db'
import { getUser } from '@/app/lib/dal'

export async function POST(request: Request) {
  const session = await getUser()
  if (!session?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { jobId, newTechnicianId } = await request.json()

    if (!jobId || !newTechnicianId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify job exists
    const job = await prisma.cabinetAssemblyJob.findUnique({
      where: { id: jobId }
    })

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Update job
    const updatedJob = await prisma.cabinetAssemblyJob.update({
      where: { id: jobId },
      data: { technicianId: newTechnicianId }
    })

    return NextResponse.json(updatedJob)
  } catch (error: any) {
    console.error('Workload Reassign Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to reassign job' }, { status: 500 })
  }
}
