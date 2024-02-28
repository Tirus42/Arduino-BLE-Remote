function HTML_CreateDivElement(optDivClasses: string | string[] | null = null) : HTMLDivElement {
	if (optDivClasses != null && !(optDivClasses instanceof Array)) {
		return HTML_CreateDivElement([optDivClasses]);
	}

	const elem = document.createElement('div');

	if (optDivClasses) {
		optDivClasses.forEach(clazz => {
			elem.classList.add(clazz);
		});
	}

	return elem;
}

function HTML_CreateSpanElement(optInnerText: string | null = null) : HTMLSpanElement {
	const elem = document.createElement('span');

	if (optInnerText) {
		elem.innerText = optInnerText;
	}

	return elem;
}

function HTML_CreateRangeElement(min: number, max: number, value: number) : HTMLInputElement {
	const elem = document.createElement('input');
	elem.type = 'range';
	elem.min = '' + min;
	elem.max = '' + max;
	elem.value = '' + value;
	return elem;
}

function HTML_CreateColorPickerElement() : HTMLInputElement {
	const elem = document.createElement('input');
	elem.type = 'color';
	return elem;
}

function HTML_CreateCheckboxElement(value: boolean) : HTMLInputElement {
	const elem = document.createElement('input');
	elem.type = 'checkbox';
	elem.checked = value;
	return elem;
}

function HTML_CreateRadioElement(name: string, value: string) : HTMLInputElement {
	const elem = document.createElement('input');
	elem.type = 'radio';
	elem.name = name;
	elem.value = value;
	return elem;
}

function HTML_CreateButtonElement(name: string) : HTMLButtonElement {
	const elem = document.createElement('button');
	elem.innerText = name;
	return elem;
}

function HTML_CreateSelectElement() : HTMLSelectElement {
	return document.createElement('select');
}

function HTML_CreateOptionElement(value: string) : HTMLOptionElement {
	const elem = document.createElement('option');
	elem.value = value;
	return elem;
}

function HTML_CreateLabelElement(optValue: string | null) : HTMLLabelElement {
	const elem = document.createElement('label');

	if (optValue) {
		elem.innerHTML = optValue;
	}

	return elem;
}

function HTML_CreateBrElement() : HTMLBRElement {
	return document.createElement('br');
}
