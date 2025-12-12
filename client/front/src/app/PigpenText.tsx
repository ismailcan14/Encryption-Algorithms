import React from "react";
import { PigpenGlyph } from "./PigpenGlyph";

type PigpenTextProps = {
  text: string;
};

export const PigpenText: React.FC<PigpenTextProps> = ({ text }) => {
  const chars = Array.from(text);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 4,
        alignItems: "center",
      }}
    >
      {chars.map((ch, i) => (
        <PigpenGlyph key={i} letter={ch} size={20} />
      ))}
    </div>
  );
};
