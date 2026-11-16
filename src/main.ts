import { App, Plugin } from "obsidian";
import { IPlaceExtensionSettings, IPlacesExtensionHostSettings } from "places-shared/settings";
import { IPlacePluginExtension, IPlacePluginExtensionExports, registerPlaceExtensionLifecycle, PLACES_EXTENSION_API_VERSION, type ExtensionSettingsGroup } from "places-shared/obsidian/services";
import { Utilities, configureRequestLogging } from "places-shared/utils";
import { PhotonApiService } from "./PhotonApiService";
import { PHOTON_BASE_URL } from "./PhotonClient";
import { PROVIDER_ICON } from "./provider-icon";

const DEFAULT_SETTINGS: IPlaceExtensionSettings = {
  baseUrl: PHOTON_BASE_URL,
  language: "en"
};

export default class PhotonPlugin extends Plugin implements IPlacePluginExtension {
  onload() {
    registerPlaceExtensionLifecycle(this);
  }

  getPlaceExports(_app: App, extensionSettings: IPlaceExtensionSettings, mainSettings: IPlacesExtensionHostSettings): IPlacePluginExtensionExports {
    configureRequestLogging(mainSettings.developerMode);
    Utilities.applyDefaults(extensionSettings, DEFAULT_SETTINGS);

    return {
      apiVersion: PLACES_EXTENSION_API_VERSION,
      providers: [
        {
          name: "photon",
          geocoding: {
            service: new PhotonApiService(extensionSettings),
            icon: PROVIDER_ICON
          },
        }
      ],
      settingsGroup: this.settingsGroup(extensionSettings)
    };
  }

  private settingsGroup(settings: IPlaceExtensionSettings): ExtensionSettingsGroup {
    return {
      heading: "Photon",
      displayValue: () => settings.baseUrl === PHOTON_BASE_URL ? "Public service" : "Custom service",
      items: [
        {
          name: "Base URL",
          desc: "Photon API endpoint. Change it to use a self-hosted service.",
          control: { type: "text", key: "baseUrl", defaultValue: PHOTON_BASE_URL },
        },
        {
          name: "Language",
          desc: "Two-letter language code for result names.",
          control: { type: "text", key: "language", defaultValue: "en" },
        },
      ],
    };
  }
}
