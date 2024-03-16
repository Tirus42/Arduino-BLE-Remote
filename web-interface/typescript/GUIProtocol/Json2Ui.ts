interface ADataJSON {
	type: string;
	name: string;
}

interface GroupDataJSON extends ADataJSON {
	elements : ADataJSON[];
}

interface NumberValueJSON extends ADataJSON {
	value: number;
}

interface RangeDataJSON extends NumberValueJSON {
	min: number;
	max: number;
}

interface CheckboxJSON extends NumberValueJSON {}

interface RadioDataJSON extends ADataJSON {
	items: string[];
}

interface DropDownJSON extends ADataJSON {
	items: string[];
}

function ProcessJSON(currentRoot: UIGroupElement, jsonNode: ADataJSON) {
	const jType = jsonNode.type.toLowerCase();
	const jName = jsonNode.name;

	switch (jType) {
		case 'group': {
			const groupNode = <GroupDataJSON>(jsonNode);

			const elem = currentRoot.addGroup(jName);

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

			currentRoot.addRadioGroup(jName, entries);
			break;
		}

		case 'dropdown': {
			const dropDownNode = <DropDownJSON>(jsonNode);
			const entries = dropDownNode.items;

			currentRoot.addDropDown(jName, entries);
			break;
		}

		default:
			Log("Unhandled JSON element type: '" + jType + "'");
			break;
	}
}
