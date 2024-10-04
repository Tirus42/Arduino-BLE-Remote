#include "Util.h"

#include <cstring> // for std::memcpy

std::vector<uint8_t> MergeVectors(const std::vector<uint8_t>& vector0, const std::vector<uint8_t>& vector1) {
	std::vector<uint8_t> result(vector0.size() + vector1.size());
	std::memcpy(result.data() + 0, vector0.data(), vector0.size());
	std::memcpy(result.data() + vector0.size(), vector1.data(), vector1.size());
	return result;
}

std::vector<std::string> SplitString(const std::string& input, const std::string& delimiter) {
	std::vector<std::string> result;

	if (delimiter.empty()) {
		for (char c : input) {
			result.push_back(std::string() + c);
		}
	} else {
		size_t lastPos = 0;
		size_t pos = 0;

		while ((pos = input.find(delimiter, lastPos)) != std::string::npos) {
			result.push_back(input.substr(lastPos, pos - lastPos));

			lastPos = pos + std::max(size_t(1), delimiter.size());
		}

		result.push_back(input.substr(lastPos, pos));
	}

	return result;
}
