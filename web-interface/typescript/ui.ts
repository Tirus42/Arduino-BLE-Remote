class SliderElement {
	slider: HTMLInputElement;
	container: HTMLDivElement;

	constructor(slider: HTMLInputElement, container: HTMLDivElement) {
		this.slider = slider;
		this.container = container;
	}
}

function CreateRangeSlider(id: string, title: string, onColorChangeFunction: () => any, containerClass: string | null = null) : SliderElement {
	const element = document.createElement('input');
	element.type = 'range';
	element.min = '0';
	element.max = '255';
	element.value = '0';
	element.classList.add('slider');
	element.id = id;
	element.oninput = () => {
		onColorChangeFunction();
	}

	const text = HTML.CreateSpanElement(title);

	const container = HTML.CreateDivElement();

	if (containerClass) {
		container.classList.add('slider-background');
		container.classList.add(containerClass);
	}

	container.appendChild(element);
	container.appendChild(text);

	return new SliderElement(element, container);
}
