#pragma once

#include <functional>
#include <memory>

namespace webgui {

struct ITriggerHandler {
	virtual ~ITriggerHandler() = default;

	virtual void onTrigger() = 0;
};

struct FunctionTrigger : public ITriggerHandler {
	std::function<void()> triggerFunction;

	FunctionTrigger(const std::function<void()>& triggerFunction) :
	triggerFunction(triggerFunction) {}

	static std::shared_ptr<ITriggerHandler> Create(const std::function<void()>& triggerFunction) {
		return std::make_shared<FunctionTrigger>(triggerFunction);
	}

	virtual void onTrigger() override {
		triggerFunction();
	}
};

}
