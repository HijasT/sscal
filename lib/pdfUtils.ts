// PDF export utilities using jsPDF (bundled, not CDN)
import { formatCurrency } from './utils'

export async function exportBulkToPDF(calculatedData: any, results: any[]) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF({ orientation: 'landscape' })
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFontSize(20)
  doc.setTextColor(53, 80, 122)
  doc.text('Team Incentives Report', 15, 20)

  doc.setFontSize(12)
  doc.setTextColor(100, 100, 100)
  const viewTitle = getViewTitle(calculatedData.viewMode, calculatedData.sheets[0])
  doc.text(viewTitle, 15, 28)

  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text(`Sheets: ${calculatedData.sheets.join(', ')}`, 15, 34)

  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.text('Summary', 15, 45)

  const summaryData = [
    ['Team Achievement', `${calculatedData.teamAchievement.toFixed(2)}%`],
    ['Current Tier',    `${calculatedData.tier.name} (${calculatedData.tier.rate}% rate)`],
    ['Total Pool',      `AED ${formatCurrency(calculatedData.totalPool)}`],
    ['Staff Count',     `${calculatedData.staffCount}`],
    ['Team Target',     `AED ${formatCurrency(calculatedData.target)}`],
    ['Team Sales',      `AED ${formatCurrency(calculatedData.teamSales)}`],
  ]

  autoTable(doc, {
    startY: 48,
    head: [],
    body: summaryData,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [80, 80, 80] as [number, number, number] },
      1: { textColor: [53, 80, 122] as [number, number, number], fontStyle: 'bold' },
    },
  })

  let finalY = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.text('Staff Performance', 15, finalY)

  const tableData = results.map((person, idx) => [
    `#${idx + 1}`,
    person.name,
    formatCurrency(person.totalIncentive),
    person.packages,
    person.clients ?? '-',
    formatCurrency(person.sales),
    person.workingDays,
    person.avgPackagesPerDay.toFixed(2),
    formatCurrency(person.avgSalesPerDay),
    person.clients ? person.avgClientsPerDay.toFixed(2) : '-',
    person.clients ? person.maxKpiClients : '-',
    `${person.contribution.toFixed(2)}%`,
    formatCurrency(person.p1),
    formatCurrency(person.p2),
  ])

  autoTable(doc, {
    startY: finalY + 3,
    head: [['Rank', 'Name', 'Total (AED)', 'Packages', 'Clients', 'Sales (AED)', 'Days', 'Pkg/Day', 'Sales/Day', 'Clients/Day', 'Max KPI Clients', '% Share', 'P1 (AED)', 'P2 (AED)']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [53, 80, 122] as [number, number, number], textColor: [255, 255, 255] as [number, number, number], fontSize: 9 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { halign: 'center', cellWidth: 14 },
    },
  })

  const pageCount = (doc as any).internal.getNumberOfPages()
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.text(
      `Generated on ${new Date().toLocaleDateString()} - Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' },
    )
  }

  doc.save(`team-incentives-${new Date().toISOString().split('T')[0]}.pdf`)
}

export async function exportAnalyticsToPDF(
  history: any[],
  lifetimeStats: any,
  rankHistory: any[],
) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF()

  doc.setFontSize(20)
  doc.setTextColor(53, 80, 122)
  doc.text('Performance Analytics Report', 15, 20)

  doc.setFontSize(12)
  doc.setTextColor(100, 100, 100)
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 15, 28)

  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.text('Career Highlights', 15, 40)

  if (lifetimeStats) {
    const careerData = [
      ['Total Earned',       `AED ${formatCurrency(lifetimeStats.totalEarnings)}`],
      ['Months Tracked',     `${lifetimeStats.monthsTracked}`],
      ['Average per Month',  `AED ${formatCurrency(lifetimeStats.avgEarnings)}`],
      ['Best Month',         `${lifetimeStats.bestMonth.achievement.toFixed(1)}% (${lifetimeStats.bestMonth.monthKey})`],
      ['Current Streak',     lifetimeStats.currentStreak > 0 ? `${lifetimeStats.currentStreak} months` : 'None'],
      ['Longest Streak',     lifetimeStats.longestStreak > 0 ? `${lifetimeStats.longestStreak} months` : 'None'],
    ]

    autoTable(doc, {
      startY: 43,
      head: [],
      body: careerData,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [80, 80, 80] as [number, number, number] },
        1: { textColor: [53, 80, 122] as [number, number, number], fontStyle: 'bold' },
      },
    })
  }

  let finalY = (doc as any).lastAutoTable.finalY + 10
  doc.setFontSize(14)
  doc.setTextColor(0, 0, 0)
  doc.text('Monthly History', 15, finalY)

  const historyData = history.map((m) => [
    m.monthKey,
    `${m.achievement.toFixed(1)}%`,
    m.tier,
    `#${m.rank}`,
    formatCurrency(m.totalEarnings),
    formatCurrency(m.sales),
  ])

  autoTable(doc, {
    startY: finalY + 3,
    head: [['Month', 'Achievement', 'Tier', 'Rank', 'Earnings (AED)', 'Sales (AED)']],
    body: historyData,
    theme: 'grid',
    headStyles: { fillColor: [53, 80, 122] as [number, number, number], textColor: [255, 255, 255] as [number, number, number], fontSize: 9 },
    styles: { fontSize: 9, cellPadding: 2 },
  })

  const pageCount = (doc as any).internal.getNumberOfPages()
  doc.setFontSize(8)
  doc.setTextColor(150, 150, 150)
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' },
    )
  }

  doc.save(`analytics-report-${new Date().toISOString().split('T')[0]}.pdf`)
}

function getViewTitle(viewMode: string, firstSheet: string): string {
  if (viewMode === 'monthly') return firstSheet
  const titles: Record<string, string> = {
    q1: 'Q1 (Jan–Mar)', q2: 'Q2 (Apr–Jun)',
    q3: 'Q3 (Jul–Sep)', q4: 'Q4 (Oct–Dec)',
    h1: 'H1 (Jan–Jun)', h2: 'H2 (Jul–Dec)',
    yearly: 'Full Year',  alltime: 'All-Time',
  }
  return titles[viewMode] || viewMode
}
