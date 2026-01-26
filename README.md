# AI Pump Simulator

**AI 기반 인버터 적용 펌프 성능분석 및 에너지 절감 시뮬레이터**

[![Next.js](https://img.shields.io/badge/Next.js-16.1.4-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8)](https://tailwindcss.com/)
[![Recharts](https://img.shields.io/badge/Recharts-2.x-ff7300)](https://recharts.org/)

---

## 📋 프로젝트 개요

### 배경
산업용 원심펌프는 산업 전력 사용량에서 상당한 비중을 차지하는 핵심 설비입니다. 기존 **밸브 교축 방식**은 에너지 손실이 크며, **인버터 회전수 제어** 방식으로 전환 시 상당한 에너지 절감이 가능합니다.

본 시뮬레이터는 다음을 정량적으로 분석합니다:
- 밸브 교축(Case A) vs 인버터+PID(Case B) vs 인버터+AI(Case C) 전력 비교
- 에너지 절감량 및 절감 비용 산출
- 투자 회수 기간(ROI) 계산
- 과도 응답 특성 시뮬레이션

### 핵심 목표
| 목표 | 설명 |
|-----|------|
| **에너지 절감 시각화** | Case A/B/C 전력 소비 비교 차트 |
| **ROI 산출** | 인버터 투자 회수 기간 계산 |
| **성능 분석** | Q-H, Q-P 곡선 및 효율 분석 |
| **제어 응답 시뮬레이션** | 변화시간, 오버슈트, 안정화시간 |

---

## 🎯 주요 기능

### 1. 대시보드 (`/`)
- **핵심 지표 카드**: 정격유량, 최대효율, 정격전력, 절감율
- **전력 비교 차트**: Case A/B/C 막대 그래프 (X축 15kW 고정)
- **Q-H 곡선**: 유량-양정 성능 곡선 + 효율 곡선
- **Q-P 곡선**: 유량-전력 곡선
- **운전점 테이블**: 7개 밸브 단계별 운전 데이터

### 2. 시뮬레이션 (`/simulation`)
- **과도 응답 시뮬레이션**: 유량 변화 시 시스템 응답 곡선
- **제어 모드**: 빠름 / 안정 / 부드러움
- **성능 지표**: 변화시간(Tr), 오버슈트(Mp), 안정화시간(Ts)
- **자동 업데이트**: 입력 변경 시 300ms 디바운스 적용

### 3. 에너지 분석 (`/energy`)
- **전력 비교**: Case A/B/C 상세 카드
- **ROI 계산**: 인버터 비용, 운전 시간, 전기요금 입력
- **절감 효과**: 시간당/일일/연간 절감량 + 5년/10년 누적 이익
- **투자 회수 기간**: 년/월 단위 표시

---

## 🔧 기술 스택

| 구분 | 기술 | 버전 | 용도 |
|-----|------|------|------|
| Framework | Next.js | 16.1.4 | App Router, API Routes |
| Frontend | React | 18 | UI 컴포넌트 |
| Styling | Tailwind CSS | 3.x | 반응형 디자인 |
| Charts | Recharts | 2.x | 데이터 시각화 |
| Deployment | Vercel | - | 서버리스 배포 |

---

## 📐 공학 공식

### 상사법칙 (Affinity Laws)
인버터 제어 시 전력 예측의 핵심 공식:

```
P₂/P₁ = (Q₂/Q₁)³
```

- 유량을 50%로 줄이면 → 전력은 12.5%만 필요 (0.5³ = 0.125)

### 인버터 전력 모델
```
P = P_fixed + (P_rated - P_fixed) × (Q/Q_rated)³
```

| 파라미터 | Case B (PID) | Case C (AI) |
|---------|-------------|-------------|
| P_fixed (고정손실) | 1.47 kW | 1.22 kW |
| P_rated (정격전력) | 13.6 kW | 13.6 kW |
| Q_rated (정격유량) | 25 m³/h | 25 m³/h |

### 양정 계산
```
H = (P_out - P_in) × 10.197  [m]
```

### 펌프 효율
```
η = (ρ × g × Q × H) / (P_input × 3600 × 1000) × 100  [%]
```

---

## 📊 운전 데이터

### 밸브 개도-유량 매핑

| 밸브 각도 | 단계 | 유량 (m³/h) | 전력 (kW) | 토출압력 (bar) | 효율 (%) |
|----------|------|------------|----------|---------------|----------|
| 0° | 0 | 0 | ~5.5 | ~16 | 0 |
| 45° | 1 | ~5 | ~7.5 | ~16 | ~32 |
| 90° | 2 | ~11 | ~10.4 | ~15.7 | ~45 |
| 135° | 3 | ~15 | ~11.9 | ~15 | ~52 |
| 180° | 4 | ~18 | ~12.5 | ~13 | ~55 |
| 225° | 5 | ~21 | ~13.2 | ~12 | ~57 |
| 270° | 6 | ~25 | ~13.6 | ~11.6 | ~58 |

### 데이터 스키마
```
No, DataTime, MilliSec, Main_Flow, IN_PT050, OUT_PT050, PT03,
LT01, TT01, TT050, Rpm, Main_VAC, Main_A, Main_kW, Main_Var,
Main_Vp, Main_Ap, Main_Bp, Main_Cp, Main_PF, Main_Hz, ...
```

---

## 🚀 설치 및 실행

### 요구 사항
- Node.js 18.x 이상
- npm 또는 yarn

### 설치
```bash
# 저장소 클론
git clone https://github.com/byunilhwang/ai-pump-simulator.git
cd ai-pump-simulator

# 의존성 설치
cd workspace
npm install

# 개발 서버 실행
npm run dev
```

### 빌드 및 배포
```bash
# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

### Vercel 배포
1. Vercel에서 GitHub 레포지토리 연결
2. **Root Directory**: `workspace` 설정
3. 자동 배포 완료

---

## 📁 프로젝트 구조

```
ai-pump-simulator/
├── workspace/                 # Next.js 앱 (Vercel root)
│   ├── app/
│   │   ├── api/              # API Routes
│   │   │   ├── calculate/    # 효율, ROI, 인버터 전력 계산
│   │   │   ├── case-comparison/
│   │   │   ├── operating-points/
│   │   │   └── simulation/
│   │   ├── page.tsx          # 대시보드
│   │   ├── energy/           # 에너지 분석
│   │   └── simulation/       # 시뮬레이션
│   ├── components/
│   │   ├── charts/           # QHChart, QPChart, EnergyCompareChart
│   │   ├── layout/           # Header
│   │   └── ui/               # StatCard, InfoTooltip, Slider
│   ├── lib/
│   │   ├── constants.ts      # 상수 정의
│   │   ├── csv-parser.ts     # CSV 파싱
│   │   ├── energy-calculations.ts
│   │   ├── metrics.ts        # 제어 응답 지표
│   │   ├── pump-calculations.ts
│   │   └── simulation.ts
│   └── data/
│       └── 2026/             # CSV 데이터
├── .gitignore
└── README.md
```

---

## 🎨 UI/UX 특징

### 색상 체계
| 요소 | 색상 | 용도 |
|-----|------|------|
| Case A | `#ef4444` (빨강) | 밸브 교축 (비효율) |
| Case B | `#f59e0b` (주황) | PID 제어 |
| Case C | `#22c55e` (초록) | AI 제어 (최적) |
| Q-H 곡선 | `#06b6d4` (시안) | 성능 곡선 |
| 효율 | `#8b5cf6` (보라) | 효율 곡선 |

### 슬라이더 UI
- 안드로이드 스타일 트랙 (어두운 배경 + 채워진 부분)
- 범위 마커 표시
- 퍼센트 배지

### 반응형 디자인
- 1024px 이상: 2열 그리드
- 768px 미만: 1열 스택

---

## 📈 성능 지표

### 에너지 절감 예상
- **정격 유량(25 m³/h)**: 최소 2% 절감 보장
- **부분 유량(~50%)**: 최대 70%+ 절감 가능

### 제어 응답 특성
| 모드 | 시간상수(τ) | 감쇠비(ζ) | 특성 |
|-----|------------|----------|------|
| 빠름 | 1.5초 | 0.5 | 오버슈트 있음 |
| 안정 | 2.5초 | 0.707 | 균형 |
| 부드러움 | 4.0초 | 1.0 | 오버슈트 없음 |

---

## 🔒 보안

- Next.js 16.1.4 사용 (CVE-2024-34351, CVE-2024-46982, CVE-2025-29927 패치됨)
- 인증/인가 불필요 (읽기 전용 시뮬레이터)
- 환경변수 미사용 (정적 데이터)

---

## 📝 라이선스

이 프로젝트는 공동과제 평가용으로 제작되었습니다.

---

## 👥 팀

- **개발**: 붐코 (S/W SI)
- **데이터**: 야정 (H/W 펌프 제조)
- **과제**: AI 기반 인버터 적용 펌프 성능분석 시스템

---

## 📸 스크린샷

> 스크린샷은 배포 후 추가 예정입니다.
> 
> 추가 방법:
> 1. 배포된 사이트 접속
> 2. 각 페이지 스크린샷 캡처 (/, /simulation, /energy)
> 3. `workspace/public/screenshots/` 폴더에 저장
> 4. 이 README에 이미지 링크 추가
