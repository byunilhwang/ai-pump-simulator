/**
 * 에너지 및 전력 계산 모듈
 * @see documents/project/03_backend_arch.md
 * 
 * 핵심 원칙: 항상 Case A > Case B > Case C 전력 소비를 보장
 * - Case A: 밸브 교축 (기준, 가장 비효율)
 * - Case B: 인버터 + PID (Case A 대비 1~2% 절감)
 * - Case C: 인버터 + AI (Case A 대비 2~3% 절감, Case B보다 항상 좋음)
 */

import { ELECTRICITY, VALVE_STAGES } from './constants';

/**
 * 인버터 전력 모델링 상수
 * 
 * 공학적 모델:
 * - 인버터 방식은 상사법칙 P ∝ Q³ 적용
 * - 정격에서도 밸브보다 효율적 (최소 절감율 보장)
 * - 부분 부하에서 절감 효과 극대화
 * 
 * P_fixed: 유량과 무관한 고정 손실
 * - 모터 철손 (Iron Loss)
 * - 베어링/마찰 손실
 * - 인버터 대기 전력
 * - 제어 회로
 */
const POWER_MODEL = {
  // 고정 손실 (유량 0에서도 발생)
  FIXED_LOSS_AI: 1.22,    // Case C: AI 제어 (효율적 대기 모드)
  FIXED_LOSS_PID: 1.47,   // Case B: PID 제어 (제어 오버헤드 +0.25kW)
  
  // 정격 유량
  RATED_FLOW: 25,
  
  // 최소 절감율 (정격 기준, Case A 대비)
  // 이 값들은 항상 Case A > Case B > Case C를 보장
  MIN_SAVING_AI: 0.02,    // Case C: 최소 2% 절감
  MIN_SAVING_PID: 0.01,   // Case B: 최소 1% 절감
};

/**
 * 밸브 방식 전력 조회
 * 실측 데이터 기반 보간
 * 
 * @param targetFlow - 목표 유량 (m³/h)
 * @returns 밸브 방식 전력 (kW)
 */
export function getValvePower(targetFlow: number): number {
  if (targetFlow <= 0) return VALVE_STAGES[0].power;
  
  // 가장 가까운 두 운전점 찾기
  const stages = VALVE_STAGES;
  
  for (let i = 0; i < stages.length - 1; i++) {
    if (targetFlow >= stages[i].flow && targetFlow <= stages[i + 1].flow) {
      // 선형 보간
      const ratio = (targetFlow - stages[i].flow) / (stages[i + 1].flow - stages[i].flow);
      return stages[i].power + ratio * (stages[i + 1].power - stages[i].power);
    }
  }
  
  // 범위 초과 시 마지막 값 반환
  return stages[stages.length - 1].power;
}

/**
 * 인버터 전력 계산 (AI 제어) - 상사법칙 + 고정손실
 * 
 * 핵심: 항상 밸브 전력보다 낮음 (최소 MIN_SAVING_AI% 절감 보장)
 * 
 * @param targetFlow - 목표 유량 (m³/h)
 * @returns 인버터 전력 (kW)
 */
export function calculateInverterPower(
  targetFlow: number,
  ratedFlow: number = POWER_MODEL.RATED_FLOW,
  fixedLoss: number = POWER_MODEL.FIXED_LOSS_AI
): number {
  if (targetFlow <= 0) return fixedLoss;
  
  const valvePower = getValvePower(targetFlow);
  
  // 상사법칙 기반 이론 전력
  const flowRatio = Math.min(targetFlow / ratedFlow, 1);
  const ratedValvePower = getValvePower(ratedFlow);
  
  // 상사법칙 전력 = 고정손실 + (정격전력 - 고정손실) × (유량비)³
  const theoreticalPower = fixedLoss + (ratedValvePower - fixedLoss) * Math.pow(flowRatio, 3);
  
  // 최대 전력 제한: 밸브 전력의 (1 - MIN_SAVING_AI)
  const maxAllowedPower = valvePower * (1 - POWER_MODEL.MIN_SAVING_AI);
  
  // 이론 전력과 최대 허용 전력 중 작은 값 사용
  return Math.min(theoreticalPower, maxAllowedPower);
}

/**
 * PID 제어 전력 계산
 * AI보다 약간 높음 (PID 튜닝 오버헤드)
 * 
 * 핵심: 밸브 < PID < AI 순서 보장
 * - 밸브보다 항상 낮음 (최소 MIN_SAVING_PID% 절감)
 * - AI보다 항상 높음
 */
export function calculatePIDPower(
  targetFlow: number,
  ratedFlow: number = POWER_MODEL.RATED_FLOW
): number {
  if (targetFlow <= 0) return POWER_MODEL.FIXED_LOSS_PID;
  
  const valvePower = getValvePower(targetFlow);
  const aiPower = calculateInverterPower(targetFlow, ratedFlow, POWER_MODEL.FIXED_LOSS_AI);
  
  // PID 전력 범위:
  // - 상한: 밸브 전력의 (1 - MIN_SAVING_PID)
  // - 하한: AI 전력보다 약간 높음
  const maxAllowedPower = valvePower * (1 - POWER_MODEL.MIN_SAVING_PID);
  
  // AI 전력과 최대 허용 전력의 중간값 (AI에 가중치 0.4, 최대허용에 0.6)
  // 이렇게 하면 AI보다 항상 높고, 밸브보다 항상 낮음
  const pidPower = aiPower * 0.4 + maxAllowedPower * 0.6;
  
  // 최소 고정손실 보장
  return Math.max(pidPower, POWER_MODEL.FIXED_LOSS_PID);
}

/**
 * 에너지 절감량 계산
 * 
 * @param targetFlow - 목표 유량 (m³/h)
 * @returns 절감 정보
 */
export function calculateEnergySaving(targetFlow: number): {
  valvePower: number;
  inverterPower: number;
  pidPower: number;
  savingPower: number;
  savingPercent: number;
  pidSavingPercent: number;
} {
  const valvePower = getValvePower(targetFlow);
  const inverterPower = calculateInverterPower(targetFlow);
  const pidPower = calculatePIDPower(targetFlow);
  const savingPower = valvePower - inverterPower;
  const savingPercent = valvePower > 0 ? (savingPower / valvePower) * 100 : 0;
  const pidSavingPower = valvePower - pidPower;
  const pidSavingPercent = valvePower > 0 ? (pidSavingPower / valvePower) * 100 : 0;
  
  return {
    valvePower,
    inverterPower,
    pidPower,
    savingPower,
    savingPercent,
    pidSavingPercent,
  };
}

/**
 * ROI (투자 회수 기간) 계산
 */
export function calculateROI(params: {
  inverterCost: number;      // 인버터 도입 비용 (원)
  dailyRunHours: number;     // 일일 운전 시간 (시간)
  yearlyDays: number;        // 연간 운전 일수 (일)
  targetFlow: number;        // 목표 유량 (m³/h)
  electricityRate?: number;  // 전기요금 (원/kWh)
}): {
  valvePower: number;
  inverterPower: number;
  dailySavingKWh: number;
  yearlySavingKWh: number;
  yearlySavingKRW: number;
  roiYears: number | null;   // null = 계산 불가 (절감량 없음)
  roiMonths: number | null;
  fiveYearSaving: number;
  tenYearSaving: number;
} {
  const rate = params.electricityRate ?? ELECTRICITY.RATE_KRW_PER_KWH;
  const { valvePower, inverterPower, savingPower } = calculateEnergySaving(params.targetFlow);
  
  const dailySavingKWh = savingPower * params.dailyRunHours;
  const yearlySavingKWh = dailySavingKWh * params.yearlyDays;
  const yearlySavingKRW = yearlySavingKWh * rate;
  
  // 절감량이 0 이하면 ROI 계산 불가
  let roiYears: number | null = null;
  let roiMonths: number | null = null;
  
  if (yearlySavingKRW > 0) {
    roiYears = params.inverterCost / yearlySavingKRW;
    roiMonths = roiYears * 12;
  }
  
  return {
    valvePower,
    inverterPower,
    dailySavingKWh,
    yearlySavingKWh,
    yearlySavingKRW,
    roiYears,
    roiMonths,
    fiveYearSaving: yearlySavingKRW * 5 - params.inverterCost,
    tenYearSaving: yearlySavingKRW * 10 - params.inverterCost,
  };
}

/**
 * Case A/B/C 비교 데이터 생성
 */
export function generateCaseComparison(targetFlow: number): {
  caseA: { name: string; power: number; description: string };
  caseB: { name: string; power: number; description: string };
  caseC: { name: string; power: number; description: string };
  savingBvsA: number;
  savingCvsA: number;
} {
  const valvePower = getValvePower(targetFlow);
  const inverterPower = calculateInverterPower(targetFlow);
  const pidPower = calculatePIDPower(targetFlow);
  
  return {
    caseA: {
      name: 'Case A: 밸브 교축',
      power: valvePower,
      description: '인버터 미적용, 정속 운전',
    },
    caseB: {
      name: 'Case B: 인버터 + PID',
      power: pidPower,
      description: '인버터 적용, PID 제어',
    },
    caseC: {
      name: 'Case C: 인버터 + AI',
      power: inverterPower,
      description: '인버터 적용, 최적 제어 (모사)',
    },
    savingBvsA: valvePower > 0 ? ((valvePower - pidPower) / valvePower) * 100 : 0,
    savingCvsA: valvePower > 0 ? ((valvePower - inverterPower) / valvePower) * 100 : 0,
  };
}
