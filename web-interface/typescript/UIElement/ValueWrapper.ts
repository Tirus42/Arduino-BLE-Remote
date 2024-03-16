enum ValueType {
	Number = 0,
	String = 1,
	Boolean = 2,
	RGBWColor = 3,
}

class ValueWrapper {
	type: ValueType;
	value: number | string | boolean | RGBWColor;

	constructor(value: number | string | boolean | RGBWColor) {
		this.type = this._determineType(value);
		this.value = value;
	}

	getNumberValue() : number {
		if (this.type === ValueType.Number) {
			return <number>this.value;
		}

		throw 'Wrong data type: ' + this.type;
	}

	getStringValue() : string {
		if (this.type === ValueType.String) {
			return <string>this.value;
		}

		throw 'Wrong data type: ' + this.type;
	}

	getBooleanValue() : boolean {
		if (this.type === ValueType.Boolean) {
			return <boolean>this.value;
		}

		throw 'Wrong data type: ' + this.type;
	}

	getRGBWValue() : RGBWColor {
		if (this.type === ValueType.RGBWColor) {
			return <RGBWColor>this.value;
		}

		throw 'Wrong data type: ' + this.type;
	}

	private _determineType(value: number | string | boolean | RGBWColor) : ValueType {
		if (typeof value === 'number') {
			return ValueType.Number;
		}

		if (typeof value === 'string') {
			return ValueType.String;
		}

		if (typeof value === 'boolean') {
			return ValueType.Boolean;
		}

		if (value instanceof RGBWColor) {
			return ValueType.RGBWColor;
		}

		throw "Unsupported type of value '" + value + "'";
	}
}
