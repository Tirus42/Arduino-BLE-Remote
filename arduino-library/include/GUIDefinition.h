#pragma once

#include <memory>
#include <sstream>
#include <algorithm>
#include <functional>
#include <optional>

namespace webgui {

static std::string operator"" _s(const char* value, size_t /*length*/) {
	return value;
}

template <typename T>
struct IDataHandler {
	virtual ~IDataHandler() = default;

	virtual void setValue(const T& newValue) = 0;
	virtual T getValue() const = 0;
};

template <typename T>
struct ADataHandler : public IDataHandler<T> {
	T value;

	virtual void setValue(const T& newValue) override {
		value = newValue;
	}

	virtual T getValue() const override {
		return value;
	}
};

struct ITriggerHandler {
	virtual ~ITriggerHandler() = default;

	virtual void onTrigger() = 0;
};

struct FunctionTrigger : public ITriggerHandler {
	std::function<void()> triggerFunction;

	FunctionTrigger(const std::function<void()>& triggerFunction) :
		triggerFunction(triggerFunction) {}

	static std::shared_ptr<ITriggerHandler> Create(const std::function<void()>& triggerFunction) {
		return std::make_shared<FunctionTrigger>(triggerFunction);
	}

	virtual void onTrigger() override {
		triggerFunction();
	}
};

typedef IDataHandler<bool> IBoolDataHandler;
typedef IDataHandler<int32_t> IInt32DataHandler;
typedef IDataHandler<uint16_t> IUInt16DataHandler;
typedef IDataHandler<std::string> IStringDataHandler;

enum class ValueType : uint8_t {
	Number = 0,
	String = 1,
	Boolean = 2,
	RGBWColor = 3,
};

struct AValueWrapper {
	virtual ~AValueWrapper() = default;

	virtual ValueType getType() const = 0;

	virtual std::string getAsString() const = 0;
	virtual int32_t getAsInt32() const = 0;
	virtual bool getAsBool() const = 0;
};

struct BooleanValueWrapper : public AValueWrapper {
	bool value;

	BooleanValueWrapper(bool value) :
		value(value) {}

	virtual ValueType getType() const override {
		return ValueType::Boolean;
	}

	virtual std::string getAsString() const override {
		return value ? "true" : "false";
	}

	virtual int32_t getAsInt32() const override {
		return value ? 1 : 0;
	}

	virtual bool getAsBool() const override {
		return value;
	}
};

struct Int32ValueWrapper : public AValueWrapper {
	int32_t value;

	Int32ValueWrapper(int32_t value) :
		value(value) {}

	virtual ValueType getType() const override {
		return ValueType::Number;
	}

	virtual std::string getAsString() const override {
		std::stringstream s;
		s << value;
		return s.str();
	}

	virtual int32_t getAsInt32() const override {
		return value;
	}

	virtual bool getAsBool() const override {
		return value > 0;
	}
};

struct StringValueWrapper : public AValueWrapper {
	std::string value;

	StringValueWrapper(const std::string& value) :
		value(value) {}

	virtual ValueType getType() const override {
		return ValueType::String;
	}

	virtual std::string getAsString() const override {
		return value;
	}

	virtual int32_t getAsInt32() const override {
		return 0;
	}

	virtual bool getAsBool() const override {
		return false;
	}
};

template <typename ValueType>
inline std::unique_ptr<AValueWrapper> WrapValue(const ValueType& value) {
	if constexpr(std::is_same<ValueType, int32_t>::value) {
		return std::make_unique<Int32ValueWrapper>(value);
	}
	else if constexpr(std::is_same<ValueType, uint16_t>::value) {
		return std::make_unique<Int32ValueWrapper>(value);
	}
	else if constexpr(std::is_same<ValueType, std::string>::value) {
		return std::make_unique<StringValueWrapper>(value);
	}
	else if constexpr(std::is_same<ValueType, bool>::value) {
		return std::make_unique<BooleanValueWrapper>(value);
	}
	else {
		static_assert(sizeof(ValueType) != sizeof(ValueType), "Unhandled data type error");
	}
}

struct GroupElement;

struct AControlElement {
	std::string name;

	AControlElement(const std::string& name) :
		name(name) {}

	AControlElement(const AControlElement&) = delete;
	AControlElement& operator=(const AControlElement&) = delete;
	virtual ~AControlElement() = default;

	virtual std::string toJSON() const = 0;

	virtual std::unique_ptr<AValueWrapper> getValue(const std::vector<std::string>& path) const = 0;

	virtual bool setValue(const std::vector<std::string>& path, const AValueWrapper& newValue) = 0;

	std::string jsonPrefix(const std::string& type) const {
		return "{\"type\":\""_s + type + "\",\"name\": \""_s + name + "\"";
	}

	std::string jsonField(const std::string& name, const std::string& value) const {
		return "\""_s + name + "\":\""_s + value + "\""_s;
	}

	std::string jsonField(const std::string& name, int32_t value) const {
		std::stringstream s;
		s << value;
		return jsonField(name, s.str());
	}

	std::string jsonField(const std::string& name, bool value) const {
		return "\""_s + name + "\":"_s + (value ? "true" : "false");
	}

	std::string jsonValueField(const std::string& value) const {
		return jsonField("value", value);
	}

	std::string jsonValueField(int32_t value) const {
		return jsonField("value", value);
	}

	std::string jsonValueField(bool value) const {
		return jsonValueField(value ? int32_t(1) : int32_t(0));
	}
};

struct AControlElementWithParent : public AControlElement {
	GroupElement* parent;

	AControlElementWithParent(GroupElement* parent, const std::string& name) :
		AControlElement(name),
		parent(parent) {}

	AControlElementWithParent(const AControlElementWithParent&) = delete;
	AControlElementWithParent& operator=(const AControlElementWithParent&) = delete;

	bool isValidPath(const std::vector<std::string>& path) const {
		return path.size() == 1 && path[0] == name;
	}
};

template <typename ValueHandlerType>
struct AControlElementWithParentAndValue : public AControlElementWithParent {
	std::shared_ptr<ValueHandlerType> dataHandler;

	AControlElementWithParentAndValue(GroupElement* parent, const std::string& name, std::shared_ptr<ValueHandlerType> dataHandler) :
		AControlElementWithParent(parent, name),
		dataHandler(dataHandler) {}

	virtual std::unique_ptr<AValueWrapper> getValue(const std::vector<std::string>& path) const override {
		if (!isValidPath(path) || !dataHandler)
			return nullptr;

		return WrapValue(dataHandler->getValue());
	}

	virtual bool setValue(const std::vector<std::string>& path, const AValueWrapper& newValue) override {
		if (!isValidPath(path) || !dataHandler)
			return false;

		setValue(newValue);
		return true;
	}

	virtual void setValue(const AValueWrapper& newValue) = 0;
};

struct RangeElement : public AControlElementWithParentAndValue<IInt32DataHandler> {
	int32_t min;
	int32_t max;

	RangeElement(GroupElement* parent, const std::string& name, int32_t min, int32_t max, std::shared_ptr<IInt32DataHandler> dataHandler) :
		AControlElementWithParentAndValue(parent, name, dataHandler), min(min), max(max) {}

	GroupElement* endRange() {
		return parent;
	}

	virtual std::string toJSON() const override {
		std::stringstream s;

		s << jsonPrefix("range");
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

struct CheckboxElement : public AControlElementWithParentAndValue<IBoolDataHandler> {
	CheckboxElement(GroupElement* parent, const std::string& name, std::shared_ptr<IBoolDataHandler> dataHandler) :
		AControlElementWithParentAndValue(parent, name, dataHandler) {}

	GroupElement* endCheckbox() {
		return parent;
	}

	virtual std::string toJSON() const override {
		return jsonPrefix("checkbox") + ","_s + jsonValueField(dataHandler ? dataHandler->getValue() : false) + "}"_s;
	}

	virtual void setValue(const AValueWrapper& newValue) override {
		dataHandler->setValue(newValue.getAsBool());
	}
};

struct AElementWithItems : public AControlElementWithParentAndValue<IUInt16DataHandler> {
	std::vector<std::string> items;

	AElementWithItems(GroupElement* parent, const std::string& name, const std::vector<std::string>& items, std::shared_ptr<IUInt16DataHandler> dataHandler) :
		AControlElementWithParentAndValue(parent, name, dataHandler),
		items(items) {}

	virtual std::string getElementName() const = 0;

	virtual std::string toJSON() const override {
		std::stringstream s;
		s << jsonPrefix(getElementName());
		s << ",\"items\":[";

		size_t index = 0;

		for (const std::string& item : items) {
			s << "\"" << item << "\"";

			if (index++ < items.size() - 1) {
				s << ",";
			}
		}

		s << "],";
		s << jsonValueField(dataHandler ? dataHandler->getValue() : int32_t(0));
		s << "}";

		return s.str();
	}

	virtual void setValue(const AValueWrapper& newValue) override {
		uint16_t valueIndex = std::clamp<int16_t>(newValue.getAsInt32(), 0, items.size());
		dataHandler->setValue(valueIndex);
	}
};

struct RadioElement : public AElementWithItems {
	RadioElement(GroupElement* parent, const std::string& name, const std::vector<std::string>& items, std::shared_ptr<IUInt16DataHandler> dataHandler) :
		AElementWithItems(parent, name, items, dataHandler) {};

	GroupElement* endRadio() {
		return parent;
	}

	virtual std::string getElementName() const override {
		return "radio";
	}
};

struct DropDownElement : public AElementWithItems {
	DropDownElement(GroupElement* parent, std::string name, const std::vector<std::string>& items, std::shared_ptr<IUInt16DataHandler> dataHandler) :
		AElementWithItems(parent, name, items, dataHandler) {};

	GroupElement* endDropDown() {
		return parent;
	}

	virtual std::string getElementName() const override {
		return "dropdown";
	}
};

struct ButtonElement : public AControlElementWithParent {
	std::shared_ptr<ITriggerHandler> triggerHandler;

	ButtonElement(GroupElement* parent, const std::string& name, std::shared_ptr<ITriggerHandler> triggerHandler) :
		AControlElementWithParent(parent, name),
		triggerHandler(triggerHandler) {}

	GroupElement* endButton() {
		return parent;
	}

	virtual std::string toJSON() const override {
		return jsonPrefix("button") + "}"_s;
	}

	virtual std::unique_ptr<AValueWrapper> getValue(const std::vector<std::string>& path) const override {
		if (!isValidPath(path))
			return nullptr;

		return std::make_unique<BooleanValueWrapper>(false);
	}

	virtual bool setValue(const std::vector<std::string>& path, const AValueWrapper& newValue) override {
		if (!isValidPath(path) || !triggerHandler)
			return false;

		triggerHandler->onTrigger();
		return true;
	}
};

struct NumberFieldInt32Element : public AControlElementWithParentAndValue<IInt32DataHandler> {
	bool readOnly:1;

	NumberFieldInt32Element(GroupElement* parent, const std::string& name, std::shared_ptr<IInt32DataHandler> dataHandler) :
		AControlElementWithParentAndValue(parent, name, dataHandler),
		readOnly(false) {}

	GroupElement* endNumberField() {
		return parent;
	}

	virtual std::string toJSON() const override {
		return jsonPrefix("numberfield_int32") + ","_s + jsonValueField(dataHandler ? dataHandler->getValue() : 0) + "," + jsonField("readOnly", readOnly) + "}"_s;
	}

	virtual void setValue(const AValueWrapper& newValue) override {
		dataHandler->setValue(newValue.getAsInt32());
	}

	virtual NumberFieldInt32Element* setReadOnly(bool readOnly = true) {
		this->readOnly = readOnly;
		return this;
	}
};

struct TextFieldElement : public AControlElementWithParentAndValue<IStringDataHandler> {
	uint16_t maxLength;
	bool config_sendValueToClient:1;

	TextFieldElement(GroupElement* parent, const std::string& name, std::shared_ptr<IStringDataHandler> dataHandler, uint16_t maxLength) :
		AControlElementWithParentAndValue(parent, name, dataHandler),
		maxLength(maxLength),
		config_sendValueToClient(true) {}

	virtual const char* getElementTypeName() const {
		return "textfield";
	}

	GroupElement* endTextField() {
		return parent;
	}

	virtual std::string toJSON() const override {
		std::string value = (config_sendValueToClient && dataHandler) ? dataHandler->getValue() : "";
		return jsonPrefix(getElementTypeName()) + ","_s + jsonField("maxLength", int32_t(maxLength)) + ","_s + jsonValueField(value) + "}"_s;
	}

	virtual void setValue(const AValueWrapper& newValue) override {
		dataHandler->setValue(newValue.getAsString());
	}

	TextFieldElement* setSendValueToClient(bool sendToClient) {
		config_sendValueToClient = sendToClient;
		return this;
	}
};

struct PasswordFieldElement : public TextFieldElement {
	PasswordFieldElement(GroupElement* parent, const std::string& name, std::shared_ptr<IStringDataHandler> dataHandler, uint16_t maxLength) :
		TextFieldElement(parent, name, dataHandler, maxLength) {

		config_sendValueToClient = false;
	}

	virtual const char* getElementTypeName() const {
		return "password";
	}

	GroupElement* endPasswordField() {
		return parent;
	}
};

struct GroupElement : public AControlElementWithParent {
	std::vector<std::unique_ptr<AControlElement>> elements;
	// Controls collapsable + collapsed, not set -> not collapsable.
	std::optional<bool> collapsed;

	GroupElement(GroupElement* parent, std::string name) :
		AControlElementWithParent(parent, name),
		elements() {}

	GroupElement* endGroup() {
		return parent;
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

	virtual std::string toJSON() const override {
		std::stringstream s;
		s << jsonPrefix("group");

		if (collapsed) {
			s << "," << jsonField("collapsed", *collapsed);
		}

		s << ",\"elements\":[";

		size_t i = 0;

		for (const std::unique_ptr<AControlElement>& element : elements) {
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
			if (element->name == path[1]) {
				return element->getValue({path.begin() + 1, path.end()});
			}
		}

		return nullptr;
	}

	virtual bool setValue(const std::vector<std::string>& path, const AValueWrapper& newValue) override {
		if (path.size() < 2 || path[0] != name)
			return false;

		for (auto& element : elements) {
			if (element->name == path[1]) {
				return element->setValue({path.begin() + 1, path.end()}, newValue);
			}
		}

		return false;
	}
};

struct RootElement : public GroupElement {
	RootElement(std::string name) :
		GroupElement(nullptr, name) {}
};

}
