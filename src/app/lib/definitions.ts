import { z } from 'zod'

export const SignupFormSchema = z.object({
  employeeId: z
    .string()
    .min(3, { message: 'รหัสพนักงานต้องมีความยาวอย่างน้อย 3 ตัวอักษร' })
    .trim(),
  fullName: z
    .string()
    .min(2, { message: 'ชื่อ-นามสกุลต้องมีความยาวอย่างน้อย 2 ตัวอักษร' })
    .trim(),
  phoneNumber: z
    .string()
    .min(9, { message: 'เบอร์โทรศัพท์ต้องมีความยาวอย่างน้อย 9 หลัก' })
    .trim(),
  role: z.enum(['ตัวแทนฝ่ายขาย', 'ผู้จัดการ'], {
    message: 'กรุณาเลือกตำแหน่งที่ถูกต้อง',
  }),
  password: z
    .string()
    .min(1, { message: 'กรุณากรอกรหัสผ่าน' })
    .trim(),
  nickname: z.preprocess((val) => val === '' ? undefined : val, z.string().optional()),
  branch: z.preprocess((val) => val === '' ? undefined : val, z.string().optional()),
  teamLeader: z.preprocess((val) => val === '' ? undefined : val, z.string().optional()),
  position: z.preprocess((val) => val === '' ? undefined : val, z.string().optional()),
  department: z.preprocess((val) => val === '' ? undefined : val, z.string().optional()),
  startDate: z.preprocess((val) => val === '' ? undefined : val, z.string().optional()),
  registrationCode: z.preprocess((val) => val === '' ? undefined : val, z.string().optional()),
})
export const UpdateUserFormSchema = z.object({
  id: z.string(),
  employeeId: z
    .string()
    .min(3, { message: 'รหัสพนักงานต้องมีความยาวอย่างน้อย 3 ตัวอักษร' })
    .trim(),
  fullName: z
    .string()
    .min(2, { message: 'ชื่อ-นามสกุลต้องมีความยาวอย่างน้อย 2 ตัวอักษร' })
    .trim(),
  phoneNumber: z
    .string()
    .min(9, { message: 'เบอร์โทรศัพท์ต้องมีความยาวอย่างน้อย 9 หลัก' })
    .trim(),
  role: z.enum(['ตัวแทนฝ่ายขาย', 'ผู้จัดการ'], {
    message: 'กรุณาเลือกตำแหน่งที่ถูกต้อง',
  }),
  password: z
    .string()
    .min(6, { message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร' })
    .trim()
    .optional()
    .or(z.literal('')),
  nickname: z.preprocess((val) => val === '' ? undefined : val, z.string().optional()),
  branch: z.preprocess((val) => val === '' ? undefined : val, z.string().optional()),
  teamLeader: z.preprocess((val) => val === '' ? undefined : val, z.string().optional()),
  position: z.preprocess((val) => val === '' ? undefined : val, z.string().optional()),
  department: z.preprocess((val) => val === '' ? undefined : val, z.string().optional()),
  startDate: z.preprocess((val) => val === '' ? undefined : val, z.string().optional()),
})

export const LoginFormSchema = z.object({
  employeeId: z.string().min(1, { message: 'กรุณากรอกรหัสพนักงาน' }),
  password: z.string().min(1, { message: 'กรุณากรอกรหัสผ่าน' }),
})

export const ForgotPasswordFormSchema = z.object({
  phoneNumber: z
    .string()
    .min(9, { message: 'เบอร์โทรศัพท์ต้องมีความยาวอย่างน้อย 9 หลัก' })
    .trim(),
})

export type FormState =
  | {
    errors?: {
      employeeId?: string[]
      fullName?: string[]
      phoneNumber?: string[]
      role?: string[]
      password?: string[]
      nickname?: string[]
      branch?: string[]
      teamLeader?: string[]
      position?: string[]
      department?: string[]
      startDate?: string[]
    }
    message?: string
    phoneNumber?: string
    data?: Record<string, any>
  }
  | undefined

export interface SessionPayload {
  userId: string
  expiresAt: Date
}
