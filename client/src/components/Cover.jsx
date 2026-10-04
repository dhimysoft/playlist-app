import { useState } from "react";

// a few gradients so a missing cover still looks designed, picked from the text
const GRADIENTS = [
  ["#1ed760", "#0b6e30"],
  ["#7b61ff", "#2b1b8f"],
  ["#ff6b6b", "#8f1d3a"],
  ["#ffb347", "#a0480a"],
  ["#36c5f0", "#0b4a7a"],
  ["#f368e0", "#6b1a73"],
];

function pickGradient(seed) {
  let hash = 0;
  for (const ch of String(seed)) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

// square cover art. Shows the image, or a gradient with the first letter
// while there's no image (not looked up yet, none found, or it failed to load)
export default function Cover({ src, label = "", seed, className = "" }) {
  // remember which url failed so a new url gets a fresh try
  const [failedSrc, setFailedSrc] = useState(null);
  const showImage = src && src !== failedSrc;

  const [from, to] = pickGradient(seed ?? label);

  return (
    <div
      className={`cover ${className}`}
      style={
        showImage
          ? undefined
          : { background: `linear-gradient(135deg, ${from}, ${to})` }
      }
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span className="cover-initial">
          {label.trim().charAt(0).toUpperCase() || "♪"}
        </span>
      )}
    </div>
  );
}
