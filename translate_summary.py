import re
import os

filepath = r'c:\Users\teragroup\Desktop\sales-crm-web\src\app\components\ManagerDailySummary.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    'Product Group Targets & Status': 'เป้าหมายและสถานะกลุ่มสินค้า',
    'Branch Sales vs Expenses': 'ยอดขายเทียบกับค่าใช้จ่ายรายสาขา',
    'Individual Sales vs Expenses': 'ยอดขายเทียบกับค่าใช้จ่ายรายบุคคล',
    'พนักงานขาย (Salesperson)': 'พนักงานขาย',
    'ยอดขาย (Sales)': 'ยอดขาย',
    'ค่าใช้จ่าย (Expenses)': 'ค่าใช้จ่าย',
    'กำไรเบื้องต้น (Net Profit)': 'กำไรเบื้องต้น',
    'Cost/Sales %': 'สัดส่วนต้นทุนต่อยอดขาย %',
    'Sales (ยอดขาย)': 'ยอดขาย',
    'Expenses (ค่าใช้จ่าย)': 'ค่าใช้จ่าย',
    'ยอดขาย / Status': 'ยอดขาย / สถานะ'
}

for eng, thai in replacements.items():
    content = content.replace(eng, thai)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Replaced ManagerDailySummary.tsx")
