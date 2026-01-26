/**
 * 인버터 전력 계산 API (상사법칙)
 * POST /api/calculate/inverter-power
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateInverterPower, calculatePIDPower, calculateEnergySaving } from '@/lib/energy-calculations';
import { PUMP_RATED } from '@/lib/constants';

interface InverterPowerRequest {
  targetFlow: number;     // m³/h
  ratedFlow?: number;     // m³/h (기본 25)
}

export async function POST(request: NextRequest) {
  try {
    const body: InverterPowerRequest = await request.json();
    
    // 입력값 검증
    if (body.targetFlow === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'targetFlow는 필수입니다.',
          },
        },
        { status: 400 }
      );
    }
    
    const ratedFlow = body.ratedFlow ?? PUMP_RATED.FLOW;
    
    const inverterPower = calculateInverterPower(body.targetFlow, ratedFlow);
    const pidPower = calculatePIDPower(body.targetFlow, ratedFlow);
    const energySaving = calculateEnergySaving(body.targetFlow);
    
    const flowRatio = body.targetFlow / ratedFlow;
    
    return NextResponse.json({
      success: true,
      data: {
        input: {
          targetFlow: body.targetFlow,
          ratedFlow,
          ratedPower: PUMP_RATED.POWER,
        },
        result: {
          flowRatio: Math.round(flowRatio * 1000) / 1000,
          inverterPower: Math.round(inverterPower * 1000) / 1000,
          pidPower: Math.round(pidPower * 1000) / 1000,
          valvePower: Math.round(energySaving.valvePower * 100) / 100,
          savingPower: Math.round(energySaving.savingPower * 100) / 100,
          savingPercent: Math.round(energySaving.savingPercent * 10) / 10,
          pidSavingPercent: Math.round(energySaving.pidSavingPercent * 10) / 10,
        },
        formula: {
          affinityLaw: 'P₂ = P₁ × (Q₂/Q₁)³',
          description: '상사법칙: 전력은 유량의 세제곱에 비례',
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
