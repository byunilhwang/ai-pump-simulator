/**
 * Case A/B/C 비교 API
 * GET /api/case-comparison?flow=15
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCaseComparison } from '@/lib/energy-calculations';
import { simulateCaseComparison } from '@/lib/simulation';
import { calculateControlMetrics } from '@/lib/metrics';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const flow = parseFloat(searchParams.get('flow') ?? '15');
    const includeTimeSeries = searchParams.get('timeSeries') === 'true';
    
    if (isNaN(flow) || flow < 0 || flow > 30) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'flow는 0 ~ 30 범위의 숫자여야 합니다.',
          },
        },
        { status: 400 }
      );
    }
    
    // 전력 비교
    const comparison = generateCaseComparison(flow);
    
    // 과도 응답 비교 (선택적)
    let transientComparison = null;
    let metrics = null;
    
    if (includeTimeSeries) {
      transientComparison = simulateCaseComparison({
        startFlow: 0,
        targetFlow: flow,
        duration: 30,
      });
      
      // 각 케이스별 제어 지표
      metrics = {
        caseA: calculateControlMetrics(
          transientComparison.caseA.map(p => ({ time: p.time, value: p.flow })),
          flow
        ),
        caseB: calculateControlMetrics(
          transientComparison.caseB.map(p => ({ time: p.time, value: p.flow })),
          flow
        ),
        caseC: calculateControlMetrics(
          transientComparison.caseC.map(p => ({ time: p.time, value: p.flow })),
          flow
        ),
      };
    }
    
    return NextResponse.json({
      success: true,
      data: {
        targetFlow: flow,
        powerComparison: {
          caseA: {
            name: comparison.caseA.name,
            power: Math.round(comparison.caseA.power * 100) / 100,
            description: comparison.caseA.description,
          },
          caseB: {
            name: comparison.caseB.name,
            power: Math.round(comparison.caseB.power * 100) / 100,
            description: comparison.caseB.description,
          },
          caseC: {
            name: comparison.caseC.name,
            power: Math.round(comparison.caseC.power * 100) / 100,
            description: comparison.caseC.description,
          },
        },
        savings: {
          bVsA: Math.round(comparison.savingBvsA * 10) / 10,
          cVsA: Math.round(comparison.savingCvsA * 10) / 10,
        },
        ...(includeTimeSeries && transientComparison && {
          transient: transientComparison,
          metrics,
        }),
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
