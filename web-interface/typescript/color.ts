class RGBColor {
	r: number;
	g: number;
	b: number;

	constructor(r: number = 0, g: number = 0, b: number = 0) {
		this.r = r;
		this.g = g;
		this.b = b;
	}

	toHexColor() : string {
		return '#' + this.r.toString(16).padStart(2, '0')
				   + this.g.toString(16).padStart(2, '0')
				   + this.b.toString(16).padStart(2, '0');
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
}

function ExtractRGB(color: string): RGBColor {
    const r = parseInt(color.substr(1,2), 16)
    const g = parseInt(color.substr(3,2), 16)
    const b = parseInt(color.substr(5,2), 16)

	return new RGBColor(r, g, b);
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
}

function ExtractColorChannels(inputString: string) : ColorChannels {
	const r = inputString.includes('R');
	const g = inputString.includes('G');
	const b = inputString.includes('B');
	const w = inputString.includes('W');

	return new ColorChannels(r, g, b, w);
}
