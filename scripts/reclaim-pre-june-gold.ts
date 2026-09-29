import prisma from '../src/app/lib/db';

async function main() {
  const isExecute = process.argv.includes('--execute');
  console.log(`=== GOLD MEDAL RECLAIM SCRIPT (Pre-June 2026) ===`);
  console.log(`Mode: ${isExecute ? 'EXECUTE (Modifying Database)' : 'DRY RUN (Preview Only)'}\n`);

  const june1 = new Date('2026-06-01T00:00:00+07:00');

  // 1. Find all deal_closed ledgers
  const allDealLedgers = await prisma.coin_ledgers.findMany({
    where: {
      source_key: { startsWith: 'deal_closed:' }
    },
    include: {
      employees: {
        select: {
          emp_id: true,
          first_name: true,
          last_name: true
        }
      }
    },
    orderBy: { created_at: 'asc' }
  });

  const quoteIds = Array.from(new Set(allDealLedgers.map(l => l.source_key?.split(':')[1]).filter(Boolean))) as string[];
  const quotations = await prisma.quotation.findMany({
    where: { id: { in: quoteIds } },
    select: {
      id: true,
      quotationNumber: true,
      billingDate: true,
      quotationDate: true,
      createdAt: true,
      totalAmountBeforeVat: true
    }
  });

  const quoteMap = new Map(quotations.map(q => [q.id, q]));

  // 2. Filter ledgers where quotation billingDate < 2026-06-01
  const ledgersToReclaim = allDealLedgers.filter(l => {
    const qId = l.source_key?.split(':')[1] || '';
    const q = quoteMap.get(qId);
    return q && q.billingDate && q.billingDate < june1;
  });

  console.log(`Found ${ledgersToReclaim.length} deal_closed ledgers to reclaim across 78 quotations (billingDate < 2026-06-01).`);

  // Check if any has already been reclaimed
  const existingReclaimKeys = new Set(
    (await prisma.coin_ledgers.findMany({
      where: {
        source_key: { startsWith: 'reclaim_deal_closed:' }
      },
      select: { source_key: true }
    })).map(l => l.source_key)
  );

  const pendingReclaimLedgers = ledgersToReclaim.filter(l => !existingReclaimKeys.has(`reclaim_${l.source_key}`));
  console.log(`Ledgers not yet reclaimed: ${pendingReclaimLedgers.length}`);

  if (pendingReclaimLedgers.length === 0) {
    console.log('All pre-June 2026 deal_closed medals have already been reclaimed.');
    return;
  }

  // Calculate totals per employee
  const empReclaimMap: Record<string, {
    name: string;
    coins: number;
    ledgers: typeof pendingReclaimLedgers;
  }> = {};

  for (const l of pendingReclaimLedgers) {
    const empId = l.emp_id;
    const name = l.employees ? `${l.employees.first_name || ''} ${l.employees.last_name || ''}`.trim() : empId;
    if (!empReclaimMap[empId]) {
      empReclaimMap[empId] = { name, coins: 0, ledgers: [] };
    }
    empReclaimMap[empId].coins += l.amount;
    empReclaimMap[empId].ledgers.push(l);
  }

  // 3. Inspect TG69001 pending redemption #24
  const tgRedemption = await prisma.reward_redemptions.findUnique({
    where: { id: 24 },
    include: { rewards: true }
  });

  console.log('\n--- TG69001 Pending Redemption Status ---');
  if (tgRedemption && tgRedemption.status === 'pending') {
    console.log(`Found pending redemption ID 24: "${tgRedemption.rewards?.name}"`);
    console.log(`Costs:`, tgRedemption.costs);
  } else {
    console.log(`Redemption ID 24 is already status: ${tgRedemption?.status}`);
  }

  // Fetch current balances
  const balancesBefore: Record<string, number> = {};
  for (const empId of Object.keys(empReclaimMap)) {
    const coin = await prisma.employee_coins.findUnique({
      where: { emp_id_coin_type_id: { emp_id: empId, coin_type_id: 'GOLD' } }
    });
    balancesBefore[empId] = coin?.balance || 0;
  }

  console.log('\n--- Summary Table of Deductions & Balances ---');
  let grandTotalCoins = 0;
  for (const [empId, data] of Object.entries(empReclaimMap)) {
    grandTotalCoins += data.coins;
    let refund = 0;
    if (empId === 'TG69001' && tgRedemption?.status === 'pending') {
      refund = 8;
    }
    const current = balancesBefore[empId];
    const after = current + refund - data.coins;
    console.log(
      `${empId.padEnd(8)} | ${data.name.padEnd(28)} | Current: ${String(current).padStart(3)} | ` +
      `Refund: +${String(refund).padStart(2)} | Reclaim: -${String(data.coins).padStart(2)} | ` +
      `Final: ${String(after).padStart(3)} (Ledgers: ${data.ledgers.length})`
    );
  }
  console.log(`Total coins to reclaim: ${grandTotalCoins}`);

  if (!isExecute) {
    console.log('\nTo execute this transaction, run with --execute');
    return;
  }

  console.log('\nExecuting transaction...');
  await prisma.$transaction(async (tx) => {
    const now = new Date();

    // Step A: Cancel TG69001 redemption #24 if pending and refund coins
    if (tgRedemption && tgRedemption.status === 'pending') {
      console.log('Cancelling redemption #24 and refunding coins...');
      await tx.reward_redemptions.update({
        where: { id: 24 },
        data: {
          status: 'cancelled',
          cancelled_reason: 'Cancelled due to medal system rollback prior to June 2026'
        }
      });

      const costs = tgRedemption.costs as Array<{ amount: number; coin_type: string }> || [];
      for (const c of costs) {
        // Refund to employee_coins
        await tx.employee_coins.upsert({
          where: { emp_id_coin_type_id: { emp_id: 'TG69001', coin_type_id: c.coin_type } },
          update: { balance: { increment: c.amount } },
          create: { emp_id: 'TG69001', coin_type_id: c.coin_type, balance: c.amount }
        });

        // Add refund ledger
        await tx.coin_ledgers.create({
          data: {
            emp_id: 'TG69001',
            coin_type_id: c.coin_type,
            amount: c.amount,
            transaction_type: 'REFUND',
            source_key: `refund_redemption_24_${c.coin_type}`,
            description: `Refund 1x คูปองเงินสด 3200 บาท (Cancelled due to pre-June 2026 medal rollback)`,
            created_at: now
          }
        });
      }
      console.log('Successfully refunded redemption #24 coins.');
    }

    // Step B: Create reversal ledgers and deduct balances for all 15 employees
    for (const l of pendingReclaimLedgers) {
      const q = quoteMap.get(l.source_key?.split(':')[1] || '');
      const qNum = q?.quotationNumber || '';

      // 1. Create reversal ledger entry
      await tx.coin_ledgers.create({
        data: {
          emp_id: l.emp_id,
          coin_type_id: 'GOLD',
          amount: -l.amount,
          transaction_type: 'DEDUCT',
          source_key: `reclaim_${l.source_key}`,
          description: `ดึงเหรียญทองคืนจากการปิดดีลก่อนเดือนมิถุนายน 2026 (${qNum})`,
          created_at: now
        }
      });

      // 2. Decrement balance
      await tx.employee_coins.update({
        where: { emp_id_coin_type_id: { emp_id: l.emp_id, coin_type_id: 'GOLD' } },
        data: { balance: { decrement: l.amount } }
      });
    }

    console.log(`Successfully created ${pendingReclaimLedgers.length} reversal ledgers and updated balances.`);
  }, {
    timeout: 60000 // 60s timeout for large transaction
  });

  console.log('\n=== RECLAIM COMPLETED SUCCESSFULLY ===');

  // Verify final balances
  console.log('\n--- Final Verified Balances ---');
  for (const empId of Object.keys(empReclaimMap)) {
    const coin = await prisma.employee_coins.findUnique({
      where: { emp_id_coin_type_id: { emp_id: empId, coin_type_id: 'GOLD' } }
    });
    console.log(`${empId}: ${coin?.balance} GOLD`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
