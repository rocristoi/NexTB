# ![ICON](https://i.imgur.com/incWzcm.png)

NexTB is an IOS and Android compatible React Native application designed to provide real-time updates on arrival times of trams, buses and trolleybuses in Bucharest. It is not just a tracking app, it provides comprehensive information including Vehicle ID, License Plate, Passenger Count, AC functionality status & an icon of the vehicle (based on vehicle type). This App aims to help residents catch their rides in comfort without suffering from poor air conditioning or overcrowded vehicles.

## Changelog - V.1.1.1 (Beta)

This update brings a better-looking and more functional version of NexTB, with official support for Android devices. The focus is on enhanced UX and UI, alongside performance improvements.

### New Features & Improvements
- Center location button 📍
- "Lines" Tab - where you can view the vehicles on a route graphically displayed on a map and an animated line representing the route shape + alerts on that line. (animation only works on ios, currently)
- View more in the [Changelog File](CHANGELOG.md)

### 🛑 Known Issues
- **Missing Vehicle IDs/Images** – Caused by TPBI sometimes returning a 0 as the vehicle ID. This results in placeholder images with no fix unless TPBI updates their API. (not likely)
- **Incorrect or Missing Map Markers** – Some markers represent escalators, elevators, stairs etc... instead of stations due to GTFS dataset errors. Fixing this manually for hundreds of stations is impractical, but contributions are welcome!
- **Vehicles Not Showing at Route Start/End** – This occurs when a station is configured to track only one direction. Displaying vehicles depends on how the station's configuration handles directions.

### Want to use the app on your IOS device?
Then I'll add you to the testing team and you'll become an official NexTB tester! Please reach out to me via the contact form on [my website](https://cristoi.ro#contact).

### Want to use the app on your Android device?
I can send you a custom APK build using your MapBox token. HMU with your token on the contact form on [my website](https://cristoi.ro#contact) and I'll send you the app.

## How it Works

### The app

The React Native application fetches the list of markers from the GTFS data from TPBI's (Transport Public București-Ilfov) new API (mo-bi.ro) and displays them on a map. Users can select any point on the map and the app fetches the arrival information of the vehicles passing through that station from the backend. There's also a feature to report malfunctioning AC systems in any vehicle.

<img src="https://i.imgur.com/IadNSuW.png" width="800"/>


**NOTE:** This app now uses only official APIs for arrival times & notifications. No unofficial STB APIs are required, and the app is ready to use out of the box.

### <img src="https://i.imgur.com/bIVtBpl.png" width="400"/>


The API follows a multi-step process to retrieve and process real-time transit data for a given station ID:

#### Retrieve Vehicle Data:

- The API receives a request with a station ID.
- It queries the mo-bi next arrivals endpoint to get a list of vehicles passing through that station.

#### Fetch GTFS Data:

- It extracts necessary details from the stops.txt file in the GTFS dataset.
- It retrieves shape data for all relevant transit lines using shapes.txt. The shape ID is determined by concatenating the `line ID` (e.g., 84) with the `direction ID` (0 or 1), resulting in values like 840 or 841.
- Note: GTFS files are continuously updated and available at [GTFS TPBI](https://gtfs.tpbi.ro/regional).

#### Calculate Vehicle Positioning:

- The API queries a specialized mo-bi endpoint (BUS_DATA) to fetch real-time vehicle locations.
- For each vehicle on a given route, it calculates the Haversine distance along the designated shape path (instead of a straight-line distance).
- The vehicle’s number plate is used to correlate additional passenger data from another mo-bi API endpoint (DATASET).

#### Determine Vehicle Type:

- The API classifies vehicles using predefined mappings (`tramTypeMap` and `imageMap`).
- Additional data sources include:
    - tramvaie.csv for tram identification.
    - Internal datasets for bus and trolleybus classification.

#### Retrieve and Sort Arrival Times:

- The API fetches the first arriving time for each line from the official endpoints.
- Finally, it sorts all data by arrival times and returns the response.

This workflow ensures accurate real-time transit information by integrating multiple data sources and API calls efficiently.

## How to Run on your own

You can follow these steps to run this on your own:

### Running the Backend

The backend is situated in the /Backend folder.

1. Create a .env file in the same folder as the API with following contents:

    ```
    APP_PORT=3000
    GTFS_SHAPES_FILE='shapes.txt' 
    GTFS_STOPS_FILE='stops.txt'
    CORS_MOBI_BUS_DATA='https://maps.mo-bi.ro/api/busData' 
    CORS_MOBI_NEXT_ARRIVALS='https://maps.mo-bi.ro/api/nextArrivals/' 
    CORS_MOBI_DATASET='https://maps.mo-bi.ro/api/dataset'
    LINE_CHECK_COOLDOWN=120000
    MORE_THAN_SVTN_MINUTES_TEXT='m'
    NOACPATH='./noAC.json'
    API_KEY=''
    ```

    ### Configuration Options

    #### `APP_PORT=3000`
    This is the port at which the app would be available on your local system.

    #### `GTFS_SHAPES_FILE='shapes.txt'` and `GTFS_STOPS_FILE='stops.txt'`
    These are the GTFS files, a common format for public transportation schedules and associated geographic information, from [here](https://gtfs.tpbi.ro/regional).

    #### `CORS_MOBI_BUS_DATA='https://maps.mo-bi.ro/api/busData'`, `CORS_MOBI_NEXT_ARRIVALS='https://maps.mo-bi.ro/api/nextArrivals/'`, and `CORS_MOBI_DATASET='https://maps.mo-bi.ro/api/dataset'`
    These URLs are the APIs to fetch bus data, next arrival times and dataset respectively from maps.mo-bi.ro. Please remember to use an anti-cors service with these URLs to prevent any blocking due to CORS policy.

    #### `LINE_CHECK_COOLDOWN=120000`
    This configuration is used to periodically check whether busData endpoint has updated its data or not. The app only allows buses which location has been updated within this timeout period.

    #### `MORE_THAN_SVTN_MINUTES_TEXT='m'`
    Refrain from changing this unless required.

    #### `NOACPATH='./noAC.json'`
    This is the path to the JSON file which stores the IDs of buses and trams that don't have functioning AC units.

    #### `API_KEY=''`
    This is your secret key used to communicate between the Backend and Frontend (the app). This is verified everytime a request is made, so make sure it's the same in the app, too!



2. Install all the dependencies by running `npm i`

3. Run the app:
    ``` bash
    node backend.js
    ```

### Running the React Native App


1. Install the required dependecies by running `npm i`

2. Create an .env file in the root directory of the project. Include these:
    ```env
    EXPO_PUBLIC_API_URL= # Your Backend API URL.
    EXPO_PUBLIC_ALERTS_API_URL= # Your Alerts API URL.
    EXPO_PUBLIC_MAPBOX_TOKEN= # Mapbox Token ( only needed for running this app on Android devices).
    EXPO_PUBLIC_API_KEY= # This Should Match the backend key.
    ```
    ⚠️ Note: You can use http links, but I would recommend using HTTPS for secure connections. 

3. Run the app using expo:
    ``` bash
    npx expo run:<platform>
    ```
    or, if you don't want to build the app,
    ``` bash
    npx expo start
    ```

## Contributions

- If you can provide images (illustrations) for Irisbus Citelis, V3A-2S-93, and the basic white V3A-93, [let's talk!](https://cristoi.ro/#contact)
- Help needed to add vehicle types for STCM, STV, and other agencies that operate near Bucharest under TPBI. Currently, only STB is added.
- Also looking to add functionalities like:
    - **Lines Tab** – A real-time vehicle tracking feature, similar to the Radcom App (InfoTB, CTbus, TUSM, OTL Oradea, etc.).
    - **Improved Faulty AC Reporting** – A smarter voting-based system for adding/removing vehicles from the faulty AC list. If fewer than five users report an issue, the AC status will be marked as "May Not Work."
    - **Vehicle Details Page** – A dedicated section for each vehicle displaying key details such as mileage, VIN, real photos, and user-submitted comments. (Possible to make right now with info from metrouusor.com)
    - **User Authentication** – A system allowing verified users to contribute images, comments, and other relevant vehicle information.

## Credits

- [metrouusor.com](https://www.metrouusor.com/) for public lists of vehicle types by ID.
- [tpbi](https://tpbi.ro/) and [mo-bi](https://mo-bi.ro/) for their public APIs.
- Alexandru Mihai Nenciu, for the Bucharest Logo.

## LICENSE
Please see the [LICESNE](LICENSE) file