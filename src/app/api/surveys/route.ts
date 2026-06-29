import { NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import { format } from 'date-fns';
import { encryptString } from '@/utils/crypto';
import { siteSurveySchema } from '@/app/lib/surveySchema';

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();

    // Validate request body against Zod schema
    const validationResult = siteSurveySchema.safeParse(rawBody);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.format() },
        { status: 400 }
      );
    }

    const body = validationResult.data;
    const {
      id,
      surveyNumber,
      surveyDate,
      companyId,
      customerName,
      projectName,
      projectLocation,
      coordinatorName,
      coordinatorPhone,
      salespersonId,
      surveyorName,
      status,
      version,
      latitude,
      longitude,
      hasSingleLineDiagram,
      requiredInfoChecklist,
      loadProfileFileUrl,
      amrCustomerCode,
      roofStructureFileUrl,
      buildingPlanFileUrl,
      buildingElectricalFileUrl,
      electricalCabinetFileUrl,
      additionalRemark,

      estimatedPrice,
      estimationNote,
      estimatedByUserId,
      estimatedAt,
      estimationStatus,

      usageBehavior,
      electricalProfile,
      tariffSelection,
      structure,
      qa,

      photos,
      documents,
      electricityBill
    } = body;

    // Encrypt AMR credentials if provided
    let amrUsernameEncrypted = electricalProfile?.amrUsernameEncrypted || null;
    let amrPasswordEncrypted = electricalProfile?.amrPasswordEncrypted || null;

    if (electricalProfile?.amrPasswordPlain) {
      amrPasswordEncrypted = encryptString(electricalProfile.amrPasswordPlain);
    }
    if (electricalProfile?.amrUsernamePlain) {
      amrUsernameEncrypted = encryptString(electricalProfile.amrUsernamePlain);
    }

    // If ID is provided, perform update with Optimistic Locking
    if (id) {
      // First check version to prevent last-write-wins
      const existing = await prisma.siteSurvey.findUnique({
        where: { id },
        select: { version: true }
      });

      if (!existing) {
        return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
      }

      if (existing.version !== version) {
        return NextResponse.json(
          { error: 'Version conflict. The survey was modified by someone else.', currentVersion: existing.version },
          { status: 409 }
        );
      }

      // Update with transaction
      const updatedSurvey = await prisma.$transaction(async (tx: any) => {
        // 1. Update the main SiteSurvey
        const survey = await tx.siteSurvey.update({
          where: { id },
          data: {
            surveyNumber,
            surveyDate: new Date(surveyDate),
            companyId,
            customerName,
            projectName,
            projectLocation,
            coordinatorName,
            coordinatorPhone,
            salespersonId,
            surveyorName,
            status,
            version: version + 1, // Increment version
            latitude,
            longitude,
            hasSingleLineDiagram,
            requiredInfoChecklist,
            loadProfileFileUrl,
            amrCustomerCode,
            roofStructureFileUrl,
            buildingPlanFileUrl,
            buildingElectricalFileUrl,
            electricalCabinetFileUrl,
            additionalRemark,
            estimatedPrice,
            estimationNote,
            estimatedByUserId,
            estimatedAt: estimatedAt ? new Date(estimatedAt) : null,
            estimationStatus,
          }
        });

        // 2. Upsert Section 1: Usage Behavior
        if (usageBehavior) {
          await tx.surveyUsageBehavior.upsert({
            where: { surveyId: id },
            update: usageBehavior,
            create: { ...usageBehavior, surveyId: id }
          });
        }

        // 3. Upsert Section 2: Electrical Profile
        if (electricalProfile) {
          const profileData = {
            ...electricalProfile,
            amrUsernameEncrypted,
            amrPasswordEncrypted,
          };
          delete profileData.amrUsernamePlain;
          delete profileData.amrPasswordPlain;

          await tx.surveyElectricalProfile.upsert({
            where: { surveyId: id },
            update: profileData,
            create: { ...profileData, surveyId: id }
          });
        }

        // 4. Upsert Section 2.3: Tariff Selection & Tiers
        if (tariffSelection) {
          const { tiers, ...selectionData } = tariffSelection;
          const selection = await tx.surveyTariffSelection.upsert({
            where: { surveyId: id },
            update: selectionData,
            create: { ...selectionData, surveyId: id }
          });

          if (tiers) {
            await tx.surveyTariffTier.deleteMany({ where: { selectionId: selection.id } });
            if (tiers.length > 0) {
              await tx.surveyTariffTier.createMany({
                data: tiers.map((t: any) => ({ ...t, selectionId: selection.id }))
              });
            }
          }
        }

        // 5. Upsert Section 3: Structure
        if (structure) {
          const { roofAges, ...structureData } = structure;
          const updatedStructure = await tx.surveyStructure.upsert({
            where: { surveyId: id },
            update: structureData,
            create: { ...structureData, surveyId: id }
          });

          if (roofAges) {
            await tx.surveyRoofAge.deleteMany({ where: { structureId: updatedStructure.id } });
            if (roofAges.length > 0) {
              await tx.surveyRoofAge.createMany({
                data: roofAges.map((r: any) => ({ ...r, structureId: updatedStructure.id }))
              });
            }
          }
        }

        // 6. Upsert Section 6: QA
        if (qa) {
          await tx.surveyQA.upsert({
            where: { surveyId: id },
            update: qa,
            create: { ...qa, surveyId: id }
          });
        }

        // 7. Update Media & Docs (Replace all for simplicity, or handle diff)
        if (photos) {
          await tx.surveyPhoto.deleteMany({ where: { surveyId: id } });
          if (photos.length > 0) {
            await tx.surveyPhoto.createMany({
              data: photos.map((p: any) => ({ ...p, surveyId: id }))
            });
          }
        }

        if (documents) {
          await tx.surveyDocument.deleteMany({ where: { surveyId: id } });
          if (documents.length > 0) {
            await tx.surveyDocument.createMany({
              data: documents.map((d: any) => ({ ...d, surveyId: id }))
            });
          }
        }

        if (electricityBill) {
          const billData = typeof electricityBill === 'string' ? { fileUrl: electricityBill } : electricityBill;
          await tx.surveyBill.upsert({
            where: { surveyId: id },
            update: billData,
            create: { ...billData, surveyId: id }
          });
        }

        return survey;
      });

      return NextResponse.json(updatedSurvey);
    }

    // Create new Survey
    else {
      // Generate Sequential Survey Number
      const datePrefix = `SV${format(new Date(), 'yyyyMMdd')}-`;
      const todaySurveys = await prisma.siteSurvey.findMany({
        where: {
          surveyNumber: { startsWith: datePrefix }
        },
        orderBy: { surveyNumber: 'desc' },
        take: 1
      });

      let finalSurveyNumber = `${datePrefix}001`;
      if (todaySurveys.length > 0) {
        const lastNum = parseInt(todaySurveys[0].surveyNumber.split('-')[1] || '0', 10);
        finalSurveyNumber = `${datePrefix}${(lastNum + 1).toString().padStart(3, '0')}`;
      }

      const newSurvey = await prisma.$transaction(async (tx: any) => {
        const survey = await tx.siteSurvey.create({
          data: {
            surveyNumber: finalSurveyNumber,
            surveyDate: new Date(surveyDate),
            companyId,
            customerName,
            projectName,
            projectLocation,
            coordinatorName,
            coordinatorPhone,
            salespersonId,
            surveyorName,
            status,
            version: 1,
            latitude,
            longitude,
            hasSingleLineDiagram,
            requiredInfoChecklist,
            loadProfileFileUrl,
            amrCustomerCode,
            roofStructureFileUrl,
            buildingPlanFileUrl,
            buildingElectricalFileUrl,
            electricalCabinetFileUrl,
            additionalRemark,
            estimatedPrice,
            estimationNote,
            estimatedByUserId,
            estimatedAt: estimatedAt ? new Date(estimatedAt) : null,
            estimationStatus,
          }
        });

        const sId = survey.id;

        if (usageBehavior) await tx.surveyUsageBehavior.create({ data: { ...usageBehavior, surveyId: sId } });

        if (electricalProfile) {
          const profileData = { ...electricalProfile, amrUsernameEncrypted, amrPasswordEncrypted };
          delete profileData.amrUsernamePlain;
          delete profileData.amrPasswordPlain;
          await tx.surveyElectricalProfile.create({ data: { ...profileData, surveyId: sId } });
        }

        if (tariffSelection) {
          const { tiers, ...selectionData } = tariffSelection;
          const selection = await tx.surveyTariffSelection.create({ data: { ...selectionData, surveyId: sId } });
          if (tiers && tiers.length > 0) {
            await tx.surveyTariffTier.createMany({ data: tiers.map((t: any) => ({ ...t, selectionId: selection.id })) });
          }
        }

        if (structure) {
          const { roofAges, ...structureData } = structure;
          const createdStructure = await tx.surveyStructure.create({ data: { ...structureData, surveyId: sId } });
          if (roofAges && roofAges.length > 0) {
            await tx.surveyRoofAge.createMany({
              data: roofAges.map((r: any) => ({ ...r, structureId: createdStructure.id }))
            });
          }
        }
        if (qa) await tx.surveyQA.create({ data: { ...qa, surveyId: sId } });
        if (photos && photos.length > 0) await tx.surveyPhoto.createMany({ data: photos.map((p: any) => ({ ...p, surveyId: sId })) });
        if (documents && documents.length > 0) await tx.surveyDocument.createMany({ data: documents.map((d: any) => ({ ...d, surveyId: sId })) });
        if (electricityBill) {
          const billData = typeof electricityBill === 'string' ? { fileUrl: electricityBill } : electricityBill;
          await tx.surveyBill.create({ data: { ...billData, surveyId: sId } });
        }

        return survey;
      });

      return NextResponse.json(newSurvey, { status: 201 });
    }
  } catch (error: any) {
    console.error('Error in POST /api/surveys:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
