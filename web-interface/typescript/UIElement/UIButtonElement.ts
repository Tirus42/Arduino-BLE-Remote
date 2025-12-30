class UIButtonElement extends AUIElement {
	container: HTMLDivElement;
	button: HTMLButtonElement;

	constructor(name: string, parent: UIGroupElement) {
		super(UIElementType.Button, name, parent);

		this.container = HTML.CreateDivElement('bevel');
		this.button = HTML.CreateButtonElement(name);

		this.container.appendChild(this.button);

		this.button.onclick = () => {
			this.onInputValueChange(this, new ValueWrapper(true));
		}
	}

	getDomRootElement() : HTMLElement {
		return this.container;
	}

	override setPathValue(path: string[], newValue: ValueWrapper) {
		this.checkValidPath(path);
		// This is ignored here, as the button does not store its state
		// TODO: Trigger a click animation here?
	}

	override setReadOnly(readOnly: boolean) {
		this.button.disabled = readOnly;
	}
}
