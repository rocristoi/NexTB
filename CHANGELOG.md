# NexTB Changelog

All notable changes to this project will be documented in this file.

## [1.1.1] - 2025-03-22 (in development)

### Added
- Center location button
- "Lines" Tab - where you can view the vehicles on a route graphically displayed on a map and an animated line representing the route shape.

### Fixed
- Fixed bug where you'd open a collapsable, open another station modal and collapsibles would bug out. Android + IOS Fix.
- Partially fixed Metro Stations bug (manually removed some, added a new filtering tehnique) - can be fixed in the future by only implementing STB stations from GTFS, but would remove other agencies too, like STV, STCM and REGIO SERV TRANSPORT.
- Android: 
    - Fixed initial location not being Bucharest.
    - Fixed gesture bar background color. (changed it to black)
    - Fixed index screen (main map) height. Now calculated automatically for every screen size.