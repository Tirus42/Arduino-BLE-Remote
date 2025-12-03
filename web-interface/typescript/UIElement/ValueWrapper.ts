enum ValueType {
	Int32 = 0,
	String = 1,
	Boolean = 2,
	RGBWColor = 3,
	Float32 = 4,
}

class ValueWrapper {
	type: ValueType;
	value: number | string | boolean | RGBWColor;

	constructor(value: number | string | boolean | RGBWColor) {
		this.type = this._determineType(value);
		this.value = value;
	}

	getNumberValue() : number {
		if (this.type === ValueType.Int32 || this.type == ValueType.Float32) {
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
			if (this._determinePossibleInt32(value)) {
				return ValueType.Int32;
			}

			return ValueType.Float32;
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

	/**
	 * Determines if the given number can be represented as int32 value or requires a floating point representation.
	 * Checks the value range, possible Infinity/NaN value and decimal places.
	 */
	private _determinePossibleInt32(value: number) : boolean {
		// Signed 32‑bit integer limits
		const INT32_MIN = -0x80000000; // -2^31
		const INT32_MAX = 0x7FFFFFFF; //  2^31 – 1

		if (!Number.isFinite(value)) {
			return false;
		}

		if (Number.isInteger(value) && value >= INT32_MIN && value <= INT32_MAX) {
			return true;
		}

		return false;
	}
}
