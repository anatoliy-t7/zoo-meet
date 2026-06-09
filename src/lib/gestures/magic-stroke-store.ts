import {
	emptyMagicStrokeView,
	type InboundMagicStroke,
	type MagicStrokeView,
	type NormalizedPoint,
	type OutboundMagicStroke,
	type RemoteActiveStroke,
	type RemoteFinalizedStroke,
} from './magic-stroke-sync';

type MutableActiveStroke = {
	handId: number;
	strokeId: string;
	points: NormalizedPoint[];
};

type ParticipantStrokeState = {
	active: Map<string, MutableActiveStroke>;
	finalized: RemoteFinalizedStroke[];
};

/** In-memory stroke state with helpers to merge inbound batches and build views. */
export class MagicStrokeStore {
	private readonly states = new Map<string, ParticipantStrokeState>();

	getView(identity: string): MagicStrokeView {
		const state = this.states.get(identity);
		if (!state) {
			return emptyMagicStrokeView();
		}
		return toView(state);
	}

	applyInbound(packet: InboundMagicStroke) {
		const state = this.states.get(packet.from) ?? {
			active: new Map<string, MutableActiveStroke>(),
			finalized: [],
		};

		let active = state.active.get(packet.strokeId);
		if (!active) {
			active = { handId: packet.handId, strokeId: packet.strokeId, points: [] };
		}

		active.points.push(...packet.points);

		if (packet.final && packet.expiresAt) {
			if (active.points.length >= 2) {
				state.finalized.push({
					points: [...active.points],
					expiresAt: packet.expiresAt,
				});
			}
			state.active.delete(packet.strokeId);
		} else {
			state.active.set(packet.strokeId, active);
		}

		state.finalized = state.finalized.filter((stroke) => stroke.expiresAt > Date.now());
		this.states.set(packet.from, state);
		return toView(state);
	}

	removeParticipant(identity: string) {
		this.states.delete(identity);
	}

	clear() {
		this.states.clear();
	}
}

const toView = (state: ParticipantStrokeState): MagicStrokeView => {
	const active: RemoteActiveStroke[] = [...state.active.values()].map((stroke) => ({
		handId: stroke.handId,
		strokeId: stroke.strokeId,
		points: [...stroke.points],
	}));

	return {
		active,
		finalized: state.finalized
			.filter((stroke) => stroke.expiresAt > Date.now())
			.map((stroke) => ({
				points: [...stroke.points],
				expiresAt: stroke.expiresAt,
			})),
	};
};

export type { OutboundMagicStroke };
