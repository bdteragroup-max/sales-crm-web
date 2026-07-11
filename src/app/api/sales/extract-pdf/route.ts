import { NextResponse } from 'next/server';

export const maxDuration = 60; // Allow Vercel Pro to run up to 60s

function getMediaType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    case 'pdf': return 'application/pdf';
    default: return 'application/pdf';
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("pdf") as File;
    
    if (!file) {
      return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
    }

    const mediaType = getMediaType(file.name);
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(mediaType)) {
      return NextResponse.json({ success: false, error: "Only PDF, JPG, PNG, WebP files are supported." }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return NextResponse.json({ success: false, error: "File size exceeds the 10MB limit." }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const prompt = `Read this quotation (it may contain multiple pages) and respond only in JSON, no other text.
If any fields are missing or unreadable, leave them as empty strings "" or 0.
Extract the data into this structure:
{
  "quotationNumber": "QT69-GAS0717",
  "quotationDate": "2026-07-10",
  "validDays": 30,
  "validUntil": "2026-08-09",
  "paymentTerm": "Cash",
  "customerName": "Customer Company Name",
  "customerAddress": "Customer Address",
  "customerTaxId": "Taxpayer Identification Number",
  "customerTel": "Customer Phone Number",
  "attn": "Contact Name (after To/Attn)",
  "items": [
    {
      "no": 1,
      "description": "Product Details",
      "quantity": 1,
      "unit": "EA",
      "unitPrice": 218900.00,
      "discountPercent": "50+25%",
      "totalDiscount": 136812.50,
      "amount": 82087.50
    }
  ],
  "subtotal": 127762.50,
  "lessDiscount": 0.00,
  "totalAmount": 127762.50,
  "vatRate": 7,
  "vatAmount": 8943.38,
  "netAmount": 136705.88,
  "preparedBy": "SALE0010",
  "remark": "Note"
}

CRITICAL RULES:
1. Dates MUST be converted to YYYY-MM-DD format (Gregorian calendar).
2. If the year is a two-digit Buddhist Era (B.E.) year (e.g., 69 or 70), you must convert it to a full Gregorian year first.
   Example: 69 -> 2569 (B.E.) -> 2569 - 543 = 2026.
3. If the year is a four-digit B.E. year (e.g., 2569), subtract 543 to get the Gregorian year (e.g., 2026).
4. Do NOT output any markdown blocks like \`\`\`json, just output the raw JSON object string.`;

    const contentBlock = mediaType === 'application/pdf'
      ? {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 }
        }
      : { 
          type: "image", 
          source: { type: "base64", media_type: mediaType, data: base64 } 
        };

    const headers: Record<string, string> = {
      "x-api-key": process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || "",
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    };

    if (mediaType === 'application/pdf') {
      headers["anthropic-beta"] = "pdfs-2024-09-25";
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    let response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: [
              contentBlock,
              {
                type: "text",
                text: prompt
              }
            ]
          }]
        })
      });
      clearTimeout(timeout);
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      if (fetchErr.name === 'AbortError') {
        return NextResponse.json({ success: false, error: "การอ่านเอกสารใช้เวลานานเกินไป โปรดลองอีกครั้งหรือใช้ไฟล์ที่มีขนาดเล็กลง" }, { status: 408 });
      }
      throw fetchErr;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API Error:", errorText);
      return NextResponse.json({ success: false, error: `Anthropic API Error: ${errorText}` }, { status: 500 });
    }

    const data = await response.json();
    const text = data.content[0].text;

    try {
      // Clean up markdown block if the model included it despite instructions
      const cleanJsonStr = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanJsonStr);
      return NextResponse.json({ success: true, data: parsed });
    } catch (parseError) {
      console.error("Failed to parse AI output:", text);
      return NextResponse.json({ success: false, error: "Data could not be parsed correctly" }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Error in extract-pdf:", error);
    return NextResponse.json({ success: false, error: error.message || "Unknown error" }, { status: 500 });
  }
}
