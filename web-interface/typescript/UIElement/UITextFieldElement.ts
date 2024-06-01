class UITextFieldElement extends AUITextFieldElement {
	constructor(name: string, parent: UIGroupElement, value: string, maxLength: number) {
		super(UIElementType.TextField, name, parent, value, maxLength);
	}

	override createTextField(value: string) : HTMLInputElement {
		return HTML.CreateTextFieldElement(value);
	}
}
