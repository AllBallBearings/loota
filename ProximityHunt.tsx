import React, { useState } from 'react';

const ProximityHunt = () => {
  const [radius, setRadius] = useState(60);
  const steps = [20, 40, 60, 80, 100];

  return (
    <div className="flex flex-col items-center w-full max-w-[300px] mx-auto p-4 space-y-6 font-sans">
      {/* Proximity Map */}
      <div className="relative w-full aspect-square flex items-center justify-center bg-white rounded-[2rem] shadow-sm border border-slate-100">
        <svg viewBox="0 0 120 120" className="w-full h-full overflow-visible p-6">
          {/* Concentric Circles */}
          {steps.map((step, index) => {
            const isEven = index % 2 === 0;
            const isActive = radius >= step;
            return (
              <g key={step}>
                <circle
                  cx="60"
                  cy="60"
                  r={step / 2}
                  fill="none"
                  stroke={isActive ? "#3b82f6" : "#f1f5f9"}
                  strokeWidth={isActive ? "2" : "1"}
                  className="transition-all duration-300 ease-out"
                />
                {/* Measurement Label - Only every other circle (20m, 60m, 100m) */}
                {isEven && (
                  <text
                    x="60"
                    y={60 - (step / 2) - 4}
                    textAnchor="middle"
                    fontSize="6"
                    className={`font-bold select-none pointer-events-none transition-colors duration-300 ${isActive ? 'fill-blue-500' : 'fill-slate-300'}`}
                  >
                    {step}ft
                  </text>
                )}
              </g>
            );
          })}
          
          {/* Center Point Indicator */}
          <circle cx="60" cy="60" r="3" className="fill-blue-600" />
          <circle cx="60" cy="60" r="8" className="fill-blue-600/10 animate-pulse" />
        </svg>
      </div>

      {/* Slider Component */}
      <div className="w-full">
        <div className="flex justify-between items-end mb-3">
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Search Radius</h3>
            <p className="text-[11px] text-slate-400 font-medium">Adjust proximity</p>
          </div>
          <div className="text-right leading-none">
            <span className="text-2xl font-mono font-bold text-slate-800 tabular-nums">{radius}</span>
            <span className="text-blue-500 font-bold text-sm ml-1">ft</span>
          </div>
        </div>
        
        <input
          type="range"
          min="20"
          max="100"
          step="20"
          value={radius}
          onChange={(e) => setRadius(parseInt(e.target.value))}
          className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700 transition-all"
        />
      </div>
    </div>
  );
};

export default ProximityHunt;