/**
 * 제어 응답 성능지표 계산 모듈
 * @see documents/project/03_backend_arch.md 섹션 4.0
 * @see documents/project/99_glossary.md 섹션 4
 */

/**
 * 변화 시간 (Transition Time): 상승 또는 하강 시 10% → 90% 도달 시간
 * - 상승(startValue < targetValue): 10% → 90% 상승 시간
 * - 하강(startValue > targetValue): 90% → 10% 하강 시간
 */
export function calculateTransitionTime(
  timeSeries: { time: number; value: number }[],
  startValue: number,
  targetValue: number
): number {
  if (timeSeries.length === 0) return 0;
  
  // 시작=목표면 변화 없음
  const delta = targetValue - startValue;
  if (Math.abs(delta) < 0.01) return 0;
  
  const isRising = delta > 0;
  
  if (isRising) {
    // 상승: 10% → 90%
    const threshold10 = startValue + delta * 0.1;
    const threshold90 = startValue + delta * 0.9;
    
    const t10 = timeSeries.find(p => p.value >= threshold10)?.time ?? 0;
    const t90 = timeSeries.find(p => p.value >= threshold90)?.time ?? 0;
    
    return t90 - t10;
  } else {
    // 하강: 90% → 10% (startValue에서 10% 내려간 지점 ~ 90% 내려간 지점)
    const threshold10 = startValue + delta * 0.1; // startValue보다 10% 내려간 값
    const threshold90 = startValue + delta * 0.9; // startValue보다 90% 내려간 값
    
    const t10 = timeSeries.find(p => p.value <= threshold10)?.time ?? 0;
    const t90 = timeSeries.find(p => p.value <= threshold90)?.time ?? 0;
    
    return t90 - t10;
  }
}

/**
 * 오버슈트 (Overshoot %) - 방향 고려
 * - 상승 시: 목표값을 초과한 정도
 * - 하강 시: 목표값보다 더 내려간 정도 (언더슈트)
 */
export function calculateOvershoot(
  timeSeries: { time: number; value: number }[],
  startValue: number,
  targetValue: number
): number {
  if (timeSeries.length === 0) return 0;
  
  // 시작=목표면 오버슈트 없음
  const delta = targetValue - startValue;
  if (Math.abs(delta) < 0.01) return 0;
  
  // targetValue가 0이면 % 계산 불가
  if (Math.abs(targetValue) < 0.01) return 0;
  
  const isRising = delta > 0;
  
  if (isRising) {
    // 상승: 최대값이 목표를 초과한 정도
    const maxValue = Math.max(...timeSeries.map(p => p.value));
    if (maxValue <= targetValue) return 0;
    return ((maxValue - targetValue) / Math.abs(delta)) * 100;
  } else {
    // 하강: 최소값이 목표보다 더 내려간 정도
    const minValue = Math.min(...timeSeries.map(p => p.value));
    if (minValue >= targetValue) return 0;
    return ((targetValue - minValue) / Math.abs(delta)) * 100;
  }
}

/**
 * 안정화 시간 (Settling Time): ±2% 범위 진입
 */
export function calculateSettlingTime(
  timeSeries: { time: number; value: number }[],
  startValue: number,
  targetValue: number,
  tolerance: number = 0.02
): number {
  if (timeSeries.length === 0) return 0;
  
  // 시작=목표면 안정화 시간 0
  const delta = targetValue - startValue;
  if (Math.abs(delta) < 0.01) return 0;
  
  // targetValue가 0에 가까우면 절대 오차로 계산
  const band = Math.abs(targetValue) > 0.1 
    ? Math.abs(targetValue) * tolerance 
    : Math.abs(delta) * tolerance;
  
  const lowerBound = targetValue - band;
  const upperBound = targetValue + band;
  
  // 마지막부터 역순으로 찾기
  for (let i = timeSeries.length - 1; i >= 0; i--) {
    const { time, value } = timeSeries[i];
    if (value < lowerBound || value > upperBound) {
      return timeSeries[i + 1]?.time ?? time;
    }
  }
  
  return timeSeries[0]?.time ?? 0;
}

/**
 * 모든 제어 응답 지표 계산
 */
export function calculateControlMetrics(
  timeSeries: { time: number; value: number }[],
  targetValue: number,
  startValue?: number
): {
  transitionTime: number;
  overshoot: number;
  settlingTime: number;
} {
  // startValue가 제공되지 않으면 첫 번째 데이터 포인트 사용
  const start = startValue ?? (timeSeries[0]?.value ?? 0);
  
  return {
    transitionTime: calculateTransitionTime(timeSeries, start, targetValue),
    overshoot: calculateOvershoot(timeSeries, start, targetValue),
    settlingTime: calculateSettlingTime(timeSeries, start, targetValue),
  };
}
