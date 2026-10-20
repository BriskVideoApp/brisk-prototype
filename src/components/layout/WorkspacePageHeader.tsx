import type { ReactNode } from "react";
import styles from "./WorkspacePageHeader.module.css";

type WorkspacePageHeaderProps = {
  title: string;
  supportingText?: string;
  actions?: ReactNode;
};

// Shared workspace composition. Project, profile and dialog headings retain their own hierarchy.
export function WorkspacePageHeader({ title, supportingText, actions }: WorkspacePageHeaderProps) {
  return (
    <header className={styles.header} aria-label={`${title} header`}>
      <div className={styles.titleGroup}>
        <h1 className={`${styles.title} headings-m-bold`}>{title}</h1>
        {supportingText ? <p className={`${styles.supportingText} paragraph-s`}>{supportingText}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}
