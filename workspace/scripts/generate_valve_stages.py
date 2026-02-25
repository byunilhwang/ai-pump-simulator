#!/usr/bin/env python3
"""
VALVE_STAGES 생성 스크립트

추출된 안정 운전점 데이터를 유량 구간별로 그룹핑하여
대표 VALVE_STAGES 배열을 생성합니다.
"""

import csv
from pathlib import Path


def load_operating_points(filepath):
    """CSV에서 운전점 데이터 로드"""
    points = []
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            points.append({
                'flow': float(row['flow']),
                'power': float(row['power']),
                'pressure': float(row['pressure']),
                'head': float(row['head']),
                'duration': int(row['duration'])
            })
    return points


def group_by_flow_range(points, flow_ranges):
    """유량 범위별로 그룹핑"""
    groups = {r: [] for r in flow_ranges}
    
    for p in points:
        for (low, high) in flow_ranges:
            if low <= p['flow'] < high:
                groups[(low, high)].append(p)
                break
    
    return groups


def weighted_average(points):
    """지속시간 가중 평균 계산"""
    if not points:
        return None
    
    total_duration = sum(p['duration'] for p in points)
    
    avg_flow = sum(p['flow'] * p['duration'] for p in points) / total_duration
    avg_power = sum(p['power'] * p['duration'] for p in points) / total_duration
    avg_pressure = sum(p['pressure'] * p['duration'] for p in points) / total_duration
    avg_head = sum(p['head'] * p['duration'] for p in points) / total_duration
    
    return {
        'flow': round(avg_flow, 1),
        'power': round(avg_power, 2),
        'pressure': round(avg_pressure, 2),
        'head': round(avg_head, 1),
        'n_samples': len(points),
        'total_duration': total_duration
    }


def main():
    base_dir = Path(__file__).parent.parent
    input_file = base_dir / 'data' / 'processed' / 'stable_operating_points_2026.csv'
    
    points = load_operating_points(input_file)
    
    # 유량 범위 정의 (VALVE_STAGES용)
    flow_ranges = [
        (0, 1),       # 0 m³/h (무부하)
        (4, 7),       # 5-6 m³/h
        (6, 8),       # 6-7 m³/h
        (10, 13),     # 11-12 m³/h
        (14, 16),     # 15 m³/h
        (16, 17),     # 16 m³/h
        (17, 19),     # 18 m³/h
        (19, 21),     # 20 m³/h (정격 근처)
        (21, 23),     # 22 m³/h
        (23, 26),     # 24 m³/h (최대)
    ]
    
    groups = group_by_flow_range(points, flow_ranges)
    
    print("=" * 70)
    print("실측 기반 VALVE_STAGES 데이터")
    print("=" * 70)
    
    valve_stages = []
    stage = 0
    
    for flow_range in flow_ranges:
        avg = weighted_average(groups[flow_range])
        if avg:
            valve_stages.append({
                'stage': stage,
                **avg
            })
            print(f"Stage {stage}: Flow={avg['flow']:5.1f} m³/h, "
                  f"Power={avg['power']:5.2f} kW, "
                  f"Pressure={avg['pressure']:5.2f} bar, "
                  f"Head={avg['head']:5.1f} m "
                  f"[{avg['n_samples']} samples, {avg['total_duration']}s]")
            stage += 1
    
    print("\n" + "=" * 70)
    print("TypeScript 코드 (constants.ts용)")
    print("=" * 70)
    
    # TypeScript 코드 생성
    print("""
export const VALVE_STAGES = [""")
    
    for vs in valve_stages:
        # 효율 계산: η = P_hydraulic / P_electric
        # P_hydraulic = ρgQH = 1000 * 9.81 * (Q/3600) * H / 1000 [kW]
        hydraulic_power = 1000 * 9.81 * (vs['flow'] / 3600) * vs['head'] / 1000
        efficiency = (hydraulic_power / vs['power'] * 100) if vs['power'] > 0 else 0
        
        print(f"  {{ stage: {vs['stage']}, flow: {vs['flow']}, power: {vs['power']}, "
              f"pressure: {vs['pressure']}, head: {vs['head']}, efficiency: {efficiency:.0f} }},")
    
    print("];")
    
    # 요약
    print("\n" + "=" * 70)
    print("검증 요약")
    print("=" * 70)
    print(f"총 데이터 포인트: {len(points)}개")
    print(f"생성된 VALVE_STAGES: {len(valve_stages)}개")
    
    if valve_stages:
        # 정격 유량 근처 데이터 확인
        rated_flow_stage = next((vs for vs in valve_stages if 19 <= vs['flow'] <= 21), None)
        if rated_flow_stage:
            print(f"\n정격 유량 근처 ({rated_flow_stage['flow']} m³/h):")
            print(f"  - 실측 전력: {rated_flow_stage['power']} kW")
            print(f"  - 실측 압력: {rated_flow_stage['pressure']} bar")
            print(f"  - 실측 양정: {rated_flow_stage['head']} m")


if __name__ == '__main__':
    main()
