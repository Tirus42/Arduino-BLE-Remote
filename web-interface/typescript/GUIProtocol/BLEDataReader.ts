class BLEDataReader {
	buffer: Uint8Array;
	offset: number;
	onCompleteFunction: (wholeBuffer: Uint8Array) => any;

	constructor(expectedSize: number, firstBlock: Uint8Array, onCompleteFunction: (wholeBuffer: Uint8Array) => any) {
		this.buffer = new Uint8Array(expectedSize);
		this.offset = firstBlock.length;
		this.onCompleteFunction = onCompleteFunction;

		MemCpy(this.buffer, 0, firstBlock, 0, firstBlock.length);
	}

	appendData(data: Uint8Array) : boolean {
		MemCpy(this.buffer, this.offset, data, 0, data.length);
		this.offset += data.length;

		if (this.offset === this.buffer.length) {
			this.onCompleteFunction(this.buffer);
			return true;
		}

		return false;
	}
}
