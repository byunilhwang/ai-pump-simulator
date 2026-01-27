/**
 * 과도 응답 시뮬레이션 모듈 (물리 기반 모델)
 * 
 * 참고 문헌:
 * - Zhang et al., "A theoretical model for predicting the startup performance of pumps as turbines", Scientific Reports (2024)
 * - Turkeri et al., "Reduced-order linearized dynamic model for induction motor-driven centrifugal fan-pump system", Scientific Reports (2025)
 * - Neutrium Engineering, "Estimation of Pump Moment of Inertia"
 * 
 * @see documents/project/03_backend_arch.md
 */

import { SIMULATION } from './constants';
import { calculateInverterPower, getValvePower } from './energy-calculations';

export type SimulationMode = 'fast' | 'stable' | 'smooth';

/**
 * 동적 시간상수 계산
 * 변화량과 목표 유량에 따라 시간상수를 조정
 * 
 * 물리적 근거:
 * - 변화량이 클수록 더 큰 관성 모멘트 극복 필요 (I × dω/dt = T_motor - T_load)
 * - 고유량에서 배관 저항 증가 (k_cl × Q²)
 * 
 * @param baseTimeConstant 기본 시간상수 (모드별)
 * @param startFlow 시작 유량 (m³/h)
 * @param targetFlow 목표 유량 (m³/h)
 */
export function calculateDynamicTimeConstant(
  baseTimeConstant: number,
  startFlow: number,
  targetFlow: number
): number {
  const { DYNAMIC_FACTORS, PHYSICS } = SIMULATION;
  const ratedFlow = PHYSICS.RATED_FLOW;
  
  // 변화량 (절대값)
  const delta = Math.abs(targetFlow - startFlow);
  
  // 목표 유량의 영향 (고유량에서 제어가 어려움)
  const targetRatio = Math.max(startFlow, targetFlow) / ratedFlow;
  
  // 동적 시간상수 계산
  // τ_adj = τ_base × (1 + k₁ × |Δ|/Q_rated) × (1 + k₂ × Q_target/Q_rated)
  const deltaFactor = 1 + DYNAMIC_FACTORS.TIME_CONSTANT_DELTA * (delta / ratedFlow);
  const targetFactor = 1 + DYNAMIC_FACTORS.TIME_CONSTANT_TARGET * targetRatio;
  
  return baseTimeConstant * deltaFactor * targetFactor;
}

/**
 * 동적 오버슈트 계산
 * 변화량과 목표 유량에 따라 오버슈트를 조정
 * 
 * 물리적 근거:
 * - 변화량이 클수록 관성에 의한 오버슈트 증가
 * - 감쇠비와 오버슈트 관계: %OS = 100 × exp(-ζπ/√(1-ζ²))
 * 
 * @param baseOvershoot 기본 오버슈트 (모드별, %)
 * @param startFlow 시작 유량 (m³/h)
 * @param targetFlow 목표 유량 (m³/h)
 */
export function calculateDynamicOvershoot(
  baseOvershoot: number,
  startFlow: number,
  targetFlow: number
): number {
  const { DYNAMIC_FACTORS, PHYSICS } = SIMULATION;
  const ratedFlow = PHYSICS.RATED_FLOW;
  
  // 기본 오버슈트가 0이면 항상 0 (임계 감쇠)
  if (baseOvershoot <= 0) return 0;
  
  // 변화량 (절대값)
  const delta = Math.abs(targetFlow - startFlow);
  
  // 목표 유량의 영향
  const targetRatio = targetFlow / ratedFlow;
  
  // 동적 오버슈트 계산
  // %OS_adj = %OS_base × (1 + k₃ × |Δ|/Q_rated) × (0.8 + k₄ × Q_target/Q_rated)
  const deltaFactor = 1 + DYNAMIC_FACTORS.OVERSHOOT_DELTA * (delta / ratedFlow);
  const targetFactor = 0.8 + DYNAMIC_FACTORS.OVERSHOOT_TARGET * targetRatio;
  
  return Math.min(baseOvershoot * deltaFactor * targetFactor, 30); // 최대 30%로 제한
}

/**
 * 감쇠비에서 오버슈트 계산
 * %OS = 100 × exp(-ζπ/√(1-ζ²))
 */
export function dampingRatioToOvershoot(zeta: number): number {
  if (zeta >= 1) return 0;
  return 100 * Math.exp(-zeta * Math.PI / Math.sqrt(1 - zeta * zeta));
}

/**
 * 오버슈트에서 감쇠비 계산 (역함수)
 */
export function overshootToDampingRatio(overshootPercent: number): number {
  if (overshootPercent <= 0) return 1;
  const os = overshootPercent / 100;
  const lnOs = Math.log(os);
  return Math.abs(lnOs) / Math.sqrt(Math.PI * Math.PI + lnOs * lnOs);
}

/**
 * 1차 시스템 스텝 응답
 * y(t) = y_target - (y_target - y_start) × e^(-t/τ)
 */
export function firstOrderResponse(
  targetValue: number,
  startValue: number,
  timeConstant: number,
  time: number
): number {
  return targetValue - (targetValue - startValue) * Math.exp(-time / timeConstant);
}

/**
 * 2차 시스템 스텝 응답 (물리 기반 모델)
 * 
 * 표준 2차 시스템 전달함수: G(s) = ωn² / (s² + 2ζωn×s + ωn²)
 * 스텝 응답: y(t) = 1 - (e^(-ζωn×t) / √(1-ζ²)) × sin(ωd×t + φ)
 * 
 * @param targetValue 목표값
 * @param startValue 시작값
 * @param timeConstant 시간상수 (τ = 1/(ζωn))
 * @param dampingRatio 감쇠비 (ζ)
 * @param time 시간 (초)
 */
export function secondOrderResponse(
  targetValue: number,
  startValue: number,
  timeConstant: number,
  overshootPercent: number,
  time: number
): number {
  const delta = targetValue - startValue;
  
  // 변화가 없으면 바로 반환
  if (Math.abs(delta) < 0.001) return targetValue;
  
  // 오버슈트가 없으면 1차 응답 사용 (임계 감쇠)
  if (overshootPercent <= 0) {
    return firstOrderResponse(targetValue, startValue, timeConstant, time);
  }
  
  // 오버슈트에서 감쇠비 계산
  const zeta = overshootToDampingRatio(overshootPercent);
  
  // 감쇠비가 1 이상이면 1차 응답
  if (zeta >= 1) {
    return firstOrderResponse(targetValue, startValue, timeConstant, time);
  }
  
  // 2차 시스템 파라미터
  // τ = 1/(ζωn) → ωn = 1/(ζτ)
  const zetaOmegaN = 1 / timeConstant;
  const omegaN = zetaOmegaN / zeta;
  const omegaD = omegaN * Math.sqrt(1 - zeta * zeta); // 감쇠 고유진동수
  const phi = Math.atan2(Math.sqrt(1 - zeta * zeta), zeta); // 위상각
  
  // 2차 시스템 스텝 응답
  // y(t) = y_final - (y_final - y_start) × (e^(-ζωn×t) / √(1-ζ²)) × sin(ωd×t + φ)
  const envelope = Math.exp(-zetaOmegaN * time);
  const oscillation = Math.sin(omegaD * time + phi) / Math.sqrt(1 - zeta * zeta);
  
  return targetValue - delta * envelope * oscillation;
}

/**
 * 과도 응답 시뮬레이션 (물리 기반 동적 파라미터)
 * 
 * 핵심 개선점:
 * - 시간상수가 변화량(|Δ|)과 목표 유량에 따라 동적으로 조정됨
 * - 오버슈트가 변화량과 목표 유량에 따라 동적으로 조정됨
 * - 실제 펌프 시스템의 관성 모멘트와 배관 저항 특성 반영
 */
export function simulateTransient(params: {
  startFlow: number;
  targetFlow: number;
  mode: SimulationMode;
  duration?: number;
  stepSize?: number;
}): {
  mode: SimulationMode;
  timeConstant: number;
  overshoot: number;
  timeSeries: { time: number; flow: number; power: number }[];
} {
  const duration = params.duration ?? SIMULATION.DEFAULT_DURATION;
  const stepSize = params.stepSize ?? SIMULATION.STEP_SIZE;
  
  // 모드별 기본 파라미터
  const baseTimeConstant = SIMULATION.TIME_CONSTANT[params.mode.toUpperCase() as keyof typeof SIMULATION.TIME_CONSTANT];
  const baseOvershoot = SIMULATION.OVERSHOOT[params.mode.toUpperCase() as keyof typeof SIMULATION.OVERSHOOT];
  
  // 동적 파라미터 계산 (물리 기반 모델)
  const timeConstant = calculateDynamicTimeConstant(
    baseTimeConstant,
    params.startFlow,
    params.targetFlow
  );
  
  const overshoot = calculateDynamicOvershoot(
    baseOvershoot,
    params.startFlow,
    params.targetFlow
  );
  
  const timeSeries: { time: number; flow: number; power: number }[] = [];
  
  // 시작 = 목표인 경우: 평평한 직선 반환
  if (Math.abs(params.startFlow - params.targetFlow) < 0.1) {
    for (let t = 0; t <= duration; t += stepSize) {
      const power = calculateInverterPower(Math.max(0, params.targetFlow));
      
      timeSeries.push({
        time: Math.round(t * 100) / 100,
        flow: Math.round(params.targetFlow * 100) / 100,
        power: Math.round(power * 100) / 100,
      });
    }
    
    return {
      mode: params.mode,
      timeConstant,
      overshoot: 0, // 변화 없으므로 오버슈트 0
      timeSeries,
    };
  }
  
  for (let t = 0; t <= duration; t += stepSize) {
    const flow = secondOrderResponse(
      params.targetFlow,
      params.startFlow,
      timeConstant,
      overshoot,
      t
    );
    
    // 유량에 따른 전력 계산 (인버터 기준)
    const power = calculateInverterPower(Math.max(0, flow));
    
    timeSeries.push({
      time: Math.round(t * 100) / 100,
      flow: Math.round(flow * 100) / 100,
      power: Math.round(power * 100) / 100,
    });
  }
  
  return {
    mode: params.mode,
    timeConstant: Math.round(timeConstant * 100) / 100,
    overshoot: Math.round(overshoot * 10) / 10,
    timeSeries,
  };
}

/**
 * Case A/B/C 과도 응답 비교 시뮬레이션 (물리 기반 동적 파라미터)
 * 
 * 각 케이스별 특성:
 * - Case A (밸브): 수동 조작, 느린 응답, 오버슈트 없음
 * - Case B (PID): 전통적 제어, 중간 응답, 중간 오버슈트
 * - Case C (AI): 최적화 제어, 빠른 응답, 최소 오버슈트
 */
export function simulateCaseComparison(params: {
  startFlow: number;
  targetFlow: number;
  duration?: number;
}): {
  caseA: { time: number; flow: number; power: number }[];
  caseB: { time: number; flow: number; power: number }[];
  caseC: { time: number; flow: number; power: number }[];
} {
  const duration = params.duration ?? SIMULATION.DEFAULT_DURATION;
  const stepSize = SIMULATION.STEP_SIZE;
  const { DYNAMIC_FACTORS, PHYSICS } = SIMULATION;
  const ratedFlow = PHYSICS.RATED_FLOW;
  
  const caseA: { time: number; flow: number; power: number }[] = [];
  const caseB: { time: number; flow: number; power: number }[] = [];
  const caseC: { time: number; flow: number; power: number }[] = [];
  
  // 변화량 계산
  const delta = Math.abs(params.targetFlow - params.startFlow);
  const deltaRatio = delta / ratedFlow;
  const targetRatio = Math.max(params.startFlow, params.targetFlow) / ratedFlow;
  
  // Case A: 밸브 방식 (수동, 느림, 오버슈트 없음)
  // 기본 시간상수 8초, 변화량에 따라 최대 12초까지 증가
  const tauA = 8 * (1 + 0.5 * deltaRatio);
  const osA = 0; // 수동 조작은 오버슈트 없음
  
  // Case B: PID 제어 (중간 응답, 중간 오버슈트)
  // 기본 시간상수 3초, 오버슈트 8%
  const tauB = 3 * (1 + DYNAMIC_FACTORS.TIME_CONSTANT_DELTA * deltaRatio) 
             * (1 + DYNAMIC_FACTORS.TIME_CONSTANT_TARGET * targetRatio);
  const osB = 8 * (1 + DYNAMIC_FACTORS.OVERSHOOT_DELTA * deltaRatio)
            * (0.8 + DYNAMIC_FACTORS.OVERSHOOT_TARGET * targetRatio);
  
  // Case C: AI 제어 (빠른 응답, 최소 오버슈트)
  // 기본 시간상수 1.5초, 오버슈트 3%
  const tauC = 1.5 * (1 + DYNAMIC_FACTORS.TIME_CONSTANT_DELTA * deltaRatio)
             * (1 + DYNAMIC_FACTORS.TIME_CONSTANT_TARGET * targetRatio);
  const osC = 3 * (1 + DYNAMIC_FACTORS.OVERSHOOT_DELTA * 0.5 * deltaRatio)
            * (0.8 + DYNAMIC_FACTORS.OVERSHOOT_TARGET * 0.5 * targetRatio);
  
  // 시작 = 목표인 경우: 모든 케이스에서 평평한 직선
  if (delta < 0.1) {
    for (let t = 0; t <= duration; t += stepSize) {
      const time = Math.round(t * 100) / 100;
      const flow = Math.round(params.targetFlow * 100) / 100;
      
      caseA.push({
        time,
        flow,
        power: Math.round(getValvePower(Math.max(0, params.targetFlow)) * 100) / 100,
      });
      
      caseB.push({
        time,
        flow,
        power: Math.round(calculateInverterPower(Math.max(0, params.targetFlow)) * 1.1 * 100) / 100,
      });
      
      caseC.push({
        time,
        flow,
        power: Math.round(calculateInverterPower(Math.max(0, params.targetFlow)) * 100) / 100,
      });
    }
    
    return { caseA, caseB, caseC };
  }
  
  for (let t = 0; t <= duration; t += stepSize) {
    const time = Math.round(t * 100) / 100;
    
    // Case A: 밸브 방식 (1차 응답)
    const flowA = firstOrderResponse(params.targetFlow, params.startFlow, tauA, t);
    caseA.push({
      time,
      flow: Math.round(flowA * 100) / 100,
      power: Math.round(getValvePower(Math.max(0, flowA)) * 100) / 100,
    });
    
    // Case B: PID 제어 (2차 응답)
    const flowB = secondOrderResponse(params.targetFlow, params.startFlow, tauB, osB, t);
    caseB.push({
      time,
      flow: Math.round(flowB * 100) / 100,
      power: Math.round(calculateInverterPower(Math.max(0, flowB)) * 1.1 * 100) / 100,
    });
    
    // Case C: AI 제어 (2차 응답, 최적화)
    const flowC = secondOrderResponse(params.targetFlow, params.startFlow, tauC, osC, t);
    caseC.push({
      time,
      flow: Math.round(flowC * 100) / 100,
      power: Math.round(calculateInverterPower(Math.max(0, flowC)) * 100) / 100,
    });
  }
  
  return { caseA, caseB, caseC };
}
