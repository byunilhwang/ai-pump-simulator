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

// 시뮬레이션 파라미터
export const SIMULATION = {
  // 과도 응답 시간 상수 (초)
  TIME_CONSTANT: {
    FAST: 1.5,      // 빠른 응답
    STABLE: 3.0,    // 안정적 응답
    SMOOTH: 5.0,    // 부드러운 응답
  },
  // 오버슈트 (%)
  OVERSHOOT: {
    FAST: 15,
    STABLE: 5,
    SMOOTH: 0,
  },
  DEFAULT_DURATION: 30,   // 기본 시뮬레이션 시간 (초)
  STEP_SIZE: 0.1,         // 시간 간격 (초)
} as const;

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
