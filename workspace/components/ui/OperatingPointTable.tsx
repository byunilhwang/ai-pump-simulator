'use client';

import InfoTooltip from '@/components/ui/InfoTooltip';

interface OperatingPoint {
  stage: number;
  valveAngle: number;
  flow: number;
  head: number;
  power: number;
  hydraulicPower: number;
  efficiency: number;
  outletPressure: number;
}

interface OperatingPointTableProps {
  data: OperatingPoint[];
}

export default function OperatingPointTable({ data }: OperatingPointTableProps) {
  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center mb-4">
        <h3 className="text-lg font-semibold text-white">운전점 데이터</h3>
        <InfoTooltip title="운전점 데이터">
          <p><strong>운전점이란?</strong></p>
          <p>밸브 개도에 따른 펌프의 운전 상태를 측정한 데이터입니다.</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong>단계 0~6</strong>: 밸브 닫힘(0) → 완전개방(6)</li>
            <li><strong>밸브 각도</strong>: 0° ~ 270°</li>
            <li><strong>토출압력</strong>: 펌프 출구의 유체 압력 (bar)</li>
          </ul>
          <p className="mt-2 text-slate-400 text-xs">
            💡 2026년 1월 실측 데이터 기준
          </p>
        </InfoTooltip>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-3 text-slate-400 font-medium">단계</th>
              <th className="text-left py-3 px-3 text-slate-400 font-medium">밸브</th>
              <th className="text-right py-3 px-3 text-slate-400 font-medium">유량</th>
              <th className="text-right py-3 px-3 text-slate-400 font-medium">양정</th>
              <th className="text-right py-3 px-3 text-slate-400 font-medium">전력</th>
              <th className="text-right py-3 px-3 text-slate-400 font-medium">수력</th>
              <th className="text-right py-3 px-3 text-slate-400 font-medium">효율</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.stage} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="py-2 px-3 text-white font-medium">{point.stage}</td>
                <td className="py-2 px-3 text-slate-300">{point.valveAngle}°</td>
                <td className="py-2 px-3 text-right text-cyan-400">{point.flow} <span className="text-slate-500 text-xs">m³/h</span></td>
                <td className="py-2 px-3 text-right text-slate-300">{point.head} <span className="text-slate-500 text-xs">m</span></td>
                <td className="py-2 px-3 text-right text-red-400">{point.power} <span className="text-slate-500 text-xs">kW</span></td>
                <td className="py-2 px-3 text-right text-green-400">{point.hydraulicPower} <span className="text-slate-500 text-xs">kW</span></td>
                <td className="py-2 px-3 text-right text-amber-400">{point.efficiency} <span className="text-slate-500 text-xs">%</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
