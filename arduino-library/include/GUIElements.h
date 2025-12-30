#pragma once

#include "Literals.h"
#include "ValueWrapper.h"
#include "DataHandler.h"
#include "TriggerHandler.h"

#include <sstream>
#include <vector>
#include <algorithm>

namespace webgui {

struct GroupElement;

struct IControlElement {
	virtual ~IControlElement() = default;

	/**
	 * \return the name of this element.
	 */
	virtual const std::string& getName() const = 0;

	/**
	 * \return name technical name of the element type.
	 */
	virtual const char* getElementTypeName() const = 0;

	/**
	 * Serilizes this and all child elements into a JSON string.
	 */
	virtual std::string toJSON() const = 0;

	/**
	 * \return the current value of the element.
	 */
	virtual std::unique_ptr<AValueWrapper> getValue(const std::vector<std::string>& path) const = 0;

	/**
	 * Sets a new value to the element and invoces the callback handling.
	 */
	virtual bool setValue(const std::vector<std::string>& path, const AValueWrapper& newValue) = 0;
};

template <typename Derived>
struct AControlElement : public IControlElement {
	std::string name;

	bool isAdvanced:1;

	AControlElement(const std::string& name) :
		IControlElement(),
		name(name),
		isAdvanced(false) {}

	AControlElement(const AControlElement&) = delete;
	AControlElement& operator=(const AControlElement&) = delete;
	virtual ~AControlElement() = default;

	virtual const std::string& getName() const override {
		return name;
	}

	std::string jsonPrefix() const {
		std::string type = getElementTypeName();
		std::string prefix = "{\"type\":\""_s + type + "\",\"name\": \""_s + name + "\"";

		if (isAdvanced) {
			prefix += ',' + jsonField("advanced", true);
		}

		return prefix;
	}

	std::string jsonField(const std::string& name, const std::string& value, bool withQuotesForValue) const {
		if (withQuotesForValue) {
			return "\""_s + name + "\":\""_s + value + "\""_s;
		}

		return "\""_s + name + "\":"_s + value;
	}

	std::string jsonField(const std::string& name, int32_t value) const {
		std::stringstream s;
		s << value;
		return jsonField(name, s.str(), false);
	}

	std::string jsonField(const std::string& name, uint32_t value) const {
		std::stringstream s;
		s << value;
		return jsonField(name, s.str(), false);
	}

	std::string jsonField(const std::string& name, float value) const {
		std::stringstream s;
		s << value;
		return jsonField(name, s.str(), false);
	}

	std::string jsonField(const std::string& name, bool value) const {
		return "\""_s + name + "\":"_s + (value ? "true" : "false");
	}

	std::string jsonValueField(const std::string& value) const {
		return jsonField("value", value, true);
	}

	std::string jsonValueField(int32_t value) const {
		return jsonField("value", value);
	}

	std::string jsonValueField(uint32_t value) const {
		return jsonField("value", value);
	}

	std::string jsonValueField(bool value) const {
		return jsonValueField(value ? int32_t(1) : int32_t(0));
	}

	Derived* setAdvanced(bool advanced = true) {
		this->isAdvanced = advanced;
		return static_cast<Derived*>(this);
	}
};

template <typename Derived>
struct AControlElementWithParent : public AControlElement<Derived> {
	GroupElement* parent;

	AControlElementWithParent(GroupElement* parent, const std::string& name) :
		AControlElement<Derived>(name),
		parent(parent) {}

	AControlElementWithParent(const AControlElementWithParent&) = delete;
	AControlElementWithParent& operator=(const AControlElementWithParent&) = delete;

	bool isValidPath(const std::vector<std::string>& path) const {
		return path.size() == 1 && path[0] == this->name;
	}
};

template <typename ValueHandlerType, typename Derived>
struct AControlElementWithParentAndValue : public AControlElementWithParent<Derived> {
	std::shared_ptr<ValueHandlerType> dataHandler;

	AControlElementWithParentAndValue(GroupElement* parent, const std::string& name, std::shared_ptr<ValueHandlerType> dataHandler) :
		AControlElementWithParent<Derived>(parent, name),
		dataHandler(dataHandler) {}

	virtual std::unique_ptr<AValueWrapper> getValue(const std::vector<std::string>& path) const override {
		if (!this->isValidPath(path) || !dataHandler)
			return nullptr;

		return WrapValue(dataHandler->getValue());
	}

	virtual bool setValue(const std::vector<std::string>& path, const AValueWrapper& newValue) override {
		if (!this->isValidPath(path) || !dataHandler)
			return false;

		setValue(newValue);
		return true;
	}

	virtual void setValue(const AValueWrapper& newValue) = 0;
};

struct RangeElement : public AControlElementWithParentAndValue<IInt32DataHandler, RangeElement> {
	int32_t min;
	int32_t max;

	RangeElement(GroupElement* parent, const std::string& name, int32_t min, int32_t max, std::shared_ptr<IInt32DataHandler> dataHandler) :
		AControlElementWithParentAndValue(parent, name, dataHandler), min(min), max(max) {}

	GroupElement* endRange() {
		return parent;
	}

	virtual const char* getElementTypeName() const override {
		return "range";
	}

	virtual std::string toJSON() const override {
		std::stringstream s;

		s << jsonPrefix();
		s << ",\"min\":"_s;
		s << min;
		s << ",\"max\":"_s;
		s << max;
		s << ",";
		s << jsonValueField(dataHandler ? dataHandler->getValue() : int32_t(0));
		s << "}";

		return s.str();
	}

	virtual void setValue(const AValueWrapper& newValue) override {
		int32_t actualValue = std::clamp(newValue.getAsInt32(), min, max);
		dataHandler->setValue(actualValue);
	}
};

struct CheckboxElement : public AControlElementWithParentAndValue<IBoolDataHandler, CheckboxElement> {
	CheckboxElement(GroupElement* parent, const std::string& name, std::shared_ptr<IBoolDataHandler> dataHandler) :
		AControlElementWithParentAndValue(parent, name, dataHandler) {}

	GroupElement* endCheckbox() {
		return parent;
	}

	virtual const char* getElementTypeName() const override {
		return "checkbox";
	}

	virtual std::string toJSON() const override {
		return jsonPrefix() + ","_s + jsonValueField(dataHandler ? dataHandler->getValue() : false) + "}"_s;
	}

	virtual void setValue(const AValueWrapper& newValue) override {
		dataHandler->setValue(newValue.getAsBool());
	}
};

template <typename Derived>
struct AElementWithItems : public AControlElementWithParentAndValue<IUInt16DataHandler, Derived> {
	std::vector<std::string> items;

	AElementWithItems(GroupElement* parent, const std::string& name, const std::vector<std::string>& items, std::shared_ptr<IUInt16DataHandler> dataHandler) :
		AControlElementWithParentAndValue<IUInt16DataHandler, Derived>(parent, name, dataHandler),
		items(items) {}

	virtual std::string toJSON() const override {
		std::stringstream s;
		s << this->jsonPrefix();
		s << ",\"items\":[";

		size_t index = 0;

		for (const std::string& item : items) {
			s << "\"" << item << "\"";

			if (index++ < items.size() - 1) {
				s << ",";
			}
		}

		s << "],";
		s << this->jsonValueField(this->dataHandler ? this->dataHandler->getValue() : int32_t(0));
		s << "}";

		return s.str();
	}

	virtual void setValue(const AValueWrapper& newValue) override {
		uint16_t valueIndex = std::clamp<int16_t>(newValue.getAsInt32(), 0, items.size());
		this->dataHandler->setValue(valueIndex);
	}
};

struct RadioElement : public AElementWithItems<RadioElement> {
	RadioElement(GroupElement* parent, const std::string& name, const std::vector<std::string>& items, std::shared_ptr<IUInt16DataHandler> dataHandler) :
		AElementWithItems(parent, name, items, dataHandler) {};

	GroupElement* endRadio() {
		return parent;
	}

	virtual const char* getElementTypeName() const override {
		return "radio";
	}
};

struct DropDownElement : public AElementWithItems<DropDownElement> {
	DropDownElement(GroupElement* parent, std::string name, const std::vector<std::string>& items, std::shared_ptr<IUInt16DataHandler> dataHandler) :
		AElementWithItems(parent, name, items, dataHandler) {};

	GroupElement* endDropDown() {
		return parent;
	}

	virtual const char* getElementTypeName() const override {
		return "dropdown";
	}
};

struct ButtonElement : public AControlElementWithParent<ButtonElement> {
	std::shared_ptr<ITriggerHandler> triggerHandler;

	ButtonElement(GroupElement* parent, const std::string& name, std::shared_ptr<ITriggerHandler> triggerHandler) :
		AControlElementWithParent(parent, name),
		triggerHandler(triggerHandler) {}

	GroupElement* endButton() {
		return parent;
	}

	virtual const char* getElementTypeName() const override {
		return "button";
	}

	virtual std::string toJSON() const override {
		return this->jsonPrefix() + "}"_s;
	}

	virtual std::unique_ptr<AValueWrapper> getValue(const std::vector<std::string>& path) const override {
		if (!this->isValidPath(path))
			return nullptr;

		return std::make_unique<BooleanValueWrapper>(false);
	}

	virtual bool setValue(const std::vector<std::string>& path, const AValueWrapper& newValue) override {
		if (!this->isValidPath(path) || !triggerHandler)
			return false;

		triggerHandler->onTrigger();
		return true;
	}
};

struct NumberFieldInt32Element : public AControlElementWithParentAndValue<IInt32DataHandler, NumberFieldInt32Element> {
	bool readOnly: 1;

	NumberFieldInt32Element(GroupElement* parent, const std::string& name, std::shared_ptr<IInt32DataHandler> dataHandler) :
		AControlElementWithParentAndValue(parent, name, dataHandler),
		readOnly(false) {}

	GroupElement* endNumberField() {
		return parent;
	}

	virtual const char* getElementTypeName() const override {
		return "numberfield_int32";
	}

	virtual std::string toJSON() const override {
		return jsonPrefix() + ","_s + jsonValueField(dataHandler ? dataHandler->getValue() : 0) + "," + jsonField("readOnly", readOnly) + "}"_s;
	}

	virtual void setValue(const AValueWrapper& newValue) override {
		this->dataHandler->setValue(newValue.getAsInt32());
	}

	virtual NumberFieldInt32Element* setReadOnly(bool readOnly = true) {
		this->readOnly = readOnly;
		return this;
	}
};

template <typename Derived>
struct ATextFieldElement : public AControlElementWithParentAndValue<IStringDataHandler, Derived> {
	uint16_t maxLength;
	bool config_sendValueToClient: 1;

	ATextFieldElement(GroupElement* parent, const std::string& name, std::shared_ptr<IStringDataHandler> dataHandler, uint16_t maxLength, bool sendValueToClient) :
		AControlElementWithParentAndValue<IStringDataHandler, Derived>(parent, name, dataHandler),
		maxLength(maxLength),
		config_sendValueToClient(sendValueToClient) {}

	virtual std::string toJSON() const override {
		std::string value = (config_sendValueToClient && this->dataHandler) ? this->dataHandler->getValue() : "";
		return this->jsonPrefix() + ","_s + this->jsonField("maxLength", int32_t(maxLength)) + ","_s + this->jsonValueField(value) + "}"_s;
	}

	virtual void setValue(const AValueWrapper& newValue) override {
		this->dataHandler->setValue(newValue.getAsString());
	}
};

struct TextFieldElement : public ATextFieldElement<TextFieldElement> {

	TextFieldElement(GroupElement* parent, const std::string& name, std::shared_ptr<IStringDataHandler> dataHandler, uint16_t maxLength) :
		ATextFieldElement(parent, name, dataHandler, maxLength, true) {}

	virtual const char* getElementTypeName() const override {
		return "textfield";
	}

	GroupElement* endTextField() {
		return parent;
	}
};

struct PasswordFieldElement : public ATextFieldElement<PasswordFieldElement> {
	PasswordFieldElement(GroupElement* parent, const std::string& name, std::shared_ptr<IStringDataHandler> dataHandler, uint16_t maxLength) :
		ATextFieldElement(parent, name, dataHandler, maxLength, false) {}

	virtual const char* getElementTypeName() const override {
		return "password";
	}

	GroupElement* endPasswordField() {
		return parent;
	}
};

struct RGBWFieldElement : public AControlElementWithParentAndValue<IRGBWDataHandler, RGBWFieldElement> {
	std::string channelString;

	RGBWFieldElement(GroupElement* parent, const std::string& name, std::shared_ptr<IRGBWDataHandler> dataHandler, const char* channelString = "RGBW") :
		AControlElementWithParentAndValue<IRGBWDataHandler, RGBWFieldElement>(parent, name, dataHandler),
		channelString(channelString) {}

	virtual const char* getElementTypeName() const override {
		return "RGBWRange";
	}

	virtual std::string toJSON() const override {
		std::stringstream s;

		uint32_t rgbwPackedValue = dataHandler ? dataHandler->getValue().getAsPackedColor() : 0;

		s << jsonPrefix();
		s << ",\"channel\":"_s;
		s << "\"" << channelString << "\",";
		s << jsonValueField(rgbwPackedValue);
		s << "}"_s;

		return s.str();
	}

	virtual void setValue(const AValueWrapper& newValue) override {
		if (dataHandler) {
			dataHandler->setValue(RGBW(newValue.getAsInt32()));
		}
	}

	GroupElement* endRGBWField() {
		return parent;
	}
};

template <typename T>
struct CompassElement : public AControlElementWithParentAndValue<IDataHandler<T>, CompassElement<T>> {
	typedef AControlElementWithParentAndValue<IDataHandler<T>, CompassElement<T>> Base;
	using Base::dataHandler;

	CompassElement(GroupElement* parent, const std::string& name, std::shared_ptr<IDataHandler<T>> dataHandler) :
		Base(parent, name, dataHandler) {}

	virtual const char* getElementTypeName() const override {
		return "Compass";
	}

	virtual std::string toJSON() const override {
		std::stringstream s;

		T value = dataHandler ? dataHandler->getValue() : 0.f;

		s << Base::jsonPrefix();
		s << ","_s;
		s << Base::jsonValueField(value);
		s << "}"_s;

		return s.str();
	}

	virtual void setValue(const AValueWrapper& /*newValue*/) override {
		// Compass is just an output element
	}

	GroupElement* endCompass() {
		return Base::parent;
	}
};

struct GroupElement : public AControlElementWithParent<GroupElement> {
	std::vector<std::unique_ptr<IControlElement>> elements;
	// Controls collapsable + collapsed, not set -> not collapsable.
	std::optional<bool> collapsed;

	GroupElement(GroupElement* parent, std::string name) :
		AControlElementWithParent(parent, name),
		elements() {}

	GroupElement* endGroup() {
		return parent;
	}

	virtual const char* getElementTypeName() const override {
		return "group";
	}

	/**
	 * Enables the collapsed feature + set the collapsed state.
	 */
	GroupElement* setCollapsed(bool collapsed = true) {
		this->collapsed = collapsed;
		return this;
	}

	/**
	 * Enables or disables the collapsed feature.
	 */
	GroupElement* setCollapsable(bool collapsable = true) {
		this->collapsed = collapsable ? std::optional<bool>(false) : std::optional<bool>();
		return this;
	}

	template <typename T>
	T* _addElement(std::unique_ptr<T>&& element) {
		elements.emplace_back(std::move(element));
		return (T*)(elements.rbegin()->get());
	}

	GroupElement* addGroup(std::string name) {
		return _addElement(std::make_unique<GroupElement>(this, name));
	}

	RangeElement* addRange(std::string name, int min, int max, std::shared_ptr<IInt32DataHandler> handler) {
		return _addElement(std::make_unique<RangeElement>(this, name, min, max, handler));
	}

	CheckboxElement* addCheckbox(std::string name, std::shared_ptr<IBoolDataHandler> handler) {
		return _addElement(std::make_unique<CheckboxElement>(this, name, handler));
	}

	RadioElement* addRadio(std::string name, const std::vector<std::string>& items, std::shared_ptr<IUInt16DataHandler> dataHandler) {
		return _addElement(std::make_unique<RadioElement>(this, name, items, dataHandler));
	}

	DropDownElement* addDropDown(std::string name, const std::vector<std::string>& items, std::shared_ptr<IUInt16DataHandler> dataHandler) {
		return _addElement(std::make_unique<DropDownElement>(this, name, items, dataHandler));
	}

	ButtonElement* addButton(std::string name, std::shared_ptr<ITriggerHandler> triggerHandler) {
		return _addElement(std::make_unique<ButtonElement>(this, name, triggerHandler));
	}

	NumberFieldInt32Element* addNumberFieldInt32(std::string name, std::shared_ptr<IInt32DataHandler> handler) {
		return _addElement(std::make_unique<NumberFieldInt32Element>(this, name, handler));
	}

	TextFieldElement* addTextField(std::string name, std::shared_ptr<IStringDataHandler> handler, uint16_t maxLength) {
		return _addElement(std::make_unique<TextFieldElement>(this, name, handler, maxLength));
	}

	PasswordFieldElement* addPasswordField(std::string name, std::shared_ptr<IStringDataHandler> handler, uint16_t maxLength) {
		return _addElement(std::make_unique<PasswordFieldElement>(this, name, handler, maxLength));
	}

	RGBWFieldElement* addRGBWRangeControl(std::string name, std::shared_ptr<IRGBWDataHandler> handler, const char* channelString = "RGBW") {
		return _addElement(std::make_unique<RGBWFieldElement>(this, name, handler, channelString));
	}

	CompassElement<int32_t>* addCompassi(std::string name, std::shared_ptr<IDataHandler<int32_t>> handler) {
		return _addElement(std::make_unique<CompassElement<int32_t>>(this, name, handler));
	}

	virtual std::string toJSON() const override {
		std::stringstream s;
		s << jsonPrefix();

		if (collapsed) {
			s << "," << jsonField("collapsed", *collapsed);
		}

		s << ",\"elements\":[";

		size_t i = 0;

		for (const std::unique_ptr<IControlElement>& element : elements) {
			s << element->toJSON();

			if (i++ < elements.size() - 1) {
				s << ",";
			}
		}

		s << "]}";

		return s.str();
	}

	virtual std::unique_ptr<AValueWrapper> getValue(const std::vector<std::string>& path) const override {
		if (path.size() < 2 || path[0] != name)
			return nullptr;

		for (auto& element : elements) {
			if (element->getName() == path[1]) {
				return element->getValue({path.begin() + 1, path.end()});
			}
		}

		return nullptr;
	}

	virtual bool setValue(const std::vector<std::string>& path, const AValueWrapper& newValue) override {
		if (path.size() < 2 || path[0] != name)
			return false;

		return _setValueInsideGroup({path.begin() + 1, path.end()}, newValue);
	}

	bool _setValueInsideGroup(const std::vector<std::string>& pathWithoutGroup, const AValueWrapper& newValue) {
		for (auto& element : elements) {
			if (element->getName() == pathWithoutGroup[0]) {
				return element->setValue(pathWithoutGroup, newValue);
			}
		}

		return false;
	}
};

/**
 * Root element of the GUI structure.
 *
 * This is a special subclass of the GroupElement without a name.
 */
struct RootElement : public GroupElement {
	RootElement() :
		GroupElement(nullptr, "") {}

	virtual const char* getElementTypeName() const override {
		return "root";
	}

	virtual std::unique_ptr<AValueWrapper> getValue(const std::vector<std::string>& path) const override {
		if (path.size() < 1)
			return nullptr;

		for (auto& element : elements) {
			if (element->getName() == path[0]) {
				return element->getValue(path);
			}
		}

		return nullptr;
	}

	virtual bool setValue(const std::vector<std::string>& path, const AValueWrapper& newValue) override {
		if (path.size() < 1)
			return false;

		return _setValueInsideGroup(path, newValue);
	}
};

}
