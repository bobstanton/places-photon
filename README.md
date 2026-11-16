# Places - Photon

Search provider for [Places](https://community.obsidian.md/plugins/places) using [Photon](https://photon.komoot.io/), with POI search over OpenStreetMap data. 

This is not a stand-alone plugin, to use, install along side [Places](https://community.obsidian.md/plugins/places). Refer to the [sandbox](https://sandbox.obsidian.stanton.dev/places/) for examples.

## Network requests

| Area       | Request                                                     |
| ---------- | ----------------------------------------------------------- |
| POI search | Resolves a search term to place suggestions and coordinates |
| Reverse    | Resolves a coordinate to the nearest named feature          |

Requests go to `https://photon.komoot.io`.

## Background tasks

None.

## Dependencies

| Library                                                      | Purpose                                        |
| ------------------------------------------------------------ | ---------------------------------------------- |
| [places-shared](https://github.com/bobstanton/places-shared) | Shared map, overlay, routing, and utility code |
