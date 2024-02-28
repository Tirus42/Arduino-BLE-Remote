class UIGroupElement extends AUIElement {
	container: HTMLDivElement;
	headerDiv : HTMLDivElement;
	elements: AUIElement[];

	constructor(name: string, parent: UIGroupElement | null) {
		super(UIElementType.Group, name, parent);

		this.container = HTML_CreateDivElement('bevel');
		this.headerDiv = HTML_CreateDivElement('span');
		this.elements = []

		{
			this.addToGroupHeader(HTML_CreateSpanElement(this.name));
			this.container.appendChild(this.headerDiv);
		}

		let parentHTMLElement = parent ? parent.container : document.body;
		parentHTMLElement.appendChild(this.container);
	}

	destroy() {
		const parentHTMLContainer = this.parent ? this.parent.container : document.body;
		parentHTMLContainer.removeChild(this.container);

		super.destroy();
	}

	getDomRootElement() : HTMLElement {
		return this.container;
	}

	addRGBWColorPicker(name: string, colorChannels: ColorChannels) : UIColorSelector {
		const colorSelector = new UIColorSelector(name, this, colorChannels);
		this._addChildElement(colorSelector);
		return colorSelector;
	}

	addRadioGroup(name: string, entries: string[], selectedIndex = 0) : UIRadioElement {
		const element = new UIRadioElement(name, this, entries, selectedIndex);
		this._addChildElement(element);
		return element;
	}

	addDropDown(name: string, entries: string[], selectedIndex = 0) : UIDropDownElement {
		const element = new UIDropDownElement(name, this, entries, selectedIndex);
		this._addChildElement(element);
		return element;
	}

	addCheckBox(name: string, value: boolean) : UICheckBoxElement {
		const element = new UICheckBoxElement(name, this, value);
		this._addChildElement(element);
		return element;
	}

	addRange(name: string, min: number, max: number, value: number) : UIRangeElement{
		const element = new UIRangeElement(name, this, min, max, value);
		this._addChildElement(element);
		return element;
	}

	addGroup(name: string) : UIGroupElement {
		const group = new UIGroupElement(name, this);
		this._addChildElement(group);
		return group;
	}

	private _addChildElement(newElement: AUIElement) {
		this.elements.push(newElement);
		this.container.appendChild(newElement.getDomRootElement());
	}

	addToGroupHeader(htmlElement: HTMLElement) {
		this.headerDiv.appendChild(htmlElement);
	}

	getDivContainer() : HTMLDivElement {
		return this.container;
	}

	getChildByName(name: string) : AUIElement | null {
		for (let i = 0; i < this.elements.length; ++i) {
			if (this.elements[i].getName() == name) {
				return this.elements[i];
			}
		}

		return null;
	}

	eraseChildByRef(ref: AUIElement) : boolean {
		for (let i = 0; i < this.elements.length; ++i) {
			if (this.elements[i] === ref) {
				this.elements.splice(i, 1);
				this.container.removeChild(ref.getDomRootElement());
				return true;
			}
		}

		return false;
	}

	removeChildByName(name: string) : boolean {
		for (let i = 0; i < this.elements.length; ++i) {
			if (this.elements[i].getName() == name) {
				this.elements[i].destroy();
				return true;
			}
		}

		return false;
	}
}
