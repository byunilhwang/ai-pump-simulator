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
  ReferenceDot,
} from 'recharts';
import InfoTooltip from '@/components/ui/InfoTooltip';

interface OperatingPoint {
  stage: number;
  flow: number;
  head: number;
  power: number;
  efficiency: number;
}

interface QHChartProps {
  data: OperatingPoint[];
  currentPoint?: number;
  showEfficiency?: boolean;
  height?: number;
}

export default function QHChart({
  data,
  currentPoint,
  showEfficiency = true,
  height = 400,
}: QHChartProps) {
  const current = currentPoint !== undefined ? data.find(d => d.stage === currentPoint) : null;
  
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center mb-4">
        <h3 className="text-lg font-semibold text-white">Q-H 성능 곡선</h3>
        <InfoTooltip title="Q-H 성능 곡선">
          <p><strong>Q-H 곡선이란?</strong></p>
          <p>펌프가 물을 얼마나 높이 올릴 수 있는지를 보여주는 그래프입니다.</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong>Q (유량)</strong>: 1시간에 펌프가 이동시키는 물의 양 (m³/h)</li>
            <li><strong>H (양정)</strong>: 펌프가 물을 밀어올리는 높이 (m)</li>
            <li><strong>η (효율)</strong>: 투입 전력 대비 실제 물을 올리는 데 쓰인 비율 (%)</li>
          </ul>
          <p className="mt-2 text-slate-400 text-xs">
            💡 유량이 증가하면 양정은 감소합니다. 효율이 가장 높은 점을 BEP(Best Efficiency Point)라고 합니다.
          </p>
          <div className="mt-3 pt-3 border-t border-slate-600">
            <p className="text-cyan-400 font-mono text-xs">H = (출구압력 - 입구압력) × 10.197 m</p>
          </div>
        </InfoTooltip>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 20, right: 60, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="flow"
            stroke="#94a3b8"
            label={{ value: '유량 Q (m³/h)', position: 'insideBottom', offset: -10, fill: '#94a3b8' }}
          />
          <YAxis
            yAxisId="left"
            stroke="#94a3b8"
            label={{ value: '양정 H (m)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
          />
          {showEfficiency && (
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#94a3b8"
              label={{ value: '효율 η (%)', angle: 90, position: 'insideRight', fill: '#94a3b8' }}
            />
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#f1f5f9' }}
            formatter={(value, name) => {
              const unit = (name as string).includes('양정') ? ' m' : (name as string).includes('효율') ? ' %' : '';
              return [`${(value as number).toFixed(1)}${unit}`, name as string];
            }}
          />
          <Legend 
            verticalAlign="top" 
            height={36}
            wrapperStyle={{ paddingBottom: '10px' }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="head"
            stroke="#06b6d4"
            strokeWidth={3}
            dot={{ fill: '#06b6d4', strokeWidth: 2, r: 6 }}
            name="양정 (m)"
          />
          {showEfficiency && (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="efficiency"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
              name="효율 (%)"
            />
          )}
          {current && (
            <ReferenceDot
              yAxisId="left"
              x={current.flow}
              y={current.head}
              r={10}
              fill="#22c55e"
              stroke="#fff"
              strokeWidth={2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
