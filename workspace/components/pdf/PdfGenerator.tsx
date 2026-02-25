'use client';

import { useRef, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  Cell,
  LabelList,
  ReferenceLine,
} from 'recharts';
import { NOTO_SANS_KR_REGULAR_BASE64 } from '@/lib/fonts/noto-sans-kr';

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

interface TransientData {
  time: number;
  flow: number;
  power: number;
}

interface ResponseMetrics {
  transitionTime: number;
  overshoot: number;
  settlingTime: number;
}

interface PdfGeneratorProps {
  operatingPoints: OperatingPoint[];
  transientData: TransientData[];
  transientMetrics: ResponseMetrics | null;
  startFlow: number;
  targetFlow: number;
  controlMode: string;
  energyData: {
    caseA: number;
    caseB: number;
    caseC: number;
    savingPercent: number;
  };
  roiData: {
    inverterCost: number;
    dailyRunHours: number;
    yearlyDays: number;
    electricityRate: number;
    yearlySavingKWh: number;
    yearlySavingKRW: number;
    roiYears: number | null;
  };
  onGenerating?: (isGenerating: boolean) => void;
}

export default function PdfGenerator({
  operatingPoints,
  transientData,
  transientMetrics,
  startFlow,
  targetFlow,
  controlMode,
  energyData,
  roiData,
  onGenerating,
}: PdfGeneratorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    onGenerating?.(true);

    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      
      // 한글 폰트 등록
      doc.addFileToVFS('NotoSansKR-Regular.ttf', NOTO_SANS_KR_REGULAR_BASE64);
      doc.addFont('NotoSansKR-Regular.ttf', 'NotoSansKR', 'normal');
      doc.setFont('NotoSansKR');
      
      let y = margin;

      const addText = (text: string, x: number, yPos: number, options?: { 
        fontSize?: number; 
        fontStyle?: 'normal' | 'bold';
        align?: 'left' | 'center' | 'right';
        maxWidth?: number;
      }) => {
        doc.setFontSize(options?.fontSize || 10);
        doc.setFont('NotoSansKR', options?.fontStyle || 'normal');
        const textX = options?.align === 'center' ? pageWidth / 2 : 
                      options?.align === 'right' ? pageWidth - margin : x;
        
        if (options?.maxWidth) {
          const lines = doc.splitTextToSize(text, options.maxWidth);
          doc.text(lines, textX, yPos, { align: options?.align || 'left' });
          return lines.length;
        } else {
          doc.text(text, textX, yPos, { align: options?.align || 'left' });
          return 1;
        }
      };

      const drawLine = (x1: number, y1: number, x2: number, y2: number, width = 0.3) => {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(width);
        doc.line(x1, y1, x2, y2);
      };

      const drawTable = (
        headers: string[],
        rows: (string | number)[][],
        startY: number,
        colWidths: number[]
      ) => {
        const cellHeight = 7;
        const headerHeight = 8;
        let currentY = startY;
        
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, currentY, contentWidth, headerHeight, 'F');
        
        doc.setFontSize(9);
        doc.setFont('NotoSansKR', 'normal');
        let xPos = margin + 2;
        headers.forEach((header, i) => {
          doc.text(header, xPos, currentY + 5.5);
          xPos += colWidths[i];
        });
        
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.3);
        doc.rect(margin, currentY, contentWidth, headerHeight);
        
        currentY += headerHeight;
        
        doc.setFontSize(8);
        doc.setFont('NotoSansKR', 'normal');
        rows.forEach((row) => {
          xPos = margin + 2;
          row.forEach((cell, i) => {
            const cellText = typeof cell === 'number' ? cell.toFixed(1) : String(cell);
            doc.text(cellText, xPos, currentY + 5);
            xPos += colWidths[i];
          });
          doc.rect(margin, currentY, contentWidth, cellHeight);
          currentY += cellHeight;
        });
        
        return currentY;
      };

      // ========== PAGE 1: 표지 + 시스템 사양 + 이론 ==========
      
      // 표지
      addText('인버터 적용 원심펌프 성능분석 보고서', pageWidth / 2, y + 8, { fontSize: 16, align: 'center' });
      y += 12;
      addText('Variable Frequency Drive Application for Centrifugal Pump', pageWidth / 2, y, { fontSize: 10, align: 'center' });
      y += 8;
      drawLine(margin, y, pageWidth - margin, y, 0.5);
      y += 10;
      
      const now = new Date();
      const dateStr = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const docNumber = `SIM-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-001`;
      
      addText(`문서번호: ${docNumber}`, margin, y, { fontSize: 9 });
      addText(`생성일: ${dateStr} ${timeStr}`, pageWidth - margin, y, { fontSize: 9, align: 'right' });
      y += 5;
      addText('생성자: AI 펌프 시뮬레이터 v1.0', margin, y, { fontSize: 9 });
      y += 15;
      
      // 1. 시스템 사양
      addText('1. 시스템 사양', margin, y, { fontSize: 12 });
      y += 8;
      
      const ratedPower = operatingPoints.length > 0 ? operatingPoints[operatingPoints.length - 1].power : 0;
      const ratedHead = operatingPoints.length > 0 ? operatingPoints[operatingPoints.length - 1].head : 0;
      
      y = drawTable(
        ['파라미터', '값', '비고'],
        [
          ['정격유량', '25 m3/h', '완전개방 (6단계)'],
          ['정격양정', `${ratedHead.toFixed(1)} m`, '토출압력'],
          ['정격전력', `${ratedPower.toFixed(1)} kW`, '입력전력'],
        ],
        y,
        [55, 60, 65]
      );
      y += 3;
      doc.setFontSize(8);
      doc.text('표 1.1 시스템 사양', pageWidth / 2, y, { align: 'center' });
      y += 12;
      
      // 2. 이론적 배경
      addText('2. 이론적 배경', margin, y, { fontSize: 12 });
      y += 8;
      
      addText('2.1 상사법칙 (Affinity Laws)', margin, y, { fontSize: 10 });
      y += 6;
      doc.setFontSize(9);
      doc.text('Q2/Q1 = n2/n1                              ... 식(1)', margin + 5, y);
      y += 5;
      doc.text('H2/H1 = (n2/n1)^2                          ... 식(2)', margin + 5, y);
      y += 5;
      doc.text('P2/P1 = (n2/n1)^3                          ... 식(3)', margin + 5, y);
      y += 5;
      doc.setFontSize(8);
      doc.text('Q: 유량, H: 양정, P: 전력, n: 회전속도', margin + 5, y);
      y += 10;
      
      addText('2.2 2차 시스템 응답 모델', margin, y, { fontSize: 10 });
      y += 6;
      doc.setFontSize(9);
      doc.text('G(s) = wn^2 / (s^2 + 2*zeta*wn*s + wn^2)   ... 식(4)', margin + 5, y);
      y += 5;
      doc.setFontSize(8);
      doc.text('zeta: 감쇠비 (0.5~0.9), wn: 고유진동수 (rad/s)', margin + 5, y);
      y += 10;
      
      addText('2.3 오버슈트 계산', margin, y, { fontSize: 10 });
      y += 6;
      doc.setFontSize(9);
      doc.text('%OS = 100 * exp(-zeta*pi / sqrt(1-zeta^2)) ... 식(5)', margin + 5, y);
      y += 10;
      
      addText('2.4 각운동량 방정식', margin, y, { fontSize: 10 });
      y += 6;
      doc.setFontSize(9);
      doc.text('I * dw/dt = T_motor - T_load               ... 식(6)', margin + 5, y);
      y += 5;
      doc.setFontSize(8);
      doc.text('I: 관성모멘트 (kg*m^2), T: 토크 (N*m)', margin + 5, y);
      
      // ========== PAGE 2: 펌프 성능 곡선 + 운전점 표 ==========
      doc.addPage();
      y = margin;
      
      addText('3. 펌프 성능 곡선', margin, y, { fontSize: 12 });
      y += 8;
      
      // Q-H 차트 캡처
      const qhChartEl = containerRef.current?.querySelector('#print-qh-chart');
      if (qhChartEl) {
        const qhCanvas = await html2canvas(qhChartEl as HTMLElement, { 
          scale: 2,
          backgroundColor: '#ffffff',
        });
        const qhImg = qhCanvas.toDataURL('image/png');
        doc.addImage(qhImg, 'PNG', margin, y, 88, 50);
      }
      
      // Q-P 차트 캡처
      const qpChartEl = containerRef.current?.querySelector('#print-qp-chart');
      if (qpChartEl) {
        const qpCanvas = await html2canvas(qpChartEl as HTMLElement, { 
          scale: 2,
          backgroundColor: '#ffffff',
        });
        const qpImg = qpCanvas.toDataURL('image/png');
        doc.addImage(qpImg, 'PNG', margin + 92, y, 88, 50);
      }
      
      y += 53;
      doc.setFontSize(8);
      doc.text('그림 3.1 Q-H 곡선 (좌), Q-P 곡선 (우)', pageWidth / 2, y, { align: 'center' });
      y += 10;
      
      // 운전점 표
      const opRows = operatingPoints.map(p => [
        p.stage,
        p.flow,
        p.head,
        p.power,
        p.hydraulicPower,
        p.efficiency
      ]);
      
      y = drawTable(
        ['단계', 'Q (m3/h)', 'H (m)', 'P (kW)', 'Ph (kW)', '효율 (%)'],
        opRows,
        y,
        [25, 32, 32, 32, 32, 27]
      );
      y += 3;
      doc.setFontSize(8);
      doc.text('표 3.1 운전점 데이터', pageWidth / 2, y, { align: 'center' });
      
      // ========== PAGE 3: 에너지 절감 분석 + 과도응답 차트 ==========
      doc.addPage();
      y = margin;
      
      addText('4. 에너지 절감 분석', margin, y, { fontSize: 12 });
      y += 8;
      
      addText(`4.1 제어방식별 소비전력 비교 (목표유량: ${targetFlow} m3/h)`, margin, y, { fontSize: 10 });
      y += 5;
      
      // 에너지 바 차트 캡처
      const energyChartEl = containerRef.current?.querySelector('#print-energy-chart');
      if (energyChartEl) {
        const energyCanvas = await html2canvas(energyChartEl as HTMLElement, { 
          scale: 2,
          backgroundColor: '#ffffff',
        });
        const energyImg = energyCanvas.toDataURL('image/png');
        doc.addImage(energyImg, 'PNG', margin, y, contentWidth, 45);
      }
      y += 48;
      doc.setFontSize(8);
      doc.text('그림 4.1 제어방식별 전력소모 비교', pageWidth / 2, y, { align: 'center' });
      y += 8;
      
      // 4.2 분석 결과
      addText('4.2 분석 결과', margin, y, { fontSize: 10 });
      y += 6;
      doc.setFontSize(9);
      const savingB = energyData.caseA > 0 ? ((energyData.caseA - energyData.caseB) / energyData.caseA * 100) : 0;
      const savingC = energyData.caseA > 0 ? ((energyData.caseA - energyData.caseC) / energyData.caseA * 100) : 0;
      
      doc.text('VFD 제어 시 전력소모량은 식(3)에 따라 속도비의 3승에 비례하여 감소한다.', margin, y);
      y += 5;
      doc.text(`밸브교축(Case A) 대비 PID 제어(Case B)는 ${savingB.toFixed(1)}%, AI 제어(Case C)는 ${savingC.toFixed(1)}% 절감된다.`, margin, y);
      y += 8;
      
      // 표 4.1
      y = drawTable(
        ['제어방식', '전력 (kW)', '절감율'],
        [
          ['Case A (밸브교축)', energyData.caseA, '기준'],
          ['Case B (PID 제어)', energyData.caseB, `-${savingB.toFixed(1)}%`],
          ['Case C (AI 제어)', energyData.caseC, `-${savingC.toFixed(1)}%`],
        ],
        y,
        [70, 55, 55]
      );
      y += 3;
      doc.setFontSize(8);
      doc.text('표 4.1 제어방식별 전력소모량', pageWidth / 2, y, { align: 'center' });
      y += 12;
      
      // 5. 과도응답 분석
      addText('5. 과도응답 분석', margin, y, { fontSize: 12 });
      y += 8;
      
      const modeLabel = controlMode === 'fast' ? '빠른응답' : controlMode === 'stable' ? '안정적응답' : '부드러운응답';
      addText(`5.1 시험조건: ${startFlow} -> ${targetFlow} m3/h, 모드: ${modeLabel}`, margin, y, { fontSize: 10 });
      y += 5;
      
      // 과도응답 차트 캡처
      const transientChartEl = containerRef.current?.querySelector('#print-transient-chart');
      if (transientChartEl) {
        const transientCanvas = await html2canvas(transientChartEl as HTMLElement, { 
          scale: 2,
          backgroundColor: '#ffffff',
        });
        const transientImg = transientCanvas.toDataURL('image/png');
        doc.addImage(transientImg, 'PNG', margin, y, contentWidth, 70);
      }
      y += 73;
      doc.setFontSize(8);
      doc.text('그림 5.1 과도응답 곡선', pageWidth / 2, y, { align: 'center' });
      
      // ========== PAGE 4: 과도응답 분석 계속 + ROI + 참고문헌 ==========
      doc.addPage();
      y = margin;
      
      // 5.2 응답특성 분석
      addText('5.2 응답특성 분석', margin, y, { fontSize: 10 });
      y += 6;
      doc.setFontSize(9);
      doc.text('과도응답 특성은 식(4)의 2차 시스템 모델에 기반하며, 감쇠비(zeta)와 고유진동수(wn)로 결정된다.', margin, y);
      y += 5;
      doc.text('오버슈트는 식(5)에 따라 감쇠비에 반비례하고, 상승시간은 식(6)의 관성모멘트와 토크 균형으로 결정된다.', margin, y);
      y += 8;
      
      // 표 5.1
      y = drawTable(
        ['상승시간 (10%->90%)', '오버슈트 (%OS)', '안정화시간 (+/-2%)'],
        [[
          transientMetrics ? `${transientMetrics.transitionTime.toFixed(2)} s` : '-',
          transientMetrics ? `${transientMetrics.overshoot.toFixed(2)} %` : '-',
          transientMetrics ? `${transientMetrics.settlingTime.toFixed(2)} s` : '-'
        ]],
        y,
        [60, 60, 60]
      );
      y += 3;
      doc.setFontSize(8);
      doc.text('표 5.1 응답특성 지표', pageWidth / 2, y, { align: 'center' });
      y += 15;
      
      // 6. 투자회수 분석
      addText('6. 투자회수 분석 (ROI)', margin, y, { fontSize: 12 });
      y += 8;
      
      // 표 6.1 운전조건
      y = drawTable(
        ['파라미터', '값'],
        [
          ['인버터 설치비용', `${(roiData.inverterCost / 10000).toLocaleString()} 만원`],
          ['일일 가동시간', `${roiData.dailyRunHours} 시간`],
          ['연간 가동일수', `${roiData.yearlyDays} 일`],
          ['전기요금', `${roiData.electricityRate} 원/kWh`],
        ],
        y,
        [90, 90]
      );
      y += 3;
      doc.setFontSize(8);
      doc.text('표 6.1 운전조건', pageWidth / 2, y, { align: 'center' });
      y += 8;
      
      // 표 6.2 절감효과
      y = drawTable(
        ['파라미터', '값'],
        [
          ['연간 에너지 절감량', `${(roiData.yearlySavingKWh / 1000).toFixed(1)} MWh`],
          ['연간 비용 절감', `${Math.round(roiData.yearlySavingKRW / 10000).toLocaleString()} 만원`],
          ['투자회수기간', roiData.roiYears ? `${roiData.roiYears.toFixed(1)} 년` : 'N/A'],
        ],
        y,
        [90, 90]
      );
      y += 3;
      doc.setFontSize(8);
      doc.text('표 6.2 절감효과', pageWidth / 2, y, { align: 'center' });
      y += 6;
      
      doc.setFontSize(9);
      doc.text('에너지 절감량은 식(3)의 동력 상사법칙에 기반하여 산출되었다.', margin, y);
      y += 15;
      
      // 7. 참고문헌
      addText('7. 참고문헌', margin, y, { fontSize: 12 });
      y += 7;
      doc.setFontSize(8);
      
      const references = [
        ['[1]', 'Zhang, Zhao & Zhu (2024), "A theoretical model for predicting the startup performance of pumps as turbines", Nature Scientific Reports', '-> 식(6) 각운동량 방정식 적용'],
        ['[2]', 'U.S. DOE (2006), "Improving Pumping System Performance: A Sourcebook for Industry", Lawrence Berkeley National Laboratory', '-> 식(1)~(3) 상사법칙 적용'],
        ['[3]', 'ABB Inc., "Technical Note 013: Power flow within a VFD"', '-> 인버터 효율 모델 적용'],
        ['[4]', 'Turkeri et al. (2025), "Reduced-order linearized dynamic model for induction motor-driven centrifugal fan-pump system", Nature Scientific Reports', '-> 식(4) 2차 시스템 모델 적용'],
        ['[5]', 'Wei Guo et al. (2020), "Variable-Speed Pump Efficiency Calculation", Oak Ridge National Laboratory', '-> 가변속 효율 계산 적용'],
      ];
      
      references.forEach(([num, title, usage]) => {
        const titleLines = doc.splitTextToSize(`${num} ${title}`, contentWidth);
        doc.text(titleLines, margin, y);
        y += titleLines.length * 3.5;
        doc.setFontSize(7);
        doc.text(`    ${usage}`, margin, y);
        doc.setFontSize(8);
        y += 5;
      });
      
      y += 8;
      drawLine(margin, y, pageWidth - margin, y);
      y += 5;
      doc.setFontSize(8);
      doc.text('본 문서는 AI 펌프 시뮬레이터에 의해 자동으로 생성되었습니다.', pageWidth / 2, y, { align: 'center' });
      
      // 파일명
      const fileName = `펌프성능분석보고서-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('PDF 생성 오류:', error);
      alert('PDF 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
      onGenerating?.(false);
    }
  };

  return (
    <>
      {/* 숨겨진 차트 컨테이너 */}
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: '700px',
          background: '#ffffff',
          overflow: 'visible',
        }}
      >
        {/* Q-H 차트 - 웹 비율 유지 (약 1.6:1) */}
        <div id="print-qh-chart" style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'visible' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>Q-H 성능 곡선</h4>
          <ResponsiveContainer width={600} height={280}>
            <LineChart data={operatingPoints} margin={{ top: 20, right: 60, left: 20, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="flow" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} label={{ value: '유량 Q (m3/h)', position: 'insideBottom', offset: -15, fill: '#64748b', fontSize: 11 }} />
              <YAxis yAxisId="left" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} label={{ value: 'H (m)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} label={{ value: 'Eff (%)', angle: 90, position: 'insideRight', fill: '#64748b', fontSize: 11 }} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }} />
              <Line yAxisId="left" type="monotone" dataKey="head" stroke="#06b6d4" strokeWidth={2.5} dot={{ fill: '#06b6d4', r: 5 }} name="양정 (m)" />
              <Line yAxisId="right" type="monotone" dataKey="efficiency" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 4 }} name="효율 (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Q-P 차트 */}
        <div id="print-qp-chart" style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '15px', overflow: 'visible' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>Q-P 전력 곡선</h4>
          <ResponsiveContainer width={600} height={280}>
            <LineChart data={operatingPoints} margin={{ top: 20, right: 40, left: 20, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="flow" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} label={{ value: '유량 Q (m3/h)', position: 'insideBottom', offset: -15, fill: '#64748b', fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} label={{ value: 'P (kW)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }} />
              <Line type="monotone" dataKey="power" stroke="#ef4444" strokeWidth={2.5} dot={{ fill: '#ef4444', r: 5 }} name="입력 전력" />
              <Line type="monotone" dataKey="hydraulicPower" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e', r: 4 }} name="수력" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 과도응답 차트 - 웹과 유사한 비율 */}
        <div id="print-transient-chart" style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '15px', overflow: 'visible' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>과도 응답 곡선</h4>
          <ResponsiveContainer width={650} height={320}>
            <LineChart data={transientData} margin={{ top: 20, right: 60, left: 20, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} label={{ value: '시간 (초)', position: 'insideBottom', offset: -15, fill: '#64748b', fontSize: 11 }} />
              <YAxis yAxisId="flow" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} domain={[0, Math.max(targetFlow, startFlow, 1) * 1.3]} label={{ value: '유량 (m3/h)', angle: -90, position: 'insideLeft', fill: '#64748b', fontSize: 11 }} />
              <YAxis yAxisId="power" orientation="right" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} label={{ value: '전력 (kW)', angle: 90, position: 'insideRight', fill: '#64748b', fontSize: 11 }} />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }} />
              <ReferenceLine yAxisId="flow" y={targetFlow} stroke="#16a34a" strokeDasharray="5 5" strokeWidth={1.5} />
              <ReferenceLine yAxisId="flow" y={startFlow} stroke="#64748b" strokeDasharray="3 3" />
              <Line yAxisId="flow" type="monotone" dataKey="flow" stroke="#0891b2" strokeWidth={2.5} dot={false} name="유량" />
              <Line yAxisId="power" type="monotone" dataKey="power" stroke="#d97706" strokeWidth={2.5} dot={false} name="전력" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 에너지 비교 차트 - 웹과 유사한 비율 */}
        <div id="print-energy-chart" style={{ background: '#fff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '15px', overflow: 'visible' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>전력 비교</h4>
          <ResponsiveContainer width={650} height={200}>
            <BarChart 
              data={[
                { name: 'Case A\n밸브 교축', power: energyData.caseA, fill: '#ef4444' },
                { name: 'Case B\nPID 제어', power: energyData.caseB, fill: '#f59e0b' },
                { name: 'Case C\nAI 제어', power: energyData.caseC, fill: '#22c55e' },
              ]} 
              layout="vertical" 
              margin={{ top: 15, right: 80, left: 100, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
              <XAxis type="number" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} domain={[0, 15]} label={{ value: '전력 (kW)', position: 'insideBottom', offset: -10, fill: '#64748b', fontSize: 11 }} />
              <YAxis type="category" dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 11 }} width={90} />
              <Bar dataKey="power" radius={[0, 8, 8, 0]}>
                <Cell fill="#ef4444" />
                <Cell fill="#f59e0b" />
                <Cell fill="#22c55e" />
                <LabelList dataKey="power" position="right" fill="#64748b" fontSize={11} formatter={(value) => `${Number(value).toFixed(1)} kW`} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* 다운로드 버튼 */}
      <button
        onClick={generatePdf}
        disabled={isGenerating}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
          isGenerating
            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
            : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 hover:border-slate-400'
        }`}
      >
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-slate-500"></div>
            <span className="text-sm">생성 중...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="text-sm">PDF 다운로드</span>
          </>
        )}
      </button>
    </>
  );
}
