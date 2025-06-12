abstract class IColor {
	abstract toRGB() : RGBColor;
	abstract toRGBW() : RGBWColor;
	abstract toHSL() : HSLColor;
	abstract toHSLW() : HSLWColor;
}

/**
 * RGB color representation.
 * Stores component values in the range [0, 255] (8 bit per channel).
 */
class RGBColor extends IColor {
	r: number;
	g: number;
	b: number;

	constructor(r: number = 0, g: number = 0, b: number = 0) {
		super();
		this.r = r;
		this.g = g;
		this.b = b;
	}

	toHexColor() : string {
		return '#'	+ this.r.toString(16).padStart(2, '0')
					+ this.g.toString(16).padStart(2, '0')
					+ this.b.toString(16).padStart(2, '0');
	}

	getMaxComponentValue() : number {
		return Math.max(this.r, this.g, this.b);
	}

	scale(factor : number) {
		this.r *= factor;
		this.g *= factor;
		this.b *= factor;
	}

	scaleToMax() : RGBColor {
		const maxValue = this.getMaxComponentValue();

		if (maxValue !== 0) {
			const scaleFactor = 255 / maxValue;

			this.scale(scaleFactor);
		}

		return this;
	}

	override toRGB() : RGBColor {
		return this;
	}

	override toRGBW() : RGBWColor {
		return new RGBWColor(this.r, this.g, this.b, 0);
	}

	override toHSL() : HSLColor {
		const r = this.r / 255;
		const g = this.g / 255;
		const b = this.b / 255;

		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		const delta = max - min;

		let h = 0, s = 0, l = (max + min) / 2;

		if (delta !== 0) {
			s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

			if (max === r) {
				h = (g - b) / delta + (g < b ? 6 : 0);
			} else if (max === g) {
				h = (b - r) / delta + 2;
			} else {
				h = (r - g) / delta + 4;
			}

			h *= 60;
		}

		h = Math.round(h);
		s = Math.round(s * 100);
		l = Math.round(l * 100);

		return new HSLColor(h, s, l);
	}

	override toHSLW() : HSLWColor {
		const hsl = this.toHSL();
		return new HSLWColor(hsl.h, hsl.s, hsl.l, 0);
	}
}

class RGBWColor extends RGBColor {
	w: number;

	constructor(r: number = 0, g: number = 0, b: number = 0, w: number = 0) {
		super(r, g, b);
		this.w = w;
	}

	toUint8Array() : Uint8Array {
		const array = new Uint8Array(4);
		array[0] = this.r;
		array[1] = this.g;
		array[2] = this.b;
		array[3] = this.w;

		return array;
	}

	override getMaxComponentValue() : number {
		return Math.max(this.r, this.g, this.b, this.w);
	}

	override scale(factor : number) {
		this.r *= factor;
		this.g *= factor;
		this.b *= factor;
		this.w *= factor;
	}

	override scaleToMax() : RGBWColor {
		super.scaleToMax();
		return this;
	}

	override toRGBW() : RGBWColor {
		return this;
	}

	override toHSLW() : HSLWColor {
		const hsl = this.toHSL();
		return new HSLWColor(hsl.h, hsl.s, hsl.l, this.w);
	}
}

class HSLColor extends IColor {
	h: number;	// range [0, 360]
	s: number;	// range [0, 100]
	l: number;	// range [0, 100]

	constructor(h: number = 0, s: number = 0, l: number = 0) {
		super();
		this.h = h;
		this.s = s;
		this.l = l;
	}

	override toRGB() : RGBColor {
		const h = this.h;
		const s = this.s / 100;
		const l = this.l / 100;

		const c = (1 - Math.abs(2 * l - 1)) * s;
		const x = c * (1 - Math.abs((h / 60) % 2 - 1));
		const m = l - c / 2;

		let r = 0, g = 0, b = 0;

		if (h >= 0 && h < 60) {
			r = c; g = x; b = 0;
		} else if (h >= 60 && h < 120) {
			r = x; g = c; b = 0;
		} else if (h >= 120 && h < 180) {
			r = 0; g = c; b = x;
		} else if (h >= 180 && h < 240) {
			r = 0; g = x; b = c;
		} else if (h >= 240 && h < 300) {
			r = x; g = 0; b = c;
		} else if (h >= 300 && h < 360) {
			r = c; g = 0; b = x;
		}

		// Convert to [0, 255] range
		r = Math.round((r + m) * 255);
		g = Math.round((g + m) * 255);
		b = Math.round((b + m) * 255);

		return new RGBColor(r, g, b);
	}

	override toRGBW() : RGBWColor {
		const rgb = this.toRGB();
		return new RGBWColor(rgb.r, rgb.g, rgb.b, 0);
	}

	override toHSL() {
		return this;
	}

	override toHSLW() : HSLWColor {
		const hsl = this.toHSL();
		return new HSLWColor(hsl.h, hsl.s, hsl.l, 0);
	}
}

class HSLWColor extends HSLColor {
	w: number;

	constructor(h: number = 0, s: number = 0, l: number = 0, w: number = 0) {
		super(h, s, l);
		this.w = w;
	}

	override toRGBW() : RGBWColor {
		const rgbw = super.toRGBW();
		rgbw.w = this.w;
		return rgbw;
	}

	override toHSLW() : HSLWColor {
		return this;
	}
}

function ExtractRGB(color: string): RGBColor {
	const r = parseInt(color.substr(1,2), 16)
	const g = parseInt(color.substr(3,2), 16)
	const b = parseInt(color.substr(5,2), 16)

	return new RGBColor(r, g, b);
}

function ExtractPackedRGBW(color: number) : RGBWColor {
	const w = (color & 0xFF000000) >> 24;
	const r = (color & 0x00FF0000) >> 16;
	const g = (color & 0x0000FF00) >> 8;
	const b = (color & 0x000000FF);

	return new RGBWColor(r, g, b, w);
}

class ColorChannels {
	r: boolean;
	g: boolean;
	b: boolean;
	w: boolean;

	constructor(r: boolean = true, g: boolean = true, b: boolean = true, w: boolean = true) {
		this.r = r;
		this.g = g;
		this.b = b;
		this.w = w;
	}

	hasFullRGB() : boolean {
		return this.r && this.g && this.b;
	}
}

function ExtractColorChannels(inputString: string) : ColorChannels {
	const r = inputString.includes('R');
	const g = inputString.includes('G');
	const b = inputString.includes('B');
	const w = inputString.includes('W');

	return new ColorChannels(r, g, b, w);
}
