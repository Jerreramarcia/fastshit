import { BaseEdge, getSmoothStepPath, useStore, type EdgeProps, type ReactFlowState } from "reactflow";

// Cuando dos nodos casi se alinean pero difieren por unos pocos px (por
// redondeo de layout o tamanos distintos), el cable en step dibuja un salto
// en vez de una linea recta. Si la diferencia es chica, forzamos el mismo eje
// en origen y destino para que el tramo salga recto. Nunca mientras se esta
// arrastrando un nodo: el handle real queda en su posicion sin forzar, y
// forzar el otro extremo dejaria el cable "colgando" separado del nodo.
const SNAP_PX = 6;

// Un cable que vuelve hacia atras (el destino queda a la izquierda de donde sale) cruzaria todo
// el diagrama en linea recta. Se rodea por debajo de los nodos, cada uno por su carril, y va
// punteado para que se lea como "vuelta", no como un paso mas.
const LOOP_MARGIN = 18;
const LOOP_LANE_PX = 12;
const LOOP_LANES = 5;
const CORNER_RADIUS = 10;

/** Polilinea ortogonal con las esquinas redondeadas. */
function roundedPath(points: [number, number][], radius: number): string {
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    const [nx, ny] = points[i + 1];
    const r = Math.min(radius, Math.hypot(cx - px, cy - py) / 2, Math.hypot(nx - cx, ny - cy) / 2);
    const ux = Math.sign(cx - px);
    const uy = Math.sign(cy - py);
    const vx = Math.sign(nx - cx);
    const vy = Math.sign(ny - cy);
    d += ` L ${cx - ux * r} ${cy - uy * r} Q ${cx} ${cy} ${cx + vx * r} ${cy + vy * r}`;
  }
  const last = points[points.length - 1];
  return `${d} L ${last[0]} ${last[1]}`;
}

function laneOf(id: string): number {
  let sum = 0;
  for (const ch of id) sum += ch.charCodeAt(0);
  return sum % LOOP_LANES;
}

export default function SnappedStepEdge(props: EdgeProps) {
  const { source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd } =
    props;

  const isEndpointDragging = useStore((s: ReactFlowState) => {
    const src = s.nodeInternals.get(source);
    const tgt = s.nodeInternals.get(target);
    return !!(src?.dragging || tgt?.dragging);
  });

  const diagramBottom = useStore((s: ReactFlowState) => {
    let bottom = -Infinity;
    s.nodeInternals.forEach((n) => {
      bottom = Math.max(bottom, n.positionAbsolute.y + (n.height ?? 0));
    });
    return bottom;
  });

  const isLoop = sourcePosition === "right" && targetPosition === "left" && targetX < sourceX + 2 * LOOP_MARGIN;
  if (isLoop && Number.isFinite(diagramBottom)) {
    const laneY = diagramBottom + LOOP_MARGIN + laneOf(props.id) * LOOP_LANE_PX;
    const path = roundedPath(
      [
        [sourceX, sourceY],
        [sourceX + LOOP_MARGIN, sourceY],
        [sourceX + LOOP_MARGIN, laneY],
        [targetX - LOOP_MARGIN, laneY],
        [targetX - LOOP_MARGIN, targetY],
        [targetX, targetY],
      ],
      CORNER_RADIUS
    );
    return <BaseEdge path={path} style={{ ...style, strokeDasharray: "6 4" }} markerEnd={markerEnd} />;
  }

  let tx = targetX;
  let ty = targetY;

  if (!isEndpointDragging) {
    const horizontal = sourcePosition === "left" || sourcePosition === "right";
    if (horizontal && Math.abs(sourceY - targetY) <= SNAP_PX) {
      ty = sourceY;
    } else if (!horizontal && Math.abs(sourceX - targetX) <= SNAP_PX) {
      tx = sourceX;
    }
  }

  const [path] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX: tx,
    targetY: ty,
    targetPosition,
    borderRadius: props.pathOptions?.borderRadius,
  });

  return <BaseEdge path={path} style={style} markerEnd={markerEnd} />;
}
