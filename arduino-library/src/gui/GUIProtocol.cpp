#include "GUIProtocol.h"

#include <lwip/sockets.h>	// for htonl and other

std::vector<uint8_t> StringToLengthPrefixedVector(const std::string& str) {
	std::vector<uint8_t> result(4 + str.size());

	PokeUInt32(result.data(), htonl(str.size()));
	std::memcpy(result.data() + 4, str.data(), str.size());

	return result;
}
