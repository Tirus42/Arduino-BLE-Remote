abstract class AUISelectorElement extends AUIElement {
	optionNames: string[];
	selectedIndex: number;

	constructor(type: UIElementType, name: string, parent: UIGroupElement | null, optionNames: string[]) {
		super(type, name, parent);
		this.optionNames = optionNames;
		this.selectedIndex = 0;
	}

	setSelectedIndex(newSelectedIndex: number) {
		if (newSelectedIndex >= this.optionNames.length || newSelectedIndex < 0) {
			throw "Invalid index, out of bounds";
		}

		this.selectedIndex = newSelectedIndex;
	}

	getSelectedIndex() : number {
		return this.selectedIndex;
	}

	getSelectedOption() : string {
		return this.optionNames[this.selectedIndex];
	}
}
