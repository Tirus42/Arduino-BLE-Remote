#pragma once

#include <memory>
#include <sstream>
#include <algorithm>

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

struct GroupElement;

struct AControlElement {
	std::string name;

	AControlElement(const std::string& name) :
		name(name) {}

	AControlElement(const AControlElement&) = delete;
	AControlElement& operator=(const AControlElement&) = delete;
	virtual ~AControlElement() = default;

	virtual std::string toJSON() const = 0;

	virtual bool setValue(const std::vector<std::string>& path, const AValueWrapper& newValue) = 0;

	std::string jsonPrefix(const std::string& type) const {
		return "{\"type\":\""_s + type + "\",\"name\": \""_s + name + "\"";
	}

	std::string jsonValueField(const std::string& value) const {
		return "\"value\":\""_s + value + "\""_s;
	}

	std::string jsonValueField(int32_t value) const {
		std::stringstream s;
		s << "\"value\":" << value;
		return s.str();
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
};

struct RangeElement : public AControlElementWithParent {
	int32_t min;
	int32_t max;
	std::shared_ptr<IInt32DataHandler> dataHandler;

	RangeElement(GroupElement* parent, const std::string& name, int32_t min, int32_t max, std::shared_ptr<IInt32DataHandler> dataHandler) :
		AControlElementWithParent(parent, name), min(min), max(max),
		dataHandler(dataHandler) {};

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

	virtual bool setValue(const std::vector<std::string>& path, const AValueWrapper& newValue) override {
		if (path.size() != 1 || path[0] != name || !dataHandler) {
			return false;
		}

		int32_t actualValue = std::clamp(newValue.getAsInt32(), min, max);
		dataHandler->setValue(actualValue);
		return true;
	}
};

struct CheckboxElement : public AControlElementWithParent {
	std::shared_ptr<IBoolDataHandler> dataHandler;

	CheckboxElement(GroupElement* parent, const std::string& name, std::shared_ptr<IBoolDataHandler> dataHandler) :
		AControlElementWithParent(parent, name),
		dataHandler(dataHandler) {}

	GroupElement* endCheckbox() {
		return parent;
	}

	virtual std::string toJSON() const override {
		return jsonPrefix("checkbox") + ","_s + jsonValueField(dataHandler ? dataHandler->getValue() : false) + "}"_s;
	}

	virtual bool setValue(const std::vector<std::string>& path, const AValueWrapper& newValue) override {
		if (path.size() != 1 || path[0] != name || !dataHandler) {
			return false;
		}

		dataHandler->setValue(newValue.getAsBool());
		return true;
	}
};

struct AElementWithItems : public AControlElementWithParent {
	std::vector<std::string> items;
	std::shared_ptr<IUInt16DataHandler> dataHandler;

	AElementWithItems(GroupElement* parent, const std::string& name, const std::vector<std::string>& items, std::shared_ptr<IUInt16DataHandler> dataHandler) :
		AControlElementWithParent(parent, name),
		items(items),
		dataHandler(dataHandler) {};

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

	virtual bool setValue(const std::vector<std::string>& path, const AValueWrapper& newValue) override {
		if (path.size() != 1 || path[0] != name || !dataHandler) {
			return false;
		}

		uint16_t valueIndex = std::clamp<int16_t>(newValue.getAsInt32(), 0, items.size());
		dataHandler->setValue(valueIndex);
		return true;
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

	virtual bool setValue(const std::vector<std::string>& path, const AValueWrapper& newValue) override {
		if (path.size() != 1 || path[0] != name || !triggerHandler)
			return false;

		triggerHandler->onTrigger();
		return true;
	}
};

struct GroupElement : public AControlElementWithParent {
	std::vector<std::unique_ptr<AControlElement>> elements;

	GroupElement(GroupElement* parent, std::string name) :
		AControlElementWithParent(parent, name),
		elements() {}

	GroupElement* endGroup() {
		return parent;
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

	virtual std::string toJSON() const override {
		std::stringstream s;
		s << jsonPrefix("group");
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

	virtual bool setValue(const std::vector<std::string>& path, const AValueWrapper& newValue) override {
		if (path.size() < 2 || path[0] != name) {
			return false;
		}

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
