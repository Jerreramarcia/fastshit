import { useState } from "react";
import FlowCanvas from "./components/FlowCanvas";
import ProjectSidebar from "./components/ProjectSidebar";

interface Project {
  id: string;
  name: string;
}

let uid = 1;
const nextId = () => `project${uid++}`;

export default function App() {
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
