import { BaseEdge, getSmoothStepPath, useStore, type EdgeProps, type ReactFlowState } from "reactflow";

// Cuando dos nodos casi se alinean pero difieren por unos pocos px (por
// redondeo de layout o tamanos distintos), el cable en step dibuja un salto
// en vez de una linea recta. Si la diferencia es chica, forzamos el mismo eje
// en origen y destino para que el tramo salga recto. Nunca mientras se esta
// arrastrando un nodo: el handle real queda en su posicion sin forzar, y
// forzar el otro extremo dejaria el cable "colgando" separado del nodo.
const SNAP_PX = 6;

export default function SnappedStepEdge(props: EdgeProps) {
  const { source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd } =
    props;

  const isEndpointDragging = useStore((s: ReactFlowState) => {
    const src = s.nodeInternals.get(source);
    const tgt = s.nodeInternals.get(target);
    return !!(src?.dragging || tgt?.dragging);
  });

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
