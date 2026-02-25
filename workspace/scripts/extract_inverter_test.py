#!/usr/bin/env python3
"""
2월 인버터 압력 제어 테스트 데이터 추출 스크립트

압력별(5/7.5/10 bar) 테스트 데이터에서 안정 구간을 추출하여
에너지 절감 검증용 CSV를 생성합니다.
"""

import csv
from pathlib import Path


def extract_stable_by_flow(filepath, target_pressure_min, target_pressure_max):
    """유량별 안정 데이터 추출"""
    flow_groups = {}
    
    with open(filepath, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader)  # 헤더 스킵
        
        for row in reader:
            try:
                flow = float(row[3])
                pressure = float(row[5])
                power = float(row[13])
                
                # 목표 압력 범위 내 데이터만
                if target_pressure_min <= pressure <= target_pressure_max:
                    flow_bin = int(flow / 5) * 5  # 5 단위로 그룹핑
                    if flow_bin not in flow_groups:
                        flow_groups[flow_bin] = []
                    flow_groups[flow_bin].append({
                        'flow': flow,
                        'power': power,
                        'pressure': pressure
                    })
            except (IndexError, ValueError):
                continue
    
    # 각 그룹의 평균 계산
    results = []
    for flow_bin, data in sorted(flow_groups.items()):
        if len(data) >= 10:  # 최소 10개 샘플
            avg_flow = sum(d['flow'] for d in data) / len(data)
            avg_power = sum(d['power'] for d in data) / len(data)
            avg_pressure = sum(d['pressure'] for d in data) / len(data)
            
            results.append({
                'flow': round(avg_flow, 1),
                'power': round(avg_power, 2),
                'pressure': round(avg_pressure, 2),
                'head': round(avg_pressure * 10.197, 1),
                'n_samples': len(data)
            })
    
    return results


def main():
    base_dir = Path(__file__).parent.parent
    phase2_dir = base_dir.parent / 'documents' / 'project' / 'phase2'
    output_dir = base_dir / 'data' / 'processed'
    output_dir.mkdir(parents=True, exist_ok=True)
    
    all_data = []
    
    # 10 bar 테스트
    print("=== 10 bar Test ===")
    data_10bar = extract_stable_by_flow(
        phase2_dir / '10 bar Test_20260213_171525.csv',
        9.5, 10.5
    )
    for d in data_10bar:
        d['target_pressure'] = 10
        d['source'] = '10 bar Test'
        all_data.append(d)
        print(f"  Flow={d['flow']:5.1f}, Power={d['power']:5.2f} kW, Pressure={d['pressure']:.2f} bar")
    
    # 7.5 bar 테스트 (두 파일 병합)
    print("\n=== 7.5 bar Test ===")
    data_75bar_1 = extract_stable_by_flow(
        phase2_dir / '7.5 bar Test_01_20260213_165403.csv',
        7.0, 8.0
    )
    data_75bar_2 = extract_stable_by_flow(
        phase2_dir / '7.5bar Test_02_20260213_170000.csv',
        7.0, 8.0
    )
    
    # 병합
    combined_75 = {}
    for d in data_75bar_1 + data_75bar_2:
        flow_key = round(d['flow'])
        if flow_key not in combined_75:
            combined_75[flow_key] = []
        combined_75[flow_key].append(d)
    
    for flow_key in sorted(combined_75.keys()):
        items = combined_75[flow_key]
        avg_flow = sum(d['flow'] for d in items) / len(items)
        avg_power = sum(d['power'] for d in items) / len(items)
        avg_pressure = sum(d['pressure'] for d in items) / len(items)
        total_samples = sum(d['n_samples'] for d in items)
        
        merged = {
            'flow': round(avg_flow, 1),
            'power': round(avg_power, 2),
            'pressure': round(avg_pressure, 2),
            'head': round(avg_pressure * 10.197, 1),
            'n_samples': total_samples,
            'target_pressure': 7.5,
            'source': '7.5 bar Test'
        }
        all_data.append(merged)
        print(f"  Flow={merged['flow']:5.1f}, Power={merged['power']:5.2f} kW, Pressure={merged['pressure']:.2f} bar")
    
    # 5 bar 테스트
    print("\n=== 5 bar Test ===")
    data_5bar = extract_stable_by_flow(
        phase2_dir / '5 bar Test_20260213_161334.csv',
        4.5, 5.5
    )
    for d in data_5bar:
        d['target_pressure'] = 5
        d['source'] = '5 bar Test'
        all_data.append(d)
        print(f"  Flow={d['flow']:5.1f}, Power={d['power']:5.2f} kW, Pressure={d['pressure']:.2f} bar")
    
    # CSV 저장
    output_file = output_dir / 'inverter_control_test_202602.csv'
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        fieldnames = ['target_pressure', 'flow', 'power', 'pressure', 'head', 'n_samples', 'source']
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(sorted(all_data, key=lambda x: (x['target_pressure'], x['flow'])))
    
    print(f"\n저장 완료: {output_file}")
    print(f"총 {len(all_data)}개 데이터 포인트")


if __name__ == '__main__':
    main()
