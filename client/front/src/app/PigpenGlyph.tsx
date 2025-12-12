import React from "react";

type PigpenGlyphProps = {
  letter: string;
  size?: number;
  color?: string;    
  dotColor?: string;  
  strokeWidth?: number;
};

const GLYPH_MAP: Record<string, { d: string; dot: { x: number; y: number } | null }> = {
  A: { d: "M 100,0 L 100,100 L 0,100", dot: null }, 
  B: { d: "M 0,0 L 0,100 L 100,100 L 100,0", dot: null }, 
  C: { d: "M 0,0 L 0,100 L 100,100", dot: null }, 
  D: { d: "M 0,0 L 100,0 L 100,100 L 0,100", dot: null }, 
  E: { d: "M 0,0 L 100,0 L 100,100 L 0,100 Z", dot: null }, 
  F: { d: "M 100,0 L 0,0 L 0,100 L 100,100", dot: null }, 
  G: { d: "M 0,0 L 100,0 L 100,100", dot: null }, 
  H: { d: "M 0,100 L 0,0 L 100,0 L 100,100", dot: null }, 
  I: { d: "M 0,100 L 0,0 L 100,0", dot: null }, 

  J: { d: "M 100,0 L 100,100 L 0,100", dot: { x: 35, y: 35 } },
  K: { d: "M 0,0 L 0,100 L 100,100 L 100,0", dot: { x: 50, y: 30 } },
  L: { d: "M 0,0 L 0,100 L 100,100", dot: { x: 65, y: 35 } },
  M: { d: "M 0,0 L 100,0 L 100,100 L 0,100", dot: { x: 35, y: 50 } },
  N: { d: "M 0,0 L 100,0 L 100,100 L 0,100 Z", dot: { x: 50, y: 50 } },
  O: { d: "M 100,0 L 0,0 L 0,100 L 100,100", dot: { x: 65, y: 50 } },
  P: { d: "M 0,0 L 100,0 L 100,100", dot: { x: 35, y: 65 } },
  Q: { d: "M 0,100 L 0,0 L 100,0 L 100,100", dot: { x: 50, y: 70 } },
  R: { d: "M 0,100 L 0,0 L 100,0", dot: { x: 65, y: 65 } }, 


  S: { d: "M 0,0 L 50,100 L 100,0", dot: null }, 
  

  T: { d: "M 0,0 L 100,50 L 0,100", dot: null }, 
  
  U: { d: "M 100,0 L 0,50 L 100,100", dot: null }, 
  
  V: { d: "M 0,100 L 50,0 L 100,100", dot: null }, 

  
  W: { d: "M 0,0 L 50,100 L 100,0", dot: { x: 50, y: 25 } },


  X: { d: "M 0,0 L 100,50 L 0,100", dot: { x: 30, y: 50 } }, 
  
  Y: { d: "M 100,0 L 0,50 L 100,100", dot: { x: 70, y: 50 } }, 
  
  Z: { d: "M 0,100 L 50,0 L 100,100", dot: { x: 50, y: 75 } },
};

export const PigpenGlyph: React.FC<PigpenGlyphProps> = ({
  letter,
  size = 40,
  color = "#008000",
  dotColor = "#FF0000", 
  strokeWidth = 3,
}) => {
  const char = letter.toLocaleUpperCase("tr").replace("İ", "I");
  const glyphData = GLYPH_MAP[char];

  if (!glyphData) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          fontSize: size * 0.6,
          fontWeight: "bold",
          color: color,
        }}
      >
        {letter}
      </span>
    );
  }

  const pad = 5;
  const viewSize = 100 + pad * 2;
  
  const dotRadius = strokeWidth * 1.2 * (100 / size); 

  return (
    <div style={{ display: "inline-block", margin: "2px" }}>
      <svg
        width={size}
        height={size}
        viewBox={`-${pad} -${pad} ${viewSize} ${viewSize}`}
        style={{ display: "block" }}
      >
        <path
          d={glyphData.d}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth * (100 / size) * 1.5}
          strokeLinecap="butt"
          strokeLinejoin="miter"
        />
        
        {glyphData.dot && (
          <circle
            cx={glyphData.dot.x}
            cy={glyphData.dot.y}
            r={dotRadius}
            fill={dotColor}
          />
        )}
      </svg>
    </div>
  );
};