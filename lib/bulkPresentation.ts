/** Pure tier and center-view presentation metrics. */
import type { Tier } from './config'
import type { BulkCalculatedData, BulkResult } from './bulkCalculation'

export type NextTierInfo =
  | { isMaxTier: false; nextTierName: string; nextTierRate: number;
      requiredPercentage: number; requiredSales: number; deficit: number }
  | { isMaxTier: true; currentRate: number; thresholdPercentage: number;
      thresholdSales: number; thresholdPool: number; extraIncentive: number }

export function nextBulkTierInfo(data: BulkCalculatedData | null, configuredTiers: readonly Tier[]): NextTierInfo | null {
  if (!data) return null
  const tiers = [...configuredTiers].sort((a,b)=>a.min-b.min)
  if (!tiers.length) return null
  const idx = tiers.findIndex(t=>t.id===data.tier.id)
  if (data.tier.rate===0) {
    const lowest=tiers[0]
    const req=(lowest.min/100)*data.target
    return {isMaxTier:false,nextTierName:lowest.name,nextTierRate:lowest.rate,requiredPercentage:lowest.min,requiredSales:req,deficit:req-data.teamSales}
  }
  if(idx>=0&&idx<tiers.length-1){
    const next=tiers[idx+1]
    const req=(next.min/100)*data.target
    return {isMaxTier:false,nextTierName:next.name,nextTierRate:next.rate,requiredPercentage:next.min,requiredSales:req,deficit:req-data.teamSales}
  }
  const hi=tiers[idx]??tiers[tiers.length-1]
  const thS=(hi.min/100)*data.target
  const thP=(hi.rate/100)*thS
  const acP=(hi.rate/100)*data.teamSales
  return {isMaxTier:true,currentRate:data.tier.rate,thresholdPercentage:hi.min,thresholdSales:thS,thresholdPool:thP,extraIncentive:acP-thP}
}

export interface CenterPerformanceRow {
  key: string
  label: string
  sales: number
  packages: number
  clients: number
  revenuePct: number
}

export function bulkCenterStats(
  results: readonly BulkResult[],
  data: BulkCalculatedData | null,
  staffCenters: Readonly<Record<string,string>>,
  centers: Readonly<Record<string,string>>,
  extractCode: (name:string)=>string|null
): {rows:CenterPerformanceRow[];unassigned:number}|null {
  if (!data) return null
  const totals: Record<string,{sales:number;packages:number;clients:number}>={}
  let unassigned=0
  for(const person of results){
    const code=extractCode(person.name)
    const center=code?staffCenters[code]:undefined
    if(!center){unassigned++;continue}
    if(!totals[center])totals[center]={sales:0,packages:0,clients:0}
    totals[center].sales+=person.sales
    totals[center].packages+=person.packages
    totals[center].clients+=person.clients??0
  }
  const teamSales=data.teamSales||1
  return { rows:Object.entries(centers).map(([key,label])=>({
    key,label,sales:totals[key]?.sales??0,packages:totals[key]?.packages??0,
    clients:totals[key]?.clients??0,
    revenuePct:((totals[key]?.sales??0)/teamSales)*100,
  })),unassigned }
}
