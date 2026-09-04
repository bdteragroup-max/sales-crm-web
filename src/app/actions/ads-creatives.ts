'use server'

import prisma from '@/app/lib/db'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { getUser } from '@/app/lib/dal'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null

export interface CreativeVersionItem {
  version: string
  updatedAt: string
  fileSize: string
  fileUrl: string
  filename: string
  status: 'Active' | 'Previous'
}

export interface CreativeItem {
  id: string
  code: string
  name: string
  filename: string
  fileType: string
  fileSize: string
  fileUrl: string
  thumbnailUrl?: string
  dimensions: string
  product: string
  version: string
  isPrimary: boolean
  status: 'Active' | 'Draft' | 'Archived'
  uploadedBy: string
  uploadedAt: string
  createdAt: string
  updatedAt: string
  archivedAt?: string | null
  versionHistory: CreativeVersionItem[]
}

// Ensure table exists in Postgres
let isTableInitialized = false
async function ensureCreativesTable() {
  if (isTableInitialized) return
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ad_creatives" (
        "id" TEXT PRIMARY KEY,
        "code" TEXT UNIQUE NOT NULL,
        "name" TEXT NOT NULL,
        "filename" TEXT NOT NULL,
        "fileType" TEXT NOT NULL,
        "fileSize" TEXT NOT NULL,
        "fileUrl" TEXT NOT NULL,
        "thumbnailUrl" TEXT,
        "dimensions" TEXT DEFAULT '1080 x 1080 px',
        "product" TEXT DEFAULT 'Solar Pump',
        "version" TEXT NOT NULL DEFAULT 'V1',
        "isPrimary" BOOLEAN NOT NULL DEFAULT true,
        "status" TEXT NOT NULL DEFAULT 'Active',
        "uploadedBy" TEXT NOT NULL DEFAULT 'Marketing Team',
        "uploadedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "archivedAt" TIMESTAMPTZ,
        "versionHistory" JSONB DEFAULT '[]'
      );
    `)
    isTableInitialized = true
  } catch (err: any) {
    console.warn('Could not initialize ad_creatives table via executeRawUnsafe:', err.message)
  }
}

// Initial default demo assets matching user mockup screenshot
const DEFAULT_INITIAL_CREATIVES: CreativeItem[] = [
  {
    id: 'cr_001',
    code: 'CR-SP-001',
    name: 'Water Strong V1',
    filename: 'SP_WaterStrong_V1.jpg',
    fileType: 'JPG Image',
    fileSize: '2.4 MB',
    fileUrl: '/uploads/creatives/SP_WaterStrong_V1.jpg',
    thumbnailUrl: '/uploads/creatives/SP_WaterStrong_V1.jpg',
    dimensions: '1000 x 1350 px',
    product: 'Solar Pump',
    version: 'Current V3',
    isPrimary: true,
    status: 'Active',
    uploadedBy: 'Marketing Team',
    uploadedAt: '2026-08-31T10:00:00.000Z',
    createdAt: '2026-08-20T09:00:00.000Z',
    updatedAt: '2026-08-31T10:00:00.000Z',
    archivedAt: null,
    versionHistory: [
      {
        version: 'V3 • Current',
        updatedAt: '31 Aug 2026',
        fileSize: '2.4 MB',
        fileUrl: '/uploads/creatives/SP_WaterStrong_V1.jpg',
        filename: 'SP_WaterStrong_V1.jpg',
        status: 'Active'
      },
      {
        version: 'V2',
        updatedAt: '25 Aug 2026',
        fileSize: '2.2 MB',
        fileUrl: '/uploads/creatives/SP_WaterStrong_V1.jpg',
        filename: 'SP_WaterStrong_V1_v2.jpg',
        status: 'Previous'
      },
      {
        version: 'V1',
        updatedAt: '20 Aug 2026',
        fileSize: '2.1 MB',
        fileUrl: '/uploads/creatives/SP_WaterStrong_V1.jpg',
        filename: 'SP_WaterStrong_V1_v1.jpg',
        status: 'Previous'
      }
    ]
  },
  {
    id: 'cr_002',
    code: 'CR-SP-002',
    name: 'No Electricity V2',
    filename: 'SP_NoElectricity_V2.mp4',
    fileType: 'MP4 Video',
    fileSize: '28.5 MB',
    fileUrl: '/uploads/creatives/SP_NoElectricity_V2.mp4',
    thumbnailUrl: '/uploads/creatives/SP_NoElectricity_V2.mp4',
    dimensions: '1080 x 1920 px',
    product: 'Solar Pump',
    version: 'V2',
    isPrimary: true,
    status: 'Active',
    uploadedBy: 'Marketing Team',
    uploadedAt: '2026-08-30T14:30:00.000Z',
    createdAt: '2026-08-22T08:00:00.000Z',
    updatedAt: '2026-08-30T14:30:00.000Z',
    archivedAt: null,
    versionHistory: [
      {
        version: 'V2 • Current',
        updatedAt: '30 Aug 2026',
        fileSize: '28.5 MB',
        fileUrl: '/uploads/creatives/SP_NoElectricity_V2.mp4',
        filename: 'SP_NoElectricity_V2.mp4',
        status: 'Active'
      },
      {
        version: 'V1',
        updatedAt: '22 Aug 2026',
        fileSize: '24.1 MB',
        fileUrl: '/uploads/creatives/SP_NoElectricity_V2.mp4',
        filename: 'SP_NoElectricity_V1.mp4',
        status: 'Previous'
      }
    ]
  },
  {
    id: 'cr_003',
    code: 'CR-SP-003',
    name: 'Installation Review V1',
    filename: 'SP_InstallReview_V1.jpg',
    fileType: 'JPG Image',
    fileSize: '3.1 MB',
    fileUrl: '/uploads/creatives/SP_InstallReview_V1.jpg',
    thumbnailUrl: '/uploads/creatives/SP_InstallReview_V1.jpg',
    dimensions: '1080 x 1080 px',
    product: 'Solar Pump',
    version: 'V1',
    isPrimary: false,
    status: 'Active',
    uploadedBy: 'Marketing Team',
    uploadedAt: '2026-08-29T11:00:00.000Z',
    createdAt: '2026-08-29T11:00:00.000Z',
    updatedAt: '2026-08-29T11:00:00.000Z',
    archivedAt: null,
    versionHistory: [
      {
        version: 'V1 • Current',
        updatedAt: '29 Aug 2026',
        fileSize: '3.1 MB',
        fileUrl: '/uploads/creatives/SP_InstallReview_V1.jpg',
        filename: 'SP_InstallReview_V1.jpg',
        status: 'Active'
      }
    ]
  },
  {
    id: 'cr_004',
    code: 'CR-SR-004',
    name: 'Factory Roof Saving',
    filename: 'SR_FactoryRoof_V2.jpg',
    fileType: 'JPG Image',
    fileSize: '2.8 MB',
    fileUrl: '/uploads/creatives/SR_FactoryRoof_V2.jpg',
    thumbnailUrl: '/uploads/creatives/SR_FactoryRoof_V2.jpg',
    dimensions: '1200 x 628 px',
    product: 'Solar Rooftop',
    version: 'V2',
    isPrimary: true,
    status: 'Active',
    uploadedBy: 'Engineering Team',
    uploadedAt: '2026-08-28T16:00:00.000Z',
    createdAt: '2026-08-15T09:00:00.000Z',
    updatedAt: '2026-08-28T16:00:00.000Z',
    archivedAt: null,
    versionHistory: [
      {
        version: 'V2 • Current',
        updatedAt: '28 Aug 2026',
        fileSize: '2.8 MB',
        fileUrl: '/uploads/creatives/SR_FactoryRoof_V2.jpg',
        filename: 'SR_FactoryRoof_V2.jpg',
        status: 'Active'
      }
    ]
  },
  {
    id: 'cr_005',
    code: 'CR-VSD-005',
    name: 'VSD Energy Saving',
    filename: 'VSD_EnergySaving_V1.mp4',
    fileType: 'MP4 Video',
    fileSize: '42.0 MB',
    fileUrl: '/uploads/creatives/VSD_EnergySaving_V1.mp4',
    thumbnailUrl: '/uploads/creatives/VSD_EnergySaving_V1.mp4',
    dimensions: '1920 x 1080 px',
    product: 'Inverter / VSD',
    version: 'V1',
    isPrimary: true,
    status: 'Active',
    uploadedBy: 'Marketing Team',
    uploadedAt: '2026-08-27T13:20:00.000Z',
    createdAt: '2026-08-27T13:20:00.000Z',
    updatedAt: '2026-08-27T13:20:00.000Z',
    archivedAt: null,
    versionHistory: [
      {
        version: 'V1 • Current',
        updatedAt: '27 Aug 2026',
        fileSize: '42.0 MB',
        fileUrl: '/uploads/creatives/VSD_EnergySaving_V1.mp4',
        filename: 'VSD_EnergySaving_V1.mp4',
        status: 'Active'
      }
    ]
  },
  {
    id: 'cr_006',
    code: 'CR-BAT-006',
    name: 'Battery Backup V1',
    filename: 'BAT_Backup_V1.jpg',
    fileType: 'JPG Image',
    fileSize: '1.9 MB',
    fileUrl: '/uploads/creatives/BAT_Backup_V1.jpg',
    thumbnailUrl: '/uploads/creatives/BAT_Backup_V1.jpg',
    dimensions: '1080 x 1080 px',
    product: 'Battery Storage',
    version: 'V1',
    isPrimary: false,
    status: 'Draft',
    uploadedBy: 'R&D Team',
    uploadedAt: '2026-08-25T17:00:00.000Z',
    createdAt: '2026-08-25T17:00:00.000Z',
    updatedAt: '2026-08-25T17:00:00.000Z',
    archivedAt: null,
    versionHistory: [
      {
        version: 'V1 • Current',
        updatedAt: '25 Aug 2026',
        fileSize: '1.9 MB',
        fileUrl: '/uploads/creatives/BAT_Backup_V1.jpg',
        filename: 'BAT_Backup_V1.jpg',
        status: 'Active'
      }
    ]
  },
  {
    id: 'cr_007',
    code: 'CR-SP-007',
    name: 'Deep Well Submersible',
    filename: 'SP_DeepWell_V1.jpg',
    fileType: 'JPG Image',
    fileSize: '2.6 MB',
    fileUrl: '/uploads/creatives/SP_WaterStrong_V1.jpg',
    thumbnailUrl: '/uploads/creatives/SP_WaterStrong_V1.jpg',
    dimensions: '1080 x 1080 px',
    product: 'Solar Pump',
    version: 'V1',
    isPrimary: true,
    status: 'Active',
    uploadedBy: 'Marketing Team',
    uploadedAt: '2026-08-24T10:00:00.000Z',
    createdAt: '2026-08-24T10:00:00.000Z',
    updatedAt: '2026-08-24T10:00:00.000Z',
    archivedAt: null,
    versionHistory: [{ version: 'V1 • Current', updatedAt: '24 Aug 2026', fileSize: '2.6 MB', fileUrl: '/uploads/creatives/SP_WaterStrong_V1.jpg', filename: 'SP_DeepWell_V1.jpg', status: 'Active' }]
  },
  {
    id: 'cr_008',
    code: 'CR-SR-008',
    name: 'Home Rooftop Drone Tour',
    filename: 'SR_DroneTour_V1.mp4',
    fileType: 'MP4 Video',
    fileSize: '35.2 MB',
    fileUrl: '/uploads/creatives/SP_NoElectricity_V2.mp4',
    thumbnailUrl: '/uploads/creatives/SP_NoElectricity_V2.mp4',
    dimensions: '1920 x 1080 px',
    product: 'Solar Rooftop',
    version: 'V1',
    isPrimary: true,
    status: 'Active',
    uploadedBy: 'Media Production',
    uploadedAt: '2026-08-23T15:00:00.000Z',
    createdAt: '2026-08-23T15:00:00.000Z',
    updatedAt: '2026-08-23T15:00:00.000Z',
    archivedAt: null,
    versionHistory: [{ version: 'V1 • Current', updatedAt: '23 Aug 2026', fileSize: '35.2 MB', fileUrl: '/uploads/creatives/SP_NoElectricity_V2.mp4', filename: 'SR_DroneTour_V1.mp4', status: 'Active' }]
  },
  {
    id: 'cr_009',
    code: 'CR-VSD-009',
    name: 'Smart Irrigation Controller',
    filename: 'VSD_SmartController_V2.jpg',
    fileType: 'PNG Image',
    fileSize: '3.4 MB',
    fileUrl: '/uploads/creatives/SP_InstallReview_V1.jpg',
    thumbnailUrl: '/uploads/creatives/SP_InstallReview_V1.jpg',
    dimensions: '1080 x 1080 px',
    product: 'Inverter / VSD',
    version: 'V2',
    isPrimary: true,
    status: 'Active',
    uploadedBy: 'Engineering Team',
    uploadedAt: '2026-08-22T09:30:00.000Z',
    createdAt: '2026-08-10T09:30:00.000Z',
    updatedAt: '2026-08-22T09:30:00.000Z',
    archivedAt: null,
    versionHistory: [{ version: 'V2 • Current', updatedAt: '22 Aug 2026', fileSize: '3.4 MB', fileUrl: '/uploads/creatives/SP_InstallReview_V1.jpg', filename: 'VSD_SmartController_V2.jpg', status: 'Active' }]
  },
  {
    id: 'cr_010',
    code: 'CR-BAT-010',
    name: 'Lithium Battery Spec Sheet',
    filename: 'BAT_SpecSheet_V1.jpg',
    fileType: 'JPG Image',
    fileSize: '1.5 MB',
    fileUrl: '/uploads/creatives/BAT_Backup_V1.jpg',
    thumbnailUrl: '/uploads/creatives/BAT_Backup_V1.jpg',
    dimensions: '1080 x 1350 px',
    product: 'Battery Storage',
    version: 'V1',
    isPrimary: false,
    status: 'Active',
    uploadedBy: 'Marketing Team',
    uploadedAt: '2026-08-21T11:20:00.000Z',
    createdAt: '2026-08-21T11:20:00.000Z',
    updatedAt: '2026-08-21T11:20:00.000Z',
    archivedAt: null,
    versionHistory: [{ version: 'V1 • Current', updatedAt: '21 Aug 2026', fileSize: '1.5 MB', fileUrl: '/uploads/creatives/BAT_Backup_V1.jpg', filename: 'BAT_SpecSheet_V1.jpg', status: 'Active' }]
  },
  {
    id: 'cr_011',
    code: 'CR-SP-011',
    name: 'Agricultural Flow Demo',
    filename: 'SP_AgriFlow_V1.jpg',
    fileType: 'WEBP Image',
    fileSize: '1.8 MB',
    fileUrl: '/uploads/creatives/SP_WaterStrong_V1.jpg',
    thumbnailUrl: '/uploads/creatives/SP_WaterStrong_V1.jpg',
    dimensions: '1080 x 1080 px',
    product: 'Solar Pump',
    version: 'V1',
    isPrimary: true,
    status: 'Active',
    uploadedBy: 'Marketing Team',
    uploadedAt: '2026-08-20T14:10:00.000Z',
    createdAt: '2026-08-20T14:10:00.000Z',
    updatedAt: '2026-08-20T14:10:00.000Z',
    archivedAt: null,
    versionHistory: [{ version: 'V1 • Current', updatedAt: '20 Aug 2026', fileSize: '1.8 MB', fileUrl: '/uploads/creatives/SP_WaterStrong_V1.jpg', filename: 'SP_AgriFlow_V1.jpg', status: 'Active' }]
  },
  {
    id: 'cr_012',
    code: 'CR-SP-012',
    name: 'Farmer Testimonial Reel',
    filename: 'SP_FarmerTestimonial_V1.mp4',
    fileType: 'MP4 Video',
    fileSize: '31.4 MB',
    fileUrl: '/uploads/creatives/SP_NoElectricity_V2.mp4',
    thumbnailUrl: '/uploads/creatives/SP_NoElectricity_V2.mp4',
    dimensions: '1080 x 1920 px',
    product: 'Solar Pump',
    version: 'V1',
    isPrimary: true,
    status: 'Active',
    uploadedBy: 'Content Team',
    uploadedAt: '2026-08-19T16:40:00.000Z',
    createdAt: '2026-08-19T16:40:00.000Z',
    updatedAt: '2026-08-19T16:40:00.000Z',
    archivedAt: null,
    versionHistory: [{ version: 'V1 • Current', updatedAt: '19 Aug 2026', fileSize: '31.4 MB', fileUrl: '/uploads/creatives/SP_NoElectricity_V2.mp4', filename: 'SP_FarmerTestimonial_V1.mp4', status: 'Active' }]
  },
  {
    id: 'cr_013',
    code: 'CR-SP-013',
    name: 'Old Promotion Banner July',
    filename: 'SP_JulyPromo_Old.jpg',
    fileType: 'JPG Image',
    fileSize: '2.1 MB',
    fileUrl: '/uploads/creatives/SP_WaterStrong_V1.jpg',
    thumbnailUrl: '/uploads/creatives/SP_WaterStrong_V1.jpg',
    dimensions: '1200 x 628 px',
    product: 'Solar Pump',
    version: 'V1',
    isPrimary: false,
    status: 'Archived',
    uploadedBy: 'Marketing Team',
    uploadedAt: '2026-07-01T08:00:00.000Z',
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    archivedAt: '2026-08-01T00:00:00.000Z',
    versionHistory: [{ version: 'V1', updatedAt: '01 Jul 2026', fileSize: '2.1 MB', fileUrl: '/uploads/creatives/SP_WaterStrong_V1.jpg', filename: 'SP_JulyPromo_Old.jpg', status: 'Previous' }]
  },
  {
    id: 'cr_014',
    code: 'CR-SR-014',
    name: 'Commercial Solar Legacy',
    filename: 'SR_Commercial_2025.jpg',
    fileType: 'JPG Image',
    fileSize: '2.9 MB',
    fileUrl: '/uploads/creatives/SR_FactoryRoof_V2.jpg',
    thumbnailUrl: '/uploads/creatives/SR_FactoryRoof_V2.jpg',
    dimensions: '1080 x 1080 px',
    product: 'Solar Rooftop',
    version: 'V1',
    isPrimary: false,
    status: 'Archived',
    uploadedBy: 'Design Dept',
    uploadedAt: '2026-06-15T10:00:00.000Z',
    createdAt: '2026-06-15T10:00:00.000Z',
    updatedAt: '2026-08-10T12:00:00.000Z',
    archivedAt: '2026-08-10T12:00:00.000Z',
    versionHistory: [{ version: 'V1', updatedAt: '15 Jun 2026', fileSize: '2.9 MB', fileUrl: '/uploads/creatives/SR_FactoryRoof_V2.jpg', filename: 'SR_Commercial_2025.jpg', status: 'Previous' }]
  },
  {
    id: 'cr_015',
    code: 'CR-VSD-015',
    name: 'Inverter Warranty Infographic',
    filename: 'VSD_Warranty_V1.png',
    fileType: 'PNG Image',
    fileSize: '2.7 MB',
    fileUrl: '/uploads/creatives/SP_InstallReview_V1.jpg',
    thumbnailUrl: '/uploads/creatives/SP_InstallReview_V1.jpg',
    dimensions: '1080 x 1080 px',
    product: 'Inverter / VSD',
    version: 'V1',
    isPrimary: false,
    status: 'Active',
    uploadedBy: 'Marketing Team',
    uploadedAt: '2026-08-18T13:00:00.000Z',
    createdAt: '2026-08-18T13:00:00.000Z',
    updatedAt: '2026-08-18T13:00:00.000Z',
    archivedAt: null,
    versionHistory: [{ version: 'V1 • Current', updatedAt: '18 Aug 2026', fileSize: '2.7 MB', fileUrl: '/uploads/creatives/SP_InstallReview_V1.jpg', filename: 'VSD_Warranty_V1.png', status: 'Active' }]
  },
  {
    id: 'cr_016',
    code: 'CR-SR-016',
    name: 'Residential Bill Reduction',
    filename: 'SR_BillReduction_V1.jpg',
    fileType: 'JPG Image',
    fileSize: '3.0 MB',
    fileUrl: '/uploads/creatives/SR_FactoryRoof_V2.jpg',
    thumbnailUrl: '/uploads/creatives/SR_FactoryRoof_V2.jpg',
    dimensions: '1080 x 1080 px',
    product: 'Solar Rooftop',
    version: 'V1',
    isPrimary: true,
    status: 'Active',
    uploadedBy: 'Marketing Team',
    uploadedAt: '2026-08-17T09:15:00.000Z',
    createdAt: '2026-08-17T09:15:00.000Z',
    updatedAt: '2026-08-17T09:15:00.000Z',
    archivedAt: null,
    versionHistory: [{ version: 'V1 • Current', updatedAt: '17 Aug 2026', fileSize: '3.0 MB', fileUrl: '/uploads/creatives/SR_FactoryRoof_V2.jpg', filename: 'SR_BillReduction_V1.jpg', status: 'Active' }]
  },
  {
    id: 'cr_017',
    code: 'CR-SR-017',
    name: 'Industrial Roof 3D Animation',
    filename: 'SR_Industrial3D_V1.mp4',
    fileType: 'MP4 Video',
    fileSize: '48.2 MB',
    fileUrl: '/uploads/creatives/SP_NoElectricity_V2.mp4',
    thumbnailUrl: '/uploads/creatives/SP_NoElectricity_V2.mp4',
    dimensions: '1920 x 1080 px',
    product: 'Solar Rooftop',
    version: 'V1',
    isPrimary: true,
    status: 'Active',
    uploadedBy: 'Design Dept',
    uploadedAt: '2026-08-16T14:30:00.000Z',
    createdAt: '2026-08-16T14:30:00.000Z',
    updatedAt: '2026-08-16T14:30:00.000Z',
    archivedAt: null,
    versionHistory: [{ version: 'V1 • Current', updatedAt: '16 Aug 2026', fileSize: '48.2 MB', fileUrl: '/uploads/creatives/SP_NoElectricity_V2.mp4', filename: 'SR_Industrial3D_V1.mp4', status: 'Active' }]
  },
  {
    id: 'cr_018',
    code: 'CR-BAT-018',
    name: 'Off-Grid Prototype V0',
    filename: 'BAT_Prototype_V0.jpg',
    fileType: 'JPG Image',
    fileSize: '1.7 MB',
    fileUrl: '/uploads/creatives/BAT_Backup_V1.jpg',
    thumbnailUrl: '/uploads/creatives/BAT_Backup_V1.jpg',
    dimensions: '1080 x 1080 px',
    product: 'Battery Storage',
    version: 'V1',
    isPrimary: false,
    status: 'Archived',
    uploadedBy: 'R&D Team',
    uploadedAt: '2026-05-10T11:00:00.000Z',
    createdAt: '2026-05-10T11:00:00.000Z',
    updatedAt: '2026-07-20T10:00:00.000Z',
    archivedAt: '2026-07-20T10:00:00.000Z',
    versionHistory: [{ version: 'V1', updatedAt: '10 May 2026', fileSize: '1.7 MB', fileUrl: '/uploads/creatives/BAT_Backup_V1.jpg', filename: 'BAT_Prototype_V0.jpg', status: 'Previous' }]
  },
  {
    id: 'cr_019',
    code: 'CR-SP-019',
    name: 'Surface Pump Quick Guide',
    filename: 'SP_SurfaceGuide_V1.png',
    fileType: 'PNG Image',
    fileSize: '2.5 MB',
    fileUrl: '/uploads/creatives/SP_WaterStrong_V1.jpg',
    thumbnailUrl: '/uploads/creatives/SP_WaterStrong_V1.jpg',
    dimensions: '1080 x 1080 px',
    product: 'Solar Pump',
    version: 'V1',
    isPrimary: false,
    status: 'Active',
    uploadedBy: 'Technical Team',
    uploadedAt: '2026-08-15T11:00:00.000Z',
    createdAt: '2026-08-15T11:00:00.000Z',
    updatedAt: '2026-08-15T11:00:00.000Z',
    archivedAt: null,
    versionHistory: [{ version: 'V1 • Current', updatedAt: '15 Aug 2026', fileSize: '2.5 MB', fileUrl: '/uploads/creatives/SP_WaterStrong_V1.jpg', filename: 'SP_SurfaceGuide_V1.png', status: 'Active' }]
  },
  {
    id: 'cr_020',
    code: 'CR-VSD-020',
    name: 'Multi-Pump Synchronization',
    filename: 'VSD_MultiSync_V1.jpg',
    fileType: 'JPG Image',
    fileSize: '2.3 MB',
    fileUrl: '/uploads/creatives/SP_InstallReview_V1.jpg',
    thumbnailUrl: '/uploads/creatives/SP_InstallReview_V1.jpg',
    dimensions: '1200 x 628 px',
    product: 'Inverter / VSD',
    version: 'V1',
    isPrimary: true,
    status: 'Active',
    uploadedBy: 'Engineering Team',
    uploadedAt: '2026-08-14T09:00:00.000Z',
    createdAt: '2026-08-14T09:00:00.000Z',
    updatedAt: '2026-08-14T09:00:00.000Z',
    archivedAt: null,
    versionHistory: [{ version: 'V1 • Current', updatedAt: '14 Aug 2026', fileSize: '2.3 MB', fileUrl: '/uploads/creatives/SP_InstallReview_V1.jpg', filename: 'VSD_MultiSync_V1.jpg', status: 'Active' }]
  },
  {
    id: 'cr_021',
    code: 'CR-BAT-021',
    name: 'Night Storage Walkthrough',
    filename: 'BAT_NightStorage_V1.mp4',
    fileType: 'MP4 Video',
    fileSize: '39.8 MB',
    fileUrl: '/uploads/creatives/SP_NoElectricity_V2.mp4',
    thumbnailUrl: '/uploads/creatives/SP_NoElectricity_V2.mp4',
    dimensions: '1080 x 1920 px',
    product: 'Battery Storage',
    version: 'V1',
    isPrimary: true,
    status: 'Active',
    uploadedBy: 'Marketing Team',
    uploadedAt: '2026-08-13T16:00:00.000Z',
    createdAt: '2026-08-13T16:00:00.000Z',
    updatedAt: '2026-08-13T16:00:00.000Z',
    archivedAt: null,
    versionHistory: [{ version: 'V1 • Current', updatedAt: '13 Aug 2026', fileSize: '39.8 MB', fileUrl: '/uploads/creatives/SP_NoElectricity_V2.mp4', filename: 'BAT_NightStorage_V1.mp4', status: 'Active' }]
  },
  {
    id: 'cr_022',
    code: 'CR-SP-022',
    name: 'Deprecate Drought Campaign',
    filename: 'SP_Drought_2025.jpg',
    fileType: 'JPG Image',
    fileSize: '2.0 MB',
    fileUrl: '/uploads/creatives/SP_WaterStrong_V1.jpg',
    thumbnailUrl: '/uploads/creatives/SP_WaterStrong_V1.jpg',
    dimensions: '1080 x 1080 px',
    product: 'Solar Pump',
    version: 'V1',
    isPrimary: false,
    status: 'Archived',
    uploadedBy: 'Marketing Team',
    uploadedAt: '2026-04-10T10:00:00.000Z',
    createdAt: '2026-04-10T10:00:00.000Z',
    updatedAt: '2026-06-30T10:00:00.000Z',
    archivedAt: '2026-06-30T10:00:00.000Z',
    versionHistory: [{ version: 'V1', updatedAt: '10 Apr 2026', fileSize: '2.0 MB', fileUrl: '/uploads/creatives/SP_WaterStrong_V1.jpg', filename: 'SP_Drought_2025.jpg', status: 'Previous' }]
  },
  {
    id: 'cr_023',
    code: 'CR-SR-023',
    name: 'Q1 Special Discount Event',
    filename: 'SR_Q1Discount_Old.jpg',
    fileType: 'JPG Image',
    fileSize: '2.4 MB',
    fileUrl: '/uploads/creatives/SR_FactoryRoof_V2.jpg',
    thumbnailUrl: '/uploads/creatives/SR_FactoryRoof_V2.jpg',
    dimensions: '1080 x 1080 px',
    product: 'Solar Rooftop',
    version: 'V1',
    isPrimary: false,
    status: 'Archived',
    uploadedBy: 'Marketing Team',
    uploadedAt: '2026-01-15T08:00:00.000Z',
    createdAt: '2026-01-15T08:00:00.000Z',
    updatedAt: '2026-04-01T08:00:00.000Z',
    archivedAt: '2026-04-01T08:00:00.000Z',
    versionHistory: [{ version: 'V1', updatedAt: '15 Jan 2026', fileSize: '2.4 MB', fileUrl: '/uploads/creatives/SR_FactoryRoof_V2.jpg', filename: 'SR_Q1Discount_Old.jpg', status: 'Previous' }]
  },
  {
    id: 'cr_024',
    code: 'CR-VSD-024',
    name: 'Draft VSD Mobile App UI',
    filename: 'VSD_MobileApp_Draft.jpg',
    fileType: 'WEBP Image',
    fileSize: '1.2 MB',
    fileUrl: '/uploads/creatives/SP_InstallReview_V1.jpg',
    thumbnailUrl: '/uploads/creatives/SP_InstallReview_V1.jpg',
    dimensions: '1080 x 1920 px',
    product: 'Inverter / VSD',
    version: 'V1',
    isPrimary: false,
    status: 'Draft',
    uploadedBy: 'UX Team',
    uploadedAt: '2026-08-12T10:00:00.000Z',
    createdAt: '2026-08-12T10:00:00.000Z',
    updatedAt: '2026-08-12T10:00:00.000Z',
    archivedAt: null,
    versionHistory: [{ version: 'V1 • Current', updatedAt: '12 Aug 2026', fileSize: '1.2 MB', fileUrl: '/uploads/creatives/SP_InstallReview_V1.jpg', filename: 'VSD_MobileApp_Draft.jpg', status: 'Active' }]
  }
]

// Local file-backed cache fallback for resilience
function getLocalCachePath() {
  const dir = path.join(process.cwd(), 'src', 'data')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return path.join(dir, 'creatives.json')
}

function readLocalCreatives(): CreativeItem[] {
  try {
    const file = getLocalCachePath()
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8')
      const parsed = JSON.parse(content)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (e) {
    console.error('Error reading local creatives:', e)
  }
  return DEFAULT_INITIAL_CREATIVES
}

function writeLocalCreatives(data: CreativeItem[]) {
  try {
    const file = getLocalCachePath()
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8')
  } catch (e) {
    console.error('Error writing local creatives:', e)
  }
}

/**
 * Upload creative binary to Supabase Object Storage (or local storage fallback)
 */
export async function uploadCreativeToObjectStorage(formData: FormData) {
  try {
    const file = formData.get('file') as File | null
    if (!file) throw new Error('No file provided')

    const allowedMime = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'video/mp4',
      'video/quicktime'
    ]
    const ext = file.name.split('.').pop()?.toLowerCase() || ''
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov']

    if (!allowedExts.includes(ext)) {
      throw new Error(`รูปแบบไฟล์ไม่รองรับ (.${ext}) รองรับเฉพาะ JPG, PNG, WEBP, MP4, MOV`)
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substring(7)}`
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `creatives/${uniqueSuffix}_${safeName}`

    let publicUrl = ''

    // Attempt Supabase Storage upload
    if (supabase) {
      try {
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('uploadsService')
          .upload(storagePath, buffer, {
            contentType: file.type || (ext === 'mp4' ? 'video/mp4' : 'image/jpeg'),
            upsert: false
          })

        if (!uploadErr && uploadData?.path) {
          const { data: urlData } = supabase.storage
            .from('uploadsService')
            .getPublicUrl(uploadData.path)
          publicUrl = urlData.publicUrl
        }
      } catch (err: any) {
        console.warn('Supabase storage upload error, falling back to local storage:', err.message)
      }
    }

    // Fallback to local public uploads if Supabase was unreachable
    if (!publicUrl) {
      const publicDir = path.join(process.cwd(), 'public', 'uploads', 'creatives')
      if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true })
      const localFilePath = path.join(publicDir, `${uniqueSuffix}_${safeName}`)
      fs.writeFileSync(localFilePath, buffer)
      publicUrl = `/uploads/creatives/${uniqueSuffix}_${safeName}`
    }

    // Format file size
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1)
    const formattedSize = `${sizeInMB} MB`

    // Determine type label
    let typeLabel = 'JPG Image'
    if (ext === 'png') typeLabel = 'PNG Image'
    else if (ext === 'webp') typeLabel = 'WEBP Image'
    else if (ext === 'mp4') typeLabel = 'MP4 Video'
    else if (ext === 'mov') typeLabel = 'MOV Video'

    return {
      success: true,
      fileUrl: publicUrl,
      filename: file.name,
      fileSize: formattedSize,
      fileType: typeLabel,
      dimensions: ext === 'mp4' || ext === 'mov' ? '1080 x 1920 px' : '1080 x 1080 px'
    }
  } catch (e: any) {
    console.error('Error uploading creative:', e)
    return { success: false, error: e.message || 'Upload failed' }
  }
}

/**
 * Fetch all Creatives combined with dynamic Campaign/Ad usage mappings
 */
export async function getCreativesList() {
  await ensureCreativesTable()

  let list: CreativeItem[] = []

  // Try fetching from PostgreSQL ad_creatives
  try {
    const rows = await prisma.$queryRawUnsafe<any[]>(`
      SELECT * FROM "ad_creatives" ORDER BY "createdAt" DESC
    `)
    if (rows && rows.length > 0) {
      list = rows.map(r => ({
        id: r.id,
        code: r.code,
        name: r.name,
        filename: r.filename,
        fileType: r.fileType,
        fileSize: r.fileSize,
        fileUrl: r.fileUrl,
        thumbnailUrl: r.thumbnailUrl || r.fileUrl,
        dimensions: r.dimensions || '1080 x 1080 px',
        product: r.product || 'Solar Pump',
        version: r.version || 'V1',
        isPrimary: Boolean(r.isPrimary),
        status: r.status as any,
        uploadedBy: r.uploadedBy,
        uploadedAt: r.uploadedAt?.toISOString() || new Date().toISOString(),
        createdAt: r.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: r.updatedAt?.toISOString() || new Date().toISOString(),
        archivedAt: r.archivedAt?.toISOString() || null,
        versionHistory: typeof r.versionHistory === 'string' ? JSON.parse(r.versionHistory) : (r.versionHistory || [])
      }))
    }
  } catch (err: any) {
    console.warn('Fallback to local file storage for creatives:', err.message)
  }

  if (list.length === 0) {
    list = readLocalCreatives()
  }

  // Calculate dynamic used in ads by reading all active campaigns
  try {
    const campaigns = await prisma.adCampaign.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, internalCode: true, targetAudience: true }
    })

    const defaultUsageEntries: Record<string, Array<{
      campaignName: string
      campaignId?: string
      adSetName: string
      adName: string
      adCode: string
      status: string
    }>> = {
      'CR-SP-001': [
        { campaignName: 'SP Aug Lead', adSetName: '01 Agriculture Broad', adName: 'Water Strong V1 • AD-SP-001', adCode: 'AD-SP-001', status: 'Active' },
        { campaignName: 'SP Sep Lead', adSetName: '01 Broad', adName: 'Water Strong Retest • AD-SP-021', adCode: 'AD-SP-021', status: 'Draft' }
      ],
      'SP_WaterStrong_V1.jpg': [
        { campaignName: 'SP Aug Lead', adSetName: '01 Agriculture Broad', adName: 'Water Strong V1 • AD-SP-001', adCode: 'AD-SP-001', status: 'Active' },
        { campaignName: 'SP Sep Lead', adSetName: '01 Broad', adName: 'Water Strong Retest • AD-SP-021', adCode: 'AD-SP-021', status: 'Draft' }
      ],
      'CR-SP-002': [
        { campaignName: 'SP Aug Lead', adSetName: '02 High Head Farm', adName: 'No Electricity V2 • AD-SP-002', adCode: 'AD-SP-002', status: 'Active' }
      ],
      'SP_NoElectricity_V2.mp4': [
        { campaignName: 'SP Aug Lead', adSetName: '02 High Head Farm', adName: 'No Electricity V2 • AD-SP-002', adCode: 'AD-SP-002', status: 'Active' }
      ],
      'CR-SP-003': [
        { campaignName: 'SP Aug Lead', adSetName: '03 Retargeting Visit', adName: 'Installation Review V1 • AD-SP-003', adCode: 'AD-SP-003', status: 'Active' }
      ],
      'SP_InstallReview_V1.jpg': [
        { campaignName: 'SP Aug Lead', adSetName: '03 Retargeting Visit', adName: 'Installation Review V1 • AD-SP-003', adCode: 'AD-SP-003', status: 'Active' }
      ],
      'CR-SR-004': [
        { campaignName: 'SR Lead Gen', adSetName: '01 Factory Zone BKK', adName: 'Factory Roof Saving • AD-SR-001', adCode: 'AD-SR-001', status: 'Active' },
        { campaignName: 'SR Lead Gen', adSetName: '02 Industrial Estate', adName: 'Factory Roof Tier 2 • AD-SR-002', adCode: 'AD-SR-002', status: 'Active' }
      ],
      'SR_FactoryRoof_V2.jpg': [
        { campaignName: 'SR Lead Gen', adSetName: '01 Factory Zone BKK', adName: 'Factory Roof Saving • AD-SR-001', adCode: 'AD-SR-001', status: 'Active' },
        { campaignName: 'SR Lead Gen', adSetName: '02 Industrial Estate', adName: 'Factory Roof Tier 2 • AD-SR-002', adCode: 'AD-SR-002', status: 'Active' }
      ],
      'CR-VSD-005': [
        { campaignName: 'VSD Search', adSetName: '01 Smart Farming VSD', adName: 'VSD Energy Saving • AD-VSD-001', adCode: 'AD-VSD-001', status: 'Active' },
        { campaignName: 'VSD Search', adSetName: '02 Industrial Pump', adName: 'VSD Heavy Duty • AD-VSD-002', adCode: 'AD-VSD-002', status: 'Active' }
      ],
      'VSD_EnergySaving_V1.mp4': [
        { campaignName: 'VSD Search', adSetName: '01 Smart Farming VSD', adName: 'VSD Energy Saving • AD-VSD-001', adCode: 'AD-VSD-001', status: 'Active' },
        { campaignName: 'VSD Search', adSetName: '02 Industrial Pump', adName: 'VSD Heavy Duty • AD-VSD-002', adCode: 'AD-VSD-002', status: 'Active' }
      ],
      'CR-SP-007': [
        { campaignName: 'SP Aug Lead', adSetName: '01 Agriculture Broad', adName: 'Deep Well Submersible • AD-SP-007', adCode: 'AD-SP-007', status: 'Active' }
      ],
      'CR-SR-008': [
        { campaignName: 'SR Lead Gen', adSetName: '03 Home Owner Focus', adName: 'Home Rooftop Drone • AD-SR-008', adCode: 'AD-SR-008', status: 'Active' }
      ],
      'CR-VSD-009': [
        { campaignName: 'VSD Search', adSetName: '01 Smart Farming VSD', adName: 'Smart Controller • AD-VSD-009', adCode: 'AD-VSD-009', status: 'Active' }
      ],
      'CR-SP-011': [
        { campaignName: 'SP Aug Lead', adSetName: '02 High Head Farm', adName: 'Agricultural Flow • AD-SP-011', adCode: 'AD-SP-011', status: 'Active' }
      ],
      'CR-SP-012': [
        { campaignName: 'SP Aug Lead', adSetName: '03 Retargeting Visit', adName: 'Farmer Testimonial • AD-SP-012', adCode: 'AD-SP-012', status: 'Active' }
      ],
      'CR-SR-016': [
        { campaignName: 'SR Lead Gen', adSetName: '03 Home Owner Focus', adName: 'Residential Bill Reduction • AD-SR-016', adCode: 'AD-SR-016', status: 'Active' }
      ],
      'CR-SR-017': [
        { campaignName: 'SR Lead Gen', adSetName: '01 Factory Zone BKK', adName: 'Industrial 3D Roof • AD-SR-017', adCode: 'AD-SR-017', status: 'Active' }
      ],
      'CR-VSD-020': [
        { campaignName: 'VSD Search', adSetName: '02 Industrial Pump', adName: 'Multi-Pump Sync • AD-VSD-020', adCode: 'AD-VSD-020', status: 'Active' }
      ],
      'CR-BAT-021': [
        { campaignName: 'Battery Aug', adSetName: '01 Solar + Battery', adName: 'Night Storage • AD-BAT-021', adCode: 'AD-BAT-021', status: 'Active' }
      ]
    }

    const adUsageMap = new Map<string, Array<{
      campaignName: string
      campaignId?: string
      adSetName: string
      adName: string
      adCode: string
      status: string
    }>>(Object.entries(defaultUsageEntries))

    campaigns.forEach(c => {
      let adSets: any[] = []
      try {
        if (c.targetAudience?.startsWith('{')) {
          adSets = JSON.parse(c.targetAudience).adSets || []
        }
      } catch { }

      adSets.forEach((set: any) => {
        ; (set.ads || []).forEach((ad: any) => {
          const matchKeys = [ad.creativeName, ad.creativeId, ad.code, ad.name].filter(Boolean)
          matchKeys.forEach((key: string) => {
            const usage = {
              campaignName: c.name,
              campaignId: c.id,
              adSetName: set.name,
              adName: ad.name,
              adCode: ad.code || 'AD-01',
              status: ad.status || 'Active'
            }
            const existing = adUsageMap.get(key) || []
            if (!existing.some(e => e.campaignName === c.name && e.adName === ad.name)) {
              existing.push(usage)
            }
            adUsageMap.set(key, existing)
          })
        })
      })
    })

    return { success: true, creatives: list, adUsageMap: Object.fromEntries(adUsageMap) }
  } catch (err) {
    return { success: true, creatives: list, adUsageMap: {} }
  }
}

/**
 * Create a new Creative record
 */
export async function createCreativeRecord(data: {
  name: string
  filename: string
  fileType: string
  fileSize: string
  fileUrl: string
  dimensions?: string
  product?: string
  isPrimary?: boolean
  status?: 'Active' | 'Draft' | 'Archived'
}) {
  const user = await getUser()
  const uName = user?.fullName || user?.email || 'Marketing Team'

  const creatives = readLocalCreatives()
  const nextSeq = creatives.length + 1
  const pCode = (data.product || 'SP').includes('Roof') ? 'SR' : (data.product || '').includes('VSD') ? 'VSD' : (data.product || '').includes('Battery') ? 'BAT' : 'SP'
  const code = `CR-${pCode}-${String(nextSeq).padStart(3, '0')}`
  const id = `cr_${Date.now()}`
  const nowStr = new Date().toISOString()
  const todayFormatted = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

  const newCreative: CreativeItem = {
    id,
    code,
    name: data.name,
    filename: data.filename,
    fileType: data.fileType,
    fileSize: data.fileSize,
    fileUrl: data.fileUrl,
    thumbnailUrl: data.fileUrl,
    dimensions: data.dimensions || '1080 x 1080 px',
    product: data.product || 'Solar Pump',
    version: 'V1 • Current',
    isPrimary: data.isPrimary ?? true,
    status: data.status || 'Active',
    uploadedBy: uName,
    uploadedAt: nowStr,
    createdAt: nowStr,
    updatedAt: nowStr,
    archivedAt: null,
    versionHistory: [
      {
        version: 'V1 • Current',
        updatedAt: todayFormatted,
        fileSize: data.fileSize,
        fileUrl: data.fileUrl,
        filename: data.filename,
        status: 'Active'
      }
    ]
  }

  // Save to DB
  await ensureCreativesTable()
  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "ad_creatives" 
      ("id", "code", "name", "filename", "fileType", "fileSize", "fileUrl", "thumbnailUrl", "dimensions", "product", "version", "isPrimary", "status", "uploadedBy", "uploadedAt", "createdAt", "updatedAt", "versionHistory")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `,
      newCreative.id,
      newCreative.code,
      newCreative.name,
      newCreative.filename,
      newCreative.fileType,
      newCreative.fileSize,
      newCreative.fileUrl,
      newCreative.thumbnailUrl,
      newCreative.dimensions,
      newCreative.product,
      newCreative.version,
      newCreative.isPrimary,
      newCreative.status,
      newCreative.uploadedBy,
      new Date(),
      new Date(),
      new Date(),
      JSON.stringify(newCreative.versionHistory)
    )
  } catch (err: any) {
    console.warn('Could not insert creative into ad_creatives table:', err.message)
  }

  // Update local file cache
  const updated = [newCreative, ...creatives]
  writeLocalCreatives(updated)
  revalidatePath('/marketing/ads/campaigns')

  return { success: true, creative: newCreative }
}

/**
 * Add a new Version to an existing Creative asset
 */
export async function addCreativeVersion(
  creativeId: string,
  newFileData: {
    filename: string
    fileType: string
    fileSize: string
    fileUrl: string
    dimensions?: string
  }
) {
  const creatives = readLocalCreatives()
  const idx = creatives.findIndex(c => c.id === creativeId || c.code === creativeId)
  if (idx < 0) throw new Error('Creative asset not found')

  const target = creatives[idx]
  const todayFormatted = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const nextVerNumber = (target.versionHistory || []).length + 1
  const newVerString = `V${nextVerNumber} • Current`

  // Demote previous versions
  const updatedHistory: CreativeVersionItem[] = [
    {
      version: newVerString,
      updatedAt: todayFormatted,
      fileSize: newFileData.fileSize,
      fileUrl: newFileData.fileUrl,
      filename: newFileData.filename,
      status: 'Active'
    },
    ...(target.versionHistory || []).map(v => ({
      ...v,
      status: 'Previous' as const
    }))
  ]

  const updatedCreative: CreativeItem = {
    ...target,
    filename: newFileData.filename,
    fileType: newFileData.fileType,
    fileSize: newFileData.fileSize,
    fileUrl: newFileData.fileUrl,
    thumbnailUrl: newFileData.fileUrl,
    dimensions: newFileData.dimensions || target.dimensions,
    version: newVerString,
    updatedAt: new Date().toISOString(),
    versionHistory: updatedHistory
  }

  // Update DB
  await ensureCreativesTable()
  try {
    await prisma.$executeRawUnsafe(`
      UPDATE "ad_creatives"
      SET "filename" = $1, "fileType" = $2, "fileSize" = $3, "fileUrl" = $4, "thumbnailUrl" = $5, "version" = $6, "updatedAt" = $7, "versionHistory" = $8
      WHERE "id" = $9 OR "code" = $9
    `,
      updatedCreative.filename,
      updatedCreative.fileType,
      updatedCreative.fileSize,
      updatedCreative.fileUrl,
      updatedCreative.thumbnailUrl,
      updatedCreative.version,
      new Date(),
      JSON.stringify(updatedCreative.versionHistory),
      creativeId
    )
  } catch (err: any) {
    console.warn('Could not update creative version in DB:', err.message)
  }

  creatives[idx] = updatedCreative
  writeLocalCreatives(creatives)
  revalidatePath('/marketing/ads/campaigns')

  return { success: true, creative: updatedCreative }
}

/**
 * Archive or restore a Creative
 */
export async function toggleArchiveCreative(creativeId: string, archive: boolean) {
  const creatives = readLocalCreatives()
  const idx = creatives.findIndex(c => c.id === creativeId || c.code === creativeId)
  if (idx < 0) throw new Error('Creative asset not found')

  const target = creatives[idx]
  target.status = archive ? 'Archived' : 'Active'
  target.archivedAt = archive ? new Date().toISOString() : null
  target.updatedAt = new Date().toISOString()

  // Update DB
  await ensureCreativesTable()
  try {
    await prisma.$executeRawUnsafe(`
      UPDATE "ad_creatives"
      SET "status" = $1, "archivedAt" = $2, "updatedAt" = $3
      WHERE "id" = $4 OR "code" = $4
    `,
      target.status,
      target.archivedAt ? new Date(target.archivedAt) : null,
      new Date(),
      creativeId
    )
  } catch (err: any) {
    console.warn('Could not update creative archive status in DB:', err.message)
  }

  creatives[idx] = target
  writeLocalCreatives(creatives)
  revalidatePath('/marketing/ads/campaigns')

  return { success: true, creative: target }
}
