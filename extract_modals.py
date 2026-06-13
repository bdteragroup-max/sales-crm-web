import os
import re

content = open('src/app/pipeline/PipelineClientPage.tsx', 'r', encoding='utf-8').read()
match = re.search(r'function QuotationTransitionModal', content)
if match:
    min_index = match.start()
    modals = content[min_index:]
    imports = """'use client';
import React, { useState, useEffect } from "react";
import { searchCompanies } from "@/app/actions/sales";
import { extractCompanyCode } from "@/utils/company-utils";
import { JOB_TYPES } from "@/constants/job-types";
import { createClient } from "@/utils/supabase/client";
import { FileText, AlertCircle, Sparkles, ClipboardCheck, Loader2, Calendar, CalendarDays } from "lucide-react";

"""
    
    modals = modals.replace('function QuotationTransitionModal', 'export function QuotationTransitionModal')
    modals = modals.replace('function POTransitionModal', 'export function POTransitionModal')
    modals = modals.replace('function AppointmentTransitionModal', 'export function AppointmentTransitionModal')
    
    os.makedirs('src/app/pipeline/components', exist_ok=True)
    with open('src/app/pipeline/components/PipelineModals.tsx', 'w', encoding='utf-8') as f:
        f.write(imports + modals)
        
    old_content = content[:min_index]
    with open('src/app/pipeline/PipelineClientPage.tsx', 'w', encoding='utf-8') as f:
        f.write(old_content)
