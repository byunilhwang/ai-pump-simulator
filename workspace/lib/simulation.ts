/**
 * 과도 응답 시뮬레이션 모듈
 * @see documents/project/03_backend_arch.md
 */

import { SIMULATION } from './constants';
import { calculateInverterPower, getValvePower } from './energy-calculations';

export type SimulationMode = 'fast' | 'stable' | 'smooth';

/**
 * 1차 시스템 스텝 응답
 * y(t) = y_target × (1 - e^(-t/τ))
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
 * 2차 시스템 스텝 응답 (오버슈트 포함)
 * 감쇠비(ζ)에 따른 응답 특성 모델링
 */
export function secondOrderResponse(
  targetValue: number,
  startValue: number,
  timeConstant: number,
  overshootPercent: number,
  time: number
): number {
  const baseResponse = firstOrderResponse(targetValue, startValue, timeConstant, time);
  
  if (overshootPercent <= 0) return baseResponse;
  
  // 오버슈트를 감쇠 진동으로 모델링
  const dampingRatio = 0.5; // 감쇠비
  const naturalFreq = 1 / timeConstant;
  const dampedFreq = naturalFreq * Math.sqrt(1 - dampingRatio * dampingRatio);
  
  const overshootFactor = (overshootPercent / 100) * Math.abs(targetValue - startValue);
  const oscillation = overshootFactor * Math.exp(-dampingRatio * naturalFreq * time) 
    * Math.sin(dampedFreq * time * 2 * Math.PI);
  
  return baseResponse + oscillation;
}

/**
 * 과도 응답 시뮬레이션
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
  
  // 모드별 파라미터
  const timeConstant = SIMULATION.TIME_CONSTANT[params.mode.toUpperCase() as keyof typeof SIMULATION.TIME_CONSTANT];
  const overshoot = SIMULATION.OVERSHOOT[params.mode.toUpperCase() as keyof typeof SIMULATION.OVERSHOOT];
  
  const timeSeries: { time: number; flow: number; power: number }[] = [];
  
  // 시작 = 목표인 경우: 평평한 직선 반환
  if (params.startFlow === params.targetFlow) {
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
    timeConstant,
    overshoot,
    timeSeries,
  };
}

/**
 * Case A/B/C 과도 응답 비교 시뮬레이션
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
  
  const caseA: { time: number; flow: number; power: number }[] = [];
  const caseB: { time: number; flow: number; power: number }[] = [];
  const caseC: { time: number; flow: number; power: number }[] = [];
  
  // 시작 = 목표인 경우: 모든 케이스에서 평평한 직선
  if (params.startFlow === params.targetFlow) {
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
    
    // Case A: 밸브 방식 (느린 응답, 오버슈트 없음)
    const flowA = firstOrderResponse(params.targetFlow, params.startFlow, 8, t);
    caseA.push({
      time,
      flow: Math.round(flowA * 100) / 100,
      power: Math.round(getValvePower(Math.max(0, flowA)) * 100) / 100,
    });
    
    // Case B: PID 제어 (중간 응답, 약간의 오버슈트)
    const flowB = secondOrderResponse(params.targetFlow, params.startFlow, 3, 8, t);
    caseB.push({
      time,
      flow: Math.round(flowB * 100) / 100,
      power: Math.round(calculateInverterPower(Math.max(0, flowB)) * 1.1 * 100) / 100,
    });
    
    // Case C: AI 제어 (빠른 응답, 최소 오버슈트)
    const flowC = secondOrderResponse(params.targetFlow, params.startFlow, 1.5, 3, t);
    caseC.push({
      time,
      flow: Math.round(flowC * 100) / 100,
      power: Math.round(calculateInverterPower(Math.max(0, flowC)) * 100) / 100,
    });
  }
  
  return { caseA, caseB, caseC };
}
