const ID_CONFIG_SHOW_SECONDARY_DEVICES = 'config_show_secondary_devices';
const ID_CONFIG_SHOW_ADVANCED_FIELDS = 'config_show_advanced_fields';
const ID_CONFOG_LOG_PING_DETAILS = 'config_log_ping_details';

class Config {
	static GetShowSecondaryDevices() : boolean {
		return this.GetCheckboxValueById(ID_CONFIG_SHOW_SECONDARY_DEVICES);
	}

	static GetShowAdvancedFields() : boolean {
		return this.GetCheckboxValueById(ID_CONFIG_SHOW_ADVANCED_FIELDS);
	}

	static GetLogPingDetails() : boolean {
		return this.GetCheckboxValueById(ID_CONFOG_LOG_PING_DETAILS);
	}

	static Init() {
		Config.InitCheckboxById(ID_CONFIG_SHOW_SECONDARY_DEVICES);
		Config.InitCheckboxById(ID_CONFIG_SHOW_ADVANCED_FIELDS, AUIElement.notifyConfigChanges);
		Config.InitCheckboxById(ID_CONFOG_LOG_PING_DETAILS);
	}

	private static InitCheckboxById(elementId: string, onChangeFunction?: () => void) {
		const elem = document.getElementById(elementId);

		if (!elem) {
			Log("Error: HTML element '" + elementId + "' not found");
			throw "Error: HTML element '" + elementId + "' not found";
		}

		Config.InitCheckbox(elem as HTMLInputElement, onChangeFunction);
	}

	private static InitCheckbox(checkbox: HTMLInputElement, onChangeFunction?: () => void) {
		const id = checkbox.id;

		checkbox.onclick = () => {
			const newValue = checkbox.checked;

			if (onChangeFunction) {
				onChangeFunction();
			}

			Config.SaveConfigInBrowserStorage(id, newValue);
		}

		const persistedValue = Config.LoadBrowserStoredConfig(id);

		if (typeof persistedValue === "boolean") {
			checkbox.checked = persistedValue;
		}
	}

	private static GetCheckboxValueById(elementId: string) : boolean {
		const elem = document.getElementById(elementId);

		if (!elem) {
			Log("Error: HTML element '" + elementId + "' not found");
			throw "Error: HTML element '" + elementId + "' not found";
		}

		return (elem as HTMLInputElement).checked;
	}

	private static SaveConfigInBrowserStorage(elementId: string, newValue: boolean) {
		try {
			localStorage.setItem(elementId, "" + newValue);
		}
		catch (_) {
			// Ignored (not supported or disabled by the user)
		}
	}

	private static LoadBrowserStoredConfig(elementId: string) : boolean | null {
		try {
			const storedValue = localStorage.getItem(elementId);

			if (!storedValue) {
				return null;
			}

			return storedValue === 'true';
		}
		catch (_) {
			// Ignored (not supported or disabled by the user)
			return null;
		}
	}
}
