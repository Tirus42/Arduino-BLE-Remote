class UIRangeElement extends AUIElement {
	container: HTMLDivElement;
	range: HTMLInputElement;
	rawValueLabel: HTMLLabelElement;
	minValue: number;
	maxValue: number;

	constructor(name: string, parent: UIGroupElement, min: number, max: number, value: number) {
		super(UIElementType.RangeSelector, name, parent);

		this.container = HTML.CreateDivElement('bevel');
		this.range = HTML.CreateRangeElement(min, max, value);
		this.rawValueLabel = HTML.CreateLabelElement();
		this.minValue = min;
		this.maxValue = max;

		this.range.oninput = () => {
			this.onInputValueChange();
		}

		const spanDiv = HTML.CreateDivElement('span');
		const span = HTML.CreateSpanElement(name);

		spanDiv.appendChild(span);

		this.container.appendChild(spanDiv);
		this.container.appendChild(this.range);
		this.container.appendChild(this.rawValueLabel);

		this._updateUIValues();
	}

	getDomRootElement() : HTMLElement {
		return this.container;
	}

	setValue(newValue: number) {
		if (newValue > this.maxValue || newValue < this.minValue) {
			throw "Invalid new value, out of bounds of range [" + this.minValue + ", " + this.maxValue + "].";
		}

		this.range.value = '' + newValue;

		this._updateUIValues();
	}

	override setPathValue(path: string[], newValue: ValueWrapper) {
		this.checkValidPath(path);

		if (newValue.type !== ValueType.Number) {
			throw 'Try to set a incompatible value type';
		}

		this.setValue(newValue.getNumberValue());
	}

	override setDisabled(disabled: boolean) {
		this.range.disabled = disabled;
	}

	getValue() : number {
		return parseInt(this.range.value);
	}

	override onInputValueChange() {
		this._updateUIValues();

		super.onInputValueChange(this, new ValueWrapper(this.getValue()));
	}

	private _updateUIValues() {
		this.rawValueLabel.innerHTML = this.getValue() + ' / ' + this.maxValue;
	}
}
