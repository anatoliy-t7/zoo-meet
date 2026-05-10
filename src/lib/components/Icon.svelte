<script lang="ts">
	import { HugeiconsIcon } from '@hugeicons/svelte';
	import type { IconSvgElement } from '@hugeicons/svelte';

	let {
		icon,
		altIcon = undefined,
		showAlt = false,
		size = 24,
		color = 'currentColor',
		strokeWidth = 1.5,
		...restProps
	} = $props<{
		icon: IconSvgElement;
		altIcon?: IconSvgElement;
		showAlt?: boolean;
		size?: number | string;
		color?: string;
		strokeWidth?: number;
		absoluteStrokeWidth?: boolean;
		class?: string;
		className?: string;
	}>();
</script>

<HugeiconsIcon {icon} {altIcon} {showAlt} {size} {color} {strokeWidth} {...restProps} />
