import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/app/lib/db';
import puppeteer from 'puppeteer';
import { generateSurveyPdfHtml } from './pdfTemplate';

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> | { id: string } }) {
  try {
    const params = await props.params;
    const surveyId = params.id;

    // Fetch the fully populated survey
    const survey = await prisma.siteSurvey.findUnique({
      where: { id: surveyId },
      include: {
        salesperson: { select: { fullName: true } },
        electricalProfile: true,
        usageBehavior: true,
        tariffSelection: {
          include: { tiers: true }
        },
        structure: {
          include: { roofAges: true }
        },
        qa: true,
        photos: true,
        documents: true,
        electricityBill: true,
      }
    });

    if (!survey) {
      return NextResponse.json({ error: 'Survey not found' }, { status: 404 });
    }

    // Generate HTML
    const htmlContent = generateSurveyPdfHtml(survey);

    // Launch puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    
    // Set content and wait for network to be idle (so fonts and images load)
    await page.setContent(htmlContent, { waitUntil: 'load' });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0px',
        bottom: '0px',
        left: '0px',
        right: '0px'
      }
    });

    await browser.close();

    // Return the PDF buffer
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Survey_${survey.surveyNumber || survey.id}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: 'Failed to generate PDF', details: error.message }, { status: 500 });
  }
}
