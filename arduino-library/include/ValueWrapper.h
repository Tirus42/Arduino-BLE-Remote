#pragma once

#include "ValueWrapper.h"

#include <RGBW.h>

#include <cstdint>
#include <string>
#include <sstream>
#include <memory>

namespace webgui {

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

struct RGBWValueWrapper : public AValueWrapper {
	RGBW value;

	RGBWValueWrapper(RGBW value) :
	value(value) {}

	virtual ValueType getType() const override {
		return ValueType::RGBWColor;
	}

	virtual std::string getAsString() const override {
		std::stringstream s;
		s << "{" << value.r << "," << value.g << "," << value.b << "," << value.w << "}";
		return s.str();
	}

	virtual int32_t getAsInt32() const override {
		return value.getAsPackedColor();
	}

	virtual bool getAsBool() const override {
		return value != COLOR_OFF;
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
	else if constexpr(std::is_same<ValueType, RGBW>::value) {
		return std::make_unique<RGBWValueWrapper>(value);
	}
	else {
		static_assert(sizeof(ValueType) != sizeof(ValueType), "Unhandled data type error");
	}
}

}
