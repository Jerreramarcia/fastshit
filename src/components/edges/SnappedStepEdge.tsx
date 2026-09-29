import { BaseEdge, getSmoothStepPath, type EdgeProps } from "reactflow";

// Cuando dos nodos casi se alinean pero difieren por unos pocos px (por
// redondeo de layout, tamanos distintos, o arrastre manual), el cable en step
// dibuja un salto en vez de una linea recta. Si la diferencia es chica,
// forzamos el mismo eje en origen y destino para que el tramo salga recto.
const SNAP_PX = 6;

export default function SnappedStepEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd } = props;

  let sx = sourceX;
  let sy = sourceY;
  let tx = targetX;
  let ty = targetY;

  const horizontal = sourcePosition === "left" || sourcePosition === "right";
  if (horizontal && Math.abs(sourceY - targetY) <= SNAP_PX) {
    ty = sourceY;
  } else if (!horizontal && Math.abs(sourceX - targetX) <= SNAP_PX) {
    tx = sourceX;
  }

  const [path] = getSmoothStepPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition,
    targetX: tx,
    targetY: ty,
    targetPosition,
    borderRadius: props.pathOptions?.borderRadius,
  });

  return <BaseEdge path={path} style={style} markerEnd={markerEnd} />;
}
