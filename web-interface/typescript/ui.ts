enum UIControlElementType {
	Group,
	ColorSelector,
}

abstract class AUIControlElement {
	type: UIControlElementType;
	name: string;
	parent : UIElementGroup | null;

	constructor(type: UIControlElementType, name: string, parent: UIElementGroup | null) {
		this.type = type;
		this.name = name;
		this.parent = parent;
	}

	destroy() {
		if (this.parent) {
			if (!this.parent.eraseChildByRef(this)) {
				throw "Failed to remove child from parent, child name: " + this.getAbsoluteName();
			}
		}
	}

	abstract getDomRootElement() : HTMLElement;

	getParent() : UIElementGroup | null {
		return this.parent;
	}

	getName() : string {
		return this.name;
	}

	getAbsoluteName() : string[] {
		const ret = this.parent ? this.parent.getAbsoluteName() : [];
		ret.push(this.name);
		return ret;
	}

	onInputValueChange(sourceElement: AUIControlElement) {
		if (this.parent) {
			this.parent.onInputValueChange(sourceElement)
		} else {
			Log("Unhanded change event on " + sourceElement.getAbsoluteName());
		}
	}
}

class UIElementGroup extends AUIControlElement {
	container: HTMLDivElement;
	headerDiv : HTMLDivElement;
	elements: AUIControlElement[];

	constructor(name: string, parent: UIElementGroup | null) {
		super(UIControlElementType.Group, name, parent);

		this.container = HTML_CreateDivElement('bevel');
		this.headerDiv = HTML_CreateDivElement('span');
		this.elements = []

		{
			this.addToGroupHeader(HTML_CreateSpanElement(this.name));
			this.container.appendChild(this.headerDiv);
		}

		let parentHTMLElement = parent ? parent.container : document.body;
		parentHTMLElement.appendChild(this.container);
	}

	destroy() {
		const parentHTMLContainer = this.parent ? this.parent.container : document.body;
		parentHTMLContainer.removeChild(this.container);

		super.destroy();
	}

	getDomRootElement() : HTMLElement {
		return this.container;
	}

	addRGBWColorPicker(name: string, colorChannels: ColorChannels) : UIColorSelector {
		const colorSelector = new UIColorSelector(name, this, colorChannels);

		this.elements.push(colorSelector);
		this.container.appendChild(colorSelector.container);
		return colorSelector;
	}

	addGroup(name: string) : UIElementGroup {
		const group = new UIElementGroup(name, this);
		this.elements.push(group);
		this.container.appendChild(group.container);
		return group;
	}

	addToGroupHeader(htmlElement: HTMLElement) {
		this.headerDiv.appendChild(htmlElement);
	}

	getDivContainer() : HTMLDivElement {
		return this.container;
	}

	getChildByName(name: string) : AUIControlElement | null {
		for (let i = 0; i < this.elements.length; ++i) {
			if (this.elements[i].getName() == name) {
				return this.elements[i];
			}
		}

		return null;
	}

	eraseChildByRef(ref: AUIControlElement) : boolean {
		for (let i = 0; i < this.elements.length; ++i) {
			if (this.elements[i] === ref) {
				this.elements.splice(i, 1);
				this.container.removeChild(ref.getDomRootElement());
				return true;
			}
		}

		return false;
	}

	removeChildByName(name: string) : boolean {
		for (let i = 0; i < this.elements.length; ++i) {
			if (this.elements[i].getName() == name) {
				this.elements[i].destroy();
				return true;
			}
		}

		return false;
	}
}

class UIColorSelector extends AUIControlElement {
	container: HTMLDivElement;
	colorPicker: HTMLInputElement;
	sliderR: SliderElement;
	sliderG: SliderElement;
	sliderB: SliderElement;
	sliderW: SliderElement;

	constructor(name: string, parent: UIElementGroup, colorChannels: ColorChannels) {
		super(UIControlElementType.ColorSelector, name, parent)

		this.container = HTML_CreateDivElement('control-panel');

		this.colorPicker = HTML_CreateColorPickerElement();

		this.colorPicker.oninput = (_: Event) => {
			const htmlColor = this.colorPicker.value;
			const rgb = ExtractRGB(htmlColor);

			this.onColorChange(new RGBWColor(rgb.r, rgb.g, rgb.b, 0));
		}

		this.colorPicker.dataset.name = name;

		const colorPickerText = HTML_CreateSpanElement(' ' + name);

		this.container.appendChild(this.colorPicker);
		this.container.appendChild(colorPickerText);
		this.container.appendChild(HTML_CreateBrElement());

		const pElement = document.createElement('p');

		const obj = this;

		const onColorChangeFunction = function() {
			const newColor = obj._getSliderColorValue();
			obj.onColorChange(newColor);
		}

		this.sliderR = CreateRangeSlider(name + 'R', 'Red', onColorChangeFunction, 'red');
		this.sliderG = CreateRangeSlider(name + 'G', 'Green', onColorChangeFunction, 'green');
		this.sliderB = CreateRangeSlider(name + 'B', 'Blue', onColorChangeFunction, 'blue');
		this.sliderW = CreateRangeSlider(name + 'W', 'White', onColorChangeFunction, 'white');

		pElement.appendChild(this.sliderR.container);
		pElement.appendChild(this.sliderG.container);
		pElement.appendChild(this.sliderB.container);
		pElement.appendChild(this.sliderW.container);

		if (!colorChannels.r) {
			this.sliderR.container.classList.add('hidden');
		}

		if (!colorChannels.g) {
			this.sliderG.container.classList.add('hidden');
		}

		if (!colorChannels.b) {
			this.sliderB.container.classList.add('hidden');
		}

		if (!colorChannels.w) {
			this.sliderW.container.classList.add('hidden');
		}

		this.container.appendChild(pElement);
	}

	getDomRootElement() : HTMLElement {
		return this.container;
	}

	_getSliderColorValue() : RGBWColor {
		const sliderR = this.sliderR.slider;
		const sliderG = this.sliderG.slider;
		const sliderB = this.sliderB.slider;
		const sliderW = this.sliderW.slider;

		return new RGBWColor(parseInt(sliderR.value), parseInt(sliderG.value), parseInt(sliderB.value), parseInt(sliderW.value));
	}

	setValue(newColor: RGBWColor) {
		// Set color picker
		this.colorPicker.value = newColor.toHexColor()

		this.sliderR.slider.value = '' + newColor.r;
		this.sliderG.slider.value = '' + newColor.g;
		this.sliderB.slider.value = '' + newColor.b;
		this.sliderW.slider.value = '' + newColor.w
	}

	getValue() : RGBWColor {
		return this._getSliderColorValue();
	}

	onColorChange(newColor: RGBWColor) {
		// Update all elements
		this.setValue(newColor);

		// Forward event
		this.onInputValueChange(this);
	}
}

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

	const text = HTML_CreateSpanElement(title);

	const container = HTML_CreateDivElement();// document.createElement('div');

	if (containerClass) {
		container.classList.add('slider-background');
		container.classList.add(containerClass);
	}

	container.appendChild(element);
	container.appendChild(text);

	return new SliderElement(element, container);
}
