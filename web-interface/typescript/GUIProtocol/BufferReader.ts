class BufferReader {
	dataView : DataView;
	offset : number;

	constructor(buffer: DataView) {
		this.dataView = buffer;
		this.offset = 0;
	}

	getRemainingSize() : number {
		return this.dataView.byteLength - this.offset;
	}

	extractUint8() : number {
		this._checkRange(1);
		const value = this.dataView.getUint8(this.offset);
		this.offset += 1;
		return value;
	}

	extractUint32(bigEndian: boolean = false) : number {
		this._checkRange(4);
		const value = this.dataView.getUint32(this.offset, bigEndian);
		this.offset += 4;
		return value;
	}

	extractInt32(bigEndian: boolean) : number {
		this._checkRange(4);
		const value = this.dataView.getInt32(this.offset, bigEndian);
		this.offset += 4;
		return value;
	}

	extractData(length: number) : DataView {
		this._checkRange(length);
		const value = this.dataView.buffer.slice(this.offset, this.offset + length);
		this.offset += length;
		return new DataView(value);
	}

	extractRemainingData() : DataView {
		return this.extractData(this.getRemainingSize());
	}

	extractString() : string {
		const strLength = this.extractUint32(true);	// TODO: Figure out, why this is BE
		const strData = this.extractData(strLength);
		return DecodeUTF8String(strData);
	}

	private _checkRange(readSize: number) {
		if (readSize > this.getRemainingSize()) {
			throw 'Buffer range exception';
		}
	}
}
