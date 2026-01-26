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
 * Q-H 곡선 데이터 생성
 * 2차 다항식 피팅: H = a×Q² + b×Q + c
 */
export function generateQHCurve(
  operatingPoints: { flow: number; head: number }[],
  steps: number = 50
): { flow: number; head: number }[] {
  if (operatingPoints.length < 3) return operatingPoints;
  
  // 최소제곱법으로 2차 다항식 계수 추정 (간단한 구현)
  // 실제로는 더 정교한 피팅이 필요할 수 있음
  const maxFlow = Math.max(...operatingPoints.map(p => p.flow));
  const maxHead = Math.max(...operatingPoints.map(p => p.head));
  
  // 단순 보간으로 곡선 생성
  const curve: { flow: number; head: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const flow = (maxFlow / steps) * i;
    // 2차 함수 근사: H = H_max × (1 - (Q/Q_max)²)
    const head = maxHead * (1 - Math.pow(flow / maxFlow, 2) * 0.3);
    curve.push({ flow, head: Math.max(head, 0) });
  }
  
  return curve;
}
