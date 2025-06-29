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

function DecodeUTF8String(data: DataView | Uint8Array | ArrayBuffer) : string {
	const dec = new TextDecoder("utf-8");
	return dec.decode(data);
}

function MergeUint8Arrays(array1: Uint8Array, array2: Uint8Array) : Uint8Array {
	const result = new Uint8Array(array1.length + array2.length);
	result.set(array1);
	result.set(array2, array1.length);
	return result;
}

function MergeUint8Arrays3(array1: Uint8Array, array2: Uint8Array, array3: Uint8Array) : Uint8Array{
	return MergeUint8Arrays(MergeUint8Arrays(array1, array2), array3);
}

function MergeUint8Arrays4(array1: Uint8Array, array2: Uint8Array, array3: Uint8Array, array4: Uint8Array) : Uint8Array{
	return MergeUint8Arrays(MergeUint8Arrays(array1, array2), MergeUint8Arrays(array3, array4));
}

function MergeUint8Arrays5(array1: Uint8Array, array2: Uint8Array, array3: Uint8Array, array4: Uint8Array, array5: Uint8Array) : Uint8Array{
	return MergeUint8Arrays(MergeUint8Arrays4(array1, array2, array3, array4), array5);
}

function MemCpy(target: Uint8Array, targetOffset: number, source: Uint8Array, sourceOffset: number, length: number) {
	for (let i = 0; i < length; ++i) {
		target[targetOffset + i] = source[sourceOffset + i];
	}
}

function ReloadPageAndDropWebWorkerCache() {
	if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
		navigator.serviceWorker.controller.postMessage('clearCacheAndReload');
	} else {
		ReloadPage();
	}
}

function ReloadPageAndDropWebWorkerCacheWithPrompt() {
	if (confirm('Do you realy want to force-reload this page? This requires a internet connection.')) {
		ReloadPageAndDropWebWorkerCache();
	}
}

function ReloadPage() {
	window.location.reload();
}
