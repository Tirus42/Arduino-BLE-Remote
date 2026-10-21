class SliderElement {
	slider: HTMLInputElement;
	container: HTMLDivElement;
	valueLabel: HTMLLabelElement;
	maxValue: number;

	constructor(slider: HTMLInputElement, container: HTMLDivElement, valueLabel: HTMLLabelElement, maxValue: number) {
		this.slider = slider;
		this.container = container;
		this.valueLabel = valueLabel;
		this.maxValue = maxValue;
	}

	/**
	 * Shows the raw slider value next to the slider, e.g. "128 / 255".
	 */
	updateValueLabel() {
		this.valueLabel.innerText = this.slider.value + ' / ' + this.maxValue;
	}
}

function CreateRangeSlider(id: string, title: string, onColorChangeFunction: () => any, containerClass: string | null = null, minValue: number = 0, maxValue: number = 255) : SliderElement {
	const element = document.createElement('input');
	element.type = 'range';
	element.min = '' + minValue;
	element.max = '' + maxValue;
	element.value = '0';
	element.classList.add('slider');
	element.id = id;
	element.oninput = () => {
		onColorChangeFunction();
	}
	HTML.AddScrollEventToRangeElement(element);

	const text = HTML.CreateSpanElement(title);
	const valueLabel = HTML.CreateLabelElement();
	valueLabel.classList.add('slider-value');

	const labels = HTML.CreateDivElement('slider-labels');
	labels.appendChild(text);
	labels.appendChild(valueLabel);

	const container = HTML.CreateDivElement();

	if (containerClass) {
		container.classList.add('slider-background');
		container.classList.add(containerClass);
	}

	container.appendChild(element);
	container.appendChild(labels);

	const sliderElement = new SliderElement(element, container, valueLabel, maxValue);
	sliderElement.updateValueLabel();

	return sliderElement;
}
