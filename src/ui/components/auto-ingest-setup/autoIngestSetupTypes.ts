export type DetectionStatus =
	| "idle"
	| "searching"
	| "found"
	| "not-found"
	| "error";

export type WatchPaths = {
	claude: string[];
	cursor: string[];
	codexLogs: string[];
};
