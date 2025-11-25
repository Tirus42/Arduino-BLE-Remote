#pragma once

#include "RGBW.h"

#include <cstdint>
#include <string>
#include <functional>
#include <memory>

namespace webgui {

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

typedef IDataHandler<bool> IBoolDataHandler;
typedef IDataHandler<int32_t> IInt32DataHandler;
typedef IDataHandler<uint16_t> IUInt16DataHandler;
typedef IDataHandler<std::string> IStringDataHandler;
typedef IDataHandler<RGBW> IRGBWDataHandler;


/**
 * Reference value handler.
 * Implementation of the IDataHandler interface to read/write values directly via reference.
 * Also supports an optional function callback to call when the value was updated.
 *
 * Note that this callback may be called from an event thread!
 */
template <typename T, typename RefType = T>
struct RefValueHandler : public IDataHandler<T> {
	RefType& refValue;
	std::function<void()> optOnChangeFunction;

	RefValueHandler(RefType& refValue, const std::function<void()>& optOnChangeFunction) :
		refValue(refValue),
		optOnChangeFunction(optOnChangeFunction) {}

	virtual T getValue() const override {
		return T(refValue);
	}

	virtual void setValue(const T& newValue) override {
		refValue = RefType(newValue);

		if (optOnChangeFunction) {
			optOnChangeFunction();
		}
	}

	static std::shared_ptr<RefValueHandler<T, RefType>> Create(RefType& refValue, const std::function<void()>& onChangeFunction) {
		return std::make_shared<RefValueHandler<T, RefType>>(refValue, onChangeFunction);
	}
};

typedef RefValueHandler<bool> BoolRefValueHandler;
typedef RefValueHandler<int32_t, uint32_t> UIntRefValueHandler;
typedef RefValueHandler<RGBW> RGBWRefValueHandler;

}
