const Module = require('module');
const origRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  if (id === 'server-only') {
    return {};
  }
  if (id === 'next/headers') {
    return {
      cookies: async () => ({
        get: () => ({ value: 'mock-session' }),
        set: () => {}
      })
    };
  }
  if (id === 'next/navigation') {
    return {
      redirect: () => {},
      useRouter: () => ({ push: () => {} }),
      usePathname: () => ''
    };
  }
  if (id === 'next/cache') {
    return {
      revalidatePath: () => {},
      revalidateTag: () => {}
    };
  }
  if (id.includes('dal') || id.endsWith('dal.ts') || id === '@/app/lib/dal') {
    return {
      verifySession: async () => ({ isAuth: true, userId: 'usr_test_admin' }),
      getUser: async () => ({
        id: 'usr_test_admin',
        fullName: 'Test Admin',
        role: 'ADMIN',
        department: 'MARKETING'
      })
    };
  }
  return origRequire.apply(this, arguments);
};
