import { useMemo } from 'react';

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  sma20: number;
  bbUpper: number;
  bbLower: number;
  sma100: number;
}

interface CandlestickChartProps {
  data: CandleData[];
  height?: number;
}

export const CandlestickChart = ({ data, height = 400 }: CandlestickChartProps) => {
  const sliced = data.slice(-80);

  const layout = useMemo(() => {
    if (sliced.length === 0) return null;

    const paddingLeft = 60;
    const paddingRight = 16;
    const paddingTop = 16;
    const paddingBottom = 32;
    const chartWidth = 100; // percent-based, will use viewBox
    const viewBoxW = 900;
    const viewBoxH = height;

    const allHighs = sliced.map((d) => Math.max(d.high, d.bbUpper));
    const allLows = sliced.map((d) => Math.min(d.low, d.bbLower));
    const maxPrice = Math.max(...allHighs);
    const minPrice = Math.min(...allLows);
    const priceRange = maxPrice - minPrice || 1;
    const padding = priceRange * 0.05;
    const yMax = maxPrice + padding;
    const yMin = minPrice - padding;

    const plotW = viewBoxW - paddingLeft - paddingRight;
    const plotH = viewBoxH - paddingTop - paddingBottom;

    const candleSpacing = plotW / sliced.length;
    const candleWidth = Math.max(2, candleSpacing * 0.6);

    const toX = (i: number) => paddingLeft + i * candleSpacing + candleSpacing / 2;
    const toY = (price: number) =>
      paddingTop + plotH - ((price - yMin) / (yMax - yMin)) * plotH;

    return {
      viewBoxW,
      viewBoxH,
      paddingLeft,
      paddingRight,
      paddingTop,
      paddingBottom,
      plotW,
      plotH,
      yMax,
      yMin,
      candleWidth,
      toX,
      toY,
    };
  }, [sliced, height]);

  // Y-axis tick values
  const yTicks = useMemo(() => {
    if (!layout) return [];
    const range = layout.yMax - layout.yMin;
    const step = range / 6;
    const ticks: number[] = [];
    for (let i = 0; i <= 6; i++) {
      ticks.push(layout.yMin + step * i);
    }
    return ticks;
  }, [layout]);

  if (!layout || sliced.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground text-sm"
        style={{ height }}
      >
        Sem dados disponíveis
      </div>
    );
  }

  const { viewBoxW, viewBoxH, paddingLeft, paddingTop, paddingBottom, plotW, plotH, yMin, yMax, candleWidth, toX, toY } = layout;

  // X-axis labels (show every Nth)
  const xLabelInterval = Math.max(1, Math.floor(sliced.length / 10));

  // Build line paths
  const buildPath = (accessor: (d: CandleData) => number) =>
    sliced
      .map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(accessor(d)).toFixed(1)}`)
      .join(' ');

  const bbUpperPath = buildPath((d) => d.bbUpper);
  const bbLowerPath = buildPath((d) => d.bbLower);
  const sma20Path = buildPath((d) => d.sma20);
  const sma100Path = buildPath((d) => d.sma100);

  // BB fill area
  const bbFillPath =
    sliced
      .map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(d.bbUpper).toFixed(1)}`)
      .join(' ') +
    ' ' +
    sliced
      .slice()
      .reverse()
      .map((d, i) => `L${toX(sliced.length - 1 - i).toFixed(1)},${toY(d.bbLower).toFixed(1)}`)
      .join(' ') +
    ' Z';

  return (
    <div style={{ height }} className="w-full">
      <svg
        viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
        preserveAspectRatio="none"
        className="w-full h-full"
        style={{ overflow: 'visible' }}
      >
        {/* Background */}
        <rect
          x={paddingLeft}
          y={paddingTop}
          width={plotW}
          height={plotH}
          fill="hsl(var(--card))"
          rx={2}
        />

        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <g key={`y-${i}`}>
            <line
              x1={paddingLeft}
              x2={paddingLeft + plotW}
              y1={toY(tick)}
              y2={toY(tick)}
              stroke="hsl(var(--chart-grid))"
              strokeWidth={0.5}
            />
            <text
              x={paddingLeft - 6}
              y={toY(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              fill="hsl(var(--muted-foreground))"
              fontSize={9}
              fontFamily="JetBrains Mono, monospace"
            >
              {tick.toFixed(2)}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {sliced.map((d, i) =>
          i % xLabelInterval === 0 ? (
            <text
              key={`x-${i}`}
              x={toX(i)}
              y={paddingTop + plotH + 16}
              textAnchor="middle"
              fill="hsl(var(--muted-foreground))"
              fontSize={8}
              fontFamily="JetBrains Mono, monospace"
            >
              {d.time}
            </text>
          ) : null
        )}

        {/* BB fill */}
        <path d={bbFillPath} fill="hsl(var(--chart-bb))" opacity={0.06} />

        {/* BB upper/lower */}
        <path d={bbUpperPath} fill="none" stroke="hsl(var(--chart-bb))" strokeWidth={1} opacity={0.5} />
        <path d={bbLowerPath} fill="none" stroke="hsl(var(--chart-bb))" strokeWidth={1} opacity={0.5} />

        {/* SMA20 (BB middle) */}
        <path
          d={sma20Path}
          fill="none"
          stroke="hsl(var(--chart-bb))"
          strokeWidth={1}
          strokeDasharray="4 2"
          opacity={0.6}
        />

        {/* SMA100 */}
        <path
          d={sma100Path}
          fill="none"
          stroke="hsl(var(--chart-sma))"
          strokeWidth={1.5}
        />

        {/* Candlesticks */}
        {sliced.map((d, i) => {
          const isUp = d.close >= d.open;
          const color = isUp
            ? 'hsl(var(--chart-candle-up))'
            : 'hsl(var(--chart-candle-down))';
          const x = toX(i);
          const bodyTop = toY(Math.max(d.open, d.close));
          const bodyBottom = toY(Math.min(d.open, d.close));
          const bodyHeight = Math.max(1, bodyBottom - bodyTop);
          const wickTop = toY(d.high);
          const wickBottom = toY(d.low);

          return (
            <g key={i}>
              {/* Wick */}
              <line
                x1={x}
                x2={x}
                y1={wickTop}
                y2={wickBottom}
                stroke={color}
                strokeWidth={1}
              />
              {/* Body */}
              <rect
                x={x - candleWidth / 2}
                y={bodyTop}
                width={candleWidth}
                height={bodyHeight}
                fill={isUp ? color : color}
                stroke={color}
                strokeWidth={0.5}
                rx={0.5}
              />
            </g>
          );
        })}

        {/* Volume bars at bottom (subtle) */}
        {(() => {
          const maxVol = Math.max(...sliced.map((d) => d.volume), 1);
          const volHeight = plotH * 0.12;
          return sliced.map((d, i) => {
            const isUp = d.close >= d.open;
            const barH = (d.volume / maxVol) * volHeight;
            return (
              <rect
                key={`vol-${i}`}
                x={toX(i) - candleWidth / 2}
                y={paddingTop + plotH - barH}
                width={candleWidth}
                height={barH}
                fill={isUp ? 'hsl(var(--chart-candle-up))' : 'hsl(var(--chart-candle-down))'}
                opacity={0.15}
              />
            );
          });
        })()}
      </svg>
    </div>
  );
};
