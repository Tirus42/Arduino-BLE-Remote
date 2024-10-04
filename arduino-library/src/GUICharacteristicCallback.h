#pragma once

#include <NimBLEDevice.h>

#include "AsyncBLECharacteristicWriter.h"
#include "BLELedController.h"

struct GUICharacteristicCallback : public BLECharacteristicCallbacks {
	AsyncBLECharacteristicWriter& asyncCharacteristicWriter;

	GUICharacteristicCallback(AsyncBLECharacteristicWriter& asyncCharacteristicWriter) :
		asyncCharacteristicWriter(asyncCharacteristicWriter) {}

	virtual void onWrite(BLECharacteristic* pCharacteristic/*, esp_ble_gatts_cb_param_t* param*/) override {
		BLELedController::GetInstance()->onCharacteristicWritten(pCharacteristic);
	}

	virtual void onSubscribe(NimBLECharacteristic* pCharacteristic, ble_gap_conn_desc* desc, uint16_t subValue) override {
		if (pCharacteristic != asyncCharacteristicWriter.getCharacteristic())
			return;

		uint16_t conHandle = desc->conn_handle;

		if (subValue == 0) {
			asyncCharacteristicWriter.removeSubscriber(conHandle);
		} else {
			asyncCharacteristicWriter.addSubscriber(conHandle);
		}
	}
};
