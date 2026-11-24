import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatDubaiItCount } from '../lib/dubaiItCountDisplay'

test('October Legacy explicitly separates full and discounted Dubai It counts',()=>{
 assert.equal(formatDubaiItCount(1,1,true),'1+1')
 assert.equal(formatDubaiItCount(0,2,true),'0+2')
 assert.equal(formatDubaiItCount(2,0,true),'2+0')
 assert.equal(formatDubaiItCount(0,0,true),'0+0')
})
test('other engines and months show only full-price Dubai It count',()=>{
 assert.equal(formatDubaiItCount(1,1,false),'1')
 assert.equal(formatDubaiItCount(0,2,false),'0')
})
test('unverified counts never default to zero',()=>{
 assert.equal(formatDubaiItCount(null,1,true),'Review')
 assert.equal(formatDubaiItCount(1,null,true),'Review')
 assert.equal(formatDubaiItCount(null,null,false),'Review')
})
