abstract class AUIElement {
	/**
	 * List of all root elements. Required to access them for global events like config changes.
	 * The AUIElement constructor and destructor handles the add/removal.
	 */
	static RootElements : AUIElement[] = [];

	type: UIElementType;
	name: string;
	parent : UIGroupElement | null;
	advanced: boolean = false;

	constructor(type: UIElementType, name: string, parent: UIGroupElement | null) {
		this.type = type;
		this.name = name;
		this.parent = parent;

		if (parent === null) {
			AUIElement.RootElements.push(this);
		}
	}

	destroy() {
		if (this.parent) {
			if (!this.parent.eraseChildByRef(this)) {
				throw "Failed to remove child from parent, child name: " + this.getAbsoluteName();
			}
		} else {
			let index = AUIElement.RootElements.indexOf(this);

			if (index < 0) {
				throw "Expected element not present in the global RootElements list";
			}

			AUIElement.RootElements.splice(index, 1);
		}
	}

	abstract getDomRootElement() : HTMLElement;

	/**
	 * Sets a new value on the control elements specified by the path.
	 * \throws a exception when the path or the data type is invalid.
	 */
	abstract setPathValue(path: string[], newValue: ValueWrapper) : void;

	/**
	 * Enables or disables this and all child elements recursivly.
	 */
	abstract setDisabled(disabled: boolean) : void;

	setAdvanced(advanced: boolean) : void {
		this.advanced = advanced;

		if (advanced && !GetConfig_ShowAdvancedFields()) {
			this.setHidden(true);
		}

		if (!advanced || GetConfig_ShowAdvancedFields()) {
			this.setHidden(false);
		}
	}

	setHidden(hidden: boolean) : void {
		let rootElement = this.getDomRootElement();

		if (hidden) {
			rootElement.style.visibility = 'hidden';
			rootElement.style.height = '0px';
			rootElement.style.margin = '0px 0px 0px 0px';
		} else {
			rootElement.style.removeProperty('visibility');
			rootElement.style.removeProperty('height');
			rootElement.style.removeProperty('margin');
		}
	}

	protected checkValidPath(path: string[]) {
		if (path.length != 1 || path[0] !== this.getName()) {
			throw "Invalid path, got '" + path.toString() + " but is '" + this.getName() + "'";
		}
	}

	getParent() : UIGroupElement | null {
		return this.parent;
	}

	getName() : string {
		return this.name;
	}

	getAbsoluteName() : string[] {
		const ret = this.parent ? this.parent.getAbsoluteName() : [];
		ret.push(this.name);
		return ret;
	}

	onInputValueChange(sourceElement: AUIElement, newValue: ValueWrapper) {
		if (this.parent) {
			this.parent.onInputValueChange(sourceElement, newValue)
		} else {
			Log("Unhanded change event on " + sourceElement.getAbsoluteName());
		}
	}

	onConfigChanged() {
		this.setAdvanced(this.advanced);
	}

	static notifyConfigChanges() {
		AUIElement.RootElements.forEach((root) => {
			root.onConfigChanged();
		});
	}
}
