'use server'

import { SignupFormSchema, UpdateUserFormSchema, FormState } from '@/app/lib/definitions'
import { createSession } from '@/app/lib/session'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import prisma from '@/app/lib/db'
import { getUser } from '@/app/lib/dal'

export async function signup(state: FormState, formData: FormData) {
  const sessionUser = await getUser()
  const registrationCode = formData.get('registrationCode')
  const MASTER_CODE = 'TERA_LEADER_2026'

  // Logic: 
  // 1. If a manager is logged in, they can create accounts.
  // 2. If NO ONE is logged in, signup is only allowed if the registrationCode matches MASTER_CODE.
  if (!sessionUser) {
    if (registrationCode !== MASTER_CODE) {
      return { message: 'ระบบปิดการลงทะเบียนสาธารณะ กรุณาใช้รหัสลงทะเบียนสำหรับผู้จัดการ หรือติดต่อผู้ดูแลระบบ' }
    }
  } else if (sessionUser.role !== 'ผู้จัดการ') {
    return { message: 'เฉพาะผู้จัดการเท่านั้นที่สามารถสร้างบัญชีผู้ใช้ได้' }
  }

  // Validate form fields
  const validatedFields = SignupFormSchema.safeParse({
    employeeId: formData.get('employeeId'),
    fullName: formData.get('fullName'),
    phoneNumber: formData.get('phoneNumber'),
    role: formData.get('role'),
    password: formData.get('password'),
    nickname: formData.get('nickname') ?? '',
    branch: formData.get('branch') ?? '',
    teamLeader: formData.get('teamLeader') ?? '',
    position: formData.get('position') ?? '',
    department: formData.get('department') ?? '',
    startDate: formData.get('startDate') ?? '',
    registrationCode: formData.get('registrationCode') ?? '',
  })

  // If any form fields are invalid, return early
  if (!validatedFields.success) {
    console.log('Signup validation failed:', validatedFields.error.flatten().fieldErrors)
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      data: Object.fromEntries(formData.entries()),
    }
  }

  const {
    employeeId, fullName, phoneNumber, role, password,
    nickname, branch, teamLeader, position: empPosition, department, startDate
  } = validatedFields.data

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { employeeId }
  })

  if (existingUser) {
    return {
      message: 'รหัสพนักงานนี้มีอยู่ในระบบแล้ว',
      data: Object.fromEntries(formData.entries()),
    }
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10)

  // Create user
  try {
    const user = await prisma.user.create({
      data: {
        employeeId,
        fullName,
        phoneNumber,
        role,
        password: hashedPassword,
      }
    })

    // Also record in Employee Sale table linked to the user
    await prisma.employeeSale.create({
      data: {
        userId: user.id,
        employeeId: user.employeeId,
        fullName: fullName,
        nickname: nickname ?? null,
        branch: branch ?? null,
        teamLeader: teamLeader ?? null,
        position: empPosition ?? null,
        department: department ?? null,
        startDate: startDate ? new Date(startDate) : null,
      }
    })

    // Logic for new Leader registration (using code when not logged in)
    if (!sessionUser) {
      await createSession(user.id)
      redirect('/dashboard')
    } else {
      // Manager added someone, redirect to team list
      redirect('/team')
    }
  } catch (error: any) {
    if (error.digest?.includes('NEXT_REDIRECT')) throw error;
    console.error('Signup error:', error)
    return {
      message: 'An error occurred while creating the account.'
    }
  }

  // If a new Leader registered, redirect to dashboard. 
  // If a Manager created a staff, redirect to team list.
  if (!sessionUser) {
    redirect('/dashboard')
  } else {
    redirect('/team')
  }
}

export async function updateUser(state: FormState, formData: FormData) {
  const sessionUser = await getUser()
  if (!sessionUser || sessionUser.role !== 'ผู้จัดการ') {
    return { message: 'เฉพาะผู้จัดการเท่านั้นที่สามารถแก้ไขข้อมูลพนักงานได้' }
  }

  // Validate form fields
  const validatedFields = UpdateUserFormSchema.safeParse({
    id: formData.get('id'),
    employeeId: formData.get('employeeId'),
    fullName: formData.get('fullName'),
    phoneNumber: formData.get('phoneNumber'),
    role: formData.get('role'),
    password: formData.get('password'),
    nickname: formData.get('nickname'),
    branch: formData.get('branch'),
    teamLeader: formData.get('teamLeader'),
    position: formData.get('position'),
    department: formData.get('department'),
    startDate: formData.get('startDate'),
  })

  // If any form fields are invalid, return early
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      data: Object.fromEntries(formData.entries()),
    }
  }

  const { id, employeeId, fullName, phoneNumber, role, password, nickname, branch, teamLeader, position, department, startDate } = validatedFields.data

  try {
    // 1. Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: { employeeSale: true }
    })

    if (!existingUser) {
      return { message: 'ไม่พบผู้ใช้งานที่ต้องการแก้ไข' }
    }

    // 2. Prepare data for User
    const userData: any = {
      employeeId,
      fullName,
      phoneNumber,
      role,
      position,
    }

    // Hash password if provided
    if (password && password.length >= 6) {
      userData.password = await bcrypt.hash(password, 10)
    }

    // 3. Update User and EmployeeSale in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: userData,
      })

      const saleData = {
        fullName,
        employeeId,
        nickname,
        branch,
        teamLeader,
        position,
        department,
        startDate: startDate ? new Date(startDate) : null,
      }

      if (existingUser.employeeSale) {
        await tx.employeeSale.update({
          where: { userId: id },
          data: saleData,
        })
      } else {
        await tx.employeeSale.create({
          data: {
            userId: id,
            ...saleData,
          },
        })
      }
    })

    // Success - redirect to team list
    redirect('/team')
  } catch (error: any) {
    if (error.digest?.includes('NEXT_REDIRECT')) throw error;
    console.error('Update user error:', error)
    if (error.code === 'P2002') {
      return { message: 'รหัสพนักงานนี้มีผู้ใช้งานอื่นใช้แล้ว' }
    }
    return { message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล' }
  }
}

export async function deactivateUser(id: string) {
  const sessionUser = await getUser()
  if (!sessionUser || sessionUser.role !== 'ผู้จัดการ') {
    return { success: false, message: 'เฉพาะผู้จัดการเท่านั้นที่สามารถจัดการทีมได้' }
  }

  try {
    await prisma.user.update({
      where: { id },
      data: { isActive: false }
    })
    
    redirect('/team')
  } catch (error: any) {
    if (error.digest?.includes('NEXT_REDIRECT')) throw error;
    console.error('Deactivate user error:', error)
    return { success: false, message: 'เกิดข้อผิดพลาดในการลบสมาชิกออกจากทีม' }
  }
}

export async function getSalesEmployees() {
  try {
    const employees = await prisma.employeeSale.findMany({
      where: {
        user: { isActive: true }
      },
      orderBy: { fullName: 'asc' }
    });
    return employees;
  } catch (error) {
    console.error('Error fetching sales employees:', error);
    return [];
  }
}
