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
  flow: number;
  power: number;
  hydraulicPower: number;
}

interface PrintableQPChartProps {
  data: OperatingPoint[];
}

export default function PrintableQPChart({ data }: PrintableQPChartProps) {
  return (
    <div style={{ background: '#ffffff', padding: '10px' }}>
      <ResponsiveContainer width={520} height={220}>
        <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="flow"
            stroke="#334155"
            tick={{ fill: '#334155', fontSize: 10 }}
            label={{ value: 'Q (m3/h)', position: 'insideBottom', offset: -15, fill: '#334155', fontSize: 10 }}
          />
          <YAxis
            stroke="#334155"
            tick={{ fill: '#334155', fontSize: 10 }}
            label={{ value: 'P (kW)', angle: -90, position: 'insideLeft', fill: '#334155', fontSize: 10 }}
          />
          <Legend 
            wrapperStyle={{ fontSize: '10px', paddingTop: '5px' }}
          />
          <Line
            type="monotone"
            dataKey="power"
            stroke="#dc2626"
            strokeWidth={2}
            dot={{ fill: '#dc2626', r: 3 }}
            name="P (kW)"
          />
          <Line
            type="monotone"
            dataKey="hydraulicPower"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ fill: '#2563eb', r: 3 }}
            name="Ph (kW)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
