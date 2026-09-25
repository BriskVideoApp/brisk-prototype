import { DsIcon } from "@/components/video-review/DsIcon";
import type { Project } from "@/components/active-videos/types";

export type MediaClientGroup = {
  name: string;
  projectCount: number;
};

type MediaLocationNavigationProps = {
  clients?: MediaClientGroup[];
  projects: Project[];
  selectedClientName: string | null;
  selectedProjectId: string | null;
  onSelectClient: (name: string | null) => void;
  onSelectProject: (id: string | null) => void;
};

export function MediaLocationNavigation({
  clients,
  projects,
  selectedClientName,
  selectedProjectId,
  onSelectClient,
  onSelectProject,
}: MediaLocationNavigationProps) {
  return (
    <>
      {clients ? (
        <aside className="media-project-rail" aria-label="Client media libraries">
          <div className="media-project-rail-heading"><span className="label-s-semibold">Clients</span></div>
          <button
            type="button"
            className={`media-project-rail-item ${selectedClientName === null ? "is-selected" : ""}`}
            aria-pressed={selectedClientName === null}
            onClick={() => onSelectClient(null)}
          >
            <DsIcon name="grid-four" size={17} />
            <span className="label-s-semibold">All clients</span>
          </button>
          <div className="media-project-rail-list">
            {clients.map((client) => (
              <button
                type="button"
                className={`media-project-rail-item ${selectedClientName === client.name ? "is-selected" : ""}`}
                aria-pressed={selectedClientName === client.name}
                key={client.name}
                onClick={() => onSelectClient(client.name)}
              >
                <span className="media-project-rail-mark" aria-hidden="true">{client.name.slice(0, 1)}</span>
                <span>
                  <strong className="label-s-semibold">{client.name}</strong>
                  <small className="label-xs">{client.projectCount} {client.projectCount === 1 ? "project" : "projects"}</small>
                </span>
              </button>
            ))}
          </div>
        </aside>
      ) : null}

      <aside className="media-project-rail" aria-label="Project media libraries">
        <div className="media-project-rail-heading"><span className="label-s-semibold">Projects</span></div>
        <button
          type="button"
          className={`media-project-rail-item ${selectedProjectId === null ? "is-selected" : ""}`}
          aria-pressed={selectedProjectId === null}
          onClick={() => onSelectProject(null)}
        >
          <DsIcon name="grid-four" size={17} />
          <span className="label-s-semibold">All projects</span>
        </button>
        <div className="media-project-rail-list">
          {projects.map((project) => (
            <button
              type="button"
              className={`media-project-rail-item ${selectedProjectId === project.id ? "is-selected" : ""}`}
              aria-pressed={selectedProjectId === project.id}
              key={project.id}
              onClick={() => onSelectProject(project.id)}
            >
              <span className="media-project-rail-mark" aria-hidden="true">{project.name.slice(0, 1)}</span>
              <span>
                <strong className="label-s-semibold">{project.name}</strong>
                <small className="label-xs">{project.clientName}</small>
              </span>
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}
