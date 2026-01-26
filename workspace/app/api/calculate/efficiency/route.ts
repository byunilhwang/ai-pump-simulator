/**
 * 효율 계산 API
 * POST /api/calculate/efficiency
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateHead, calculateEfficiency, calculateHydraulicPower } from '@/lib/pump-calculations';

interface EfficiencyRequest {
  flow: number;           // m³/h
  outletPressure: number; // bar
  inletPressure?: number; // bar (기본 0)
  inputPower: number;     // kW
}

export async function POST(request: NextRequest) {
  try {
    const body: EfficiencyRequest = await request.json();
    
    // 입력값 검증
    if (body.flow === undefined || body.outletPressure === undefined || body.inputPower === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'flow, outletPressure, inputPower는 필수입니다.',
          },
        },
        { status: 400 }
      );
    }
    
    const inletPressure = body.inletPressure ?? 0;
    const head = calculateHead(body.outletPressure, inletPressure);
    const hydraulicPower = calculateHydraulicPower(body.flow, head);
    const efficiency = calculateEfficiency(body.flow, head, body.inputPower);
    
    return NextResponse.json({
      success: true,
      data: {
        input: {
          flow: body.flow,
          outletPressure: body.outletPressure,
          inletPressure,
          inputPower: body.inputPower,
        },
        result: {
          head: Math.round(head * 100) / 100,
          hydraulicPower: Math.round(hydraulicPower * 1000) / 1000,
          efficiency: Math.round(efficiency * 100) / 100,
        },
        formula: {
          head: 'H = (P_out - P_in) × 10.197 (m)',
          hydraulicPower: 'P_h = ρ × g × Q × H / 3600 / 1000 (kW)',
          efficiency: 'η = P_h / P_input × 100 (%)',
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
