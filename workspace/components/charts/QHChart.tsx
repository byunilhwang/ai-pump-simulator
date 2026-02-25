'use client';

import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import InfoTooltip from '@/components/ui/InfoTooltip';

interface OperatingPoint {
  stage: number;
  flow: number;
  head: number;
  power: number;
  efficiency: number;
}

interface CurvePoint {
  flow: number;
  head: number;
}

interface QHChartProps {
  data: OperatingPoint[];           // 운전점 (효율용)
  showEfficiency?: boolean;
  height?: number;
  pumpCurve?: CurvePoint[];         // 펌프 곡선 (연속)
}

export default function QHChart({
  data,
  showEfficiency = true,
  height = 400,
  pumpCurve,
}: QHChartProps) {
  // 펌프 곡선 데이터: pumpCurve가 있으면 사용, 없으면 운전점 데이터로 폴백
  const curveData = pumpCurve && pumpCurve.length > 0
    ? pumpCurve.map(p => ({
        flow: p.flow,
        pumpHead: p.head,
      }))
    : data.map(point => ({
        flow: point.flow,
        pumpHead: point.head,
      }));
  
  // 운전점 마커 데이터 (효율 포함)
  const markerData = data.map(point => ({
    flow: point.flow,
    head: point.head,
    efficiency: point.efficiency,
    stage: point.stage,
  }));
  
  return (
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
      <div className="flex items-center mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Q-H 성능 곡선</h3>
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
        <ComposedChart 
          data={curveData} 
          margin={{ top: 20, right: 60, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="flow"
            stroke="#64748b"
            type="number"
            domain={[0, 25]}
            label={{ value: '유량 Q (m³/h)', position: 'insideBottom', offset: -10, fill: '#64748b' }}
          />
          <YAxis
            yAxisId="left"
            stroke="#64748b"
            domain={[0, 180]}
            label={{ value: '양정 H (m)', angle: -90, position: 'insideLeft', fill: '#64748b' }}
          />
          {showEfficiency && (
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#64748b"
              domain={[0, 100]}
              label={{ value: '효율 η (%)', angle: 90, position: 'insideRight', fill: '#64748b' }}
            />
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            labelStyle={{ color: '#1e293b' }}
            formatter={(value, name) => {
              if (value === undefined || value === null) return ['-', name as string];
              const unit = (name as string).includes('양정') || (name as string).includes('곡선') ? ' m' : (name as string).includes('효율') ? ' %' : '';
              return [`${(value as number).toFixed(1)}${unit}`, name as string];
            }}
            labelFormatter={(label) => `유량: ${Number(label).toFixed(1)} m³/h`}
          />
          <Legend 
            verticalAlign="top" 
            height={36}
            wrapperStyle={{ paddingBottom: '10px' }}
          />
          {/* 펌프 곡선 (연속선) */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="pumpHead"
            stroke="#06b6d4"
            strokeWidth={2}
            dot={false}
            name="양정 (m)"
            connectNulls
          />
          {/* 효율 곡선 */}
          {showEfficiency && (
            <Line
              yAxisId="right"
              type="monotone"
              data={markerData}
              dataKey="efficiency"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: '#f59e0b', strokeWidth: 2, r: 5 }}
              name="효율 (%)"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
