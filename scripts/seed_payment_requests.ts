import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import dotenv from 'dotenv';

const envPath = path.join(process.cwd(), '.env');
const cfg = dotenv.parse(fs.readFileSync(envPath));
const pool = new Pool({ connectionString: cfg.DATABASE_URL });

// Helper to compute Thai Buddhist Era YYMM
function getCurrentYYMM(): string {
  const d = new Date();
  const yearCE = d.getFullYear();
  const yearBE = yearCE + 543;
  const yy = String(yearBE).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${yy}${mm}`;
}

async function getNextPayNo(client: any, company: string): Promise<string> {
  const ym = getCurrentYYMM();
  const res = await client.query(
    `INSERT INTO payment_request_sequences (company, year_month, last_sequence)
     VALUES ($1, $2, 1)
     ON CONFLICT (company, year_month)
     DO UPDATE SET last_sequence = payment_request_sequences.last_sequence + 1
     RETURNING last_sequence`,
    [company, ym]
  );
  const seq = res.rows[0].last_sequence;
  return `PAY-${company}-${ym}-${String(seq).padStart(5, '0')}`;
}

async function seed() {
  console.log('Seeding Payment Requests realistic test data...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clean existing seed data
    await client.query('DELETE FROM payment_request_logs');
    await client.query('DELETE FROM payment_requests');
    await client.query('DELETE FROM payment_request_sequences');

    const sampleRequests = [
      {
        company: 'TG',
        branch: 'Head Office',
        classification: 'VENDOR_BILL',
        urgency: 'NORMAL',
        status: 'SUBMITTED',
        requester_name: 'สมชาย รักชาติ',
        requester_department: 'ฝ่ายจัดซื้อและคลัง',
        requester_phone: '081-234-5678',
        supplier_name: 'บริษัท สยามคอมเพรสเซอร์ อินดัสทรี จำกัด',
        supplier_tax_id: '0105530012345',
        bank_name: 'ธนาคารกสิกรไทย',
        bank_account_no: '045-2-99881-2',
        document_date: '2026-09-28',
        has_no_doc_number: false,
        invoice_number: 'INV-SCI-20260928-01',
        subtotal_amount: 45000.00,
        vat_type: '7%',
        vat_amount: 3150.00,
        wht_type: '3%',
        wht_percent: 3.00,
        wht_amount: 1350.00,
        net_amount: 46800.00,
        purpose: 'ชำระค่าอะไหล่และคอมเพรสเซอร์แอร์สำหรับสต็อกกลาง สำนักงานใหญ่',
        cost_center: 'WH-CENTRAL-01',
        po_pr_number: 'PO-TG-2609-0012',
        requested_payment_date: '2026-10-05',
        submission_channel: 'WEB',
      },
      {
        company: 'TE',
        branch: 'ชลบุรี',
        classification: 'BRANCH_SITE',
        urgency: 'EMERGENCY',
        status: 'READY_TO_PAY',
        requester_name: 'กิตติศักดิ์ พัฒนา',
        requester_department: 'ฝ่ายวิศวกรรมสาขาชลบุรี',
        requester_phone: '089-876-5432',
        supplier_name: 'หจก. ชลบุรีเครน แอนด์ ขนส่ง',
        supplier_tax_id: '0203541009876',
        bank_name: 'ธนาคารไทยพาณิชย์',
        bank_account_no: '501-4-88772-1',
        document_date: '2026-09-29',
        has_no_doc_number: false,
        invoice_number: 'CRN-CH-8821',
        subtotal_amount: 18000.00,
        vat_type: '7%',
        vat_amount: 1260.00,
        wht_type: '1%',
        wht_percent: 1.00,
        wht_amount: 180.00,
        net_amount: 19080.00,
        purpose: 'ค่าเช่ารถเครนยกตู้สวิตช์บอร์ดแรงสูงเข้าหม้อแปลง ไซต์งานนิคมอมตะนคร (งานด่วน)',
        cost_center: 'PRJ-AMATA-SOLAR',
        po_pr_number: 'PO-TE-2609-0044',
        requested_payment_date: '2026-10-01',
        submission_channel: 'LINE',
        ap_checked_by: 'วราภรณ์ บัญชีเจ้าหนี้',
        ap_checked_at: '2026-09-30T10:00:00Z',
        ap_notes: 'ตรวจสอบเอกสารครบถ้วน ใบกำกับภาษีถูกต้อง มีใบส่งของพร้อมลายเซ็นโฟร์แมน',
        supervisor_checked_by: 'กัญญา หัวหน้าแผนกบัญชี',
        supervisor_checked_at: '2026-09-30T13:30:00Z',
        supervisor_notes: 'สอบทานแล้ว ถูกต้องตามระเบียบวงเงินสาขา',
        approved_by: 'ธีระ กรรมการผู้จัดการ',
        approved_at: '2026-09-30T15:00:00Z',
        approval_limit_tier: '10,001 - 30,000 บาท',
        approval_notes: 'อนุมัติจ่ายตามรอบด่วน',
      },
      {
        company: 'TP',
        branch: 'ระยอง',
        classification: 'REIMBURSEMENT',
        urgency: 'NORMAL',
        status: 'PAID',
        requester_name: 'อนุชา ช่างเทคนิค',
        requester_department: 'ฝ่ายบริการเทคนิคระยอง',
        requester_phone: '085-333-2211',
        supplier_name: 'นายอนุชา ช่างเทคนิค (สำรองจ่าย)',
        supplier_tax_id: '1219900123456',
        bank_name: 'ธนาคารกรุงเทพ',
        bank_account_no: '123-4-56789-0',
        document_date: '2026-09-25',
        has_no_doc_number: true,
        invoice_number: null,
        subtotal_amount: 2450.00,
        vat_type: 'NONE',
        vat_amount: 0.00,
        wht_type: 'NONE',
        wht_percent: 0.00,
        wht_amount: 0.00,
        net_amount: 2450.00,
        purpose: 'เบิกจ่ายค่าวัสดุฮาร์ดแวร์เร่งด่วนและค่าน้ำมันสำรองจ่ายหน้างานนิคมมาบตาพุด',
        cost_center: 'RAYONG-MAINT-02',
        po_pr_number: 'ไม่มี PO (บิลย่อยสำรองจ่าย)',
        requested_payment_date: '2026-09-27',
        submission_channel: 'WEB',
        ap_checked_by: 'วราภรณ์ บัญชีเจ้าหนี้',
        ap_checked_at: '2026-09-26T09:00:00Z',
        supervisor_checked_by: 'กัญญา หัวหน้าแผนกบัญชี',
        supervisor_checked_at: '2026-09-26T11:00:00Z',
        approved_by: 'ผู้จัดการฝ่ายบริการสาขาระยอง',
        approved_at: '2026-09-26T14:00:00Z',
        approval_limit_tier: 'ไม่เกิน 3,000 บาท',
        paid_date: '2026-09-27',
        paid_by: 'ปิยะมาศ การเงิน',
        paid_from_bank: 'KBANK-0452-99881',
        bank_reference_no: 'TRF-20260927-99120',
        payment_notes: 'โอนเข้าพร้อมเพย์เบอร์โทรศัพท์ผู้เบิกเรียบร้อยแล้ว',
      },
      {
        company: 'TG',
        branch: 'ขอนแก่น',
        classification: 'PETTY_CASH',
        urgency: 'NORMAL',
        status: 'HOLD_DUPLICATE',
        requester_name: 'พรทิพย์ สถิตย์',
        requester_department: 'ฝ่ายธุรการสาขาขอนแก่น',
        requester_phone: '086-111-4455',
        supplier_name: 'บจก. เคมีภัณฑ์ อีสาน',
        supplier_tax_id: '0405548002233',
        bank_name: 'ธนาคารกรุงไทย',
        bank_account_no: '401-0-12345-6',
        document_date: '2026-09-28',
        has_no_doc_number: false,
        invoice_number: 'INV-KK-99210',
        subtotal_amount: 8500.00,
        vat_type: '7%',
        vat_amount: 595.00,
        wht_type: 'NONE',
        wht_percent: 0.00,
        wht_amount: 0.00,
        net_amount: 9095.00,
        purpose: 'ซื้อน้ำยาทำความสะอาดแผงโซลาร์เซลล์ สาขาขอนแก่น',
        cost_center: 'BRANCH-KK-EXP',
        po_pr_number: 'PO-TG-KK-0015',
        requested_payment_date: '2026-10-02',
        submission_channel: 'EMAIL',
        is_possible_duplicate: true,
        duplicate_reason: 'ตรวจพบเลขที่ใบเสร็จ INV-KK-99210 ของ บจก. เคมีภัณฑ์ อีสาน เคยถูกเบิกไปแล้วเมื่อ 25 ก.ย. 2569',
      },
      {
        company: 'TP',
        branch: 'เชียงใหม่',
        classification: 'VENDOR_BILL',
        urgency: 'NORMAL',
        status: 'POSTED_TO_GL',
        requester_name: 'ประสิทธิ์ มงคล',
        requester_department: 'ฝ่ายติดตั้งระบบโซลาร์',
        requester_phone: '087-999-8877',
        supplier_name: 'บริษัท ล้านนา โซลาร์ ซัพพลาย จำกัด',
        supplier_tax_id: '0505549001122',
        bank_name: 'ธนาคารกสิกรไทย',
        bank_account_no: '228-2-33445-5',
        document_date: '2026-09-20',
        has_no_doc_number: false,
        invoice_number: 'LNN-INV-2609-088',
        subtotal_amount: 120000.00,
        vat_type: '7%',
        vat_amount: 8400.00,
        wht_type: '3%',
        wht_percent: 3.00,
        wht_amount: 3600.00,
        net_amount: 124800.00,
        purpose: 'ค่าโครงสร้างเหล็ก Mounting สำหรับติดตั้ง Solar Rooftop โรงพยาบาลสารภี เชียงใหม่',
        cost_center: 'PRJ-SARAPHI-HOSPITAL',
        po_pr_number: 'PO-TP-2609-0089',
        requested_payment_date: '2026-09-25',
        submission_channel: 'WEB',
        ap_checked_by: 'วราภรณ์ บัญชีเจ้าหนี้',
        ap_checked_at: '2026-09-21T09:00:00Z',
        supervisor_checked_by: 'กัญญา หัวหน้าแผนกบัญชี',
        supervisor_checked_at: '2026-09-21T14:00:00Z',
        approved_by: 'ธีระ กรรมการผู้จัดการ',
        approved_at: '2026-09-22T10:00:00Z',
        approval_limit_tier: 'เกิน 30,000 บาท',
        paid_date: '2026-09-25',
        paid_by: 'ปิยะมาศ การเงิน',
        paid_from_bank: 'KBANK-0452-99881',
        bank_reference_no: 'TRF-20260925-11029',
        gl_posted_by: 'วราภรณ์ บัญชีเจ้าหนี้',
        gl_posted_at: '2026-09-28T16:00:00Z',
        gl_voucher_no: 'PV-6909-0042',
        gl_notes: 'บันทึกบัญชี Express เดบิต งานระหว่างก่อสร้าง เครดิต เงินฝากธนาคาร',
        original_received_by: 'ธนาภา เจ้าหน้าที่ธุรการเอกสาร',
        original_received_at: '2026-09-29T11:00:00Z',
        original_stamp_text: 'RECEIVED ORIGINAL/PAID 29/09/69',
      }
    ];

    for (let i = 0; i < sampleRequests.length; i++) {
      const s = sampleRequests[i];
      const payNo = await getNextPayNo(client, s.company);
      const id = `req_${Date.now()}_${i + 1}`;

      await client.query(
        `INSERT INTO payment_requests (
          id, pay_number, company, branch, classification, urgency, status,
          requester_name, requester_department, requester_phone,
          supplier_name, supplier_tax_id, bank_name, bank_account_no,
          document_date, has_no_doc_number, invoice_number,
          subtotal_amount, vat_type, vat_amount, wht_type, wht_percent, wht_amount, net_amount,
          purpose, cost_center, po_pr_number, requested_payment_date, submission_channel,
          ap_checked_by, ap_checked_at, ap_notes,
          supervisor_checked_by, supervisor_checked_at, supervisor_notes,
          approved_by, approved_at, approval_limit_tier, approval_notes,
          paid_date, paid_by, paid_from_bank, bank_reference_no, payment_notes,
          gl_posted_by, gl_posted_at, gl_voucher_no, gl_notes,
          original_received_by, original_received_at, original_stamp_text,
          is_possible_duplicate, duplicate_reason
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17,
          $18, $19, $20, $21, $22, $23, $24,
          $25, $26, $27, $28, $29,
          $30, $31, $32,
          $33, $34, $35,
          $36, $37, $38, $39,
          $40, $41, $42, $43, $44,
          $45, $46, $47, $48,
          $49, $50, $51,
          $52, $53
        )`,
        [
          id, payNo, s.company, s.branch, s.classification, s.urgency, s.status,
          s.requester_name, s.requester_department, s.requester_phone,
          s.supplier_name, s.supplier_tax_id, s.bank_name, s.bank_account_no,
          s.document_date, s.has_no_doc_number, s.invoice_number,
          s.subtotal_amount, s.vat_type, s.vat_amount, s.wht_type, s.wht_percent, s.wht_amount, s.net_amount,
          s.purpose, s.cost_center, s.po_pr_number, s.requested_payment_date, s.submission_channel,
          s.ap_checked_by || null, s.ap_checked_at || null, s.ap_notes || null,
          s.supervisor_checked_by || null, s.supervisor_checked_at || null, s.supervisor_notes || null,
          s.approved_by || null, s.approved_at || null, s.approval_limit_tier || null, s.approval_notes || null,
          s.paid_date || null, s.paid_by || null, s.paid_from_bank || null, s.bank_reference_no || null, s.payment_notes || null,
          s.gl_posted_by || null, s.gl_posted_at || null, s.gl_voucher_no || null, s.gl_notes || null,
          s.original_received_by || null, s.original_received_at || null, s.original_stamp_text || null,
          s.is_possible_duplicate || false, s.duplicate_reason || null
        ]
      );

      // Add log
      await client.query(
        `INSERT INTO payment_request_logs (payment_request_id, action, performed_by, notes)
         VALUES ($1, 'CREATED', $2, 'สร้างใบคำขอเบิกจ่ายในระบบกลาง')`,
        [id, s.requester_name]
      );

      console.log(`Created ${payNo} [${s.company}] - ${s.status}`);
    }

    await client.query('COMMIT');
    console.log('Seeding finished successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seeding error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
