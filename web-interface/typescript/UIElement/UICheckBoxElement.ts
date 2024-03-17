class UICheckBoxElement extends AUIElement {
	container: HTMLDivElement;
	label: HTMLLabelElement;
	checkbox: HTMLInputElement;

	constructor(name: string, parent: UIGroupElement, value: boolean) {
		super(UIElementType.CheckBoxSelector, name, parent);

		this.container = HTML_CreateDivElement('check');
		this.label = HTML_CreateLabelElement(name);
		this.checkbox = HTML_CreateCheckboxElement(value);

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

	override onInputValueChange() {
		const newState: boolean = this.checkbox.checked;

		super.onInputValueChange(this, new ValueWrapper(newState));
	}
}
