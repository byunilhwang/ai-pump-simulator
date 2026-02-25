'use client';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  size?: 'large' | 'small';
  markers?: number[];
  showPercent?: boolean;
  label?: string;
  unit?: string;
}

/**
 * 안드로이드 스타일 슬라이더 컴포넌트
 * 
 * Option A 방식: 브라우저 기본 동작 수용 + 커스텀 요소를 thumb 이동 범위에 맞춤
 * - 브라우저 range input의 thumb은 min에서 왼쪽 끝, max에서 오른쪽 끝이 경계에 닿음
 * - 커스텀 트랙/채워진영역/마커를 thumb 반지름만큼 안쪽에 배치하여 thumb 중심과 정렬
 * 
 * 수직 정렬:
 * - input height = thumbSize
 * - 트랙 top = (thumbSize - trackHeight) / 2 (input 기준 중앙)
 * - thumb 중심 = thumbSize / 2 = 트랙 중심
 */
export default function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  size = 'large',
  markers,
  showPercent = false,
  label,
  unit,
}: SliderProps) {
  // 크기별 설정 (px 단위)
  const isLarge = size === 'large';
  const thumbSize = isLarge ? 20 : 16;  // large: 20px, small: 16px
  const trackHeight = isLarge ? 12 : 8;  // large: 12px, small: 8px
  const thumbRadius = thumbSize / 2;
  
  // 트랙을 input 중앙에 배치하기 위한 오프셋
  const trackTopOffset = (thumbSize - trackHeight) / 2;
  
  // 값의 비율 (0~1)
  const ratio = (value - min) / (max - min);
  
  // CSS 클래스
  const sliderClass = isLarge ? 'slider-custom slider-large' : 'slider-custom slider-small';

  return (
    <div>
      {/* 라벨과 값 표시 */}
      {(label || unit !== undefined) && (
        <div className="flex items-center justify-between mb-2">
          {label && <span className="text-sm text-slate-600">{label}</span>}
          <div className="flex items-center gap-1">
            <span className="text-cyan-600 font-semibold">{value}</span>
            {unit && <span className="text-slate-500 text-sm">{unit}</span>}
          </div>
        </div>
      )}
      
      {/* 슬라이더 영역 - paddingTop 제거, input과 트랙이 같은 기준 */}
      <div 
        className="relative"
        style={{ 
          height: thumbSize,  // input 높이와 동일
          marginBottom: markers ? 28 : 8,
        }}
      >
        {/* 커스텀 트랙 - input 기준 수직 중앙 배치 */}
        <div 
          className="absolute"
          style={{ 
            top: trackTopOffset,  // input 내부 중앙
            left: thumbRadius,    // thumb 반지름만큼 안쪽
            right: thumbRadius, 
            height: trackHeight,
          }}
        >
          {/* 트랙 배경 */}
          <div className="absolute inset-0 bg-slate-200 rounded-full border border-slate-300" />
          {/* 채워진 부분 */}
          <div 
            className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full"
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
        
        {/* 실제 슬라이더 - top: 0에서 시작, 트랙과 같은 좌표계 공유 */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`absolute top-0 left-0 w-full z-10 ${sliderClass}`}
          style={{ height: thumbSize }}
        />
        
        {/* 범위 마커 - 개별 배치 방식 */}
        {markers && markers.map((markerVal) => {
          const markerRatio = (markerVal - min) / (max - min);
          return (
            <span 
              key={markerVal}
              className={`absolute text-xs ${value === markerVal ? 'text-cyan-600 font-bold' : 'text-slate-500'}`}
              style={{ 
                top: thumbSize + 8,
                // thumb 중심 위치: thumbRadius + ratio * (100% - thumbSize)
                left: `calc(${thumbRadius}px + ${markerRatio} * (100% - ${thumbSize}px))`,
                transform: 'translateX(-50%)',
              }}
            >
              {markerVal}
            </span>
          );
        })}
      </div>
      
      {/* 퍼센트 표시 */}
      {showPercent && (
        <div className="flex justify-center mt-2">
          <span className="bg-cyan-50 text-cyan-700 border border-cyan-200 px-3 py-1 rounded-full text-sm font-semibold">
            {Math.round(ratio * 100)}% 운전
          </span>
        </div>
      )}
    </div>
  );
}
