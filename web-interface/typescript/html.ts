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
}
