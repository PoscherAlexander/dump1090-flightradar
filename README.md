# FlightRadar

**with DUMP1090**

## About

The FlightRadar is a web-based flight tracking tool for nearby flights. A new, modern and responsive web interface, lets the user easily track nearby flights. All visible flights are displayed on a clear table and a map visualizes the current flights. Detailed information to a flight can be displayed by clicking on the corresponding flight on the table, or the map. The FlightRadar webinterface uses the Dump1090 Decoder by written by Salvatore Sanfilippo.



## Setup the FlightRadar

### Equipment

You will need the following equipment to install the flight tracking tool for nearby flights:

#### Required

- Raspberry Pi
- Micro SD Card
- Ethernet Cable or WiFi Dongle (Pi 3 has WiFi inbuilt)
- Power Adapter
- Mini DVB-T Digital TV USB Dongle

#### Optional

- Raspberry Pi Case
- USB-Keyboard
- USB-Mouse
- Raspberry Pi Heatsink



### Installation

#### RTL-SDR Driver

1. Install all required packages

   ```bash
   sudo apt-get install git build-essential cmake libusb-1.0-0-dev screen
   ```

2. Clone the following Git-Repository

   ```bash
   git clone git://git.osmocom.org/rtl-sdr.git
   ```

3. Create a new folder in ~/rtl-sdr

   ```bash
   cd ~/rtl-sdr 
   mkdir build
   ```

4. Execute xmake in ~/rtl-sdr/build

   ```bash
   cmake ../ -DINSTALL_UDEV_RULES=ON
   ```

5. Compile the Driver

   ```bash
   sudo make install
   sudo ldconfig
   ```

6. Go back to the home directory

   ```bash
   cd ~
   ```

7. Copy rtl-sdr rules to avoid 'device not found' error

   ```bash
   sudo cp ./rtl-sdr/rtl-sdr.rules /etc/udev/rules.d/
   ```

8. Create a configuration file, to block DVB-T TV-Signals

   ```bash
   cd /etc/modprobe.d/
   sudo nano rtlsdr.conf
   ```

9. Add the following line at the end of the file

   ```bash
   blacklist dvb_usb_rtl28xxu
   ```

10. Reboot the Raspberry Pi

    ```bash
    sudo reboot
    ```

11. Check the functionality of the dongle

    ```bash
    rtl_test -t
    ```

    Example Response:

    ```
    Found 1 device(s):
      0:  Realtek, RTL2838UHIDIR, SN: 00000001
    
    Using device 0: Generic RTL2832U OEM
    Found Rafael Micro R820T tuner
    Supported gain values (29): 0.0 0.9 1.4 2.7 3.7 7.7 8.7 12.5 14.4 15.7 16.6 19.7 20.7 22.9 25.4 28.0 29.7 32.8 33.8 36.4 37.2 38.6 40.2 42.1 43.4 43.9 44.5 48.0 49.6
    [R82XX] PLL not locked!
    Sampling at 2048000 S/s.
    No E4000 tuner found, aborting.
    ```



#### FlightRadar with DUMP1090 Decoder

1. Clone the following Git-Repository

   ```bash
   git clone https://github.com/PoscherAlexander/dump1090-flightradar.git
   ```

2. Compile the files in the dump1090 folder

   ```bash
   make
   ```



#### Start the app

```bash
./dump1090 --interactive --aggressive --enable-agc --net
```



#### Configuration (optional)

Your can configure your FlightRadar by editing the `config.js` file in `dump1090/public_html/js/config.js`

```javascript
/**
 * Configuration settings for the webinterface
 */

//Additional Flight Information
ENABLE_ADDITIONAL_FLIGHT_INFORMATION = false;
AVI_API_KEY = 'YOUR_API_KEY';
OPENSKY_USERNAME = 'YOUR_OPENSKY_USERNAME';
OPENSKY_PASSWORD = 'YOUR_OPENSKY_PASSWORD';
FLIGHT_DATABASE_DOMAIN = 'http://yourdomain.com';

//Plane Marker
MarkerColor	  = "rgb(39, 128, 227)";
SelectedColor = "rgb(25, 103, 190)";
StaleColor = "rgb(39, 128, 227)";

//Map
CONST_CENTERLAT = 48.306250;
CONST_CENTERLON = 14.310660;
CONST_ZOOMLVL   = 7;
```

##### Map

Latitude and Longitude of the maps central position and the zoom level of the map

##### Plane Marker

Color of the airplanes on the map

##### Additional Flight Information

- **ENABLE_ADDITIONAL_FLIGHT_INFORMATION**

  Display additional flight information like plane model, airline, departure airport, etc. (**API-Keys and Webserver required!**)

- **AVI_API_KEY**

  - Create an API-Key at [Aviation Edge](https://aviation-edge.com/premium-api/)
  - Add the API-Key from Aviation Edge to the AVI_API_KEY variable

- **OPENSKY_USERNAME and OPENSKY_PASSWORD**

  - Create an account at <https://opensky-network.org/>
  - Enter username and password in the associated files

- **FLIGHT_DATABASE_DOMAIN**

  RestAPI and Database Link for Airport, Airline and Plane Information

  Installation will be explained in 'Installation of PHP REST-API for Additional Flight Information'

##### Installation of PHP REST-API for Additional Flight Information

If you want to have additional flight information, but you don't have a webserver, you can get one [here](https://zap-hosting.com/a/881fdc741faed5e9a1e05599bc869bcaea3144de).

- Import the mySQL Database from `dump1090/public_html/sql` to your webserver

  - Don't know how to do that? [Here is some help.](https://docs.plesk.com/en-US/12.5/customer-guide/advanced-website-databases/creating-databases.65157/)
  - [Import a Database](<https://docs.plesk.com/en-US/12.5/customer-guide/advanced-website-databases/exporting-and-importing-database-dumps.69538/>)

- Change the username, password, database and host to your personal database settings in `dump1090/public_html/php/v1/databse/AirConnect.php`

  ```php
  <?php
  
  class AirConnect
  {
      public static function establish()
      {
          //Input Data for mySQL Connection to public server
          //make changes here!
          $servername = "localhost";	//host here (usually localhost)
          $username = "database_username";    //username here
          $password = "database_password";    //password here
          $dbname = "database";   //database here
  
          $conn = new mysqli($servername, $username, $password, $dbname);
          $conn->set_charset('UTF8');
  
          if ($conn->connect_error) {
              die("Error: Server is temporary not avaliable");
              return false;
          } else {
              return $conn;
          }
      }
  }
  ?>
  ```

- Upload the v1 folder in the php folder to your webserver

  - Don't know how to do that? [Here is some help.](<https://docs.plesk.com/en-US/12.5/customer-guide/websites-and-domains/website-content/uploading-content-with-file-manager.74105/>)

- Depending on where you uploaded the files, the API is now available generally at: `http[s]://[subdomain.]yourdomain.com/[folder/]`

- Enter this url in the FLIGHT_DATABASE_DOMAIN variable



## DUMP1090

Please read the README_DUMP1090.md for more information about the DUMP1090 decoder.



## Credits

FlightRadar, the web-based flight tracking tool (webinterface) was written by Alex Poscher (dev@poscher.me) and is released under the BSD three clause license.

Dump1090 was written by Salvatore Sanfilippo [antirez@gmail.com](mailto:antirez@gmail.com) and is released under the BSD three clause license.