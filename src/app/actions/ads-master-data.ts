'use server'

import prisma from '@/app/lib/db'
import { revalidatePath } from 'next/cache'

// CREATE
export async function addMasterData(type: 'Account' | 'Channel' | 'Objective' | 'ResultType', name: string) {
  if (!name) return { success: false, error: 'Name is required' }
  try {
    switch (type) {
      case 'Account': await prisma.adAccount.create({ data: { name } }); break;
      case 'Channel': await prisma.adChannel.create({ data: { name } }); break;
      case 'Objective': await prisma.adObjective.create({ data: { name } }); break;
      case 'ResultType': await prisma.adResultType.create({ data: { name } }); break;
    }
    revalidatePath('/admin/ads/master-data')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// UPDATE
export async function updateMasterData(type: 'Account' | 'Channel' | 'Objective' | 'ResultType', id: string, name: string, isActive: boolean) {
  if (!name) return { success: false, error: 'Name is required' }
  try {
    switch (type) {
      case 'Account': await prisma.adAccount.update({ where: { id }, data: { name, isActive } }); break;
      case 'Channel': await prisma.adChannel.update({ where: { id }, data: { name, isActive } }); break;
      case 'Objective': await prisma.adObjective.update({ where: { id }, data: { name, isActive } }); break;
      case 'ResultType': await prisma.adResultType.update({ where: { id }, data: { name, isActive } }); break;
    }
    revalidatePath('/admin/ads/master-data')
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// DELETE
export async function deleteMasterData(type: 'Account' | 'Channel' | 'Objective' | 'ResultType', id: string) {
  try {
    switch (type) {
      case 'Account': await prisma.adAccount.delete({ where: { id } }); break;
      case 'Channel': await prisma.adChannel.delete({ where: { id } }); break;
      case 'Objective': await prisma.adObjective.delete({ where: { id } }); break;
      case 'ResultType': await prisma.adResultType.delete({ where: { id } }); break;
    }
    revalidatePath('/admin/ads/master-data')
    return { success: true }
  } catch (e: any) {
    // If it fails, likely due to foreign key constraints
    return { success: false, error: 'Cannot delete because this item is currently in use by campaigns/performances.' }
  }
}
