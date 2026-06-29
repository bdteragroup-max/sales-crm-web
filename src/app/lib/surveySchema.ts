import { z } from 'zod';

export const surveyUsageBehaviorSchema = z.object({
  workingHours: z.string().optional().nullable(),
  workingDaysPerWeek: z.number().int().optional().nullable(),
  workingDaysPerYear: z.number().int().optional().nullable(),
  nonWorkingDaysPerWeek: z.number().int().optional().nullable(),
  nonWorkingDaysPerYear: z.number().int().optional().nullable(),
  dayNightRatio: z.string().optional().nullable(),
  avgBillThbPerMonth: z.number().optional().nullable(),
  mainEquipment: z.string().optional().nullable(),
});

export const surveyElectricalProfileSchema = z.object({
  gridProvider: z.string().optional().nullable(),
  userType: z.string().optional().nullable(),
  voltageLevel: z.array(z.string()).optional(),
  meterSize: z.array(z.string()).optional(),
  rateThbPerKwh: z.number().optional().nullable(),
  kwhQty: z.number().optional().nullable(),
  peakKwWeekday: z.number().optional().nullable(),
  peakKwWeekend: z.number().optional().nullable(),
  transformerCount: z.number().int().optional().nullable(),
  transformerBrand: z.string().optional().nullable(),
  transformerModel: z.string().optional().nullable(),
  transformerKva: z.number().optional().nullable(),
  breakerAmp: z.number().optional().nullable(),
  mainPanelCableLengthM: z.number().optional().nullable(),
  amrUsernamePlain: z.string().optional().nullable(),
  amrPasswordPlain: z.string().optional().nullable(),
  amrUsernameEncrypted: z.string().optional().nullable(),
  amrPasswordEncrypted: z.string().optional().nullable(),
});

export const surveyTariffTierSchema = z.object({
  tierName: z.string().optional().nullable(),
  ratePerKwh: z.number().optional().nullable(),
  qtyKwhPerMonth: z.number().optional().nullable(),
});

export const surveyTariffSelectionSchema = z.object({
  tariffCategory: z.string().optional().nullable(),
  tiers: z.array(surveyTariffTierSchema).optional(),
});

export const surveyRoofAgeSchema = z.object({
  roofType: z.string(),
  ageYear: z.number().int(),
});

export const surveyStructureSchema = z.object({
  roofType: z.array(z.string()).optional(),
  roofAgeYear: z.number().int().optional().nullable(),
  roofDimWxlM: z.string().optional().nullable(),
  buildingHeightM: z.number().optional().nullable(),
  roofPattern: z.string().optional().nullable(),
  metalSheetType: z.string().optional().nullable(),
  roofSlopeDeg: z.number().optional().nullable(),
  azimuthDeg: z.number().optional().nullable(),
  tiltDeg: z.number().optional().nullable(),
  purlinToPurlinM: z.number().optional().nullable(),
  rafterToRafterM: z.number().optional().nullable(),
  columnToColumnM: z.number().optional().nullable(),
  skylightToSkylightM: z.number().optional().nullable(),
  jackRoofDimM: z.string().optional().nullable(),
  ventilationDimM: z.string().optional().nullable(),
  lightningProtectionM: z.number().optional().nullable(),
  serviceLadderM: z.number().optional().nullable(),
  otherNotes: z.string().optional().nullable(),
  roofAges: z.array(surveyRoofAgeSchema).optional(),
});

export const surveyQASchema = z.object({
  dayNightUsage: z.string().optional().nullable(),
  dayNightUsageDetail: z.string().optional().nullable(),
  dayLoad: z.string().optional().nullable(),
  nightLoad: z.string().optional().nullable(),
  backupLoad: z.string().optional().nullable(),
  backupLoadDetail: z.string().optional().nullable(),
  batteryChargeMode: z.string().optional().nullable(),
  batteryChargeDetail: z.string().optional().nullable(),
  gridChargeAtNight: z.string().optional().nullable(),
  gridChargeAtNightDetail: z.string().optional().nullable(),
  inverterBackupOnOutage: z.string().optional().nullable(),
  inverterBackupOnOutageDetail: z.string().optional().nullable(),
  powerQualityIssue: z.string().optional().nullable(),
  powerQualityIssueDetail: z.string().optional().nullable(),
  solarReasons: z.array(z.string()).optional(),
  solarReasonsDetail: z.string().optional().nullable(),
});

export const surveyPhotoSchema = z.object({
  photoType: z.string(),
  fileUrl: z.string(),
  photoDesc: z.string().optional().nullable(),
});

export const surveyDocumentSchema = z.object({
  documentType: z.string(),
  customerProvided: z.boolean().optional(),
  fileUrl: z.string(),
  note: z.string().optional().nullable(),
});

export const surveyBillSchema = z.object({
  billCount: z.number().int().optional().nullable(),
  fileUrl: z.string(),
  note: z.string().optional().nullable(),
});

export const siteSurveySchema = z.object({
  id: z.string().optional(),
  surveyNumber: z.string().min(1, "surveyNumber is required"),
  surveyDate: z.string().min(1, "surveyDate is required"),
  companyId: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  projectName: z.string().optional().nullable(),
  projectLocation: z.string().optional().nullable(),
  coordinatorName: z.string().optional().nullable(),
  coordinatorPhone: z.string().optional().nullable(),
  salespersonId: z.string().min(1, "salespersonId is required"),
  surveyorName: z.string().optional().nullable(),
  status: z.string().optional(),
  version: z.number().int().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  hasSingleLineDiagram: z.boolean().optional(),
  requiredInfoChecklist: z.array(z.string()).optional(),
  loadProfileFileUrl: z.string().nullable().optional(),
  amrCustomerCode: z.string().nullable().optional(),
  roofStructureFileUrl: z.string().nullable().optional(),
  buildingPlanFileUrl: z.string().nullable().optional(),
  buildingElectricalFileUrl: z.string().nullable().optional(),
  electricalCabinetFileUrl: z.string().nullable().optional(),
  additionalRemark: z.string().nullable().optional(),

  estimatedPrice: z.number().nullable().optional(),
  estimationNote: z.string().optional().nullable(),
  estimatedByUserId: z.string().optional().nullable(),
  estimatedAt: z.string().optional().nullable(),
  estimationStatus: z.string().optional().nullable(),

  usageBehavior: surveyUsageBehaviorSchema.optional().nullable(),
  electricalProfile: surveyElectricalProfileSchema.optional().nullable(),
  tariffSelection: surveyTariffSelectionSchema.optional().nullable(),
  structure: surveyStructureSchema.optional().nullable(),
  qa: surveyQASchema.optional().nullable(),

  photos: z.array(surveyPhotoSchema).optional(),
  documents: z.array(surveyDocumentSchema).optional(),
  electricityBill: z.union([z.string(), surveyBillSchema]).optional().nullable(),
});
