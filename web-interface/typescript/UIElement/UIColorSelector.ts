class UIColorSelector extends AUIElement {
	container: HTMLDivElement;
	colorPicker: HTMLInputElement;
	sliderR: SliderElement;
	sliderG: SliderElement;
	sliderB: SliderElement;
	sliderW: SliderElement;

	constructor(name: string, parent: UIGroupElement, colorChannels: ColorChannels) {
		super(UIElementType.ColorSelector, name, parent);

		this.container = HTML.CreateDivElement('control-panel');

		this.colorPicker = HTML.CreateColorPickerElement();

		this.colorPicker.oninput = (_: Event) => {
			const htmlColor = this.colorPicker.value;
			const rgb = ExtractRGB(htmlColor);

			this.onColorChange(new RGBWColor(rgb.r, rgb.g, rgb.b, 0));
		}

		this.colorPicker.dataset.name = name;

		const colorPickerText = HTML.CreateSpanElement(' ' + name);

		this.container.appendChild(this.colorPicker);
		this.container.appendChild(colorPickerText);
		this.container.appendChild(HTML.CreateBrElement());

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

	override setPathValue(path: string[], newValue: ValueWrapper) {
		this.checkValidPath(path);

		if (newValue.type !== ValueType.RGBWColor) {
			throw 'Try to set a incompatible value type';
		}

		this.setValue(newValue.getRGBWValue());
	}

	onColorChange(newColor: RGBWColor) {
		// Update all elements
		this.setValue(newColor);

		// Forward event
		this.onInputValueChange(this, new ValueWrapper(newColor));
	}
}
