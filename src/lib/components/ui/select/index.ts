import { Select as SelectPrimitive } from 'bits-ui';

import SelectContent from './select-content.svelte';
import SelectItem from './select-item.svelte';
import SelectTrigger from './select-trigger.svelte';

const SelectRoot = SelectPrimitive.Root;
const SelectValue = SelectPrimitive.Value;

export {
	SelectRoot as Root,
	SelectValue as Value,
	SelectContent as Content,
	SelectItem as Item,
	SelectTrigger as Trigger,
};

export type { SelectRootProps as RootProps } from 'bits-ui';
