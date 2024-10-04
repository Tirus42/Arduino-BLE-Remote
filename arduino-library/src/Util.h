#pragma once

#include <cstdint>
#include <vector>
#include <string>

/**
 * Creates a new vector with the content of the two given vectors.
 * */
std::vector<uint8_t> MergeVectors(const std::vector<uint8_t>& vector0, const std::vector<uint8_t>& vector1);

/**
 * Splits the given string by the given delimiter in multiple substrings.
 */
std::vector<std::string> SplitString(const std::string& input, const std::string& delimiter);
