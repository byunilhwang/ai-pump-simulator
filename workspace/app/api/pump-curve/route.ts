/**
 * 펌프 곡선 API
 * 
 * VALVE_STAGES 운전점을 기반으로 2차 다항식 피팅으로 펌프 곡선 생성
 * H(Q) = a × Q² + b × Q + c
 */

import { NextResponse } from 'next/server';
import { PUMP_RATED, VALVE_STAGES, PHYSICS } from '@/lib/constants';

interface CurvePoint {
  flow: number;
  head: number;
}

/**
 * 2차 다항식 최소자승법 피팅 (가우스 소거법)
 * H(Q) = a × Q² + b × Q + c
 */
function fitQuadraticCurve(
  points: { flow: number; head: number }[]
): { a: number; b: number; c: number; r2: number } {
  const n = points.length;
  if (n < 3) {
    return { a: 0, b: 0, c: points[0]?.head || 0, r2: 0 };
  }

  // 정규 방정식 행렬 구성
  // A * [a, b, c]^T = B
  // 여기서 A는 3x3 행렬, B는 3x1 벡터
  let s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0;  // x^i의 합
  let t0 = 0, t1 = 0, t2 = 0;  // x^i * y의 합

  for (const p of points) {
    const x = p.flow;
    const y = p.head;
    s0 += 1;
    s1 += x;
    s2 += x * x;
    s3 += x * x * x;
    s4 += x * x * x * x;
    t0 += y;
    t1 += x * y;
    t2 += x * x * y;
  }

  // 정규 방정식:
  // [s4 s3 s2] [a]   [t2]
  // [s3 s2 s1] [b] = [t1]
  // [s2 s1 s0] [c]   [t0]

  // 가우스 소거법으로 풀기
  const A = [
    [s4, s3, s2, t2],
    [s3, s2, s1, t1],
    [s2, s1, s0, t0],
  ];

  // 전진 소거
  for (let i = 0; i < 3; i++) {
    // 피봇팅
    let maxRow = i;
    for (let k = i + 1; k < 3; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k;
      }
    }
    [A[i], A[maxRow]] = [A[maxRow], A[i]];

    if (Math.abs(A[i][i]) < 1e-10) {
      return { a: 0, b: 0, c: t0 / n, r2: 0 };
    }

    // 소거
    for (let k = i + 1; k < 3; k++) {
      const factor = A[k][i] / A[i][i];
      for (let j = i; j < 4; j++) {
        A[k][j] -= factor * A[i][j];
      }
    }
  }

  // 후진 대입
  const x = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    x[i] = A[i][3];
    for (let j = i + 1; j < 3; j++) {
      x[i] -= A[i][j] * x[j];
    }
    x[i] /= A[i][i];
  }

  const [a, b, c] = x;

  // R² 계산
  const meanY = t0 / n;
  let ssTot = 0, ssRes = 0;
  for (const p of points) {
    const predicted = a * p.flow * p.flow + b * p.flow + c;
    ssTot += (p.head - meanY) ** 2;
    ssRes += (p.head - predicted) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return { a, b, c, r2 };
}

/**
 * 피팅된 곡선 데이터 생성
 */
function generateCurveData(
  coeffs: { a: number; b: number; c: number },
  maxFlow: number,
  steps: number = 50
): CurvePoint[] {
  const curve: CurvePoint[] = [];
  
  for (let i = 0; i <= steps; i++) {
    const flow = (maxFlow / steps) * i;
    const head = coeffs.a * flow * flow + coeffs.b * flow + coeffs.c;
    curve.push({
      flow: Math.round(flow * 100) / 100,
      head: Math.round(Math.max(head, 0) * 100) / 100,
    });
  }
  
  return curve;
}

export async function GET() {
  try {
    // VALVE_STAGES에서 운전점 추출 (실측 양정 직접 사용)
    const operatingPoints = VALVE_STAGES.map(s => ({
      flow: s.flow,
      head: s.head,  // 실측 양정
    }));

    // 2차 다항식 피팅
    const coeffs = fitQuadraticCurve(operatingPoints);

    // 곡선 데이터 생성 (실측 최대 유량까지)
    const maxFlow = Math.max(...operatingPoints.map(p => p.flow));
    const curveData = generateCurveData(coeffs, maxFlow, 50);

    return NextResponse.json({
      success: true,
      data: {
        ratedFlow: PUMP_RATED.FLOW,
        ratedHead: PUMP_RATED.HEAD,
        maxHead: PUMP_RATED.MAX_HEAD,
        coefficients: {
          a: Math.round(coeffs.a * 10000) / 10000,
          b: Math.round(coeffs.b * 1000) / 1000,
          c: Math.round(coeffs.c * 100) / 100,
          r2: Math.round(coeffs.r2 * 1000) / 1000,
        },
        formula: `H(Q) = ${coeffs.a.toFixed(4)} × Q² + ${coeffs.b.toFixed(3)} × Q + ${coeffs.c.toFixed(2)}`,
        curveData,
        operatingPoints,
      },
    });
  } catch (error) {
    console.error('Pump curve API error:', error);
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
