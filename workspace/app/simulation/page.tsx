'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import InfoTooltip from '@/components/ui/InfoTooltip';
import Slider from '@/components/ui/Slider';
import PdfGenerator from '@/components/pdf/PdfGenerator';

type ControlMode = 'fast' | 'stable' | 'smooth';

interface TransientData {
  time: number;
  flow: number;
  power: number;
}

interface ResponseMetrics {
  transitionTime: number;
  overshoot: number;
  settlingTime: number;
}

interface OperatingPoint {
  stage: number;
  valveAngle: number;
  flow: number;
  head: number;
  power: number;
  hydraulicPower: number;
  efficiency: number;
  outletPressure: number;
}

// 고정 축 범위 상수 (Phase 2 스펙 반영)
const FIXED_AXIS = {
  FLOW_MAX: 25,    // m³/h (정격 20.5 + 여유)
  POWER_MAX: 18,   // kW (정격 15 + 여유)
};

export default function SimulationPage() {
  // 유량 제어 상태
  const [startFlow, setStartFlow] = useState(0);
  const [targetFlow, setTargetFlow] = useState(15);
  const [mode, setMode] = useState<ControlMode>('stable');
  const [data, setData] = useState<TransientData[]>([]);
  const [metrics, setMetrics] = useState<ResponseMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [fixedAxis, setFixedAxis] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  
  // PDF용 데이터
  const [operatingPoints, setOperatingPoints] = useState<OperatingPoint[]>([]);
  const [energyData, setEnergyData] = useState({
    caseA: 0,
    caseB: 0,
    caseC: 0,
    savingPercent: 0,
  });
  const [roiData, setRoiData] = useState({
    inverterCost: 5000000,
    dailyRunHours: 16,
    yearlyDays: 300,
    electricityRate: 95,
    yearlySavingKWh: 0,
    yearlySavingKRW: 0,
    roiYears: null as number | null,
  });
  
  // Debounce timer ref
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const runSimulation = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/simulation/transient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startFlow,
          targetFlow,
          mode,
          duration: 30,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setData(result.data.timeSeries);
        setMetrics(result.data.metrics);
      }
    } finally {
      setLoading(false);
    }
  }, [startFlow, targetFlow, mode]);

  // 값 변경 시 자동 업데이트 (debounce 300ms)
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      runSimulation();
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [runSimulation]);

  // PDF용 데이터 로드 (운전점)
  useEffect(() => {
    fetch('/api/operating-points')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setOperatingPoints(data.data);
        }
      });
  }, []);

  // PDF용 데이터 로드 (에너지 비교)
  useEffect(() => {
    fetch(`/api/case-comparison?flow=${targetFlow}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setEnergyData({
            caseA: data.data.powerComparison.caseA.power,
            caseB: data.data.powerComparison.caseB.power,
            caseC: data.data.powerComparison.caseC.power,
            savingPercent: data.data.savings.cVsA,
          });
        }
      });
  }, [targetFlow]);

  // PDF용 데이터 로드 (ROI)
  useEffect(() => {
    fetch('/api/calculate/roi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inverterCost: roiData.inverterCost,
        dailyRunHours: roiData.dailyRunHours,
        yearlyDays: roiData.yearlyDays,
        electricityRate: roiData.electricityRate,
        targetFlow,
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRoiData(prev => ({
            ...prev,
            yearlySavingKWh: data.data.result.yearlySavingKWh,
            yearlySavingKRW: data.data.result.yearlySavingKRW,
            roiYears: data.data.result.roiYears,
          }));
        }
      });
  }, [targetFlow, roiData.inverterCost, roiData.dailyRunHours, roiData.yearlyDays, roiData.electricityRate]);

  const modeOptions = [
    {
      value: 'fast',
      label: '빠른 응답',
      description: '최소 시간, 높은 오버슈트',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
    },
    {
      value: 'stable',
      label: '안정적 응답',
      description: '균형잡힌 성능',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-300',
    },
    {
      value: 'smooth',
      label: '부드러운 응답',
      description: '오버슈트 없음, 느린 응답',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-300',
    },
  ];

  // 상승/하강 판별
  const isRising = targetFlow > startFlow;
  const isNoChange = Math.abs(targetFlow - startFlow) < 0.5;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">과도 응답 시뮬레이션</h1>
          <p className="text-slate-600 mt-2">제어 모드별 응답 특성 분석</p>
        </div>
        <PdfGenerator
          operatingPoints={operatingPoints}
          transientData={data}
          transientMetrics={metrics}
          startFlow={startFlow}
          targetFlow={targetFlow}
          controlMode={mode}
          energyData={energyData}
          roiData={roiData}
          onGenerating={setPdfGenerating}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 설정 패널 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-900">유량 제어 설정</h3>
            <InfoTooltip title="과도 응답이란?">
              <p><strong>과도 응답(Transient Response)</strong></p>
              <p className="text-slate-400 text-xs mt-1">시스템이 한 상태에서 다른 상태로 변할 때 나타나는 일시적인 반응입니다.</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-slate-300">
                <li><strong>빠른 응답</strong>: 목표에 빨리 도달하지만 튀어오름(오버슈트) 발생</li>
                <li><strong>안정적 응답</strong>: 속도와 안정성의 균형</li>
                <li><strong>부드러운 응답</strong>: 천천히 부드럽게 도달, 기계 수명에 유리</li>
              </ul>
              
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-2">📐 물리 기반 동적 모델</p>
                <div className="space-y-2 bg-slate-100 rounded-lg p-3">
                  <div className="text-xs text-slate-600">
                    <p className="font-mono text-cyan-600">각운동량 방정식:</p>
                    <p className="ml-2">I × dω/dt = T<sub>motor</sub> - T<sub>load</sub></p>
                  </div>
                  <div className="text-xs text-slate-600">
                    <p className="font-mono text-cyan-600">2차 시스템 응답:</p>
                    <p className="ml-2">G(s) = ωₙ² / (s² + 2ζωₙs + ωₙ²)</p>
                  </div>
                  <div className="text-xs text-slate-600">
                    <p className="font-mono text-cyan-600">오버슈트:</p>
                    <p className="ml-2">%OS = 100 × e<sup>-ζπ/√(1-ζ²)</sup></p>
                  </div>
                </div>
                <p className="mt-2 text-slate-500 text-xs">
                  💡 시간상수와 오버슈트가 변화량(Δ)과 목표 유량에 따라 동적으로 조정됩니다.
                </p>
              </div>
              
              <div className="mt-4 pt-3 border-t border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-2">📚 참고 문헌</p>
                <div className="space-y-2 text-xs">
                  <div className="border-l-2 border-cyan-500 pl-2 bg-cyan-50 rounded-r p-2">
                    <a 
                      href="https://www.nature.com/articles/s41598-024-57693-9" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-cyan-600 hover:text-cyan-500 hover:underline"
                    >
                      A theoretical model for predicting the startup performance of pumps as turbines (2024)
                    </a>
                    <p className="text-slate-500">- Zhang, Zhao & Zhu</p>
                    <p className="text-slate-600 mt-1 text-[10px]">
                      → 각운동량 방정식 (I × dω/dt), 비정상 베르누이 방정식, tanh 기반 속도 응답 모델
                    </p>
                  </div>
                  <div className="border-l-2 border-amber-500 pl-2 bg-amber-50 rounded-r p-2">
                    <a 
                      href="https://www.nature.com/articles/s41598-025-27662-x" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-amber-600 hover:text-amber-500 hover:underline"
                    >
                      Reduced-order linearized dynamic model for induction motor-driven centrifugal fan-pump system (2025)
                    </a>
                    <p className="text-slate-500">- Turkeri et al.</p>
                    <p className="text-slate-600 mt-1 text-[10px]">
                      → 3차 선형화 전달함수, 유량 동역학 상수(χ), 2차 시스템 응답 G(s) = ωₙ²/(s²+2ζωₙs+ωₙ²)
                    </p>
                  </div>
                  <div className="border-l-2 border-purple-500 pl-2 bg-purple-50 rounded-r p-2">
                    <a 
                      href="https://neutrium.net/articles/equipment/estimation-of-pump-moment-of-inertia/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-500 hover:underline"
                    >
                      Estimation of Pump Moment of Inertia
                    </a>
                    <p className="text-slate-500">- Neutrium (Wylie et al.)</p>
                    <p className="text-slate-600 mt-1 text-[10px]">
                      → 관성 모멘트 추정 공식: I = 1.5×10⁷×(P/N³)⁰·⁹⁵⁵⁶, 시간상수-관성 관계
                    </p>
                  </div>
                </div>
              </div>
            </InfoTooltip>
          </div>
          
          {/* 유량 제어 설정 */}
          <div className="space-y-6">
              <Slider
                value={startFlow}
                min={0}
                max={20}
                step={1}
                onChange={setStartFlow}
                size="large"
                label="시작 유량"
                unit="m³/h"
                markers={[0, 5, 10, 15, 20]}
              />

              <Slider
                value={targetFlow}
                min={0}
                max={20}
                step={1}
                onChange={setTargetFlow}
                size="large"
                label="목표 유량"
                unit="m³/h"
                markers={[0, 5, 10, 15, 20]}
              />

              {/* 상승/하강 표시 */}
              <div className="flex items-center justify-center p-2 rounded-lg bg-slate-100">
                {isNoChange ? (
                  <span className="text-slate-500 text-sm">⏸ 변화 없음</span>
                ) : isRising ? (
                  <span className="text-green-600 text-sm">📈 상승 ({startFlow} → {targetFlow})</span>
                ) : (
                  <span className="text-amber-600 text-sm">📉 하강 ({startFlow} → {targetFlow})</span>
                )}
              </div>

              <div>
                <label className="text-sm text-slate-600">제어 모드</label>
                <div className="mt-2 space-y-2">
                  {modeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setMode(option.value as ControlMode)}
                      className={`w-full p-3 rounded-lg border transition-all text-left ${
                        mode === option.value
                          ? `${option.bgColor} ${option.borderColor}`
                          : 'bg-slate-50 border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <p className={`font-medium ${mode === option.value ? option.color : 'text-slate-900'}`}>
                        {option.label}
                      </p>
                      <p className="text-xs text-slate-500">{option.description}</p>
                    </button>
                  ))}
                </div>
              </div>
          </div>
        </div>

        {/* 결과 패널 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 지표 카드 (1줄) */}
          <div className="grid grid-cols-3 gap-3">
            {/* 변화 시간 */}
            <div className="bg-white rounded-lg px-4 py-3 border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-sm text-slate-600">변화 시간</span>
                <InfoTooltip title="변화 시간 (Transition Time)">
                  <p><strong>변화 시간이란?</strong></p>
                  <p>시작 유량에서 목표 유량까지 10% → 90% 도달하는 데 걸리는 시간입니다.</p>
                  <p className="mt-2 text-slate-500 text-xs">
                    💡 값이 작을수록 빠르게 목표에 도달합니다.
                  </p>
                </InfoTooltip>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-cyan-600">
                  {metrics?.transitionTime.toFixed(1) ?? '-'}
                </span>
                <span className="text-slate-500 text-xs">초</span>
              </div>
            </div>

            {/* 오버슈트 */}
            <div className="bg-white rounded-lg px-4 py-3 border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-sm text-slate-600">오버슈트</span>
                <InfoTooltip title="오버슈트 (Overshoot)">
                  <p><strong>오버슈트란?</strong></p>
                  <p>목표값을 지나쳐서 튀어오른 정도를 백분율로 표시합니다.</p>
                  <p className="mt-2 text-slate-500 text-xs">
                    💡 오버슈트가 클수록 진동이 심하고 기계 수명에 불리합니다.
                  </p>
                </InfoTooltip>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-xl font-bold ${metrics && metrics.overshoot > 10 ? 'text-red-600' : 'text-green-600'}`}>
                  {metrics?.overshoot.toFixed(1) ?? '-'}
                </span>
                <span className="text-slate-500 text-xs">%</span>
              </div>
            </div>

            {/* 안정화 시간 */}
            <div className="bg-white rounded-lg px-4 py-3 border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-sm text-slate-600">안정화 시간</span>
                <InfoTooltip title="안정화 시간 (Settling Time)">
                  <p><strong>안정화 시간이란?</strong></p>
                  <p>시스템이 목표값의 ±2% 오차 범위 안에 완전히 들어오는 데 걸리는 시간입니다.</p>
                  <p className="mt-2 text-slate-500 text-xs">
                    💡 값이 작을수록 빠르게 안정 상태에 도달합니다.
                  </p>
                </InfoTooltip>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-amber-600">
                  {metrics?.settlingTime.toFixed(1) ?? '-'}
                </span>
                <span className="text-slate-500 text-xs">초</span>
              </div>
            </div>
          </div>

          {/* 응답 곡선 */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-slate-900">과도 응답 곡선</h3>
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-cyan-600"></div>
                )}
              </div>
              <button
                onClick={() => setFixedAxis(!fixedAxis)}
                className={`px-3 py-1.5 text-xs rounded-lg transition-all ${
                  fixedAxis
                    ? 'bg-cyan-50 text-cyan-700 border border-cyan-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-300 hover:border-slate-400'
                }`}
              >
                {fixedAxis ? '고정 축 ON' : '고정 축 OFF'}
              </button>
            </div>

            <ResponsiveContainer width="100%" height={480}>
              <LineChart data={data} margin={{ top: 20, right: 60, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  label={{ value: '시간 (초)', position: 'insideBottom', offset: -10, fill: '#64748b' }}
                />
                <YAxis
                  yAxisId="flow"
                  stroke="#64748b"
                  domain={fixedAxis ? [0, FIXED_AXIS.FLOW_MAX] : [0, Math.max(targetFlow, startFlow, 1) * 1.3]}
                  label={{ value: '유량 (m³/h)', angle: -90, position: 'insideLeft', fill: '#64748b' }}
                />
                <YAxis
                  yAxisId="power"
                  orientation="right"
                  stroke="#64748b"
                  domain={fixedAxis ? [0, FIXED_AXIS.POWER_MAX] : ['auto', 'auto']}
                  label={{ value: '전력 (kW)', angle: 90, position: 'insideRight', fill: '#64748b' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  }}
                  formatter={(value, name) => {
                    const unit = (name as string).includes('유량') ? ' m³/h' : ' kW';
                    return [`${(value as number).toFixed(2)}${unit}`, name as string];
                  }}
                />
                <Legend verticalAlign="top" height={36} />
                <ReferenceLine
                  yAxisId="flow"
                  y={targetFlow}
                  stroke="#16a34a"
                  strokeDasharray="5 5"
                  label={{ value: '목표', fill: '#16a34a', fontSize: 12 }}
                />
                <ReferenceLine
                  yAxisId="flow"
                  y={startFlow}
                  stroke="#64748b"
                  strokeDasharray="3 3"
                  label={{ value: '시작', fill: '#64748b', fontSize: 12 }}
                />
                <Line
                  yAxisId="flow"
                  type="monotone"
                  dataKey="flow"
                  stroke="#0891b2"
                  strokeWidth={2}
                  dot={false}
                  name="유량"
                />
                <Line
                  yAxisId="power"
                  type="monotone"
                  dataKey="power"
                  stroke="#d97706"
                  strokeWidth={2}
                  dot={false}
                  name="전력"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
