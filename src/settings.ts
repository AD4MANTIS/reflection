import { App, PluginSettingTab, Setting } from "obsidian";
import Reflection from "./main";

export type PluginSettings = {
	lookBack: number;
}

export const DEFAULT_SETTINGS: PluginSettings = {
	lookBack: 5
}

export class ReflectionSettingTab extends PluginSettingTab {
	plugin: Reflection;

	constructor(app: App, plugin: Reflection) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Look back')
			.setDesc('How many past years to look back')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.lookBack.toString())
				.onChange(async (value) => {
					const newLookBack = Number(value);

					if (isNaN(newLookBack) || newLookBack < 0) {
						return;
					}

					const intLookBack = Math.round(newLookBack);
					this.plugin.settings.lookBack = intLookBack;

					await this.plugin.saveSettings();
				}));
	}
}
