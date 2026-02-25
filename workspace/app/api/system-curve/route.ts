/**
 * 시스템 곡선 추정 API (Phase 2)
 * 
 * Phase 2 CSV 데이터에서 시스템 곡선 파라미터를 추정
 * H_system = H_static + k × Q²
 * 
 * @see documents/project/05_phase2_plan.md
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  estimateSystemCurve, 
  generateSystemCurve,
  generateQHCurve,
  findOperatingPoint,
  calculateHead,
} from '@/lib/pump-calculations';
import { PUMP_RATED, VALVE_STAGES, PHYSICS } from '@/lib/constants';

// Phase 2 실측 데이터 기반 시스템 곡선 추정값
// documents/project/phase2/*.csv 분석 결과
const ESTIMATED_SYSTEM_CURVE = {
  // 정압 (배관 높이차 + 설비 최소 압력)
  STATIC_HEAD: 50,  // m (약 5 bar)
  
  // 저항 계수 (배관 마찰 + 피팅 손실)
  RESISTANCE_COEFF: 0.15,  // m/(m³/h)²
};

export async function GET(request: NextRequest) {
  try {
    // 기존 운전점 데이터로 시스템 곡선 추정 (실측 양정 직접 사용)
    const operatingPoints = VALVE_STAGES
      .filter(s => s.flow > 0)
      .map(s => ({
        flow: s.flow,
        head: s.head,  // 실측 양정
      }));
    
    // 시스템 곡선 파라미터 추정
    const estimated = estimateSystemCurve(operatingPoints);
    
    // 시스템 곡선 데이터 생성
    const systemCurveData = generateSystemCurve(
      estimated.staticHead,
      estimated.resistanceCoeff,
      PUMP_RATED.FLOW * 1.2,
      50
    );
    
    // 펌프 곡선 데이터 생성 (Phase 2 실측 기준)
    const pumpCurvePoints = [
      { flow: 0, head: PUMP_RATED.MAX_HEAD },
      { flow: PUMP_RATED.FLOW * 0.25, head: PUMP_RATED.HEAD + 20 },
      { flow: PUMP_RATED.FLOW * 0.5, head: PUMP_RATED.HEAD + 10 },
      { flow: PUMP_RATED.FLOW * 0.75, head: PUMP_RATED.HEAD + 3 },
      { flow: PUMP_RATED.FLOW, head: PUMP_RATED.HEAD },
      { flow: PUMP_RATED.FLOW * 1.1, head: PUMP_RATED.HEAD - 15 },
    ];
    const pumpCurveData = generateQHCurve(pumpCurvePoints, 50);
    
    // 운전점 찾기
    const operatingPoint = findOperatingPoint(pumpCurveData, systemCurveData);
    
    return NextResponse.json({
      success: true,
      data: {
        systemCurve: {
          staticHead: estimated.staticHead,
          resistanceCoeff: estimated.resistanceCoeff,
          formula: estimated.formula,
          r2: estimated.r2,
          curveData: systemCurveData,
        },
        pumpCurve: {
          ratedFlow: PUMP_RATED.FLOW,
          ratedHead: PUMP_RATED.HEAD,
          maxHead: PUMP_RATED.MAX_HEAD,
          curveData: pumpCurveData,
        },
        operatingPoint,
        dataSource: {
          description: 'VALVE_STAGES 데이터 기반 추정',
          pointsUsed: operatingPoints.length,
        },
      },
    });
  } catch (error) {
    console.error('System curve API error:', error);
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dataPoints } = body;
    
    if (!Array.isArray(dataPoints) || dataPoints.length < 3) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            code: 'INVALID_INPUT', 
            message: '최소 3개 이상의 데이터 포인트가 필요합니다' 
          } 
        },
        { status: 400 }
      );
    }
    
    // 사용자 제공 데이터로 시스템 곡선 추정
    const estimated = estimateSystemCurve(dataPoints);
    const systemCurveData = generateSystemCurve(
      estimated.staticHead,
      estimated.resistanceCoeff,
      Math.max(...dataPoints.map(p => p.flow)) * 1.2,
      50
    );
    
    return NextResponse.json({
      success: true,
      data: {
        systemCurve: {
          staticHead: estimated.staticHead,
          resistanceCoeff: estimated.resistanceCoeff,
          formula: estimated.formula,
          r2: estimated.r2,
          curveData: systemCurveData,
        },
        inputData: {
          pointsProvided: dataPoints.length,
          dataPoints,
        },
      },
    });
  } catch (error) {
    console.error('System curve POST API error:', error);
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
