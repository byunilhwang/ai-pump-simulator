/**
 * 7개 운전점 데이터 API
 * GET /api/operating-points
 */

import { NextResponse } from 'next/server';
import { VALVE_STAGES, PHYSICS } from '@/lib/constants';
import { calculateHead, calculateEfficiency, calculateHydraulicPower } from '@/lib/pump-calculations';

export async function GET() {
  try {
    // 밸브 단계별 운전점 데이터 생성
    const operatingPoints = VALVE_STAGES.map(stage => {
      const head = calculateHead(stage.pressure, 0);
      const hydraulicPower = calculateHydraulicPower(stage.flow, head);
      const efficiency = stage.flow > 0 
        ? calculateEfficiency(stage.flow, head, stage.power)
        : 0;
      
      return {
        stage: stage.stage,
        valveAngle: stage.angle,
        flow: stage.flow,
        head: Math.round(head * 10) / 10,
        power: stage.power,
        hydraulicPower: Math.round(hydraulicPower * 100) / 100,
        efficiency: Math.round(efficiency * 10) / 10,
        outletPressure: stage.pressure,
        powerFactor: 0.85, // 평균 역률
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
