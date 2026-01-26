'use client';

import { useEffect, useState } from 'react';
import StatCard from '@/components/ui/StatCard';
import QHChart from '@/components/charts/QHChart';
import QPChart from '@/components/charts/QPChart';
import EnergyCompareChart from '@/components/charts/EnergyCompareChart';
import OperatingPointTable from '@/components/ui/OperatingPointTable';
import Slider from '@/components/ui/Slider';

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

export default function Dashboard() {
  const [operatingPoints, setOperatingPoints] = useState<OperatingPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlow, setSelectedFlow] = useState(15);
  const [energyData, setEnergyData] = useState({
    valvePower: 0,
    inverterPower: 0,
    pidPower: 0,
    savingPercent: 0,
  });

  useEffect(() => {
    fetch('/api/operating-points')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setOperatingPoints(data.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/calculate/inverter-power', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetFlow: selectedFlow }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setEnergyData({
            valvePower: data.data.result.valvePower,
            inverterPower: data.data.result.inverterPower,
            pidPower: data.data.result.pidPower,
            savingPercent: data.data.result.savingPercent,
          });
        }
      });
  }, [selectedFlow]);

  const maxEfficiency = operatingPoints.length > 0 
    ? Math.max(...operatingPoints.map(p => p.efficiency))
    : 0;

  const ratedPower = operatingPoints.length > 0
    ? operatingPoints[operatingPoints.length - 1].power
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold text-white">대시보드</h1>
        <p className="text-slate-400 mt-2">
          AI 기반 인버터 적용 펌프 성능분석 및 에너지 절감 시뮬레이터
        </p>
      </div>

      {/* 주요 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="정격 유량"
          value="25"
          unit="m³/h"
          description="6단계 완전 개방"
          color="cyan"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <StatCard
          title="최대 효율"
          value={maxEfficiency.toFixed(1)}
          unit="%"
          description="BEP 기준"
          color="green"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
        <StatCard
          title="정격 전력"
          value={ratedPower.toFixed(1)}
          unit="kW"
          description="정격 운전 시"
          color="amber"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <StatCard
          title="예상 절감율"
          value={energyData.savingPercent.toFixed(0)}
          unit="%"
          description={`유량 ${selectedFlow} m³/h 기준`}
          trend="up"
          trendValue="인버터 적용 시"
          color="purple"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* 유량 선택 슬라이더 */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">운전 유량 선택</h3>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-cyan-400">{selectedFlow}</span>
            <span className="text-slate-400">m³/h</span>
          </div>
        </div>
        
        <Slider
          value={selectedFlow}
          min={0}
          max={25}
          step={1}
          onChange={setSelectedFlow}
          size="large"
          markers={[0, 5, 10, 15, 20, 25]}
          showPercent={true}
        />
      </div>

      {/* 전력 비교 (유량 선택 바로 아래) */}
      <EnergyCompareChart
        valvePower={energyData.valvePower}
        inverterPower={energyData.inverterPower}
        pidPower={energyData.pidPower}
        height={250}
        fixedMaxPower={15}
      />

      {/* 성능 곡선 차트 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {operatingPoints.length > 0 && (
          <>
            <QHChart data={operatingPoints} showEfficiency={true} height={350} />
            <QPChart data={operatingPoints} height={350} />
          </>
        )}
      </div>

      {/* 운전점 테이블 */}
      {operatingPoints.length > 0 && (
        <OperatingPointTable data={operatingPoints} />
      )}
    </div>
  );
}
