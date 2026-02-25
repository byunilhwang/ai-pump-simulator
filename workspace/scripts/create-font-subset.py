#!/usr/bin/env python3
"""
서브셋 폰트 생성 스크립트
보고서에 사용되는 한글 글자만 추출하여 경량화된 폰트 생성
"""

from fontTools import subset
from fontTools.ttLib import TTFont
import base64
import os

# 보고서에서 사용되는 모든 텍스트
KOREAN_TEXTS = """
인버터 적용 원심펌프 성능분석 보고서
가변속 구동장치 시스템 사양
이론적 배경 펌프 성능 곡선
에너지 절감 분석 과도응답 분석
투자 회수 분석 참고문헌

파라미터 값 비고 정격유량 정격양정 정격전력
최대효율 단계 유량 양정 전력 수력전력 효율
제어방식별 소비전력 비교 목표유량
밸브교축 기준 제어 응답 특성 모드
상승시간 오버슈트 안정화시간 시험조건

빠른응답 안정적응답 부드러운응답
운전조건 인버터설치비용 일일가동시간
연간가동일수 전기요금 연간에너지절감량
연간비용절감 투자회수기간

문서번호 생성일 생성자 시뮬레이터
상사법칙 전달함수 감쇠비 고유진동수
관성모멘트 토크 각운동량 방정식 식

에따라 비례하여 감소 절감 속도비 승
으로 결정됨 반비례 균형 적용 근거 기반
자동생성 본 문서는 에의해 자동으로 생성되었습니다

만 천 백 십 원 년 월 일 시간 시 분 초
계산 결과 표 그림 장 절 항 참조
입력 출력 변환 제어 시스템 모델

케이스 방식 밸브 인버터 속도제어

은 는 이 가 을 를 의 에 와 과 로 으로 도 만 까지
한 된 하 되 다 고 며 나 라 마 바 사 아 자 차 카 타 파 하
한다 된다 한다 감소한다 절감된다 결정된다 기반하며 산출되었다
완전개방 토출압력 입력전력 회전속도
여기서 지표 운전점 데이터
좌 우 및 점 선
"""

# 기본 문자 (영문, 숫자, 특수문자)
BASIC_CHARS = """
ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz
0123456789
!@#$%^&*()_+-=[]{}|;':",./<>?`~
 　
"""

def get_unique_chars(text):
    """텍스트에서 고유 문자 추출"""
    chars = set()
    for char in text:
        if char.strip() or char == ' ':
            chars.add(char)
    return ''.join(sorted(chars))

def create_subset_font(input_path, output_path, chars):
    """서브셋 폰트 생성"""
    # 서브셋 옵션 설정
    options = subset.Options()
    options.flavor = None  # TTF 유지
    options.desubroutinize = True
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6]  # 기본 이름 테이블만 유지
    options.notdef_outline = True
    
    # 폰트 로드
    font = TTFont(input_path)
    
    # 서브셋 생성
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(text=chars)
    subsetter.subset(font)
    
    # 저장
    font.save(output_path)
    return output_path

def font_to_base64(font_path):
    """폰트 파일을 Base64로 인코딩"""
    with open(font_path, 'rb') as f:
        return base64.b64encode(f.read()).decode('utf-8')

def create_ts_file(base64_data, output_path):
    """TypeScript 파일 생성"""
    ts_content = f'''// 자동 생성된 파일 - 수정하지 마세요
// Noto Sans KR 서브셋 폰트 (보고서용 한글만 포함)
// 생성일: {os.popen("date '+%Y-%m-%d %H:%M:%S'").read().strip()}

export const NOTO_SANS_KR_REGULAR_BASE64 = "{base64_data}";
'''
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(ts_content)

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    workspace_dir = os.path.dirname(script_dir)
    
    input_font = os.path.join(workspace_dir, 'public/fonts/NotoSansKR-Regular.ttf')
    output_font = os.path.join(workspace_dir, 'public/fonts/NotoSansKR-Subset.ttf')
    output_ts = os.path.join(workspace_dir, 'lib/fonts/noto-sans-kr.ts')
    
    # 출력 디렉토리 생성
    os.makedirs(os.path.dirname(output_ts), exist_ok=True)
    
    # 사용할 문자 수집
    all_chars = get_unique_chars(KOREAN_TEXTS + BASIC_CHARS)
    print(f"포함할 문자 수: {len(all_chars)}")
    print(f"문자 목록: {all_chars[:100]}...")
    
    # 서브셋 폰트 생성
    print(f"\n서브셋 폰트 생성 중...")
    create_subset_font(input_font, output_font, all_chars)
    
    # 파일 크기 확인
    original_size = os.path.getsize(input_font)
    subset_size = os.path.getsize(output_font)
    print(f"원본 크기: {original_size / 1024:.1f} KB")
    print(f"서브셋 크기: {subset_size / 1024:.1f} KB")
    print(f"압축률: {(1 - subset_size/original_size) * 100:.1f}%")
    
    # Base64 인코딩 및 TS 파일 생성
    print(f"\nBase64 인코딩 중...")
    base64_data = font_to_base64(output_font)
    print(f"Base64 크기: {len(base64_data) / 1024:.1f} KB")
    
    print(f"\nTypeScript 파일 생성 중...")
    create_ts_file(base64_data, output_ts)
    print(f"생성 완료: {output_ts}")

if __name__ == '__main__':
    main()
