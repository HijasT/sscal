import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isRecentWarningMonth, scopeUploadWarnings } from '../lib/uploadWarningScope'
import type { ExcelData } from '../lib/excelTypes'
const sheet=(sheetName:string,warnings:string[]):ExcelData=>({
 sheetName, warnings, staff:[],target:0,teamTotal:{packages:0,sales:0},
})
test('warning popup includes current and previous month only, retains older issues for review',()=>{
 const now=new Date(2026,10,17)
 const d=[sheet('Sep 25',['old missing target']),sheet('Sep 26',['older warning']),
 sheet('Oct 26',['previous warning']),sheet('Nov 26',['current warning']),
 sheet('Dec 26',['future warning'])]
 assert.deepEqual(scopeUploadWarnings(d,now),{
 recent:['previous warning','current warning'],
 older:['old missing target','older warning','future warning'],
 })
 assert.deepEqual(scopeUploadWarnings([d[0],d[1]],now).recent,[])
})
test('January rollover and whitespace-normalized months',()=>{
 const now=new Date(2027,0,4)
 assert.equal(isRecentWarningMonth('Dec 26',now),true)
 assert.equal(isRecentWarningMonth('Jan 27 ',now),true)
 assert.equal(isRecentWarningMonth('Nov 26',now),false)
 assert.equal(isRecentWarningMonth('Jan 26',now),false)
 assert.equal(isRecentWarningMonth('Feb 27',now),false)
 assert.equal(isRecentWarningMonth('invalid',now),false)
})
