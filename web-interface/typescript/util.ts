function Log(str: string, addNewLine: boolean = true) {
	const element = <HTMLInputElement> document.getElementById('log');

	if (element == null) {
		console.log("Error: Log target not found for log message: " + str);
		return;
	}

	element.value += str;

	if (addNewLine) {
		element.value += '\n';
	}

	element.scrollTop = element.scrollHeight;
}

function LogClear() {
	const element = <HTMLInputElement> document.getElementById('log');

	if (element != null) {
		element.value = '';
	}
}

function EncodeUTF8String(str: string) : Uint8Array {
	const enc = new TextEncoder();
	return enc.encode(str);
}

function DecodeUTF8String(data: DataView) : string {
	const dec = new TextDecoder("utf-8");
	return dec.decode(data);
}

function MergeUint8Arrays(array1: Uint8Array, array2: Uint8Array) {
	const result = new Uint8Array(array1.length + array2.length);
	result.set(array1);
	result.set(array2, array1.length);
	return result;
}
