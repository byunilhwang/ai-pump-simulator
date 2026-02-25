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

interface TransientData {
  time: number;
  flow: number;
  power: number;
}

interface PrintableTransientChartProps {
  data: TransientData[];
  targetFlow: number;
  startFlow: number;
}

export default function PrintableTransientChart({ 
  data, 
  targetFlow, 
  startFlow 
}: PrintableTransientChartProps) {
  const maxFlow = Math.max(targetFlow, startFlow, 1) * 1.3;
  
  return (
    <div style={{ background: '#ffffff', padding: '10px' }}>
      <ResponsiveContainer width={540} height={260}>
        <LineChart data={data} margin={{ top: 10, right: 50, left: 10, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="time"
            stroke="#334155"
            tick={{ fill: '#334155', fontSize: 10 }}
            label={{ value: 't (s)', position: 'insideBottom', offset: -15, fill: '#334155', fontSize: 10 }}
          />
          <YAxis
            yAxisId="flow"
            stroke="#0891b2"
            tick={{ fill: '#334155', fontSize: 10 }}
            domain={[0, maxFlow]}
            label={{ value: 'Q (m3/h)', angle: -90, position: 'insideLeft', fill: '#0891b2', fontSize: 10 }}
          />
          <YAxis
            yAxisId="power"
            orientation="right"
            stroke="#dc2626"
            tick={{ fill: '#334155', fontSize: 10 }}
            label={{ value: 'P (kW)', angle: 90, position: 'insideRight', fill: '#dc2626', fontSize: 10 }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }}
          />
          <Line
            yAxisId="flow"
            type="monotone"
            dataKey="flow"
            stroke="#0891b2"
            strokeWidth={2}
            dot={false}
            name="Q (m3/h)"
          />
          <Line
            yAxisId="power"
            type="monotone"
            dataKey="power"
            stroke="#dc2626"
            strokeWidth={2}
            dot={false}
            name="P (kW)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
