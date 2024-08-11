# BLE Remote library
Library to build a simple web control GUI accessible via web bluetooth.  
Does not require any cable or WiFi connection to your device. Just a device with a chromium based browser and BLE support (Android devices or computers with a Bluetooth low energy adapter).

This repository consists of two parts.
One is the arduino library to construct a user control interface including modifiable number, text and other values.
This library is also hosted on [PlatformIO](https://registry.platformio.org/libraries/tirus/BLE%20Remote).

The second one is the web interface written in typescript.
A hosted version can be found [here](https://tirus.mine.nu/ble/).  
Note: A chromium based browser is required as neither Firefox nor Safari implement the [Web Bluetooth API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)

# PlatformIO installation
* Open platformio.ini, a project configuration file located in the root of PlatformIO project.
* Add the following line to the lib_deps option of [env:] section:
```
tirus/BLE Remote@^0.4.0
```
* Build a project, PlatformIO will automatically install dependencies.

# Development Status
This library is currently in a early development state and breaking changes may occur. Also some bluetooth features are not completely reliable yet. Please report bugs if you encounter any.

# Control elements
Currently the following control elements are implemented:

* Group elements
* Number fields
* Text fields
* Password fields
* Radio buttons
* Drop down fields
* Range slider
* Checkboxes
* RGBW color selector

See [here](https://tirus.mine.nu/ble/?test=true) for a demo of all control elements.