'use client';

import InfoTooltip from '@/components/ui/InfoTooltip';

interface OperatingPoint {
  stage: number;
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
    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
      <div className="flex items-center mb-4">
        <h3 className="text-lg font-semibold text-slate-900">운전점 데이터</h3>
        <InfoTooltip title="운전점 데이터">
          <p><strong>운전점이란?</strong></p>
          <p>유량별 펌프의 운전 상태를 측정한 실측 데이터입니다.</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li><strong>유량</strong>: 펌프가 이동시키는 물의 양 (m³/h)</li>
            <li><strong>양정</strong>: 펌프가 물을 밀어올리는 높이 (m)</li>
            <li><strong>효율</strong>: 수력/전력 비율 (%)</li>
          </ul>
          <p className="mt-2 text-slate-400 text-xs">
            2026년 1월 실측 데이터 기준 (44개 안정 구간 평균)
          </p>
        </InfoTooltip>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-center py-3 px-3 text-slate-600 font-medium">#</th>
              <th className="text-right py-3 px-3 text-slate-600 font-medium">유량</th>
              <th className="text-right py-3 px-3 text-slate-600 font-medium">양정</th>
              <th className="text-right py-3 px-3 text-slate-600 font-medium">압력</th>
              <th className="text-right py-3 px-3 text-slate-600 font-medium">전력</th>
              <th className="text-right py-3 px-3 text-slate-600 font-medium">수력</th>
              <th className="text-right py-3 px-3 text-slate-600 font-medium">효율</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point, index) => (
              <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-2 px-3 text-center text-slate-400">{index + 1}</td>
                <td className="py-2 px-3 text-right text-cyan-600">{point.flow} <span className="text-slate-500 text-xs">m³/h</span></td>
                <td className="py-2 px-3 text-right text-slate-600">{point.head} <span className="text-slate-500 text-xs">m</span></td>
                <td className="py-2 px-3 text-right text-slate-600">{point.outletPressure} <span className="text-slate-500 text-xs">bar</span></td>
                <td className="py-2 px-3 text-right text-red-600">{point.power} <span className="text-slate-500 text-xs">kW</span></td>
                <td className="py-2 px-3 text-right text-green-600">{point.hydraulicPower} <span className="text-slate-500 text-xs">kW</span></td>
                <td className="py-2 px-3 text-right text-amber-600">{point.efficiency} <span className="text-slate-500 text-xs">%</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
