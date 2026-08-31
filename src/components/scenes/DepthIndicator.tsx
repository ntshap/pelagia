/**
 * The live depth readout.
 *
 * Interpolated smoothly across transitions by the timeline store and written
 * straight into the DOM — this component renders once and then never again,
 * no matter how fast the visitor scrolls.
 */
import { memo, useEffect, useRef } from 'react';
import { scenes } from '@/config/scenes';
import { subscribeFrame } from '@/hooks/useActiveScene';

export interface DepthIndicatorProps {
  className?: string;
  valueClassName?: string;
  unitClassName?: string;
  /** Round to this many metres. */
  step?: number;
  showUnit?: boolean;
}

const formatter = new Intl.NumberFormat('en-US');

function DepthIndicatorImpl({
  className,
  valueClassName,
  unitClassName,
  step = 1,
  showUnit = true,
}: DepthIndicatorProps) {
  const valueRef = useRef<HTMLSpanElement | null>(null);
  const lastRef = useRef<number>(-1);

  useEffect(() => {
    return subscribeFrame((state) => {
      const element = valueRef.current;
      if (!element) return;
      const rounded = Math.round(state.depth / step) * step;
      if (rounded === lastRef.current) return;
      lastRef.current = rounded;
      element.textContent = formatter.format(rounded);
    });
  }, [step]);

  return (
    <span className={className}>
      <span ref={valueRef} className={valueClassName}>
        {formatter.format(scenes[0].depth)}
      </span>
      {showUnit ? <span className={unitClassName}> M</span> : null}
    </span>
  );
}

export const DepthIndicator = memo(DepthIndicatorImpl);
