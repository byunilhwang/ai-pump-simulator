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
  flow: number;
  head: number;
  power: number;
  hydraulicPower: number;
  efficiency: number;
  outletPressure: number;
}

interface CurvePoint {
  flow: number;
  head: number;
}

// Phase 2 실측 스펙 (2026년 1월 데이터 기준)
const RATED_SPECS = {
  FLOW: 20.5,      // m³/h (정격 유량)
  POWER: 12.88,    // kW (실측 운전 전력)
  MAX_POWER: 13.59,// kW (최대 운전 전력)
  EFFICIENCY: 59   // % (실측 효율)
};

export default function Dashboard() {
  const [operatingPoints, setOperatingPoints] = useState<OperatingPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlow, setSelectedFlow] = useState(12);
  const [energyData, setEnergyData] = useState({
    valvePower: 0,
    inverterPower: 0,
    pidPower: 0,
    savingPercent: 0,
  });
  
  // 펌프 곡선 데이터 (연속)
  const [pumpCurve, setPumpCurve] = useState<CurvePoint[]>([]);

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

  // 펌프 곡선 데이터 로드
  useEffect(() => {
    fetch('/api/pump-curve')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data.curveData) {
          setPumpCurve(data.data.curveData);
        }
      });
  }, []);

  const maxEfficiency = operatingPoints.length > 0 
    ? Math.max(...operatingPoints.map(p => p.efficiency))
    : 0;

  // 정격 유량(20.5) 근처의 운전점에서 전력 추출
  const ratedPower = operatingPoints.length > 0
    ? operatingPoints.find(p => p.flow >= 19 && p.flow <= 21)?.power || RATED_SPECS.POWER
    : RATED_SPECS.POWER;

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
        <h1 className="text-3xl font-bold text-slate-900">대시보드</h1>
        <p className="text-slate-600 mt-2">
          AI 기반 인버터 적용 펌프 성능분석 및 에너지 절감 시뮬레이터
        </p>
      </div>

      {/* 주요 지표 카드 (Phase 2 실측 스펙 반영) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="정격 유량"
          value={RATED_SPECS.FLOW.toString()}
          unit="m³/h"
          description="Grundfos CRN15-8"
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
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">운전 유량 선택</h3>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-cyan-600">{selectedFlow}</span>
            <span className="text-slate-500">m³/h</span>
          </div>
        </div>
        
        <Slider
          value={selectedFlow}
          min={0}
          max={20}
          step={1}
          onChange={setSelectedFlow}
          size="large"
          markers={[0, 4, 8, 12, 16, 20]}
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
            <QHChart 
              data={operatingPoints} 
              showEfficiency={true} 
              height={350}
              pumpCurve={pumpCurve}
            />
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
