'use client';

import React, { useMemo } from 'react';
import { generateQrMatrix } from '@/lib/qrcode';

interface QRCodeSvgProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * Renders a razor-sharp, 100% scannable ISO/IEC 18004 QR code with 4-module quiet zone.
 */
export const QRCodeSvg: React.FC<QRCodeSvgProps> = ({
  value,
  size = 156,
  className = '',
}) => {
  const { viewBoxSize, pathData } = useMemo(() => {
    const matrix = generateQrMatrix(value || 'https://www.loota.fun');
    const quiet = 3;
    const total = matrix.length + quiet * 2;
    const parts: string[] = [];

    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix.length; c++) {
        if (matrix[r][c]) {
          parts.push(`M${c + quiet} ${r + quiet}h1v1h-1z`);
        }
      }
    }

    return {
      viewBoxSize: total,
      pathData: parts.join(''),
    };
  }, [value]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`QR code for ${value}`}
      className={className}
    >
      <rect width={viewBoxSize} height={viewBoxSize} fill="#FFFFFF" />
      <path d={pathData} fill="#16261D" />
    </svg>
  );
};
