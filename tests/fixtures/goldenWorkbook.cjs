/** Synthetic fixtures only: never add a production staff workbook to this folder. */
const XLSX = require('xlsx')
const manifest = require('./phase2-golden.json')

function createGoldenWorkbook() {
  const workbook = XLSX.utils.book_new()
  for (const month of manifest.months) {
    const rows = [
      ['TARGET', month.target],
      [],
      [null, null, null, ...month.days],
    ]
    for (const person of month.staff) {
      rows.push([person.name, 'Count of Packages', null, ...person.packages])
      rows.push([null, 'Sum of Sales', null, ...person.sales])
    }
    rows.push(['Grand totals'])
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), month.sheetName)
  }
  return workbook
}

function createGoldenXlsxBuffer() {
  return XLSX.write(createGoldenWorkbook(), { type: 'buffer', bookType: 'xlsx' })
}

module.exports = { manifest, createGoldenWorkbook, createGoldenXlsxBuffer }
