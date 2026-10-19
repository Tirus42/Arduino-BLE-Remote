class UIRangeElement extends AUIElement {
	container: HTMLDivElement;
	range: HTMLInputElement;
	rawValueLabel: HTMLLabelElement;
	minValue: number;
	maxValue: number;
	showPercent: boolean;

	constructor(name: string, parent: UIGroupElement, min: number, max: number, value: number, showPercent: boolean = false) {
		super(UIElementType.RangeSelector, name, parent);

		this.container = HTML.CreateDivElement('bevel');
		this.range = HTML.CreateRangeElement(min, max, value);
		this.rawValueLabel = HTML.CreateLabelElement();
		this.minValue = min;
		this.maxValue = max;
		this.showPercent = showPercent;

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

	override setReadOnly(readOnly: boolean) {
		this.range.readOnly = readOnly;
		this.range.disabled = readOnly;
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

		if (newValue.type !== ValueType.Int32) {
			throw 'Try to set a incompatible value type';
		}

		this.setValue(newValue.getNumberValue());
	}

	getValue() : number {
		return parseInt(this.range.value);
	}

	override onInputValueChange() {
		this._updateUIValues();

		super.onInputValueChange(this, new ValueWrapper(this.getValue()));
	}

	/**
	 * Updates the label next to the slider.
	 *
	 * When the percent flag is set, the value is shown as a percentage of the
	 * range [minValue, maxValue] (e.g. "55.2%"). Otherwise the raw value is shown
	 * (e.g. "10 / 255") as before.
	 */
	private _updateUIValues() {
		if (this.showPercent) {
			this.rawValueLabel.innerHTML = this._getPercentText();
		} else {
			this.rawValueLabel.innerHTML = this.getValue() + ' / ' + this.maxValue;
		}
	}

	/**
	 * \return the current value relative to the range as percentage with one digit of precision.
	 */
	private _getPercentText() : string {
		const range = this.maxValue - this.minValue;

		// Avoid a division by zero for a range without any span.
		if (range <= 0) {
			return '0.0%';
		}

		const percent = (this.getValue() - this.minValue) / range * 100;

		return percent.toFixed(1) + '%';
	}
}
