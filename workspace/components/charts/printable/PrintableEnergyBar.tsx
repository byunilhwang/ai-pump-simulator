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
  Legend,
} from 'recharts';

interface PrintableEnergyBarProps {
  caseA: number;
  caseB: number;
  caseC: number;
}

export default function PrintableEnergyBar({ caseA, caseB, caseC }: PrintableEnergyBarProps) {
  const data = [
    { name: 'Case A (Valve)', power: caseA, fill: '#64748b' },
    { name: 'Case B (PID)', power: caseB, fill: '#0891b2' },
    { name: 'Case C (AI)', power: caseC, fill: '#16a34a' },
  ];
  
  return (
    <div style={{ background: '#ffffff', padding: '10px' }}>
      <ResponsiveContainer width={540} height={160}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 70, left: 80, bottom: 15 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            stroke="#334155"
            tick={{ fill: '#334155', fontSize: 10 }}
            domain={[0, 15]}
            label={{ value: 'P (kW)', position: 'insideBottom', offset: -10, fill: '#334155', fontSize: 10 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#334155"
            tick={{ fill: '#334155', fontSize: 10 }}
            width={75}
          />
          <Bar dataKey="power" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
            <LabelList
              dataKey="power"
              position="right"
              fill="#334155"
              fontSize={10}
              formatter={(value: number) => `${value.toFixed(1)} kW`}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
