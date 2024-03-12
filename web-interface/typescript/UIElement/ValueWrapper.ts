enum ValueType {
	Number,
	String,
	Boolean,
	RGBWColor,
}

class ValueWrapper {
	type: ValueType;
	value: number | string | boolean | RGBWColor;

	constructor(value: number | string | boolean | RGBWColor) {
		this.type = this._determineType(value);
		this.value = value;
	}

	getNumberValue() : Number {
		if (this.type === ValueType.Number) {
			return <Number>this.value;
		}

		throw 'Wrong data type: ' + this.type;
	}

	getStringValue() : String {
		if (this.type === ValueType.String) {
			return <String>this.value;
		}

		throw 'Wrong data type: ' + this.type;
	}

	getBooleanValue() : Boolean {
		if (this.type === ValueType.Boolean) {
			return <Boolean>this.value;
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

		if (value instanceof String) {
			return ValueType.String;
		}

		if (value instanceof Boolean) {
			return ValueType.Boolean;
		}

		if (value instanceof RGBWColor) {
			return ValueType.RGBWColor;
		}

		throw "Unsupported type of value '" + value + "'";
	}
}
