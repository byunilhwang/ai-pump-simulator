/**
 * 압력 기반 제어 시뮬레이션 API (Phase 2)
 * 
 * 목표 압력을 입력받아 필요 속도, 예측 전력, 예측 유량을 계산
 * 
 * @see documents/project/05_phase2_plan.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  calculatePressureControlPrediction,
  calculateSpeedRatioForPressure,
  calculatePowerForPressure,
  calculateFlowForPressure,
  getValvePower,
} from '@/lib/energy-calculations';
import { PRESSURE_CONTROL, PUMP_RATED, SIMULATION } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { targetPressure, duration = 30 } = body;

    // 입력 검증
    if (typeof targetPressure !== 'number' || targetPressure <= 0 || targetPressure > 15) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'INVALID_INPUT', 
            message: '목표 압력은 0-15 bar 범위여야 합니다' 
          } 
        },
        { status: 400 }
      );
    }

    // 압력 기반 제어 예측
    const prediction = calculatePressureControlPrediction(targetPressure);
    
    // 시계열 데이터 생성 (압력 변화 시뮬레이션)
    const timeSeries = generatePressureTimeSeries(
      targetPressure,
      prediction.speedRatio,
      prediction.predictedPower,
      prediction.predictedFlow,
      duration
    );

    return NextResponse.json({
      success: true,
      data: {
        prediction,
        timeSeries,
        metadata: {
          ratedHead: PUMP_RATED.HEAD,
          ratedFlow: PUMP_RATED.FLOW,
          ratedPower: PUMP_RATED.POWER,
          ratedRPM: PUMP_RATED.MOTOR_RPM,
          supportedPressures: PRESSURE_CONTROL.TARGET_PRESSURES,
        }
      }
    });
  } catch (error) {
    console.error('Pressure control API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: '서버 오류가 발생했습니다' 
        } 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pressureParam = searchParams.get('pressure');
  
  if (!pressureParam) {
    // 지원되는 압력 목록 반환
    const predictions = PRESSURE_CONTROL.TARGET_PRESSURES.map(p => 
      calculatePressureControlPrediction(p)
    );
    
    return NextResponse.json({
      success: true,
      data: {
        supportedPressures: PRESSURE_CONTROL.TARGET_PRESSURES,
        predictions,
        metadata: {
          ratedHead: PUMP_RATED.HEAD,
          ratedFlow: PUMP_RATED.FLOW,
          ratedPower: PUMP_RATED.POWER,
        }
      }
    });
  }
  
  const targetPressure = parseFloat(pressureParam);
  
  if (isNaN(targetPressure) || targetPressure <= 0 || targetPressure > 15) {
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          code: 'INVALID_INPUT', 
          message: '목표 압력은 0-15 bar 범위여야 합니다' 
        } 
      },
      { status: 400 }
    );
  }
  
  const prediction = calculatePressureControlPrediction(targetPressure);
  
  return NextResponse.json({
    success: true,
    data: { prediction }
  });
}

/**
 * 압력 제어 시계열 데이터 생성
 */
function generatePressureTimeSeries(
  targetPressure: number,
  speedRatio: number,
  finalPower: number,
  finalFlow: number,
  duration: number
): { time: number; pressure: number; flow: number; power: number; rpm: number }[] {
  const stepSize = SIMULATION.STEP_SIZE;
  const steps = Math.floor(duration / stepSize);
  const timeSeries: { time: number; pressure: number; flow: number; power: number; rpm: number }[] = [];
  
  const timeConstant = SIMULATION.TIME_CONSTANT.STABLE;
  const damping = SIMULATION.DAMPING_RATIO.STABLE;
  const ratedRPM = PUMP_RATED.MOTOR_RPM;
  const finalRPM = ratedRPM * speedRatio;
  
  for (let i = 0; i <= steps; i++) {
    const t = i * stepSize;
    
    // 2차 시스템 스텝 응답
    const omega_n = 1 / timeConstant;
    const omega_d = omega_n * Math.sqrt(1 - damping * damping);
    
    let response: number;
    if (damping >= 1) {
      response = 1 - Math.exp(-omega_n * t) * (1 + omega_n * t);
    } else {
      const phi = Math.atan(damping / Math.sqrt(1 - damping * damping));
      response = 1 - Math.exp(-damping * omega_n * t) * 
        Math.cos(omega_d * t - phi) / Math.sqrt(1 - damping * damping);
    }
    
    response = Math.max(0, Math.min(1, response));
    
    const currentPressure = targetPressure * response;
    const currentFlow = finalFlow * response;
    const currentPower = PUMP_RATED.POWER * 0.18 + (finalPower - PUMP_RATED.POWER * 0.18) * response;
    const currentRPM = ratedRPM * PUMP_RATED.VFD_SPEED_RATIO_MIN + (finalRPM - ratedRPM * PUMP_RATED.VFD_SPEED_RATIO_MIN) * response;
    
    timeSeries.push({
      time: Math.round(t * 100) / 100,
      pressure: Math.round(currentPressure * 100) / 100,
      flow: Math.round(currentFlow * 100) / 100,
      power: Math.round(currentPower * 100) / 100,
      rpm: Math.round(currentRPM),
    });
  }
  
  return timeSeries;
}
