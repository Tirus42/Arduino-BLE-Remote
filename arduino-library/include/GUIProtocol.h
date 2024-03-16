#pragma once

#include <stdint.h>

enum class GUIClientHeader : uint8_t {
	RequestGUI = 0x00,
	SetValue = 0x01,

	COUNT
};

enum class GUIServerHeader : uint8_t {
	GUIData = 0x00,
};

enum class ValueType : uint8_t {
	Number = 0,
	String = 1,
	Boolean = 2,
	RGBWColor = 3,
};


template <class T>
inline T PeekData(const void* ptr) {
	T data;
	memcpy(&data, ptr, sizeof(T));
	return data;
}

template <class T>
inline void PokeData(void* ptr, const T& value) {
	memcpy(ptr, &value, sizeof(T));
}

inline uint8_t PeekUInt8(const void* ptr) {
	return PeekData<uint8_t>(ptr);
}

inline uint32_t PeekUInt32(const void* ptr) {
	return PeekData<uint32_t>(ptr);
}

inline void PokeUInt32(void* ptr, uint32_t value) {
	PokeData(ptr, value);
}
