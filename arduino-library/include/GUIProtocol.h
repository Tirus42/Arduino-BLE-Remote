#pragma once

#include <stdint.h>
#include <vector>
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

std::vector<uint8_t> StringToLengthPrefixedVector(const std::string& str) {
	std::vector<uint8_t> result(4 + str.size());

	PokeUInt32(result.data(), htonl(str.size()));
	memcpy(result.data() + 4, str.data(), str.size());

	return result;
}
