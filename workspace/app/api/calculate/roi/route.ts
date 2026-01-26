/**
 * ROI 계산 API
 * POST /api/calculate/roi
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateROI } from '@/lib/energy-calculations';
import { ELECTRICITY } from '@/lib/constants';

interface ROIRequest {
  inverterCost: number;      // 원
  dailyRunHours: number;     // 시간
  yearlyDays: number;        // 일
  targetFlow: number;        // m³/h
  electricityRate?: number;  // 원/kWh
}

export async function POST(request: NextRequest) {
  try {
    const body: ROIRequest = await request.json();
    
    // 입력값 검증
    if (!body.inverterCost || !body.dailyRunHours || !body.yearlyDays || body.targetFlow === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'inverterCost, dailyRunHours, yearlyDays, targetFlow는 필수입니다.',
          },
        },
        { status: 400 }
      );
    }
    
    // 범위 검증
    if (body.inverterCost < 0 || body.inverterCost > 100000000) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'inverterCost는 0 ~ 1억원 범위여야 합니다.',
          },
        },
        { status: 400 }
      );
    }
    
    if (body.dailyRunHours < 1 || body.dailyRunHours > 24) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'dailyRunHours는 1 ~ 24 범위여야 합니다.',
          },
        },
        { status: 400 }
      );
    }
    
    const result = calculateROI({
      inverterCost: body.inverterCost,
      dailyRunHours: body.dailyRunHours,
      yearlyDays: body.yearlyDays,
      targetFlow: body.targetFlow,
      electricityRate: body.electricityRate,
    });
    
    return NextResponse.json({
      success: true,
      data: {
        input: {
          inverterCost: body.inverterCost,
          dailyRunHours: body.dailyRunHours,
          yearlyDays: body.yearlyDays,
          targetFlow: body.targetFlow,
          electricityRate: body.electricityRate ?? ELECTRICITY.RATE_KRW_PER_KWH,
        },
        result: {
          valvePower: Math.round(result.valvePower * 100) / 100,
          inverterPower: Math.round(result.inverterPower * 100) / 100,
          dailySavingKWh: Math.round(result.dailySavingKWh * 100) / 100,
          yearlySavingKWh: Math.round(result.yearlySavingKWh),
          yearlySavingKRW: Math.round(result.yearlySavingKRW),
          roiYears: result.roiYears != null ? Math.round(result.roiYears * 100) / 100 : null,
          roiMonths: result.roiMonths != null ? Math.round(result.roiMonths * 10) / 10 : null,
          fiveYearSaving: Math.round(result.fiveYearSaving),
          tenYearSaving: Math.round(result.tenYearSaving),
        },
        formula: {
          savingPower: 'P_saving = P_valve - P_inverter (kW)',
          yearlySaving: 'E_year = P_saving × hours × days (kWh)',
          roi: 'ROI = Cost / (E_year × Rate) (년)',
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
