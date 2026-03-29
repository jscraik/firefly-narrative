export function areStringArraysEqual(
	left: string[] | null,
	right: string[] | null,
) {
	if (left === right) return true;
	if (!left || !right) return false;
	if (left.length !== right.length) return false;
	return left.every((value, index) => value === right[index]);
}

export type StoryAnchorActionContext = {
	expectedRepoId: number | null;
	expectedSelectedCommitSha: string | null;
	expectedIndexedCommitShas: string[] | null;
	isStaleRequest: () => boolean;
};
