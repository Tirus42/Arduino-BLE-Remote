interface ADataJSON {
	type: string;
	name: string;
}

interface GroupDataJSON extends ADataJSON {
	elements : ADataJSON[];
	collapsed : undefined | boolean;
}

interface NumberValueJSON extends ADataJSON {
	value: number;
}

interface RangeDataJSON extends NumberValueJSON {
	min: number;
	max: number;
}

interface CheckboxJSON extends NumberValueJSON {}

interface RadioDataJSON extends NumberValueJSON {
	items: string[];
}

interface DropDownJSON extends NumberValueJSON {
	items: string[];
}

interface NumberFieldJSON extends NumberValueJSON {
	readOnly: boolean;
}

interface TextFieldJSON extends ADataJSON {
	value: string;
	maxLength: number;
}

function ProcessJSON(currentRoot: UIGroupElement, jsonNode: ADataJSON) {
	const jType = jsonNode.type.toLowerCase();
	const jName = jsonNode.name;

	switch (jType) {
		case 'group': {
			const groupNode = <GroupDataJSON>(jsonNode);

			const elem = currentRoot.addGroup(jName);

			if (groupNode.collapsed !== undefined) {
				elem.setCollapsable(true);
				elem.setCollapsed(groupNode.collapsed);
			}

			for (let i = 0; i < groupNode.elements.length; ++i) {
				const entry = groupNode.elements[i];

				ProcessJSON(elem, entry);
			}
			break;
		}

		case 'range': {
			const rangeNode = <RangeDataJSON>(jsonNode);

			const jMin = rangeNode.min;
			const jMax = rangeNode.max;
			const jValue = rangeNode.value;

			currentRoot.addRange(jName, jMin, jMax, jValue);
			break;
		}

		case 'checkbox': {
			const checkboxNode = <CheckboxJSON>(jsonNode);
			const jValue = checkboxNode.value == 1 ? true : false;

			currentRoot.addCheckBox(jName, jValue);
			break;
		}

		case 'radio': {
			const radioNode = <RadioDataJSON>(jsonNode);
			const entries = radioNode.items;
			const jValue = radioNode.value;

			currentRoot.addRadioGroup(jName, entries, jValue);
			break;
		}

		case 'dropdown': {
			const dropDownNode = <DropDownJSON>(jsonNode);
			const entries = dropDownNode.items;
			const jValue = dropDownNode.value;

			currentRoot.addDropDown(jName, entries, jValue);
			break;
		}

		case 'button': {
			currentRoot.addButton(jName);
			break;
		}

		case 'numberfield_int32': {
			const numberFieldNode = <NumberFieldJSON>(jsonNode);
			const jValue = numberFieldNode.value;
			const jReadOnly = numberFieldNode.readOnly;

			currentRoot.addNumberFieldInt32(jName, jValue).setReadOnly(jReadOnly);
			break;
		}

		case 'textfield': {
			const textFieldNode = <TextFieldJSON>(jsonNode);
			const jValue = textFieldNode.value;
			const jMaxLength = textFieldNode.maxLength;

			currentRoot.addTextField(jName, jValue, jMaxLength);
			break;
		}

		case 'password': {
			const textFieldNode = <TextFieldJSON>(jsonNode);
			const jValue = textFieldNode.value;
			const jMaxLength = textFieldNode.maxLength;

			currentRoot.addPasswordField(jName, jValue, jMaxLength);
			break;
		}

		default:
			Log("Unhandled JSON element type: '" + jType + "'");
			break;
	}
}
