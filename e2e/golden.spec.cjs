const { test, expect } = require('@playwright/test')
const { readFileSync } = require('node:fs')
const { createGoldenXlsxBuffer } = require('../tests/fixtures/goldenWorkbook.cjs')
// Current shared four-tier policy: 100% achievement => 3% pool. The
// pre-v15.1 historical golden remains independently tested in Node tests.
const currentStaff = [
  {name:'Cora AE03-101',p1:0.50,p2:0.45,total:0.95},
  {name:'Amir AE01-227',p1:0.50,p2:0.60,total:1.10},
  {name:'Bela AE02-138',p1:0.50,p2:0.45,total:0.95},
]

async function uploadGolden(page, { dismissWarning = true } = {}) {
  await page.goto('/')
  await page.getByRole('button',{name:'Calculator',exact:true}).click()
  await page.locator('input[type="file"]').setInputFiles({
    name:'kleon-phase2-synthetic.xlsx',
    mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer:createGoldenXlsxBuffer(),
  })
  const remainder=page.locator('.stat-card').filter({hasText:'Accounting Remainder'})
  await expect(remainder).toContainText('AED 0.00')
  const warning = page.locator('dialog.msg-dialog.msg-warning')
  await expect(warning).toBeVisible()
  await expect(warning).toContainText('blank dates after day')
  if (dismissWarning) {
    await warning.getByRole('button', { name: 'Got it' }).click()
    await expect(warning).toBeHidden()
  }
  return remainder
}

test('upload XLSX and export exact golden CSV and PDF accounting totals', async ({page})=>{
  const remainder=await uploadGolden(page)
  await expect(remainder).toContainText('AED 0.00')

  const downloadCSV=page.waitForEvent('download')
  await page.getByRole('button',{name:'Download CSV'}).click()
  const csvDownload=await downloadCSV
  expect(csvDownload.suggestedFilename()).toMatch(/\.csv$/)
  const csv=readFileSync(await csvDownload.path(),'utf8')
  expect(csv).toContain('"Total Incentive Pool (AED)","3.00"')
  expect(csv).toContain('"Total Staff Payouts (AED)","3.00"')
  expect(csv).toContain('"Accounting Remainder (AED)","0.00"')
  expect(csv).toContain('"Cora AE03-101"')
  for(const person of currentStaff) {
    const line=csv.split('\n').find(row=>row.includes('"' + person.name + '"'))
    expect(line).toBeTruthy()
    expect(line.split(',').slice(-5)).toEqual([
      person.p1.toFixed(2),person.p2.toFixed(2),'0','0.00',person.total.toFixed(2),
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
  expect(text).toContain('0.00')
})

test('staff exclusion re-calculates the tier, payouts and Accounting Remainder',async ({page})=>{
  await uploadGolden(page)
  await page.getByRole('button',{name:'Exclude Bela AE02-138 and recalculate'}).click()
  await expect(page.locator('.stat-card').filter({hasText:'Total Pool'})).toContainText('AED 0.00')
  await expect(page.locator('.stat-card').filter({hasText:'Accounting Remainder'})).toContainText('AED 0.00')
  await expect(page.getByText('1 staff excluded')).toBeVisible()
})

test('trailing blank-day warning is visible, actionable and dismissible', async ({page}) => {
  await uploadGolden(page, { dismissWarning: false })
  const warning = page.locator('dialog.msg-dialog.msg-warning')
  await expect(warning).toContainText('set a reporting cutoff and re-upload')
  await warning.getByRole('button', { name: 'Got it' }).click()
  await expect(warning).toBeHidden()
  await expect(page.getByRole('button', { name: 'Download CSV' })).toBeEnabled()
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

test('Phase 4 audit CSV downloads signed accounting reconciliation and input policy', async ({page}) => {
  await uploadGolden(page)
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download Audit CSV' }).click()
  const downloaded = await pending
  expect(downloaded.suggestedFilename()).toMatch(/^incentive-audit-.*\.csv$/)
  const csv = readFileSync(await downloaded.path(), 'utf8')
  expect(csv).toMatch(/"Application Version","\d+\.\d+\.\d+"/)
  expect(csv).toContain('"Payout Policy","accounting-remainder-v1"')
  expect(csv).toContain('"Accounting Remainder (fils)","0"')
  expect(csv).toContain('"Accounting Remainder (AED)","0.00"')
})

test('Dubai It bonus control is beside engine selector, persists and is removed from Settings',async ({page})=>{
  await page.goto('/')
  await page.getByRole('button',{name:'Calculator',exact:true}).click()
  await page.locator('input[type="file"]').setInputFiles({
    name:'kleon-bonus-control.xlsx',
    mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer:createGoldenXlsxBuffer(),
  })
  const warning=page.locator('dialog.msg-dialog.msg-warning')
  await expect(warning).toBeVisible()
  await warning.getByRole('button',{name:'Got it'}).click()
  await expect(warning).toBeHidden()
  const engine=page.locator('#bulk-incentive-engine')
  const bonus=page.locator('#bulk-dubai-it-bonus')
  await expect(engine).toBeVisible()
  await expect(bonus).toBeVisible()
  await expect(engine).toHaveValue('legacy')
  await bonus.fill('650.25')
  await expect(bonus).toHaveValue('650.25')
  await expect(page.getByRole('button',{name:'Save bonus'})).toHaveCount(0)
  await engine.selectOption('scrooge')
  await page.reload()
  await page.getByRole('button',{name:'Calculator',exact:true}).click()
  await expect(page.locator('#bulk-dubai-it-bonus')).toHaveValue('650.25')
  await page.getByRole('button',{name:'Settings',exact:true}).click()
  await expect(page.locator('#dubai-it-bonus')).toHaveCount(0)
})

test('ranking keeps Rank and Name visible while scrolling horizontally; engine styling matches month',async ({page})=>{
  await uploadGolden(page)
  const scroll=page.locator('.rank-table-scroll')
  const name=scroll.locator('tbody td.rank-freeze-name').first()
  const rank=scroll.locator('tbody td.rank-freeze-rank').first()
  const [nameBefore,rankBefore]=await Promise.all([name.boundingBox(),rank.boundingBox()])
  expect(nameBefore).toBeTruthy();expect(rankBefore).toBeTruthy()
  await scroll.evaluate(el=>{el.scrollLeft=450})
  await expect.poll(()=>scroll.evaluate(el=>el.scrollLeft)).toBeGreaterThan(100)
  const [nameAfter,rankAfter]=await Promise.all([name.boundingBox(),rank.boundingBox()])
  expect(Math.abs(nameAfter.x-nameBefore.x)).toBeLessThan(3)
  expect(Math.abs(rankAfter.x-rankBefore.x)).toBeLessThan(3)
  const engine=page.locator('#bulk-incentive-engine')
  const month=page.getByText('MONTH',{exact:true}).locator('..').locator('select')
  for(const property of ['fontSize','fontWeight','borderRadius','backgroundColor']){
    const e=await engine.evaluate((el,prop)=>getComputedStyle(el)[prop],property)
    const m=await month.evaluate((el,prop)=>getComputedStyle(el)[prop],property)
    expect(e,property).toBe(m)
  }
})

test('achieved current-month target displays captioned Nailed It GIF filling the card',async ({page})=>{
  await page.clock.setFixedTime(new Date('2026-11-20T12:00:00Z'))
  await uploadGolden(page)
  await expect(page.getByText('Already reached',{exact:true})).toHaveCount(0)
  const card=page.locator('.bulk-target-achieved-card')
  await expect(card).toBeVisible()
  const gif=card.locator('img')
  await expect(gif).toBeVisible()
  await expect(gif).toHaveAttribute('src','/nailed-it.gif')
  const metadata=await gif.evaluate(img=>({complete:img.complete,width:img.naturalWidth,height:img.naturalHeight}))
  expect(metadata.complete).toBe(true)
  expect(metadata.width).toBeGreaterThan(150)
  expect(metadata.height).toBeGreaterThan(80)
  const fills=await gif.evaluate(img=>{const parent=img.parentElement.getBoundingClientRect();const box=img.getBoundingClientRect();return {dw:Math.abs(box.width-parent.width),dh:Math.abs(box.height-parent.height)}})
  expect(fills.dw).toBeLessThan(3)
  expect(fills.dh).toBeLessThan(3)
})
