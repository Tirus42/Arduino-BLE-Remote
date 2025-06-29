class UIColorSelector extends AUIElement {
	container: HTMLDivElement;
	colorPicker: HTMLInputElement;
	btnScaleToMax: HTMLButtonElement;
	btnSwitchMode: HTMLButtonElement;
	sliderR: SliderElement;	// red
	sliderG: SliderElement;	// green
	sliderB: SliderElement;	// blue
	sliderH: SliderElement;	// hue
	sliderS: SliderElement;	// saturation
	sliderL: SliderElement;	// light
	sliderW: SliderElement;	// white
	colorChannels: ColorChannels;
	hslMode: boolean;

	constructor(name: string, parent: UIGroupElement, colorChannels: ColorChannels) {
		super(UIElementType.ColorSelector, name, parent);

		this.container = HTML.CreateDivElement('control-panel');

		this.colorPicker = HTML.CreateColorPickerElement();
		this.btnScaleToMax = HTML.CreateButtonElement('M');
		this.btnSwitchMode = HTML.CreateButtonElement('HSL');

		this.colorPicker.oninput = (_: Event) => {
			const htmlColor = this.colorPicker.value;
			const rgb = ExtractRGB(htmlColor);

			this.onColorChange(new RGBWColor(rgb.r, rgb.g, rgb.b, 0));
		}

		this.colorPicker.dataset.name = name;

		this.btnScaleToMax.onclick = () => {
			this.scaleToMax();
		}
		this.btnScaleToMax.title = 'Scale to max brightness';

		this.btnSwitchMode.onclick = () => {
			this.switchMode();
		}

		const colorPickerText = HTML.CreateSpanElement(' ' + name);

		this.container.appendChild(this.colorPicker);
		this.container.appendChild(this.btnScaleToMax);

		if (colorChannels.hasFullRGB()) {
			this.container.appendChild(this.btnSwitchMode);
		}

		this.container.appendChild(colorPickerText);
		this.container.appendChild(HTML.CreateBrElement());

		const pElement = document.createElement('p');

		const obj = this;

		const onRGBColorChangeFunction = function() {
			const newColor = obj._getSliderRGBWColorValue();
			obj.onColorChange(newColor);
		}

		const onHSLColorChangeFunction = function() {
			const newHSLWColor = obj._getSliderHSLWColorValue();
			obj.onColorChange(newHSLWColor);
		}

		const onWColorChangeFunction = function() {
			onRGBColorChangeFunction();
		}

		this.sliderR = CreateRangeSlider(name + 'R', 'Red', onRGBColorChangeFunction, 'red');
		this.sliderG = CreateRangeSlider(name + 'G', 'Green', onRGBColorChangeFunction, 'green');
		this.sliderB = CreateRangeSlider(name + 'B', 'Blue', onRGBColorChangeFunction, 'blue');

		this.sliderH = CreateRangeSlider(name + 'H', 'Hue', onHSLColorChangeFunction, 'hue', 0, 360);
		this.sliderS = CreateRangeSlider(name + 'S', 'Satur', onHSLColorChangeFunction, 'saturation', 0, 100);
		this.sliderL = CreateRangeSlider(name + 'L', 'Light', onHSLColorChangeFunction, 'lightness', 0, 100);

		this.sliderW = CreateRangeSlider(name + 'W', 'White', onWColorChangeFunction, 'white');

		this.colorChannels = colorChannels;
		this.hslMode = false;

		pElement.appendChild(this.sliderR.container);
		pElement.appendChild(this.sliderG.container);
		pElement.appendChild(this.sliderB.container);

		pElement.appendChild(this.sliderH.container);
		pElement.appendChild(this.sliderS.container);
		pElement.appendChild(this.sliderL.container);

		pElement.appendChild(this.sliderW.container);

		this._applyVisibility();

		this.container.appendChild(pElement);
	}

	getDomRootElement() : HTMLElement {
		return this.container;
	}

	_getSliderRGBWColorValue() : RGBWColor {
		const sliderR = this.sliderR.slider;
		const sliderG = this.sliderG.slider;
		const sliderB = this.sliderB.slider;
		const sliderW = this.sliderW.slider;

		return new RGBWColor(parseInt(sliderR.value), parseInt(sliderG.value), parseInt(sliderB.value), parseInt(sliderW.value));
	}

	_getSliderHSLWColorValue() : HSLWColor {
		const sliderH = this.sliderH.slider;
		const sliderS = this.sliderS.slider;
		const sliderL = this.sliderL.slider;
		const sliderW = this.sliderW.slider;

		return new HSLWColor(parseInt(sliderH.value), parseInt(sliderS.value), parseInt(sliderL.value), parseInt(sliderW.value));
	}

	setValue(newColor: IColor) {
		// Set color picker
		this.colorPicker.value = newColor.toRGB().toHexColor();

		const rgb = newColor.toRGB();

		this.sliderR.slider.value = '' + rgb.r;
		this.sliderG.slider.value = '' + rgb.g;
		this.sliderB.slider.value = '' + rgb.b;

		const hsl = newColor.toHSL();

		this.sliderH.slider.value = '' + hsl.h;
		this.sliderS.slider.value = '' + hsl.s;
		this.sliderL.slider.value = '' + hsl.l;

		this.sliderW.slider.value = '' + newColor.toRGBW().w;
	}

	getValue() : RGBWColor {
		const rgbw = this._getSliderRGBWColorValue();

		if (this.hslMode) {
			const rgb = this._getSliderHSLWColorValue().toRGB();
			rgbw.r = rgb.r;
			rgbw.g = rgb.g;
			rgbw.b = rgb.b;
		}

		return rgbw;
	}

	scaleToMax() {
		const newColor = this._getSliderRGBWColorValue().scaleToMax();
		this.onColorChange(newColor);
	}

	override setPathValue(path: string[], newValue: ValueWrapper) {
		this.checkValidPath(path);

		if (newValue.type !== ValueType.RGBWColor) {
			throw 'Try to set a incompatible value type';
		}

		this.setValue(newValue.getRGBWValue());
	}

	onColorChange(newColor: IColor) {
		// Update all elements
		this.setValue(newColor);

		// Forward event
		this.onInputValueChange(this, new ValueWrapper(newColor.toRGBW()));
	}

	switchMode() {
		if (!this.colorChannels.hasFullRGB()) {
			return;
		}

		this.hslMode = !this.hslMode;
		this._applyVisibility();

		this.btnSwitchMode.innerText = this.hslMode ? 'RGB' : 'HSL';
	}

	_applyVisibility() {
		this.sliderR.container.classList.remove('hidden');
		this.sliderG.container.classList.remove('hidden');
		this.sliderB.container.classList.remove('hidden');

		this.sliderH.container.classList.remove('hidden');
		this.sliderS.container.classList.remove('hidden');
		this.sliderL.container.classList.remove('hidden');

		this.sliderW.container.classList.remove('hidden');

		if (!this.colorChannels.r || this.hslMode) {
			this.sliderR.container.classList.add('hidden');
		}

		if (!this.colorChannels.g || this.hslMode) {
			this.sliderG.container.classList.add('hidden');
		}

		if (!this.colorChannels.b || this.hslMode) {
			this.sliderB.container.classList.add('hidden');
		}

		if (!this.hslMode) {
			this.sliderH.container.classList.add('hidden');
			this.sliderS.container.classList.add('hidden');
			this.sliderL.container.classList.add('hidden');
		}

		if (!this.colorChannels.w) {
			this.sliderW.container.classList.add('hidden');
		}
	}
}
