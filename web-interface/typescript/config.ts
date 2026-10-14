class Config {
	static GetShowSecondaryDevices() : boolean {
		return this.GetCheckboxValue('config_show_secondary_devices');
	}

	static GetShowAdvancedFields() : boolean {
		return this.GetCheckboxValue('config_show_advanced_fields');
	}

	static GetLogPingDetails() : boolean {
		return this.GetCheckboxValue('config_log_ping_details');
	}

	static OnChangeShowAdvancedFields() {
		AUIElement.notifyConfigChanges();
	}

	private static GetCheckboxValue(elementId: string) : boolean {
		const elem = document.getElementById(elementId);

		if (!elem) {
			Log("Error: HTML element '" + elementId + "' not found");
			throw "Error: HTML element '" + elementId + "' not found";
		}

		return (elem as HTMLInputElement).checked;
	}
}
