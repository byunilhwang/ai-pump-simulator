/**
 * 7개 운전점 데이터 API
 * GET /api/operating-points
 */

import { NextResponse } from 'next/server';
import { VALVE_STAGES, PHYSICS } from '@/lib/constants';
import { calculateHead, calculateEfficiency, calculateHydraulicPower } from '@/lib/pump-calculations';

export async function GET() {
  try {
    // 밸브 단계별 운전점 데이터 생성 (2026년 1월 실측 기준)
    const operatingPoints = VALVE_STAGES.map(stage => {
      const head = stage.head;  // 실측 양정 직접 사용
      const hydraulicPower = calculateHydraulicPower(stage.flow, head);
      const efficiency = stage.flow > 0 
        ? calculateEfficiency(stage.flow, head, stage.power)
        : 0;
      
      return {
        stage: stage.stage,
        flow: stage.flow,
        head: Math.round(head * 10) / 10,
        power: stage.power,
        hydraulicPower: Math.round(hydraulicPower * 100) / 100,
        efficiency: Math.round(efficiency * 10) / 10,
        outletPressure: stage.pressure,
        powerFactor: 0.85,
      };
    });
    
    return NextResponse.json({
      success: true,
      data: operatingPoints,
      metadata: {
        count: operatingPoints.length,
        source: '2026년 실측 데이터 기반',
        unit: {
          flow: 'm³/h',
          head: 'm',
          power: 'kW',
          efficiency: '%',
          pressure: 'bar',
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
