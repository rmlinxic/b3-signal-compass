import { useCallback, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface CandleData {
  /** Data formatada (DD/MM) para o eixo X */
  time: string;
  /** ISO string completo para o tooltip (data exata do pregao) */
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  /** Media central da BB(20) */
  sma20: number;
  bbUpper: number;
  bbLower: number;
  sma50: number | null;
  sma200: number | null;
}

interface CandlestickChartProps {
  data: CandleData[];
  height?: number;
  /** '1d' = diario, '1wk' = semanal. Influencia o label de horario do tooltip. */
  timeframe?: '1d' | '1wk';
}

const fmtR$ = (v: number) => `R$ ${v.toFixed(2)}`;

const fmtVol = (v: number) =>
  v >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)}M`
    : v >= 1_000
    ? `${(v / 1_000).toFixed(0)}K`
    : v.toString();

/**
 * Converte ISO string para data legivel usando metodos UTC,
 * evitando deslocamento de fuso horario (timestamps do Yahoo Finance
 * para B3 chegam como meia-noite UTC = 21h BRT do dia anterior).
 */
const fmtFullDate = (iso: string): string => {
  const d = new Date(iso);
  const days = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  const wd = days[d.getUTCDay()];
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${wd}, ${dd}/${mm}/${yyyy}`;
};

export const CandlestickChart = ({
  data,
  height = 400,
  timeframe = '1d',
}: CandlestickChartProps) => {
  const sliced = data.slice(-80);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------
  const layout = useMemo(() => {
    if (sliced.length === 0) return null;

    const pL = 64, pR = 16, pT = 16, pB = 32;
    const vW = 900, vH = height;

    const allHighs = sliced.map((d) => Math.max(d.high, d.bbUpper));
    const allLows = sliced.map((d) => Math.min(d.low, d.bbLower));
    const maxP = Math.max(...allHighs);
    const minP = Math.min(...allLows);
    const range = maxP - minP || 1;
    const pad = range * 0.05;
    const yMax = maxP + pad;
    const yMin = minP - pad;

    const plotW = vW - pL - pR;
    const plotH = vH - pT - pB;
    const spacing = plotW / sliced.length;
    const cw = Math.max(2, spacing * 0.6);

    const toX = (i: number) => pL + i * spacing + spacing / 2;
    const toY = (p: number) => pT + plotH - ((p - yMin) / (yMax - yMin)) * plotH;

    return { vW, vH, pL, pR, pT, pB, plotW, plotH, yMax, yMin, spacing, cw, toX, toY };
  }, [sliced, height]);

  // ---------------------------------------------------------------------------
  // Mouse handlers
  // ---------------------------------------------------------------------------
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!layout || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const scaleX = layout.vW / rect.width;
      const vx = cx * scaleX;
      const raw = (vx - layout.pL - layout.spacing / 2) / layout.spacing;
      const idx = Math.max(0, Math.min(sliced.length - 1, Math.round(raw)));
      setHoveredIdx(idx);
      setMousePos({ x: cx, y: cy });
    },
    [layout, sliced.length]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredIdx(null);
    setMousePos(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------
  const yTicks = useMemo(() => {
    if (!layout) return [];
    const step = (layout.yMax - layout.yMin) / 6;
    return Array.from({ length: 7 }, (_, i) => layout.yMin + step * i);
  }, [layout]);

  if (!layout || sliced.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground text-sm"
        style={{ height }}
      >
        Sem dados disponiveis
      </div>
    );
  }

  const { vW, vH, pL, pT, pB, plotW, plotH, cw, toX, toY } = layout;

  const xStep = Math.max(1, Math.floor(sliced.length / 10));

  const buildPath = (acc: (d: CandleData) => number | null) => {
    let first = true;
    return sliced
      .map((d, i) => {
        const v = acc(d);
        if (v == null) return '';
        const cmd = first ? ((first = false), 'M') : 'L';
        return `${cmd}${toX(i).toFixed(1)},${toY(v).toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');
  };

  const bbUpPath = buildPath((d) => d.bbUpper);
  const bbLowPath = buildPath((d) => d.bbLower);
  const sma20Path = buildPath((d) => d.sma20);
  const sma50Path = buildPath((d) => d.sma50);
  const sma200Path = buildPath((d) => d.sma200);

  const bbFill =
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

  const maxVol = Math.max(...sliced.map((d) => d.volume), 1);
  const volH = plotH * 0.12;
  const hovCandle = hoveredIdx !== null ? sliced[hoveredIdx] : null;

  // Tooltip position
  const ctrW = containerRef.current?.clientWidth ?? 640;
  const ttW = 215;
  const ttLeft = mousePos
    ? mousePos.x + 18 + ttW > ctrW
      ? mousePos.x - ttW - 10
      : mousePos.x + 18
    : 0;
  const ttTop = mousePos
    ? Math.max(4, Math.min(mousePos.y - 60, height - 310))
    : 0;

  // Crosshair price tag clamped to plot area
  const closeY = hovCandle ? toY(hovCandle.close) : 0;
  const tagY = Math.max(pT + 8, Math.min(pT + plotH - 8, closeY));

  const closingTimeLabel =
    timeframe === '1wk'
      ? 'Fechamento de sexta-feira — 17:30 BRT (B3)'
      : 'Fechamento do pregao B3 — 17:30 BRT';

  return (
    <div
      ref={containerRef}
      style={{ height, position: 'relative' }}
      className="w-full cursor-crosshair select-none"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <svg
        viewBox={`0 0 ${vW} ${vH}`}
        preserveAspectRatio="none"
        className="w-full h-full"
        style={{ overflow: 'visible' }}
      >
        {/* Background */}
        <rect x={pL} y={pT} width={plotW} height={plotH} fill="hsl(var(--card))" rx={2} />

        {/* Grid + Y ticks */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={pL} x2={pL + plotW}
              y1={toY(tick)} y2={toY(tick)}
              stroke="hsl(var(--chart-grid))" strokeWidth={0.5}
            />
            <text
              x={pL - 6} y={toY(tick)}
              textAnchor="end" dominantBaseline="middle"
              fill="hsl(var(--muted-foreground))" fontSize={9} fontFamily="monospace"
            >
              {tick.toFixed(2)}
            </text>
          </g>
        ))}

        {/* X labels */}
        {sliced.map((d, i) =>
          i % xStep === 0 ? (
            <text
              key={i} x={toX(i)} y={pT + plotH + 16}
              textAnchor="middle"
              fill="hsl(var(--muted-foreground))" fontSize={8} fontFamily="monospace"
            >
              {d.time}
            </text>
          ) : null
        )}

        {/* BB fill + bands */}
        <path d={bbFill} fill="hsl(var(--chart-bb))" opacity={0.06} />
        <path d={bbUpPath} fill="none" stroke="hsl(var(--chart-bb))" strokeWidth={1} opacity={0.5} />
        <path d={bbLowPath} fill="none" stroke="hsl(var(--chart-bb))" strokeWidth={1} opacity={0.5} />

        {/* SMA20 — BB middle (dashed cyan) */}
        <path d={sma20Path} fill="none" stroke="hsl(var(--chart-bb))" strokeWidth={1} strokeDasharray="4 2" opacity={0.45} />

        {/* SMA50 — purple solid */}
        <path d={sma50Path} fill="none" stroke="hsl(var(--chart-sma))" strokeWidth={1.5} opacity={0.9} />

        {/* SMA200 — amber dashed */}
        <path d={sma200Path} fill="none" stroke="hsl(var(--chart-sma200))" strokeWidth={1.5} strokeDasharray="6 3" opacity={0.9} />

        {/* Volume (subtle, behind candles) */}
        {sliced.map((d, i) => (
          <rect
            key={`v${i}`}
            x={toX(i) - cw / 2}
            y={pT + plotH - (d.volume / maxVol) * volH}
            width={cw}
            height={(d.volume / maxVol) * volH}
            fill={d.close >= d.open ? 'hsl(var(--chart-candle-up))' : 'hsl(var(--chart-candle-down))'}
            opacity={hoveredIdx === i ? 0.38 : 0.1}
          />
        ))}

        {/* Candles */}
        {sliced.map((d, i) => {
          const isUp = d.close >= d.open;
          const col = isUp
            ? 'hsl(var(--chart-candle-up))'
            : 'hsl(var(--chart-candle-down))';
          const x = toX(i);
          const bTop = toY(Math.max(d.open, d.close));
          const bBot = toY(Math.min(d.open, d.close));
          const bH = Math.max(1, bBot - bTop);
          const isHov = hoveredIdx === i;
          return (
            <g key={i} opacity={hoveredIdx !== null && !isHov ? 0.4 : 1}>
              <line x1={x} x2={x} y1={toY(d.high)} y2={toY(d.low)} stroke={col} strokeWidth={1} />
              <rect
                x={x - cw / 2} y={bTop} width={cw} height={bH}
                fill={col} stroke={col} strokeWidth={isHov ? 1.5 : 0.4} rx={0.5}
              />
            </g>
          );
        })}

        {/* Crosshair */}
        {hoveredIdx !== null && hovCandle && (
          <>
            {/* Vertical dashed */}
            <line
              x1={toX(hoveredIdx)} x2={toX(hoveredIdx)}
              y1={pT} y2={pT + plotH}
              stroke="hsl(var(--muted-foreground))" strokeWidth={1}
              strokeDasharray="3 3" opacity={0.65}
            />
            {/* Horizontal dashed at close */}
            <line
              x1={pL} x2={pL + plotW}
              y1={closeY} y2={closeY}
              stroke="hsl(var(--primary))" strokeWidth={0.8}
              strokeDasharray="3 3" opacity={0.5}
            />
            {/* Price tag box on Y axis */}
            <rect
              x={pL - 60} y={tagY - 9}
              width={57} height={18}
              fill="hsl(var(--primary))" rx={3}
            />
            <text
              x={pL - 31} y={tagY}
              textAnchor="middle" dominantBaseline="middle"
              fill="hsl(var(--primary-foreground))"
              fontSize={9} fontFamily="monospace" fontWeight="bold"
            >
              {hovCandle.close.toFixed(2)}
            </text>
          </>
        )}
      </svg>

      {/* HTML Tooltip */}
      {hovCandle && mousePos && (
        <div
          style={{
            position: 'absolute',
            top: ttTop,
            left: ttLeft,
            width: ttW,
            pointerEvents: 'none',
            zIndex: 50,
          }}
          className="rounded-lg border border-border bg-card/95 backdrop-blur-sm shadow-xl p-3 space-y-2.5 text-xs"
        >
          {/* Data e horario */}
          <div className="border-b border-border pb-2">
            <p className="font-semibold text-foreground text-[12px] font-mono">
              {fmtFullDate(hovCandle.timestamp)}
            </p>
            <p className="text-[9px] text-muted-foreground mt-1 leading-snug">
              {closingTimeLabel}
            </p>
          </div>

          {/* OHLCV */}
          <div className="space-y-1">
            {([
              { l: 'Abertura', v: hovCandle.open, cls: 'text-foreground' },
              { l: 'Maxima',   v: hovCandle.high, cls: 'text-signal-buy' },
              { l: 'Minima',   v: hovCandle.low,  cls: 'text-signal-sell' },
              {
                l: 'Fechamento',
                v: hovCandle.close,
                cls: hovCandle.close >= hovCandle.open
                  ? 'text-signal-buy'
                  : 'text-signal-sell',
              },
            ] as { l: string; v: number; cls: string }[]).map(({ l, v, cls }) => (
              <div key={l} className="flex justify-between items-center">
                <span className="text-muted-foreground">{l}</span>
                <span className={cn('font-mono font-semibold', cls)}>{fmtR$(v)}</span>
              </div>
            ))}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Volume</span>
              <span className="font-mono text-foreground">{fmtVol(hovCandle.volume)}</span>
            </div>
          </div>

          {/* Indicadores */}
          <div className="border-t border-border pt-2 space-y-1">
            {[
              { l: 'BB Sup.', v: hovCandle.bbUpper, cls: 'text-foreground' },
              { l: 'BB Med.', v: hovCandle.sma20,   cls: 'text-foreground' },
              { l: 'BB Inf.', v: hovCandle.bbLower, cls: 'text-foreground' },
            ].map(({ l, v, cls }) => (
              <div key={l} className="flex justify-between">
                <span className="text-[color:hsl(var(--chart-bb))] opacity-80">{l}</span>
                <span className={cn('font-mono', cls)}>{v.toFixed(2)}</span>
              </div>
            ))}

            {hovCandle.sma50 != null && (
              <div className="flex justify-between">
                <span className="text-[color:hsl(var(--chart-sma))]">SMA50</span>
                <span
                  className={cn(
                    'font-mono font-medium',
                    hovCandle.close >= hovCandle.sma50
                      ? 'text-signal-buy'
                      : 'text-signal-sell'
                  )}
                >
                  {hovCandle.sma50.toFixed(2)}
                </span>
              </div>
            )}

            {hovCandle.sma200 != null && (
              <div className="flex justify-between">
                <span className="text-[color:hsl(var(--chart-sma200))]">SMA200</span>
                <span
                  className={cn(
                    'font-mono font-medium',
                    hovCandle.close >= hovCandle.sma200
                      ? 'text-signal-buy'
                      : 'text-signal-sell'
                  )}
                >
                  {hovCandle.sma200.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
