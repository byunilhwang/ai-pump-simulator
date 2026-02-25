'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import InfoTooltip from '@/components/ui/InfoTooltip';
import Slider from '@/components/ui/Slider';

interface CaseComparison {
  targetFlow: number;
  powerComparison: {
    caseA: { name: string; power: number; description: string };
    caseB: { name: string; power: number; description: string };
    caseC: { name: string; power: number; description: string };
  };
  savings: {
    bVsA: number;
    cVsA: number;
  };
}

interface ROIResult {
  valvePower: number;
  inverterPower: number;
  dailySavingKWh: number;
  yearlySavingKWh: number;
  yearlySavingKRW: number;
  roiYears: number | null;
  roiMonths: number | null;
  fiveYearSaving: number;
  tenYearSaving: number;
}

// Case별 상세 정보
const caseDetails = {
  caseA: {
    method: '정속 운전 + 밸브 교축',
    features: '밸브로 유량 조절, 손실 에너지 발생',
  },
  caseB: {
    method: '인버터 + PID 제어',
    features: '회전수 제어로 유량 조절',
  },
  caseC: {
    method: '인버터 + AI 제어',
    features: '적응형 제어로 최적 운전',
  },
};

// Phase 2 스펙 반영
const RATED_FLOW = 20.5;

export default function EnergyPage() {
  const [targetFlow, setTargetFlow] = useState(12);
  const [comparison, setComparison] = useState<CaseComparison | null>(null);
  const [loading, setLoading] = useState(false);
  
  // ROI 관련 상태
  const [roiInputs, setRoiInputs] = useState({
    inverterCost: 5000000,
    dailyRunHours: 16,
    yearlyDays: 300,
    electricityRate: 95,
  });
  const [roiResult, setRoiResult] = useState<ROIResult | null>(null);
  
  // Debounce ref
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/case-comparison?flow=${targetFlow}`)
      .then(res => res.json())
      .then((caseData) => {
        if (caseData.success) {
          setComparison(caseData.data);
        }
      })
      .finally(() => setLoading(false));
  }, [targetFlow]);

  // ROI 계산 (debounce)
  const calculateROI = useCallback(async () => {
    const res = await fetch('/api/calculate/roi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...roiInputs,
        targetFlow,
      }),
    });
    const data = await res.json();
    if (data.success) {
      setRoiResult(data.data.result);
    }
  }, [roiInputs, targetFlow]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      calculateROI();
    }, 300);
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [calculateROI]);

  const fixedMaxPower = 15;  // 실측 최대 13.59kW + 여유

  const calculateSavings = () => {
    if (!comparison) return { daily: 0, yearly: 0, yearlyCost: 0, savingPower: 0 };
    
    const savingPower = comparison.powerComparison.caseA.power - comparison.powerComparison.caseC.power;
    const daily = savingPower * roiInputs.dailyRunHours;
    const yearly = daily * roiInputs.yearlyDays;
    const yearlyCost = yearly * roiInputs.electricityRate;
    
    return { daily, yearly, yearlyCost, savingPower };
  };

  const savings = calculateSavings();

  // 차트 데이터
  const chartData = comparison ? [
    {
      name: 'Case A\n밸브 교축',
      power: comparison.powerComparison.caseA.power,
      fill: '#ef4444',
      saving: 0,
      details: caseDetails.caseA,
    },
    {
      name: 'Case B\nPID 제어',
      power: comparison.powerComparison.caseB.power,
      fill: '#f59e0b',
      saving: comparison.savings.bVsA,
      details: caseDetails.caseB,
    },
    {
      name: 'Case C\nAI 제어',
      power: comparison.powerComparison.caseC.power,
      fill: '#22c55e',
      saving: comparison.savings.cVsA,
      details: caseDetails.caseC,
    },
  ] : [];

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">에너지 분석</h1>
        <p className="text-slate-600 mt-2">전력 소비 비교 및 투자 회수 기간 산출</p>
      </div>

      {/* 유량 선택 */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">운전 유량 선택</h3>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-cyan-600">{targetFlow}</span>
            <span className="text-slate-500">m³/h</span>
          </div>
        </div>
        
        <Slider
          value={targetFlow}
          min={0}
          max={20}
          step={1}
          onChange={setTargetFlow}
          size="large"
          markers={[0, 4, 8, 12, 16, 20]}
          showPercent={true}
        />
      </div>

      {/* 전력 비교 차트 */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <h3 className="text-lg font-semibold text-slate-900">전력 비교</h3>
            <InfoTooltip title="에너지 절감 계산 모델">
              <p><strong>상사법칙 (Affinity Laws)</strong></p>
              <p className="text-slate-400 text-xs mt-1">펌프의 회전수(속도)와 유량, 양정, 전력 사이의 관계를 설명하는 법칙입니다.</p>
              
              <div className="mt-3 space-y-2 bg-slate-900/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 font-mono text-sm">Q₂/Q₁ = n₂/n₁</span>
                  <span className="text-slate-400 text-xs">유량은 회전수에 비례</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 font-mono text-sm">H₂/H₁ = (n₂/n₁)²</span>
                  <span className="text-slate-400 text-xs">양정은 회전수의 제곱</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-200 font-mono text-sm">P₂/P₁ = (n₂/n₁)³</span>
                  <span className="text-slate-400 text-xs">전력은 회전수의 세제곱</span>
                </div>
              </div>
              <p className="mt-2 text-slate-400 text-xs">
                💡 유량을 50%로 줄이면 전력은 12.5%만 필요합니다 (0.5³ = 0.125)
              </p>
              
              <div className="mt-4 pt-3 border-t border-slate-700">
                <p className="text-xs font-semibold text-slate-300 mb-2">📚 참고 문헌</p>
                <div className="space-y-2">
                  <div className="border-l-2 border-cyan-500 pl-2 bg-slate-900/30 rounded-r p-2">
                    <a href="https://energy.gov/sites/prod/files/2014/05/f16/pump.pdf" target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:underline">
                      Improving Pumping System Performance: A Sourcebook for Industry (2006)
                    </a>
                    <p className="text-xs text-slate-500">U.S. DOE, Lawrence Berkeley National Laboratory</p>
                    <p className="text-[10px] text-slate-400 mt-1">→ 상사법칙 공식 (Q, H, P 비례관계), 펌프 시스템 효율 계산</p>
                  </div>
                  <div className="border-l-2 border-amber-500 pl-2 bg-slate-900/30 rounded-r p-2">
                    <a href="https://library.e.abb.com/public/a53a9daf528c44f5b75907fc5509ae3f/TechnicalNote013-PowerthroughtheVFD.pdf" target="_blank" rel="noopener noreferrer" className="text-xs text-amber-400 hover:underline">
                      Technical Note 013: Power flow within a VFD
                    </a>
                    <p className="text-xs text-slate-500">ABB Inc.</p>
                    <p className="text-[10px] text-slate-400 mt-1">→ VFD 효율 모델, 인버터 전력 손실 계산</p>
                  </div>
                  <div className="border-l-2 border-purple-500 pl-2 bg-slate-900/30 rounded-r p-2">
                    <a href="https://energyefficiency.ornl.gov/wp-content/uploads/2020/10/Variable-Speed-Pump-Efficiency-Calculation-For-Fluid-Flow-Systems-with-and-without-Static-Head.pdf" target="_blank" rel="noopener noreferrer" className="text-xs text-purple-400 hover:underline">
                      Variable-Speed Pump Efficiency Calculation (2020)
                    </a>
                    <p className="text-xs text-slate-500">Wei Guo et al., Oak Ridge National Laboratory</p>
                    <p className="text-[10px] text-slate-400 mt-1">→ 정압 헤드 고려 효율 공식, 가변속 펌프 에너지 절감률</p>
                  </div>
                  <div className="border-l-2 border-green-500 pl-2 bg-slate-900/30 rounded-r p-2">
                    <a href="https://www.nature.com/articles/s41598-025-23158-w" target="_blank" rel="noopener noreferrer" className="text-xs text-green-400 hover:underline">
                      Deep learning approach to energy consumption modeling in wastewater pumping systems
                    </a>
                    <p className="text-xs text-slate-500">Nature Scientific Reports</p>
                    <p className="text-[10px] text-slate-400 mt-1">→ AI 기반 에너지 예측 모델, 실시간 최적화 알고리즘 참조</p>
                  </div>
                </div>
              </div>
            </InfoTooltip>
          </div>
          {comparison && (
            <div className="flex items-center gap-2 bg-green-50 px-3 py-1 rounded-full border border-green-200">
              <span className="text-green-600 font-bold">
                {Math.round(comparison.savings.cVsA)}%
              </span>
              <span className="text-green-600 text-sm">절감</span>
            </div>
          )}
        </div>

        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 60, left: 80, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis
              type="number"
              stroke="#64748b"
              domain={[0, fixedMaxPower]}
              tickFormatter={(value) => `${value}`}
              label={{ value: '전력 (kW)', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 12 }}
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#64748b"
              width={80}
              tick={{ fill: '#64748b', fontSize: 12 }}
            />
            <Bar dataKey="power" radius={[0, 8, 8, 0]} isAnimationActive={false}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
              <LabelList 
                dataKey="power" 
                position="right" 
                fill="#64748b"
                formatter={(value: unknown) => `${(value as number).toFixed(1)} kW`}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Case 상세 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {chartData.map((item, index) => (
            <div 
              key={index}
              className={`rounded-lg p-4 border ${
                index === 0 ? 'bg-red-50 border-red-200' :
                index === 1 ? 'bg-amber-50 border-amber-200' :
                'bg-green-50 border-green-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-semibold ${
                  index === 0 ? 'text-red-600' :
                  index === 1 ? 'text-amber-600' :
                  'text-green-600'
                }`}>
                  {item.name.replace('\n', ' ')}
                </span>
                {item.saving > 0 && (
                  <span className="text-green-600 text-sm font-semibold">-{item.saving.toFixed(1)}%</span>
                )}
              </div>
              <p className="text-2xl font-bold text-slate-900 mb-2">
                {item.power.toFixed(1)} <span className="text-sm text-slate-500">kW</span>
              </p>
              <div className="space-y-1 text-xs">
                <p className="text-slate-600">
                  <span className="text-slate-500">제어방식:</span> {item.details.method}
                </p>
                <p className="text-slate-600">
                  <span className="text-slate-500">특징:</span> {item.details.features}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ROI 계산 / 절감 효과 통합 */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center mb-6">
          <h3 className="text-lg font-semibold text-slate-900">ROI 계산 / 절감 효과</h3>
          <InfoTooltip title="ROI (Return on Investment)">
            <p><strong>투자 회수 기간이란?</strong></p>
            <p>인버터 도입 비용을 에너지 절감으로 회수하는 데 걸리는 시간입니다.</p>
            <div className="mt-3">
              <p className="text-cyan-600 font-mono text-xs">ROI = 인버터 비용 / 연간 절감 비용</p>
            </div>
            <p className="mt-2 text-slate-500 text-xs">
              💡 일반적으로 2~3년 내 회수 시 투자 가치가 있다고 판단합니다.
            </p>
          </InfoTooltip>
        </div>
        
        {/* 설정 입력 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">인버터 비용</label>
            <div className="relative">
              <input
                type="number"
                value={roiInputs.inverterCost / 10000}
                onChange={(e) => setRoiInputs({ ...roiInputs, inverterCost: Number(e.target.value) * 10000 })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 pr-12 text-slate-900 text-sm focus:outline-none focus:border-cyan-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">만원</span>
            </div>
          </div>
          
          <div>
            <Slider
              value={roiInputs.dailyRunHours}
              min={1}
              max={24}
              step={1}
              onChange={(val) => setRoiInputs({ ...roiInputs, dailyRunHours: val })}
              size="small"
              label="일일 운전"
              unit="시간"
            />
          </div>
          
          <div>
            <Slider
              value={roiInputs.yearlyDays}
              min={100}
              max={365}
              step={5}
              onChange={(val) => setRoiInputs({ ...roiInputs, yearlyDays: val })}
              size="small"
              label="연간 운전"
              unit="일"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">전기요금</label>
            <div className="relative">
              <input
                type="number"
                value={roiInputs.electricityRate}
                onChange={(e) => setRoiInputs({ ...roiInputs, electricityRate: Number(e.target.value) })}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 pr-16 text-slate-900 text-sm focus:outline-none focus:border-cyan-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">원/kWh</span>
            </div>
          </div>
        </div>

        {/* 결과 표시 - 절감량 + 절감비용 + 투자회수 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 절감량 카드 */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-green-600">📊</span>
              <span className="text-sm font-semibold text-slate-700">절감량</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">시간당</span>
                <span className="text-sm font-semibold text-green-600">
                  {savings.savingPower.toFixed(1)} <span className="text-xs text-slate-500">kW</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">일일</span>
                <span className="text-sm font-semibold text-green-600">
                  {savings.daily.toFixed(0)} <span className="text-xs text-slate-500">kWh</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">연간</span>
                <span className="text-sm font-semibold text-green-600">
                  {(savings.yearly / 1000).toFixed(1)} <span className="text-xs text-slate-500">MWh</span>
                </span>
              </div>
            </div>
          </div>
          
          {/* 절감 비용 카드 */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-purple-600">💰</span>
              <span className="text-sm font-semibold text-slate-700">절감 비용</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">연간</span>
                <span className="text-sm font-semibold text-purple-600">
                  {formatNumber(Math.round(savings.yearlyCost / 10000))} <span className="text-xs text-slate-500">만원</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">5년 누적</span>
                <span className={`text-sm font-semibold ${roiResult && roiResult.fiveYearSaving > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {roiResult ? formatNumber(Math.round(roiResult.fiveYearSaving / 10000)) : '-'} <span className="text-xs text-slate-500">만원</span>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">10년 누적</span>
                <span className={`text-sm font-semibold ${roiResult && roiResult.tenYearSaving > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {roiResult ? formatNumber(Math.round(roiResult.tenYearSaving / 10000)) : '-'} <span className="text-xs text-slate-500">만원</span>
                </span>
              </div>
            </div>
          </div>
          
          {/* 투자 회수 카드 - 메인 강조 */}
          <div className={`rounded-lg p-4 border ${
            roiResult?.roiYears != null 
              ? 'bg-gradient-to-br from-cyan-50 to-white border-cyan-200' 
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-cyan-600">🎯</span>
              <span className="text-sm font-semibold text-slate-700">투자 회수</span>
            </div>
            {roiResult?.roiYears != null ? (
              <div className="text-center py-2">
                <p className="text-3xl font-bold text-slate-900">
                  {roiResult.roiYears.toFixed(1)}<span className="text-lg text-slate-500 ml-1">년</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  약 {roiResult.roiMonths?.toFixed(0)}개월
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-lg font-semibold text-slate-400">절감량 없음</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
