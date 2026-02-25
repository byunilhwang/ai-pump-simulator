/**
 * 펌프 공학 계산 모듈
 * @see documents/project/03_backend_arch.md
 * @see documents/project/99_glossary.md
 */

import { PHYSICS } from './constants';

/**
 * 양정 계산 (압력 → 수두)
 * H = (P_out - P_in) × 10.197
 * 
 * @param outletPressure - 펌프 출구 압력 (bar)
 * @param inletPressure - 펌프 입구 압력 (bar)
 * @returns 양정 (m)
 */
export function calculateHead(
  outletPressure: number,
  inletPressure: number = 0
): number {
  return (outletPressure - inletPressure) * PHYSICS.BAR_TO_METER;
}

/**
 * 수력(유체동력) 계산
 * P_hydraulic = ρ × g × Q × H / 3600 / 1000
 * 
 * @param flow - 유량 (m³/h)
 * @param head - 양정 (m)
 * @returns 수력 (kW)
 */
export function calculateHydraulicPower(
  flow: number,
  head: number
): number {
  // Q: m³/h → m³/s (÷3600)
  // P = ρgQH / 1000 (W → kW)
  return (PHYSICS.WATER_DENSITY * PHYSICS.GRAVITY * flow * head) / 3600 / 1000;
}

/**
 * 펌프 효율 계산
 * η = P_hydraulic / P_input × 100
 * 
 * @param flow - 유량 (m³/h)
 * @param head - 양정 (m)
 * @param inputPower - 입력 전력 (kW)
 * @returns 효율 (%)
 */
export function calculateEfficiency(
  flow: number,
  head: number,
  inputPower: number
): number {
  if (inputPower <= 0 || flow <= 0) return 0;
  
  const hydraulicPower = calculateHydraulicPower(flow, head);
  const efficiency = (hydraulicPower / inputPower) * 100;
  
  // 효율은 0~100% 범위로 제한
  return Math.min(Math.max(efficiency, 0), 100);
}

/**
 * 운전점 데이터 계산
 * 실측 데이터에서 양정, 수력, 효율을 계산
 */
export function calculateOperatingPoint(data: {
  flow: number;
  outletPressure: number;
  inletPressure: number;
  power: number;
  powerFactor: number;
}): {
  flow: number;
  head: number;
  hydraulicPower: number;
  inputPower: number;
  efficiency: number;
  powerFactor: number;
} {
  const head = calculateHead(data.outletPressure, data.inletPressure);
  const hydraulicPower = calculateHydraulicPower(data.flow, head);
  const efficiency = calculateEfficiency(data.flow, head, data.power);
  
  return {
    flow: data.flow,
    head,
    hydraulicPower,
    inputPower: data.power,
    efficiency,
    powerFactor: data.powerFactor,
  };
}

/**
 * 2차 다항식 최소자승법 피팅 (가우스 소거법)
 * H(Q) = a × Q² + b × Q + c
 * 
 * @param points - (유량, 양정) 데이터 포인트
 * @returns 계수 a, b, c와 R²
 */
export function fitQuadraticCurve(
  points: { flow: number; head: number }[]
): { a: number; b: number; c: number; r2: number } {
  const n = points.length;
  if (n < 3) {
    return { a: 0, b: 0, c: points[0]?.head || 0, r2: 0 };
  }

  // 정규 방정식 행렬 구성
  let s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0;
  let t0 = 0, t1 = 0, t2 = 0;

  for (const p of points) {
    const x = p.flow;
    const y = p.head;
    s0 += 1;
    s1 += x;
    s2 += x * x;
    s3 += x * x * x;
    s4 += x * x * x * x;
    t0 += y;
    t1 += x * y;
    t2 += x * x * y;
  }

  // 가우스 소거법으로 풀기
  const A = [
    [s4, s3, s2, t2],
    [s3, s2, s1, t1],
    [s2, s1, s0, t0],
  ];

  for (let i = 0; i < 3; i++) {
    let maxRow = i;
    for (let k = i + 1; k < 3; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k;
      }
    }
    [A[i], A[maxRow]] = [A[maxRow], A[i]];

    if (Math.abs(A[i][i]) < 1e-10) {
      return { a: 0, b: 0, c: t0 / n, r2: 0 };
    }

    for (let k = i + 1; k < 3; k++) {
      const factor = A[k][i] / A[i][i];
      for (let j = i; j < 4; j++) {
        A[k][j] -= factor * A[i][j];
      }
    }
  }

  const x = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    x[i] = A[i][3];
    for (let j = i + 1; j < 3; j++) {
      x[i] -= A[i][j] * x[j];
    }
    x[i] /= A[i][i];
  }

  const [a, b, c] = x;

  // R² 계산
  const meanY = t0 / n;
  let ssTot = 0, ssRes = 0;
  for (const p of points) {
    const predicted = a * p.flow * p.flow + b * p.flow + c;
    ssTot += (p.head - meanY) ** 2;
    ssRes += (p.head - predicted) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { a, b, c, r2 };
}

/**
 * Q-H 곡선 데이터 생성 (펌프 곡선)
 * 최소자승법 2차 다항식 피팅: H = a×Q² + b×Q + c
 * 
 * @param operatingPoints - 운전점 데이터
 * @param steps - 곡선 데이터 포인트 수
 * @returns 연속 곡선 데이터
 */
export function generateQHCurve(
  operatingPoints: { flow: number; head: number }[],
  steps: number = 50
): { flow: number; head: number }[] {
  if (operatingPoints.length < 3) return operatingPoints;
  
  // 2차 다항식 피팅
  const { a, b, c } = fitQuadraticCurve(operatingPoints);
  
  const maxFlow = Math.max(...operatingPoints.map(p => p.flow));
  
  // 피팅된 곡선으로 데이터 생성 (최대 유량까지만)
  const curve: { flow: number; head: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const flow = (maxFlow / steps) * i;
    const head = a * flow * flow + b * flow + c;
    curve.push({ 
      flow: Math.round(flow * 100) / 100, 
      head: Math.round(Math.max(head, 0) * 100) / 100 
    });
  }
  
  return curve;
}

/**
 * 시스템 곡선 추정 (Phase 2)
 * H_system = H_static + k × Q²
 * 
 * 최소자승법으로 H_static과 k를 추정
 * 
 * @param dataPoints - (유량, 양정) 데이터 포인트
 * @returns 시스템 곡선 파라미터
 */
export function estimateSystemCurve(
  dataPoints: { flow: number; head: number }[]
): { 
  staticHead: number; 
  resistanceCoeff: number; 
  formula: string;
  r2: number;
} {
  if (dataPoints.length < 3) {
    return {
      staticHead: 0,
      resistanceCoeff: 0.1,
      formula: 'H = 0 + 0.1 × Q²',
      r2: 0,
    };
  }
  
  // 유량 0인 포인트 제외 (나눗셈 오류 방지)
  const validPoints = dataPoints.filter(p => p.flow > 0);
  
  if (validPoints.length < 2) {
    return {
      staticHead: dataPoints[0]?.head || 0,
      resistanceCoeff: 0.1,
      formula: `H = ${dataPoints[0]?.head || 0} + 0.1 × Q²`,
      r2: 0,
    };
  }
  
  // 선형 회귀: H = H_static + k × Q²
  // Y = a + b × X 형태로 변환 (X = Q², Y = H)
  const n = validPoints.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (const p of validPoints) {
    const x = p.flow * p.flow;  // Q²
    const y = p.head;
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumX2 += x * x;
  }
  
  // 최소자승법
  const denominator = n * sumX2 - sumX * sumX;
  if (Math.abs(denominator) < 1e-10) {
    return {
      staticHead: sumY / n,
      resistanceCoeff: 0,
      formula: `H = ${(sumY / n).toFixed(1)}`,
      r2: 0,
    };
  }
  
  const k = (n * sumXY - sumX * sumY) / denominator;  // 저항 계수
  const staticHead = (sumY - k * sumX) / n;           // 정압
  
  // R² 계산
  const meanY = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (const p of validPoints) {
    const x = p.flow * p.flow;
    const predicted = staticHead + k * x;
    ssTot += (p.head - meanY) ** 2;
    ssRes += (p.head - predicted) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  
  return {
    staticHead: Math.round(staticHead * 100) / 100,
    resistanceCoeff: Math.round(k * 10000) / 10000,
    formula: `H = ${staticHead.toFixed(1)} + ${k.toFixed(4)} × Q²`,
    r2: Math.round(r2 * 1000) / 1000,
  };
}

/**
 * 시스템 곡선 데이터 생성 (Phase 2)
 * 
 * @param staticHead - 정압 (m)
 * @param resistanceCoeff - 저항 계수
 * @param maxFlow - 최대 유량 (m³/h)
 * @param steps - 데이터 포인트 수
 * @returns 시스템 곡선 데이터
 */
export function generateSystemCurve(
  staticHead: number,
  resistanceCoeff: number,
  maxFlow: number = 25,
  steps: number = 50
): { flow: number; head: number }[] {
  const curve: { flow: number; head: number }[] = [];
  
  for (let i = 0; i <= steps; i++) {
    const flow = (maxFlow / steps) * i;
    const head = staticHead + resistanceCoeff * flow * flow;
    curve.push({ 
      flow: Math.round(flow * 100) / 100, 
      head: Math.round(head * 100) / 100 
    });
  }
  
  return curve;
}

/**
 * 운전점 찾기: 펌프 곡선과 시스템 곡선의 교점 (Phase 2)
 * 
 * @param pumpCurve - 펌프 Q-H 곡선
 * @param systemCurve - 시스템 곡선
 * @returns 운전점 (교점)
 */
export function findOperatingPoint(
  pumpCurve: { flow: number; head: number }[],
  systemCurve: { flow: number; head: number }[]
): { flow: number; head: number } | null {
  if (pumpCurve.length < 2 || systemCurve.length < 2) return null;
  
  // 두 곡선의 차이가 부호가 바뀌는 지점 찾기
  for (let i = 1; i < pumpCurve.length; i++) {
    const pumpH1 = pumpCurve[i - 1].head;
    const pumpH2 = pumpCurve[i].head;
    
    // 같은 유량에서의 시스템 양정 찾기
    const sysIdx = systemCurve.findIndex(s => s.flow >= pumpCurve[i - 1].flow);
    if (sysIdx < 0 || sysIdx >= systemCurve.length) continue;
    
    const sysH1 = systemCurve[Math.max(0, sysIdx - 1)]?.head || 0;
    const sysH2 = systemCurve[sysIdx]?.head || 0;
    
    const diff1 = pumpH1 - sysH1;
    const diff2 = pumpH2 - sysH2;
    
    // 부호가 바뀌면 교점
    if (diff1 * diff2 <= 0) {
      // 선형 보간으로 교점 추정
      const t = Math.abs(diff1) / (Math.abs(diff1) + Math.abs(diff2));
      const flow = pumpCurve[i - 1].flow + t * (pumpCurve[i].flow - pumpCurve[i - 1].flow);
      const head = pumpH1 + t * (pumpH2 - pumpH1);
      
      return {
        flow: Math.round(flow * 100) / 100,
        head: Math.round(head * 100) / 100,
      };
    }
  }
  
  return null;
}
