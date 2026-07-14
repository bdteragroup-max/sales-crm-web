$file = "src/app/api/department/fuel-report/route.ts"
$content = Get-Content $file -Raw

# Replace initialization 1
$content = $content -replace "if \(\!empData\[dateStr\]\) empData\[dateStr\] = \{ distance: 0, fuelAmount: 0, fuelLiters: 0, flags: \[\], manualExpenseAmount: 0, checkinsList: \[\] \};", "if (!empData[dateStr]) empData[dateStr] = { distance: 0, fuelAmount: 0, fuelLiters: 0, flags: [], manualExpenseAmount: 0, checkinsList: [], odometer: null, odometerDistance: null };"

# Replace manual expense logic
$oldManualExpense = "empData\[dateStr\].manualExpenseAmount \+= Number\(exp.amount\);"
$newManualExpense = "empData[dateStr].manualExpenseAmount += Number(exp.amount);`r`n        if (exp.odometer != null) {`r`n          const odo = Number(exp.odometer);`r`n          if (empData[dateStr].odometer === null || odo > empData[dateStr].odometer) {`r`n             empData[dateStr].odometer = odo;`r`n          }`r`n        }"
$content = $content -replace $oldManualExpense, $newManualExpense

# Replace flag logic and iteration
$oldFlagLogic = "Object\.values\(reportData\)\.forEach\(\(emp: any\) => \{`r`n      Object\.keys\(emp\.dailyStats\)\.forEach\(dateStr => \{"
$newFlagLogic = "Object.values(reportData).forEach((emp: any) => {`r`n      let previousOdometer: number | null = null;`r`n      const sortedDates = Object.keys(emp.dailyStats).sort();`r`n      sortedDates.forEach(dateStr => {"
$content = $content -replace [regex]::Escape($oldFlagLogic), $newFlagLogic

$oldReviewPush = "if \(generatedFlag\) \{`r`n           stat\.flags\.push\(\{\`r\`n             type: generatedFlag,\`r\`n             review: existingReview || null\`r\`n           \}\);`r`n        \}"
$newReviewPush = "if (generatedFlag) {`r`n           stat.flags.push({`r`n             type: generatedFlag,`r`n             review: existingReview || null`r`n           });`r`n        }`r`n`r`n        if (stat.odometer !== null) {`r`n          if (previousOdometer !== null) {`r`n            stat.odometerDistance = parseFloat((stat.odometer - previousOdometer).toFixed(2));`r`n            if (stat.distance > 0) {`r`n              const diff = Math.abs(stat.odometerDistance - stat.distance);`r`n              if (diff > stat.distance * 0.3) {`r`n                stat.flags.push({`r`n                  type: 'ODOMETER_MISMATCH',`r`n                  review: null`r`n                });`r`n              }`r`n            }`r`n          }`r`n          previousOdometer = stat.odometer;`r`n        }"
$content = $content -replace [regex]::Escape($oldReviewPush), $newReviewPush

Set-Content -Path $file -Value $content -Encoding UTF8
