import type { ReactNode } from "react";
import type { UseQueryResult } from "@tanstack/react-query";

/** Skeleton while the first load is in flight, retryable error if it fails. */
export function QueryState({ query, children, rows = 3 }: { query: UseQueryResult<unknown>; children: ReactNode; rows?: number }) {
  if (query.isPending) {
    return (
      <div className="task-list" aria-busy="true" aria-label="Loading">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="skeleton" />
        ))}
      </div>
    );
  }

  if (query.isError && !query.data) {
    return (
      <div className="empty error-state" role="alert">
        <p>{query.error instanceof Error ? query.error.message : "Something went wrong loading this."}</p>
        <button onClick={() => void query.refetch()}>Try again</button>
      </div>
    );
  }

  return <>{children}</>;
}
