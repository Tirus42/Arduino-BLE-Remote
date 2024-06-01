class UIPasswordFieldElement extends AUITextFieldElement {
	constructor(name: string, parent: UIGroupElement, value: string, maxLength: number) {
		super(UIElementType.PasswordField, name, parent, value, maxLength);
	}

	override createTextField(value: string) : HTMLInputElement {
		return HTML.CreatePasswordFieldElement(value);
	}
}
