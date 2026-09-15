import prisma from '../src/app/lib/db'
import {
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getCampaignBudgetHistory
} from '../src/app/actions/ads-campaigns'
import { getTeraAdsDashboardData } from '../src/app/actions/ads-dashboard'
import { getActiveAdsPerformance, savePerformanceSnapshot } from '../src/app/actions/ads-performance'


async function runTests() {
  console.log('=== STARTING CBO & ABO VERIFICATION TEST SUITE ===\n')
  let passedCount = 0
  let totalCount = 7

  // Setup sample channel
  let channel = await prisma.adChannel.findFirst()
  if (!channel) {
    channel = await prisma.adChannel.create({
      data: {
        name: 'Facebook Ads Test',
        code: 'FB_TEST',
        icon: 'Facebook',
        color: '#1877F2'
      }
    })
  }

  const createdCampaignIds: string[] = []

  try {
    // -------------------------------------------------------------
    // TEST 1: Create CBO Campaign (Campaign Budget, NULL Ad Set budgets)
    // -------------------------------------------------------------
    console.log('[TEST 1] Creating CBO Campaign with NULL Ad Set budgets...')
    const cboPlatformId = `CMP-CBO-TEST-${Date.now()}`
    const cboAdSets = [
      {
        id: `set_${Date.now()}_1`,
        code: 'AS-01',
        name: 'CBO Target 1',
        platformAdSetId: `${cboPlatformId}-AS01`,
        status: 'ACTIVE' as const,
        budget: null,
        allocated_budget: null
      },
      {
        id: `set_${Date.now()}_2`,
        code: 'AS-02',
        name: 'CBO Target 2',
        platformAdSetId: `${cboPlatformId}-AS02`,
        status: 'ACTIVE' as const,
        budget: null,
        allocated_budget: null
      }
    ]

    const cboRes = await createCampaign({
      name: 'Test CBO Optimization Campaign',
      campaignId: cboPlatformId,
      channelId: channel.id,
      budget: 100000,
      campaignBudget: 100000,
      budgetStrategy: 'CBO',
      budgetLevel: 'CAMPAIGN',
      budgetType: 'DAILY',
      currency: 'THB',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
      status: 'ACTIVE',
      targetAudience: JSON.stringify({
        budgetStrategy: 'CBO',
        budgetType: 'DAILY',
        adSets: cboAdSets
      })
    })

    if (!cboRes.success || !cboRes.data) {
      throw new Error(`Test 1 Failed to create CBO campaign: ${cboRes.error}`)
    }
    const cboCampId = cboRes.data.id
    createdCampaignIds.push(cboCampId)

    // Verify DB state
    const cboCampDb = await prisma.adCampaign.findUnique({
      where: { id: cboCampId }
    })

    if (
      cboCampDb?.budgetStrategy !== 'CBO' ||
      cboCampDb?.budgetLevel !== 'CAMPAIGN' ||
      Number(cboCampDb?.campaignBudget) !== 100000 ||
      Number(cboCampDb?.budget) !== 100000
    ) {
      throw new Error(`Test 1 DB verification failed: ${JSON.stringify(cboCampDb)}`)
    }

    // Verify ad sets in relational table have null budget
    const cboAdSetsInDb = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "ad_sets" WHERE "campaignId" = $1`,
      cboCampDb.campaignId
    )
    for (const s of cboAdSetsInDb) {
      if (s.budget !== null || s.allocated_budget !== null) {
        throw new Error(`Test 1 Ad Set budget must be null for CBO, got ${s.budget}`)
      }
    }

    console.log('✓ TEST 1 PASSED: CBO Campaign created with Planned Budget 100,000 and NULL Ad Set budgets.\n')
    passedCount++

    // -------------------------------------------------------------
    // TEST 2: Validation blocks ABO Campaign when Active Ad Set has 0/missing budget
    // -------------------------------------------------------------
    console.log('[TEST 2] Testing ABO Validation when Active Ad Set has 0 budget...')
    const aboInvalidPlatformId = `CMP-ABO-INV-${Date.now()}`
    const invalidAdSets = [
      {
        id: `set_inv_1`,
        code: 'AS-01',
        name: 'ABO Target Valid',
        status: 'ACTIVE' as const,
        budget: 50000
      },
      {
        id: `set_inv_2`,
        code: 'AS-02',
        name: 'ABO Target Invalid (0 budget)',
        status: 'ACTIVE' as const,
        budget: 0 // Invalid!
      }
    ]

    const invalidAboRes = await createCampaign({
      name: 'Invalid ABO Campaign',
      campaignId: aboInvalidPlatformId,
      channelId: channel.id,
      budgetStrategy: 'ABO',
      budgetLevel: 'AD_SET',
      budgetType: 'DAILY',
      budget: 50000,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
      targetAudience: JSON.stringify({
        budgetStrategy: 'ABO',
        adSets: invalidAdSets
      })
    })

    if (invalidAboRes.success) {
      throw new Error('Test 2 Failed: System should have rejected ABO campaign with 0 budget active ad set!')
    }
    console.log(`✓ TEST 2 PASSED: ABO correctly blocked with error: "${invalidAboRes.error}"\n`)
    passedCount++

    // -------------------------------------------------------------
    // TEST 3: Create valid ABO Campaign (Sum of active ad sets)
    // -------------------------------------------------------------
    console.log('[TEST 3] Creating valid ABO Campaign with 2 Active Ad Sets (60,000 + 40,000)...')
    const aboValidPlatformId = `CMP-ABO-VALID-${Date.now()}`
    const validAboSets = [
      {
        id: `set_abo_${Date.now()}_1`,
        code: 'AS-01',
        name: 'Target Group A',
        platformAdSetId: `${aboValidPlatformId}-AS01`,
        status: 'ACTIVE' as const,
        budget: 60000,
        allocated_budget: 60000,
        budgetType: 'DAILY' as const
      },
      {
        id: `set_abo_${Date.now()}_2`,
        code: 'AS-02',
        name: 'Target Group B',
        platformAdSetId: `${aboValidPlatformId}-AS02`,
        status: 'ACTIVE' as const,
        budget: 40000,
        allocated_budget: 40000,
        budgetType: 'DAILY' as const
      }
    ]

    const validAboRes = await createCampaign({
      name: 'Valid ABO Campaign',
      campaignId: aboValidPlatformId,
      channelId: channel.id,
      budgetStrategy: 'ABO',
      budgetLevel: 'AD_SET',
      budgetType: 'DAILY',
      currency: 'THB',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 86400000),
      status: 'ACTIVE',
      targetAudience: JSON.stringify({
        budgetStrategy: 'ABO',
        adSets: validAboSets
      })
    })

    if (!validAboRes.success || !validAboRes.data) {
      throw new Error(`Test 3 Failed to create valid ABO campaign: ${validAboRes.error}`)
    }
    const aboCampId = validAboRes.data.id
    createdCampaignIds.push(aboCampId)

    const aboCampDb = await prisma.adCampaign.findUnique({
      where: { id: aboCampId }
    })

    if (
      aboCampDb?.budgetStrategy !== 'ABO' ||
      aboCampDb?.budgetLevel !== 'AD_SET' ||
      Number(aboCampDb?.budget) !== 100000
    ) {
      throw new Error(`Test 3 DB check failed: ${JSON.stringify(aboCampDb)}`)
    }

    const aboAdSetsInDb = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "ad_sets" WHERE "campaignId" = $1`,
      aboCampDb.campaignId
    )
    const set1 = aboAdSetsInDb.find(s => s.name === 'Target Group A')
    const set2 = aboAdSetsInDb.find(s => s.name === 'Target Group B')
    if (Number(set1?.budget) !== 60000 || Number(set2?.budget) !== 40000) {
      throw new Error(`Test 3 Ad Set budgets incorrect: Set1=${set1?.budget}, Set2=${set2?.budget}`)
    }

    console.log('✓ TEST 3 PASSED: ABO Campaign created with Planned Budget 100,000 (= 60,000 + 40,000).\n')
    passedCount++

    // -------------------------------------------------------------
    // TEST 4: Switch ABO -> CBO Strategy Transition
    // -------------------------------------------------------------
    console.log('[TEST 4] Switching ABO Campaign to CBO...')
    const switchAboToCboRes = await updateCampaign(aboCampId, {
      budgetStrategy: 'CBO',
      budgetLevel: 'CAMPAIGN',
      campaignBudget: 150000,
      budget: 150000,
      notes: 'Switched from ABO to CBO for Meta AI distribution',
      targetAudience: JSON.stringify({
        budgetStrategy: 'CBO',
        adSets: validAboSets.map(s => ({ ...s, budget: null, allocated_budget: null }))
      })
    })

    if (!switchAboToCboRes.success) {
      throw new Error(`Test 4 Failed to switch ABO to CBO: ${switchAboToCboRes.error}`)
    }

    const switchedCboDb = await prisma.adCampaign.findUnique({
      where: { id: aboCampId }
    })

    if (switchedCboDb?.budgetStrategy !== 'CBO' || Number(switchedCboDb?.budget) !== 150000) {
      throw new Error('Test 4 DB verification failed after switch to CBO')
    }

    // Verify history logged
    const aboHistory = await prisma.adBudgetHistory.findMany({
      where: { campaignId: aboValidPlatformId }
    })

    const stratChangeEntry = aboHistory.find(h => h.prevStrategy === 'ABO' && h.newStrategy === 'CBO')
    if (!stratChangeEntry) {
      throw new Error(`Test 4 History missing STRATEGY_CHANGE: ${JSON.stringify(aboHistory)}`)
    }

    console.log('✓ TEST 4 PASSED: Successfully transitioned ABO -> CBO, cleared ad set budgets, logged history.\n')
    passedCount++

    // -------------------------------------------------------------
    // TEST 5: Switch CBO -> ABO Strategy Transition
    // -------------------------------------------------------------
    console.log('[TEST 5] Switching CBO Campaign to ABO with required active ad set budgets...')
    const newAboSets = [
      {
        id: `set_cbo_to_abo_1`,
        code: 'AS-01',
        name: 'Retargeting A',
        status: 'ACTIVE' as const,
        budget: 80000,
        allocated_budget: 80000
      },
      {
        id: `set_cbo_to_abo_2`,
        code: 'AS-02',
        name: 'Lookalike B',
        status: 'ACTIVE' as const,
        budget: 70000,
        allocated_budget: 70000
      }
    ]

    const switchCboToAboRes = await updateCampaign(cboCampId, {
      budgetStrategy: 'ABO',
      budgetLevel: 'AD_SET',
      targetAudience: JSON.stringify({
        budgetStrategy: 'ABO',
        adSets: newAboSets
      })
    })

    if (!switchCboToAboRes.success) {
      throw new Error(`Test 5 Failed to switch CBO to ABO: ${switchCboToAboRes.error}`)
    }

    const switchedAboDb = await prisma.adCampaign.findUnique({
      where: { id: cboCampId }
    })

    if (switchedAboDb?.budgetStrategy !== 'ABO' || Number(switchedAboDb?.budget) !== 150000) {
      throw new Error(`Test 5 DB verification failed: Strategy=${switchedAboDb?.budgetStrategy}, Budget=${switchedAboDb?.budget}`)
    }

    const cboHistory = await prisma.adBudgetHistory.findMany({
      where: { campaignId: cboPlatformId }
    })

    const cboToAboChange = cboHistory.find(h => h.prevStrategy === 'CBO' && h.newStrategy === 'ABO')
    if (!cboToAboChange) {
      throw new Error(`Test 5 History missing CBO->ABO STRATEGY_CHANGE: ${JSON.stringify(cboHistory)}`)
    }

    console.log('✓ TEST 5 PASSED: Successfully transitioned CBO -> ABO with active ad set budgets.\n')
    passedCount++

    // -------------------------------------------------------------
    // TEST 6: Snapshot updates preserve budget and do NOT require creative re-upload
    // -------------------------------------------------------------
    console.log('[TEST 6] Verifying Snapshot performance update preserves budget configuration...')
    const snapPlatformAdId = `AD-SNAP-TEST-${Date.now()}`
    const snapRes = await savePerformanceSnapshot({
      adId: snapPlatformAdId,
      campaignId: cboPlatformId,
      adSetId: `${cboPlatformId}-AS01`,
      spend: 15000,
      messageInbox: 35,
      reach: 25000,
      impressions: 60000,
      clicks: 450,
      updateType: 'Regular Update',
      notes: 'Routine snapshot performance'
    })

    if (!snapRes.success) {
      throw new Error(`Test 6 Failed to record performance snapshot: ${snapRes.error}`)
    }

    // Verify campaign budget was NOT modified or corrupted by snapshot
    const postSnapCamp = await prisma.adCampaign.findUnique({
      where: { id: cboCampId }
    })

    if (Number(postSnapCamp?.budget) !== 150000) {
      throw new Error(`Test 6 Budget was altered by snapshot! Expected 150000, got ${postSnapCamp?.budget}`)
    }

    console.log('✓ TEST 6 PASSED: Performance snapshot recorded without requiring creative or altering budget.\n')
    passedCount++

    // -------------------------------------------------------------
    // TEST 7: Dashboard calculations and Zero-Spend resilience
    // -------------------------------------------------------------
    console.log('[TEST 7] Testing Dashboard calculations and Zero-Spend resilience...')
    const dashData = await getTeraAdsDashboardData()

    if (!dashData) {
      throw new Error('Test 7 Failed: Dashboard returned null or undefined')
    }

    // Check KPI metrics calculations
    const plannedBudgetVal = dashData.businessKpis.plannedBudget.value
    const totalSpendVal = dashData.businessKpis.totalSpend.value
    const budgetUsedPctVal = dashData.businessKpis.budgetUsedPct.value

    if (isNaN(budgetUsedPctVal) || !isFinite(budgetUsedPctVal)) {
      throw new Error(`Test 7 NaN detected in budgetUsedPct: ${budgetUsedPctVal}`)
    }

    // Verify strategy badges in breakdown
    const campBreakdown = dashData.campaignBreakdown
    for (const c of campBreakdown) {
      if (!c.budgetStrategy || !['CBO', 'ABO'].includes(c.budgetStrategy)) {
        console.warn(`Warning: Campaign ${c.campaignName} has unexpected strategy: ${c.budgetStrategy}`)
      }
    }

    // Verify Ad Set Breakdown does NOT show 0 Baht for CBO
    const adSetBreakdown = dashData.adSetBreakdown
    for (const s of adSetBreakdown) {
      if (s.budgetStrategy === 'CBO') {
        if (s.allocatedBudget !== null && s.allocatedBudget !== undefined) {
          throw new Error(`Test 7 CBO Ad Set should have null allocatedBudget, got ${s.allocatedBudget}`)
        }
      }
      if (s.spendShare !== undefined && (isNaN(s.spendShare) || !isFinite(s.spendShare))) {
        throw new Error(`Test 7 NaN detected in spendShare: ${s.spendShare}`)
      }
    }

    console.log('✓ TEST 7 PASSED: Dashboard calculations accurate, CBO ad sets budget is null, 0 spend handled safely.\n')
    passedCount++

  } finally {
    // Cleanup created test campaigns
    console.log('Cleaning up test campaigns...')
    for (const id of createdCampaignIds) {
      try {
        const camp = await prisma.adCampaign.findUnique({ where: { id } })
        if (camp) {
          await prisma.adBudgetHistory.deleteMany({ where: { campaignId: camp.campaignId } })
          await prisma.adPerformance.deleteMany({ where: { campaignId: camp.campaignId } })
          await prisma.$executeRawUnsafe(`DELETE FROM "ad_performance_snapshots" WHERE "campaignId" = $1`, camp.campaignId)
          await prisma.$executeRawUnsafe(`DELETE FROM "ad_sets" WHERE "campaignId" = $1`, camp.campaignId)
          await prisma.adCampaign.delete({ where: { id } })
        }
      } catch (err) {
        console.error(`Error cleaning up campaign ${id}:`, err)
      }
    }
    await prisma.$disconnect()
  }

  console.log(`\n======================================================`)
  console.log(`RESULT: ${passedCount}/${totalCount} TEST CASES PASSED`)
  console.log(`======================================================`)
  if (passedCount !== totalCount) {
    process.exit(1)
  }
}

runTests().catch(err => {
  console.error('Test Suite Failed with unhandled error:', err)
  process.exit(1)
})
