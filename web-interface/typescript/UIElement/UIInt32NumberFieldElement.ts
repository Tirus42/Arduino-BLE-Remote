class UIInt32NumberFieldElement extends AUIElement {
	container: HTMLDivElement;
	numberField: HTMLInputElement;
	min: number = -(0x7FFFFFFF + 1);
	max: number = (0x7FFFFFFF);

	constructor(name: string, parent: UIGroupElement, value: number) {
		super(UIElementType.NumberFieldInt32, name, parent);

		this.container = HTML.CreateDivElement();
		this.numberField = HTML.CreateNumberFieldElement(value);

		this.numberField.min = "" + this.min;
		this.numberField.max = "" + this.max;

		this.numberField.oninput = () => {
			this._clampNumberFieldValue();
		}

		this.numberField.onblur = () => {
			this.onInputValueChange();
		}

		this.numberField.onkeydown = (event: KeyboardEvent) => {
			if (event.key === "Enter") {
				this.onInputValueChange();
			}
		}

		const label = HTML.CreateLabelElement(name + ': ');

		this.container.appendChild(label);
		this.container.appendChild(this.numberField);
	}

	getDomRootElement() : HTMLElement {
		return this.container;
	}

	setValue(newValue: number) {
		this.numberField.value = '' + newValue;
	}

	override setPathValue(path: string[], newValue: ValueWrapper) {
		this.checkValidPath(path);

		if (newValue.type !== ValueType.Int32) {
			throw 'Try to set a incompatible value type';
		}

		this.setValue(newValue.getNumberValue());
	}

	setReadOnly(readOnly: boolean) : UIInt32NumberFieldElement {
		this.numberField.readOnly = readOnly;
		this.numberField.disabled = readOnly;

		return this;
	}

	override setDisabled(disabled: boolean) {
		this.numberField.disabled = disabled;
	}

	getValue() : number {
		return parseInt(this.numberField.value);
	}

	override onInputValueChange() {
		if (this.numberField.readOnly) {
			return;
		}

		super.onInputValueChange(this, new ValueWrapper(this.getValue()));
	}

	private _clampNumberFieldValue() {
		let value : number = parseInt(this.numberField.value);

		if (value > this.max) {
			this.numberField.value = "" + this.max;
		} else if (value < this.min) {
			this.numberField.value = "" + this.min;
		}
	}
}
