import { RepositoryPlaceholderCard } from './RepositoryPlaceholderCard';

export function RepoEmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center text-text-tertiary">
      <RepositoryPlaceholderCard />
    </div>
  );
}
