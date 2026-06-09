import { z } from 'zod';

export type NormalizedPoint = {
	readonly nx: number;
	readonly ny: number;
};

export type RemoteActiveStroke = {
	readonly handId: number;
	readonly strokeId: string;
	readonly points: readonly NormalizedPoint[];
};

export type RemoteFinalizedStroke = {
	readonly points: readonly NormalizedPoint[];
	readonly expiresAt: number;
};

/** Reactive snapshot of a participant's magic lines for overlay rendering. */
export type MagicStrokeView = {
	readonly active: readonly RemoteActiveStroke[];
	readonly finalized: readonly RemoteFinalizedStroke[];
};

export type OutboundMagicStroke = {
	readonly handId: number;
	readonly strokeId: string;
	readonly points: readonly NormalizedPoint[];
	readonly final?: boolean;
	readonly expiresAt?: number;
};

const normalizedPointSchema = z.object({
	nx: z.number().min(0).max(1),
	ny: z.number().min(0).max(1),
});

export const inboundMagicStrokeSchema = z.object({
	type: z.literal('magic-stroke'),
	from: z.string().min(1).max(256),
	handId: z.number().int().min(0).max(9),
	strokeId: z.string().min(1).max(32),
	points: z.array(normalizedPointSchema).min(1).max(32),
	final: z.boolean().optional(),
	expiresAt: z.number().optional(),
});

export type InboundMagicStroke = z.infer<typeof inboundMagicStrokeSchema>;

export const emptyMagicStrokeView = (): MagicStrokeView => ({
	active: [],
	finalized: [],
});
