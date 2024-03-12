class UIDropDownElement extends AUISelectorElement {
	container: HTMLDivElement;
	nameDiv: HTMLDivElement;
	dropDown: HTMLSelectElement;
	options: HTMLOptionElement[];

	constructor(name: string, parent: UIGroupElement | null, optionNames: string[], selectedIndex = 0) {
		super(UIElementType.DropDownSelector, name, parent, optionNames);

		this.container = HTML_CreateDivElement('select');
		this.nameDiv = HTML_CreateDivElement();
		this.dropDown = HTML_CreateSelectElement();
		this.options = [];

		this.nameDiv.innerText = name;
		this.dropDown.oninput = () => {
			this.onInputValueChange();
		}

		for (let i = 0; i < optionNames.length; ++i) {
			const option = HTML_CreateOptionElement(optionNames[i]);
			option.innerText = optionNames[i];

			if (i == selectedIndex) {
				option.selected = true;
			}

			this.dropDown.appendChild(option);
			this.options.push(option);
		};

		this.container.appendChild(this.nameDiv);
		this.container.appendChild(this.dropDown);
	}

	getDomRootElement() : HTMLElement {
		return this.container;
	}

	setSelectedIndex(newSelectedIndex: number) {
		super.setSelectedIndex(newSelectedIndex);

		this.options[newSelectedIndex].selected = true;
	}

	onInputValueChange() {
		for (let i = 0; i < this.options.length; ++i) {
			if (this.options[i].selected) {
				this.setSelectedIndex(i);
				break;
			}
		}

		super.onInputValueChange(this, new ValueWrapper(this.getSelectedIndex()));
	}
}
