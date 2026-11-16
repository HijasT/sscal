const { test, expect } = require('@playwright/test')
const { readFileSync } = require('node:fs')
const { manifest, createGoldenXlsxBuffer } = require('../tests/fixtures/goldenWorkbook.cjs')

async function uploadGolden(page) {
  await page.goto('/')
  await page.getByRole('button',{name:'Calculator',exact:true}).click()
  await page.locator('input[type="file"]').setInputFiles({
    name:'kleon-phase2-synthetic.xlsx',
    mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer:createGoldenXlsxBuffer(),
  })
  const remainder=page.locator('.stat-card').filter({hasText:'Accounting Remainder'})
  await expect(remainder).toContainText('AED -0.02')
  return remainder
}

test('upload XLSX and export exact golden CSV and PDF accounting totals', async ({page})=>{
  const expected=manifest.months[0].expected
  const remainder=await uploadGolden(page)
  await expect(remainder).toContainText('Rounded payouts exceed the pool')

  const downloadCSV=page.waitForEvent('download')
  await page.getByRole('button',{name:'Download CSV'}).click()
  const csvDownload=await downloadCSV
  expect(csvDownload.suggestedFilename()).toMatch(/\.csv$/)
  const csv=readFileSync(await csvDownload.path(),'utf8')
  expect(csv).toContain('"Total Incentive Pool (AED)","2.50"')
  expect(csv).toContain('"Total Staff Payouts (AED)","2.52"')
  expect(csv).toContain('"Accounting Remainder (AED)","-0.02"')
  expect(csv).toContain('"Cora AE03-101"')
  for(const person of expected.staff) {
    const line=csv.split('\n').find(row=>row.includes('"' + person.name + '"'))
    expect(line).toBeTruthy()
    expect(line.split(',').slice(-3)).toEqual([
      person.p1.toFixed(2),person.p2.toFixed(2),person.total.toFixed(2),
    ])
  }

  const downloadPDF=page.waitForEvent('download')
  await page.getByRole('button',{name:'Download PDF'}).click()
  const pdfDownload=await downloadPDF
  expect(pdfDownload.suggestedFilename()).toMatch(/\.pdf$/)
  const pdfBytes=readFileSync(await pdfDownload.path())
  expect(pdfBytes.subarray(0,4).toString()).toBe('%PDF')
  const pdfjs=await import('pdfjs-dist/legacy/build/pdf.mjs')
  const doc=await pdfjs.getDocument({data:new Uint8Array(pdfBytes),useSystemFonts:true}).promise
  let text=''
  for(let n=1;n<=doc.numPages;n++){
    const page=await doc.getPage(n)
    const content=await page.getTextContent()
    text+=content.items.map(item=>item.str).join(' ') + '\n'
  }
  expect(text).toContain('Accounting Remainder')
  expect(text).toContain('Staff Payout')
  expect(text).toContain('-0.02')
})

test('staff exclusion re-calculates the tier, payouts and Accounting Remainder',async ({page})=>{
  await uploadGolden(page)
  await page.getByRole('button',{name:'Exclude Bela AE02-138 and recalculate'}).click()
  await expect(page.locator('.stat-card').filter({hasText:'Total Pool'})).toContainText('AED 0.00')
  await expect(page.locator('.stat-card').filter({hasText:'Accounting Remainder'})).toContainText('AED 0.00')
  await expect(page.getByText('1 staff excluded')).toBeVisible()
})

test('Individual mode preserves independently rounded personal awards',async ({page})=>{
  await page.goto('/')
  await page.getByRole('button',{name:'Calculator',exact:true}).click()
  await page.getByRole('button',{name:'Individual',exact:true}).click()
  const form=page.locator('.form-grid')
  await form.locator('input').nth(0).fill('100')
  await form.locator('input').nth(1).fill('100')
  await form.locator('input').nth(2).fill('30')
  await form.locator('input').nth(3).fill('3')
  await page.getByRole('button',{name:'Calculate Incentive'}).click()
  await expect(page.getByText('Incentive Breakdown')).toBeVisible()
  await expect(page.getByText('team-wide Accounting Remainder',{exact:false})).toBeVisible()
})
