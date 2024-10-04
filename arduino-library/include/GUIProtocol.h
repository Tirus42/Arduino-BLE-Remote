#pragma once

#include <stdint.h>
#include <vector>
#include <cstring>	// for std::memcpy()
#include <string>

enum class GUIClientHeader : uint8_t {
	RequestGUI = 0x00,
	SetValue = 0x01,

	COUNT
};

enum class GUIServerHeader : uint8_t {
	GUIData = 0x00,
	UpdateValue = 0x01,
};

static constexpr uint32_t BROADCAST_REQUEST_ID = 0xFFFFFFFF;

template <class T>
inline T PeekData(const void* ptr) {
	T data;
	std::memcpy(&data, ptr, sizeof(T));
	return data;
}

template <class T>
inline void PokeData(void* ptr, const T& value) {
	std::memcpy(ptr, &value, sizeof(T));
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

std::vector<uint8_t> StringToLengthPrefixedVector(const std::string& str);
