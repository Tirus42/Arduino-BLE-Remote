const BTN_TEXT_HIDE = 'Λ';
const BTN_TEXT_SHOW = 'V'

class UIGroupElement extends AUIElement {
	container: HTMLDivElement;
	headerDiv : HTMLDivElement;
	contentDiv : HTMLDivElement;
	btnToggle : HTMLButtonElement;
	elements: AUIElement[];

	constructor(name: string, parent: UIGroupElement | null) {
		super(UIElementType.Group, name, parent);

		this.container = HTML.CreateDivElement('bevel');
		this.headerDiv = HTML.CreateDivElement('span');
		this.contentDiv = HTML.CreateDivElement();
		this.elements = []

		{
			this.addToGroupHeader(HTML.CreateSpanElement(this.name));
			this.btnToggle = this.addToGroupHeader(HTML.CreateButtonElement(BTN_TEXT_HIDE));
			this.container.appendChild(this.headerDiv);

			this.btnToggle.onclick = () => {
				this.toggleContentVisibility();
			};
		}

		let parentHTMLElement = parent ? parent.container : document.body;
		parentHTMLElement.appendChild(this.container);
		this.container.appendChild(this.contentDiv);
	}

	override destroy() {
		const parentHTMLContainer = this.parent ? this.parent.container : document.body;
		parentHTMLContainer.removeChild(this.container);

		super.destroy();
	}

	getDomRootElement() : HTMLElement {
		return this.container;
	}

	override setPathValue(path: string[], newValue: ValueWrapper) : void {
		if (path.length < 2 || path[0] !== this.getName())
			throw 'Invalid path';

		const child = this.getChildByName(path[1]);

		if (!child)
			throw 'Child not present!';

		child.setPathValue(path.slice(1), newValue);
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

	addRange(name: string, min: number, max: number, value: number) : UIRangeElement {
		const element = new UIRangeElement(name, this, min, max, value);
		this._addChildElement(element);
		return element;
	}

	addButton(name: string) : UIButtonElement {
		const element = new UIButtonElement(name, this);
		this._addChildElement(element);
		return element;
	}

	addNumberFieldInt32(name: string, value: number) : UIInt32NumberFieldElement {
		const element = new UIInt32NumberFieldElement(name, this, value);
		this._addChildElement(element);
		return element;
	}

	addTextField(name: string, value: string, maxLength: number) : UITextFieldElement {
		const element = new UITextFieldElement(name, this, value, maxLength);
		this._addChildElement(element);
		return element;
	}

	addPasswordField(name: string, value: string, maxLength: number) : UIPasswordFieldElement {
		const element = new UIPasswordFieldElement(name, this, value, maxLength);
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
		this.contentDiv.appendChild(newElement.getDomRootElement());
	}

	private toggleContentVisibility() {
		const contentDiv = this.contentDiv;

		if (contentDiv.style.visibility === '') {
			contentDiv.style.visibility = 'hidden';
			contentDiv.style.height = '0px';

			this.btnToggle.innerText = BTN_TEXT_SHOW;
		} else {
			contentDiv.style.visibility = '';
			contentDiv.style.height = '';

			this.btnToggle.innerText = BTN_TEXT_HIDE;
		}
	}

	addToGroupHeader<Type extends HTMLElement>(htmlElement: Type) : Type {
		this.headerDiv.appendChild(htmlElement);
		return htmlElement;
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
