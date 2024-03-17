class UICheckBoxElement extends AUIElement {
	container: HTMLDivElement;
	label: HTMLLabelElement;
	checkbox: HTMLInputElement;

	constructor(name: string, parent: UIGroupElement, value: boolean) {
		super(UIElementType.CheckBoxSelector, name, parent);

		this.container = HTML.CreateDivElement('check');
		this.label = HTML.CreateLabelElement(name);
		this.checkbox = HTML.CreateCheckboxElement(value);

		this.checkbox.oninput = () => {
			this.onInputValueChange();
		}

		this.container.appendChild(this.label);
		this.container.appendChild(this.checkbox);
	}

	getDomRootElement() : HTMLElement {
		return this.container;
	}

	setState(newState: boolean) {
		this.checkbox.checked = newState;
	}

	override setPathValue(path: string[], newValue: ValueWrapper) {
		this.checkValidPath(path);

		if (newValue.type !== ValueType.Boolean) {
			throw 'Try to set a incompatible value type';
		}

		this.setState(newValue.getBooleanValue());
	}

	override onInputValueChange() {
		const newState: boolean = this.checkbox.checked;

		super.onInputValueChange(this, new ValueWrapper(newState));
	}
}
