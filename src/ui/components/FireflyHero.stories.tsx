import type { Meta, StoryObj } from "@storybook/react";
import { TraceHero } from "../../../landing/TraceHero";

const meta: Meta<typeof TraceHero> = {
	title: "Narrative/Brand/TraceHero",
	component: TraceHero,
	parameters: {
		layout: "fullscreen",
		backgrounds: {
			default: "dark",
			values: [{ name: "dark", value: "oklch(0.16 0.02 255)" }],
		},
	},
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof TraceHero>;

export const Default: Story = {
	args: {
		onExitComplete: () => {
			/* noop */
		},
	},
};

export const MobileView: Story = {
	args: {
		...Default.args,
	},
	parameters: {
		viewport: {
			defaultViewport: "mobile1",
		},
	},
};
