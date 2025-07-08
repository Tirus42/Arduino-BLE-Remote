#pragma once

#include <string>

namespace webgui {

static std::string operator"" _s(const char* value, size_t /*length*/) {
	return value;
}

}
