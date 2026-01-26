/**
 * CSV 파싱 유틸리티
 */

import Papa from 'papaparse';
import fs from 'fs';
import path from 'path';

export interface PumpDataRow {
  No: number;
  DataTime: string;
  MilliSec: number;
  Main_Flow: number;
  IN_PT050: number;
  OUT_PT050: number;
  PT03: number;
  LT01: number;
  TT01: number;
  TT050: number;
  Rpm: number;
  Main_VAC: number;
  Main_A: number;
  Main_kW: number;
  Main_Var: number;
  Main_Vp: number;
  Main_Ap: number;
  Main_Bp: number;
  Main_Cp: number;
  Main_PF: number;
  Main_Hz: number;
  Main_Va: number;
  Main_Vb: number;
  Main_Vc: number;
  Main_Aa: number;
  Main_Ab: number;
  Main_Ac: number;
  Main_Vab: number;
  Main_Vbc: number;
  Main_Vca: number;
}

/**
 * CSV 파일 파싱
 */
export function parseCSVFile(filePath: string): PumpDataRow[] {
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  const result = Papa.parse<PumpDataRow>(fileContent, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  });
  
  return result.data;
}

/**
 * 2026년 데이터 폴더의 모든 CSV 파일 목록
 */
export function getCSVFileList(): string[] {
  const dataDir = path.join(process.cwd(), 'data', '2026');
  
  if (!fs.existsSync(dataDir)) {
    return [];
  }
  
  return fs.readdirSync(dataDir)
    .filter(file => file.endsWith('.csv'))
    .sort();
}

/**
 * 특정 파일 데이터 로드
 */
export function loadCSVData(filename: string): PumpDataRow[] {
  const filePath = path.join(process.cwd(), 'data', '2026', filename);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filename}`);
  }
  
  return parseCSVFile(filePath);
}

/**
 * 모든 2026년 데이터 로드
 */
export function loadAllCSVData(): { filename: string; data: PumpDataRow[] }[] {
  const files = getCSVFileList();
  
  return files.map(filename => ({
    filename,
    data: loadCSVData(filename),
  }));
}

/**
 * 데이터 통계 계산
 */
export function calculateDataStats(data: PumpDataRow[]): {
  count: number;
  avgFlow: number;
  avgPower: number;
  avgPressure: number;
  avgPowerFactor: number;
  minFlow: number;
  maxFlow: number;
  minPower: number;
  maxPower: number;
} {
  if (data.length === 0) {
    return {
      count: 0,
      avgFlow: 0,
      avgPower: 0,
      avgPressure: 0,
      avgPowerFactor: 0,
      minFlow: 0,
      maxFlow: 0,
      minPower: 0,
      maxPower: 0,
    };
  }
  
  const flows = data.map(d => d.Main_Flow).filter(v => !isNaN(v));
  const powers = data.map(d => d.Main_kW).filter(v => !isNaN(v));
  const pressures = data.map(d => d.OUT_PT050).filter(v => !isNaN(v));
  const powerFactors = data.map(d => d.Main_PF).filter(v => !isNaN(v));
  
  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  
  return {
    count: data.length,
    avgFlow: avg(flows),
    avgPower: avg(powers),
    avgPressure: avg(pressures),
    avgPowerFactor: avg(powerFactors),
    minFlow: Math.min(...flows),
    maxFlow: Math.max(...flows),
    minPower: Math.min(...powers),
    maxPower: Math.max(...powers),
  };
}

/**
 * 운전점별 평균 데이터 계산 (시동 돌입전류 제외)
 */
export function calculateOperatingPointAverages(data: PumpDataRow[]): {
  flow: number;
  power: number;
  outletPressure: number;
  inletPressure: number;
  powerFactor: number;
  voltage: number;
  current: number;
} {
  // 시동 돌입전류 제외 (전류 > 30A 또는 전력 > 20kW)
  const filteredData = data.filter(d => 
    d.Main_A < 30 && d.Main_kW < 20 && d.Main_kW > 0
  );
  
  if (filteredData.length === 0) {
    return {
      flow: 0,
      power: 0,
      outletPressure: 0,
      inletPressure: 0,
      powerFactor: 0,
      voltage: 0,
      current: 0,
    };
  }
  
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  
  return {
    flow: avg(filteredData.map(d => d.Main_Flow)),
    power: avg(filteredData.map(d => d.Main_kW)),
    outletPressure: avg(filteredData.map(d => d.OUT_PT050)),
    inletPressure: avg(filteredData.map(d => d.IN_PT050)),
    powerFactor: avg(filteredData.map(d => d.Main_PF)),
    voltage: avg(filteredData.map(d => d.Main_VAC)),
    current: avg(filteredData.map(d => d.Main_A)),
  };
}
