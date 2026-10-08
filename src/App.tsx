import { useEffect, useState } from "react";
import FlowCanvas from "./components/FlowCanvas";
import FlowViewer from "./components/FlowViewer";
import ProjectSidebar from "./components/ProjectSidebar";
import { parseShareHash, type ShareTarget } from "./lib/share";

interface Project {
  id: string;
  name: string;
}

let uid = 1;
const nextId = () => `project${uid++}`;

/**
 * Un hash `#/v?...` abre el visor de solo lectura en vez del editor, para que el
 * enlace compartido funcione en el mismo sitio estatico sin router ni servidor.
 */
function useShareTarget(): ShareTarget | null {
  const [target, setTarget] = useState<ShareTarget | null>(() => parseShareHash(window.location.hash));

  useEffect(() => {
    function onHashChange() {
      setTarget(parseShareHash(window.location.hash));
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return target;
}

export default function App() {
  const shareTarget = useShareTarget();
  const [projects, setProjects] = useState<Project[]>([{ id: nextId(), name: "Proyecto 1" }]);
  const [activeId, setActiveId] = useState(() => projects[0].id);
  const [collapsed, setCollapsed] = useState(false);

  function addProject() {
    const p = { id: nextId(), name: `Proyecto ${projects.length + 1}` };
    setProjects((prev) => [...prev, p]);
    setActiveId(p.id);
  }

  function renameProject(id: string, name: string) {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
  }

  function deleteProject(id: string) {
    setProjects((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (next.length === 0) return prev;
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  }

  if (shareTarget) return <FlowViewer target={shareTarget} />;

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <ProjectSidebar
        projects={projects}
        activeId={activeId}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
        onSelect={setActiveId}
        onAdd={addProject}
        onRename={renameProject}
        onDelete={deleteProject}
      />
      <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
        {projects.map((p) => (
          <div key={p.id} style={{ display: p.id === activeId ? "block" : "none", height: "100%" }}>
            <FlowCanvas />
          </div>
        ))}
      </div>
    </div>
  );
}
