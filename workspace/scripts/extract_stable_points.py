#!/usr/bin/env python3
"""
안정 구간(Stable Point) 추출 스크립트

CSV 파일에서 유량이 안정화된 구간을 자동 감지하고,
해당 구간의 평균 유량, 전력, 압력을 추출합니다.

안정 구간 정의:
- 유량 변화가 ±0.3 m³/h 이내로 10초 이상 유지
- 압력이 정상 범위 (> 5 bar)
"""

import os
import csv
from pathlib import Path
from datetime import datetime


def detect_stable_segments(rows, flow_tolerance=0.3, min_duration=10):
    """
    안정 구간 감지
    
    Args:
        rows: CSV 데이터 행 리스트
        flow_tolerance: 유량 허용 오차 (m³/h)
        min_duration: 최소 안정 지속 시간 (초)
    
    Returns:
        안정 구간 리스트 [(start_idx, end_idx), ...]
    """
    if len(rows) < min_duration:
        return []
    
    segments = []
    start_idx = 0
    ref_flow = rows[0]['flow']
    
    for i, row in enumerate(rows):
        if abs(row['flow'] - ref_flow) > flow_tolerance:
            if i - start_idx >= min_duration:
                segments.append((start_idx, i - 1))
            start_idx = i
            ref_flow = row['flow']
    
    # 마지막 구간 처리
    if len(rows) - start_idx >= min_duration:
        segments.append((start_idx, len(rows) - 1))
    
    return segments


def calculate_segment_average(rows, start_idx, end_idx):
    """구간 평균 계산"""
    segment = rows[start_idx:end_idx + 1]
    n = len(segment)
    
    avg_flow = sum(r['flow'] for r in segment) / n
    avg_power = sum(r['power'] for r in segment) / n
    avg_pressure = sum(r['pressure'] for r in segment) / n
    
    # 표준편차 (안정성 지표)
    std_flow = (sum((r['flow'] - avg_flow) ** 2 for r in segment) / n) ** 0.5
    std_power = (sum((r['power'] - avg_power) ** 2 for r in segment) / n) ** 0.5
    
    return {
        'flow': round(avg_flow, 2),
        'power': round(avg_power, 2),
        'pressure': round(avg_pressure, 2),
        'head': round(avg_pressure * 10.197, 1),  # bar to m
        'duration': end_idx - start_idx + 1,
        'std_flow': round(std_flow, 3),
        'std_power': round(std_power, 3)
    }


def process_csv_file(filepath):
    """단일 CSV 파일 처리"""
    rows = []
    
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)  # 헤더 스킵
        
        for row in reader:
            try:
                flow = float(row[3])       # Main_Flow
                pressure = float(row[5])   # OUT_PT050
                power = float(row[13])     # Main_kW
                
                # 비정상 데이터 필터링 (압력 < 5 bar는 시스템 이상)
                if pressure > 5:
                    rows.append({
                        'flow': flow,
                        'pressure': pressure,
                        'power': power
                    })
            except (IndexError, ValueError):
                continue
    
    if not rows:
        return []
    
    # 안정 구간 감지
    segments = detect_stable_segments(rows)
    
    results = []
    for start_idx, end_idx in segments:
        avg = calculate_segment_average(rows, start_idx, end_idx)
        results.append(avg)
    
    return results


def main():
    # 경로 설정
    base_dir = Path(__file__).parent.parent
    downloads_dir = base_dir.parent / 'downloads'
    output_dir = base_dir / 'data' / 'processed'
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 2026년 CSV 파일만 처리
    csv_files = sorted([f for f in downloads_dir.glob('2026*.csv')])
    
    all_points = []
    
    print(f"처리 대상: {len(csv_files)}개 파일")
    print("-" * 60)
    
    for csv_file in csv_files:
        results = process_csv_file(csv_file)
        
        for result in results:
            result['source_file'] = csv_file.name
            all_points.append(result)
            
        if results:
            print(f"{csv_file.name}: {len(results)}개 안정 구간")
            for r in results:
                print(f"  Flow={r['flow']:5.1f} m³/h, Power={r['power']:5.2f} kW, "
                      f"Pressure={r['pressure']:5.2f} bar, Head={r['head']:5.1f} m, "
                      f"Duration={r['duration']}s")
        else:
            print(f"{csv_file.name}: 유효 구간 없음 (비정상 데이터)")
    
    # 유량순 정렬 후 중복 제거 (유사 유량은 평균)
    all_points.sort(key=lambda x: x['flow'])
    
    # 결과 저장
    output_file = output_dir / 'stable_operating_points_2026.csv'
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['flow', 'power', 'pressure', 'head', 'duration', 
                      'std_flow', 'std_power', 'source_file']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_points)
    
    print("-" * 60)
    print(f"총 {len(all_points)}개 운전점 추출 완료")
    print(f"저장 위치: {output_file}")
    
    # 요약 통계
    print("\n=== 요약 ===")
    print(f"유량 범위: {min(p['flow'] for p in all_points):.1f} ~ {max(p['flow'] for p in all_points):.1f} m³/h")
    print(f"전력 범위: {min(p['power'] for p in all_points):.2f} ~ {max(p['power'] for p in all_points):.2f} kW")
    print(f"압력 범위: {min(p['pressure'] for p in all_points):.2f} ~ {max(p['pressure'] for p in all_points):.2f} bar")


if __name__ == '__main__':
    main()
