
'use server'


import { LoginFormSchema, ForgotPasswordFormSchema, FormState } from '@/app/lib/definitions'
import { createSession, deleteSession } from '@/app/lib/session'
import { redirect } from 'next/navigation'
import bcrypt from 'bcryptjs'
import prisma from '@/app/lib/db'
import { teraDb } from '@/app/lib/teraDb'
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

  const { employeeId: rawEmployeeId, password } = validatedFields.data
  const employeeId = rawEmployeeId.trim().toUpperCase();

  let redirectPath = '/dashboard';

  try {
    let employee = null;
    let hrDbFailed = false;
    try {
      // 1. Retrieve data from TERA_db. 
      employee = await teraDb.employees.findUnique({
        where: { emp_id: employeeId },
        include: {
          departments: true,
          job_positions: true,
        }
      });
    } catch (dbErr) {
      console.warn(`Failed to connect to HR database for emp_id ${employeeId}:`, dbErr);
      hrDbFailed = true;
    }

    if (hrDbFailed || (!employee)) {
      // Fallback: Check local CRM database if HR DB failed
      const existingUser = await prisma.user.findUnique({ where: { employeeId } });
      
      if (existingUser && existingUser.isActive) {
        const passwordMatch = await bcrypt.compare(password, existingUser.password);
        if (passwordMatch) {
          await createSession(existingUser.id);
          if (existingUser.role === 'อื่นๆ') {
            redirectPath = '/department';
          }
          // We must NOT call redirect inside try/catch, so we set a flag and break out by skipping the rest of the block
          // But since we want to redirect at the end of the function, we just do nothing here to reach the end.
        } else {
          return { message: 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง' };
        }
      } else {
        return {
          message: hrDbFailed 
            ? 'ไม่สามารถเชื่อมต่อระบบบุคลากรได้ และไม่พบข้อมูลสำรองของท่านในระบบ' 
            : 'รหัสพนักงานไม่ถูกต้อง หรือบัญชีของท่านถูกระงับการใช้งาน'
        };
      }
    } else {
      // Normal flow when HR DB is working and employee is found
      if (!employee.is_active) {
        console.log(`Failed login: emp_id '${employeeId}' is inactive in HR DB.`);
        return { message: 'รหัสพนักงานไม่ถูกต้อง หรือบัญชีของท่านถูกระงับการใช้งาน' };
      }

      // 2. verify pin_hash
      const passwordMatch = await bcrypt.compare(password, employee.pin_hash || '');
      if (!passwordMatch) {
        console.log(`Failed login: Password mismatch for ${employeeId}`);
        return { message: 'รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง' };
      }

      // 3. Map department/job_position → CRM role
      const title = employee.job_positions?.title || '';
      const deptName = employee.departments?.name || '';
      
      let crmRole = 'ตัวแทนฝ่ายขาย';
      const salesDepts = ['sales', 'automation', 'telesales', 'solar pump', 'solar roof', 'support', 'business development', 'บริหาร'];
      const isSalesDept = deptName ? salesDepts.some(d => deptName.toLowerCase().includes(d)) : false;
      
      if (deptName && !isSalesDept) {
        crmRole = 'อื่นๆ';
      } else {
        if (/(MGR|Mgr|Sup|Manager|MD|Director|บริหาร)/i.test(title)) {
          crmRole = 'ผู้จัดการ';
        }
      }

      // 4. Upsert user in CRM DB
      const crmUser = await prisma.user.upsert({
        where: { employeeId },
        update: {
          fullName: employee.name,
          phoneNumber: employee.phone_number || null,
          password: employee.pin_hash || '',
          isActive: true,
        },
        create: {
          employeeId,
          fullName: employee.name,
          phoneNumber: employee.phone_number || null,
          role: crmRole,
          password: employee.pin_hash || '',
          isActive: true,
        }
      });

      // 5. Create session
      await createSession(crmUser.id);

      // 6. Set redirect path for non-sales roles
      const isMarketingManager = crmRole.toLowerCase() === 'marketing manager' || crmRole.toLowerCase() === 'ผู้จัดการฝ่ายการตลาด' || crmRole.toLowerCase() === 'ผู้จัดการการตลาด' || crmRole.toLowerCase() === 'ผู้การจัดการตลาด';
      const isBackofficeRole = !isMarketingManager && ['accounting', 'บัญชี', 'purchasing', 'จัดซื้อ', 'warehouse', 'คลังสินค้า', 'marketing', 'การตลาด', 'admin'].some(r => crmRole.toLowerCase().includes(r));
      if (crmRole === 'อื่นๆ' || isBackofficeRole) {
        redirectPath = '/department';
      }
    }
  } catch (error) {
    console.error('Login error:', error);
    return {
      message: 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ กรุณาลองใหม่อีกครั้ง'
    };
  }

  // Redirect
  redirect(redirectPath)
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

export async function getMyDepartment() {
  const user = await getUser();
  if (!user) return null;
  let teraEmployee = null;
  try {
    teraEmployee = await teraDb.employees.findUnique({
      where: { emp_id: user.employeeId },
      include: { departments: true }
    });
  } catch (err) {
    console.warn("Failed to fetch employee from HR database in getMyDepartment:", err);
  }
  return teraEmployee?.departments?.name || null;
}


