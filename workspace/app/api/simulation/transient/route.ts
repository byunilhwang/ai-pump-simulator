/**
 * 과도 응답 시뮬레이션 API
 * POST /api/simulation/transient
 */

import { NextRequest, NextResponse } from 'next/server';
import { simulateTransient, SimulationMode } from '@/lib/simulation';
import { calculateControlMetrics } from '@/lib/metrics';

interface TransientRequest {
  startFlow: number;      // 시작 유량 (m³/h)
  targetFlow: number;     // 목표 유량 (m³/h)
  mode: SimulationMode;   // 'fast' | 'stable' | 'smooth'
  duration?: number;      // 시뮬레이션 시간 (초)
}

export async function POST(request: NextRequest) {
  try {
    const body: TransientRequest = await request.json();
    
    // 입력값 검증
    if (body.startFlow === undefined || body.targetFlow === undefined || !body.mode) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'startFlow, targetFlow, mode는 필수입니다.',
          },
        },
        { status: 400 }
      );
    }
    
    if (!['fast', 'stable', 'smooth'].includes(body.mode)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'mode는 fast, stable, smooth 중 하나여야 합니다.',
          },
        },
        { status: 400 }
      );
    }
    
    const simulation = simulateTransient({
      startFlow: body.startFlow,
      targetFlow: body.targetFlow,
      mode: body.mode,
      duration: body.duration,
    });
    
    // 제어 성능 지표 계산 (startFlow 전달)
    const flowSeries = simulation.timeSeries.map(p => ({
      time: p.time,
      value: p.flow,
    }));
    const controlMetrics = calculateControlMetrics(flowSeries, body.targetFlow, body.startFlow);
    
    return NextResponse.json({
      success: true,
      data: {
        input: {
          startFlow: body.startFlow,
          targetFlow: body.targetFlow,
          mode: body.mode,
          duration: body.duration ?? 30,
        },
        simulation: {
          mode: simulation.mode,
          timeConstant: simulation.timeConstant,
          overshoot: simulation.overshoot,
          dataPoints: simulation.timeSeries.length,
        },
        metrics: {
          transitionTime: Math.round(controlMetrics.transitionTime * 100) / 100,
          overshoot: Math.round(controlMetrics.overshoot * 100) / 100,
          settlingTime: Math.round(controlMetrics.settlingTime * 100) / 100,
        },
        timeSeries: simulation.timeSeries,
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
