import re
import os

filepath = r'c:\Users\teragroup\Desktop\sales-crm-web\src\app\components\DashboardUI.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    'Team: ': 'ทีม: ',
    'Revenue Growth Rate': 'อัตราการเติบโตของรายได้',
    'Pipeline-Based (Most Accurate)': 'ประเมินจากท่อการขาย (แม่นยำที่สุด)',
    'Post-Sales Order Fulfillment': 'การปฏิบัติตามคำสั่งซื้อหลังการขาย',
    'Job Connection Status': 'สถานะการเชื่อมต่องาน',
    'Product Group Targets vs Sales': 'เป้าหมายยอดขายแต่ละกลุ่มสินค้า',
    'Individual Sales': 'ยอดขายรายบุคคล',
    'ยอดขาย (Sales)': 'ยอดขาย',
    'CRITICAL': 'วิกฤต',
    'WARNING': 'เตือน',
    'Daily Sales Trend': 'แนวโน้มยอดขายรายวัน',
    'Cumulative Sales vs. Workload': 'ยอดขายสะสมเทียบกับภาระงาน',
    'Relationship between Activity and Revenue': 'ความสัมพันธ์ระหว่างกิจกรรมและรายได้',
    'Compare average weekly calls/visits with individual sales closes': 'เปรียบเทียบจำนวนการโทรและการเข้าพบเฉลี่ยต่อสัปดาห์กับยอดขายรายบุคคล',
    'Pipeline Flow Ribbon': 'การไหลเวียนของโอกาสการขาย',
    'ดีลใหม่เข้าท่อ (New)': 'ดีลใหม่เข้าท่อ',
    'กำลังเจรจา (Active)': 'กำลังเจรจา',
    'ปิดการขายสำเร็จ (Won)': 'ปิดการขายสำเร็จ',
    'ปิดไม่สำเร็จ (Lost)': 'ปิดไม่สำเร็จ',
    'การวิเคราะห์วงจรการขาย (Sales Cycle)': 'การวิเคราะห์วงจรการขาย',
    'ระยะเวลาเฉลี่ยที่ชนะ (Avg Time to Win)': 'ระยะเวลาเฉลี่ยที่ชนะ',
    'ระยะเวลาเฉลี่ยที่แพ้ (Avg Time to Lose)': 'ระยะเวลาเฉลี่ยที่แพ้',
    'จำแนกตามประเภทผลิตภัณฑ์ (Product Breakdown)': 'จำแนกตามประเภทผลิตภัณฑ์',
    'Avg Win': 'ชนะเฉลี่ย',
    'Avg Lose': 'แพ้เฉลี่ย',
    'High-Impact Aging Deals': 'ดีลล่าช้าที่มีผลกระทบสูง',
    'Pipeline Stages Breakdown': 'รายละเอียดขั้นตอนท่อการขาย',
    'Weighted Pipeline Value': 'มูลค่าท่อการขายแบบถ่วงน้ำหนัก',
    'Conversion Rates': 'อัตราคอนเวอร์ชัน',
    'Stage-to-Stage': 'จากขั้นตอนก่อนหน้า',
    'Benchmark': 'เกณฑ์มาตรฐาน',
    'Product Margin Analysis': 'การวิเคราะห์ยอดขายและอัตรากำไรขั้นต้น',
    'Estimated Cost': 'ต้นทุนโดยประมาณ',
    'Based on estimated profit margin': 'คำนวณจากประมาณการอัตรากำไร',
    'Product Win Rates': 'อัตราการชนะตามชนิดผลิตภัณฑ์',
    'Product Performance Dashboard': 'แดชบอร์ดประสิทธิภาพสินค้า',
    'Assigned to Marketing Manager View': 'มุมมองสำหรับผู้จัดการฝ่ายการตลาด',
    'รายละเอียดสินค้า (Product Details)': 'รายละเอียดสินค้า',
    'รอรับ PO (Pending PO)': 'รอรับ PO',
    'ปิดยอดเดือนนี้ (Sales Closed)': 'ปิดยอดเดือนนี้',
    'เป้าหมาย (Target)': 'เป้าหมาย',
    'สัดส่วนเทียบเป้าหมาย (Target Comparison)': 'สัดส่วนเทียบเป้าหมาย',
    'ยอดขายตามสาขา (Branch Performance)': 'ยอดขายตามสาขา',
    'สาขา (Branch)': 'สาขา',
    'เป้าหมาย (Sales Target)': 'เป้าหมายการขาย',
    'รอรับ PO (Waiting for PO)': 'รอรับ PO',
    'Sales Area: Performance vs Potential': 'วิเคราะห์ศักยภาพรายพื้นที่การขาย',
    'Loss Reason Summary & Value': 'สถิติมูลค่าและสาเหตุที่พลาด',
    'Loss Reasons by Product': 'สาเหตุที่พลาดจำแนกรายผลิตภัณฑ์',
    'Stacked Bar': 'แผนภูมิแท่งซ้อน',
    'Advanced Analytics': 'วิเคราะห์เชิงลึก',
    'All-time CLV': 'มูลค่าตลอดอายุการใช้งาน (CLV)',
    'At-Risk': 'ความเสี่ยง',
    'Customer Lifetime Analytics': 'การวิเคราะห์มูลค่าตลอดชีพลูกค้า',
    'Lifetime Value': 'มูลค่าตลอดชีพ',
    'Days Since Last Purchase': 'จำนวนวันตั้งแต่ซื้อครั้งล่าสุด',
    'Last Product Type': 'ประเภทสินค้าล่าสุด',
    'Last Deal Value': 'มูลค่าดีลล่าสุด',
    'Owner Name': 'ผู้รับผิดชอบ',
    'Days': 'วัน'
}

for eng, thai in replacements.items():
    content = content.replace(eng, thai)

# Fix some specifics
content = content.replace('Target Comparison', 'สัดส่วนเทียบเป้าหมาย')
content = content.replace('Sales Closed', 'ยอดขายที่ปิดได้')
content = content.replace('Pending PO', 'รอรับ PO')
content = content.replace('Waiting for PO', 'รอรับ PO')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Replaced DashboardUI.tsx")
