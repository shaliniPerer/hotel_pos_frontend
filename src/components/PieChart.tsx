import React from 'react';

interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  size?: number;
  showLegend?: boolean;
}

export default function PieChart({ data, size = 300, showLegend = true }: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        No data available
      </div>
    );
  }

  let currentAngle = -90; // Start from top
  const slices = data.map((item) => {
    const percentage = (item.value / total) * 100;
    const sliceAngle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    // Convert angles to radians
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    // Calculate path
    const radius = size / 2 - 10;
    const centerX = size / 2;
    const centerY = size / 2;

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    const largeArcFlag = sliceAngle > 180 ? 1 : 0;

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');

    // Calculate label position
    const labelAngle = (startAngle + endAngle) / 2;
    const labelRad = (labelAngle * Math.PI) / 180;
    const labelRadius = radius * 0.7;
    const labelX = centerX + labelRadius * Math.cos(labelRad);
    const labelY = centerY + labelRadius * Math.sin(labelRad);

    return {
      pathData,
      color: item.color,
      percentage: percentage.toFixed(1),
      label: item.label,
      labelX,
      labelY,
      value: item.value,
    };
  });

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {slices.map((slice, index) => (
            <g key={index}>
              <path
                d={slice.pathData}
                fill={slice.color}
                stroke="white"
                strokeWidth="2"
                className="transition-opacity hover:opacity-80 cursor-pointer"
              />
              {parseFloat(slice.percentage) > 3 && (
                <text
                  x={slice.labelX}
                  y={slice.labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-white text-xs font-bold pointer-events-none"
                  style={{ fontSize: '12px' }}
                >
                  {slice.percentage}%
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>

      {showLegend && (
        <div className="grid grid-cols-2 gap-3 w-full max-w-xl">
          {data.map((item, index) => {
            const percentage = ((item.value / total) * 100).toFixed(1);
            return (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-700 truncate font-medium">
                    {item.label}
                  </div>
                  <div className="text-xs text-slate-500">
                    {percentage}% ({item.value})
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
