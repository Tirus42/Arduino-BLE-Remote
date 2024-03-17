class UIRadioElement extends AUISelectorElement {
	container: HTMLDivElement;
	spanDiv: HTMLDivElement;
	span: HTMLSpanElement;
	innerDiv: HTMLDivElement;
	options: HTMLInputElement[];

	constructor(name: string, parent: UIGroupElement | null, optionNames: string[], selectedIndex = 0) {
		super(UIElementType.RadioSelector, name, parent, optionNames);

		this.container = HTML_CreateDivElement(['bevel', 'radio'])
		this.spanDiv = HTML_CreateDivElement('span');
		this.span = HTML_CreateSpanElement(name);
		this.innerDiv = HTML_CreateDivElement();
		this.options = [];

		const select = HTML_CreateSelectElement();

		for (let i = 0; i < optionNames.length; ++i) {
			const entry = optionNames[i];
			const label = HTML_CreateLabelElement('&nbsp;' + entry);
			const option = HTML_CreateRadioElement(name, entry);

			option.oninput = () => {
				this.onInputValueChange();
			}

			if (i == selectedIndex) {
				option.checked = true;
			}

			label.appendChild(option);
			this.innerDiv.appendChild(label);

			this.options.push(option);
		};

		this.spanDiv.appendChild(this.span);
		this.container.appendChild(this.spanDiv);
		this.container.appendChild(this.innerDiv);
	}

	getDomRootElement() : HTMLElement {
		return this.container;
	}

	override setSelectedIndex(newSelectedIndex: number) {
		super.setSelectedIndex(newSelectedIndex);

		this.options[newSelectedIndex].checked = true;
	}

	override onInputValueChange() {
		for (let i = 0; i < this.options.length; ++i) {
			if (this.options[i].checked) {
				this.setSelectedIndex(i);
				break;
			}
		}

		super.onInputValueChange(this, new ValueWrapper(this.getSelectedIndex()));
	}
}
