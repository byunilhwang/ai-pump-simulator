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
        <h3 className="text-lg font-semibold text-white">전력 비교</h3>
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
