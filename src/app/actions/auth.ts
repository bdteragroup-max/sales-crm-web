
'use server'


import { LoginFormSchema, ForgotPasswordFormSchema, FormState } from '@/app/lib/definitions'
import { createSession, deleteSession } from '@/app/lib/session'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import prisma from '@/app/lib/db'
import { getUser } from '@/app/lib/dal'


export async function login(state: FormState, formData: FormData) {
  // Validate form fields
  const validatedFields = LoginFormSchema.safeParse({
    employeeId: formData.get('employeeId'),
    password: formData.get('password'),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { employeeId, password } = validatedFields.data

  // Find user
  const user = await prisma.user.findUnique({
    where: { employeeId }
  })

  if (!user || !user.isActive) {
    return {
      message: 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง หรือบัญชีของท่านถูกระงับการใช้งาน'
    }
  }

  // Check password
  const passwordMatch = await bcrypt.compare(password, user.password)

  if (!passwordMatch) {
    return {
      message: 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง'
    }
  }

  // Create session
  await createSession(user.id)

  // Redirect
  redirect('/dashboard')
}

export async function logout() {
  await deleteSession()
  redirect('/')
}

export async function requestPasswordReset(state: FormState, formData: FormData) {
  const validatedFields = ForgotPasswordFormSchema.safeParse({
    phoneNumber: formData.get('phoneNumber'),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  const { phoneNumber } = validatedFields.data

  // Check if user exists
  const user = await prisma.user.findFirst({
    where: { phoneNumber }
  })

  if (!user || !user.isActive) {
    return {
      message: 'ไม่พบเบอร์โทรศัพท์นี้ในระบบ หรือบัญชีของท่านถูกระงับการใช้งาน'
    }
  }

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString()
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes

  await prisma.user.update({
    where: { id: user.id },
    data: {
      otpCode: otp,
      otpExpiresAt: expiresAt,
    }
  })

  // In a real app, send SMS. Here we return it in the message for simulation.
  return {
    message: `ส่งรหัส OTP เรียบร้อยแล้ว! (Simulated OTP: ${otp})`,
    phoneNumber, // Pass back to use in next step
  }
}

export async function verifyOtpAndResetPassword(state: FormState, formData: FormData) {
  const phoneNumber = formData.get('phoneNumber') as string
  const otp = formData.get('otp') as string
  const password = formData.get('password') as string

  if (!phoneNumber || !otp || !password) {
    return {
      message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
    }
  }

  const user = await prisma.user.findFirst({
    where: { phoneNumber }
  })

  if (!user || !user.isActive || user.otpCode !== otp) {
    return {
      message: 'รหัส OTP ไม่ถูกต้อง หรือบัญชีของท่านถูกระงับการใช้งาน'
    }
  }

  if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
    return {
      message: 'รหัส OTP หมดอายุแล้ว กรุณาขอใหม่'
    }
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(password, 10)

  // Update user
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      otpCode: null,
      otpExpiresAt: null,
    }
  })

  return {
    message: 'รีเซ็ตรหัสผ่านเรียบร้อยแล้ว! ท่านสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้ทันที'
  }
}


