abstract class AUITextFieldElement extends AUIElement {
	container: HTMLDivElement;
	textField: HTMLInputElement;
	maxLength: number;

	constructor(type: UIElementType, name: string, parent: UIGroupElement, value: string, maxLength: number) {
		super(type, name, parent);

		this.container = HTML.CreateDivElement();
		this.textField = this.createTextField(value);
		this.maxLength = maxLength;

		this.textField.oninput = () => {
			if (this.maxLength != -1 && this.getValue().length > this.maxLength) {
				const limitedText = this.getValue().substring(0, this.maxLength);
				this.setValue(limitedText);
			}

			this.onInputValueChange();
		}

		const label = HTML.CreateLabelElement(name + ': ');

		this.container.appendChild(label);
		this.container.appendChild(this.textField);
	}

	abstract createTextField(value: string) : HTMLInputElement;

	getDomRootElement() : HTMLElement {
		return this.container;
	}

	override setPathValue(path: string[], newValue: ValueWrapper) {
		this.checkValidPath(path);

		if (newValue.type !== ValueType.String) {
			throw 'Try to set a incompatible value type';
		}

		this.setValue(newValue.getStringValue());
	}

	setValue(newValue: string) {
		this.textField.value = newValue;
	}

	getValue() : string {
		return this.textField.value;
	}

	override onInputValueChange() {
		super.onInputValueChange(this, new ValueWrapper(this.getValue()));
	}
}
