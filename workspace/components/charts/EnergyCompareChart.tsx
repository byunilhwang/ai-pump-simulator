'use client';

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

interface EnergyCompareChartProps {
  valvePower: number;
  inverterPower: number;
  pidPower?: number;
  height?: number;
  fixedMaxPower?: number; // 가로축 최대값 고정
}

export default function EnergyCompareChart({
  valvePower,
  inverterPower,
  pidPower,
  height = 300,
  fixedMaxPower,
}: EnergyCompareChartProps) {
  // 항상 3개 케이스 표시
  const data = [
    {
      name: 'Case A\n밸브 교축',
      power: valvePower,
      fill: '#ef4444',
    },
    {
      name: 'Case B\nPID 제어',
      power: pidPower ?? inverterPower * 1.1,
      fill: '#f59e0b',
    },
    {
      name: 'Case C\nAI 제어',
      power: inverterPower,
      fill: '#22c55e',
    },
  ];
  
  const savingPercent = valvePower > 0 
    ? Math.round(((valvePower - inverterPower) / valvePower) * 100) 
    : 0;
  
  // 가로축 최대값: fixedMaxPower가 있으면 사용, 없으면 15로 고정
  const maxPower = fixedMaxPower ?? 15;
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <h3 className="text-lg font-semibold text-white">전력 비교</h3>
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
        <div className="flex items-center gap-2 bg-green-500/20 px-3 py-1 rounded-full">
          <span className="text-green-400 font-bold">{savingPercent}%</span>
          <span className="text-green-400 text-sm">절감</span>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 20, right: 40, left: 80, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
          <XAxis
            type="number"
            stroke="#94a3b8"
            domain={[0, maxPower]}
            tickFormatter={(value) => `${value}`}
            label={{ value: '전력 (kW)', position: 'insideBottom', offset: -10, fill: '#94a3b8' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#94a3b8"
            width={80}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
          />
          <Bar dataKey="power" radius={[0, 8, 8, 0]} isAnimationActive={false}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
            <LabelList 
              dataKey="power" 
              position="right" 
              fill="#94a3b8"
              formatter={(value) => `${(value as number).toFixed(1)} kW`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
