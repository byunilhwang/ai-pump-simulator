'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import InfoTooltip from '@/components/ui/InfoTooltip';

interface OperatingPoint {
  flow: number;
  power: number;
  hydraulicPower: number;
}

interface QPChartProps {
  data: OperatingPoint[];
  height?: number;
}

export default function QPChart({ data, height = 300 }: QPChartProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Q-P 전력 곡선</h3>
        <InfoTooltip title="Q-P 전력 곡선">
          <p><strong>Q-P 곡선이란?</strong></p>
          <p>유량에 따라 펌프가 소비하는 전력을 보여주는 그래프입니다.</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong>입력 전력</strong>: 모터에 공급되는 전기 에너지 (kW)</li>
            <li><strong>수력</strong>: 실제로 물을 이동시키는 데 쓰인 에너지 (kW)</li>
          </ul>
          <p className="mt-2 text-slate-400 text-xs">
            💡 입력 전력과 수력의 차이가 손실입니다. 효율 = 수력 / 입력 전력
          </p>
          <div className="mt-3 pt-3 border-t border-slate-600">
            <p className="text-green-400 font-mono text-xs">수력 = ρ × g × Q × H / 3600 / 1000 (kW)</p>
            <p className="text-slate-400 text-xs mt-1">ρ=물밀도, g=중력, Q=유량, H=양정</p>
          </div>
        </InfoTooltip>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="flow"
            stroke="#94a3b8"
            label={{ value: '유량 Q (m³/h)', position: 'insideBottom', offset: -10, fill: '#94a3b8' }}
          />
          <YAxis
            stroke="#94a3b8"
            label={{ value: '전력 P (kW)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
            }}
            formatter={(value, name) => [`${(value as number).toFixed(2)} kW`, name as string]}
          />
          <Legend verticalAlign="top" height={36} />
          <Line
            type="monotone"
            dataKey="power"
            stroke="#ef4444"
            strokeWidth={3}
            dot={{ fill: '#ef4444', strokeWidth: 2, r: 6 }}
            name="입력 전력"
          />
          <Line
            type="monotone"
            dataKey="hydraulicPower"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ fill: '#22c55e', strokeWidth: 2, r: 4 }}
            name="수력"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
