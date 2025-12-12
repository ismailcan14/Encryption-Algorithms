import React from "react";
import { PigpenGlyph } from "./PigpenGlyph";
import { AZ } from "../../../cryption/alph";

export const PigpenLegend: React.FC = () => {
  const letters = Array.from(AZ); 

  return (
    <div
      style={{
        border: "1px solid #333",
        borderRadius: 8,
        padding: 8,
        marginTop: 12,
        background: "#060606",
        color: "#e6e6e6",
      }}
    >
      <div
        style={{
          fontWeight: 600,
          marginBottom: 8,
          fontSize: 13,
          opacity: 0.9,
        }}
      >
        PigPen Legend (AZ → sembol)
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(60px, 1fr))",
          gap: 8,
          fontSize: 11,
        }}
      >
        {letters.map((ch) => (
          <div
            key={ch}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
            }}
          >
            <PigpenGlyph letter={ch} size={22} />
            <span>{ch}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
