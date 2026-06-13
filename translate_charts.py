import re
import os

filepath = r'c:\Users\teragroup\Desktop\sales-crm-web\src\app\components\DashboardCharts.tsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

replacements = {
    "'Win Rate'": "'อัตราการชนะ'",
    "Team Benchmark": "เกณฑ์มาตรฐานของทีม"
}

for eng, thai in replacements.items():
    content = content.replace(eng, thai)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Replaced DashboardCharts.tsx")
