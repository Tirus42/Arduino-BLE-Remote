class UIRangeElement extends AUIElement {
	container: HTMLDivElement;
	range: HTMLInputElement;
	minValue: number;
	maxValue: number;

	constructor(name: string, parent: UIGroupElement, min: number, max: number, value: number) {
		super(UIElementType.RangeSelector, name, parent);

		this.container = HTML_CreateDivElement('bevel');
		this.range = HTML_CreateRangeElement(min, max, value);
		this.minValue = min;
		this.maxValue = max;

		this.range.oninput = () => {
			this.onInputValueChange();
		}

		const spanDiv = HTML_CreateDivElement('span');
		const span = HTML_CreateSpanElement(name);

		spanDiv.appendChild(span);

		this.container.appendChild(spanDiv);
		this.container.appendChild(this.range);
	}

	getDomRootElement() : HTMLElement {
		return this.container;
	}

	setValue(newValue: number) {
		if (newValue > this.maxValue || newValue < this.minValue) {
			throw "Invalid new value, out of bounds of range [" + this.minValue + ", " + this.maxValue + "].";
		}

		this.range.value = '' + newValue;
	}

	getValue() : number {
		return parseInt(this.range.value);
	}

	onInputValueChange() {
		super.onInputValueChange(this, new ValueWrapper(this.getValue()));
	}
}
