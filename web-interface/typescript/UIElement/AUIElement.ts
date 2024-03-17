abstract class AUIElement {
	type: UIElementType;
	name: string;
	parent : UIGroupElement | null;

	constructor(type: UIElementType, name: string, parent: UIGroupElement | null) {
		this.type = type;
		this.name = name;
		this.parent = parent;
	}

	destroy() {
		if (this.parent) {
			if (!this.parent.eraseChildByRef(this)) {
				throw "Failed to remove child from parent, child name: " + this.getAbsoluteName();
			}
		}
	}

	abstract getDomRootElement() : HTMLElement;

	/**
	 * Sets a new value on the control elements specified by the path.
	 * \throws a exception when the path or the data type is invalid.
	 */
	abstract setPathValue(path: string[], newValue: ValueWrapper) : void;

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
}
