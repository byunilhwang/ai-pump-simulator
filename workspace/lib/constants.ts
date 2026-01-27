/**
 * 상수 정의
 * @see documents/project/99_glossary.md
 */

// 물리 상수
export const PHYSICS = {
  WATER_DENSITY: 1000,      // kg/m³ (물의 밀도)
  GRAVITY: 9.81,            // m/s² (중력 가속도)
  BAR_TO_METER: 10.197,     // 1 bar = 10.197 m (물 기준 압력-수두 변환)
} as const;

// 전기 상수
export const ELECTRICITY = {
  VOLTAGE: 440,             // V (산업용 고압)
  FREQUENCY: 60,            // Hz (한국 전력 주파수)
  RATE_KRW_PER_KWH: 95,     // 원/kWh (고압 A 평균)
} as const;

// 펌프 정격 (2026년 데이터 기준)
export const PUMP_RATED = {
  FLOW: 25,                 // m³/h (정격 유량, 6단계)
  POWER: 13.6,              // kW (정격 전력)
  HEAD: 118,                // m (추정 정격 양정)
} as const;

// 밸브 단계 매핑
export const VALVE_STAGES = [
  { stage: 0, angle: 0,   flow: 0,    power: 5.5,  pressure: 16.0, efficiency: 0 },
  { stage: 1, angle: 45,  flow: 5,    power: 7.5,  pressure: 16.0, efficiency: 32 },
  { stage: 2, angle: 90,  flow: 11,   power: 10.4, pressure: 15.7, efficiency: 45 },
  { stage: 3, angle: 135, flow: 15,   power: 11.9, pressure: 15.0, efficiency: 52 },
  { stage: 4, angle: 180, flow: 18,   power: 12.5, pressure: 13.0, efficiency: 55 },
  { stage: 5, angle: 225, flow: 21,   power: 13.2, pressure: 12.0, efficiency: 57 },
  { stage: 6, angle: 270, flow: 25,   power: 13.6, pressure: 11.6, efficiency: 58 },
] as const;

/**
 * 효율 관련 상수
 * @see DOE "Improving Pumping System Performance" (2006)
 * @see ABB Technical Note 013
 * @see ORNL "Variable-Speed Pump Efficiency Calculation" (2020)
 */
export const EFFICIENCY = {
  // VFD 드라이브 효율 (ABB Technical Note 013 기준)
  VFD_DRIVE: 0.97,
  
  // 모터 부분 부하 효율 (DOE Motors Handbook 기준)
  // 부하율별 효율 (0-100%)
  MOTOR_EFFICIENCY: {
    LOAD_100: 0.92,  // 100% 부하
    LOAD_75: 0.93,   // 75% 부하 (최고 효율)
    LOAD_50: 0.90,   // 50% 부하
    LOAD_25: 0.85,   // 25% 부하
    LOAD_MIN: 0.75,  // 최소 부하 (<25%)
  },
  
  // 펌프 효율 저하 (ORNL 기준)
  // 속도비 66.7% 미만에서 최대 5.4% 저하
  PUMP_EFFICIENCY_DROP: 0.054,
  PUMP_SPEED_THRESHOLD: 0.667,
  
  // PID vs AI 제어 효율 차이
  // Nature Scientific Reports (2024) 기준
  // PID: 5-8% 절감, AI: 10-30% 절감 → 보수적으로 5% 차이
  PID_OVERHEAD: 1.05,
} as const;

/**
 * 최소/최대 운전 범위
 */
export const OPERATING_LIMITS = {
  MIN_FLOW: 0,       // 최소 유량 (m³/h) - 시뮬레이션 허용
  MAX_FLOW: 25,      // 최대 유량 (m³/h)
  MIN_SAVING: 0.02,  // 최소 절감율 (정격 기준)
} as const;

/**
 * 시뮬레이션 파라미터
 * 
 * 물리 기반 모델 참고 문헌:
 * @see Zhang et al., "A theoretical model for predicting the startup performance of pumps as turbines", Scientific Reports (2024)
 * @see Turkeri & Kiselychnyk, "Reduced-order linearized dynamic model for induction motor-driven centrifugal fan-pump system", Scientific Reports (2025)
 * @see Neutrium Engineering, "Estimation of Pump Moment of Inertia"
 */
export const SIMULATION = {
  // 기본 시간 상수 (초) - 제어 모드별
  TIME_CONSTANT: {
    FAST: 1.5,      // 빠른 응답 (고게인 제어)
    STABLE: 3.0,    // 안정적 응답 (균형)
    SMOOTH: 5.0,    // 부드러운 응답 (저게인 제어)
  },
  
  // 기본 감쇠비 (ζ) - 제어 모드별
  // 오버슈트: %OS = 100 × exp(-ζπ/√(1-ζ²))
  DAMPING_RATIO: {
    FAST: 0.5,      // ζ=0.5 → %OS≈16.3%
    STABLE: 0.7,    // ζ=0.7 → %OS≈4.6%
    SMOOTH: 1.0,    // ζ=1.0 → %OS=0% (임계 감쇠)
  },
  
  // 기본 오버슈트 (%) - 감쇠비로부터 유도
  OVERSHOOT: {
    FAST: 15,
    STABLE: 5,
    SMOOTH: 0,
  },
  
  // 물리 기반 동적 파라미터 조정 계수
  // 변화량과 목표 유량에 따른 응답 특성 변화 반영
  DYNAMIC_FACTORS: {
    // 시간상수 변화량 계수 (k₁)
    // τ_adj = τ_base × (1 + k₁ × |Δ|/Q_rated)
    // 변화량이 클수록 더 큰 관성 극복 필요
    TIME_CONSTANT_DELTA: 0.4,
    
    // 시간상수 목표유량 계수 (k₂)
    // 고유량에서 제어가 어려워짐
    TIME_CONSTANT_TARGET: 0.15,
    
    // 오버슈트 변화량 계수 (k₃)
    // 변화량이 클수록 오버슈트 증가
    OVERSHOOT_DELTA: 0.25,
    
    // 오버슈트 목표유량 계수
    // 고유량에서 오버슈트 약간 증가
    OVERSHOOT_TARGET: 0.2,
    
    // 안정화 시간 오버슈트 계수
    // t_s = τ × (4 + k × %OS/10)
    SETTLING_OVERSHOOT: 0.15,
  },
  
  // 펌프 시스템 물리 상수
  // Wylie et al. 공식 기반 추정
  PHYSICS: {
    // 정격 유량 (m³/h)
    RATED_FLOW: 25,
    
    // 관성 모멘트 계수 (무차원)
    // I_total ≈ I_motor + I_pump ≈ 1.15 × I_motor
    INERTIA_FACTOR: 1.15,
    
    // 유체 관성 계수
    // 배관 내 유체 관성 영향
    FLUID_INERTIA: 0.1,
  },
  
  DEFAULT_DURATION: 30,   // 기본 시뮬레이션 시간 (초)
  STEP_SIZE: 0.1,         // 시간 간격 (초)
} as const;

/**
 * 시뮬레이션 모델 참고 문헌
 * UI에서 표시용
 */
export const SIMULATION_REFERENCES = [
  {
    title: "A theoretical model for predicting the startup performance of pumps as turbines",
    authors: "Zhang, Zhao & Zhu",
    journal: "Scientific Reports",
    year: 2024,
    url: "https://www.nature.com/articles/s41598-024-57693-9",
    contribution: "각운동량 방정식, 비정상 베르누이 방정식",
  },
  {
    title: "Reduced-order linearized dynamic model for induction motor-driven centrifugal fan-pump system",
    authors: "Turkeri et al.",
    journal: "Scientific Reports", 
    year: 2025,
    url: "https://www.nature.com/articles/s41598-025-27662-x",
    contribution: "3차 선형화 모델, 유량 동역학 상수",
  },
  {
    title: "Estimation of Pump Moment of Inertia",
    authors: "Neutrium (Wylie et al.)",
    journal: "Neutrium Engineering",
    year: null,
    url: "https://neutrium.net/articles/equipment/estimation-of-pump-moment-of-inertia/",
    contribution: "관성 모멘트 추정 공식",
  },
] as const;

// CSV 컬럼명
export const CSV_COLUMNS = {
  NO: 'No',
  DATETIME: 'DataTime',
  MILLISEC: 'MilliSec',
  FLOW: 'Main_Flow',
  INLET_PRESSURE: 'IN_PT050',
  OUTLET_PRESSURE: 'OUT_PT050',
  SYSTEM_PRESSURE: 'PT03',
  TANK_LEVEL: 'LT01',
  INLET_TEMP: 'TT01',
  OUTLET_TEMP: 'TT050',
  RPM: 'Rpm',
  VOLTAGE: 'Main_VAC',
  CURRENT: 'Main_A',
  POWER: 'Main_kW',
  REACTIVE_POWER: 'Main_Var',
  POWER_FACTOR: 'Main_PF',
  FREQUENCY: 'Main_Hz',
} as const;
