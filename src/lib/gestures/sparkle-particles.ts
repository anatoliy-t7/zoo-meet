import type { StrokePalette } from './participant-color';

type Point = { x: number; y: number };

type Sparkle = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	maxLife: number;
	size: number;
	rotation: number;
	rotationSpeed: number;
	colorIndex: 0 | 1 | 2;
};

const MAX_PARTICLES = 220;
const PALETTE_COLORS: readonly ['start', 'mid', 'end'] = ['start', 'mid', 'end'];

/** Lightweight canvas sparkle particles that trail magic strokes. */
export class SparkleEmitter {
	private particles: Sparkle[] = [];
	private lastUpdateMs: number | null = null;

	constructor(private palette: StrokePalette) {}

	/** Update palette when participant identity changes. */
	setPalette(palette: StrokePalette) {
		this.palette = palette;
	}

	/** Spawn sparkles at a screen position. */
	emit(x: number, y: number, count = 3) {
		for (let i = 0; i < count; i++) {
			const angle = Math.random() * Math.PI * 2;
			const speed = 0.4 + Math.random() * 1.4;

			this.particles.push({
				x: x + (Math.random() - 0.5) * 8,
				y: y + (Math.random() - 0.5) * 8,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed - 0.6,
				life: 1,
				maxLife: 350 + Math.random() * 450,
				size: 2.5 + Math.random() * 4.5,
				rotation: Math.random() * Math.PI,
				rotationSpeed: (Math.random() - 0.5) * 0.12,
				colorIndex: Math.floor(Math.random() * 3) as 0 | 1 | 2,
			});
		}

		if (this.particles.length > MAX_PARTICLES) {
			this.particles.splice(0, this.particles.length - MAX_PARTICLES);
		}
	}

	/** Scatter sparkles along a completed stroke. */
	burstAlongStroke(points: readonly Point[], count = 8) {
		if (points.length === 0) {
			return;
		}

		for (let i = 0; i < count; i++) {
			const point = points[Math.floor(Math.random() * points.length)]!;
			this.emit(point.x, point.y, 1);
		}
	}

	/** Advance particle simulation. */
	update(nowMs: number) {
		const lastUpdateMs = this.lastUpdateMs ?? nowMs;
		const deltaMs = Math.min(nowMs - lastUpdateMs, 32);
		this.lastUpdateMs = nowMs;

		for (let i = this.particles.length - 1; i >= 0; i--) {
			const particle = this.particles[i]!;
			particle.x += particle.vx * deltaMs * 0.06;
			particle.y += particle.vy * deltaMs * 0.06;
			particle.vy += 0.015 * deltaMs;
			particle.life -= deltaMs / particle.maxLife;
			particle.rotation += particle.rotationSpeed * deltaMs * 0.05;

			if (particle.life <= 0) {
				this.particles.splice(i, 1);
			}
		}
	}

	/** Draw all active sparkles on top of strokes. */
	draw(ctx: CanvasRenderingContext2D) {
		for (const particle of this.particles) {
			const alpha = particle.life * particle.life;
			const colorKey = PALETTE_COLORS[particle.colorIndex];
			const color = this.palette[colorKey];

			drawSparkleStar(ctx, particle.x, particle.y, particle.size, particle.rotation, color, alpha);
			drawSparkleStar(
				ctx,
				particle.x,
				particle.y,
				particle.size * 0.35,
				particle.rotation,
				'#ffffff',
				alpha * 0.85,
			);
		}
	}

	clear() {
		this.particles = [];
		this.lastUpdateMs = null;
	}

	get hasParticles(): boolean {
		return this.particles.length > 0;
	}
}

/** Draw a small four-point sparkle star. */
const drawSparkleStar = (
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	rotation: number,
	color: string,
	alpha: number,
) => {
	ctx.save();
	ctx.translate(x, y);
	ctx.rotate(rotation);
	ctx.globalAlpha = alpha;
	ctx.fillStyle = color;
	ctx.beginPath();
	ctx.moveTo(0, -size);
	ctx.lineTo(size * 0.18, -size * 0.18);
	ctx.lineTo(size, 0);
	ctx.lineTo(size * 0.18, size * 0.18);
	ctx.lineTo(0, size);
	ctx.lineTo(-size * 0.18, size * 0.18);
	ctx.lineTo(-size, 0);
	ctx.lineTo(-size * 0.18, -size * 0.18);
	ctx.closePath();
	ctx.fill();
	ctx.restore();
};
