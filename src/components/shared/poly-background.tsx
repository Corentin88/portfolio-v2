import { cn } from "@/lib/utils";

/**
 * Fond polygonal animé de la maquette. Les polygones prennent la couleur du texte
 * (currentColor) : l'appelant passe une classe de texte adaptée au fond.
 */
export function PolyBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
    >
      <svg
        className="poly-a absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <g fill="currentColor">
          <polygon points="-60,120 240,40 180,320" opacity="0.06" />
          <polygon points="900,620 1180,520 1240,780" opacity="0.08" />
          <polygon points="380,760 640,690 560,940" opacity="0.05" />
          <polygon points="1180,60 1400,-20 1360,240" opacity="0.07" />
          <polygon points="640,90 820,20 780,220" opacity="0.04" />
          <polygon points="40,520 260,470 210,700" opacity="0.05" />
        </g>
        <g fill="currentColor" stroke="currentColor" strokeWidth="1.5">
          <polygon points="980,180 1120,140 1090,300" opacity="0.10" />
          <polygon points="200,240 330,200 300,360" opacity="0.08" />
          <polygon points="1240,420 1380,380 1350,540" opacity="0.06" />
        </g>
      </svg>
      <svg
        className="poly-b absolute inset-0 h-full w-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <g fill="currentColor">
          <polygon points="1050,300 1260,240 1300,480" opacity="0.05" />
          <polygon points="120,650 320,580 280,840" opacity="0.06" />
          <polygon points="760,420 900,380 870,540" opacity="0.03" />
          <polygon points="520,120 700,60 660,280" opacity="0.045" />
        </g>
        <g stroke="currentColor" strokeWidth="1.5" fill="none">
          <polygon points="1340,620 1460,580 1440,720" opacity="0.12" />
          <polygon points="60,360 180,320 160,460" opacity="0.10" />
        </g>
      </svg>
    </div>
  );
}
