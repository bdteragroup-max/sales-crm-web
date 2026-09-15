import prisma from '../src/app/lib/db';

async function seedMarketingBoard() {
  console.log('Seeding TERA Marketing Board...');

  // Clean existing marketing board data first
  await prisma.marketingAnnouncementAuditLog.deleteMany();
  await prisma.marketingAnnouncementAcknowledgment.deleteMany();
  await prisma.marketingAnnouncementAsset.deleteMany();
  await prisma.marketingAnnouncementBranch.deleteMany();
  await prisma.marketingAnnouncement.deleteMany();

  // Find a system user or admin to use as created_by
  const adminUser = await prisma.user.findFirst({
    where: { role: { contains: 'ADMIN', mode: 'insensitive' } },
    select: { id: true, fullName: true }
  }) || { id: 'admin-seed-user', fullName: 'Marketing Admin' };

  // Current reference date: Sep 2026
  const now = new Date('2026-09-15T10:00:00+07:00');
  const startSep = new Date('2026-09-01T00:00:00+07:00');
  const endSep = new Date('2026-09-30T23:59:59+07:00');
  const endSoon = new Date('2026-09-18T23:59:59+07:00'); // 3 days remaining
  const scheduledDate = new Date('2026-09-20T08:00:00+07:00');
  const pastStart = new Date('2026-08-01T00:00:00+07:00');
  const pastEnd = new Date('2026-08-31T23:59:59+07:00');

  // Available branches:
  // KK01, PSNL01, CMI01, UDN01, SRN01, SMK, ROI01, KRI01, SN01, SRT01, NRT, UB01, BKK-HQ, BKK-WH

  // 1. Marketing Headquarters - 9.9 TERA Mega Promotion
  const ann1 = await prisma.marketingAnnouncement.create({
    data: {
      id: 'mkt-ann-99-mega',
      announcementType: 'Promotion',
      productGroup: 'Marketing Headquarters',
      campaignName: '9.9 TERA Mega Promotion',
      shortDescription: 'Company-wide monthly campaign offering up to 25% discount across all categories.',
      campaignDetails: `### แคมเปญใหญ่ประจำเดือน 9.9 TERA MEGA PROMOTION
- ส่วนลดพิเศษสูงสุด 25% สำหรับสินค้าทุกหมวดหมู่ (Inverter, BLDC Solar Pump, Solar Rooftop)
- ลูกค้าที่สั่งซื้อยอดสุทธิเกิน 50,000 บาท รับฟรีชุดเครื่องมือช่างและของสมนาคุณพรีเมียม TERA
- สะสมแต้ม TERA Rewards x2 ตลอดเดือนกันยายน 2026
- สิทธิพิเศษนี้เปิดให้ลูกค้าเก่าและลูกค้าใหม่ทุกช่องทาง ทั้ง Telesales และหน้าร้านสาขา`,
      termsConditions: `1. แคมเปญนี้มีผลตั้งแต่วันที่ 1 - 30 กันยายน 2026 เท่านั้น
2. ไม่สามารถนำส่วนลดนี้ไปใช้ร่วมกับโครงการประมูลงานราชการหรือราคาพิเศษเฉพาะสัญญาได้
3. ยอดคำสั่งซื้อต้องได้รับการอนุมัติใบเสนอราคาภายในระยะเวลาแคมเปญ
4. ของสมนาคุณมีจำนวนจำกัด ทางบริษัทฯ ขอสงวนสิทธิ์ในการเปลี่ยนแปลงโดยไม่ต้องแจ้งให้ทราบล่วงหน้า`,
      startAt: startSep,
      endAt: endSep,
      branchScope: 'ALL',
      priority: 'Important',
      status: 'Active',
      version: 1,
      coverImageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
      contactPerson: 'คุณชลธิชา (ฝ่ายการตลาดส่วนกลาง) Tel: 02-123-4567 ต่อ 101, LINE: @teramarketing',
      publishMode: 'NOW',
      publishedAt: startSep,
      displayOrder: 1,
      isFeatured: true,
      createdBy: adminUser.id,
      assets: {
        create: [
          {
            assetType: 'cover_image',
            documentType: 'Promotion Artwork',
            fileName: '9.9_Mega_Promotion_KeyVisual.jpg',
            fileUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80',
            fileSize: BigInt(2450000),
            version: 'V1',
            effectiveDate: startSep,
            expiryDate: endSep,
            downloadCount: 42
          },
          {
            assetType: 'document',
            documentType: 'Product Brochure',
            fileName: 'TERA_9.9_Promotion_Catalog_Sep2026.pdf',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(5120000),
            version: 'V1',
            effectiveDate: startSep,
            expiryDate: endSep,
            downloadCount: 88
          },
          {
            assetType: 'document',
            documentType: 'Price List',
            fileName: 'TERA_Special_Price_List_9.9.xlsx',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(1250000),
            version: 'V1',
            effectiveDate: startSep,
            expiryDate: endSep,
            downloadCount: 65
          },
          {
            assetType: 'document',
            documentType: 'Sales Script',
            fileName: 'Telesales_Script_9.9_Promotion.pdf',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(840000),
            version: 'V1',
            effectiveDate: startSep,
            expiryDate: endSep,
            downloadCount: 31
          },
          {
            assetType: 'document',
            documentType: 'Social Media Artwork',
            fileName: 'Social_Banner_Square_1080x1080.zip',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(14200000),
            version: 'V1',
            effectiveDate: startSep,
            expiryDate: endSep,
            downloadCount: 19
          },
          {
            assetType: 'document',
            documentType: 'Promotion Terms & Conditions',
            fileName: 'Terms_and_Conditions_9.9_Promotion.pdf',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(450000),
            version: 'V1',
            effectiveDate: startSep,
            expiryDate: endSep,
            downloadCount: 15
          }
        ]
      }
    }
  });

  // 2. Marketing Headquarters - Product Price List — Sep 2026
  await prisma.marketingAnnouncement.create({
    data: {
      id: 'mkt-ann-pricelist-sep',
      announcementType: 'Product Update',
      productGroup: 'Marketing Headquarters',
      campaignName: 'Product Price List — Sep 2026',
      shortDescription: 'Updated 14 Sep 2026 • New standard price list and updated discount tiers.',
      campaignDetails: `ประกาศปรับปรุงสมุดราคากลางสินค้าประจำเดือนกันยายน 2026:
- ปรับโครงสร้างราคาต้นทุนและราคาจำหน่ายสำหรับผลิตภัณฑ์หมวดอินเวอร์เตอร์และปั๊มน้ำพลังงานแสงอาทิตย์
- เพิ่มโมเดลสินค้าใหม่ในระบบ
- มีผลบังคับใช้ทันทีตั้งแต่วันที่ 14 กันยายน 2026 เป็นต้นไป ทุกสาขาโปรดใช้ไฟล์เวอร์ชัน V2 นี้เท่านั้น`,
      termsConditions: 'ห้ามนำราคานี้ไปเผยแพร่ภายนอกโดยไม่ได้รับอนุญาต เอกสารนี้เป็นความลับทางการค้าของบริษัทฯ',
      startAt: new Date('2026-09-14T00:00:00+07:00'),
      endAt: new Date('2026-10-31T23:59:59+07:00'),
      branchScope: 'ALL',
      priority: 'Normal',
      status: 'Active',
      version: 2,
      coverImageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
      contactPerson: 'ฝ่ายราคาและจัดซื้อส่วนกลาง Tel: 02-123-4567 ต่อ 105',
      publishMode: 'NOW',
      publishedAt: new Date('2026-09-14T08:00:00+07:00'),
      displayOrder: 2,
      isFeatured: false,
      createdBy: adminUser.id,
      assets: {
        create: [
          {
            assetType: 'document',
            documentType: 'Price List',
            fileName: 'TERA_Master_Price_List_Sep2026_V2.pdf',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(3400000),
            version: 'V2',
            effectiveDate: new Date('2026-09-14T00:00:00+07:00'),
            downloadCount: 95
          },
          {
            assetType: 'document',
            documentType: 'Price List',
            fileName: 'TERA_Price_List_Matrix_Sep2026.xlsx',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(1890000),
            version: 'V2',
            effectiveDate: new Date('2026-09-14T00:00:00+07:00'),
            downloadCount: 74
          }
        ]
      }
    }
  });

  // 3. Marketing Headquarters - TERA SPACE Udon Thani Opening
  const ann3 = await prisma.marketingAnnouncement.create({
    data: {
      id: 'mkt-ann-space-udon',
      announcementType: 'Event',
      productGroup: 'Marketing Headquarters',
      campaignName: 'TERA SPACE Udon Thani Opening',
      shortDescription: 'Grand opening of our newest showroom and service hub in Udon Thani on 20 Sep 2026.',
      campaignDetails: `พิธีเปิดศูนย์บริการและโชว์รูมแห่งใหม่ TERA SPACE อุดรธานี:
- จัดขึ้นในวันที่ 20 กันยายน 2026
- เชิญชวนตัวแทนจำหน่ายและลูกค้าโซนภาคตะวันออกเฉียงเหนือตอนบน
- พิเศษ: ลูกค้าที่สั่งซื้อภายในงานรับส่วนลด On-top ทันที 10%`,
      startAt: scheduledDate,
      endAt: new Date('2026-10-15T23:59:59+07:00'),
      branchScope: 'SPECIFIC',
      priority: 'Normal',
      status: 'Scheduled',
      version: 1,
      coverImageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
      contactPerson: 'คุณอนุสรณ์ ผู้จัดการสาขาอุดรธานี Tel: 042-998877',
      publishMode: 'SCHEDULE',
      publishedAt: scheduledDate,
      displayOrder: 3,
      createdBy: adminUser.id,
      branches: {
        create: [
          { branchId: 'UDN01' },
          { branchId: 'KK01' },
          { branchId: 'SN01' },
          { branchId: 'ROI01' }
        ]
      },
      assets: {
        create: [
          {
            assetType: 'document',
            documentType: 'Promotion Artwork',
            fileName: 'Grand_Opening_TERA_Space_Udon.png',
            fileUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80',
            fileSize: BigInt(2100000),
            version: 'V1',
            downloadCount: 12
          },
          {
            assetType: 'document',
            documentType: 'Product Presentation',
            fileName: 'TERA_Space_Agenda_Invitation.pdf',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(1450000),
            version: 'V1',
            downloadCount: 8
          }
        ]
      }
    }
  });

  // 4. Inverter - Buy 2 AC Drives, Get Free Volume Set
  await prisma.marketingAnnouncement.create({
    data: {
      id: 'mkt-ann-buy2-ac-drives',
      announcementType: 'Promotion',
      productGroup: 'Inverter',
      campaignName: 'Buy 2 AC Drives, Get Free Volume Set',
      shortDescription: 'New customers • AC10 / AC310 series • Free speed pot and mounting enclosure accessories.',
      campaignDetails: `โปรโมชั่นกระตุ้นยอดขายกลุ่มอินเวอร์เตอร์ AC Drive:
- ซื้ออินเวอร์เตอร์รุ่น AC10 หรือ AC310 ทุกขนาด 2 ตัวขึ้นไป
- รับฟรีทันที! วอลลุ่มปรับความเร็วรอบ (Potentiometer) คุณภาพสูง พร้อมชุดกล่องติดตั้งกันฝุ่น
- เหมาะสำหรับกลุ่มช่างประกอบตู้คอนโทรล โรงงานอุตสาหกรรม และร้านค้าอุปกรณ์ไฟฟ้า`,
      termsConditions: `1. เฉพาะคำสั่งซื้อระหว่างวันที่ 1 - 30 กันยายน 2026
2. สินค้าของแถมจัดส่งพร้อมกับตัวเครื่องอินเวอร์เตอร์
3. สามารถรวมบิลข้ามขนาดแรงม้า (kW/HP) ได้ในซีรีส์เดียวกัน`,
      startAt: startSep,
      endAt: endSep,
      branchScope: 'ALL',
      priority: 'Urgent',
      status: 'Active',
      version: 1,
      coverImageUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=1200&q=80',
      contactPerson: 'คุณกิตติศักดิ์ (Technical Sales Manager) Tel: 089-111-2233',
      publishMode: 'NOW',
      publishedAt: startSep,
      displayOrder: 1,
      isFeatured: true,
      createdBy: adminUser.id,
      assets: {
        create: [
          {
            assetType: 'document',
            documentType: 'Promotion Artwork',
            fileName: 'AC_Drive_Buy2_Get1_Banner.jpg',
            fileUrl: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=1200&q=80',
            fileSize: BigInt(3100000),
            version: 'V1',
            downloadCount: 54
          },
          {
            assetType: 'document',
            documentType: 'Catalog',
            fileName: 'TERA_AC10_AC310_Inverter_Brochure.pdf',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(6700000),
            version: 'V1',
            downloadCount: 78
          },
          {
            assetType: 'document',
            documentType: 'Sales Script',
            fileName: 'Inverter_Sales_Closing_Pitch_Sep2026.pdf',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(780000),
            version: 'V1',
            downloadCount: 41
          },
          {
            assetType: 'document',
            documentType: 'Product Specification',
            fileName: 'AC310_Technical_Wiring_Guide.pdf',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(4200000),
            version: 'V1',
            downloadCount: 39
          },
          {
            assetType: 'document',
            documentType: 'Quotation Template',
            fileName: 'Template_Quote_AC_Drives_Promotion.xlsx',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(920000),
            version: 'V1',
            downloadCount: 62
          }
        ]
      }
    }
  });

  // 5. Inverter - Free Nationwide Shipping (Ending Soon)
  await prisma.marketingAnnouncement.create({
    data: {
      id: 'mkt-ann-free-shipping',
      announcementType: 'Promotion',
      productGroup: 'Inverter',
      campaignName: 'Free Nationwide Shipping',
      shortDescription: 'Net order ฿10,000 or more • Ends 18 Sep 2026 • Door-to-door express delivery.',
      campaignDetails: `บริการจัดส่งฟรีทั่วประเทศ สำหรับคำสั่งซื้อหมวดอินเวอร์เตอร์และอุปกรณ์เสริม:
- ยอดสั่งซื้อสุทธิขั้นต่ำ 10,000 บาท
- จัดส่งด่วนพิเศษถึงหน้างานหรือร้านค้าภายใน 1-2 วันทำการ
- ช่วยปิดการขายกับลูกค้าต่างจังหวัดได้ง่ายขึ้น`,
      termsConditions: 'ใช้ได้กับ 8 สาขาที่ระบุเท่านั้น สำหรับพื้นที่ห่างไกลอาจมีระยะเวลาจัดส่งเพิ่มเติม 1 วัน',
      startAt: startSep,
      endAt: endSoon, // 3 days remaining => Ending Soon!
      branchScope: 'SPECIFIC',
      priority: 'Normal',
      status: 'Ending Soon',
      version: 1,
      coverImageUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
      contactPerson: 'ฝ่ายโลจิสติกส์และขนส่ง TERA Tel: 02-123-4567 ต่อ 201',
      publishMode: 'NOW',
      publishedAt: startSep,
      displayOrder: 2,
      createdBy: adminUser.id,
      branches: {
        create: [
          { branchId: 'KK01' },
          { branchId: 'CMI01' },
          { branchId: 'PSNL01' },
          { branchId: 'UB01' },
          { branchId: 'SRT01' },
          { branchId: 'UDN01' },
          { branchId: 'ROI01' },
          { branchId: 'KRI01' }
        ]
      },
      assets: {
        create: [
          {
            assetType: 'document',
            documentType: 'Promotion Artwork',
            fileName: 'Free_Nationwide_Shipping_Graphic.jpg',
            fileUrl: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80',
            fileSize: BigInt(1850000),
            version: 'V1',
            downloadCount: 30
          },
          {
            assetType: 'document',
            documentType: 'Others',
            fileName: 'Logistics_Coverage_Map_8Branches.pdf',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(2200000),
            version: 'V1',
            downloadCount: 22
          },
          {
            assetType: 'document',
            documentType: 'Sales Script',
            fileName: 'Telesales_Shipping_Closing_TalkingPoint.pdf',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(610000),
            version: 'V1',
            downloadCount: 18
          }
        ]
      }
    }
  });

  // 6. Inverter - AC310 Sales Kit — V2
  await prisma.marketingAnnouncement.create({
    data: {
      id: 'mkt-ann-ac310-kit',
      announcementType: 'Product Update',
      productGroup: 'Inverter',
      campaignName: 'AC310 Sales Kit — V2',
      shortDescription: 'Updated technical sales presentation and customer comparison matrix.',
      campaignDetails: `ชุดเอกสารช่วยขายสำหรับอินเวอร์เตอร์ประสิทธิภาพสูง AC310 (เวอร์ชัน 2):
- รวมจุดขายเด่นเปรียบเทียบกับแบรนด์ชั้นนำในตลาด
- ตารางผลตอบแทนความคุ้มค่า (ROI Analysis)
- คู่มือแก้ปัญหาหน้างานเบื้องต้นเพื่อสร้างความมั่นใจให้ผู้ใช้งาน`,
      startAt: new Date('2026-09-10T00:00:00+07:00'),
      endAt: new Date('2026-12-31T23:59:59+07:00'),
      branchScope: 'ALL',
      priority: 'Normal',
      status: 'Active',
      version: 2,
      coverImageUrl: 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=1200&q=80',
      contactPerson: 'ฝ่ายการตลาดผลิตภัณฑ์ Inverter',
      publishMode: 'NOW',
      publishedAt: new Date('2026-09-10T08:00:00+07:00'),
      displayOrder: 3,
      createdBy: adminUser.id,
      assets: {
        create: [
          {
            assetType: 'document',
            documentType: 'Product Presentation',
            fileName: 'AC310_Sales_Pitch_Deck_V2.pptx',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(12400000),
            version: 'V2',
            downloadCount: 50
          }
        ]
      }
    }
  });

  // 7. BLDC / Solar Pump - Solar Pump Set Promotion
  await prisma.marketingAnnouncement.create({
    data: {
      id: 'mkt-ann-solar-pump-set',
      announcementType: 'Promotion',
      productGroup: 'BLDC / Solar Pump',
      campaignName: 'Solar Pump Set Promotion',
      shortDescription: 'Borehole & Centrifugal Pump • Package with solar panels and complete mounting hardware.',
      campaignDetails: `โปรโมชั่นชุดปั๊มน้ำบาดาลและปั๊มน้ำหอยโข่งโซล่าเซลล์ยอดนิยม:
- จัดชุดพร้อมแผงโซล่าเซลล์ Mono Half-Cell ประสิทธิภาพสูง
- กล่องควบคุมอัจฉริยะแบบ Hybrid (ใช้ได้ทั้งแดดและไฟบ้าน)
- รับประกันปั๊มและกล่องควบคุม 2 ปีเต็ม
- พิเศษฟรีสายไฟโซล่าเซลล์และอุปกรณ์เชื่อมต่อครบชุด`,
      termsConditions: 'ราคาโปรโมชั่นนี้ไม่รวมค่าบริการเจาะบ่อน้ำบาดาล ค่าจัดส่งฟรีทั่วประเทศตามเงื่อนไข',
      startAt: startSep,
      endAt: endSep,
      branchScope: 'ALL',
      priority: 'Important',
      status: 'Active',
      version: 1,
      coverImageUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
      contactPerson: 'คุณธวัชชัย (Product Specialist - Solar Pump) Tel: 081-555-6677',
      publishMode: 'NOW',
      publishedAt: startSep,
      displayOrder: 1,
      isFeatured: true,
      createdBy: adminUser.id,
      assets: {
        create: [
          {
            assetType: 'cover_image',
            documentType: 'Promotion Artwork',
            fileName: 'Solar_Pump_Banner_September.jpg',
            fileUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80',
            fileSize: BigInt(3400000),
            version: 'V1',
            downloadCount: 49
          },
          {
            assetType: 'document',
            documentType: 'Catalog',
            fileName: 'TERA_BLDC_Solar_Pump_Complete_Catalog.pdf',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(8900000),
            version: 'V1',
            downloadCount: 66
          },
          {
            assetType: 'document',
            documentType: 'Price List',
            fileName: 'Solar_Pump_Packages_Price_Sep2026.pdf',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(1400000),
            version: 'V1',
            downloadCount: 82
          },
          {
            assetType: 'document',
            documentType: 'Product Specification',
            fileName: 'Solar_Pump_Sizing_Chart_Flow_Head.pdf',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(2100000),
            version: 'V1',
            downloadCount: 57
          },
          {
            assetType: 'document',
            documentType: 'Sales Script',
            fileName: 'Farmer_Solar_Pump_Pitch_Script.pdf',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(950000),
            version: 'V1',
            downloadCount: 38
          },
          {
            assetType: 'document',
            documentType: 'LINE OA Material',
            fileName: 'Line_OA_RichMessage_Pump_Sets.zip',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(6500000),
            version: 'V1',
            downloadCount: 29
          },
          {
            assetType: 'document',
            documentType: 'Order Form',
            fileName: 'Solar_Pump_Job_Order_Form.xlsx',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(510000),
            version: 'V1',
            downloadCount: 44
          }
        ]
      }
    }
  });

  // 8. BLDC / Solar Pump - Free Site Survey Campaign
  await prisma.marketingAnnouncement.create({
    data: {
      id: 'mkt-ann-pump-survey',
      announcementType: 'Promotion',
      productGroup: 'BLDC / Solar Pump',
      campaignName: 'Free Site Survey Campaign',
      shortDescription: 'Valid through 30 Sep 2026 • Professional onsite borehole flow test and solar sizing.',
      campaignDetails: `แคมเปญสำรวจหน้างานฟรี สำหรับเกษตรกรและผู้ประกอบการฟาร์มเกษตร:
- ช่างผู้เชี่ยวชาญเข้าวัดระดับความลึกของน้ำบาดาลและอัตราการไหล (Yield Test)
- ประเมินทิศทางแสงแดดและวางแผนจุดติดตั้งแผงโซล่าเซลล์ที่เหมาะสมที่สุด
- เสนอราคาพร้อมประมาณการน้ำที่ได้ต่อวันฟรี ไม่มีค่าใช้จ่ายผูกมัด`,
      termsConditions: 'เปิดให้ใช้บริการใน 5 จังหวัดนำร่องที่มีศูนย์บริการประจำอยู่เท่านั้น',
      startAt: startSep,
      endAt: endSep,
      branchScope: 'SPECIFIC',
      priority: 'Normal',
      status: 'Active',
      version: 1,
      coverImageUrl: 'https://images.unsplash.com/photo-1544717302-de2939b7ef71?auto=format&fit=crop&w=1200&q=80',
      contactPerson: 'คุณสมเกียรติ (หัวหน้าทีมบริการภาคสนาม) Tel: 086-444-8899',
      publishMode: 'NOW',
      publishedAt: startSep,
      displayOrder: 2,
      createdBy: adminUser.id,
      branches: {
        create: [
          { branchId: 'KK01' },
          { branchId: 'UB01' },
          { branchId: 'ROI01' },
          { branchId: 'UDN01' },
          { branchId: 'SN01' }
        ]
      },
      assets: {
        create: [
          {
            assetType: 'document',
            documentType: 'Promotion Artwork',
            fileName: 'Free_Site_Survey_Flyer.jpg',
            fileUrl: 'https://images.unsplash.com/photo-1544717302-de2939b7ef71?auto=format&fit=crop&w=1200&q=80',
            fileSize: BigInt(2800000),
            version: 'V1',
            downloadCount: 26
          },
          {
            assetType: 'document',
            documentType: 'Telesales Script',
            fileName: 'Survey_Booking_Telesales_Guide.pdf',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(720000),
            version: 'V1',
            downloadCount: 22
          },
          {
            assetType: 'document',
            documentType: 'Others',
            fileName: 'Site_Survey_Checklist_Template.pdf',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(1150000),
            version: 'V1',
            downloadCount: 35
          },
          {
            assetType: 'document',
            documentType: 'Promotion Terms & Conditions',
            fileName: 'Terms_Free_Site_Survey_Sep2026.pdf',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(480000),
            version: 'V1',
            downloadCount: 14
          }
        ]
      }
    }
  });

  // 9. BLDC / Solar Pump - BLDC Jobsite Video Pack
  await prisma.marketingAnnouncement.create({
    data: {
      id: 'mkt-ann-bldc-video-pack',
      announcementType: 'Marketing Update',
      productGroup: 'BLDC / Solar Pump',
      campaignName: 'BLDC Jobsite Video Pack',
      shortDescription: 'New video testimonials and field demonstrations for customer presentations.',
      campaignDetails: `รวมคลิปวิดีโอสาธิตการใช้งานปั๊มน้ำโซล่าเซลล์ TERA ในสถานการณ์จริง:
- การสูบน้ำขึ้นถังเก็บสูง 40 เมตร
- การเปิดสปริงเกอร์รดน้ำสวนทุเรียน 20 ไร่
- เสียงสัมภาษณ์ความพึงพอใจของเกษตรกรตัวจริง`,
      startAt: new Date('2026-09-08T00:00:00+07:00'),
      endAt: new Date('2026-11-30T23:59:59+07:00'),
      branchScope: 'ALL',
      priority: 'Normal',
      status: 'Active',
      version: 1,
      coverImageUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=1200&q=80',
      contactPerson: 'ทีมสื่อและคอนเทนต์ TERA Media',
      publishMode: 'NOW',
      publishedAt: new Date('2026-09-08T08:00:00+07:00'),
      displayOrder: 3,
      createdBy: adminUser.id,
      assets: {
        create: [
          {
            assetType: 'video',
            documentType: 'Video',
            fileName: 'TERA_Solar_Pump_Durian_Farm_Review.mp4',
            fileUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
            fileSize: BigInt(28500000),
            version: 'V1',
            downloadCount: 37
          }
        ]
      }
    }
  });

  // 10. Solar Roof - Solar On-Grid 5 kW Business Package
  await prisma.marketingAnnouncement.create({
    data: {
      id: 'mkt-ann-solarroof-5kw',
      announcementType: 'Promotion',
      productGroup: 'Solar Roof',
      campaignName: 'Solar On-Grid 5 kW Business Package',
      shortDescription: 'Starting at ฿165,000 excl. VAT • Turnkey installation including PEA/MEA permission handling.',
      campaignDetails: `แพ็กเกจโซลาร์รูฟท็อปสำหรับบ้านพักอาศัยและธุรกิจขนาดเล็ก 5 kW:
- ประหยัดค่าไฟฟ้าสูงสุด 3,500 - 4,500 บาทต่อเดือน
- แผงโซล่าเซลล์ Tier-1 Tier A รับประกันประสิทธิภาพ 25 ปี
- อินเวอร์เตอร์ On-Grid ผ่านการรับรองจากการไฟฟ้า (PEA/MEA Approved)
- ฟรี! ดำเนินการขออนุญาตขนานไฟกับการไฟฟ้าทุกขั้นตอน
- ฟรี! ตรวจเช็กระบบและล้างแผง 2 ปีแรก`,
      termsConditions: `1. ราคาเริ่มต้น 165,000 บาท (ยังไม่รวมภาษีมูลค่าเพิ่ม) สำหรับหลังคาซีแพคโมเนียความสูงไม่เกิน 2 ชั้น
2. โครงสร้างหลังคาต้องมีความแข็งแรงและได้รับความเห็นชอบจากวิศวกร
3. ระยะเวลาแคมเปญ 1 - 30 กันยายน 2026`,
      startAt: startSep,
      endAt: endSep,
      branchScope: 'ALL',
      priority: 'Important',
      status: 'Active',
      version: 1,
      coverImageUrl: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=1200&q=80',
      contactPerson: 'คุณนรินทร์ (ผู้จัดการฝ่ายวิศวกรรมโซลาร์รูฟ) Tel: 088-777-9900',
      publishMode: 'NOW',
      publishedAt: startSep,
      displayOrder: 1,
      isFeatured: true,
      createdBy: adminUser.id,
      assets: {
        create: [
          {
            assetType: 'cover_image',
            documentType: 'Promotion Artwork',
            fileName: 'Solar_Rooftop_5kW_Commercial_Ad.jpg',
            fileUrl: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32f?auto=format&fit=crop&w=1200&q=80',
            fileSize: BigInt(4100000),
            version: 'V1',
            downloadCount: 71
          },
          {
            assetType: 'document',
            documentType: 'Product Presentation',
            fileName: 'Solar_Rooftop_Solution_Pitch_Deck.pdf',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(9800000),
            version: 'V1',
            downloadCount: 89
          },
          {
            assetType: 'document',
            documentType: 'Quotation Template',
            fileName: 'Template_Quotation_Solar_5kW_Package.xlsx',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(1250000),
            version: 'V1',
            downloadCount: 92
          },
          {
            assetType: 'document',
            documentType: 'Price List',
            fileName: 'Solar_Roof_Packages_Rate_Card_Sep2026.pdf',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(2100000),
            version: 'V1',
            downloadCount: 68
          },
          {
            assetType: 'document',
            documentType: 'Product Specification',
            fileName: 'Tier1_Solar_Panel_SpecSheet_550W.pdf',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(1780000),
            version: 'V1',
            downloadCount: 45
          },
          {
            assetType: 'document',
            documentType: 'Telesales Script',
            fileName: 'Telesales_Solar_Roof_Objection_Handling.pdf',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(890000),
            version: 'V1',
            downloadCount: 53
          },
          {
            assetType: 'document',
            documentType: 'Product Brochure',
            fileName: 'Customer_Handout_Solar_Payback_Analysis.pdf',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(3200000),
            version: 'V1',
            downloadCount: 39
          },
          {
            assetType: 'document',
            documentType: 'Social Media Artwork',
            fileName: 'Solar_Roof_Promotion_Carousel_Pack.zip',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(18900000),
            version: 'V1',
            downloadCount: 27
          }
        ]
      }
    }
  });

  // 11. Solar Roof - Free Solar Site Survey (Ending Soon)
  await prisma.marketingAnnouncement.create({
    data: {
      id: 'mkt-ann-solar-survey',
      announcementType: 'Promotion',
      productGroup: 'Solar Roof',
      campaignName: 'Free Solar Site Survey',
      shortDescription: 'Ends 20 Sep 2026 • Professional drone roof scan and electrical panel inspection.',
      campaignDetails: `โปรโมชั่นสำรวจหลังคาด้วยโดรนและตรวจสอบตู้เมนไฟฟ้าฟรี:
- วิศวกรเข้าประเมินโครงสร้างและเงาบังของอาคาร
- คำนวณกำลังผลิตไฟฟ้าและความคุ้มค่าแบบ 3D Simulation
- รับสิทธิ์ก่อนหมดเขต 20 กันยายน 2026 นี้เท่านั้น`,
      startAt: startSep,
      endAt: new Date('2026-09-20T23:59:59+07:00'), // <= 3 days left => Ending Soon
      branchScope: 'ALL',
      priority: 'Important',
      status: 'Ending Soon',
      version: 1,
      coverImageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
      contactPerson: 'ฝ่ายขายโครงการโซลาร์รูฟ Tel: 02-123-4567 ต่อ 301',
      publishMode: 'NOW',
      publishedAt: startSep,
      displayOrder: 2,
      createdBy: adminUser.id,
      assets: {
        create: [
          {
            assetType: 'document',
            documentType: 'Promotion Artwork',
            fileName: 'Solar_Site_Survey_Flyer.jpg',
            fileUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80',
            fileSize: BigInt(2900000),
            version: 'V1',
            downloadCount: 33
          },
          {
            assetType: 'document',
            documentType: 'Product Brochure',
            fileName: 'Solar_Survey_Customer_Guide.pdf',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(1850000),
            version: 'V1',
            downloadCount: 25
          },
          {
            assetType: 'document',
            documentType: 'Order Form',
            fileName: 'Solar_Survey_Booking_Form.pdf',
            fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
            fileSize: BigInt(870000),
            version: 'V1',
            downloadCount: 19
          }
        ]
      }
    }
  });

  // 12. Archive - Expired Campaign 1
  await prisma.marketingAnnouncement.create({
    data: {
      id: 'mkt-ann-88-flash',
      announcementType: 'Promotion',
      productGroup: 'Marketing Headquarters',
      campaignName: '8.8 Mid-Year Flash Sale',
      shortDescription: 'Past campaign • 01 - 15 Aug 2026 • Mid-year inventory clearance.',
      campaignDetails: `แคมเปญเคลียร์สต็อกกลางปี 8.8 สำหรับลูกค้าทุกกลุ่ม:
- จัดโปรโมชั่นส่วนลดอะไหล่และอุปกรณ์เสริม
- สิ้นสุดระยะเวลาแคมเปญแล้ว ย้ายเข้าสู่ Archive`,
      startAt: pastStart,
      endAt: new Date('2026-08-15T23:59:59+07:00'),
      branchScope: 'ALL',
      priority: 'Normal',
      status: 'Expired',
      version: 1,
      coverImageUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80',
      contactPerson: 'ฝ่ายการตลาดส่วนกลาง',
      publishMode: 'NOW',
      publishedAt: pastStart,
      createdBy: adminUser.id,
      assets: {
        create: [
          {
            assetType: 'document',
            documentType: 'Promotion Artwork',
            fileName: '8.8_Flash_Sale_Banner_Archived.jpg',
            fileUrl: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=1200&q=80',
            fileSize: BigInt(1900000),
            version: 'Final',
            downloadCount: 110
          }
        ]
      }
    }
  });

  // 13. Archive - Cancelled Campaign
  await prisma.marketingAnnouncement.create({
    data: {
      id: 'mkt-ann-monsoon-pump',
      announcementType: 'Promotion',
      productGroup: 'BLDC / Solar Pump',
      campaignName: 'Monsoon Special Pump Discount',
      shortDescription: 'Cancelled due to supply chain rescheduling.',
      campaignDetails: 'แคมเปญนี้ถูกยกเลิกโดยฝ่ายการตลาดเนื่องจากปรับเปลี่ยนการจัดสรรสินค้า',
      startAt: pastStart,
      endAt: pastEnd,
      branchScope: 'ALL',
      priority: 'Normal',
      status: 'Cancelled',
      version: 1,
      coverImageUrl: 'https://images.unsplash.com/photo-1518640467707-6811f4a6ab73?auto=format&fit=crop&w=1200&q=80',
      contactPerson: 'ฝ่ายการตลาด',
      publishMode: 'NOW',
      publishedAt: pastStart,
      createdBy: adminUser.id
    }
  });

  // Also create initial acknowledgments for demonstration
  // Let's acknowledge the 9.9 Mega Promotion for the admin user
  await prisma.marketingAnnouncementAcknowledgment.create({
    data: {
      announcementId: ann1.id,
      userId: adminUser.id,
      userName: adminUser.fullName,
      branchId: 'BKK-HQ',
      readAt: now,
      acknowledgedAt: now,
      acknowledgedVersion: 1
    }
  });

  // Add an initial audit log
  await prisma.marketingAnnouncementAuditLog.create({
    data: {
      announcementId: ann1.id,
      version: 1,
      action: 'PUBLISHED',
      newValue: { campaignName: '9.9 TERA Mega Promotion', status: 'Active' },
      performedBy: adminUser.id,
      performedByName: adminUser.fullName,
      notes: 'Initial campaign launch approved and published for all branches.',
      performedAt: startSep
    }
  });

  console.log('Seeding completed successfully!');
}

seedMarketingBoard()
  .catch(err => {
    console.error('Seeding error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
