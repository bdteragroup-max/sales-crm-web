import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/app/lib/db';
import { format } from 'date-fns';
import { encryptString, decryptString } from '@/utils/crypto';
import { siteSurveySchema } from '@/app/lib/surveySchema';
import { getUser } from '@/app/lib/dal';
import { isSurveyProjectRole, normalizeSurveyCompanyCode } from '@/app/lib/surveyMetadata';
import { notifyUsers } from '@/app/lib/pushNotification';
import {
  hasSurveyExtendedFieldsInRuntime,
  hydrateSurveySignaturesFallback,
  persistSurveySignaturesFallback,
} from '@/app/lib/surveySignaturesDb';

async function notifySurveyWorkflowTransition(params: {
  survey: {
    id: string;
    surveyNumber: string;
    customerName?: string | null;
    projectName?: string | null;
    status?: string | null;
    salespersonId?: string | null;
  };
  previousStatus?: string | null;
  actorUserId: string;
  actorName: string;
}) {
  const { survey, previousStatus, actorUserId, actorName } = params;
  const nextStatus = survey.status;
  if (!nextStatus || nextStatus === previousStatus) return;

  try {
    const targetLabel = `${survey.customerName || 'ลูกค้า'}${
      survey.projectName ? ` • ${survey.projectName}` : ''
    }`;

    if (nextStatus === 'Pending Estimate') {
      const activeUsers = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, role: true },
      });
      const projectUserIds = activeUsers
        .filter((u) => isSurveyProjectRole(u.role) && u.id !== actorUserId)
        .map((u) => u.id);

      if (projectUserIds.length > 0) {
        await notifyUsers(projectUserIds, {
          title: `แบบสำรวจไซต์งานส่งต่อประเมินราคา (${survey.surveyNumber})`,
          body: `${targetLabel} ส่งต่อให้ทีมโปรเจคโดย ${actorName}`,
          url: `/sales/surveys?surveyId=${survey.id}`,
          category: 'SURVEY_PENDING_ESTIMATE',
        });
      }
      return;
    }

    if (
      (nextStatus === 'Estimated' || nextStatus === 'Need Info') &&
      survey.salespersonId &&
      survey.salespersonId !== actorUserId
    ) {
      const isEstimated = nextStatus === 'Estimated';
      await notifyUsers([survey.salespersonId], {
        title: isEstimated
          ? `ทีมโปรเจคประเมินราคาแล้ว (${survey.surveyNumber})`
          : `ทีมโปรเจคขอข้อมูลสำรวจเพิ่มเติม (${survey.surveyNumber})`,
        body: `${targetLabel} อัปเดตโดย ${actorName}`,
        url: `/sales/surveys?surveyId=${survey.id}`,
        category: isEstimated ? 'SURVEY_ESTIMATED' : 'SURVEY_NEED_INFO',
      });
    }
  } catch (notifyErr) {
    console.warn('[POST /api/surveys] Failed to send notification:', notifyErr);
  }
}

async function getHydratedSurvey(id: string) {
  const survey = await prisma.siteSurvey.findUnique({
    where: { id },
    include: {
      salesperson: { select: { id: true, fullName: true } },
      estimatedByUser: { select: { id: true, fullName: true } },
      company: {
        select: {
          id: true,
          companyName: true,
          address: true,
          subDistrict: true,
          district: true,
          province: true,
          postalCode: true,
        },
      },
      usageBehavior: true,
      electricalProfile: true,
      tariffSelection: {
        include: { tiers: true },
      },
      structure: {
        include: { roofAges: true },
      },
      qa: true,
      photos: true,
      documents: true,
      electricityBill: true,
    },
  });

  if (survey?.electricalProfile) {
    if (survey.electricalProfile.amrUsernameEncrypted) {
      (survey.electricalProfile as any).amrUsernamePlain = decryptString(survey.electricalProfile.amrUsernameEncrypted);
    }
    if (survey.electricalProfile.amrPasswordEncrypted) {
      (survey.electricalProfile as any).amrPasswordPlain = decryptString(survey.electricalProfile.amrPasswordEncrypted);
    }
  }
  return hydrateSurveySignaturesFallback(prisma, survey);
}

export async function POST(req: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
      companyCode,
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

      salesSignatureUrl,
      salesSignedAt,
      projectSignatureUrl,
      projectSignedAt,

      usageBehavior,
      electricalProfile,
      tariffSelection,
      structure,
      qa,

      photos,
      documents,
      electricityBill,
    } = body;

    const cleanCompanyId = companyId && companyId.trim() !== '' ? companyId.trim() : null;
    const cleanEstimatedByUserId =
      estimatedByUserId && estimatedByUserId.trim() !== '' ? estimatedByUserId.trim() : null;
    const cleanSalesSigUrl =
      salesSignatureUrl && salesSignatureUrl.trim() !== '' ? salesSignatureUrl.trim() : null;
    const cleanProjectSigUrl =
      projectSignatureUrl && projectSignatureUrl.trim() !== '' ? projectSignatureUrl.trim() : null;
    const parseOptDate = (d?: string | null) => {
      if (!d) return null;
      const dt = new Date(d);
      return Number.isNaN(dt.getTime()) ? null : dt;
    };
    const canWriteSigViaPrisma = hasSurveyExtendedFieldsInRuntime(prisma);
    const normalizedCompanyCode = normalizeSurveyCompanyCode(companyCode);
    const updateSignaturePatch = {
      ...(companyCode !== undefined ? { companyCode: normalizedCompanyCode } : {}),
      ...(salesSignatureUrl !== undefined ? { salesSignatureUrl: cleanSalesSigUrl } : {}),
      ...(salesSignedAt !== undefined ? { salesSignedAt: parseOptDate(salesSignedAt) } : {}),
      ...(projectSignatureUrl !== undefined ? { projectSignatureUrl: cleanProjectSigUrl } : {}),
      ...(projectSignedAt !== undefined ? { projectSignedAt: parseOptDate(projectSignedAt) } : {}),
    };
    const createSignatureFields = {
      companyCode: normalizedCompanyCode,
      salesSignatureUrl: cleanSalesSigUrl,
      salesSignedAt: parseOptDate(salesSignedAt),
      projectSignatureUrl: cleanProjectSigUrl,
      projectSignedAt: parseOptDate(projectSignedAt),
    };

    // Filter out totally blank rows before persisting
    const validPhotos = Array.isArray(photos)
      ? photos
          .filter((p) => (p.fileUrl && p.fileUrl.trim() !== '') || (p.photoType && p.photoType.trim() !== '') || (p.photoDesc && p.photoDesc.trim() !== ''))
          .map((p) => ({
            photoType: (p.photoType || '').trim(),
            fileUrl: (p.fileUrl || '').trim(),
            photoDesc: p.photoDesc || null,
          }))
      : undefined;

    const validDocuments = Array.isArray(documents)
      ? documents
          .filter((d) => (d.fileUrl && d.fileUrl.trim() !== '') || (d.documentType && d.documentType.trim() !== '') || (d.note && d.note.trim() !== ''))
          .map((d) => ({
            documentType: (d.documentType || '').trim(),
            customerProvided: Boolean(d.customerProvided),
            fileUrl: (d.fileUrl || '').trim(),
            note: d.note || null,
          }))
      : undefined;

    const billObj =
      electricityBill && typeof electricityBill === 'string'
        ? { fileUrl: electricityBill.trim(), billCount: null, note: null }
        : electricityBill && typeof electricityBill === 'object'
        ? {
            fileUrl: (electricityBill.fileUrl || '').trim(),
            billCount: electricityBill.billCount ?? null,
            note: electricityBill.note || null,
          }
        : null;

    // Encrypt AMR credentials if provided (or clear if explicitly emptied)
    let amrUsernameEncrypted = electricalProfile?.amrUsernameEncrypted || null;
    let amrPasswordEncrypted = electricalProfile?.amrPasswordEncrypted || null;

    if (electricalProfile?.amrPasswordPlain !== undefined) {
      amrPasswordEncrypted = electricalProfile.amrPasswordPlain
        ? encryptString(electricalProfile.amrPasswordPlain)
        : null;
    }
    if (electricalProfile?.amrUsernamePlain !== undefined) {
      amrUsernameEncrypted = electricalProfile.amrUsernamePlain
        ? encryptString(electricalProfile.amrUsernamePlain)
        : null;
    }

    // If ID is provided, perform update with Optimistic Locking
    if (id) {
      const existing = await prisma.siteSurvey.findUnique({
        where: { id },
        select: { version: true, status: true },
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

      const updatedSurvey = await prisma.$transaction(async (tx: any) => {
        const survey = await tx.siteSurvey.update({
          where: { id },
          data: {
            surveyNumber,
            surveyDate: new Date(surveyDate),
            companyId: cleanCompanyId,
            customerName,
            projectName,
            projectLocation,
            coordinatorName,
            coordinatorPhone,
            salespersonId,
            surveyorName,
            status,
            version: (version || existing.version) + 1,
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
            estimatedByUserId: cleanEstimatedByUserId,
            estimatedAt: estimatedAt ? new Date(estimatedAt) : null,
            estimationStatus,
            ...(canWriteSigViaPrisma ? updateSignaturePatch : {}),
          },
        });

        if (!canWriteSigViaPrisma) {
          await persistSurveySignaturesFallback(tx, id, updateSignaturePatch);
        }

        if (usageBehavior) {
          await tx.surveyUsageBehavior.upsert({
            where: { surveyId: id },
            update: usageBehavior,
            create: { ...usageBehavior, surveyId: id },
          });
        }

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
            create: { ...profileData, surveyId: id },
          });
        }

        if (tariffSelection) {
          const { tiers, ...selectionData } = tariffSelection;
          const selection = await tx.surveyTariffSelection.upsert({
            where: { surveyId: id },
            update: selectionData,
            create: { ...selectionData, surveyId: id },
          });

          if (tiers) {
            await tx.surveyTariffTier.deleteMany({ where: { selectionId: selection.id } });
            if (tiers.length > 0) {
              await tx.surveyTariffTier.createMany({
                data: tiers.map((t: any) => ({ ...t, selectionId: selection.id })),
              });
            }
          }
        }

        if (structure) {
          const { roofAges, ...structureData } = structure;
          const updatedStructure = await tx.surveyStructure.upsert({
            where: { surveyId: id },
            update: structureData,
            create: { ...structureData, surveyId: id },
          });

          if (roofAges) {
            await tx.surveyRoofAge.deleteMany({ where: { structureId: updatedStructure.id } });
            if (roofAges.length > 0) {
              await tx.surveyRoofAge.createMany({
                data: roofAges.map((r: any) => ({ ...r, structureId: updatedStructure.id })),
              });
            }
          }
        }

        if (qa) {
          await tx.surveyQA.upsert({
            where: { surveyId: id },
            update: qa,
            create: { ...qa, surveyId: id },
          });
        }

        if (validPhotos !== undefined) {
          await tx.surveyPhoto.deleteMany({ where: { surveyId: id } });
          if (validPhotos.length > 0) {
            await tx.surveyPhoto.createMany({
              data: validPhotos.map((p) => ({ ...p, surveyId: id })),
            });
          }
        }

        if (validDocuments !== undefined) {
          await tx.surveyDocument.deleteMany({ where: { surveyId: id } });
          if (validDocuments.length > 0) {
            await tx.surveyDocument.createMany({
              data: validDocuments.map((d) => ({ ...d, surveyId: id })),
            });
          }
        }

        if (billObj && billObj.fileUrl) {
          await tx.surveyBill.upsert({
            where: { surveyId: id },
            update: billObj,
            create: { ...billObj, surveyId: id },
          });
        } else if (electricityBill === null || (billObj && !billObj.fileUrl)) {
          await tx.surveyBill.deleteMany({ where: { surveyId: id } });
        }

        return survey;
      });

      revalidatePath('/sales/surveys');
      await notifySurveyWorkflowTransition({
        survey: updatedSurvey,
        previousStatus: existing.status,
        actorUserId: user.id,
        actorName: user.fullName || 'ผู้ใช้งาน',
      });
      const hydrated = await getHydratedSurvey(updatedSurvey.id);
      return NextResponse.json(hydrated || updatedSurvey);
    }

    // Create new Survey
    const datePrefix = `SV${format(new Date(), 'yyyyMMdd')}-`;
    const todaySurveys = await prisma.siteSurvey.findMany({
      where: {
        surveyNumber: { startsWith: datePrefix },
      },
      orderBy: { surveyNumber: 'desc' },
      take: 1,
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
          companyId: cleanCompanyId,
          customerName,
          projectName,
          projectLocation,
          coordinatorName,
          coordinatorPhone,
          salespersonId,
          surveyorName,
          status: status || 'Draft',
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
          estimatedByUserId: cleanEstimatedByUserId,
          estimatedAt: estimatedAt ? new Date(estimatedAt) : null,
          estimationStatus,
          ...(canWriteSigViaPrisma ? createSignatureFields : {}),
        },
      });

      const sId = survey.id;

      if (!canWriteSigViaPrisma) {
        await persistSurveySignaturesFallback(tx, sId, createSignatureFields);
      }

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
            data: roofAges.map((r: any) => ({ ...r, structureId: createdStructure.id })),
          });
        }
      }

      if (qa) await tx.surveyQA.create({ data: { ...qa, surveyId: sId } });
      if (validPhotos && validPhotos.length > 0) {
        await tx.surveyPhoto.createMany({ data: validPhotos.map((p) => ({ ...p, surveyId: sId })) });
      }
      if (validDocuments && validDocuments.length > 0) {
        await tx.surveyDocument.createMany({ data: validDocuments.map((d) => ({ ...d, surveyId: sId })) });
      }
      if (billObj && billObj.fileUrl) {
        await tx.surveyBill.create({ data: { ...billObj, surveyId: sId } });
      }

      return survey;
    });

    revalidatePath('/sales/surveys');
    await notifySurveyWorkflowTransition({
      survey: newSurvey,
      previousStatus: null,
      actorUserId: user.id,
      actorName: user.fullName || 'ผู้ใช้งาน',
    });
    const hydrated = await getHydratedSurvey(newSurvey.id);
    return NextResponse.json(hydrated || newSurvey, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/surveys:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
