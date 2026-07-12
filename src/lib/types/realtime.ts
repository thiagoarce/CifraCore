// Broadcast protocol for the live stage session (spec 005-setlists-sync,
// plan.md "Arquitetura da Sincronia"). Every event carries the emitter's
// own epoch-ms clock so receivers can discard stale/reordered packets
// (constitution Lei 3: only state events travel, never scroll/position).
export type LiveEvent =
	| { type: 'CHANGE_SONG'; song_id: string; leader_timestamp: number }
	| { type: 'PLAY'; leader_timestamp: number } // consumed by 006 (auto-scroll clock)
	| { type: 'PAUSE'; leader_timestamp: number }
	| { type: 'RESYNC'; elapsed_ms: number; leader_timestamp: number } // 006
	| { type: 'LEADER_CHANGE'; leader_id: string; leader_name: string; leader_timestamp: number }
	| {
			type: 'SUGGESTION';
			suggestion_id: string;
			song_title: string;
			suggested_by_name: string;
			leader_timestamp: number;
	  };
