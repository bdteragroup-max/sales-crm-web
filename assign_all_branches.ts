import prisma from './src/app/lib/db';

async function main() {
    const users = await prisma.user.findMany({
        where: { isActive: true }
    });

    const branches = [
        'BKK-HQ',
        'KK01',
        'PSNL01',
        'CMI01',
        'KRI01',
        'UB01',
        'SRT01',
        'UDN01',
        'SRN01',
        'ROI01',
        'BKK-WH',
        'SMK'
    ];

    let i = 0;
    for (const user of users) {
        // Skip users that already have a branch
        const existing = await prisma.employeeSale.findUnique({ where: { userId: user.id } });
        if (!existing || !existing.branch) {
            const branch = branches[i % branches.length];
            await prisma.employeeSale.upsert({
                where: { userId: user.id },
                update: { branch },
                create: { userId: user.id, branch, fullName: user.fullName || 'Unknown' }
            });
            i++;
        }
    }
    console.log(`Assigned branches to ${i} users.`);
}
main().finally(() => process.exit(0));
