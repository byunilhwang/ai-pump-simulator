'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface OperatingPoint {
  stage: number;
  flow: number;
  head: number;
  efficiency: number;
}

interface PrintableQHChartProps {
  data: OperatingPoint[];
}

export default function PrintableQHChart({ data }: PrintableQHChartProps) {
  return (
    <div style={{ background: '#ffffff', padding: '10px' }}>
      <ResponsiveContainer width={520} height={220}>
        <LineChart data={data} margin={{ top: 10, right: 50, left: 10, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="flow"
            stroke="#334155"
            tick={{ fill: '#334155', fontSize: 10 }}
            label={{ value: 'Q (m3/h)', position: 'insideBottom', offset: -15, fill: '#334155', fontSize: 10 }}
          />
          <YAxis
            yAxisId="left"
            stroke="#0891b2"
            tick={{ fill: '#334155', fontSize: 10 }}
            label={{ value: 'H (m)', angle: -90, position: 'insideLeft', fill: '#0891b2', fontSize: 10 }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#16a34a"
            tick={{ fill: '#334155', fontSize: 10 }}
            label={{ value: 'Eff (%)', angle: 90, position: 'insideRight', fill: '#16a34a', fontSize: 10 }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="head"
            stroke="#0891b2"
            strokeWidth={2}
            dot={{ fill: '#0891b2', r: 3 }}
            name="H (m)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="efficiency"
            stroke="#16a34a"
            strokeWidth={2}
            dot={{ fill: '#16a34a', r: 3 }}
            name="Eff (%)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
