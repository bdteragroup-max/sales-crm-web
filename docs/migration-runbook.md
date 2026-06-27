# Site Survey Migration - Cutover & Validation Runbook

This document outlines the procedures for Phase 4 of the Site Survey Migration from Google Sheets to the new Next.js + Postgres CRM system.

## 1. Parallel Run Period (1-2 Weeks)

To ensure the new system meets all business and operational requirements without disrupting ongoing sales activities, we will enforce a parallel run period.

### Procedure
1. **Dual Entry:** For the next 1-2 weeks, all sales representatives and surveyors must enter new Site Surveys into **both** the legacy Google Sheet and the new CRM system.
2. **Comparison:** At the end of each week, the Project Management and Admin teams will randomly sample 10 surveys from both systems and compare:
   - Data accuracy
   - PDF generation fidelity (pixel and content match)
   - Image attachment and loading times
3. **Sign-off:** The parallel run will conclude once 2 consecutive weeks pass with zero critical discrepancies. 

## 2. Rollback Plan

If a critical production bug occurs in the new CRM system (e.g., PDFs failing to generate, database outages, or save conflicts that cannot be resolved), we will execute the following rollback plan:

### Trigger Criteria
- Severity 1 Bug: System is completely down or inaccessible for > 2 hours.
- Severity 2 Bug: Data corruption or loss is detected in newly created surveys.

### Rollback Steps
1. **Communication:** The DevOps/System Admin team announces a "System Rollback" to the Sales and Project teams via LINE/Email.
2. **Halt CRM Entry:** Users are instructed to immediately stop using the CRM for Site Surveys and revert entirely to the legacy Google Sheet.
3. **Data Sync (Manual):** Any valid surveys created *only* in the CRM during the outage period will be manually exported by the Admin team (via Supabase CSV export) and pasted back into the Google Sheet.
4. **Resolution:** The development team will investigate and deploy a hotfix to the CRM. The Parallel Run period will restart from Week 1 once the hotfix is verified.

## 3. Archive Strategy for Google Sheets

Once the parallel run concludes successfully and the team formally signs off on the CRM system, the legacy Google Sheet must be retired to prevent split-brain data entry.

### Procedure
1. **Final Data Migration:** Run the `scripts/migrate_surveys.ts` script one final time to capture any last-minute entries made in the Google Sheet.
2. **Locking the Sheet:**
   - The Google Workspace Administrator will change the sharing permissions on the Google Sheet.
   - All Sales, Project, and Admin users will be downgraded from "Editor" to "Viewer" (Read-Only).
   - A large, red warning banner will be added to the top row of the sheet: **"⚠️ OBSOLETE - DO NOT USE. ALL NEW SURVEYS MUST BE ENTERED IN THE TERA CRM ⚠️"**
3. **Data Retention:** The Google Sheet and the associated Google Drive folder containing legacy images will remain indefinitely as a read-only historical archive for audit purposes.
