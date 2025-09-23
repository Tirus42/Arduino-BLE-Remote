class HTML {
	static CreateDivElement(optDivClasses: string | string[] | null = null) : HTMLDivElement {
		if (optDivClasses != null && !(optDivClasses instanceof Array)) {
			return HTML.CreateDivElement([optDivClasses]);
		}

		const elem = document.createElement('div');

		if (optDivClasses) {
			optDivClasses.forEach(clazz => {
				elem.classList.add(clazz);
			});
		}

		return elem;
	}

	static CreateSpanElement(optInnerText: string | null = null) : HTMLSpanElement {
		const elem = document.createElement('span');

		if (optInnerText) {
			elem.innerText = optInnerText;
		}

		return elem;
	}

	static CreateRangeElement(min: number, max: number, value: number) : HTMLInputElement {
		const elem = document.createElement('input');
		elem.type = 'range';
		elem.min = '' + min;
		elem.max = '' + max;
		elem.value = '' + value;
		return elem;
	}

	static CreateColorPickerElement() : HTMLInputElement {
		const elem = document.createElement('input');
		elem.type = 'color';
		return elem;
	}

	static CreateCheckboxElement(value: boolean) : HTMLInputElement {
		const elem = document.createElement('input');
		elem.type = 'checkbox';
		elem.checked = value;
		return elem;
	}

	static CreateRadioElement(name: string, value: string) : HTMLInputElement {
		const elem = document.createElement('input');
		elem.type = 'radio';
		elem.name = name;
		elem.value = value;
		return elem;
	}

	static CreateButtonElement(name: string) : HTMLButtonElement {
		const elem = document.createElement('button');
		elem.innerText = name;
		return elem;
	}

	static CreateSelectElement() : HTMLSelectElement {
		return document.createElement('select');
	}

	static CreateOptionElement(value: string) : HTMLOptionElement {
		const elem = document.createElement('option');
		elem.value = value;
		return elem;
	}

	static CreateNumberFieldElement(value: number) : HTMLInputElement {
		const elem = document.createElement('input');
		elem.type = 'number';
		elem.value = '' + value;
		return elem;
	}

	static CreateTextFieldElement(value: string) : HTMLInputElement {
		const elem = document.createElement('input');
		elem.type = 'text';
		elem.value = value;
		return elem;
	}

	static CreatePasswordFieldElement(value: string) : HTMLInputElement {
		const elem = document.createElement('input');
		elem.type = 'password';
		elem.value = value;
		return elem;
	}

	static CreateLabelElement(optValue: string | null) : HTMLLabelElement {
		const elem = document.createElement('label');

		if (optValue) {
			elem.innerHTML = optValue;
		}

		return elem;
	}

	static CreateBrElement() : HTMLBRElement {
		return document.createElement('br');
	}

	static CreateBoldElement(value: string) : HTMLElement {
		let element = document.createElement('b');
		element.innerText = value;
		return element;
	}

	static CreateAnchorElement(url: string) : HTMLAnchorElement {
		let element = document.createElement('a');
		element.href = url;
		return element;
	}

	static CreateImageElement(src: string) : HTMLImageElement {
		let img = document.createElement('img');
		img.src = src;
		return img;
	}

	static CreateHElement(headerNumber: number, text: string) : HTMLElement {
		let element = document.createElement('h' + headerNumber);
		element.innerText = text;
		return element;
	}
}
